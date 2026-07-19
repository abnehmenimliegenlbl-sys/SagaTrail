# SagaTrail – Feature-Übersicht

---

## 1. Der Sagen-Teil

SagaTrail verbindet echte Schweizer Wanderwege mit authentischen, historisch belegten Legenden aus der jeweiligen Region.

### Kuratierte, historische Inhalte
- Alle Sagen stammen aus öffentlich zugänglichen, historischen Quellen (z. B. Alois Lütolf, *Sagen, Bräuche, Legenden*, 1862) — keine KI-generierten Geschichten
- Pro Kanton mindestens 8 sorgfältig ausgewählte Sagen, abgestimmt auf reale, begehbare Wanderrouten in der Nähe des Sagenschauplatzes
- Jede Sage ist geografisch verankert: Die Route führt zum tatsächlichen Ort des Geschehens

### Mehrsprachige Audio-Narration
- Professionell eingelesene oder hochwertige KI-Stimmen (ElevenLabs) in **8 Sprachen**: Deutsch, Schweizerdeutsch (GSW), Englisch, Französisch, Italienisch, Spanisch, Portugiesisch, Chinesisch
- GPS-getriggerte Narration: Kapitel der Geschichte werden automatisch abgespielt, wenn der Wanderer den entsprechenden Wegpunkt erreicht
- Hintergrundwiedergabe auch bei gesperrtem Bildschirm (native Audio-Session)
- Automatischer Fallback auf OpenAI-Stimme (gpt-audio) wenn ElevenLabs-Kontingent erschöpft

### Adaptive Erzählweise
- **Altersstufen**: Inhalte werden für Kinder, Jugendliche oder Erwachsene aufbereitet
- **Erzählstil (Archetyp)**: Auswahl zwischen verschiedenen Stimmungen – von «düster-atmosphärisch» bis «familienfreundlich-heiter»
- **Entscheidungspunkte**: Interaktive Weggabelungen in der Geschichte, beantwortet per Sprache (Spracherkennung) oder per Tippen — die Antwort beeinflusst die Nuancen der Erzählung

### Sagen-Sammlung & Fortschritt
- Entdeckte Sagen werden in einer persönlichen Sammlung («Sammlung») gespeichert
- Einmal gehörte Sagen sind dauerhaft entsperrt und können jederzeit wiederholt werden
- Verdiente Abzeichen & Errungenschaften für abgeschlossene Wanderungen

---

## 2. SagaTrail als ernst zu nehmende Wanderapp

SagaTrail ist nicht nur eine Storytelling-App — sie bietet alle Kernfunktionen einer vollwertigen Schweizer Wander-Navigation.

### Karten & Navigation
- **Professionelle Kartengrundlage**: Carto Voyager (topografisch) und swisstopo SWISSIMAGE (Satellit) mit nahtlosem Umschalten
- **Waymarked Trails-Overlay**: Offizielle Schweizer Wanderwege direkt auf der Karte eingeblendet (gelb = Bergwanderweg, rot = Bergweg, blau = Alpinroute)
- **Aerialway-Overlay**: Seilbahnen und Gondeln entlang der Route
- **2D/3D-Umschaltung**: Geländeansicht mit einstellbarer Höhenüberhöhung
- **GPS-Live-Tracking**: Echtzeit-Positionsanzeige mit Richtungs- und Distanzhinweis zum Routenanfang
- **Abbiegehinweise**: Echte abbiegungsbasierte Navigationsansagen aus der Routengeometrie
- **Offroute-Erkennung**: Automatische Erkennung bei > 80 m Abweichung vom Weg mit Neuberechnungslogik

### Routendaten & Schwierigkeit
- Routen direkt aus OpenStreetMap (Overpass API) pro Kanton, gefiltert nach Länge und Qualität
- **SAC-Schwierigkeitsgrad**: T1–T6 aus dem swisstopo TLM3D-Datensatz, direkt auf der Routenseite angezeigt
- **Höhenprofil**: Interaktives Elevationsprofil mit Auf- und Abstieg sowie Gesamtdistanz
- Routenumkehr für Hin- und Rückweg mit einem Tippen

### Wandermetriken
- Live-Distanz, Aufstieg, verbleibende Zeit und Restdistanz während der Wanderung
- **Schrittzähler**: Exponents-Sensors Pedometer, misst Schritte pro Wanderung
- **Herzfrequenzbasierte Pausen** (in Entwicklung): Stufe 1 via GPS/Kadenz-Auswertung

