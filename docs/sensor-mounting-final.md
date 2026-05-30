# SK8SENSE
## Research Document — Sensor Mounting & Protection — FINALE VERSIE
### Onderzoek naar plaatsing, bescherming en testmethodologie + Evaluatie na prototype
**Kylian Algoet**
**Multimedia & Creative Technology**
**Final Work — April–Mei 2026**

---

## 1. Inleiding

Dit document onderzoekt de drie meest kritieke fysieke aspecten van het SK8Sense hardware prototype: waar de sensormodule geplaatst wordt op het skateboard, hoe deze beschermd wordt tegen de extreme omstandigheden van skaten, en hoe de installatie systematisch getest kan worden voordat hij meegenomen wordt naar de straat.

Dit document combineert het oorspronkelijke onderzoek (uitgevoerd vóór de bouw) met de definitieve bevindingen na realisatie van het prototype. Secties gemarkeerd met ⚠️ bevatten aanpassingen of nieuwe inzichten die voortkwamen uit de praktijk.

### 1.1 Onderzoeksvragen

1. Waar op het skateboard moet de sensormodule geplaatst worden voor optimale datakwaliteit en minimale schade?
2. Welke beschermingsstrategieën garanderen dat de sensor functioneert tijdens normaal én abnormaal skategebruik?
3. Hoe kunnen we systematisch testen of de mounting setup geslaagd is voordat we live data verzamelen?
4. Welke materialen en componenten zijn nodig om bovenstaande te realiseren binnen het tijds- en budgetkader van het eindwerk?

---

## 2. Plaatsing op het skateboard

### 2.1 Anatomie van een skateboard deck

Een standaard skateboard deck heeft drie functioneel verschillende zones: nose (voorkant, omhoog gekromd), middendeel (vlak, tussen de trucks), en tail (achterkant, omhoog gekromd). De trucks zijn de metalen ophangingen waaraan de wielen vastzitten.

De sensor heeft drie eisen aan zijn plaatsing:
- **Mechanisch:** minimale impact tijdens landings en grindjes
- **Sensorisch:** zo dicht mogelijk bij het zwaartepunt van het board voor representatieve bewegingsdata
- **Praktisch:** niet in de weg bij het skaten, geen verandering aan het skate-gevoel

### 2.2 Vergelijking van mogelijke plaatsingen

| Locatie | Mechanisch | Sensorisch | Praktisch | Verdict |
|---|---|---|---|---|
| Onder nose | Slecht — krast bij elke nose grind | Slecht — randzone, asymmetrische data | Slecht — dicht bij voet | Verworpen |
| Onder tail | Slecht — krast bij elke pop en grind | Slecht — randzone, asymmetrisch | Slecht — voet komt erop | Verworpen |
| Bovenop deck (onder griptape) | Matig — niet in directe impact zone | Goed — meet board beweging direct | Slecht — verandert grip, drukt door | Verworpen voor MPU, wel voor FSR |
| **Onder deck, midden tussen trucks** | **Goed — beschermd door trucks aan weerszijden** | **Uitstekend — exact zwaartepunt board** | **Goed — geen voetcontact mogelijk** | **Gekozen** |

**Conclusie plaatsing IMU module:**
De sensormodule (ESP32 + MPU6050 + batterij) wordt gemonteerd onder het deck, exact in het midden tussen de twee trucks. De trucks fungeren als natuurlijke schokdempers en de centrale positie garandeert representatieve bewegingsdata.

### 2.3 Plaatsing van de FSR druksensoren

De FSR druksensoren zitten bovenop het deck, onder het griptape. Vier strategische meetpunten op basis van skate-biomechanica:

| Positie | GPIO | Functie | Wat detecteert het |
|---|---|---|---|
| FSR 1: Nose pocket | GPIO34 | Voorkant van voorste voet | Nose presses, manuals, kickflip catch |
| FSR 2: Heel side | GPIO35 | Heel zijde voorste voet | Kickflip flick (heel zijde druk) |
| FSR 3: Toe side | GPIO32 | Toe zijde voorste voet | Heelflip flick (toe zijde druk) |
| FSR 4: Tail pocket | GPIO33 | Achterste voet pop zone | Pop kracht voor ollie en flips |

### 2.4 ⚠️ Bevindingen na prototype — Plaatsing in praktijk

De theoretisch gekozen plaatsing bleek correct. De centrale mounting onder het deck bleef intact gedurende alle testsessies. De FSR-sensoren werden direct op het deck bevestigd via de aansluitdraden, die door de behuizing gaan naar de elektronica binnenin.

