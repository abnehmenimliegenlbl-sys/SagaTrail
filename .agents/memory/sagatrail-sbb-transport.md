---
name: SagaTrail SBB Transport API
description: Swiss public transport API used for live departures/arrivals near route start/end points.
---

# SagaTrail SBB Transport API

## Rule
Use `timetable.search.ch` — NOT `transport.opendata.ch`.

**Why:** `transport.opendata.ch` (IP 5.148.188.59) ist vom Replit-Netzwerk (dev + prod) per TCP komplett geblockt (Port-443-Timeout). `timetable.search.ch` ist erreichbar.

## How to apply
Alle Änderungen an `/api/transport` und `/api/transport-anreise` gegen `timetable.search.ch` implementieren.

### Endpunkte
- **Haltestellen**: `GET https://timetable.search.ch/api/completion.json?latlon={lat},{lng}&show_ids=1`
  - Response: `[{label, id, dist (Meter), iconclass}, …]`
  - Keine ID = Adresse, ignorieren
  - `sl-icon-type-train` bevorzugen; nach `dist` sortieren
- **Abfahrten**: `GET https://timetable.search.ch/api/stationboard.json?stop={name}&limit=8`
  - Response: `{stop: {id,name,lat,lon}, connections: [{time:"2026-08-01 14:47:00", line:"S2", *G:"S", terminal:{name}, …}]}`
- **Ankünfte**: gleicher Endpunkt, `&mode=arrival`
  - Bei Ankünften ist `terminal.name` die Herkunft

### Feld-Mapping (connection → TransportDeparture/Arrival)
| search.ch | App-Feld |
|-----------|----------|
| `time.slice(11,16)` | `time` |
| `terminal.name` | `to` / `from` |
| `*G` oder `type` | `category` |
| `line` oder `*L` | `number` |
| — | `delay: null` (nicht verfügbar) |
| — | `platform: null` (nicht verfügbar) |

### Stationsauswahl
Stationen mit `id` (keine Adressen), sortiert nach `dist`, bevorzugt `sl-icon-type-train`.
