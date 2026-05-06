# SK8Sense — Tweewekelijkse Sprint Planning

---

## Sprint 1 — MVP1
**Periode:** 21 april – 4 mei 2026
**MVP doel:** Werkende BLE verbinding tussen ESP32 en Android app met gesimuleerde trick detectie

### Deeltaken
- PlatformIO project opzetten voor ESP32
- BLE advertising en NOTIFY characteristic implementeren
- Gesimuleerde sensordata state machine (ollie, kickflip, heelflip)
- React Native app scaffolding met Expo
- BLE scan + connect flow met Android runtime permissions
- Live dashboard met sensordata (10Hz throttle)
- Session flow: start/stop, timer, trick feed
- SessionSummaryScreen en HistoryScreen
- Coaching tips + pulse animatie na trick detectie
- Onboarding screen (4 slides)
- Standalone APK via EAS Build (geen laptop nodig voor demo)

### Status
Volledig afgerond. Echte BLE verbinding tussen ESP32 en Xiaomi Redmi Note 13 Pro+ werkt.
Sensordata is gesimuleerd omdat MPU6050 en FSR sensoren toekomen op 5 mei 2026.

---

## Sprint 2 — MVP2
**Periode:** 5 mei – 18 mei 2026
**MVP doel:** Echte sensordata van MPU6050 en FSR op het skateboard, eerste echte trick detectie op basis van drempelwaarden

### Deeltaken
- MPU6050 aansluiten via I2C (SDA pin 21, SCL pin 22)
- FSR sensoren aansluiten (GPIO 32, 33, 34, 35)
- Firmware updaten: echte ax/ay/az/gx/gy/gz uitlezen op 100Hz
- Firmware updaten: FSR waarden uitlezen voor tail press detectie
- Drempelwaarden calibreren voor ollie (tail press + airtime > 100ms)
- Drempelwaarden calibreren voor kickflip (GX > 300 graden/s) en heelflip (GX < -300 graden/s)
- Power circuit bouwen: LiPo batterij + TP4056 lader + slide switch + ESP32
- App: sensordata grafiek toevoegen aan dashboard
- Eerste echte trick detectie testen op skateboard

---

## Sprint 3 — MVP3
**Periode:** 19 mei – 1 juni 2026
**MVP doel:** TFLite classificatie model dat tricks detecteert met hogere betrouwbaarheid dan drempelwaarden

### Deeltaken
- Trainingsdata verzamelen: minimum 50 pogingen per trick opnemen als CSV
- Data labelen en preprocessing pipeline schrijven
- TFLite model trainen op tijdreeksdata van de IMU sensor
- Model converteren naar .tflite formaat
- Model integreren in React Native app voor on-device inferentie
- Confidence score tonen in de app
- Valse positieven filteren (minimum airtime, minimum pop kracht)
- Pop detectie toevoegen als apart niveau
- Hardware: ESP32 definitief monteren op skateboard

---

## Sprint 4 — MVP4
**Periode:** 2 juni – 15 juni 2026
**MVP doel:** Volledig afgewerkt eindproduct met cloud opslag en uitgebreide coaching

### Deeltaken
- Firebase project opzetten (Firestore + Authentication)
- Sessies opslaan in de cloud
- Gebruikersprofiel aanmaken (naam, level, statistieken)
- Progressie over tijd visualiseren via grafieken
- Shove-it detectie toevoegen (180 graden Y-as rotatie)
- Uitgebreidere coaching tips op basis van sensorpatronen
- UI polish: animaties, overgangen, volledige dark mode
- Productie APK bouwen en testen
- Eindpresentatie voorbereiden