### Sicherheit & Notfall
- **SOS-Button**: Direktwahl zu Rega (1414) oder Euronotruf (112) mit einem Tippen
- **Koordinaten per SMS**: Automatisches Versenden der aktuellen GPS-Koordinaten an einen gespeicherten Notfallkontakt
- **Offline-Betrieb**: Gespeicherte Routen inklusive Kacheln und Audio funktionieren ohne Mobilnetz

### Offline-Modus
- Drei-Stufen-Offline-Modell:
  1. **Sagen** (Text, Audio) — immer offline verfügbar nach Download
  2. **Routendaten** — Geometrie und Metadaten offline speicherbar
  3. **Kartenkacheln** — stufenweise Tile-Downloads für die Wanderregion
- Download-Fortschrittsanzeige in Echtzeit

### Wetter & Lawinen
- **Live-Wetterbericht** für den Routenbereich
- **EAWS-Lawinenbulletin** (European Avalanche Warning Services v6): Gefahrenstufe 1–5 inkl. Tendenz für alpine Kantone, automatisch deaktiviert im Sommer
- **Wegzustände** (Community): Nutzer melden Live-Bedingungen auf dem Weg — «Top Zustand», «Schnee», «Matschig», «Blockiert» — mit Emoji und Zeitstempel

### SBB & ÖV-Integration
- **Abfahrtszeiten vom aktuellen Standort** («SBB live am Start»): Zeigt nächste Abfahrten vom nahegelegensten Bahnhof zum aktuellen GPS-Standort
- **Abfahrtszeiten am Routenziel** («SBB live am Ziel»): Nächste Verbindungen für die Rückreise vom Routenendpunkt
- **Mit SBB anreisen**: Ein-Klick-Link zu sbb.ch mit vorausgefülltem Abfahrtsbahnhof (GPS-Standort) und Zielbahnhof (Trailhead)
- **SBB-Rückreise**: Direktlink mit vorausgefüllter Von/Nach-Verbindung vom Routenende zum Routenstart
- Echtzeit-Verspätungen und Gleisangaben

### Gruppentouren
- **Gruppen-Wanderung** (Premium): Synchronisierung in Echtzeit — ein Leader führt die Gruppe, alle anderen sehen dieselben Story-Kapitel und Navigationshinweise gleichzeitig
- Servergestützte Leader-Kontrolle (nur der Leader kann Kapitel steuern)
- Automatische Resynchronisation für spät Dazustossende

### Batterie & Performance
- **Energiesparmodus**: Reduzierte GPS-Genauigkeit und Karten-Updates zum Schutz des Akkus
- Hintergrund-GPS via expo-task-manager Foreground-Service Task

---

## 3. Features für Partner

SagaTrail bietet lokalen Betrieben entlang der Wanderrouten eine direkte Präsenz in der App.

### Sichtbarkeit auf der Karte und Routenseite
- **Partner-Kachel auf der Routenseite**: Betriebe (Restaurants, Shops, Hotels, SAC-Hütten) erscheinen als hervorgehobene Kacheln auf der Detailseite jeder nahegelegenen Route
- **Partner-Badge**: Kacheln von Partnerbetrieben sind visuell mit einem «Partner»-Abzeichen gekennzeichnet — sofort erkennbar gegenüber normalen OSM-Einträgen
- **Foto**: Eigenes Titelbild pro Betrieb, das prominent in der Kachel und im Detail-Modal angezeigt wird

### Detailreiches Modal
- Beim Antippen öffnet ein vollflächiges Detail-Modal mit:
  - Hochauflösendem Foto
  - Name, Höhenangabe (bei SAC-Hütten)
  - Aktueller Öffnungsstatus (Offen/Saisonschluss) basierend auf Öffnungszeiten
  - Vollständige Beschreibung des Betriebs
  - **Angebot/Deal-Box**: Hervorgehobene Angebotszeile (z. B. «10 % Rabatt für SagaTrail-Nutzer»)
  - Direktanruf-Button
  - Reservierungs-/Website-Button

### Kategorien
- **SAC-Hütten**: Erweiterte Daten gegenüber dem reinen OSM-Eintrag (eigenes Foto, Beschreibung, Reservierungslink)
- **Restaurants & Gaststätten**: Inkl. Speiseangebot und spezieller Deals
- **Shops & Dienstleister**: Lokale Anbieter mit eigenem Auftritt