**Aanpassing bedrading:**
In de originele planning was voorzien om kanaaltjes in het hout te frezen voor de FSR-draden. In de praktijk bleek dit niet nodig: de draden zijn dun genoeg (30AWG soepele silicone draad) om langs de zijkanten van de behuizing te lopen zonder het skate-gevoel te beïnvloeden.

---

## 3. Bescherming tegen schade

### 3.1 Bedreigingen analyse

| Bedreiging | Frequentie | Risico voor sensor | Mitigatie strategie |
|---|---|---|---|
| Landing schokken (3–10G) | Bij elke trick | Loszittende soldeerpunten, scheuren in PCB | Foam demping in case, lijm op verbindingen |
| Vibraties tijdens rijden | Continu | Loskomende draadjes, ruis in data | Heat shrink op draden, software low-pass filter |
| Grindjes over metaal | Tricks zoals 50–50, board slide | Krassen op behuizing, mogelijk doorslijten | PLA behuizing, centrale plaatsing |
| Vallen op zijn kop | Bij mislukte tricks | Direct impact op behuizing | Afgeronde hoeken case, dikte 2mm wanden |
| Regen of vochtige grond | Onverwacht | Kortsluiting, batterij schade | Gesloten case, USB poort dichtmaken |
| Stof en zand | Outdoor sessies | Indringen in connectors | Gesloten case, niet-poreus materiaal |
| UV en hitte (zomer) | Lange sessies | Plastic verzwakt, batterij degradeert | Geen langdurige blootstelling prototype |
| Trillen los | Na maanden | Sensor valt eraf tijdens skaten | Schroeven door truck mounting |

### 3.2 Beschermingsstrategie in lagen

#### Laag 1: PLA behuizing

| Materiaal | Sterkte | Flexibiliteit | UV bestand | Print moeilijkheid | Verdict |
|---|---|---|---|---|---|
| **PLA** | Hoog stijf | Bros — barst bij impact | Slecht | Makkelijk | **Gekozen (prototype)** |
| ABS | Sterk | Flexibel | Goed | Moeilijk (warpt) | Alternatief voor productie |
| PETG | Sterk | Flexibel | Goed | Makkelijk | Aanbevolen voor v2 |
| TPU (rubber) | Zacht | Zeer flexibel | Matig | Moeilijk | Evt. voor dempende pads |

> **Nota:** In de originele planning was PETG voorzien. Voor het prototype werd PLA gebruikt vanwege beschikbaarheid op de schoolprinter. PLA is voldoende voor prototype-doeleinden maar een productieversie zou PETG of ABS gebruiken voor betere slagvastheid.

**Specificaties van de behuizing:**
- Wanddikte: 2mm
- Centrale plaatsing op het deck, tussen de trucks
- Schakelaar toegankelijk aan de zijkant
- Opening voor micro-USB oplading

#### Laag 2: Mechanische bevestiging via truck bouten

De sensormodule wordt bevestigd via de truck bolt-posities. Dit principe is beproefd: skateboard riser pads worden al decennia op dezelfde manier gemonteerd.

#### Laag 3: Software resilience

- Auto-reconnect bij BLE-verbindingsverlies
- Watchdog timer op de ESP32 — herstart automatisch bij crash
- Local data buffer in app — geen dataverlies bij korte verbindingsdrop
- Batterijmonitoring via GPIO36 (ADC voor spanningsmeting)
- Outlier detectie — een onverwachte 50G piek is een crash, geen trick

### 3.3 ⚠️ Bevindingen na prototype — Bescherming in praktijk

De PLA-behuizing bleef intact gedurende alle testsessies. De mounting via tape en foam bleek voldoende voor statische tests maar voor een productieversie blijven truck-bouten de voorkeur hebben.

**Toevoeging MT3608 boost converter:**
Een component die niet voorzien was in de originele beschermingsstrategie: de MT3608 DC-DC step-up converter. Deze verhoogt de 3.7V van de LiPo naar 5V voor de ESP32. Dit component wordt intern in de behuizing geplaatst naast de TP4056 lader. De extra warmteontwikkeling van de boost converter (~10% warmteverlies) is verwaarloosbaar bij de huidige stroomconsumptie.

---

## 4. Testmethodologie

### 4.1 Fase 1 — Bench tests (zonder skaten)

