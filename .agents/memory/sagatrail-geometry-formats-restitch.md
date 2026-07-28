---
name: Route geometry formats + parent restitch
description: external_routes.geometry has TWO point formats; SQL checks must COALESCE both. Parent SchweizMobil routes can be rebuilt from their OSM Etappen.
---
- `external_routes.geometry` points come in two shapes: `{lat,lng}` objects AND `[lat,lng]` arrays (schweizmobil-* and many osm-* rows). Any SQL/JS analysis must use `COALESCE((p->>'lat')::float,(p->>0)::float)` — filtering on only one format silently returns NULL sums and hides broken routes.
- **Why:** a national-route quality scan reported "all clean" while badly stitched routes (76 km statt 62, 7 km Sprünge) existed; the extraction returned NULL for the array format.
- **How to apply:** `scripts/restitch_parents.cjs` rebuilds a `schweizmobil-*` parent geometry by chaining its OSM Etappen (ordered by Etappennummer, orientation via endpoint proximity). Only writes when maxGap shrinks ≥40% and length error doesn't worsen. Idempotent. pg module lives in `lib/db`, not api-server — use createRequire on `lib/db/package.json`.
- Some parents remain broken (Via Jacobi is inherently multi-branch — 287 km "gap" is a second branch; Via Gottardo/Alpenpässe-Weg lack complete Etappen coverage). Fixing those needs full OSM relation fetch, not Etappen chaining.
