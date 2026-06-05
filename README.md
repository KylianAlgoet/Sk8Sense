# SK8Sense

Movement Intelligence System voor skateboard coaching.

SK8Sense is een werkend prototype van een slimme skateboardcoach. Het systeem bestaat uit een sensormodule onder het skateboard en een mobiele app die live beweging, druk, impact en trickpogingen zichtbaar maakt. Het board meet wat een skater zelf niet kan zien: pop, airtime, rotatie, landing en drukverdeling.

Het project werd gemaakt door Kylian Algoet als Final Work voor Multimedia & Creative Technology, academiejaar 2025-2026.

## Status

Dit is geen los idee en geen enkel schermconcept. SK8Sense is een werkend hardware- en softwareprototype:

- de ESP32 leest een MPU6050 en vier FSR-druksensoren uit;
- de sensordata wordt via Bluetooth Low Energy naar de app gestuurd;
- de app toont live pitch, roll, impact, FSR-druk en trickstatus;
- sessies kunnen gestart, gevolgd, gestopt en opgeslagen worden;
- trick-detectie gebeurt regelgebaseerd op de firmware;
- AI-coaching geeft korte feedback op basis van sessie- en trickdata;
- de sensormodule zit in een fysieke 3D-geprinte behuizing voor montage onder het deck.

Terminologie: de eerste breadboardfase was een technische haalbaarheidstest. Het eindresultaat van dit project is een werkend prototype. In de magazine-tekst hoort het finale resultaat dus niet beschreven te worden als alleen een concept, maar als een gebouwd, getest en geïntegreerd prototype.

## Onderzoeksvraag

Hoe kan technologie het leren van skateboardtricks toegankelijker, meetbaar en motiverender maken zonder dat er constant een fysieke coach nodig is?

SK8Sense beantwoordt die vraag door een bestaand skateboard te veranderen in een meetinstrument. Het prototype registreert elke poging, vertaalt ruwe sensordata naar begrijpelijke feedback en helpt de skater gerichter oefenen.

## Het Probleem

Skateboardtricks leren gebeurt vaak op gevoel. Beginners leren via trial-and-error, YouTube, TikTok of videoanalyse achteraf. Dat helpt, maar het blijft moeilijk om te begrijpen wat er precies fout liep tijdens een poging.

Een ollie of kickflip duurt maar een fractie van een seconde. De belangrijkste techniek zit in ongeveer 200 ms: pop, voetdruk, airtime, rotatie, catch en landing. Een coach kan niet elke microbeweging zien. Een skater die zichzelf filmt ziet vaak wel dat het fout ging, maar niet waarom.

SK8Sense lost dat op door het board zelf te laten meten.

## De Oplossing

SK8Sense bestaat uit twee grote delen:

1. Een sensormodule onder het skateboard.
2. Een mobiele app voor live feedback, sessies, learning en coaching.

De sensormodule meet 100 keer per seconde hoe het board beweegt. De app maakt die data bruikbaar: live dashboard, trickfeed, session summary, learning tab en AI-coaching.

Belangrijk: de trick-detectie is bewust niet als black-box AI gebouwd. De ESP32 herkent tricks met transparante, regelgebaseerde logica op basis van fysica. De AI zit in de coachinglaag, niet in de detectielaag.

## Kernzin

Een coach kijkt naar een leerling. Een sensor kijkt naar elke poging.

## Wat Werkt Er Al?

### Hardware

- ESP32-S WROOM leest alle sensoren uit.
- MPU6050 meet versnelling en rotatie.
- Vier FSR 402 druksensoren meten voetdrukzones.
- BLE-advertising en datastream werken.
- Batterijvoeding werkt stabiel met TP4056 en MT3608 boost converter.
- De module zit in een finale PETG-behuizing met aparte deksel.
- Montage onder het deck is uitgewerkt via centrale positie tussen de trucks.

### Firmware

- 100 Hz sensor sampling.
- JSON-payload via BLE Notify.
- Regelgebaseerde trick-detectie.
- Airtime-detectie via acceleratie.
- Flip- en shove-it-detectie via gyroscooppieken.
- FSR-data wordt meegestuurd naar de app.
- I2C-stabiliteit verbeterd met 100 kHz bus clock.

### App

