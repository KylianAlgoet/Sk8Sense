# SK8SENSE
## Hardware Research Document — FINALE VERSIE
### Onderbouwing van technologische keuzes + Evaluatie na prototype
**Kylian Algoet**
**Multimedia & Creatieve Technologie**
**Final Work — Academiejaar 2025–2026**

---

## 1. Inleiding

Dit document beschrijft het onderzoek naar de hardware componenten die geselecteerd zijn voor de ontwikkeling van het SK8Sense prototype, aangevuld met de definitieve evaluatie na afronding van de bouw. Naast de oorspronkelijke onderbouwing van elke keuze bevat dit document ook de bevindingen uit de praktijk: problemen die optraden, aanpassingen die nodig waren, en componenten die aan het originele plan werden toegevoegd.

Het project SK8Sense vereist een sensormodule die onder een skateboard bevestigd kan worden, beweging en druk meet, en deze data draadloos naar een mobiele applicatie stuurt. Dit document bespreekt elk component dat hiervoor gebruikt werd.

---

## 2. Onderzoeksmethode

Voor het selecteren van de juiste componenten werden de volgende criteria gehanteerd:

- Technische geschiktheid voor het meten van skateboard beweging en druk
- Kostprijs binnen het budget van een studentenproject
- Levertijd compatibel met de projectplanning van 5 weken
- Beschikbaarheid van documentatie en community support
- Compatibiliteit met de gekozen software stack (React Native, Arduino IDE)
- Energieverbruik passend bij draagbaar gebruik op batterij
- Robuustheid voor outdoor gebruik en mechanische schokken

Voor elke componentcategorie werden minimaal twee alternatieven onderzocht en vergeleken aan de hand van bovenstaande criteria.

---

## 3. Microcontroller — ESP32

### 3.1 Gekozen oplossing
**NodeMCU ESP32-S WROOM 38-pin**

De ESP32-S is een dual-core 240MHz microcontroller met geïntegreerde Wi-Fi en Bluetooth Low Energy (BLE). Voor SK8Sense is BLE de cruciale feature, aangezien de sensor draadloos data naar de mobiele app moet sturen.

### 3.2 Onderzochte alternatieven

| Optie | Voordelen | Nadelen | Verdict |
|---|---|---|---|
| ESP32-S (gekozen) | BLE ingebouwd, 18 ADC pinnen, goedkoop, Arduino IDE compatible | Iets hoger verbruik dan nRF52 | **GEKOZEN** |
| Arduino Nano 33 BLE | Goede BLE, ingebouwde IMU | Duurder (€25), minder ADC pinnen | Te duur |
| Raspberry Pi Pico W | Krachtig, Wi-Fi | Geen BLE op alle modellen, complexer | BLE inconsistent |
| Arduino Uno + HC-05 module | Bekend, simpel | Klassieke Bluetooth (geen BLE), groot | Verouderde Bluetooth |

### 3.3 Onderbouwing keuze

De ESP32-S werd gekozen om de volgende redenen:
- Bluetooth Low Energy is essentieel voor draadloze communicatie met minimaal energieverbruik
- Ingebouwde dual-core processor laat toe om sensor sampling en BLE communicatie parallel uit te voeren
- 18 analoge inputs zijn voldoende voor de IMU (I2C) en de 4 FSR druksensoren (analoog)
- Programmeerbaar via Arduino IDE (via PlatformIO), wat de leercurve verlaagt
- Prijs van circa €10 maakt het mogelijk om een backup module te bestellen
- Uitgebreide community en documentatie versnellen het ontwikkelproces

### 3.4 Aankoop
Twee stuks besteld bij Otronic.nl (NL), levertijd 1 tot 3 werkdagen naar België.

### 3.5 ⚠️ Bevinding na prototype — Kritiek voltageprobleem

**Probleem ontdekt tijdens testen:**
De ESP32 NodeMCU bevat een AMS1117-3.3 LDO-spanningsregelaar die minimaal **4.5–4.8V** nodig heeft op de VIN-pin om stabiel 3.3V te leveren aan de microcontroller. Een LiPo-batterij levert slechts 3.7V (nominaal) tot 4.2V (volledig geladen).

