---
name: SagaTrail content model
description: How curated public-domain sagas are structured and matched to routes; what it takes to add one without silent German fallback.
---

# Adding a curated saga to SagaTrail

The app reads sagas ONLY from a curated, verifiably public-domain dataset. There is NO runtime AI saga generation anymore — do not reintroduce it. Each saga carries a structured `quelle` (public-domain citation: autor/werk/jahr/fundstelleUrl) and a `koordinatenSicherheit` (`exakt` | `ungefaehr` | `nicht_lokalisierbar`).

Saga data is intentionally duplicated in two leaf packages (they cannot import each other):
1. Server: `artifacts/api-server/src/lib/curatedSagas.ts` (`CURATED_SAGAS`) — the authoritative catalog seed.
2. Mobile: `artifacts/mobile/constants/sagas.ts` — the offline bundled fallback.

Both must stay in sync. Each saga needs per-language `summaries` (all 8 languages) inline on the saga object — NOT in a separate storyContent map anymore.

**Why:** `storyEngine` reads `saga.summaries[lang]?.text ?? saga.summary`; a missing language key silently serves the German summary inside an otherwise-localized narration. So fill all 8 language summaries in lockstep.

## Routes are online-only (NO route seed)
- Sagas have a bundled offline seed; ROUTES DO NOT. There is no route seed in the mobile bundle and no offline route fallback — routes come exclusively live per canton from the connected sources (OSM + swisstopo). `constants/routes.ts` is types-only (`HikingRoute`, `CantonWithRoutes`).
- `CatalogContext.loadCantonRoutes` returns `source: "error"` with an empty list when the server/OSM is unreachable (`CatalogSource` includes `"error"`); the Kanton screen shows a "Server nicht erreichbar." hint instead of faking offline routes.
- Server `/catalog` returns `routes: []`; `catalogSeed` purges the entire `catalog_routes` table on every start and seeds only sagas. The mobile cache-freshness gate keys on `sagas.length` (routes are always empty).
- **Why:** the user explicitly wants only real routes from the connected databases — no curated/seed route data anywhere. Do NOT reintroduce a `SEED_ROUTES` array or a route seed fallback.

## Route -> saga matching (3-stage resolver, not 1:1 ownership)
- Routes no longer "own" a specific saga. Server `routeService.getRouteSaga` resolves in this ranked order: (1) same-canton curated saga (nearest within canton), (2) a synthetic saga live-built from a Wikipedia canton-legend search (`wikipedia.ts` `searchCantonLegend` -> `sagaFromWikiSummary`, id prefix `wiki-<canton-slug>`, source "Wikipedia (CC BY-SA)", non-persisted), (3) nearest curated saga fallback regardless of canton.
- Mobile mirrors only the curated-only fallback path: `lib/sagaMatch.ts` `nearestSaga(...)` (canton-first haversine, `EXAKT_RADIUS_M = 3500`) — it has no Wikipedia stage, so server and mobile can disagree on which saga a route gets when offline vs online.
- **Why:** with only 27 curated sagas across 26 cantons, most routes still have no exact local legend; the Wikipedia stage gives a live, canton-relevant story before falling back to a nearest curated saga from a different canton. This route-assignment certainty is SEPARATE from a saga's intrinsic `koordinatenSicherheit`.

## Seeding integrity
- `catalogSeed` deletes `catalog_sagas` rows whose id is not in `CURATED_SAGAS` (purges old AI/placeholder rows), then upserts the curated set, AND purges `catalog_routes` entirely. The catalog always contains exactly the curated sagas and zero routes.

## Live Wikipedia/OSM POI enrichment layer
- `GET /routes/pois` (bbox query) returns OSM historic=*/tourism=attraction|viewpoint nodes/ways (`overpass.ts` `fetchHistoricPois`) enriched with a live Wikipedia summary where an OSM `wikidata`/`wikipedia` tag resolves (`routeService.ts` `getPois`, cached; `wikipedia.ts` `fetchWikipediaSummary`/`resolveWikidataTitle`/`resolveOsmWikipediaTag`).
- This is display-only enrichment along the route (mobile `hike/[id].tsx` shows a "nearby" card when the live/simulated position comes within ~350 m of a fetched POI) — it does NOT feed into saga selection; that only uses `searchCantonLegend` (a separate, canton-level Wikipedia search, not tied to individual POIs).
- All Wikipedia/Wikidata access is via public unauthenticated REST endpoints (no API key).
