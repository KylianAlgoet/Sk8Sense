# SK8Sense App

This is the active mobile app for SK8Sense.

Use this folder as the only app entry point. The app receives BLE data from the ESP32 sensor module, shows live telemetry, logs sessions, exposes the learning flow and calls the AI coach.

## Run

```powershell
npm install
npx expo start
```

BLE does not work in Expo Go. Use an Expo development build/dev client on a real Android device for Bluetooth testing.

Use Node.js 20.19.4 or newer for React Native 0.81.5.

## Important folders

```text
screens/      App screens and user flows
components/   Shared UI and board visualisation
store/        Zustand stores for BLE, auth, sessions and tricks
services/     AI coach integration
config/       Firebase config and local AI config
assets/       Icons, splash and skateboard models
```
