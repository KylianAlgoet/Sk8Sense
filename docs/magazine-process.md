# SK8SENSE — PROCESVERSLAG
## Movement Intelligence System · Final Work Documentation

---

# 1. BRAINSTORM / MINDMAP

## Centrale vraag
*Hoe kan technologie skateboarden leuker en leerrijker maken?*

## Kernideeën (brainstorm)
- Skaters leren tricks zonder coach → AI als vervanger
- Sensoren meten beweging → objectieve data over je techniek
- Feedback moet aanvoelen als een coach, niet als een app
- Gamification: XP, streaks, progressie bijhouden
- Hardware op het board zelf (niet in de schoen)

## Mindmap structuur
```
SK8SENSE
├── HARDWARE
│   ├── ESP32-S WROOM (microcontroller + BLE)
│   ├── MPU6050 (IMU: versnellingsmeter + gyroscoop)
│   ├── FSR 402 sensoren (druksensoren × 4)
│   ├── TP4056 (LiPo oplader)
│   └── LiPo batterij 2000mAh 3.7V
│
├── SOFTWARE / APP
│   ├── React Native + Expo
│   ├── BLE connectie (react-native-ble-plx)
│   ├── Firebase Auth + Firestore
│   ├── Claude AI coaching (claude-haiku)
│   └── Three.js / Animated (3D visualisatie)
│
├── DETECTIE
│   ├── Airtime detectie (acceleratie < 6.5 m/s²)
│   ├── Kickflip (gyro GX > 180°/s)
│   ├── Heelflip (gyro GX < -180°/s)
│   ├── BS Shove-it (gyro GY > 160°/s)
│   └── Pop detectie (FSR tail spike)
│
└── UX / DESIGN
    ├── Neo-brutalist (MIS v3 design system)
    ├── Skate cultuur taal
    ├── Extern gefocuste feedback
    └── Progressie tracking
```

---

# 2. MOODBOARD

## Visuele richting
- **Stijl:** Neo-brutalist / Cyber Performance OS
- **Referenties:** F1 telemetrie dashboards, militaire HUD interfaces, skateboard magazines (Thrasher, Jenkem)
- **Kleurpalet:**
  - Achtergrond: `#0A0A0B` (void black)
  - Accent: `#FF6A3D` (signal orange)
  - Tekst primair: `#ECECE8` (off-white)
  - Grid overlay: `rgba(255,255,255,0.04)`
- **Typografie:**
  - Archivo ExtraBold (display/headings)
  - IBM Plex Mono (labels, technische data)
  - Space Grotesk (body text)
- **Sfeer:** Industrieel, precies, data-gedreven maar met skate energie

## Moodboard elementen
- Motorsport telemetrie schermen
- Thrasher magazine lay-outs
- Neon-verlichte skate spots
- Circuit board patronen
- Bewegingsanalyse software (Kinovea)

---

# 3. LITERATUURSTUDIE

## Bewegingsanalyse in sport
Literatuur toont aan dat real-time feedback bij het aanleren van motorische vaardigheden significant effectiever is dan uitgestelde feedback (Schmidt & Lee, 2011). Skateboard tricks vereisen precisie timing van maximaal 200ms — menselijke coaches missen dit consistentie.

## BLE voor wearables
Bluetooth Low Energy (BLE 5.0) biedt een theoretisch bereik van 40m met een maximale datarate van 2 Mbps. Voor 100Hz IMU streaming is een bandbreedtevereiste van ~15KB/s nodig — ruim binnen BLE-capaciteit.

## IMU-gebaseerde bewegingsdetectie
De MPU6050 integreert een 3-assige accelerometer (±8g range) en gyroscoop (±500°/s range). Onderzoek naar skateboard trick detectie (Tang et al., 2020) toont aan dat airtime detectie via acceleratie het betrouwbaarste startpunt is, gevolgd door rotatieanalyse via gyroscoop.