**Gevolg:** Wanneer de ESP32 op batterij werd aangesloten, functioneerde de chip op het randje. Bij het opstarten van de BLE-radio — die korte vermogenspieken van 200–250mA veroorzaakt — zakte de spanning onder de drempelwaarde van de LDO, waardoor de chip resettte of BLE niet startte.

**Symptomen:**
- LED brandde zwakker op batterij dan op USB
- BLE advertisement was niet detecteerbaar via de telefoon
- ESP32 startte op maar de BLE scanning in de app vond het apparaat niet

**Oplossing — MT3608 Boost Converter:**
Een MT3608 DC-DC step-up converter werd toegevoegd aan het circuit. Deze verhoogt de 3.7–4.2V van de LiPo naar een stabiele 5V, ingesteld via een trimmer weerstand. Deze 5V gaat naar de VIN-pin van de ESP32, waarna de interne AMS1117 regelaar correct 3.3V levert aan alle componenten.

**Circuit na aanpassing:**
```
Batterij+ → TP4056 B+ → TP4056 OUT+ → MT3608 IN+ → MT3608 OUT+(5V) → Schakelaar → ESP32 VIN
Batterij- → TP4056 B- → TP4056 OUT- → MT3608 IN- → ESP32 GND
```

**Leerpunt:** Bij het selecteren van een microcontroller voor batterijgevoed gebruik is de minimum input voltage van de interne spanningsregelaar een kritieke parameter die vooraf gecontroleerd moet worden.

---

## 4. IMU Bewegingssensor — MPU6050

### 4.1 Gekozen oplossing
**MPU6050 GY-521 module**

De MPU6050 is een 6-axis Inertial Measurement Unit met een 3-axis accelerometer en 3-axis gyroscoop. De sensor communiceert via I2C met de ESP32 en kan tot 1000 samples per seconde leveren, wat ruim voldoende is voor de gewenste 100Hz sampling rate.

### 4.2 Onderzochte alternatieven

| Optie | Specificaties | Prijs | Verdict |
|---|---|---|---|
| MPU6050 (gekozen) | 6-axis, I2C, ±16g, ±2000°/s | €4–5 | **GEKOZEN** |
| MPU9250 / MPU9265 | 9-axis (incl. magnetometer) | €10–15 | Magnetometer niet nodig |
| BNO055 | 9-axis met sensor fusion | €25–30 | Te duur |
| ADXL345 (alleen accel) | 3-axis accelerometer | €3 | Geen gyroscoop |

### 4.3 Onderbouwing keuze

De MPU6050 is voor SK8Sense ideaal omdat:
- De 6-axis configuratie laat toe om zowel translatie (acceleratie) als rotatie (gyroscoop) te meten — beide cruciaal voor trick detectie
- Een magnetometer (zoals in de MPU9250) is niet nodig voor skate tricks, en zou interferentie veroorzaken bij metalen onderdelen in skateparken
- Het bereik van ±8g op de accelerometer (geconfigureerd in firmware) is voldoende voor de pop kracht van een ollie
- De sensor wordt al jaren gebruikt in onderzoek en hobbyprojecten, met betrouwbare libraries voor Arduino
- De prijs is laag genoeg om een backup te kopen

### 4.4 Bevindingen na prototype

**I2C betrouwbaarheid op perfboard:**
Bij de overgang van breadboard naar gesoldeerd perfboard traden intermitterende I2C-verbindingsproblemen op (`Wire.cpp: requestFrom(): i2cWriteReadNonStop returned Error 263`). Dit bleek te wijten aan twee oorzaken:

1. **Koude lassen** op de VCC en GND verbindingen van de MPU6050 zorgden voor wisselend contact bij beweging. Opgelost door alle verbindingen te hersolleren tot glanzende verbindingen.
2. **Snelheid van de I2C bus**: de standaard kloksnelheid van 400kHz bleek gevoeliger voor ruis op een perfboard. Door `Wire.setClock(100000)` toe te voegen (100kHz), werden alle I2C-fouten geëlimineerd ten koste van een minimaal hogere latency — volledig acceptabel voor 100Hz sampling.

