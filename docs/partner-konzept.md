# SagaTrail Partnerbetriebe — Konzept & Datenanforderungen

Stand: Juli 2026

---

## 1. Pakete & Preise

| Paket | Preis/Jahr | Preis/Monat | Zielgruppe |
|-------|-----------|-------------|------------|
| **Basic** | CHF 99 | CHF 9.90 | Kleinstbetriebe, Kioske, Wegbegleiter |
| **Standard** | CHF 199 | CHF 19.90 | Restaurants, Cafés, Shops mit Wandergästen |
| **Premium** | CHF 499 | — (nur Jahresvertrag) | Hotels, Bergrestaurants, Flaggschiffe |

---

## 2. Pflichtfelder & optionale Felder pro Paket

### 2.1 Felder-Übersicht

| Feld | Basic | Standard | Premium | Hinweis |
|------|:-----:|:--------:|:-------:|---------|
| Name | ✅ | ✅ | ✅ | |
| Kategorie | ✅ | ✅ | ✅ | Siehe §3 |
| Kanton | ✅ | ✅ | ✅ | Für Saga-Zuordnung |
| Position (lat/lng) | ✅ | ✅ | ✅ | |
| Öffnungszeiten | ⚪ | ✅ | ✅ | JSON: Wochenplan + Saison + Feiertage |
| Angebot für SagaTrail-Gäste | ⚪ | ⚪ | ✅ | Max. 120 Zeichen |
| Beschreibung | — | ✅ | ✅ | Max. 250 Zeichen, mit Spezialitäten |
| Foto | — | ✅ | ✅ | Querformat, mind. 800 × 450 px |
| Telefon | — | ✅ | ✅ | |
| Website-URL | — | ⚪ | ✅ | |
| Reservierungs-URL | — | — | ✅ | z. B. OpenTable, eigene Seite |
| E-Mail (intern, nicht angezeigt) | ✅ | ✅ | ✅ | Für Rechnungsstellung |
| Notizen intern | ⚪ | ⚪ | ⚪ | Nur Admin-seitig |

> ✅ = Pflicht · ⚪ = Optional · — = Nicht verfügbar für dieses Paket

---

## 3. Kategorien

### 3.1 Verfügbare Kategorien

| Kategorie-Key (DB) | Label (App) | Icon (Feather) | Beschreibung |
|--------------------|-------------|----------------|--------------|
| `restaurant` | Restaurant | `coffee` | Bergrestaurant, Gasthof, Beizli |
| `cafe` | Café | `coffee` | Café, Bäckerei, Konditorei |
| `bar` | Bar | `music` | Bar, Pub, Weinbar |
| `uebernachtung` | Hotel | `home` | Hotel, B&B, Berghotel, Hütte mit Übernachtung |
| `sac_huette` | SAC-Hütte | `home` | SAC-Clubhütte (eigener Typ für spätere Sonderbehandlung) |
| `souvenir` | Shop | `shopping-bag` | Souvenir-Laden, Käserei-Laden, Geschenkartikel |
| `sonstiges` | Partner | `coffee` | Alles andere (Parkplatz, Tourist-Info, …) |

> **Fehlende Kategorien (Vorschlag für nächste Version):**
> - `kaeserei` — Käserei / Hofladen: sehr typisch für Schweizer Wanderwege, eigener Key sinnvoll
> - `bergbahn` — Seilbahn-/Gondel-Station mit Gastronomie
> - `wellness` — Bäder, Spa (v. a. Talbereich)
>
> Aktuell werden `bar`, `hotel` und `shop` im App-Code als Display-Aliases verwendet, existieren aber noch nicht als offizielle DB-Enum-Werte — beim nächsten Schema-Update vereinheitlichen.

---

## 4. Was wird auf der Kachel angezeigt

### 4.1 Karten-Marker (Kartenpin)

| Paket | Grösse | Rand | Effekt |
|-------|--------|------|--------|
| Basic | 11 px | keiner | subtiler Amber-Glow |
| Standard | 14 px | 2 px weiss | Amber-Glow |
| Premium | 18 px | 2.5 px rot (`#DA291C`) | Roter Doppelglow |

### 4.2 Partner-Kachel (Modal beim Antippen)

**Alle Pakete:**
- Kategorie-Icon + Kategorie-Label (Eyebrow oben links)
- Name (Haupttitel)
- Öffnungszeiten-Badge: grüner/roter Punkt + „Offen / Geschlossen · schliesst um 17:30 Uhr"
- SagaTrail-Angebot (wenn vorhanden) — orangefarbene Box mit Bordüre

**Zusätzlich Standard & Premium:**
- Titelfoto (Querformat, vollbreite oben)
- Beschreibung (Fliesstext, max. 250 Zeichen)
- Telefonnummer (antippbar → Anruf)
- Website-Button

