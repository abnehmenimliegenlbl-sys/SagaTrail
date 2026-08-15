# SagaTrail Routes API

Base URL: `https://saga-trail.replit.app/api`

Alle Endpunkte geben JSON zurück. Fehler liefern `{ "error": "..." }` mit passendem HTTP-Statuscode.

---

## Routen & Kantone

### `GET /cantons/:canton/routes`

Liefert alle Wanderrouten eines Kantons.

**Path-Parameter**

| Parameter | Beschreibung |
|-----------|-------------|
| `canton` | Kantonsname auf Englisch (z. B. `Graubünden`, `Bern`) |

**Query-Parameter** (alle optional)

| Parameter | Typ | Beschreibung |
|-----------|-----|-------------|
| `distMin` | number | Minimale Distanz in km |
| `distMax` | number | Maximale Distanz in km |
| `ascMin` | number | Minimaler Aufstieg in Hm |
| `ascMax` | number | Maximaler Aufstieg in Hm |
| `diffMin` | number | Minimale SAC-Schwierigkeit (1–6) |
| `diffMax` | number | Maximale SAC-Schwierigkeit (1–6) |
| `ganzjaehrigNur` | boolean | Nur ganzjährig begehbare Routen |
| `nearLat` | number | Sortierung nach Nähe (Breitengrad) |
| `nearLng` | number | Sortierung nach Nähe (Längengrad) |

**Response** `Route[]`

```json
[
  {
    "id": "osm-123456",
    "sagaId": "uuid",
    "name": "Via Spluga",
    "ref": "1",
    "network": "nwn",
    "region": "Graubünden",
    "distanceKm": 65.4,
    "distanceTagKm": 67.0,
    "ascentM": 2100,
    "maxElevationM": 2115,
    "season": "Sommer",
    "minutes": 1440,
    "sac": "T2",
    "terrain": "Bergwanderweg",
    "coordinates": { "lat": 46.8, "lng": 9.1 },
    "geometry": [{ "lat": 46.8, "lng": 9.1 }, "..."],
    "featured": false,
    "photoUrl": "https://...",
    "photoAttribution": "© Wikimedia Commons",
    "description": "...",
    "descriptionSource": "osm"
  }
]
```

> `distanceKm` = aus Geometrie berechnet (Navigation).  
> `distanceTagKm` = amtlicher OSM-Tag-Wert, falls vorhanden, sonst gleich wie `distanceKm`.

---

### `GET /catalog`

Gibt den gesamten Katalog zurück: Kantone mit Routenanzahl, alle Routen (ohne Geometrie) und alle Sagen.

**Response**

```json
{
  "cantons": [{ "canton": "Bern", "routeCount": 42 }],
  "routes": [{ "id": "...", "name": "...", "distanceKm": 12.3, "..." : "..." }],
  "sagas": [{ "id": "uuid", "title": "Der Lindwurm", "canton": "Zug", "..." : "..." }]
}
```

---

### `GET /routes/:routeId/saga`

Liefert die Sage, die einer Route zugeordnet ist.

**Response** Saga-Objekt oder `404 { "error": "Not found" }`

```json
{
  "id": "uuid",
  "title": "Der Lindwurm",
  "canton": "Zug",
  "coreMotif": "Drache",
  "bildmotiv": "Lindwurm am See",
  "mood": "geheimnisvoll",
  "summary": "...",
  "summaries": { "de": "...", "en": "...", "fr": "...", "it": "..." },
  "altersstufenHinweis": null,
  "quelle": "SAVk",
  "source": "https://...",
  "coordinates": { "lat": 47.1, "lng": 8.5 },
  "koordinatenSicherheit": "hoch",
  "isAnchorPlace": true,
  "fotoUrl": "https://...",
  "fotoAttribution": "© Wikimedia"
}
```

---

### `GET /routes/custom`

Berechnet eine benutzerdefinierte Route zwischen zwei Punkten (Fuss-Routing via Valhalla).

**Query-Parameter**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|-------------|
| `startLat` | ✓ | Startpunkt Breitengrad |
| `startLng` | ✓ | Startpunkt Längengrad |
| `endLat` | ✓ | Zielpunkt Breitengrad |
| `endLng` | ✓ | Zielpunkt Längengrad |
| `startLabel` | – | Bezeichnung Startpunkt |
| `endLabel` | – | Bezeichnung Zielpunkt |

---

### `POST /routes/gpx`

Importiert eine GPX-Datei als Route.

**Body (JSON)**

```json
{ "gpx": "<gpx>...</gpx>", "name": "Meine Tour" }
```

---

### `GET /routes/surfaces`

Liefert Wegoberflächen-Punkte für eine Route (aus OSM).

**Query**: `osmId` (OSM-Relations-ID)

---

### `GET /routes/geocode`

Ortssuche (Nominatim).

**Query**: `q` (Suchbegriff)

**Response**: Array von Ortsvorschlägen.

---

## POIs

### `GET /routes/pois`

Liefert Points of Interest in einem Bounding-Box-Bereich (aus Overpass/OSM). Beim ersten Aufruf eines neuen Gebiets kann die Antwort leer sein — der Server lädt im Hintergrund.

**Query**

| Parameter | Beschreibung |
|-----------|-------------|
| `south` | Südgrenze (Lat) |
| `west` | Westgrenze (Lng) |
| `north` | Nordgrenze (Lat) |
| `east` | Ostgrenze (Lng) |

**Response** `POI[]`

