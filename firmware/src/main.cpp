#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

#define SDA_PIN 21
#define SCL_PIN 22

// FSR pins
#define FSR_NOSE  34
#define FSR_HEEL  35
#define FSR_TOE   32
#define FSR_TAIL  33

static NimBLECharacteristic* pCharacteristic = nullptr;
MPU6050 mpu;

float ax = 0.0f, ay = 0.0f, az = 9.8f;
float gx = 0.0f, gy = 0.0f, gz = 0.0f;
String trick = "none";

// Thresholds
#define AIRTIME_MAG_MAX   6.5f   // total accel < 6.5 m/s² = airtime
#define LAND_MAG_MIN      15.0f  // impact > 15 m/s² = landing
#define AIRTIME_MIN_MS    80     // min airtime for valid trick

// Gyro thresholds (degrees/s) — tracked as peak during airtime
#define KICK_THRESHOLD    180.0f // kickflip: gx > 180°/s
#define HEEL_THRESHOLD    180.0f // heelflip: gx < -180°/s
#define SHUV_THRESHOLD    160.0f // shove-it: |gy| > 160°/s

enum TrickPhase { IDLE, AIRTIME, LANDING };
static TrickPhase trickPhase = IDLE;
static unsigned long phaseStartMs = 0;
static String detectedTrick = "none";
static float peakGx = 0.0f, peakGy = 0.0f;

void detectTrick(float ax_ms, float ay_ms, float az_ms, float gx_dps, float gy_dps) {
    unsigned long now = millis();
    float mag = sqrt(ax_ms*ax_ms + ay_ms*ay_ms + az_ms*az_ms);

    switch (trickPhase) {
        case IDLE:
            if (mag < AIRTIME_MAG_MAX) {
                // Entering airtime — reset peak tracking
                peakGx = 0.0f; peakGy = 0.0f;
                detectedTrick = "ollie"; // default until gyro says otherwise
                trickPhase = AIRTIME;
                phaseStartMs = now;
            }
            trick = "none";
            break;

        case AIRTIME:
            // Track peak gyro values during airtime
            if (abs(gx_dps) > abs(peakGx)) peakGx = gx_dps;
            if (abs(gy_dps) > abs(peakGy)) peakGy = gy_dps;

            // Classify trick by dominant rotation
            if (abs(peakGy) > SHUV_THRESHOLD && abs(peakGy) > abs(peakGx)) {
                // Shove-it: rotation around Y axis (board spins horizontally)
                detectedTrick = (peakGy > 0) ? "bs_shuv" : "fs_shuv";
            } else if (abs(peakGx) > KICK_THRESHOLD) {
                // Flip trick: rotation around X axis (board flips)
                detectedTrick = (peakGx > 0) ? "kickflip" : "heelflip";
            } else {
                detectedTrick = "ollie";
            }

            trick = detectedTrick;

            // Check for landing
            if (mag > LAND_MAG_MIN && now - phaseStartMs > AIRTIME_MIN_MS) {
                trickPhase = LANDING;
                phaseStartMs = now;
            }
            break;

        case LANDING:
            trick = detectedTrick;
            if (now - phaseStartMs > 400) {
                trickPhase = IDLE;
                trick = "none";
                detectedTrick = "none";
                peakGx = 0.0f; peakGy = 0.0f;
            }
            break;
    }
}

void setup() {
    Serial.begin(115200);
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(100000);

    mpu.initialize();
    if (!mpu.testConnection()) {
        Serial.println("MPU6050 FAILED");
    } else {
        Serial.println("MPU6050 OK");
    }
    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_500);

    // FSR pins are input-only ADC — no pinMode needed
    Serial.print("FSR pins: nose="); Serial.print(FSR_NOSE);
    Serial.print(" heel="); Serial.print(FSR_HEEL);
    Serial.print(" toe="); Serial.print(FSR_TOE);
    Serial.print(" tail="); Serial.println(FSR_TAIL);

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
    pAdvertising->setName("SK8Sense"); // include name in advertisement packet
    pAdvertising->start();
    Serial.println("SK8Sense BLE advertising started");
}

void loop() {
    // Read IMU
    int16_t rawAx, rawAy, rawAz, rawGx, rawGy, rawGz;
    mpu.getMotion6(&rawAx, &rawAy, &rawAz, &rawGx, &rawGy, &rawGz);

    ax = (rawAx / 4096.0f) * 9.81f;
    ay = (rawAy / 4096.0f) * 9.81f;
    az = (rawAz / 4096.0f) * 9.81f;
    gx = rawGx / 65.5f;
    gy = rawGy / 65.5f;
    gz = rawGz / 65.5f;

    // Read FSRs (12-bit ADC, scale to 0-1023 for compact JSON)
    int f1 = analogRead(FSR_NOSE) >> 2;   // nose
    int f2 = analogRead(FSR_HEEL) >> 2;   // heel
    int f3 = analogRead(FSR_TOE)  >> 2;   // toe
    int f4 = analogRead(FSR_TAIL) >> 2;   // tail

    detectTrick(ax, ay, az, gx, gy);

    // BLE JSON — compact to fit in 185 byte MTU
    StaticJsonDocument<220> doc;
    doc["ax"] = round(ax * 10) / 10.0;
    doc["ay"] = round(ay * 10) / 10.0;
    doc["az"] = round(az * 10) / 10.0;
    doc["gx"] = round(gx * 10) / 10.0;
    doc["gy"] = round(gy * 10) / 10.0;
    doc["gz"] = round(gz * 10) / 10.0;
    doc["trick"] = trick;
    doc["f1"] = f1;
    doc["f2"] = f2;
    doc["f3"] = f3;
    doc["f4"] = f4;

    char buf[220];
    serializeJson(doc, buf, sizeof(buf));

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));
    if (NimBLEDevice::getServer()->getConnectedCount() > 0) {
        pCharacteristic->notify();
    }

    delay(10); // 100Hz
}