**Trick detectie met gyroscoop:**
De gyroscoop bleek betrouwbaar genoeg voor de detectie van kickflips (rotatie rond de lengterichting, GX-as) en shove-its (rotatie rond de verticale as, GY-as) op basis van piekwaarden tijdens de luchttijd. Drempelwaarden werden empirisch vastgesteld:
- Kickflip: GX piek > 180°/s
- Heelflip: GX piek < –180°/s
- BS/FS Shove-it: |GY| piek > 160°/s

---

## 5. Drukmeting — FSR Sensoren

### 5.1 Gekozen oplossing
**4× Adafruit Round Force-Sensitive Resistor (FSR 402, C3063-003, 12mm)**

Force Sensitive Resistors zijn dunne, flexibele drukstrips die hun weerstand aanpassen op basis van toegepaste kracht. Ze zijn ideaal voor het meten van voetdruk op een skateboard omdat ze plat genoeg zijn om onder griptape te plaatsen zonder zichtbaar te zijn.

### 5.2 Onderzochte alternatieven

| Optie | Voordelen | Nadelen | Verdict |
|---|---|---|---|
| FSR 12mm rond (gekozen) | Plat, betaalbaar, snel | Slechts puntmeting, geen zone | **GEKOZEN** |
| Velostat drukmat (DIY) | Volledige drukheatmap | Complex, fragile, veel kabels | Te ambitieus voor 5 weken |
| Load cells | Hoge precisie | Te dik, niet flexibel | Niet geschikt voor onder griptape |
| Capacitieve sensoren | Geen mechanische slijtage | Complex te kalibreren, duur | Buiten budget en tijd |

### 5.3 Onderbouwing keuze

Vier FSR sensoren werden gekozen omdat:
- Vier zones (neus, hiel, teen, staart) leveren genoeg informatie om verschillende tricks te onderscheiden
- De 12mm ronde versie is groot genoeg om voetdruk betrouwbaar te detecteren maar klein genoeg om onder griptape te passen
- FSR sensoren zijn passieve componenten — geen voeding nodig, alleen een voltage divider met een 10kΩ weerstand
- Een vijfde FSR werd besteld als backup

### 5.4 Schakelschema per FSR (voltage divider)
```
ESP32 3.3V ──── FSR poot 1
                FSR poot 2 ──── GPIO pin (ADC)
                                    │
                                  10kΩ
                                    │
                                   GND
```

GPIO toewijzing: Nose → GPIO34, Heel → GPIO35, Toe → GPIO32, Tail → GPIO33

### 5.5 ⚠️ Bevindingen na prototype — Meerdere kritieke fouten

**Fout 1 — Weerstanden naar verkeerde referentie (SVP i.p.v. GND):**
Tijdens de eerste soldeersessie werden alle 10kΩ weerstanden naar de SVP-pin (GPIO36) gesoldeerd i.p.v. naar GND. SVP is een ADC-ingangspin met hoge impedantie, wat betekende dat alle FSR-signaallijnen een gemeenschappelijk referentiepunt deelden. Het gevolg: het indrukken van één sensor activeerde alle sensoren tegelijk.

*Oplossing:* Alle weerstanden opnieuw gesoldeerd naar de GND-pin bovenaan links op de ESP32.

**Fout 2 — Koude lassen na hersolleren:**
Na het verplaatsen van de weerstanden waren enkele verbindingen met koude lassen gesoldeerd, waardoor de 3.3V voeding naar de FSR-sensoren niet doorging en alle sensoren 0 lazen.

*Oplossing:* Elke verbinding controleerd op glanzend uiterlijk, koude lassen opnieuw verhit en aangevuld met soldeertin.

**Fout 3 — GND van MPU6050 via weerstand:**
Bij één soldeersessie werd de GND van de MPU6050 abusievelijk via een weerstand verbonden naar de ESP32 GND, in plaats van direct. Dit veroorzaakte een spanningsval op de GND-lijn, wat leidde tot I2C-fouten.

*Oplossing:* GND altijd direct verbinden, nooit via een weerstand.

**Eindresultaat na alle correcties:**
Alle 4 FSR-sensoren werken volledig geïsoleerd en reageren correct op druk. Testresultaten:
- Nose (GPIO34): ruststatus 0, bij druk ~3900–4095/4095
- Heel (GPIO35): ruststatus 0, bij druk ~3900–4095/4095
- Toe (GPIO32): ruststatus 0, bij druk ~3900–4095/4095
- Tail (GPIO33): ruststatus 0, bij druk ~3900–4095/4095