| Test | Methode | Slaag criterium | Resultaat |
|---|---|---|---|
| Boot test | Sensor inschakelen, LED en BLE controleren | Status actief binnen 3s, app vindt sensor | ✅ `MPU6050 OK` + `BLE advertising started` |
| BLE bereik test | App verbinden vanaf 1, 3, 5m | Stabiele connectie tot 5m minimum | ✅ Stabiel tot 8m in open ruimte |
| Sample rate test | 100Hz data ontvangen voor 60s, packet loss meten | <5% packet loss | ✅ <2% packet loss |
| Batterij test | Volledig opgeladen sensor laten streamen | Min. 4 uur continue streaming | ✅ 6+ uur op 2000mAh LiPo |
| Druk test FSR | Met vinger op elke FSR drukken | Elk FSR reageert onafhankelijk | ✅ Alle 4 volledig geïsoleerd na correcties |
| Schud test | Sensor handmatig schudden in alle richtingen | Accelerometer + gyroscoop reageren correct | ✅ Pitch/roll reageren live in app |

### 4.2 ⚠️ Aanvullende bench tests — Voortgekomen uit problemen

De volgende tests werden niet voorzien maar werden noodzakelijk door ontdekte problemen:

**FSR isolatietest:**
Na de ontdekking van de kortsluitingsfout (alle weerstanden naar SVP i.p.v. GND), werd systematisch getest of elke FSR onafhankelijk reageerde. Test protocol:
1. Druk uitsluitend op sensor X
2. Controleer dat alleen sensor X een waarde >100 toont
3. Controleer dat alle andere sensoren 0 blijven
4. Herhaal voor alle 4 sensoren

Resultaat: alle 4 sensoren volledig geïsoleerd na correcties.

**Batterij + BLE test:**
Na de ontdekking van het voltageprobleem (AMS1117 LDO heeft 4.5V nodig, LiPo geeft 3.7V) werd specifiek getest of BLE correct adverteert op batterijspanning. Test protocol:
1. USB loskoppelen, overschakelen op batterij
2. Serial Monitor open houden: verifieer `SK8Sense BLE advertising started`
3. Scan met telefoon: verifieer apparaat verschijnt in lijst
4. Verbinden: verifieer stabiele datastream

Resultaat na toevoeging MT3608 boost converter: ✅ BLE werkt stabiel op batterij.

### 4.3 Fase 2 — Drop tests (gecontroleerde schade simulatie)

> **Status:** Gedeeltelijk uitgevoerd — volledige drop test protocol niet afgerond voor prototype 1 vanwege tijdsbeperkingen. Bench tests en field tests wel volledig uitgevoerd.

| Test | Methode | Slaag criterium | Resultaat |
|---|---|---|---|
| Lichte drop | Sensor vallen vanaf 30cm | Geen schade, blijft functioneren | ✅ Uitgetest |
| Pop simulatie | Board tail slaan op tafel (10×) | Geen interne loskoppeling | ✅ Geen loskoppeling |
| Medium drop | Vanaf 80cm | Geen schade | ⏳ Niet getest in dit prototype |
| Land simulatie | Board vanaf 30cm laten vallen (5×) | Geen schade | ⏳ Gepland voor v2 |

### 4.4 Fase 3 — Field tests (echte skate sessies)

| Niveau | Activiteit | Slaag criterium | Resultaat |
|---|---|---|---|
| **A: Statische test** | Board vasthouden en bewegen, sensoren testen | Alle 4 FSR reageren, pitch/roll correct | ✅ Volledig functioneel |
| **B: Basis beweging** | Board bewegen, kantelen, neus/staart oprichten | IMU data correct, BLE stabiel | ✅ Pitch -21.4°, Roll 26.7°, Impact 9.2 correct |
| **C: Volledige sessie** | In de lucht gooien met rotaties | Trick detectie via gyroscoop | ✅ Kickflip/ollie/shove-it gedetecteerd |

**Gemeten sensorwaarden tijdens tests:**
- Rust (plat): AX ≈ –4.38, AY ≈ 0.40, AZ ≈ 7.96 m/s² (zwaartekracht correct georiënteerd)
- Gyroscoop drift: <0.5°/s bij stilstand — acceptabel voor korte trick-detecties
- FSR ruisverdieping: ~300 ADC units op losgekoppelde pinnen — gefilterd in software (threshold 300)

---

## 5. Componentenkeuze — Evaluatie na realisatie

### 5.1 Microcontroller: ESP32-S WROOM 38-pins ✅

**Oorspronkelijke keuze bevestigd.** BLE, 18 ADC-pinnen en Arduino IDE-compatibiliteit bewezen zich correct.

**Aanvulling:** Het breadboard-prototype werkte vlekkeloos. De overgang naar perfboard vereiste extra zorg bij solderen maar leverde een stabielere verbinding op.

**Kritisch leerpunt:** De AMS1117 LDO-spanningsregelaar op de NodeMCU vereist minimaal 4.5V input — dit was niet voorzien en vereiste de toevoeging van een MT3608 boost converter.

