---
name: SagaTrail OSM Stitching — durable lessons
description: Why route stitching follows OSM member order, and pitfalls when "fixing" zigzag geometry.
---

## Rule: trust OSM member order, not greedy proximity
OSM route relations list ways in intended traversal order. Greedy nearest-neighbor stitching fails systematically on figure-8/loop routes (picks the wrong branch at junctions) and on near-equidistant endpoints (attaches ways reversed → zigzag).
**Why:** Chindlistei Weg (AR) showed both failure modes; greedy + angle heuristics could not fix them, ordered traversal did.
**How to apply:** Any re-stitching logic must preserve member order; spurs/side-loops then show up as large gaps and can be dropped by the longest-chain filter instead of producing crossings.

## Rule: kink-removal optimizers need a length budget
A reversal/reorder optimizer that only minimizes sharp-kink count will happily "fix" kinks by introducing long phantom connectors (observed: +10 km on a 25 km route).
**Why:** kink count and geometric sanity are independent objectives; length is the cheap proxy for sanity.
**How to apply:** accept a candidate only if total length grows ≤ ~1%.

## Rule: version-gate one-time geometry cleanups
Startup scans that mark "bad" geometry for re-fetch must only scan the OLD geometry version. Scanning the current version re-flags genuine serpentine routes forever → endless Overpass re-fetch loop.
**Why:** ~7% of correctly stitched routes legitimately have >1 sharp bend.

## Pitfall: stored geometry is simplified
Gap/kink detectors that run on stored (RDP-simplified, point-capped) geometry see false "gaps >500m" on long routes. Judge stitching quality on raw geometry, or tolerate long segments in stored form.

## Pitfall: hardcoded version literals
Bumping the geometry version constant is not enough — startup catch-up checks had a hardcoded `= 3` comparison that silently disabled the warm-all after the bump. Grep for literal version numbers when bumping.
