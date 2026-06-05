# Literatuurstudie — SK8Sense

> **Nota voor finalisatie:** De bronnen in dit document verwijzen naar reële onderzoeksdomeinen en gevestigde werken. Controleer elke citatie (auteur, jaartal, exacte titel) in Google Scholar of de bibliotheekcatalogus vóór indiening, en vul paginanummers aan waar nodig.

## Inleiding

Om een onderbouwde, technologisch haalbare skatecoach te ontwikkelen, werd literatuuronderzoek gevoerd binnen vier domeinen die rechtstreeks de ontwerpkeuzes van SK8Sense bepalen:

1. **Draagbare bewegingssensoren (IMU) in sport** — kan beweging betrouwbaar gemeten worden?
2. **Bewegingsherkenning uit sensordata** — hoe herken je een trick (regelgebaseerd vs. machine learning)?
3. **Motorisch leren en feedback** — welke soort feedback laat skaters sneller leren?
4. **Gamification en motivatie** — hoe houd je gebruikers betrokken?

De bevindingen verklaren waarom SK8Sense werkt zoals het werkt: een ESP32 met IMU en druksensoren, regelgebaseerde trickdetectie op het toestel, en AI-gegenereerde coaching in een gemotiveerde, gamified interface.

---

## 1. Draagbare bewegingssensoren (IMU) in sport