## FSR sensoren in sport
Force Sensitive Resistors worden gebruikt in orthopedisch onderzoek voor drukdistributie. De Adafruit Round FSR (C3063-003) heeft een operationeel bereik van 0.1N tot 10N — voldoende voor foot pressure bij skateboarden.

## AI coaching
Externe focus instructies ("get closer to the board") zijn bewezen effectiever dan interne focus instructies ("bend your knees") — Wulf et al. (2010). Dit is geïmplementeerd in het coaching prompt van Claude.

---

# 4. MARKTANALYSE

## Marktgrootte
- Globale skateboardmarkt: $2.4B USD (2023), verwacht $3.6B in 2030
- 85 miljoen skaters wereldwijd
- Groei van 8.2% CAGR door streetwear trends en Olympic exposure (2020, 2024)

## Technologie in actiesport
- Smartboards: Segway, OneWheel
- Actiecamera analyse: GoPro
- Prestatiemeting: Catapult Sports (hoofdzakelijk teamsport)
- **Gat in de markt:** Geen enkel product combineert on-board sensoren + AI coaching voor skateboarden

## Prijspositie
- Doelgroep: tieners en jonge volwassenen (13-28 jaar)
- Bereidheid te betalen voor sport-tech: €15-40/maand (subscriptie)
- Hardware eenmalige kost: <€30 (ESP32 + sensoren + behuizing)

---

# 5. CONCURRENTIEANALYSE

| Product | Sensoren | AI Coaching | App | Prijs |
|---|---|---|---|---|
| **SK8SENSE** | IMU + FSR (4x) | Claude AI | React Native | €0 (prototype) |
| Boardriders App | Geen hardware | Nee | Video analyse | Gratis |
| GoPro + Quik | Camera | Nee | Video editing | €500+ |
| Carv (ski) | Voet sensoren | Ja (ski) | iOS/Android | €199 + abo |
| Trace (snowboard) | IMU | Statistieken | App | €149 |

**Conclusie:** SK8Sense is het enige product dat specifiek skateboard trick detectie combineert met AI-gebaseerde coaching via on-board hardware.

---

# 6. DOELGROEPANALYSE

## Primaire doelgroep
- **Leeftijd:** 14-25 jaar
- **Niveau:** Beginnend tot intermediate (< 2 jaar ervaring)
- **Motivatie:** Tricks willen leren zonder dure lessen
- **Frustratie:** Geen feedback op wat fout gaat
- **Tech-comfort:** Hoog — smartphone is verlengde van zichzelf

## Secundaire doelgroep
- Ouders die tools zoeken voor begeleide ontwikkeling
- Skate coaches die data willen bij training

## Inzichten uit observaties
- Skaters filmen zichzelf al (TikTok/Instagram) → ze willen zichzelf verbeteren
- Zelfstandig leren is cultuur in skateboarden → AI past hierin
- Externe feedback werkt beter dan technische instructies in skate cultuur

---

# 7. MOSCOW-ANALYSE

## Must Have
- ✅ BLE verbinding ESP32 ↔ app
- ✅ Realtime IMU data streaming (100Hz)
- ✅ Trick detectie: Ollie, Kickflip, Pop Shove-it
- ✅ Sessie opnemen + bewaren
- ✅ Gebruikersauthenticatie (Firebase)
- ✅ Live board visualisatie (pitch/roll)

## Should Have
- ✅ FSR druksensoren (4x: neus/hiel/teen/staart)
- ✅ AI coaching feedback (Claude Haiku)
- ✅ Profile met statistieken
- ✅ Sessie samenvatting
- ✅ Kalibratie van sensoren

## Could Have
- ✅ 3D skateboard visualisatie
- ✅ Leermodule met stap-voor-stap tricks
- ⬜ Video synchronisatie
- ⬜ Multiplayer/vrienden vergelijken

## Won't Have (voor MVP)
- ⬜ TensorFlow Lite on-device ML
- ⬜ FSR-gebaseerde trick detectie (FSR kwamen laat aan)
- ⬜ iOS build
- ⬜ Betaalsysteem

---

# 8. FUNCTIONELE ANALYSE

