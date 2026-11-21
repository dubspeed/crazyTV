# CrazyTV – Konzept für einen Prototypen

> Arbeitstitel: **CrazyTV**. Eine moderne, mobilfreundliche Senderchef-Simulation im Browser,
> inspiriert vom Genre, das *Mad TV* (1991) begründet hat. Low-Poly-3D, moderne UI,
> Streaming-Ära-Satire.

---

## 1. Recherche: Was das Original konnte

**Mad TV** – Rainbow Arts, 1991, Amiga & MS-DOS, Lead-Design Ralph Stock.

### Spielprinzip
- Man ist **Programmdirektor** eines von drei Sendern; die zwei anderen werden von der KI gespielt.
- Alle drei Sender sitzen im **selben 13-stöckigen Hochhaus** und laufen dort **in Echtzeit**
  herum. Aufzug und Büros kann immer nur eine Person gleichzeitig benutzen. Man kann Konkurrenten
  also blockieren und selbst wertvolle Sekunden verlieren.
- Ein Spieltag hat ca. **8 Ingame-Stunden Sendezeit**: Programmblöcke und Werbeblöcke müssen
  belegt werden. Wer täglich dasselbe sendet, verliert Zuschauer.

### Mechaniken
| Bereich | Wie es im Original funktioniert |
|---|---|
| **Image** | Die drei Sender teilen sich 100 Image-Punkte. Wer in einer Stunde die beste Quote hat, nimmt dem Schlechtesten einen Punkt ab. Unter 5 Punkten feuert dich der Chef: Game Over. |
| **Programmplanung** | Genre × Sendeplatz entscheidet: Liebesfilme/Komödien in der Primetime, Krimis am frühen Abend, Kultur um 22 Uhr. FSK-18-Filme erst ab 21 Uhr. |
| **Filmhändler** | Filme, Serien und Shows kaufen (später auch per Auktion, vor allem im Fan-Remake TVTower). |
| **Werbung** | Werbeverträge mit Mindestquote und Deadline. Wer nicht rechtzeitig ausstrahlt, zahlt Strafe statt Geld zu verdienen. |
| **Nachrichten** | Nachrichten können eingekauft und gesendet werden. |
| **Eigenproduktion** | Drehbuchautor, Studio-Makler, eigene Studios. Daraus entstehen eigene Serien, Shows und Werbespots. |
| **Zufallsereignisse** | Terroranschläge auf Konsulate und Gerichtsvollzieher räumen Büros. Freie Räume kann man als Studio kaufen. |
| **Sabotage** | Konkurrenten ausspionieren und sabotieren (z. B. vertauschte Türschilder, Bomben in Räumen). |
| **Liebesgeschichte** | Hauptziel: Betty im 13. Stock heiraten. Sie mag Kulturprogramm, das aber Quote und Werbegeld kostet. Ihre Zuneigung kann nie höher als dein Image sein. Man gewinnt sie erst, wenn beide Rivalen geschlagen sind. |
| **Ton** | Viel absurder Humor und skurrile Figuren im Haus. Dazu eine berüchtigt schlechte Übersetzung („Denglisch“). Der Humor war Teil des Kults. |

### Nachfolger & Remakes
- *Mad News* (1994, inoffiziell, Ralph Stock), *Mad TV 2* (1996, offiziell, nur DE).
  2001/02 zeitweise Freeware.
- *M.U.D. TV* (2010, Kalypso), *Mad Television Tycoon* (2026, Early Access).
- **TVTower** (früher TVGigant, Open Source): nah am Original, plus Auktionen, wiederkehrende
  Werbung, Online-Spiel, Antenne/Kabel/Satellit als Sendewege.
- **madtv-online.com**: Fan-Browserspiel mit Multiplayer, Highscores, Forum und Raumbau.

### Was den Reiz ausmacht (Designerkenntnis)
1. **Zeitdruck + Räumlichkeit:** Planung ist nicht nur eine Tabelle. Man muss physisch zum Händler
   laufen, und der Rivale steht vielleicht schon drin.
