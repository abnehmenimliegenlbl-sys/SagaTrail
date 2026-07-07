---
name: Public routing servers without API key
description: Which free routing servers actually support pedestrian profiles
---

Rule: The public OSRM demo server (`router.project-osrm.org`) serves ONLY car
routing data, regardless of the profile segment in the URL (`/foot`, `/bike`
are silently answered with car data). Never use it for hiking/pedestrian
routes — results run along motorways.

**Why:** SagaTrail custom hiking routes were routed over Autobahnen because
the "foot" OSRM URL silently returned car routes.

**How to apply:** For keyless pedestrian routing use FOSSGIS Valhalla
(`https://valhalla1.openstreetmap.de/route`, POST JSON, `costing:
"pedestrian"`). Legs return `shape` as encoded polyline with precision 1e6
(polyline6), not the usual 1e5.
