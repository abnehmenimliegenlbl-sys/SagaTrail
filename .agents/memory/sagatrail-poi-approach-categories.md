---
name: POI approach categories
description: Relationship between server-delivered OSM POI kinds and the mobile progressive approach narration.
---

The mobile progressive POI flow is an explicit allowlist, separate from server POI loading. A POI can therefore appear on the map and open by tap while never receiving the 200 m and 50 m triggers if its `kind` is missing from that allowlist. Boundary stones are intentionally not in the approach allowlist. Independently, nearby auto-story discovery considers ordinary POIs within 300 m, so transit stops need an explicit exclusion there too: endpoint filtering may retain them as useful map markers, but they are transport labels, not story locations.

**Why:** The Riehen border crossing is a public-transport stop, while the nearby `historic=boundary_stone` is a separate object; boundary stones should not create automatic narration. A stop near a route endpoint can also sound like a street-name POI if its OSM stop name is narrated without considering its transport kind.

**How to apply:** When adding or changing server POI categories, update the mobile approach allowlist and verify that `isPoiNameSpecific` accepts the intended names; generic fallback names should remain excluded from narrated approach hints. Keep transit-stop map visibility independent from automatic POI narration.