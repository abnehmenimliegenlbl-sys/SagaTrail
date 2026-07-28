---
name: Amtliche SchweizMobil-Werte aus OSM-Tags
description: OSM-Relationen tragen distance/ascent-Tags (SchweizMobil-Angaben); diese haben Vorrang vor eigener Berechnung, weil OSM-Geometrien oft unvollständig sind.
---

Regel: Bei Wanderrouten-Relationen haben die OSM-Tags `distance`/`ascent` (amtliche SchweizMobil-Werte) Vorrang vor der aus der Geometrie berechneten Distanz/Aufstieg — in ALLEN drei Anreicherungspfaden UND in den MIN/MAX-Längenfiltern.

**Why:** Viele Relationen sind in OSM unvollständig erfasst (z.B. Route 831 Rigi Scheidegg, `fixme=complete`): berechnete Länge 3.7 km statt amtlich 8 km, Aufstieg 33 statt 1250 m. Betraf laut User "fast alle Routen".

**How to apply:**
- `parseNumericTag(value, max)` in overpass.ts: locale-robust (Tausender-Komma "1,250" vs Dezimal "8,2"), Plausibilitätsgrenzen (Distanz ≤500 km, Aufstieg ≤20000 m).
- Stitching: `stitchMitTagPruefung` — ist die längste Kette <75% der amtlichen Distanz, werden ALLE Ketten in Memberreihenfolge verbunden (Lücken als Direktverbindung), aber nur wenn das Ergebnis näher am Amtswert liegt und ≤1.6× davon.
- GEOMETRY_VERSION=5 markiert damit angereicherte Routen.
- ACHTUNG: `enrich-all` selektiert NUR `geometry_version = 0` — ein Versions-Bump allein löst KEINE Neuanreicherung aus; Bestandszeilen müssen per UPDATE auf 0 zurückgesetzt werden.
- Hintergrund-Neuanreicherung stirbt bei jedem Server-Restart → enrich-all danach neu anstoßen.