2. **Zielkonflikt:** Quote vs. Image vs. Geld vs. Herzensziel. Nichts lässt sich gleichzeitig maximieren.
3. **Direkte Konkurrenz:** Die Rivalen sind sichtbar, greifen ein und spielen unfair.
4. **Humor:** Das Spiel nimmt das Fernsehen nicht ernst.

---

## 2. Abgrenzung: Hommage, kein Remake

Wir übernehmen **Genre und Mechanik-Ideen**, aber **keine** Namen, Figuren, Grafiken, Musik oder
Texte des Originals (kein „Mad“, keine Betty, kein Alfred E. Neuman, keine Original-Räume 1:1).
Figuren, Gebäude, Inhalte und Humor sind eigenständig. Das passt ohnehin besser, weil das
Fernsehen 2026 ein komplett anderes Biest ist.

---

## 3. Die Idee: Linear-TV im Streaming-Zeitalter

**Pitch:** *Du übernimmst „Kanal 7½“, einen sterbenden Privatsender in einem Glas-Tower, der sich
eine Etage mit zwei rivalisierenden Sendern teilt. Draußen fressen die Streaming-Giganten die
Zuschauer. Mach das Programm, das die Leute wieder einschalten lässt, oder geh unter.*

### Die Welt
- **Drei Sender im Tower:** du + zwei KI-Rivalen mit Persönlichkeit, z. B.
  - **„TRASH24“** – Reality & Skandal, spielt dreckig (Sabotage-Fan).
  - **„Prestige One“** – Qualitätsfernsehen, teuer, arrogant, sammelt Preise.
- **Die Streaming-Riesen** als Wetter-artige Fremdmacht (nicht spielbar):
  **NETFLUX**, **Amazone Prime Slime**, **Dizzy+**, **HBNo**, **YouTuube**, **TokTik**.
  Sie droppen Mega-Staffeln („Alle 10 Folgen ab Freitag!“), und an dem Abend bricht deine Quote ein.
  Man kann aber **Second-Window-Rechte** von ihnen kaufen oder gegen ihre Drops anprogrammieren.

### Herzensziel (ersetzt die Romanze, optional)
**Die „Goldene Fernbedienung“** – der Branchenpreis am Saisonende. Die Jury (exzentrische
Medienkritikerin **Dr. Ilka Sendeschluss** im Penthouse) bewertet Qualität und Image, nicht Quote.
Wie im Original entsteht so ein Zielkonflikt: Quote bringt Geld, die Jury will Anspruch.
Eine kleine, augenzwinkernde Romance-Option kann später als Nebenstrang kommen.

---

## 4. Kern-Gameplay

### 4.1 Tagesablauf (durchgehende Echtzeit, wie im Original)
Ein Spieltag läuft **ohne Unterbrechung von 08:00 bis 01:00** (ca. 4–5 Min. Echtzeit bei 1×, Pause und 2× möglich).

- **08–18 Uhr:** Räume besuchen, kaufen, verhandeln, Streiche spielen.
- **18–01 Uhr:** Das Programm läuft **live**, Stunde für Stunde, während du weiter durch den Turm läufst. Eine laufende oder gesendete Stunde ist fest. Alle späteren Stunden kannst du bis zuletzt umplanen, z. B. um 18:30 noch schnell einen Film für 20 Uhr kaufen. Live-Quoten stehen im HUD, das Wohnzimmer ist eine optionale Ansicht.
- **01 Uhr:** Bilanz, dann der nächste Tag.

Eine **Saison = 14 Tage**.

### 4.2 Der Tower (das räumliche Herz)
Low-Poly-3D-Querschnitt („Puppenhaus“-Ansicht). Man tippt auf einen Raum, und die eigene Figur
läuft hin bzw. nimmt den Aufzug. **Jeder Raum ist gleichzeitig nur für einen Spieler offen.**
Der Aufzug ist ein Engpass, das Treppenhaus langsamer.

