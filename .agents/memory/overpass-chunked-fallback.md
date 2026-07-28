---
name: Overpass chunked geometry fallback
description: How stubborn large OSM route relations get their geometry when `out geom;` times out
---

Very large hiking-route relations regularly hit Overpass timeouts when loaded whole with `out geom;` ("This operation was aborted"). The reliable fallback is to split the query:

1. Load only the relation member list (`out body;` — tiny).
2. Expand sub-relations (Etappen) one level deep, keeping OSM member order (required for ordered stitching).
3. Load way geometries in small batches (`way(id:...); out geom;`) with a longer timeout, then reassemble in original member order and stitch.

**Why:** a set of large relations failed every whole-relation load; with the chunked fallback they all resolve within a few retries.

**How to apply:** any Overpass bulk-geometry job should fall back to member-list + way-batch loading on timeout. Relations with ONLY node members (no ways) are provably unenrichable — mark them `geometry_version = -1` so jobs stop retrying them. Network/timeout errors must NOT mark -1 (retryable).