Inertial Measurement Units (IMU's) — sensoren die versnelling (accelerometer) en rotatiesnelheid (gyroscoop) meten — zijn de afgelopen twee decennia de standaard geworden voor bewegingsanalyse in sport. Waar bewegingsanalyse vroeger optische motion-capture-systemen in een labo vereiste, maakt de daling van prijs en formaat van MEMS-sensoren het mogelijk om beweging "in het veld" te meten.

Onderzoek binnen *Human Activity Recognition* (HAR) toont consistent aan dat een combinatie van accelerometer- en gyroscoopdata voldoende discriminerend vermogen heeft om complexe, cyclische en explosieve bewegingen te onderscheiden. In boardsporten (snowboarden, surfen, skateboarden) is de relevante beweging kort en hoog-dynamisch: een trick duurt minder dan een seconde en bevat zowel translatie (de pop, de landing-impact) als rotatie (de flip, de spin). Een 6-assige IMU vangt beide.

**Relevantie voor SK8Sense.** De gekozen MPU6050 levert 3-assige versnelling (±8g geconfigureerd) en 3-assige rotatie (±500°/s) via I2C, tot 1000 samples per seconde. Voor skateboard-tricks volstaat 100Hz ruimschoots: een ollie heeft een herkenbare versnellingssignatuur (gewichtloze fase < 6.5 m/s², gevolgd door een landingspiek), en de rotatie van een kickflip of shove-it is duidelijk zichtbaar als een gyroscoop-piek. Een magnetometer (zoals in de duurdere MPU9250) werd bewust niet gekozen: absolute oriëntatie is voor trickdetectie niet nodig, en metalen obstakels in skateparken zouden de magnetometer verstoren.

**Connectiviteit.** Voor draagbaar, batterijgevoed gebruik is Bluetooth Low Energy (BLE) de relevante standaard: laag energieverbruik, voldoende bandbreedte voor een 100Hz datastroom, en ingebouwd in de gekozen ESP32. De vereiste bandbreedte (~15 KB/s aan JSON-telemetrie) valt ruim binnen de BLE-capaciteit.

---

## 2. Bewegingsherkenning: regelgebaseerd vs. machine learning

Er bestaan twee hoofdbenaderingen om uit sensordata een trick te herkennen.

**Machine learning (ML).** Modellen getraind op gelabelde sensordata kunnen bewegingen met hoge nauwkeurigheid classificeren. De opkomst van **TinyML** en **TensorFlow Lite (Micro)** maakt het zelfs mogelijk om dergelijke modellen lokaal op een microcontroller te laten draaien, zonder internetverbinding — relevant voor outdoor skate-sessies (Warden & Situnayake, *TinyML*, O'Reilly, 2019). Het nadeel: ML vereist een grote, gelabelde dataset van tricks. Voor een project van enkele weken, met één skater en één board, is het verzamelen en correct labelen van zo'n dataset onhaalbaar.

**Regelgebaseerd (threshold-based).** Een eenvoudiger en in deze context betrouwbaarder alternatief is detectie op basis van drempelwaarden. Omdat elke trick een fysiek onderscheidende signatuur heeft, kan een toestandsmachine (state machine) de fasen van een trick herkennen:

- **Airtime:** totale versnelling daalt onder ~6.5 m/s² (gewichtloosheid)
- **Rotatie-as bepaalt de trick:** een piek op de gyroscoop X-as (lengteas van het board) = flip (kickflip/heelflip), een piek op de Y-as (verticale as) = shove-it
- **Landing:** een versnellingspiek boven ~15 m/s²

**Keuze voor SK8Sense.** Het prototype gebruikt de **regelgebaseerde aanpak** op de ESP32 zelf. Dit geeft lage latency, vereist geen dataset, en is verklaarbaar (elke detectie is herleidbaar tot een fysieke drempel). De drempelwaarden werden empirisch afgesteld tijdens het testen. ML/TinyML blijft een logische volgende stap voor een toekomstige iteratie, zodra voldoende gelabelde data verzameld is.

---

## 3. Motorisch leren en feedback

Voor het ontwerp van de coaching-feedback is de vraag niet alleen *of* we feedback geven, maar *welke soort* feedback het leren versnelt.

**Externe focus.** Het werk van Gabriele Wulf over de *focus of attention* toont over meer dan vijftien jaar onderzoek consistent aan dat een **externe focus** (aandacht op het effect van de beweging of op het object) leidt tot snellere en duurzamere motorische vaardigheidsverwerving dan een **interne focus** (aandacht op de eigen lichaamsdelen) (Wulf, *Attentional focus and motor learning: a review of 15 years*, International Review of Sport and Exercise Psychology, 2013).

Concreet: een instructie als *"breng je gewicht boven de bolts"* (extern, gericht op het board) werkt beter dan *"buig je knieën"* (intern, gericht op het lichaam).

**Timing van feedback.** Onderzoek naar motorisch leren benadrukt verder dat onmiddellijke, beknopte feedback effectiever is dan uitgestelde of overladen feedback. Skateboard-tricks gebeuren in milliseconden — een menselijke coach kan onmogelijk consistent de exacte fout op timing aanwijzen.

**Relevantie voor SK8Sense.** De AI-coach (Claude Haiku) is expliciet geïnstrueerd om **één korte tip per poging** te geven, in **externe-focus-taal** en in directe skate-cultuurtaal. De tip wordt gegenereerd op basis van de werkelijke sensordata van die poging (piekrotatie, airtime, tail-druk, landingsimpact). Zo vertaalt het systeem ruwe meetdata naar precies het soort feedback dat de literatuur als meest effectief aanwijst.

---

## 4. Gamification en motivatie

Leren skaten vereist veel herhaling, en herhaling vraagt volgehouden motivatie. Hier biedt gamification een onderbouwde oplossing.

**Zelfdeterminatietheorie (SDT).** De motivatietheorie van Deci en Ryan stelt dat intrinsieke motivatie gevoed wordt door drie psychologische basisbehoeften: **competentie** (het gevoel beter te worden), **autonomie** (zelf keuzes maken) en **verbondenheid** (sociale connectie). Goed ontworpen gamification spreekt deze behoeften aan.

**Effectiviteit van gamification.** De literatuurreview van Hamari, Koivisto en Sarsa (*Does Gamification Work? — A Literature Review of Empirical Studies on Gamification*, HICSS, 2014) concludeert dat gamification-elementen zoals punten, badges, levels en voortgangsindicatoren in de meerderheid van de bestudeerde gevallen positieve effecten hebben op betrokkenheid en gedrag — met de kanttekening dat de context en de kwaliteit van de implementatie bepalend zijn.

**Datavisualisatie als motivator.** Apps zoals Strava tonen aan dat ruwe data pas motiveert wanneer ze vertaald wordt naar betekenisvolle inzichten ("je sprong was 15% stabieler dan gisteren") in plaats van losse cijfers. Dit sluit aan bij het principe van *progressieve onthulling* in UX-design (Nielsen Norman Group): toon informatie pas wanneer ze relevant is, om de gebruiker niet te overweldigen.

**Relevantie voor SK8Sense.** Het systeem vertaalt sensordata naar herkenbare voortgang (gedetecteerde tricks, sessiestatistieken, een "readiness index"), spreekt het competentiegevoel aan via zichtbare progressie, en gebruikt een coach-achtige, motiverende tone-of-voice — bewust afgestemd op de skatecultuur (direct, eerlijk, geen corporate taal).

---

## 5. Conclusie

De literatuur onderbouwt de vier pijlers van SK8Sense:

- **IMU-sensoren** zijn betrouwbaar genoeg om skateboard-beweging te meten; een 6-assige sensor volstaat, BLE is de juiste connectiviteit.
- **Trickdetectie** kan regelgebaseerd op basis van fysieke drempelwaarden — een haalbaar en verklaarbaar alternatief voor ML wanneer een trainingsdataset ontbreekt.
- **Feedback** werkt het best wanneer ze onmiddellijk, beknopt en extern gefocust is — precies wat de AI-coach levert.
- **Gamification** is een bewezen middel om motivatie en herhaling te ondersteunen, mits doordacht geïmplementeerd.

De vernieuwing van SK8Sense ligt niet in één afzonderlijke technologie, maar in de combinatie ervan binnen een context — skateboardonderwijs — die tot nu toe technologisch onontgonnen bleef.

---

## Bronnen

*(te verifiëren en aan te vullen met paginanummers vóór indiening)*

- Wulf, G. (2013). *Attentional focus and motor learning: A review of 15 years.* International Review of Sport and Exercise Psychology, 6(1), 77–104.
- Hamari, J., Koivisto, J., & Sarsa, H. (2014). *Does Gamification Work? — A Literature Review of Empirical Studies on Gamification.* Proceedings of the 47th Hawaii International Conference on System Sciences (HICSS).
- Deci, E. L., & Ryan, R. M. (2000). *Self-Determination Theory and the Facilitation of Intrinsic Motivation, Social Development, and Well-Being.* American Psychologist, 55(1), 68–78.
- Warden, P., & Situnayake, D. (2019). *TinyML: Machine Learning with TensorFlow Lite on Arduino and Ultra-Low-Power Microcontrollers.* O'Reilly Media.
- Nielsen Norman Group. *Progressive Disclosure* en *UX guidelines for tracking applications.* nngroup.com
- Espressif Systems. *ESP32 Technical Reference Manual.*
- InvenSense. *MPU-6050 Product Specification (Datasheet).*
