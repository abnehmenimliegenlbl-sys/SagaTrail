---
name: Legacy-Routen-IDs ohne OSM-ID
description: Wie schweizmobil-*/placeholder-* Routen-IDs auf OSM-Relationen aufgelöst werden und warum 54 dauerhaft -1 sind
---

Alt-Datensätze in `external_routes` haben IDs ohne OSM-Relation: `schweizmobil-<net>-<ref>` und `placeholder-<net>-<ref>-etappe-<n>`. `enrichOneRoute` löst sie jetzt über `resolveNumberedRouteOsmId` (overpass.ts) auf: kompletter Netzwerk-Index (`relation[route=hiking][network=X]`, out tags bb) wird 1 h im Modul gecacht — eine Overpass-Anfrage pro Netzwerk statt pro Route, sonst frisst Drosselung den Lauf.

**Why:** Per-Route-Overpass-Queries wurden unter Last massiv gedrosselt ("This operation was aborted"), Rate fiel auf ~20 Routen/h; mit Index-Cache ~60+/h.

**How to apply:** Auswahl-Logik: Etappen per Namens-Regex `(Etappe|Étape|Tappa|Stage)\s*0?N`; Gesamtrouten = Nicht-Etappen-Relation mit größter Bbox. 54 Routen blieben unauflösbar (geometry_version=-1, Liste in `docs/unenrichable-routes.md`) — meist Etappen-Relationen ohne passendes Namensmuster oder refs, die es in OSM nicht mehr gibt. `enrich-all`/`enrich-status` filtern nicht mehr auf `id LIKE 'osm-%'`.