| Etage | Raum | Funktion |
|---|---|---|
| Penthouse | **Jury-Lounge** | Fortschritt zur Goldenen Fernbedienung, Geschenke/Einladungen |
| 6 | **Chefetage (Investor:in)** | Gibt Tagesziele/Mahnungen, feuert dich bei zu wenig Image oder Geld |
| 5 | **Content-Markt** | Lizenzen kaufen (Filme, Serien, Shows); täglich wechselndes Angebot; **Live-Auktionen** für Blockbuster |
| 4 | **Werbeagentur „AdVantage“** | Werbedeals: Mindestquote, Zielgruppe, Anzahl Spots, Deadline, Strafe |
| 3 | **Newsroom** | Nachrichten-Feed, Trending Topics, Breaking-News-Slots |
| 2 | **Writers' Room & Studio** | Eigenproduktionen (Konzept + Cast + Budget) |
| 1 | **Social-Media-Büro** | Hype aufbauen (Trailer, Influencer-Kooperation, Memes). Erhöht die Startquote einer Sendung. |
| EG | **Lobby / Kiosk** | Geschenke, Gerüchte, Rivalen beobachten |
| UG | **Hausmeister Kalle** | Harmlose Streiche gegen Rivalen (Konfetti im Büro, Antennen-Kitzler) + Flurfunk über deren Programm |
| eigene Etage | **Senderbüro + Archiv** | Programmplaner, eigenes Archiv, Statistiken |

**Ereignisse im Tower (modernisierte Zufallsereignisse):**
Shitstorm vor der Tür, Influencer blockiert den Aufzug für ein Selfie-Video, Stromausfall,
Steuerprüfung räumt ein Büro (wird als Studio mietbar), Klimaaktivisten kleben am Content-Markt-Tresen.

### 4.3 Programmplanung (Blockraster wie im Original)
Der Abend hat **7 Stundenblöcke** (18–01 Uhr). Jeder Block besteht aus **55 Min. Programm + 5 Min. Werbeblock**.
Sendungen dauern **1–4 Blöcke** (Serien/Talk 1, Filme und große Shows 2–3, Epen 4). Lange Sendungen werden jede Stunde von Werbung unterbrochen, halten ihr Publikum aber stark über die Pause.
Der Spieler muss Lücken passend füllen, Sendungen verschieben (▲/▼, tauscht mit dem Nachbarn) und entfernen. Eine laufende Sendung kann nicht abgebrochen werden, der Werbespot der laufenden Stunde ist bis :55 änderbar.
Jeder Werbespot wird am Ende seines Blocks ausgewertet: Quote geschafft = **Teilzahlung** (Gesamtsumme / Spots), sonst nichts. Ist die Frist nicht mehr zu schaffen, gibt es sofort eine Strafe. Feedback: Stempel im Fernseher (✓ +27k / ✗), Toast und Jubel der Figur.

### 4.4 Zuschauermodell (einfach erklärbar, tief genug)
Fünf **Zielgruppen** mit unterschiedlichen Vorlieben je Uhrzeit:
**Gen Z**, **Millennials**, **Familien**, **Boomer**, **Nerds**.

Quote einer Sendung pro Stunde ≈
`Basisqualität × Genre-Fit(Uhrzeit, Zielgruppe) × Hype × Frische (Wiederholungs-Malus)`
`× Trend-Bonus (passt zum Tagestrend) × Konkurrenz-Split × Streaming-Druck`

- **Frische:** Wiederholungen und abgenudelte Serien verlieren Zuschauer.
- **Trends:** Newsroom meldet z. B. „#TrueCrime trendet“ → passendes Genre heute +20 %.
- **Konkurrenz-Split:** Die Zuschauer einer Zielgruppe verteilen sich auf alle drei Sender und
  „Streaming/Aus“.
- **Streaming-Druck:** Globaler Malus, der an Drop-Abenden steigt.
- **Lead-in-Effekt:** Ein starkes Programm vorher hält Zuschauer für die nächste Stunde.

