# SK8Sense — Claude Code Instructions

## Project
AI-powered skateboard coaching app with IoT sensors (ESP32 + IMU + FSR) + React Native app + TensorFlow Lite trick detection.

## Commit strategy — MANDATORY
- After every completed feature: commit with a clear message
- Format: feat(scope): description
- Examples:
  - feat(esp32): BLE advertising and IMU streaming at 100Hz
  - feat(app): BLE scan and connect screen
  - feat(detection): ollie threshold detection algorithm
  - fix(esp32): stable I2C connection MPU6050

## Never build everything at once
- Build features step by step
- After every step: test + commit
- No large blocks of code without intermediate commits

## Stack
- Hardware: ESP32-S WROOM 38-pin + MPU6050 + FSR 402
- App: React Native + Expo
- BLE: react-native-ble-plx
- ML: TensorFlow Lite (on-device)
- State: Zustand
- Backend: Node.js + Firebase (later)

## Folder structure
/firmware    → ESP32 Arduino C++ code
/app         → React Native Expo app
/docs        → Research documents (already present)
/models      → TFLite models (later)

## Feedback language
- External focus: "get closer to the board" not "bend your knees"
- Max 1 tip per attempt
- Skate culture language: direct, honest, no corporate bullshit

## Sensor specs
- MPU6050: I2C on pins 21 (SDA) + 22 (SCL)
- Sample rate: 100Hz
- FSR 1: GPIO 34 (nose)
- FSR 2: GPIO 35 (heel-side)
- FSR 3: GPIO 32 (toe-side)
- FSR 4: GPIO 33 (tail)
- Battery: GPIO 36 (ADC for voltage measurement)

## MVP scope
- Level 4: Pop detection (FSR tail + accel_z)
- Level 5: Ollie (pop + airtime >100ms + landing)
- Level 6: Shove-it (180° Y-axis rotation)
- Level 7: Kickflip (360° X-axis + FSR heel-side flick)

## Language rules
- All code, comments, commit messages, and variable names must be in English
- Communication with developer (Kylian) can be in Dutch