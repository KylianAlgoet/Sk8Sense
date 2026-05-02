#include <Arduino.h>
#include <NimBLEDevice.h>
#include <ArduinoJson.h>

#define SERVICE_UUID        "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_UUID "beb5483e-36e1-4688-b7f5-ea07361b26a8"

static NimBLECharacteristic* pCharacteristic = nullptr;

float ax = 0.0f, ay = 0.0f, az = 9.8f;
float gx = 0.0f, gy = 0.0f, gz = 0.0f;
String trick = "none";

enum OlliePhase {
    IDLE,
    TAIL_PRESS,
    POP,
    AIRTIME,
    LANDING
};

static OlliePhase phase = IDLE;
static unsigned long phaseStartMs = 0;
static unsigned long lastOllieMs = 0;

static float randNoise(float range) {
    return ((float)(random(0, 2000) - 1000) / 1000.0f) * range;
}

void updateSensorSim() {
    unsigned long now = millis();

    if (phase == IDLE) {
        if (now - lastOllieMs >= 3000) {
            phase = TAIL_PRESS;
            phaseStartMs = now;
            lastOllieMs = now;
        }
    }

    switch (phase) {
        case IDLE:
            ax = randNoise(0.1f);
            ay = randNoise(0.1f);
            az = 9.8f + randNoise(0.05f);
            gx = 0.0f;
            gy = 0.0f;
            gz = 0.0f;
            trick = "none";
            break;

        case TAIL_PRESS:
            ax = randNoise(0.1f);
            ay = randNoise(0.1f);
            az = 6.0f + randNoise(0.2f);
            gx = 0.0f;
            gy = 0.0f;
            gz = 200.0f + randNoise(10.0f);
            trick = "none";
            if (now - phaseStartMs >= 100) {
                phase = POP;
                phaseStartMs = now;
            }
            break;

        case POP:
            ax = randNoise(0.1f);
            ay = randNoise(0.1f);
            az = 18.0f + randNoise(0.5f);
            gx = 0.0f;
            gy = 0.0f;
            gz = 800.0f + randNoise(20.0f);
            trick = "none";
            if (now - phaseStartMs >= 50) {
                phase = AIRTIME;
                phaseStartMs = now;
            }
            break;

        case AIRTIME:
            ax = randNoise(0.05f);
            ay = randNoise(0.05f);
            az = 0.1f + randNoise(0.05f);
            gx = 0.0f;
            gy = 0.0f;
            gz = 0.0f;
            trick = "ollie";
            if (now - phaseStartMs >= 300) {
                phase = LANDING;
                phaseStartMs = now;
            }
            break;

        case LANDING:
            ax = randNoise(0.2f);
            ay = randNoise(0.2f);
            az = 20.0f + randNoise(1.0f);
            gx = 0.0f;
            gy = 0.0f;
            gz = 0.0f;
            trick = "ollie";
            if (now - phaseStartMs >= 150) {
                phase = IDLE;
                trick = "none";
            }
            break;
    }
}

void setup() {
    Serial.begin(115200);

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
    updateSensorSim();

    StaticJsonDocument<256> doc;
    doc["ax"] = ax;
    doc["ay"] = ay;
    doc["az"] = az;
    doc["gx"] = gx;
    doc["gy"] = gy;
    doc["gz"] = gz;
    doc["trick"] = trick;

    char buf[256];
    serializeJson(doc, buf, sizeof(buf));

    pCharacteristic->setValue((uint8_t*)buf, strlen(buf));

    if (NimBLEDevice::getServer()->getConnectedCount() > 0) {
        pCharacteristic->notify();
    }

    Serial.println(buf);

    delay(10);
}