### 4.5 Wirtschaft & Siegbedingungen
- **Ressourcen:** Geld, **Image** (geteilt zwischen den drei Sendern, wie im Original:
  Stundensieger nimmt Punkte vom Letzten), **Hype**, **Jury-Punkte**.
- **Verlust:** Image unter Schwelle oder Konto zu lange im Minus → die Investorin feuert dich.
- **Sieg (Saisonende):** Goldene Fernbedienung gewinnen *und* Marktführer sein. Teilsiege werden
  mit Rang/Sternen bewertet (gut für Wiederspielbarkeit).

### 4.6 Werbung
Deals mit Bedingungen, z. B. *„Energy-Drink ‚VOLT ZERO‘: 4 Spots, Zielgruppe Gen Z, min. 1,2 Mio.,
bis Tag 5 – 80.000 € / Strafe 40.000 €“*. Moderne Varianten:
- **Product Placement** in Eigenproduktionen (Geld + Image-Malus).
- **Sponsoring** einer Sendung („präsentiert von …“).
- **Shoppable TV** (Geld nach Quote statt fix).

### 4.7 Eigenproduktion (im Prototyp vereinfacht)
Writers' Room: **Format + Genre + Cast-Stufe + Budget** wählen → nach X Tagen fertig.
Erfolgreiche Formate bekommen Staffeln, floppende werden abgesetzt (sendbare Meme-Momente).

### 4.8 Sabotage & Rivalen-KI
KI-Rivalen bewegen sich sichtbar durch den Tower, blockieren Räume und bieten bei Auktionen mit.
Persönlichkeitsprofile steuern Kauf- und Programmstrategie. Sabotage kostet Geld und birgt
Entdeckungsrisiko (Image-Malus, „Skandal“-Schlagzeile).

---

## 5. Inhalte: Moderne TV-Satire

Alle Titel sind eigene Parodien, keine echten Werke. Beispiele für den Content-Markt:

| Genre | Titel (Parodie) | Note |
|---|---|---|
| Reality-Dating | **„Love Island Exit – Gestrandet & Getrennt“** | Gen Z ↑, Jury ↓↓ |
| Krimi | **„Tatort Kleingarten“** | Wer hat den Gartenzwerg entführt? |
| Prestige-Drama | **„Die Erbinnen von Hohenwalde“** | Jury ↑↑, teuer |
| Koch-Battle | **„Das perfekte Desaster“** | Familien ↑ |
| Sci-Fi | **„Stranger Schnitzel“** (80er-Nostalgie aus der Provinz) | Millennials, Nerds |
| K-Drama | **„Liebe im 7. Untergeschoss“** | Nische, loyale Fans |
| Survival-Spielshow | **„Tintenfisch-Lotto“** | riesiger Hype, kurze Halbwertszeit |
| Anime | **„Mecha-Hausmeister Shin“** | Nerds, Spätprogramm |
| Late Night | **„Gegen Mitternacht mit Jan Bäumerling“** | Image ↑ |
| Influencer-Show | **„Unboxing Deutschland“** | billig, Image ↓ |
| Doku | **„Planet Erde – Jetzt in 8K und hoffnungslos“** | Jury ↑ |
| Sitcom | **„How I Met Your Steuerberater“** | Dauerbrenner, wiederholbar |
| eSports | **„Bundesliga der Bots“** | Gen Z |
| Spielfilm | **„Fast & Furios 14: Parkplatzsuche“** | Blockbuster, Auktion |

**Nachrichten-Beispiele:** „KI-Toaster gewinnt Bundestagswahl in Gemeinde“, „NETFLUX erhöht Preise –
Kündigungswelle“, „Hitzewelle: Zuschauer bleiben drin“ (globaler Zuschauer-Bonus).

Inhalte sind **datengetrieben** (JSON), damit sie sich leicht erweitern lassen – später auch
per KI generierbar.

---

## 6. Präsentation & UI

### Visueller Stil
- **Low-Poly-3D**, flache Farben, weiches Licht, kleine „Diorama“-Anmutung.
  Tower als aufgeschnittenes Puppenhaus, Figuren als kantige Chibi-Figuren mit Lauf-Animation.