## Systeemoverzicht
```
[Skateboard]
    └── ESP32-S WROOM
        ├── MPU6050 (I2C: GPIO21/22)
        ├── FSR Nose (GPIO34)
        ├── FSR Heel (GPIO35)
        ├── FSR Toe (GPIO32)
        ├── FSR Tail (GPIO33)
        └── BLE 2.4GHz → [Smartphone]

[Smartphone App]
    ├── BLE Scanner + Verbinding
    ├── Sensor data parsing (JSON 100Hz)
    ├── Pitch/Roll berekening (atan2)
    ├── Trick detectie state machine
    ├── 3D board visualisatie
    ├── AI Coach (Claude API)
    └── Firebase (Auth + Firestore)
```

## BLE Data Protocol
```json
{
  "ax": -4.37,   // acceleratie X (m/s²)
  "ay": 0.40,    // acceleratie Y (m/s²)
  "az": 7.96,    // acceleratie Z (m/s²)
  "gx": -5.83,   // gyroscoop X (°/s)
  "gy": 1.34,    // gyroscoop Y (°/s)
  "gz": 0.56,    // gyroscoop Z (°/s)
  "trick": "none", // "none" | "ollie" | "kickflip" | "heelflip" | "bs_shuv" | "fs_shuv"
  "f1": 0,       // FSR neus (0-1023)
  "f2": 0,       // FSR hiel (0-1023)
  "f3": 0,       // FSR teen (0-1023)
  "f4": 0        // FSR staart (0-1023)
}
```

## Trick Detectie Algoritme (ESP32)
```
1. IDLE → als magnitude < 6.5 m/s² → AIRTIME
   - Reset peak tracking (peakGx, peakGy)
2. AIRTIME → track peak rotaties
   - peakGY > 160°/s → bs_shuv of fs_shuv
   - peakGX > 180°/s → kickflip of heelflip
   - anders → ollie
   - als magnitude > 15 m/s² (landing impact) → LANDING
3. LANDING → 400ms wachten → IDLE
```

## App Schermen
1. **Onboarding** — eerste launch, intro slides
2. **Login / Register** — Firebase Auth
3. **Home** — stats overview, quick scan CTA
4. **Connect** — BLE scan + verbinden
5. **Dashboard** — live sessie: 3D board, detectie feed, FSR bars
6. **Session Summary** — na sessie: stats + AI analyse
7. **Learning** — trick bibliotheek (3 tricks + coming soon)
8. **TrickIntro** — stap-voor-stap uitleg
9. **Practice** — oefenmodus met animaties
10. **Profile** — progressie, history, stats

---

# 9. PERSONA'S

## Persona 1: Kobe (16)
- **Bio:** Skater sinds 6 maanden, leert uit YouTube video's
- **Doel:** Zijn eerste kickflip landen
- **Frustratie:** "Ik zie niet wat er fout gaat"
- **Tech:** Snapchat, TikTok, films zichzelf al
- **Quote:** *"Als ik wist wat er mis gaat, zou ik het kunnen fixen"*

## Persona 2: Lars (22)
- **Bio:** 4 jaar skatender, intermediate level
- **Doel:** Consistentie verbeteren, beter worden voor street sessions
- **Frustratie:** "Ik land 7 van 10 ollies maar snap niet wanneer het fout gaat"
- **Tech:** Fitness tracker gebruiker, data-gedreven
- **Quote:** *"Cijfers liegen niet"*

## Persona 3: Elien (28)
- **Bio:** Skate coach, geeft les aan beginners in lokale skatepark
- **Doel:** Haar leerlingen objectieve feedback geven
- **Frustratie:** "Ik kan maar 1 leerling tegelijk observeren"
- **Tech:** Professioneel, zoekt tools die werken
- **Quote:** *"Als ik data had over elke poging, kon ik veel gerichter coachen"*

---

# 10. CUSTOMER JOURNEY

## Fase 1: Bewustzijn
- **Touchpoint:** Instagram ad, TikTok video van skater met data-overlay
- **Emotie:** Nieuwsgierigheid
- **Actie:** App downloaden

