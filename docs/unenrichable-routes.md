# Nicht anreicherbare Routen (geometry_version = -1)

Stand: 02.09.2026 — 11 Routen total (9 aus enrich-all, 2 nachträglich identifiziert).

Diese Routen haben keine auflösbare OSM-Relation (network+ref existiert nicht
mehr in OSM, oder die Etappen-Relation ist nicht per Namensmuster auffindbar).
Sie bleiben bewusst mit geometry_version = -1 markiert und werden nicht nach Prod gepusht.

**Nachträglich identifiziert (08.08.2026):**
- `schweizmobil-rwn-73` — Sardona-Welterbe-Weg Weisstannen → Sardonahütte (Glarus):
  OSM kennt Sardona-Welterbe-Weg als Gesamtroute + Etappen 1–6, aber keine Relation mit ref=73.
- `wiki-1-etappe-20` — Via Alpina Etappe 20 Rochers de Naye → Montreux (Waadt):
  OSM hat Via Alpina Route 1 als Gesamtroute (IDs 14249124/14249125), Etappe 20 ist
  keine eigene Sub-Relation. Wiki-Quelle teilt feiner auf als OSM.

| ID | Name |
|----|------|
| placeholder-nwn-2-etappe-9 | 2 Trans Swiss Trail Etappe 9 |
| placeholder-nwn-4-etappe-24 | 4 Via Jacobi Etappe 24 |
| placeholder-nwn-4-etappe-31 | 4 Via Jacobi Etappe 31 |
| placeholder-nwn-5-etappe-12 | 5 Jura-Höhenweg Etappe 12 |
| placeholder-nwn-5-etappe-13 | 5 Jura-Höhenweg Etappe 13 |
| placeholder-nwn-6-etappe-15 | 6 Alpenpässe-Weg Etappe 15 |
| placeholder-rwn-62-etappe-2 | 62 Walserweg Gottardo Etappe 2 |
| placeholder-rwn-62-etappe-3 | 62 Walserweg Gottardo Etappe 3 |
| placeholder-rwn-62-etappe-4 | 62 Walserweg Gottardo Etappe 4 |
