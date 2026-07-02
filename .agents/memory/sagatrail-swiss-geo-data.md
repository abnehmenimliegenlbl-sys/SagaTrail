---
name: SagaTrail Swiss geo/hiking data sources
description: What geo.admin/swisstopo/ASTRA layers are usable for route + difficulty data, and the identify-API gotchas.
---

# Swiss geo data for routes & difficulty

## Difficulty (SAC T-grade) comes from swissTLM3D, not OSM
- OSM (Overpass) is used only to DISCOVER the named Wanderland-network routes per canton; its `sac_scale` tag is frequently missing → difficulty was "unbekannt".
- Authoritative difficulty is derived from `ch.swisstopo.swisstlm3d-wanderwege` via the geo.admin REST `identify` endpoint. Its `hikingtype` attribute is the yellow/red-white/blue class: `Wanderweg` (or `null`) = plain path ≈ T1, `Bergwanderweg` ≈ T2-T3, `Alpinwanderweg` ≈ T4-T6.
- **`hikingtype: null` means an ordinary Wanderweg, not "no data".** Only conclude "unbekannt" when the identify returns ZERO features (route outside the mapped net / service error). Features-present-but-all-null → T1.
- Route difficulty = HARDEST class touched along the route (one Alpinwanderweg segment tags the whole route). This is intentional (warn by the worst section) but can overstate long national routes.

## geo.admin identify gotchas
- **`identify` tolerance is in PIXELS, not meters.** The ground buffer = `tolerance_px * (mapExtent_width / imageDisplay_width)`. A fixed pixel clamp gives an inconsistent metric buffer across route lengths. **How to apply:** derive `imageDisplay` from a target meters-per-pixel over a SQUARE mapExtent so the ~25 m corridor stays stable regardless of route length; don't hardcode a pixel clamp.
- Query the route's REAL geometry as an `esriGeometryPolyline` (in LV95 / sr=2056) — a bbox/envelope catches unrelated nearby paths and overstates difficulty; a hand-drawn line off the trail returns all-null.
- Raise `limit` (~200); long multi-segment routes can exceed the default and truncate the hardest segment.
- geometry must be LV95 (EPSG:2056); reuse `wgs84ToLV95` from `lib/geo.ts`.

## ASTRA Wanderland is WMS-only
- `ch.astra.wanderland` exists but is a WMS render layer: `identify` returns `{"results":[]}`. It is NOT machine-queryable for per-canton route geometries, so it can't replace OSM as the route source. **Why:** the user's "official Wanderland routes" idea is blocked by the API surface; OSM already covers the Wanderland network (iwn/nwn/rwn + `ref`). Attribution must stay "OpenStreetMap · swisstopo" — do not claim ASTRA/SchweizMobil data that isn't actually fetched.