- Login en registratie via Firebase.
- Onboarding flow.
- BLE scan en connect flow.
- Live dashboard met pitch, roll, impact en FSR-bars.
- Live board visualisatie.
- Start/stop live session.
- Trick detection feed.
- Session summary.
- Trick breakdown.
- Session log via Firestore.
- Learning tab voor ollie, kickflip en pop shove-it.
- Trick intro met stappen.
- Practice mode met pogingfeedback.
- Profile en history flow.
- AI Coach feedback via Claude Haiku.

## Product Flow

De app is opgebouwd rond de echte flow van een skater:

1. Open de app.
2. Log in of registreer.
3. Zet het board aan.
4. Scan naar `SK8Sense`.
5. Verbind via BLE.
6. Kalibreer het board plat.
7. Start een live session.
8. Skate en laat het board data meten.
9. Bekijk live feedback en trick-detecties.
10. Stop de sessie.
11. Bekijk summary, trick breakdown en AI-analyse.
12. Oefen verder via de learning tab.

## Live Session

De live session is het hart van SK8Sense.

Tijdens een live session toont de app:

- sessietimer;
- aantal detecties;
- status van de sensorconnectie;
- pitch;
- roll;
- impact;
- tail pressure;
- FSR-druk voor nose, heel, toe en tail;
- live board visualisatie;
- detection banner bij trickherkenning;
- recente trickfeed;
- AI-tip of coachingtip.

De app gebruikt de firmware-output als primaire detectiebron. Wanneer de ESP32 een trick classificeert, logt de app die poging in de actieve sessie.

## Session Summary

Na `END SESSION` toont de app een summary:

- totale duur;
- aantal tricks;
- tricks per minuut;
- max impact;
- trick breakdown per tricktype;
- volledige trick log met timestamps;
- AI Coach analyse van de sessie.

Wanneer een gebruiker ingelogd is, wordt de sessie opgeslagen in Firestore. Daardoor kan de app sessiegeschiedenis en progressie tonen.

## Learning Tab

De learning tab helpt skaters om de MVP-tricks stap voor stap te begrijpen.

| Trick | Doel |
| --- | --- |
| Ollie | De basis: pop, slide, board levelen en landen |
| Kickflip | Flick, fliprotatie, catch en landing |
| Pop shove-it | Tail scoop en horizontale boardrotatie |

Elke trick heeft:

- eigen trick card;
- moeilijkheid;
- categorie;
- korte beschrijving;
- movement breakdown;
- stappen met tips;
- start practice knop.

## Practice Mode

Practice mode is de oefenflow van de app. De skater werkt eerst door losse stappen en daarna door volledige pogingen.

Practice mode bevat:

- timer;
- huidige trick;
- stapvoortgang;
- boardvisualisatie;
- pogingresultaat;
- korte coachingtip;
- rounds van vijf pogingen;
- success rate per round;
- practice summary.

Als een board verbonden is, toont de app dat er live sensorcontext aanwezig is. Zonder board kan practice mode in simulatiemodus gebruikt worden om de learning flow te testen.

## Detectie: Geen Black Box

SK8Sense gebruikt geen AI om de trick zelf te raden. De detectie is regelgebaseerd en draait op de ESP32. Dat maakt de werking uitlegbaar en snel.

De firmware kijkt naar:

- totale acceleratiemagnitude;
- airtime;
- landing impact;
- piekrotatie rond X-as;
- piekrotatie rond Y-as;
- FSR-drukwaarden als extra context.

State machine:

```text
IDLE -> AIRTIME -> LANDING -> IDLE
```

Belangrijkste drempels:

```cpp
AIRTIME_MAG_MAX = 6.5f
LAND_MAG_MIN    = 15.0f
AIRTIME_MIN_MS  = 80
KICK_THRESHOLD  = 180.0f
HEEL_THRESHOLD  = 180.0f
SHUV_THRESHOLD  = 160.0f
```

Ondersteunde detecties:

| Trick | Detectielogica |
| --- | --- |
| Ollie | Airtime zonder dominante flip- of shuv-rotatie |
| Kickflip | Sterke positieve X-rotatie tijdens airtime |
| Heelflip | Sterke negatieve X-rotatie tijdens airtime |
| Backside shuv | Sterke Y-rotatie in backside richting |
| Frontside shuv | Sterke Y-rotatie in frontside richting |

## AI Coaching

De AI-laag wordt pas gebruikt nadat een trick of sessie al gemeten is. Claude Haiku vertaalt de data naar korte, bruikbare coachingtaal.

De feedbackregels:

- maximaal kort;
- geen lange uitleg;
- skate-taal;
- externe focus;
- gericht op de volgende poging;
- niet "buig je knieen", maar "stay over the bolts".

