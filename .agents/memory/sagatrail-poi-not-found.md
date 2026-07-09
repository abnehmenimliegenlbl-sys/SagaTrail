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