### 5.2 Bewegingssensor: MPU6050 (GY-521 module) ✅

**Oorspronkelijke keuze bevestigd.** 6-axis voldoende voor trick detectie.

**Aanvulling:** I2C-kloksnelheid teruggebracht naar 100kHz voor stabiliteit op perfboard (`Wire.setClock(100000)`). Gyroscoop-drempelwaarden empirisch vastgesteld: kickflip >180°/s, shove-it >160°/s.

### 5.3 Drukstrips: FSR 12mm rond ✅

**Oorspronkelijke keuze bevestigd.** Alle 4 zones functioneel na correctie van bedradingsfouten.

**Kritisch leerpunt:** Alle 10kΩ pull-down weerstanden moeten naar GND, nooit naar een ADC-pin zoals SVP (GPIO36).

### 5.4 Voeding: LiPo + TP4056 ⚠️ Aangepast

**Aanpassingen t.o.v. oorspronkelijk plan:**

| Parameter | Origineel gepland | Definitief gebruikt | Reden |
|---|---|---|---|
| LiPo capaciteit | 1000mAh | **2000mAh** | Grotere marge, langere runtime |
| USB connector | USB-C | **Micro-USB** | Beschikbaarheid TP4056 module |
| Boost converter | Niet voorzien | **MT3608 toegevoegd** | AMS1117 vereist 4.5V min. |
| Runtime | 6–8 uur geschat | **6+ uur bevestigd** | ✅ |

---

## 6. Definitieve componentenlijst

| # | Component | Aantal | Status |
|---|---|---|---|
| 1 | NodeMCU ESP32-S WROOM 38-pins | 2 | ✅ Beide operationeel |
| 2 | MPU6050 GY-521 | 2 | ✅ 1 in gebruik, 1 backup |
| 3 | Adafruit FSR 402 round 12mm | 5 | ✅ 4 in gebruik, 1 backup |
| 4 | LiPo 3.7V 2000mAh (103450) | 2 | ✅ 1 in gebruik |
| 5 | TP4056 micro-USB lader | 2 | ✅ Werkend |
| 6 | **MT3608 boost converter (nieuw)** | **2** | **✅ Kritisch voor BLE op batterij** |
| 7 | SS12D00G2 schuifschakelaar | 3 | ✅ 1 gemonteerd |
| 8 | 10kΩ weerstanden | 10 | ✅ |
| 9 | Soepele silicone draad 30AWG | 1 set | ✅ |
| 10 | Krimpkous assortiment | 1 doos | ✅ |
| 11 | Perfboard | 2 | ✅ Gesoldeerd |
| 12 | 3D-geprinte PLA behuizing | 1 | ✅ Gemonteerd |
| 13 | Breadboard 830-gaats | 1 | Gebruikt voor initieel prototyping |

**Totale gerealiseerde kost:** circa €130–145, inclusief niet-geplande MT3608 converters.

**Via school verkregen:**
- Soldeerbout en helping hands — clusterlokaal
- 3D-printer en PLA filament — campus print room

---

## 7. Conclusie

De fysieke realisatie van het SK8Sense prototype bevestigt grotendeels de oorspronkelijke onderzoeksconclusies, met twee kritieke aanpassingen die voortkwamen uit de praktijk:

**Wat klopte uit het oorspronkelijk onderzoek:**
- ✅ Centrale mounting onder het deck tussen de trucks is de juiste plaatsing
- ✅ FSR-sensoren onder griptape detecteren voetdruk betrouwbaar
- ✅ Gelaagde bescherming (behuizing + software) werkt in praktijk
- ✅ Systematische testfasen (bench → field) identificeerden problemen vroeg

**Wat niet voorzien was:**
- ⚠️ **MT3608 boost converter noodzakelijk** — de AMS1117 LDO op de ESP32 NodeMCU vereist 4.5V, LiPo geeft slechts 3.7V → BLE werkte niet op batterij zonder boost
- ⚠️ **FSR-bedrading kritisch** — alle pull-down weerstanden naar GND, niet naar ADC-pinnen; een fout hier zorgt voor volledige cross-talk tussen sensoren
- ⚠️ **I2C kloksnelheid** — 400kHz (standaard) is instabiel op perfboard; 100kHz elimineert alle fouten

Het prototype demonstreert dat een functionerende, draagbare sensormodule voor skateboard trick detectie haalbaar is binnen het tijdsframe en budget van een Final Work project, mits het testproces rigoureus wordt uitgevoerd en problemen systematisch worden gedocumenteerd en opgelost.

---

*SK8Sense · Sensor Mounting Research · Kylian Algoet · MCT · 2025–2026*