Voorbeelden van de gewenste toon:

```text
Stay over the bolts.
Pop through the tail.
Catch it closer to the board.
Keep the board under you.
```

## Hardware Architectuur

```text
Skateboard
  ESP32-S WROOM
    MPU6050 via I2C
    FSR nose via ADC
    FSR heel via ADC
    FSR toe via ADC
    FSR tail via ADC
    BLE Notify
      -> React Native app
           live dashboard
           session store
           AI coaching
           Firebase
```

## Hardware Componenten

| Component | Functie | Status |
| --- | --- | --- |
| ESP32-S WROOM 38-pin | Microcontroller + BLE | Werkend |
| MPU6050 | Accelerometer + gyroscoop | Werkend op 100 Hz |
| 4x FSR 402 | Drukzones onder griptape | Alle 4 geisoleerd werkend |
| LiPo 3.7V 2000 mAh | Batterij | Werkend |
| TP4056 | LiPo laadmodule | Werkend |
| MT3608 | Boost van 3.7V naar 5V | Noodzakelijk en werkend |
| Schuifschakelaar | Aan/uit | Werkend |
| Perfboard | Permanente montage | Gesoldeerd |
| PETG-behuizing | Bescherming onder deck | Finale versie |

## Pinout

| Onderdeel | ESP32 pin | Functie |
| --- | --- | --- |
| MPU6050 SDA | GPIO21 | I2C data |
| MPU6050 SCL | GPIO22 | I2C clock |
| FSR nose pocket | GPIO34 | ADC |
| FSR heel side | GPIO35 | ADC |
| FSR toe side | GPIO32 | ADC |
| FSR tail pocket | GPIO33 | ADC |
| Voeding | VIN/5V | Via MT3608 boost |
| GND | GND | Gemeenschappelijke massa |

FSR voltage divider:

```text
3.3V -> FSR -> ADC pin -> 10k ohm -> GND
```

Belangrijk leerpunt: de 10k pull-down weerstanden moeten naar GND, niet naar SVP/GPIO36.

## Sensorplaatsing

De sensormodule zit centraal onder het deck, tussen de trucks.

Waarom daar:

- de trucks beschermen de module beter tegen directe impact;
- het middelpunt geeft representatieve boardbeweging;
- de module zit niet onder de voeten;
- de montage kan logisch via skateboard bolts en truckposities;
- de sensor verandert het skategevoel niet.

De FSR-sensoren zitten onder het griptape op vier drukzones:

| FSR | Positie | Wat het meet |
| --- | --- | --- |
| Nose pocket | Voorste voet vooraan | Nose press, manual, catch-context |
| Heel side | Hielzijde | Kickflip/flick-context |
| Toe side | Teenzijde | Heelflip/flick-context |
| Tail pocket | Achterste voet | Pop-kracht |

## Behuizing

De behuizing werd iteratief ontwikkeld:

1. Eerste rode PLA-print om maatvoering en indeling te testen.
2. Grotere finale PETG-versie voor de echte integratie.
3. Aparte zwarte deksel.
4. Openingen voor laadpoort, schakelaar en kabeldoorvoer.
5. Montage met skateboard bolts en moeren via de truck-bolt-posities.

PETG is gekozen voor de finale versie omdat het taaier is dan PLA, beter tegen warmte kan en geschikter is voor trillingen onder een skateboard.

## Voeding

De originele aanname was dat een LiPo direct genoeg zou zijn voor de ESP32 NodeMCU. Dat bleek fout.

Probleem:

- LiPo levert 3.7V nominaal en 4.2V volledig geladen.
- De AMS1117-regulator op de ESP32 NodeMCU vraagt ongeveer 4.5V of meer op VIN.
- BLE-pieken deden de spanning zakken.
- Resultaat: BLE advertising werkte niet betrouwbaar op batterij.

Fix:

```text
LiPo -> TP4056 -> MT3608 boost naar 5V -> schakelaar -> ESP32 VIN
```

Na de MT3608 werkte BLE op batterij stabiel.

## BLE Protocol

Device name:

```text
SK8Sense
```

Service UUID:

```text
4fafc201-1fb5-459e-8fcc-c5c9c331914b
```

Characteristic UUID:

```text
beb5483e-36e1-4688-b7f5-ea07361b26a8
```

Voorbeeldpayload:

