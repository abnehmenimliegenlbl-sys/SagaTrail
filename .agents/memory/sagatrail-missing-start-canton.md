---
name: Saga fallback without start canton
description: The saga picker must search globally when an imported route has no usable start canton.
---

`allCantonSagasSorted` cannot filter strictly by `route.region` when the start canton is missing or does not match a catalog canton. In that case, fall back to all curated sagas and sort them by route proximity.

**Why:** Imported and partially enriched routes can temporarily lack their authoritative start canton; a strict canton filter turns a usable route into an empty saga picker.

**How to apply:** Prefer matching-canton sagas when they exist, otherwise use the nationwide curated catalog. Keep the route start canton authoritative once it is present; do not invent or persist a replacement canton.