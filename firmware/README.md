# SK8Sense Firmware

This is the active ESP32 firmware for SK8Sense.

The firmware reads the MPU6050 and four FSR sensors, classifies tricks with rule-based logic and streams compact JSON packets over Bluetooth Low Energy.

## Build and upload

```powershell
pio run
pio run --target upload
pio device monitor
```

The current `platformio.ini` uses `COM3`. Change `upload_port` and `monitor_port` if the ESP32 appears on another port.

## Hardware pins

```text
GPIO21  MPU6050 SDA
GPIO22  MPU6050 SCL
GPIO34  FSR nose
GPIO35  FSR heel
GPIO32  FSR toe
GPIO33  FSR tail
```