## Fase 2: Onboarding
- **Touchpoint:** Welkomstscherm, 4 intro slides
- **Emotie:** Opwinding, lichte verwarring (hardware?)
- **Actie:** Account aanmaken, hardware bestellen

## Fase 3: Hardware setup
- **Touchpoint:** Instructies in app (wiring diagram)
- **Emotie:** Frustratie (solderen is moeilijk), trots als het werkt
- **Actie:** ESP32 + sensoren monteren op board

## Fase 4: Eerste sessie
- **Touchpoint:** Dashboard met live data, eerste trick detectie
- **Emotie:** WOW moment — board ziet wat je doet
- **Actie:** Sessie opnemen, AI feedback lezen

## Fase 5: Progressie
- **Touchpoint:** Profile screen, sessiegeschiedenis, XP groei
- **Emotie:** Motivatie, competitiedrang
- **Actie:** Elke sessie opnemen, tricks verbeteren

## Fase 6: Aanbeveling
- **Touchpoint:** Gedetecteerde trick deelt op social media
- **Emotie:** Trots
- **Actie:** Vrienden aanraden

---

# 11. SYNTHESE TECHNISCH ONDERZOEK

## Hardware keuzes & motivatie

### ESP32-S WROOM 38-pin
- Gekozen voor ingebouwde BLE + WiFi
- 240MHz dual-core voldoende voor 100Hz IMU + JSON serialisatie
- I2C voor MPU6050, 4x ADC voor FSR, ruimte voor uitbreiding

**Probleem gevonden:** AMS1117 LDO regulator op NodeMCU heeft minimaal 4.5V nodig. LiPo geeft 3.7-4.2V → **BLE werkt niet op batterij zonder boost converter**. Oplossing: MT3608 boost converter (3.7V → 5V).

### MPU6050
- I2C op GPIO21 (SDA) / GPIO22 (SCL)
- Sample rate 100Hz via `Wire.setClock(100000)`
- ±8g accelerometer, ±500°/s gyroscoop
- **Probleem:** I2C verloor verbinding bij trilling → opgelost met `Wire.setClock(100000)` (lagere klok voor stabiliteit op perfboard)

### FSR 402 (Adafruit Round)
- Voltage divider: 3.3V → FSR → GPIO → 10kΩ → GND
- Raw ADC waarden: 0-4095 (12-bit)
- **Probleem 1:** Alle weerstanden naar SVP (GPIO36) gesoldeerd i.p.v. GND → kortsluiting tussen alle sensoren → opgelost
- **Probleem 2:** Enkele koude lassen → sensoren reageerden niet → opgelost door hersolleren
- Na correctie: alle 4 FSRs volledig geïsoleerd en functioneel

### NimBLE (BLE bibliotheek)
- Advertising naam "SK8Sense" initieel niet zichtbaar in scan (zat in scan response, niet advertisement packet)
- Opgelost door `pAdvertising->addServiceUUID()` correct te configureren
- App filtert nu op device naam

## Software keuzes & motivatie

### React Native + Expo
- Cross-platform voor iOS/Android
- Expo dev client voor BLE native modules
- **Nadeel:** expo-gl niet compatibel met RN 0.81.5 → 3D fallback naar WebView Three.js, daarna naar React Native Animated (meest stabiel)

### Trick detectie: firmware vs app
- ESP32 doet primaire detectie (airtime + rotatie) → betrouwbaarder door lagere latency
- App heeft secundaire state machine voor granulaire states (pop/airtime/landing)
- Beide systemen werken parallel

### Claude AI Coach
- Model: claude-haiku-4-5 (snel, goedkoop, voldoende voor 1-zin tips)
- Prompt engineering: externe focus instructies, skate cultuur taal
- API key lokaal opgeslagen (gitignored), nooit gecommit

---

# 12. WIREFRAMES (beschrijving Adobe XD)