- Farbcodes je Sender (du = Türkis, TRASH24 = Pink, Prestige One = Gold).
- Fernseher-Momente: Der Sendeabend wird in einem **Low-Poly-Wohnzimmer** gezeigt. Eine
  Familie reagiert auf das Programm (lacht, schläft ein, schaltet um).

### Moderne UI
- Glas-/Card-UI, große Touch-Ziele, **Bottom-Sheets** auf Mobile, Panels auf Desktop.
- **Programmplaner** als vertikale Timeline (Mobile) bzw. Wochenraster (Desktop).
- **Live-Quotenkurve** + **Social-Feed** mit Fake-Kommentaren („wer hat das bitte bestellt 💀“).
- Hochformat zuerst, Querformat unterstützt.
- Haptik-Feedback (Vibration) und kurze Sound-Effekte (prozedural über WebAudio, keine Lizenzen).

---

## 7. Technik

| Thema | Entscheidung |
|---|---|
| **Engine** | **Three.js** (WebGL), Vanilla JS/ES-Module. Kein Build-Zwang, läuft als einzelne Seite. |
| **3D-Assets** | **Blender 4.x headless per Python-Skript** (`blender -b -P scripts/build_assets.py`). Alle Modelle (Tower, Räume, Möbel, Figuren, Aufzug, TV-Wohnzimmer) werden prozedural erzeugt → Export als **glTF/GLB**. Reproduzierbar, versionierbar, keine Handarbeit. Blender ist in dieser Umgebung herunterladbar (geprüft). |
| **Figuren-Animation** | Einfache Rigs in Blender (Laufen, Warten, Jubeln) oder prozedural im Code (Wackeln/Hüpfen ist Low-Poly-typisch und spart Größe). |
| **Auslieferung** | Als **Artifact** spielbar (claude.ai): HTML-Seite + GLB-Dateien als Beidateien, Three.js von cdnjs. Zusätzlich lokal / GitHub Pages lauffähig. |
| **Speichern** | Spielstand in `localStorage` (mit Fallback ohne Speicher). |
| **Spiellogik** | Strikt getrennt von der Darstellung (`sim/`), deterministisch mit Seed. So lässt sich das Balancing headless testen (Node), und es bleibt Multiplayer-tauglich. |
| **Inhalte** | `data/*.json` (Programme, Werbedeals, News, Events). |
| **Performance** | Ziel: 60 fps auf Mittelklasse-Handy. < 5 MB Gesamtgröße, < 30k Dreiecke pro Szene, ein Material-Atlas. |

### Projektstruktur (Vorschlag)
```
crazyTV/
├─ docs/KONZEPT.md
├─ blender/            # Python-Skripte, die Assets erzeugen
│  └─ build_assets.py
├─ web/
│  ├─ index.html
│  ├─ assets/*.glb
│  ├─ src/sim/         # Spiellogik (Zuschauer, Wirtschaft, KI)
│  ├─ src/render/      # Three.js-Szenen (Tower, Wohnzimmer)
│  ├─ src/ui/          # Panels, Planer, HUD
│  └─ data/*.json
└─ tools/balance.mjs   # Headless-Simulation zum Balancing
```

---

## 8. Prototyp-Umfang (MVP)

**Ziel:** In einem Artifact spielbar, eine Saison von 14 Tagen, Spaß in den ersten 5 Minuten.

**Drin:**
- [ ] Tower in Low-Poly-3D mit **6 Räumen** (Senderbüro, Content-Markt, Werbeagentur, Newsroom,
      Chefetage, Hacker-Keller) + Aufzug, Raum-Blockade durch Rivalen