```json
{
  "ax": -4.3,
  "ay": 0.4,
  "az": 8.0,
  "gx": -5.8,
  "gy": 1.3,
  "gz": 0.6,
  "trick": "none",
  "f1": 0,
  "f2": 0,
  "f3": 0,
  "f4": 0
}
```

Velden:

| Veld | Betekenis |
| --- | --- |
| `ax`, `ay`, `az` | Acceleratie in m/s^2 |
| `gx`, `gy`, `gz` | Gyroscooprotatie in deg/s |
| `trick` | Herkende trick of `none` |
| `f1` | FSR nose, 0-1023 |
| `f2` | FSR heel, 0-1023 |
| `f3` | FSR toe, 0-1023 |
| `f4` | FSR tail, 0-1023 |

## Testresultaten

Het prototype werd getest via PlatformIO Serial Monitor, Expo dev client en field tests.

### Bench Tests

| Test | Resultaat |
| --- | --- |
| Boot test | Status actief binnen 3 seconden |
| BLE bereik | Stabiel tot ongeveer 8 meter in open ruimte |
| Sample rate | 100 Hz gedurende 60 seconden |
| Packet loss | Minder dan 2 procent |
| Batterijstream | 6+ uur bevestigd met 2000 mAh LiPo |
| FSR isolatie | Alle 4 sensoren onafhankelijk werkend |
| Pitch/roll | Live zichtbaar in app |

### Gemeten waarden

| Situatie | Waarde |
| --- | --- |
| Rust plat | AX ongeveer -4.38, AY ongeveer 0.40, AZ ongeveer 7.96 m/s^2 |
| Gyro drift stil | Minder dan 0.5 deg/s |
| FSR ruis los | Ongeveer 300 ADC, weggefilterd met threshold |
| Live kanteling | Pitch -21.4 graden, roll 26.7 graden correct zichtbaar |

### Field Test

Het prototype werd niet alleen op tafel getest. Er is ook getest in een echte skatecontext met board, spot en live dashboard. De field test bevestigde dat hardware, app-interface en gebruikssituatie samen logisch voelen.

Getest:

- board statisch bewegen;
- pitch en roll kantelen;
- FSR-drukzones activeren;
- volledige sessieflow;
- kickflip/ollie/shuv detectie via gyro en airtime;
- appfeedback tijdens live sessie.

## Wat Misging En Hoe Het Gefixt Is

De fouten zijn belangrijk omdat ze bewijzen dat het prototype echt gebouwd, getest en verbeterd werd.

| Fail | Oorzaak | Fix |
| --- | --- | --- |
| BLE werkte niet op batterij | AMS1117 kreeg te weinig VIN uit LiPo | MT3608 boost converter toegevoegd |
| FSR cross-talk | Pull-downs naar SVP/GPIO36 in plaats van GND | Alle weerstanden naar GND verplaatst |
| Alle FSR's lazen 0 | Losse 3.3V en koude lassen | Verbindingen opnieuw gesoldeerd |
| MPU6050 viel weg bij trilling | I2C op 400 kHz te gevoelig op perfboard | `Wire.setClock(100000)` |
| Boardnaam niet zichtbaar in BLE scan | Naam zat in scan response | Service UUID expliciet geadverteerd |
| 3D viewer instabiel | expo-gl incompatibel met RN 0.81.5 | Stabiele Animated fallback |
| Pitch/roll bleef 0.0 graden | Stale closure in BLE callback | Waarden direct uit sensorData berekend |

## Markt En Doelgroep

SK8Sense richt zich op een duidelijke marktgap: veel skaters leren zelfstandig, maar er bestaat weinig toegankelijke sport-tech die specifiek skateboardtricks meet en coacht.

Doelgroep:

- leeftijd 14-25;
- beginner tot intermediate;
- skaters die tricks willen leren zonder dure lessen;
- skaters die zichzelf al filmen maar niet weten waarom een poging misgaat;
- coaches die objectieve data per leerling willen.

Personas uit het magazine:

| Persona | Profiel | Waarom SK8Sense helpt |
| --- | --- | --- |
| Kobe, 16 | Beginner, skatet 6 maanden | Wil weten wat fout gaat bij tricks |
| Lars, 22 | Intermediate, data-gedreven | Wil consistentie meten |
| Elien, 28 | Skatecoach | Wil data over elke poging van leerlingen |

## Scope

### Must Have

- BLE-verbinding ESP32 naar app.
- Realtime IMU-streaming op 100 Hz.
- Trick-detectie voor ollie, kickflip en shove-it logica.
- Sessies opnemen en bewaren.
- Firebase gebruikersauthenticatie.
- Live board visualisatie met pitch en roll.

