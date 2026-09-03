---
name: Official SchweizMobil geometry export
description: The authoritative fallback for missing local Wanderland route geometry.
---

Use SchweizMobil's public Wanderland GeoPackage as the authoritative source for
missing local route geometry. It is an official Open Data export in EPSG:2056
(CH1903+ / LV95), and its `Etappe` records are preferable to the aggregate
`Route` geometry because stage order is explicit.

**Why:** OSM does not contain stable `network=lwn + ref` relations for every
official local route. The aggregate geometry can also contain parts in an
unhelpful order for some multi-stage routes, while ordered official stages
remain connected.

**How to apply:** Convert LV95 to WGS84, preserve stage order, validate Swiss or
Liechtenstein bounds and reject jumps over 2 km or fewer than two points before
writing route geometry. Keep geometry-derived distance separate from the
official distance label.