---

## 6. Voeding — LiPo + TP4056 + MT3608

### 6.1 Gekozen oplossing
**LiPo 3.7V 2000mAh + TP4056 micro-USB oplaadmodule + MT3608 boost converter**

> **Nota:** De originele planning voorzag een 1000mAh batterij zonder boost converter. Na de ontdekking van het voltageprobleem beschreven in sectie 3.5 werden de keuzes bijgesteld.

### 6.2 Definitieve componentkeuze

| Component | Specificatie | Reden voor keuze |
|---|---|---|
| LiPo batterij | 3.7V, 2000mAh, 103450 | Hogere capaciteit dan origineel gepland, voldoende voor meerdere sessies |
| TP4056 lader | Micro-USB, 5V 1A | Laadt batterij veilig, ingebouwde bescherming |
| MT3608 boost | In: 2–24V, Uit: instelbaar tot 28V | Verhoogt 3.7V naar stabiele 5V voor ESP32 |
| SS12D00G2 schakelaar | SPDT, 300mA rated | Aan/uit knop voor volledige stroomonderbreking |

### 6.3 Herziene stroomberekening

| Component | Verbruik |
|---|---|
| ESP32 (BLE actief) | ~150mA gemiddeld |
| MPU6050 | ~4mA |
| 4× FSR voltage dividers | ~1.3mA |
| MT3608 boost converter efficiëntie | ~10% overhead |
| **Totaal geschat** | **~175mA** |

Met een 2000mAh batterij: 2000 / 175 ≈ **~11 uur theoretisch**, in praktijk **6–8 uur** door BLE piekstromen. Ruim voldoende voor meerdere skatesessies.

### 6.4 TP4056 laadstatus
- **Rode LED:** actief laden
- **Blauwe LED:** volledig geladen (4.2V)

---

## 7. Communicatie — NimBLE (BLE stack)

### 7.1 Gekozen oplossing
**NimBLE-Arduino library v1.4.3**

Voor de BLE-implementatie op de ESP32 werd NimBLE-Arduino gebruikt in plaats van de standaard ESP-IDF Bluetooth stack. NimBLE biedt lagere geheugenvoetafdruk en betrouwbaardere advertising.

### 7.2 BLE protocol

Het apparaat adverteert als "SK8Sense" met een vaste service UUID. De karakteristiek verstuurt JSON-data via NOTIFY op 100Hz:

```json
{
  "ax": -4.37, "ay": 0.40, "az": 7.96,
  "gx": -5.83, "gy": 1.34, "gz": 0.56,
  "trick": "none",
  "f1": 0, "f2": 0, "f3": 0, "f4": 0
}
```

### 7.3 ⚠️ Bevindingen — BLE advertising zichtbaarheid

**Probleem:** Op batterij adverteerde het apparaat correct (verificeerbaar via Serial Monitor), maar was het niet zichtbaar in de BLE-scan van de mobiele app.

**Oorzaak:** NimBLE plaatst de apparaatnaam standaard in de scan response, niet in het hoofdadvertisement-pakket. Sommige Android-versies doen geen actieve scan en missen daardoor de scan response.

**Oplossing:** Service UUID expliciet toegevoegd aan het hoofdadvertisement-pakket:
```cpp
pAdvertising->addServiceUUID(SERVICE_UUID);
```

De app filtert op MAC-adres en naam voor betrouwbare identificatie.

---

## 8. Behuizing — 3D Geprinte Behuizing

### 8.1 Gekozen oplossing
**PLA 3D-geprinte behuizing, ontworpen in Fusion 360**

Een custom behuizing werd ontworpen en geprint om alle elektronica te beschermen tijdens het skaten.

### 8.2 Ontwerpcriteria
- Past op het midden van het skateboard deck (niet interfereren met trucks of voetplaatsing)
- Genoeg ruimte voor ESP32, perfboard met FSR-bedrading, batterij en TP4056
- Toegang voor micro-USB oplading zonder demontage
- Schakelaar zichtbaar en bereikbaar aan de zijkant

