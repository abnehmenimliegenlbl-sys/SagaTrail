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

## Route -> saga matching (nearest, not 1:1 ownership)
- Routes no longer "own" a specific saga. Each route resolves to the NEAREST curated saga.
- Server: `catalogSeed` remaps every seed route's `sagaId` to the nearest curated saga (`naechsteKuratierteSagenId`, canton-first then haversine) at seed time, so the `/catalog` contract never returns a dangling `sagaId`. `routeService.getRouteSaga` -> `findNearestCuratedSaga` for dynamic OSM routes.
- Mobile: `lib/sagaMatch.ts` `nearestSaga(...)` (canton-first haversine, `EXAKT_RADIUS_M = 3500`). `getSagaForRoute` tries `sagas.find(id === route.sagaId)` then falls back to `nearestSaga`. `sagaLokalisierung` marks a route-assignment as `exakt` only when same canton AND <= 3.5 km; otherwise "nicht exakt lokalisierbar".
- **Why:** with only a handful of curated sagas, most routes have no exact local legend; nearest-match with an honest "nicht exakt lokalisierbar" note is the product rule. This route-assignment certainty is SEPARATE from the saga's intrinsic `koordinatenSicherheit`.

## Seeding integrity
- `catalogSeed` deletes `catalog_sagas` rows whose id is not in `CURATED_SAGAS` (purges old AI/placeholder rows), then upserts the curated set. The catalog always contains exactly the curated sagas.
