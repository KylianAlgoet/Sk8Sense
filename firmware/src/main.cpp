#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>
#include <math.h>

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

// Board-axis mapping for this physical mount:
//   gx = rawGy: board length axis, kickflip/heelflip rotation
//   gy = rawGx: rail-to-rail board pitch, main ollie movement
//   gz = rawGz: vertical yaw, pop-shuvit movement
//
// A measured kickflip peaks around gx=500 dps with gy much lower. Ollies can
// move both axes, so a flip only wins when gx clearly dominates gy.
#define FLIP_GX_MIN       220.0f
#define FLIP_DOMINANCE    1.35f
#define OLLIE_GY_MIN      150.0f
#define SHUV_GZ_MIN       170.0f
#define SHUV_DOMINANCE    1.25f
#define GYRO_MIN          70.0f
#define TRICK_HOLD_MS     400
#define PEAK_WINDOW_MS    480
#define PEAK_QUIET_MS     80

static unsigned long trickHoldUntil = 0;
static String detectedTrick = "none";
static float peakGx = 0.0f, peakGy = 0.0f, peakGz = 0.0f;
static unsigned long peakWindowStart = 0;
static unsigned long peakLastActive = 0;

void resetPeakWindow() {
    peakWindowStart = 0;
    peakLastActive = 0;
    peakGx = 0.0f;
    peakGy = 0.0f;
    peakGz = 0.0f;
}

String classifyPeakWindow() {
    const float flipPeak = fabsf(peakGx);
    const float olliePeak = fabsf(peakGy);
    const float shuvPeak = fabsf(peakGz);

    if (
        shuvPeak >= SHUV_GZ_MIN &&
        flipPeak < FLIP_GX_MIN &&
        shuvPeak >= olliePeak * SHUV_DOMINANCE
    ) {
        return (peakGz > 0) ? "bs_shuv" : "fs_shuv";
    }

    if (flipPeak >= FLIP_GX_MIN && flipPeak >= olliePeak * FLIP_DOMINANCE) {
        return (peakGx > 0) ? "kickflip" : "heelflip";
    }

    if (olliePeak >= OLLIE_GY_MIN) {
        return "ollie";
    }

    return "none";
}

void detectTrick(float gx_dps, float gy_dps, float gz_dps) {
    const unsigned long now = millis();
    const float gyroMag = sqrtf(
        gx_dps * gx_dps +
        gy_dps * gy_dps +
        gz_dps * gz_dps
    );

    if (now < trickHoldUntil) {
        trick = detectedTrick;
        return;
    }

    const bool active = gyroMag > GYRO_MIN;
    if (active) {
        if (peakWindowStart == 0) peakWindowStart = now;
        peakLastActive = now;
        if (fabsf(gx_dps) > fabsf(peakGx)) peakGx = gx_dps;
        if (fabsf(gy_dps) > fabsf(peakGy)) peakGy = gy_dps;
        if (fabsf(gz_dps) > fabsf(peakGz)) peakGz = gz_dps;
    }

    if (peakWindowStart == 0) {
        trick = "none";
        return;
    }

    const bool quietEnough = !active && (now - peakLastActive >= PEAK_QUIET_MS);
    const bool windowDone = now - peakWindowStart >= PEAK_WINDOW_MS;
    if (!quietEnough && !windowDone) {
        trick = "none";
        return;
    }

    detectedTrick = classifyPeakWindow();
    resetPeakWindow();

    if (detectedTrick == "none") {
        trick = "none";
        return;
    }

    trickHoldUntil = now + TRICK_HOLD_MS;
    trick = detectedTrick;
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

    // FSR pins are input-only ADC; no pinMode needed.
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
    pAdvertising->start();
    Serial.println("SK8Sense BLE advertising started");
}

void loop() {
    // Read IMU
    int16_t rawAx, rawAy, rawAz, rawGx, rawGy, rawGz;
    mpu.getMotion6(&rawAx, &rawAy, &rawAz, &rawGx, &rawGy, &rawGz);

    // Sensor is mounted rotated 90 degrees: swap ax/az so az = gravity when flat.
    az = (rawAx / 4096.0f) * 9.81f;
    ay = (rawAy / 4096.0f) * 9.81f;
    ax = -1.0f * (rawAz / 4096.0f) * 9.81f;
    gx = rawGy / 65.5f;
    gy = rawGx / 65.5f;
    gz = rawGz / 65.5f;

    // Read FSRs (12-bit ADC, scale to 0-1023 for compact JSON)
    int f1 = analogRead(FSR_NOSE) >> 2;
    int f2 = analogRead(FSR_HEEL) >> 2;
    int f3 = analogRead(FSR_TOE)  >> 2;
    int f4 = analogRead(FSR_TAIL) >> 2;

    detectTrick(gx, gy, gz);

    // BLE JSON; compact to fit in 185 byte MTU.
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

    // Print sensor data every 500ms
    static unsigned long lastPrint = 0;
    if (millis() - lastPrint >= 500) {
        lastPrint = millis();
        Serial.printf("ax=%.1f ay=%.1f az=%.1f | gx=%.1f gy=%.1f gz=%.1f | f1=%d f2=%d f3=%d f4=%d | trick=%s\n",
            ax, ay, az, gx, gy, gz, f1, f2, f3, f4, trick.c_str());
    }

    delay(10); // 100Hz
}
