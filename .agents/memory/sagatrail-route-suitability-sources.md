---
name: Route suitability sources
description: Which source can support SagaTrail route suitability filters and which values must remain recommendations.
---

OSM hiking relations generally provide route identity, geometry, SAC and distance metadata, but not dependable family, child or dog suitability fields. The official SchweizMobil Wanderland GeoPackage contains `Typ_TR=handicap` for barrier-free routes; use that classification for accessibility and do not infer accessibility from distance, ascent or SAC. SagaTrail combines family and child suitability into one conservative technical recommendation; dog permission is not a current filter and must not be inferred because local rules and leash requirements are not technical route properties.

**Why:** Existing OSM-backed routes otherwise have null suitability fields, making strict confirmed-only filters return no routes and encouraging unsafe guesses for accessibility or dog permission.

**How to apply:** Preserve explicit editorial values, expose one family/children recommendation using SAC ≤ T2, distance ≤ 15 km, and ascent ≤ 600 m, keep dog suitability out of the product, and keep the official handicap classification separate from the heuristic.