## Scherm 1: Home
- Header: SK8SENSE logo + notificatie button
- Hero panel: Readiness Index (groot %) met PEAK chip
- Motion AI card met coaching bericht + CTA knop
- Stat grid: DETECTIONS / SESSIONS / ON-BOARD
- Latest session preview

## Scherm 2: Connect
- BLE scanner animatie (pulserende ringen)
- Device lijst met MAC adressen
- Connect knop per device
- Status: Scanning / Found / Connecting

## Scherm 3: Dashboard (Live Sessie)
- Top bar: timer groot (64px) + detectie counter
- Detection banner (oranje flash bij trick)
- 3D board viewer (pitch/roll live)
- IMU strip: AX/AY/AZ waarden
- FSR bars: NOSE/HEEL/TOE/TAIL
- Detection feed onderaan
- END SESSION knop

## Scherm 4: Learning
- Header: TRICKS + MVP chip
- 3 trick cards (Ollie/Kickflip/Pop Shuv-it) met ticked panels
- Coming soon grid met 6 vergrendelde tricks
- Motion AI roadmap banner

## Scherm 5: Profile
- Avatar + naam + email
- Stats grid: Sessions/Tricks/Time/Best
- Bar chart laatste sessies
- Trick breakdown met bars
- Sign out

---

# 13. MOCK-UPS (beschrijving Adobe XD)