```json
[
  {
    "id": "osm-node-987",
    "name": "Ruine Neu-Bechburg",
    "kind": "ruins",
    "lat": 47.38,
    "lng": 7.85,
    "wiki": "de:Ruine Neu-Bechburg",
    "wikipediaTag": "de:Ruine Neu-Bechburg",
    "wikidataTag": "Q123456",
    "osmContext": "natural=peak"
  }
]
```

**Mögliche `kind`-Werte**: `peak`, `viewpoint`, `waterfall`, `lake`, `cave`, `castle`, `ruins`, `church`, `chapel`, `alpine_hut`, `shelter`, `hotel`, `hostel`, `restaurant`, `cafe`

---

### `GET /routes/poi-detail`

Holt Wikipedia-Extrakt für einen einzelnen POI.

**Query**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|-------------|
| `name` | ✓ | POI-Name |
| `kind` | ✓ | POI-Kategorie |
| `lat` | ✓ | Breitengrad |
| `lng` | ✓ | Längengrad |
| `wikipediaTag` | – | Wikipedia-Tag aus OSM |
| `wikidataTag` | – | Wikidata-Tag aus OSM |

**Response**: `{ "wiki": "Extrakttext oder null" }`

---

### `GET /routes/poi-story`

Generiert eine KI-Erzählung zu einem POI im Kontext einer Sage (Anthropic).

**Query**

| Parameter | Pflicht | Beschreibung |
|-----------|---------|-------------|
| `name` | ✓ | POI-Name |
| `extract` | ✓ | Wikipedia-Extrakt |
| `kind` | ✓ | POI-Kategorie |
| `lang` | ✓ | Sprache (`de`, `en`, `fr`, `it`, …) |
| `osmContext` | – | OSM-Tags als Kontext |

**Response**: `{ "text": "Erzählungstext" }`

---

## Partner

### `GET /routes/partners`

Liefert Partner-Betriebe (Restaurants, Hotels, Shops) in einem Bounding-Box-Bereich.

**Query**: `south`, `west`, `north`, `east` (wie bei `/routes/pois`)

**Response** `Partner[]`

```json
[
  {
    "id": "uuid",
    "name": "Bergrestaurant Alp Sewald",
    "kategorie": "restaurant",
    "canton": "Glarus",
    "beschreibung": "...",
    "angebot": "...",
    "fotoUrl": "https://...",
    "lat": 47.0,
    "lng": 9.0,
    "paket": "standard",
    "telefon": "+41 55 ...",
    "websiteUrl": "https://...",
    "reservierungUrl": null,
    "oeffnungszeiten": { "montag": { "von": "08:00", "bis": "17:00" }, "..." : {} },
    "istOffen": true,
    "schliesstUm": "17:00",
    "oeffnetAmTag": null,
    "oeffnetUm": null
  }
]
```

**Felder `istOffen` / `schliesstUm` / `oeffnetAmTag` / `oeffnetUm`**

| Feld | Beschreibung |
|------|-------------|
| `istOffen` | `true` = gerade offen, `false` = geschlossen, `null` = keine Öffnungszeiten hinterlegt |
| `schliesstUm` | Schliesszeit heute (falls offen), z. B. `"17:00"` |
| `oeffnetAmTag` | Nächster Öffnungstag (falls heute geschlossen), z. B. `"Dienstag"` |
| `oeffnetUm` | Uhrzeit der nächsten Öffnung |

**`paket`-Werte**: `basic` · `standard` · `premium`

**`kategorie`-Werte**: `restaurant` · `cafe` · `bar` · `hotel` · `uebernachtung` · `sac_huette` · `souvenir`

---

### `GET /partners/:id/translate`

Übersetzt `beschreibung` und `angebot` eines Partners via KI.

**Query**: `lang` (Standard: `de`) — gibt `null` für Deutsch und Schweizerdeutsch zurück.

**Response**: `{ "beschreibung": "...", "angebot": "..." }`

---

### `POST /partners/:id/announce`

Generiert eine KI-Ankündigung für einen Partner im Kontext einer Sage.

**Body (JSON)**

```json
{
  "sagaTitle": "Der Lindwurm",
  "partnerName": "Bergrestaurant Alp Sewald",
  "coreMotif": "Drache",
  "angebot": "Regionale Küche",
  "beschreibung": "...",
  "lang": "de"
}
```

**Response**: `{ "text": "Ankündigungstext" }`

---

### `POST /partners/:id/view` · `POST /partners/:id/tap`

Tracking-Endpunkte (Profilaufrufe / Angebot-Klicks). Kein Body, Response `204 No Content`.

---

## Luftseilbahnen

### `GET /routes/aerialways`

Seilbahnen und Bergbahnen in einem Bounding-Box-Bereich.

**Query**: `south`, `west`, `north`, `east`

**Response**

```json
[
  {
    "id": "osm-way-111",
    "kind": "cable_car",
    "geometry": [[46.9, 8.1], [47.0, 8.2]]
  }
]
```

---

## Wegbedingungen

### `GET /routes/:routeId/conditions`

Aktuelle Nutzerberichte zur Wegbeschaffenheit.

**Response** `Condition[]`

```json
[
  {
    "id": "uuid",
    "routeId": "osm-123",
    "userName": "Hans",
    "condition": "muddy",
    "note": "Nach dem Regen sehr rutschig",
    "reportedAt": "2026-08-14T09:30:00Z"
  }
]
```

### `POST /routes/:routeId/conditions`

Neuen Wegebericht einreichen. **Authentifizierung erforderlich.**

**Body (JSON)**

```json
{
  "condition": "clear",
  "note": "Perfekte Bedingungen"
}
```

**`condition`-Werte**: `excellent` · `clear` · `muddy` · `snow` · `icy` · `blocked`

**Response** `201` mit dem erstellten Condition-Objekt.