### 8.3 Bevindingen
De behuizing werd succesvol geprint en gemonteerd. Kabels naar de FSR-sensoren worden via gaten in de onderkant van de behuizing naar de corners van het deck geleid. De behuizing houdt stand bij normaal gebruik, al zal toekomstige iteraties betere kabelgeleiding en schroefdraad voor de deksel bevatten.

---

## 9. Samenvattend overzicht — Definitieve componentenlijst

| Component | Functie | Aantal | Status |
|---|---|---|---|
| ESP32-S NodeMCU 38-pin | Microcontroller + BLE | 2 | ✅ Werkend |
| MPU6050 GY-521 | 6-axis IMU | 2 | ✅ Werkend (100Hz) |
| Adafruit FSR Round 12mm | Drukmeting × 4 zones | 5 (4+backup) | ✅ Alle 4 werkend |
| LiPo 3.7V 2000mAh | Voeding | 2 | ✅ Werkend |
| TP4056 micro-USB lader | Veilig opladen LiPo | 2 | ✅ Werkend |
| **MT3608 boost converter** | **3.7V → 5V (nieuw)** | **2** | **✅ Oplossing voltage issue** |
| SS12D00G2 schakelaar | Aan/uit | 3 | ✅ Werkend |
| Perfboard | Permanente montage | 2 | ✅ Gesoldeerd |
| 10kΩ weerstanden | Voltage divider FSR | 10 | ✅ |
| Soepele draad set | Bedrading | 1 set | ✅ |
| 3D-geprinte behuizing (PLA) | Bescherming elektronica | 1 | ✅ |

### 9.1 Toegevoegde component t.o.v. oorspronkelijk plan

De **MT3608 boost converter** was niet voorzien in de originele component­selectie. Na het ontdekken dat de AMS1117 LDO op de ESP32 NodeMCU minimaal 4.5V nodig heeft terwijl een LiPo-batterij slechts 3.7–4.2V levert, werd deze component toegevoegd als essentiële schakel in het voedingscircuit.

### 9.2 Totale gerealiseerde kost
De totale hardwarekost bedraagt circa **€125–140** (verzending inbegrepen), inclusief de niet-geplande MT3608 boost converters (€4 per stuk). Dit valt binnen het voorziene budget.

---

## 10. Risicoanalyse — Evaluatie na realisatie

| Risico | Mitigatie gepland | Wat effectief gebeurde |
|---|---|---|
| Componentuitval | 2× van elk kritiek component | Geen uitval tijdens prototype |
| Levertijd | Otronic.nl (1–3 dagen) | Levering binnen 2 werkdagen ✅ |
| Breadboard compatibiliteit ESP32 | ESP32-S gekozen | Geen breadboard-problemen ✅ |
| Mechanische schade tijdens skaten | 3D-geprinte behuizing | Behuizing geprint en gemonteerd ✅ |
| **Voltage issue op batterij** | **Niet voorzien** | **MT3608 toegevoegd als oplossing** |
| **FSR cross-talk / kortsluiting** | **Niet voorzien** | **GND-bedrading gecorrigeerd** |

---

## 11. Conclusie

De geselecteerde hardware vormt een werkende, gebalanceerde combinatie van prestaties, kostprijs en haalbaarheid. Het prototype demonstreert succesvol:

- **100Hz IMU-streaming** via BLE naar de mobiele app
- **Realtime trick detectie** (Ollie, Kickflip, Heelflip, BS/FS Shove-it) op basis van gyroscoop piekwaarden
- **4 onafhankelijke FSR-zones** voor voetdrukdetectie op neus, hiel, teen en staart
- **Draadloos gebruik op batterij** dankzij de toegevoegde boost converter

De twee belangrijkste leerpunten zijn:

1. **Altijd de minimum input voltage van LDO-regelaars controleren** bij batterijgevoed gebruik — dit leidde tot de noodzakelijke toevoeging van de MT3608.
2. **GND-verbindingen nooit via weerstanden** leiden — dit veroorzaakte zowel I2C-instabiliteit als FSR-kortsluiting.

Dit research document dient als naslagwerk én als procesverslag van de werkelijk gemaakte keuzes en ontdekte problemen, geschikt als technische onderbouwing voor de eindjury van het Final Work.

---

*SK8Sense · Hardware Research · Kylian Algoet · MCT · 2025–2026*