**Zusätzlich Premium:**
- Reservierungs-Button (Primärfarbe, prominent)

**Nicht angezeigt bei Basic:**
- Kein Foto
- Keine Beschreibung
- Kein Telefon / Website

---

## 5. Was wird gesprochen (Narration / TTS)

### 5.1 Premium-Ansage (automatisch)

**Auslöser:** Wanderer kommt auf < 500 m an einen Premium-Partner heran — einmalig pro Wanderung.

**Was passiert:**
1. App ruft `POST /api/partners/:id/announce` auf.
2. Server generiert mit Anthropic Claude einen kurzen, stimmungsvollen Text, der:
   - den Partnerbetrieb namentlich erwähnt
   - das SagaTrail-Angebot einwebt (falls vorhanden)
   - auf die aktuell laufende Sage und ihr Kernmotiv Bezug nimmt
   - in der Sprache des Wanderers gesprochen wird (alle 9 App-Sprachen)
3. Text wird per TTS vorgelesen (OpenAI TTS, ElevenLabs als Primär mit Fallback).

**Übergabe-Parameter ans API:**
```
sagaTitle     Titel der aktuellen Sage
coreMotif     Kernmotiv der Sage (z. B. "Geisterwolf am Gotthard")
partnerName   Name des Betriebs
angebot       SagaTrail-Angebot (optional)
beschreibung  Kurzbeschreibung (optional)
lang          Sprache (de, gsw, en, fr, it, es, pt, zh, ru)
```

**Beispiel-Output (Premium, de):**
> *„Kurz bevor der Pfad in die Felsrinne führt, wo einst der Steinadler der Sage seinen Horst hatte — empfiehlt sich ein Abstecher ins Berghotel Rothorn. Wanderer erhalten heute Abend ein Gratis-Panorama-Dessert beim Abendessen, nur für SagaTrail-Gäste."*

### 5.2 Standard & Basic

Keine automatische Narration. Der Betrieb erscheint nur auf der Karte und als Kachel.

---

## 6. Öffnungszeiten-Datenmodell

JSON-String im Feld `oeffnungszeiten TEXT`:

```json
{
  "montag":     { "von": "09:00", "bis": "17:00" },
  "dienstag":   { "von": "09:00", "bis": "17:00" },
  "mittwoch":   null,
  "donnerstag": { "von": "09:00", "bis": "17:00" },
  "freitag":    { "von": "09:00", "bis": "18:00" },
  "samstag":    { "von": "10:00", "bis": "16:00" },
  "sonntag":    null,
  "saisonStart": "04-15",
  "saisonEnde":  "10-31",
  "feiertage": {
    "nationalfeiertag": false,
    "auffahrt": true
  }
}
```

- Wochentag `null` = geschlossen
- `saisonStart`/`saisonEnde`: MM-DD (kein Jahr), `null` = ganzjährig
- Feiertage: `true` = geöffnet, `false` = geschlossen, `null`/fehlt = normaler Wochenplan
- 19 Schweizer Feiertage unterstützt (inkl. Ostern-Algorithmus für variable Daten)

---

## 7. Foto-Anforderungen

| Paket | Foto | Mindestgrösse | Format |
|-------|------|---------------|--------|
| Basic | ✗ | — | — |
| Standard | ✅ | 800 × 450 px | JPEG/WebP, Querformat |
| Premium | ✅ | 1200 × 675 px | JPEG/WebP, Querformat |

- Dateiablage: `artifacts/api-server/public/partner-fotos/`
- Aufruf via `/api/partner-fotos/<dateiname>`
- Relative Pfade (`/api/partner-fotos/...`) werden serverseitig zur vollen URL ergänzt

---

## 8. Analytics (intern)

| Feld | Was wird gezählt |
|------|-----------------|
| `views` | Kachel geöffnet (Modal erschienen) |
| `offers_tapped` | Angebot-Box angetippt |

Kein A/B-Testing, keine externen Analytics-Tools — nur interne Drizzle-Zähler.

---

## 9. Website-Portal (geplant)

Das künftige Partner-Portal soll folgendes Formular bieten:

1. **Stammdaten:** Name, Kategorie, Kanton, Telefon, E-Mail, Website, Reservierungs-URL
2. **Beschreibung & Angebot:** Textarea mit Zeichenzähler (max. 250 / 120)
3. **Foto-Upload:** Drag & Drop, automatische Grössenprüfung
4. **Öffnungszeiten:** 7-Zeilen-Wochenplan + Saison-Toggle + 19-Feiertage-Übersicht
5. **Vorschau:** Live-Anzeige der Kachel wie sie in der App aussieht
6. **Tarif-Wahl:** Basic / Standard / Premium mit Jahres-/Monatspreisanzeige