## Design System: MIS v3 (Movement Intelligence System)
- **Stijl:** Neo-brutalist performance OS
- **Achtergronden:** 5 niveaus van void black (#0A0A0B → #202026)
- **Grid overlay:** 46px raster met 4% opacity
- **Ticked panels:** Oranje hoekkruisen op alle interactieve kaarten
- **RegStrip:** Technische metadata bovenaan elk scherm

## Kleurgebruik
| Element | Kleur |
|---|---|
| Background | #0A0A0B |
| Cards | #121215 |
| Accent / CTA | #FF6A3D |
| Success | #4CAF50 |
| Warning | #FFB020 |
| Danger | #FF4438 |
| Primary text | #ECECE8 |

## Typografisch systeem
- Display headings: Archivo 800 — UPPERCASE, letterSpacing -0.04em
- Technical labels: IBM Plex Mono 9px — UPPERCASE, letterSpacing 1.62
- Body text: Space Grotesk 13px — lineHeight 1.5

---

# 14. STIJLGIDS

*Zie `app/design-tokens.js` voor de actieve implementatie en `docs/design/design-tokens-reference.js` voor de referentie-export.*

## Kleurpalette
```js
ACCENT   = '#FF6A3D'  // signal orange
BG.base  = '#0A0A0B'  // void black
BG.b2    = '#121215'  // card surface
TEXT.t1  = '#ECECE8'  // primary
TEXT.t2  = '#8C8C92'  // secondary
TEXT.t3  = '#56565C'  // dimmed
LINE.dim = 'rgba(255,255,255,0.075)'
```

## Componenten
- **V3Ticked:** Panel met oranje hoekkruisen
- **V3RegStrip:** Technische header per scherm
- **V3SectionHead:** Sectieheaders met index + lijn
- **V3StatGrid:** Data grid met nummers
- **V3MotionAI:** AI coaching card
- **V3MotionTip:** Snelle tip met linkse accent border
- **V3Chip:** Status badges (default/live/solid)

## Buttons
- **Primary:** Accent achtergrond, UPPERCASE Archivo, ink kleur tekst
- **Ghost:** Transparant, border LINE.mid, witte tekst
- **Danger:** Rode border + tekst (end session)

## Iconen
- Ionicons 5 (geïntegreerd in Expo)
- Grootte: 14-28px afhankelijk van context

---

# 15. GEBRUIKERSDOCUMENTATIE

## Hardware installatie

### Benodigdheden
- ESP32-S WROOM NodeMCU 38-pin
- MPU6050 gyroscoop module
- 4× Adafruit Round FSR (model 402)
- 4× 10kΩ weerstand
- TP4056 LiPo oplader module
- MT3608 boost converter (3.7V → 5V)
- LiPo batterij 3.7V min. 500mAh
- Schuifschakelaar (SS12D00G2)
- Perfboard + soldeerbout

### Bedrading

**MPU6050:**
```
ESP32 3.3V → MPU6050 VCC
ESP32 GND  → MPU6050 GND
ESP32 GPIO21 → MPU6050 SDA
ESP32 GPIO22 → MPU6050 SCL
```

**FSR sensoren (voltage divider per sensor):**
```
ESP32 3.3V → FSR poot 1
FSR poot 2 → GPIO34 (nose) / GPIO35 (heel) / GPIO32 (toe) / GPIO33 (tail)
GPIO pin   → 10kΩ weerstand → GND
```

**Voeding:**
```
Batterij + → TP4056 B+
Batterij - → TP4056 B-
TP4056 OUT+ → MT3608 IN+
TP4056 OUT- → MT3608 IN-
MT3608 OUT+ (ingesteld op 5V) → Schakelaar → ESP32 5V/VIN pin
MT3608 OUT- → ESP32 GND
```

### App installatie
1. Download SK8Sense APK van [repository]
2. Installeer op Android (Settings → Unknown sources)
3. Registreer met email + wachtwoord
4. Ga naar Board → Scan for Board

### Verbinden
1. Zet het board aan (schakelaar)
2. Open de app → Board tab
3. Tap "SCAN FOR BOARD"
4. Selecteer "SK8Sense" uit de lijst
5. Tap "Connect"
6. Dashboard opent automatisch

### Kalibratie
1. Leg het board plat op de grond
2. Tap "◎ CALIBRATE" in het dashboard
3. PITCH en ROLL waarden resetten naar 0°

### Sessie opnemen
1. Tap "▶ START SESSION"
2. Ga skaten
3. Tricks worden automatisch gedetecteerd
4. Tap "■ END SESSION"
5. Sessie samenvatting + AI feedback verschijnt

---

# 16. ONDERHOUDSDOCUMENTATIE

## Repository structuur
```
SK8Sense/
├── firmware/                  # ESP32 Arduino C++ code
│   └── src/main.cpp           # Hoofdfirmware
├── app/                       # React Native Expo app
│   ├── App.js                 # Root met font loading
│   ├── design-tokens.js       # Compleet design systeem
│   ├── components/
│   │   ├── V3Shared.js        # Gedeelde v3 componenten
│   │   └── LiveBoardViewer.js # 3D board visualisatie
│   ├── screens/               # Alle app schermen
│   ├── store/                 # Zustand state stores
│   │   ├── bleStore.js        # BLE verbinding
│   │   ├── sessionStore.js    # Sessie data
│   │   ├── authStore.js       # Firebase auth
│   │   └── trickStore.js      # Trick bibliotheek
│   ├── services/
│   │   └── aiCoach.js         # Claude API integratie
│   └── config/
│       ├── firebase.js        # Firebase config (vul in)
│       └── ai.js              # Anthropic API key (gitignored)
├── hardware/enclosure/        # STL/UFP bestanden voor de behuizing
├── docs/                      # Documentatie, proces, screenshots en testlogs
└── archive/                   # Oude geneste kopie, niet actief
```

## Firmware aanpassen

### Drempelwaarden wijzigen
In `firmware/src/main.cpp`:
```cpp
#define AIRTIME_MAG_MAX   6.5f   // Lager = gevoeliger voor airtime
#define LAND_MAG_MIN      15.0f  // Lager = detecteert zachte landingen
#define KICK_THRESHOLD    180.0f // Lager = minder flip nodig voor kickflip
#define SHUV_THRESHOLD    160.0f // Lager = minder spin voor shove-it
```

### Nieuwe trick toevoegen
In `detectTrick()` functie:
```cpp
} else if (abs(peakGx) > 350.0f && abs(peakGy) > 350.0f) {
    detectedTrick = "varial_flip"; // nieuw
}
```

### Firmware uploaden
1. PlatformIO installeren in VS Code
2. BOOT knop ingedrukt houden op ESP32
3. Terminal: `pio run --target upload`

## App aanpassen

### Design tokens wijzigen
Bewerk `app/design-tokens.js`:
```js
export const ACCENT = '#FF6A3D'; // Verander hier voor nieuw accent
```

### Nieuwe trick toevoegen aan learning
In `screens/LearningScreen.js`, voeg toe aan `FEATURED` array:
```js
{
  id: 'heelflip',
  name: 'HEELFLIP',
  difficulty: 'INTERMEDIATE',
  diffColor: '#2196F3',
  category: 'FLATGROUND',
  code: 'T.04',
  steps: 5,
  description: 'Kick out with your heel and let the board flip.',
},
```

### AI coaching aanpassen
In `services/aiCoach.js`, pas de prompt aan:
```js
const prompt = `You are a pro skateboarding coach...`
```

### Firebase configuratie
Vul in `config/firebase.js`:
```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  ...
};
```

### Anthropic API key
Zet de key lokaal in `app/.env.local` (is gitignored):
```env
EXPO_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key_here
```

De app leest die waarde via `process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY`.

## Afhankelijkheden updaten
```bash
cd app
npx expo install         # Expo-compatibele versies
npm install              # Overige packages
```

## Bekende limitaties
- BLE werkt niet zonder MT3608 boost converter op batterij (3.7V te laag voor AMS1117 regulator)
- iOS vereist Apple Developer account ($99/jaar) voor dev build
- Three.js 3D viewer werkt enkel in WebView (expo-gl incompatibel met RN 0.81.5)

---

# 17. TESTVERSLAG

## Testmethode
Iteratief testen tijdens ontwikkeling: hardware tests via Serial Monitor (PlatformIO), app tests via Expo dev client op Android (Samsung A98G).

---

## Test 1: MPU6050 I2C verbinding

| | |
|---|---|
| **Datum** | April/Mei 2026 |
| **Verwacht** | `MPU6050 connected OK` in Serial Monitor |
| **Resultaat** | `MPU6050 connection FAILED` bij eerste test op perfboard |
| **Oorzaak** | GND van gyroscoop verbonden via weerstand (spanning op GND) |
| **Oplossing** | GND direct (geen weerstand) verbonden |
| **Status** | ✅ Opgelost |

---

## Test 2: FSR sensoren kortsluiting

| | |
|---|---|
| **Datum** | Mei 2026 |
| **Verwacht** | Elke sensor reageert onafhankelijk |
| **Resultaat** | Heel en toe gingen altijd samen op 4095 |
| **Oorzaak** | Alle weerstanden naar SVP (GPIO36) i.p.v. GND → gedeeld referentiepunt |
| **Oplossing** | Alle weerstanden naar GND verplaatst |
| **Status** | ✅ Opgelost |

---

## Test 3: FSR sensoren koude lassen

| | |
|---|---|
| **Datum** | Mei 2026 |
| **Verwacht** | Alle 4 FSRs reageren bij druk |
| **Resultaat** | Alle FSRs lezen 0, ook bij druk |
| **Oorzaak** | 3.3V verbinding losgeraakt bij hersolleren van weerstanden |
| **Oplossing** | 3.3V opnieuw gesoldeerd, alle lassen glanzend gemaakt |
| **Status** | ✅ Opgelost |

---

## Test 4: FSR individuele werking

| Sensor | GPIO | Verwacht | Resultaat | Status |
|---|---|---|---|---|
| Nose | 34 | ~3900 bij druk, 0 in rust | ✅ ~4095 bij druk | ✅ |
| Heel | 35 | ~3900 bij druk, 0 in rust | ✅ ~4095 bij druk | ✅ |
| Toe | 32 | ~3900 bij druk, 0 in rust | ✅ ~4095 bij druk | ✅ |
| Tail | 33 | ~3900 bij druk, 0 in rust | ✅ ~4095 bij druk | ✅ |

---

## Test 5: BLE trick detectie

| Trick | Verwacht | Resultaat | Status |
|---|---|---|---|
| Ollie | `trick: "ollie"` bij airtime | ✅ Correct gedetecteerd | ✅ |
| Kickflip | `trick: "kickflip"` bij GX > 180°/s | ✅ Correct | ✅ |
| Heelflip | `trick: "heelflip"` bij GX < -180°/s | ✅ Correct | ✅ |
| BS Shove-it | `trick: "bs_shuv"` bij GY > 160°/s | ✅ Correct | ✅ |
| Pop (nep) | `trick: "none"` als geen airtime | ✅ Geen false positive | ✅ |

---

## Test 6: BLE advertentie op batterij

| | |
|---|---|
| **Datum** | Mei 2026 |
| **Verwacht** | ESP32 zichtbaar in BLE scan op batterij |
| **Resultaat** | Niet zichtbaar — LED dim, BLE adverteert niet correct |
| **Oorzaak** | AMS1117 LDO op NodeMCU vereist min. 4.5V input; LiPo geeft 3.7V → regulator in dropout onder BLE piekstroom |
| **Oplossing** | MT3608 boost converter (3.7V → 5V) besteld |
| **Status** | ⏳ In afwachting hardware |

---

## Test 7: Live pitch/roll in app

| | |
|---|---|
| **Datum** | Mei 2026 |
| **Verwacht** | PITCH/ROLL waarden veranderen bij bewegen van board |
| **Resultaat** | Initieel alles 0.0° ondanks verbinding |
| **Oorzaak** | Stale closure in BLE callback — `handleIncomingData` gebruikte oude `setPitch/setRoll` referenties |
| **Oplossing** | Pitch/roll berekend direct van `sensorData` in render (geen extra state) + `boardRef.current.update()` op 100Hz |
| **Status** | ✅ Opgelost — PITCH -21.4° / ROLL 26.7° werken correct |

---

## Test 8: AI coaching feedback

| | |
|---|---|
| **Datum** | Mei 2026 |
| **Verwacht** | AI geeft relevante tip na trick detectie |
| **Resultaat** | Claude Haiku antwoord in < 2s met externe focus tip |
| **Voorbeeld output** | *"Stay over the bolts — your back foot's drifting on landing."* |
| **Status** | ✅ Functioneel |

---

## Samenvatting testresultaten

| Component | Geteste features | Geslaagd | Gefaald | In behandeling |
|---|---|---|---|---|
| Hardware - MPU6050 | I2C verbinding, pitch/roll | ✅ | - | - |
| Hardware - FSR | 4× isolatie, drukrespons | ✅ | - | - |
| Hardware - Batterij | BLE op batterij | - | ❌ | ⏳ boost converter |
| App - BLE | Scan, verbinden, data | ✅ | - | - |
| App - Detectie | 5 tricks | ✅ | - | - |
| App - Visualisatie | Pitch/roll animatie | ✅ | - | - |
| App - AI coach | Tip generatie | ✅ | - | - |
| App - Sessies | Opnemen, opslaan, laden | ✅ | - | - |

---

# BRONNEN

- Schmidt, R.A. & Lee, T.D. (2011). *Motor Control and Learning: A Behavioral Emphasis* (5th ed.). Human Kinetics.
- Wulf, G., Shea, C. & Lewthwaite, R. (2010). Motor skill learning and performance: a review of influential factors. *Medical Education*, 44(1), 75–84.
- Tang, W., et al. (2020). Skateboard Trick Recognition Using Inertial Measurement Units. *IEEE Sensors Journal*, 20(14).
- Adafruit FSR 402 Datasheet. adafruit.com
- ESP32 Technical Reference Manual. Espressif Systems.
- NimBLE-Arduino Documentation. h2zero/NimBLE-Arduino.
- Expo Documentation. docs.expo.dev
- React Native BLE PLX Documentation. dotintent/react-native-ble-plx
- Anthropic API Documentation. docs.anthropic.com

---

*SK8Sense · Movement Intelligence System v0.9 · Kylian Algoet · 2026*
