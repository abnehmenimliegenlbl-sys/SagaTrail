---
name: SagaTrail route fetching (distance-aware)
description: Why per-canton OSM route fetching uses a bbox pre-scan and applies the result cap after the filter.
---

# Distance-aware route candidate selection

Routes come live per canton from Overpass. Fetching the top-N routes by OSM
network rank (iwn<nwn<rwn<lwn<other) and THEN applying the distance filter is
broken for route-dense cantons: the rank-ranked pool is entirely long national/
regional Wanderland routes, so a "0-5 km" search returns nothing even though the
canton has hundreds of short local paths (route-dense cantons index >1000 named
relations, all ranked routes being long-distance).

**The rule:** discovery must be distance-aware BEFORE geometry, and the result
cap must apply AFTER the exact distance filter, never before.

**Why the bbox pre-scan is safe:** a cheap `out tags bb;` index gives every
route's bounding-box diagonal. The bbox diagonal is a genuine LOWER BOUND on true
trail length — the shortest connected curve with a given bbox is its own diagonal
(a straight corner-to-corner line), and real trails wind well beyond that. So
dropping routes whose bbox diagonal exceeds distMax cannot discard an eligible
short route. A small slack multiplier guards the haversine approximation anyway.
Do NOT rely on OSM `distance` tags instead — they cover a small minority of
routes and are unreliable.

**Why two-phase at all:** geometry (`out geom;`) is the expensive/slow part and
times out for large candidate sets; the bbox index is the only cheap length
signal. Geometry is fetched only for the pruned+ranked candidate pool and only
for routes not already fresh in `external_routes`, so it accumulates across
searches (first search per canton is slow, later ones fast).

**How to apply:** keep the order index(bbox) -> distance prune -> rank/cap ->
geometry -> exact filter -> result cap. Never move the result cap before the
distance filter (re-introduces the original bug), and never fetch geometry for
the whole canton. The slow first search is covered by an indeterminate progress
UI, not a fake percentage.

**Failure = error, not empty:** on index/geometry fetch failure, fall back only
to FRESH cached rows; if none are fresh, rethrow so the API returns 502 and the
UI shows "server unreachable". Returning stale/empty as a silent success masks an
outage as "no routes".
