---
name: SagaTrail online catalog + offline download
description: How the server catalog, offline-first story resolution, and offline swisstopo tiles fit together in the Expo app.
---

# Online catalog + offline download

## Catalog data flow (CatalogContext)
- Routes/sagas/cantons come from the API `getCatalog()` (baked `/api` prefix; only the host is set once via `configureApiClient()` from `EXPO_PUBLIC_DOMAIN`).
- Three-tier offline-first source, surfaced as `source`: `server` -> cache to AsyncStorage -> `cache` -> bundled `seed` (constants/routes+sagas). Screens consume `useCatalog()` helpers (getRoute, getSagaForRoute, getRouteBySaga, getRoutesByCanton, getSaga, cantons) — same signatures the old `constants/*` helpers had, so screen churn is minimal.
- **Why:** server DTOs (CatalogRoute/CatalogSaga/StoryChapter) are structurally identical to the app types, so mapping is an identity cast — do not re-model.

## Dynamic per-canton catalog (real OSM routes + nearest curated saga)
- All 26 cantons are selectable; picking one calls `loadCantonRoutes(canton)` which fetches REAL OSM routes (swisstopo ascent) from the server, else falls back to the curated seed. Result carries its own `source` so the screen can show an offline hint. Missing SAC difficulty renders as "unbekannt".
- Sagas are NOT generated. A route resolves to the nearest curated saga (`ensureRouteSaga(routeId)` -> `nearestSaga`). No Anthropic call, no per-route caching of invented sagas.
- **Gotchas:** dynamic route maps live in BOTH a ref (for async loaders) and state (to trigger re-render) — screens self-recover after AsyncStorage hydration because `dynamic` is state. `ensureRouteSaga` must dedupe in-flight requests (route + saga screens can both trigger it). A cold deep-link to a route never loaded into any canton cache cannot be recovered (no route-by-id endpoint) — acceptable, flow is always canton -> route -> saga.
- Server upsert of `external_routes` on TTL refresh must use `excluded.*` (incoming) values, not `table.column` (self-assignment silently keeps stale rows).
- Route-list difficulty filter: many real OSM routes have SAC "unbekannt". The canton screen's difficulty range slider (T1–T6) INTENTIONALLY hides "unbekannt" routes whenever the range is narrowed from full T1–T6, so narrowing difficulty in an unbekannt-heavy canton can drop to 0 results (empty state guides the user to widen). **Why:** an unknown grade cannot honestly be placed in a T-band; showing it only at full range keeps the filter meaningful without silently mis-classifying.

## Story resolution (DownloadContext.resolveStory)
- Offline-first order: locally saved story (AsyncStorage key `sagatrail:story:<sagaId>:<archetype>:<ageTier>:<lang>`) -> server `createStory()` (cached on success) -> local `generateStory()` seed. The live hike calls this instead of generating directly.

## Offline map tiles (lib/offlineTiles.ts + swisstopoMapHtml.ts)
- Tiles are the same swisstopo WMTS XYZ scheme the online map uses (`.../3857/{z}/{x}/{y}.jpeg`, EPSG:3857 / standard slippy). Downloaded for a bounded corridor around the start point over a few zoom levels; stored via `expo-file-system/legacy` under `<documentDirectory>tiles/<sagaId>/`.
- Render: `buildSwisstopoHtml` takes optional `offlineTiles` (record `z/x/y` -> data URI). A Leaflet `L.TileLayer` subclass overrides `getTileUrl` to return the local data URI when present, else the online URL — so missing tiles gracefully fall back online. Tiles are loaded from disk as base64 in the hike screen and passed to `SwisstopoMap`.
- **Web has no filesystem:** all tile download/load/delete are deliberate no-ops on web (guarded by `Platform.OS === "web"`); the web map stays online. Offline tiles are a native-only feature.
