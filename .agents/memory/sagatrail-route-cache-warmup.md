---
name: SagaTrail route cache warm-up
description: Why canton route search sometimes showed "Server nicht erreichbar" and how it's mitigated
---

The kanton route-search endpoint proxies OSM Overpass, which is slow (15-25s+) on a cold cache and occasionally exceeds intermediate proxy/timeout budgets — the client's generic error catch then shows "Server nicht erreichbar" even though the API server itself is healthy.

Fix: the API server now warms the DB route cache for all 26 cantons sequentially (staggered) right after startup (`warmAllCantonCaches` in `routeService.ts`, called from `index.ts`), so real user searches usually hit the DB cache instead of a live Overpass round-trip. Overpass retry count was also reduced from 2 attempts/mirror to 1 (3 mirrors = faster failure, sooner fallback to DB cache) since the existing cache-fallback-on-error logic in `getCantonRoutes` already degrades gracefully.

**Why:** Overpass first-load latency is inherent and can't be fully eliminated; pre-warming shifts the cost to server startup (background, non-blocking) instead of the user's first search.

**How to apply:** If "Server nicht erreichbar" reports recur, check whether it's a genuinely new/never-warmed canton, whether Overpass mirrors are down (check for repeated AbortError/HTTP 5xx in logs across all 3 mirrors), or whether warm-up is still mid-run after a recent restart (each canton takes ~4-12s plus a 4s stagger, ~26 cantons ≈ several minutes to fully settle).