### Should Have

- Vier FSR-druksensoren.
- AI-coaching via Claude Haiku.
- Profiel met statistieken.
- Sessie-samenvatting.
- Kalibratie van sensoren.

### Could Have

- 3D skateboardvisualisatie.
- Leermodule met stap-voor-stap tricks.
- Video-synchronisatie.
- Multiplayer of vrienden vergelijken.

### Bewust Niet In MVP

- TensorFlow Lite on-device ML.
- Volledig FSR-gebaseerde trick-detectie.
- iOS-build.
- Betaalsysteem.

## Design

Het design-systeem heet MIS v3: Movement Intelligence System.

De app moest niet voelen als een bankapp of generieke fitnessapp. De visuele richting is een neo-brutalist performance OS: donker, hoekig, data-gedreven en geloofwaardig binnen skatecultuur.

Designprincipes:

- data moet snel scanbaar zijn tussen pogingen;
- elke screen heeft een duidelijke taak;
- feedback moet bruikbaar zijn, geen decoratie;
- skatecultuur en technische precisie moeten samenkomen;
- statuskleuren worden functioneel gebruikt;
- oranje accentkleur markeert actie, detectie en feedback.

Belangrijke stijlkeuzes:

| Element | Keuze |
| --- | --- |
| Achtergrond | Void black |
| Accent | Signal orange |
| Display font | Archivo |
| Data labels | IBM Plex Mono |
| Body text | Space Grotesk |
| Componenten | Ticked panels, RegStrip, MotionAI, chips, stat grids |

Design tokens:

```text
app/design-tokens.js
design-tokens.js
```

## Tech Stack

### App

| Onderdeel | Technologie |
| --- | --- |
| Framework | React Native |
| Runtime | Expo SDK 54 |
| Navigatie | React Navigation |
| State | Zustand |
| BLE | react-native-ble-plx |
| Auth | Firebase Auth |
| Database | Firestore |
| AI | Anthropic Claude API |
| Fonts | Archivo, IBM Plex Mono, Space Grotesk |

### Firmware

| Onderdeel | Technologie |
| --- | --- |
| Platform | ESP32 Arduino |
| Build tool | PlatformIO |
| BLE stack | NimBLE-Arduino |
| JSON | ArduinoJson |
| IMU library | MPU6050 |
| Sensor bus | I2C op 100 kHz |

## Projectstructuur

```text
SK8Sense/
  app/
    App.js
    app.json
    package.json
    screens/
      HomeScreen.js
      ConnectScreen.js
      DashboardScreen.js
      SessionSummaryScreen.js
      LearningScreen.js
      TrickIntroScreen.js
      PracticeScreen.js
      ProfileScreen.js
      HistoryScreen.js
    components/
      LiveBoardViewer.js
      SkateboardGL.js
      V3Shared.js
    store/
      bleStore.js
      sessionStore.js
      trickStore.js
      authStore.js
      mockBle.js
    services/
      aiCoach.js
    config/
      firebase.js
  firmware/
    platformio.ini
    src/
      main.cpp
  docs/
    magazine-process.md
    hardware-research-final.md
    sensor-mounting-final.md
    sprint-planning.md
    magazine/
  models/
  skatesense_base.stl
  skatesense_lid.stl
  electronics_base.stl
  electronics_lid.stl
  UM2C_electronics_enclosure.ufp
```

Gebruik voor ontwikkeling de top-level `app/` map. De map `app/Sk8Sense/` is een geneste kopie/snapshot en is niet het primaire startpunt.

## App Installeren En Draaien

Vereisten:

- Node.js 20 of nieuwer;
- npm;
- Expo tooling via `npx expo`;
- Android toestel voor echte BLE;
- Expo development build/dev client voor native BLE.

Installatie:

```powershell
cd C:\Users\kylia\Sk8Sense\app
npm install
npx expo start
```

Scripts:

```powershell
npm run android
npm run ios
npm run web
```

BLE werkt niet in Expo Go. Gebruik een development build/dev client voor echte Bluetooth-functionaliteit. Op web kan het dashboard met mock sensordata draaien.

## Firebase Config

Firebase wordt gebruikt voor:

- login;
- registratie;
- sessies opslaan;
- sessiegeschiedenis laden.

Configbestand:

```text
app/config/firebase.js
```

## AI Coach Config

Maak lokaal dit bestand aan:

```text
app/config/ai.js
```

Voorbeeld:

```js
export const ANTHROPIC_API_KEY = 'your-api-key';
export const AI_MODEL = 'claude-haiku-4-5-20251001';
```

## Firmware Builden En Uploaden

Vereisten:

- PlatformIO;
- ESP32 via USB;
- juiste COM-poort.

Commando's:

```powershell
cd C:\Users\kylia\Sk8Sense\firmware
pio run
pio run --target upload
pio device monitor
```

De huidige configuratie gebruikt `COM3`. Pas dit aan in:

```text
firmware/platformio.ini
```

## Hardware Bouwen

Benodigdheden:

- ESP32-S WROOM 38-pin;
- MPU6050 GY-521;
- 4x FSR 402;
- 4x 10k ohm weerstand;
- LiPo 3.7V 2000 mAh;
- TP4056 laadmodule;
- MT3608 boost converter;
- schuifschakelaar;
- perfboard;
- soepele draad;
- krimpkous;
- soldeerbout;
- 3D-geprinte behuizing.

Bekabeling:

```text
MPU6050
3V3  -> VCC
GND  -> GND
GPIO21 -> SDA
GPIO22 -> SCL

FSR per sensor
3V3 -> FSR -> ADC pin -> 10k ohm -> GND

Voeding
LiPo -> TP4056 -> MT3608 -> schakelaar -> ESP32 VIN/5V
```

## Bekende Beperkingen

SK8Sense is een werkend prototype, geen consumentenproduct.

Bekende beperkingen:

- iOS-build is buiten scope gebleven door Apple Developer-kost.
- Volledige drop-test op 80 cm en land-simulatie zijn gepland voor v2.
- AI-coaching hangt af van correcte detectie en goede sensorcontext.
- FSR's worden nu vooral gebruikt voor drukvisualisatie en context, niet als primaire trickclassifier.
- TensorFlow Lite modellen zijn nog niet toegevoegd.
- Een productieversie vraagt een compactere PCB, betere waterbescherming en langere duurtests.

## Roadmap

- Tappable trick detail na sessie.
- Clean score per poging.
- Diepere analyse per trick: pop timing, airtime, catch en landing.
- Meer sensor-gedreven feedback in practice mode.
- Video synchroniseren met sensor-events.
- Meer tricks toevoegen.
- TFLite model trainen op echte skate-data.
- PCB ontwerpen in plaats van perfboard.
- Waterbestendigere behuizing.
- Productievere montage en kabelgeleiding.

## Documentatie In Deze Repo

- `docs/magazine-process.md` - volledige procesdocumentatie.
- `docs/hardware-research-final.md` - hardware research.
- `docs/sensor-mounting-final.md` - sensorplaatsing en bescherming.
- `docs/sprint-planning.md` - planning en proces.
- `docs/magazine/` - magazinecontent en screenshots.

## Bronnenbasis

De keuzes in SK8Sense zijn onderbouwd met onderzoek naar:

- motorisch leren en feedback;
- externe-focus instructies;
- IMU-gebaseerde trickherkenning;
- BLE voor kleine realtime sensordatapakketten;
- ESP32 datasheets;
- MPU6050 datasheets;
- FSR datasheets;
- Expo, React Native, Firebase en BLE-documentatie.

Belangrijkste inhoudelijke lijn:

- Schmidt & Lee: motorisch leren en feedback.
- Wulf, Shea & Lewthwaite: externe focus werkt beter dan interne focus.
- Tang et al.: IMU-data kan gebruikt worden voor skateboard trick recognition.
- Bluetooth SIG: BLE is geschikt voor kleine low-power datastreams.
- Espressif, InvenSense en Interlink: hardwarekeuzes en sensorwerking.

## Conclusie

SK8Sense toont dat technologie skateboardtricks toegankelijker, meetbaar en motiverender kan maken zonder dat er constant een fysieke coach naast de skater staat.

Het prototype doet dat door een bestaand skateboard uit te breiden met sensoren, de data live naar een mobiele app te sturen, tricks regelgebaseerd te herkennen en de skater feedback te geven die direct bruikbaar is voor de volgende poging.

De belangrijkste nuance blijft: de intelligentie zit niet in magische detectie, maar in een eerlijke combinatie van fysica, sensordata, transparante logica en korte coaching.

## Auteur

Kylian Algoet  
Multimedia & Creative Technology  
Final Work 2025-2026  
SK8Sense - Movement Intelligence System v0.9
