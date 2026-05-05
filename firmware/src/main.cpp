#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define SDA_PIN 21
#define SCL_PIN 22

static NimBLECharacteristic* pCharacteristic = nullptr;
MPU6050 mpu;

float ax = 0.0f, ay = 0.0f, az = 9.8f;
float gx = 0.0f, gy = 0.0f, gz = 0.0f;
String trick = "none";

// Trick detection thresholds
#define POP_THRESHOLD     2.5f   // az drop below this = tail press
#define AIRTIME_THRESHOLD 2.0f   // az below this = in air
#define LAND_THRESHOLD    15.0f  // az above this = landing impact
#define KICK_THRESHOLD    200.0f // gx above this = kickflip
#define HEEL_THRESHOLD   -200.0f // gx below this = heelflip
#define AIRTIME_MIN_MS    80     // minimum airtime to count as trick

enum TrickPhase { IDLE, TAIL_PRESS, AIRTIME, LANDING };
static TrickPhase trickPhase = IDLE;
static unsigned long phaseStartMs = 0;
static String detectedTrick = "none";

void detectTrick(float az_g, float gx_dps) {
    unsigned long now = millis();

    switch (trickPhase) {
        case IDLE:
            if (az_g < POP_THRESHOLD) {
                trickPhase = TAIL_PRESS;
                phaseStartMs = now;
            }
            trick = "none";
            break;

        case TAIL_PRESS:
            if (az_g < AIRTIME_THRESHOLD) {
                // Board left the ground — classify trick by gyro
                if (gx_dps > KICK_THRESHOLD)       detectedTrick = "kickflip";
                else if (gx_dps < HEEL_THRESHOLD)   detectedTrick = "heelflip";
                else                                 detectedTrick = "ollie";
                trickPhase = AIRTIME;
                phaseStartMs = now;
            } else if (now - phaseStartMs > 500) {
                // No pop happened — reset
                trickPhase = IDLE;
            }
            trick = "none";
            break;

        case AIRTIME:
            trick = detectedTrick;
            if (az_g > LAND_THRESHOLD && now - phaseStartMs > AIRTIME_MIN_MS) {
                trickPhase = LANDING;
                phaseStartMs = now;
            }
            break;

        case LANDING:
            trick = detectedTrick;
            if (now - phaseStartMs > 200) {
                trickPhase = IDLE;
                trick = "none";
                detectedTrick = "none";
            }
            break;
    }
}

void setup() {
    Serial.begin(115200);
    Wire.begin(SDA_PIN, SCL_PIN);

    mpu.initialize();
    if (!mpu.testConnection()) {
        Serial.println("MPU6050 connection FAILED — check wiring!");
    } else {
        Serial.println("MPU6050 connected OK");
    }

    // Configure ranges
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);  // ±8g
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_500);  // ±500°/s

    NimBLEDevice::init("SK8Sense");
    NimBLEServer* pServer = NimBLEDevice::createServer();
    NimBLEService* pService = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pService->start();
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();

    Serial.println("SK8Sense BLE advertising started");
}

void loop() {
    int16_t rawAx, rawAy, rawAz, rawGx, rawGy, rawGz;
    mpu.getMotion6(&rawAx, &rawAy, &rawAz, &rawGx, &rawGy, &rawGz);

    // Convert to m/s² (±8g range: 4096 LSB/g) and multiply by 9.81
    ax = (rawAx / 4096.0f) * 9.81f;
    ay = (rawAy / 4096.0f) * 9.81f;
    az = (rawAz / 4096.0f) * 9.81f;

    // Convert to °/s (±500°/s range: 65.5 LSB/°/s)
    gx = rawGx / 65.5f;
    gy = rawGy / 65.5f;
    gz = rawGz / 65.5f;

    // Trick detection uses az in g (not m/s²)
    float az_g = rawAz / 4096.0f;
    detectTrick(az_g, gx);

    StaticJsonDocument<200> doc;
    doc["ax"] = ax;
    doc["ay"] = ay;
    doc["az"] = az;
    doc["gx"] = gx;
    doc["gy"] = gy;
    doc["gz"] = gz;
    doc["trick"] = trick;

    char buf[200];
    serializeJson(doc, buf, sizeof(buf));

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));
    if (NimBLEDevice::getServer()->getConnectedCount() > 0) {
        pCharacteristic->notify();
    }

    Serial.println(buf);
    delay(10);
}