- [ ] Eigene Figur + 2 KI-Rivalen, die sichtbar im Tower agieren
- [ ] Tagesablauf: Tower-Phase → Sendeabend (Live-Quote) → Bilanz
- [ ] Programmplaner (7 Slots + Werbung + News)
- [ ] Zuschauermodell mit 5 Zielgruppen, Trends, Frische, Streaming-Drops
- [ ] ~40 Programme, ~20 Werbedeals, ~40 News, ~10 Tower-Events
- [ ] Image-System (geteilte 100 Punkte), Geld, Game Over/Saisonsieg
- [ ] 2 Sabotage-Aktionen
- [ ] Speichern/Laden, Mobile- und Desktop-Layout

**Später:**
Eigenproduktionen (voll), Auktionen, Jury/Goldene Fernbedienung als ausgebauter Strang,
Social-Media-Büro, Wohnzimmer-Szene, Multiplayer (asynchron oder live), mehr Saisons/Jahrzehnte,
KI-generierte Programme und News.

---

## 9. Meilensteine

1. **M0 – Fundament:** Blender-Pipeline (Skript → GLB), leere Three.js-Szene mit Tower, Kamera-Steuerung (Touch).
2. **M1 – Simulation headless:** Datenmodelle, Zuschauermodell, Tagesablauf, KI-Rivalen (simple) → Balancing per Node-Skript.
3. **M2 – Spielbar:** UI (Planer, Shops, HUD), Figur läuft durch Tower, Räume blockieren, Sendeabend mit Quotenkurve.
4. **M3 – Würze:** Events, Sabotage, Streaming-Drops, Humor-Texte, Sounds, Polish.
5. **M4 – Release als Artifact** + Playtest-Feedback.

---

## 10. Entscheidungen (Stand Prototyp)

| Frage | Entscheidung |
|---|---|
| Zeitmodell | **Echtzeit mit Pause** (und 2×-Tempo). Ein Tower-Tag dauert ca. 2:45 Min. |
| Sprache | **Nur Deutsch** |
| Herzensziel | Prototyp: **Jury / Goldene Fernbedienung**. Später evtl. zusätzlich eine eigene Romanze, im finalen Spiel beide Enden möglich. |
| Humor | **Familienfreundlich**: Sabotage heißt jetzt „Streiche“ (Konfetti-Kanone, Antennen-Kitzler) und läuft über Hausmeister Kalle statt über einen Hacker. Keine Krimi-Härte. |
| Multiplayer | **Nein** |

## 11. Umsetzung des Prototyps

- `blender/build_assets.py`: Erzeugt **alle 3D-Modelle prozedural** (Tower mit 14 Räumen und Einrichtung, Stadt, Figur mit Gelenken, Accessoires, Aufzug, Wohnzimmer, Trophäe) → `web/assets/crazytv.glb`.
- `web/src/sim.js`: Simulation (Zuschauermodell, Wirtschaft, Werbeverträge, Image, Jury, Chefin, KI-Rivalen). Ohne Grafik testbar.
- `web/src/world.js`: Three.js-Welt (Tower, Laufwege, Aufzug mit einer Person, Raumbelegung, Kamera, Wohnzimmer-Szene).
- `web/src/main.js`: Spielschleife, Raum-Panels, Programmplaner, Sendeabend, Bilanz.
- `tools/balance.mjs`: Spielt viele Saisons headless durch, um die Balance zu prüfen.
- `web/build.mjs`: Packt alles (inkl. Three.js und Modelle) in **eine HTML-Datei** zum Spielen als Artifact.

### Quellen
- [Wikipedia (de): Mad TV](https://de.wikipedia.org/wiki/Mad_TV)
- [Wikipedia (en): Mad TV (video game)](https://en.wikipedia.org/wiki/Mad_TV_(video_game))
- [PC Games: Retro-Rückblick auf MAD TV](https://www.pcgames.de/Mad-TV-Spiel-13137/Specials/Zum-Release-von-MUD-TV-Retro-Rueckblick-auf-den-inoffiziellen-Vorgaenger-MAD-TV-705217/)
- [madtv-online.com](https://www.madtv-online.com)
- [TVTower](https://www.tvtower.org) / [TVTower auf ModDB](https://www.moddb.com/games/tvtower/images)
