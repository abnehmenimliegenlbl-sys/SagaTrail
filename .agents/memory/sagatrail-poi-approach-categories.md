---
name: POI approach categories
description: Relationship between server-delivered OSM POI kinds and the mobile progressive approach narration.
---

The mobile progressive POI flow is an explicit allowlist, separate from server POI loading. A POI can therefore appear on the map and open by tap while never receiving the 200 m and 50 m triggers if its `kind` is missing from that allowlist.

**Why:** This happened with named boundary stones: the server returned them as `historic=boundary_stone`, but the mobile flow only handled the other cultural/historical categories.

**How to apply:** When adding or changing server POI categories, update the mobile approach allowlist and verify that `isPoiNameSpecific` accepts the intended names; generic fallback names should remain excluded from narrated approach hints.