### Partner-Administration
- Eigenes Admin-Dashboard (webbasiert) für Partnerbetriebe
- CRUD-Schnittstelle für Einträge: Foto, Beschreibung, Angebot, Öffnungszeiten, Koordinaten
- Zeitlich begrenzte Aktivierungen möglich (aktivVon / aktivBis)

### Geografische Zuordnung
- Partner werden automatisch der nächstgelegenen Route und den entsprechenden SAC-Hütten in einem konfigurierbaren Radius (Standard: 400 m Matching-Radius) zugeordnet
- Kein manuelles Hinzufügen von Routen nötig — die Zuordnung erfolgt serverseitig

---

## 4. Vorteile für Nutzer

| Bereich | Konkrete Vorteile |
|---|---|
| **Erlebnis** | Wanderungen werden zu immersiven Kulturerlebnissen — historische Legenden erwachen direkt am Schauplatz zum Leben |
| **Sprache** | Vollständige App-Erfahrung in 8 Sprachen — ideal für Touristen und internationale Nutzer |
| **Navigation** | Professionelle Kartengrundlage (swisstopo) kombiniert mit GPS-Tracking, Abbiegehinweisen und Offroute-Erkennung |
| **Sicherheit** | SOS-Funktion mit Rega-Direktwahl und automatischer GPS-Koordinaten-SMS — kein Umweg über andere Apps |
| **Offline** | Kein Mobilnetz nötig: Routen, Geschichten, Audio und Karten vollständig downloadbar |
| **ÖV** | Direkte SBB-Integration: Kein Suchen auf sbb.ch — Abfahrtszeiten vom eigenen Standort und Rückreise-Link sind fertig vorausgefüllt |
| **Planung** | Höhenprofil, SAC-Schwierigkeit, Wegzustand-Meldungen und Wetter auf einen Blick vor Tourstart |
| **Personalisierung** | Erzählstil, Altersstufe, Sprache, Stimme und Archetyp frei wählbar — die Geschichte passt sich dem Wanderer an |
| **Community** | Live-Wegzustände von anderen Nutzern — tagesaktuelle Informationen statt veralteter Wanderführer |
| **Kinder & Familie** | Kindergerechte Erzählung, interaktive Entscheidungspunkte und altersangepasste Inhalte machen Familienausflüge zu Abenteuern |
| **Gruppentouren** | Familien oder Freundesgruppen erleben dieselbe Geschichte synchron — kein Auseinanderdriften im Erlebnis |
| **Entdecken** | Persönliche Sagensammlung dokumentiert alle gehörten Legenden und geleisteten Wanderungen als bleibendes Andenken |

---

## 5. Vorteile für Partner

| Bereich | Konkrete Vorteile |
|---|---|
| **Reichweite** | Direkter Zugang zu einer qualifizierten Zielgruppe: Wanderer, die sich aktiv für Schweizer Kultur und lokale Angebote interessieren |
| **Kontextuelle Präsenz** | Die Empfehlung erscheint genau dann, wenn der Wanderer in der Nähe ist — nicht als Werbebanner, sondern als natürlicher Teil der Route |
| **Sichtbarkeit ohne Aufwand** | Automatische Zuordnung zu allen nahegelegenen Routen — Partner müssen keine Wanderrouten manuell pflegen |
| **Reservierungen & Anrufe** | Direkter Aktionsbutton im Modal: Ein Tippen genügt für einen Anruf oder eine Online-Buchung |
| **Dealdarstellung** | Eigene Angebots-/Rabattzeile prominent sichtbar im Detail-Modal — steigert Konversionsrate gegenüber reinen Verzeichniseinträgen |
| **Differenzierung** | Partner-Badge und eigenes Foto heben den Betrieb deutlich von nicht-partnernden OSM-Einträgen ab |
| **Saisonsteuerung** | Zeitlich begrenzte Aktivierungen (z. B. nur Sommersaison) — keine veralteten Einträge, kein Administrationsaufwand ausserhalb der Saison |
| **Qualität der Nutzer** | SagaTrail-Nutzer planen bewusst, sind kulturell interessiert und gehen überdurchschnittlich oft in lokale Gastronomiebetriebe nach der Tour |
| **Admin-Portal** | Eigenständige Verwaltung von Fotos, Beschreibung und Angebot über ein einfaches Web-Interface — keine technischen Kenntnisse nötig |
| **Authentizität** | Integration in eine App, die auf Qualität und Glaubwürdigkeit setzt (historische Quellen, keine KI-Sagen) — der Marken-Kontext ist positiv |
