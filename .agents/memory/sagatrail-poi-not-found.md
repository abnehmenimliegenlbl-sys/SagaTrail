---
name: SagaTrail "keine POI gefunden" root causes
description: Two independent causes behind the reported POI/map-empty bug on hike screens — read before touching hike/[id].tsx map or POI logic.
---

Two distinct, independently-fixable causes were found for the "keine POI gefunden" report:

1. **Wrong map center when route isn't pre-cached.** `hike/[id].tsx` resolves `route` via `getRoute(routeId) ?? getRouteBySaga(id) ?? resumeRouteRef.current`. If the route was never fetched into `CatalogContext`'s per-canton cache (direct saga-start, resumed hike, cold start), `route` is `undefined` and `mapCenter` falls back to the saga's stored coordinate, which can be 1+ km from the real trail — the tight 0.5 km POI bbox then finds nothing.
   **Fix pattern:** on mount, if `routeId` is given but `getRoute(routeId)` is empty, call `loadCantonRoutes(saga.canton)` to warm the cache so a later render resolves the real route/geometry.

2. **Overpass mirror timeouts were absurdly long.** `runOverpass` tried 3 mirrors x 2 attempts x 60s timeout — worst case ~6 minutes before a POI fetch failed, which reads as "nothing ever loads" long before the user would wait it out. Timeout was cut to ~12s to fail fast and let later mirrors/error states surface quickly.

**Why this matters:** any future "map/POIs look wrong or empty" report on this screen should check both (a) whether `route.geometry` was actually populated before POI effects ran (watch `useEffect` deps — must include `route?.geometry`, not just `route?.id`), and (b) whether the Overpass call is even completing before the user gives up.

3. **"POI has no context/summary" is usually the AI rewrite endpoint failing, not missing Wikipedia data.** POI detail text always goes through `poi-story` (Anthropic rewrite of the Wikipedia extract, or a no-extract fallback describing the OSM `kind`) — a raw Wikipedia extract is never shown directly. If nearly ALL POIs show no context (not just genuinely obscure ones), check the `poi-story` endpoint response directly with curl before assuming Wikipedia enrichment is broken; a Wikipedia geosearch miss for one specific POI is expected and not a bug on its own.

4. **Live POI responses must bypass conditional HTTP caching.** The POI endpoint can receive stale `If-None-Match` headers; Express then returns `304` without a JSON body, which the mobile API client cannot use and turns the visible POI list empty. `Cache-Control: no-store` alone is insufficient, so remove conditional request headers for this endpoint before sending the body.

**Why:** A successful Overpass refresh and populated server cache can coexist with an empty mobile map when the final response is a bodyless 304.

**How to apply:** For live POI JSON, force a 200 response with the complete array; verify both an ordinary request and one carrying `If-None-Match`.

Initial POI deduplication must score available OSM context and Wikipedia/Wikidata references as well as already-loaded wiki text, because detail enrichment is intentionally lazy.

**Why:** Evaluating only the `wiki` field makes every initial POI tie at zero and keeps the first duplicate even when another OSM element already carries a description or article reference.

**How to apply:** Keep first-occurrence order only as the tie-breaker; choose the richer record before the on-demand POI detail request.

Wikipedia POI matching must require a name match except for explicitly archaeological object types; nearby articles and Commons name-only images can describe a different local landmark.

**Why:** A Lörrach memorial was paired with the nearby "Sender Lörrach" article and a same-named memorial photo from another town.

**How to apply:** Prefer verified OSM Wikipedia/Wikidata links and geographically matched media; when uncertain, show no enrichment rather than an unrelated fact or image.

Commons image discovery can use the reverse-geocoded locality as a search term, but Wikimedia requests must be globally throttled and cached; otherwise API 429s look like missing images.

**Why:** Google resolves the POI through a large indexed query such as name + locality, while direct Commons API calls are rate-limited and the exact file may not have a geotag.

**How to apply:** Search name plus broad locality, validate locality in Commons metadata, and serialize Wikimedia requests with a small inter-request gap.

The Swiss Overpass mirror `https://overpass.osm.ch/api/interpreter` is reachable from the Replit runtime when the configured proxy and common public mirrors time out. Its node response needs `out body;` (not only `out tags;`) to include `lat`/`lon`.

**Why:** A successful peak query can otherwise still produce no usable records: the mirror returns named nodes without coordinates for `out tags`, which the POI parser correctly discards.

**How to apply:** Keep the Swiss mirror ahead of the slower generic mirrors for Swiss map data, and request body fields whenever node coordinates are required.

Peak discovery is protected in-process by a spatial grid, in-flight request coalescing, and a small upstream concurrency limit. This is sufficient for a single API process, but a horizontally scaled deployment needs a shared cache and distributed rate limit to avoid one upstream request set per instance.

**Why:** Memory caches and queues are process-local; multiple instances otherwise repeat the same regional Overpass work even though each instance is individually protected.

**How to apply:** Preserve the 20-km response filtering after any shared-cache lookup, and share both the regional peak payload and the upstream admission control before scaling the API horizontally.

Safety and water layers must be filtered against route geometry on the client before reaching the map; midpoint-radius responses are only fetch envelopes, not display regions. If geometry is unavailable, show no route POIs rather than the unfiltered fallback.

**Why:** A 10-km midpoint query for route 67 returned 1835 safety records, making toilets, shelters, and defibrillators appear across a huge area unrelated to the trail.

**How to apply:** Use a narrow corridor (currently 750 m) for safety/water markers, rerun when geometry arrives or changes, and keep the route POI filter from falling back to the raw result.
