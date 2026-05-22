#include <Arduino.h>
#include <Wire.h>
#include <MPU6050.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

// ── IMU pins ──────────────────────────────────────────────────────────────────
#define SDA_PIN 21
#define SCL_PIN 22

// ── FSR pins (input-only ADC pins) ────────────────────────────────────────────
// Wire each FSR: one terminal to 3.3V, other terminal to GPIO + 10kΩ to GND
#define FSR_NOSE  34   // FSR 1 — nose
#define FSR_HEEL  35   // FSR 2 — heel-side
#define FSR_TOE   32   // FSR 3 — toe-side
#define FSR_TAIL  33   // FSR 4 — tail (pop sensor)

// ── Trick detection thresholds ────────────────────────────────────────────────
#define AIRTIME_MAG_MAX   7.0f    // total accel < 7 m/s² = in air
#define LAND_MAG_MIN      14.0f   // total accel > 14 m/s² = landing impact
#define AIRTIME_MIN_MS    80      // min airtime for valid trick

// FSR thresholds (0–4095 ADC, 12-bit)
#define FSR_POP_THRESHOLD   1800  // tail FSR must exceed this to count as pop
#define FSR_FLICK_THRESHOLD 1200  // heel/toe FSR for flip detection
#define GYRO_FLIP_THRESHOLD 200.0f // deg/s for kickflip/heelflip

// ── Globals ───────────────────────────────────────────────────────────────────
static NimBLECharacteristic* pCharacteristic = nullptr;
MPU6050 mpu;

float ax = 0.0f, ay = 0.0f, az = 9.8f;
float gx = 0.0f, gy = 0.0f, gz = 0.0f;
int   f1 = 0, f2 = 0, f3 = 0, f4 = 0;  // FSR values (nose, heel, toe, tail)
String trick = "none";

// ── Trick state machine ───────────────────────────────────────────────────────
enum TrickPhase { IDLE, POP, AIRTIME, LANDING };
static TrickPhase trickPhase = IDLE;
static unsigned long phaseStartMs = 0;
static String detectedTrick = "none";
static bool popConfirmed = false;

void detectTrick(float ax_ms, float ay_ms, float az_ms, float gx_dps, int fsrTail, int fsrHeel, int fsrToe) {
    unsigned long now = millis();
    float mag = sqrt(ax_ms*ax_ms + ay_ms*ay_ms + az_ms*az_ms);

    switch (trickPhase) {

        case IDLE:
            trick = "none";
            // Pop detected: tail FSR spike OR existing airtime detection
            if (fsrTail > FSR_POP_THRESHOLD || mag < AIRTIME_MAG_MAX) {
                // Classify trick based on flick:
                // Kickflip: heel-side flick (FSR heel or gyro X positive)
                // Heelflip: toe-side flick (FSR toe or gyro X negative)
                if (fsrHeel > FSR_FLICK_THRESHOLD || gx_dps > GYRO_FLIP_THRESHOLD)
                    detectedTrick = "kickflip";
                else if (fsrToe > FSR_FLICK_THRESHOLD || gx_dps < -GYRO_FLIP_THRESHOLD)
                    detectedTrick = "heelflip";
                else
                    detectedTrick = "ollie";

                trickPhase = AIRTIME;
                phaseStartMs = now;
                popConfirmed = (fsrTail > FSR_POP_THRESHOLD);
            }
            break;

        case AIRTIME:
            trick = detectedTrick;
            // Landing: impact spike after minimum airtime
            if (mag > LAND_MAG_MIN && now - phaseStartMs > AIRTIME_MIN_MS) {
                trickPhase = LANDING;
                phaseStartMs = now;
            }
            // Abort if airtime is way too long (false positive)
            if (now - phaseStartMs > 2000) {
                trickPhase = IDLE;
                trick = "none";
                detectedTrick = "none";
            }
            break;

        case LANDING:
            trick = detectedTrick;
            if (now - phaseStartMs > 300) {
                trickPhase = IDLE;
                trick = "none";
                detectedTrick = "none";
                popConfirmed = false;
            }
            break;

        default:
            trickPhase = IDLE;
            break;
    }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
    Serial.begin(115200);
    Wire.begin(SDA_PIN, SCL_PIN);
    Wire.setClock(100000); // slow I2C for better reliability on perfboard

    // FSR pins are input-only ADC — set 11dB attenuation for 0–3.3V range
    analogSetAttenuation(ADC_11db);

    mpu.initialize();
    if (!mpu.testConnection()) {
        Serial.println("MPU6050 connection FAILED");
    } else {
        Serial.println("MPU6050 OK");
    }

    mpu.setFullScaleAccelRange(MPU6050_ACCEL_FS_8);
    mpu.setFullScaleGyroRange(MPU6050_GYRO_FS_500);

    NimBLEDevice::init("SK8Sense");
    NimBLEServer*   pServer   = NimBLEDevice::createServer();
    NimBLEService*  pService  = pServer->createService(SERVICE_UUID);
    pCharacteristic = pService->createCharacteristic(
        CHARACTERISTIC_UUID,
        NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
    );
    pService->start();
    NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->start();

    Serial.println("SK8Sense BLE advertising started");
    Serial.println("FSR pins: nose=34 heel=35 toe=32 tail=33");
}

// ── Loop ──────────────────────────────────────────────────────────────────────
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

    // Read FSR sensors (0–4095)
    f1 = analogRead(FSR_NOSE);
    f2 = analogRead(FSR_HEEL);
    f3 = analogRead(FSR_TOE);
    f4 = analogRead(FSR_TAIL);

    // Trick detection using both IMU + FSR
    detectTrick(ax, ay, az, gx, f4, f2, f3);

    // Build JSON payload (increased buffer for FSR fields)
    StaticJsonDocument<300> doc;
    doc["ax"] = serialized(String(ax, 2));
    doc["ay"] = serialized(String(ay, 2));
    doc["az"] = serialized(String(az, 2));
    doc["gx"] = serialized(String(gx, 1));
    doc["gy"] = serialized(String(gy, 1));
    doc["gz"] = serialized(String(gz, 1));
    doc["trick"] = trick;
    doc["f1"] = f1;   // nose FSR
    doc["f2"] = f2;   // heel FSR
    doc["f3"] = f3;   // toe FSR
    doc["f4"] = f4;   // tail FSR

    char buf[300];
    serializeJson(doc, buf, sizeof(buf));

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));
    if (NimBLEDevice::getServer()->getConnectedCount() > 0) {
        pCharacteristic->notify();
    }

    // Only print when FSR is pressed (> 100)
    if (f1 > 100 || f4 > 100) {
        Serial.print("FSR DETECTED — nose:"); Serial.print(f1);
        Serial.print(" tail:"); Serial.println(f4);
    }

    delay(10);  // 100Hz
}
