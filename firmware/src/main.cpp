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

// Magnitude-based thresholds — work regardless of sensor orientation
#define AIRTIME_MAG_MAX   7.0f   // total accel < 7 m/s² = in air (weightlessness)
#define LAND_MAG_MIN      14.0f  // total accel > 14 m/s² = landing impact
#define KICK_THRESHOLD    200.0f
#define HEEL_THRESHOLD   -200.0f
#define AIRTIME_MIN_MS    80

enum TrickPhase { IDLE, AIRTIME, LANDING };
static TrickPhase trickPhase = IDLE;
static unsigned long phaseStartMs = 0;
static String detectedTrick = "none";

void detectTrick(float ax_ms, float ay_ms, float az_ms, float gx_dps) {
    unsigned long now = millis();
    float mag = sqrt(ax_ms*ax_ms + ay_ms*ay_ms + az_ms*az_ms);

    switch (trickPhase) {
        case IDLE:
            if (mag < AIRTIME_MAG_MAX) {
                if (gx_dps > KICK_THRESHOLD)      detectedTrick = "kickflip";
                else if (gx_dps < HEEL_THRESHOLD) detectedTrick = "heelflip";
                else                               detectedTrick = "ollie";
                trickPhase = AIRTIME;
                phaseStartMs = now;
            }
            trick = "none";
            break;
        case AIRTIME:
            trick = detectedTrick;
            if (mag > LAND_MAG_MIN && now - phaseStartMs > AIRTIME_MIN_MS) {
                trickPhase = LANDING;
                phaseStartMs = now;
            }
            break;
        case LANDING:
            trick = detectedTrick;
            if (now - phaseStartMs > 300) {
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
        Serial.println("MPU6050 connection FAILED");
    } else {
        Serial.println("MPU6050 connected OK");
    }

    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_500);

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

    ax = (rawAx / 4096.0f) * 9.81f;
    ay = (rawAy / 4096.0f) * 9.81f;
    az = (rawAz / 4096.0f) * 9.81f;

    gx = rawGx / 65.5f;
    gy = rawGy / 65.5f;
    gz = rawGz / 65.5f;

    detectTrick(ax, ay, az, gx);

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
