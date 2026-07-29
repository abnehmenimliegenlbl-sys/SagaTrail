---
name: SagaTrail Route Naming & Sorting
description: Regeln für Routenbenennung (Nummernformat, K-Routen) und Sortierung in der Kanton-Liste.
---

# SagaTrail Route Naming & Sorting

## Benennung — Nummern-Logik

Die Kombination aus OSM `network`-Tag und `ref` bestimmt die angezeigte Nummer:

| network | ref-Bereich | Kategorie | Beispiel |
|---|---|---|---|
| nwn / iwn | 1–9 | Nationalroute (1-stellig) | `1 Via Alpina` |
| rwn | 10–99 | Regionalroute (2-stellig) | `42 Aargauer Weg` |
| lwn | 100–999 | Lokalroute (3-stellig) | `530 Säntispfad` |
| alles andere | — | Kantonal-K | `K4 AG Kulturweg` |

**Wichtig:** Entscheidung läuft über `r.network` (im Code), nicht allein über den ref-Wert.
- `lwn + ref=1` → K-Route (nicht Nationalroute!)
- `nwn + ref=5` → Nationalroute (auch wenn ref < 10)

Implementiert in `artifacts/api-server/src/lib/routeService.ts`, Funktion `enrichAndStore`.

## K-Routen Format

Format: `K{n} {CC} {Routenname}` — z.B. `K4 AG Kulturweg Remetschwil`

- `n` = sequentielle Nummer **pro Kanton**, stabil sortiert nach OSM-ID (aufsteigend)
- `CC` = 2-stelliges Kantonskürzel (AG, BE, ZH, …)
- Vergabe via `renumberKRoutes(canton, log)` in `routeService.ts` — wird nach `enrichAndStore` aufgerufen
- Map `CANTON_ABBREVIATIONS` in `routeService.ts` enthält alle 26 Kantone + FR/GE/TI/VD/VS Varianten
- Wegweiser-Komponent erkennt `^K(\d+)\s+([A-Z]{2})\b` und rendert als `K4-AG` mit Wappen

**Achtung:** K-Routen können `ref='1'` oder `ref=null` haben — Erkennung immer über den NAMEN, nie über ref.

## `schweizmobil-*` / `placeholder-*` Routen

Diese kommen via `syncSwissNumberedRoutes` und haben bereits korrekt formatierte Namen (z.B. `42 Aargauer Weg Frick - Muri AG`). Sie brauchen keine weitere Umbenennung.

## Sortierung in der Kanton-Liste

Sortierschlüssel: **4-stellig** `[Kategorie, RoutenNr, IstEtappe, EtappenNr]`

| Kategorie | Inhalt |
|---|---|
| 0 | Nationalrouten Hauptrouten |
| 1 | Regionalrouten Hauptrouten |
| 2 | Lokalrouten Hauptrouten |
| 3 | K-Routen |
| 4 | Rest |

- `IstEtappe`: 0 = Hauptroute, 1 = Etappe → Hauptroute kommt immer vor Etappen derselben Route
- `EtappenNr`: Etappe 1, 2, 3… sortiert aufsteigend

**Kritisch:** Auto-Etappen-Labels (`etappenNames` Map in `cantons.ts`) müssen **VOR** dem Sort auf die Rows angewendet werden. Sonst sieht `sortSchluessel` die nackten Namen ohne Etappe-Label und kann nicht korrekt sortieren.

Implementiert in `artifacts/api-server/src/routes/cantons.ts`, Funktionen `sortSchluessel` + `byRelevance`.

## Weitere Filterregeln

- MIN_KM = 5: Routen < 5 km werden beim Enrichment aus der DB gelöscht
- nwn/iwn aus OSM-Kanton-Index ausgeschlossen (kommen via `syncSwissNumberedRoutes`)
- Ein Kanton pro Route = Startpunkt; `cantons[]`-Spalte ist inaktiv, `loadCachedRoutes` filtert nur auf `canton`
- Von/bis aus OSM `from`/`to`-Tags wird an den Namen angehängt wenn vorhanden und nicht bereits im Namen
