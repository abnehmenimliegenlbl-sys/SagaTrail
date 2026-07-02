---
name: SagaTrail map & live GPS
description: How the swisstopo map + real-GPS narration is wired in the Expo app, and the state-machine traps to avoid.
---

# swisstopo map + live GPS (live hike)

## Map rendering
- Amtliche swisstopo WMTS tiles (`ch.swisstopo.pixelkarte-farbe`) via Leaflet inside a **WebView on native** and an **iframe `srcDoc` on web** — platform split via `SwisstopoMap.tsx` / `SwisstopoMap.web.tsx`, shared HTML from `swisstopoMapHtml.ts`. No API key needed. This is the deliberate alternative to `react-native-maps` (which the project avoids) and to the SVG `RouteMap` (kept only as a coordinate-less fallback).

## Route line (the drawn track)
- The real route path lives ONLY in `external_routes.geometry` (server, ~80-pt downsampled OSM track). It is NOT in the curated seed (`constants/routes.ts` seed routes carry only a single `coordinates` start point). To show a route line you must plumb geometry end-to-end: OpenAPI `CatalogRoute.geometry` (optional) -> codegen -> mobile `HikingRoute.geometry?: number[][]` -> `SwisstopoMap` props -> `buildSwisstopoHtml` `L.polyline` + start/Ziel markers + `fitBounds`.
- **Why:** the server already computed geometry, but `cantons.ts`/`catalog.ts` `toRoute()` silently dropped it and the map only drew a start marker, so users saw no route and asked "how am I navigated?". Keep geometry OPTIONAL in the contract so seed/catalog routes without it still validate (they fall back to a single start marker).
- There is intentionally **no turn-by-turn navigation**: the app draws the full route line + your live GPS dot and advances narration by distance — it is route visualization, not a navigator.
- Live position is pushed **without reloading tiles**: the HTML exposes `window.sttSetPosition(lat,lng)`; native calls it via `injectJavaScript`, web via `iframe.contentWindow.sttSetPosition`.
- **Reset `ready=false` whenever the HTML string changes** (center/label), otherwise a reloaded document silently drops the initial position injection until the next GPS fix.

## GPS / simulation state machine (app/hike/[id].tsx)
- States: `idle` -> `granted` | `denied` | `simulated`. Native uses `Location.watchPositionAsync`; web uses `navigator.geolocation.watchPosition` (falls back to `simulated` on error/unavailable).
- **Only run the simulated-timer fallback in explicit fallback states** (`denied`/`simulated`), never in `idle` — otherwise a timeout fires during the permission handshake and fabricates progress before real GPS is confirmed.
- Real distance (haversine, `lib/geo.ts`) drives chapter advance when `granted`; noise <0.003 km and jumps >0.5 km are dropped.
- **Decision points must gate on `chosenOptionIndex == null`**, and narration must be de-duped with a `lastNarratedRef`. The narration effect depends on `chapters`, so `chooseOption` mutating a chapter re-runs it on the same index; without these guards it re-locks the decision and re-reads the chapter aloud.

**Why:** these three were the exact issues an architect review caught; they are subtle and not visible from types or a clean typecheck.
