---
name: SagaTrail route photo DB writeback
description: How route photos are fetched, cached, and served inline with route data
---

## Rule
Photos found via `GET /routes/photo` are written back to `external_routes.photo_url` / `photo_attribution` (fire-and-forget). The route list endpoint (`/cantons/:canton/routes`) now returns `photoUrl` and `photoAttribution` inline.

## Why
Previously every route card triggered a separate /routes/photo request on mount. Now:
- Routes with photos in DB → served inline with route data, zero extra requests
- Routes without photos → useRouteFoto calls /routes/photo with `routeId` → server persists result → next load is free

## How to apply
- `photo.ts`: reads `req.query.routeId` (optional string); calls `db.update(externalRoutesTable).set({photoUrl, photoAttribution}).where(eq(...id, routeId))` — non-blocking (`.catch` only)
- `cantons.ts` `toRoute()`: maps `row.photoUrl ?? null` and `row.photoAttribution ?? null`
- `useRouteFoto.ts`: checks `route.photoUrl` first; only calls API if null
- `CatalogRoute` OpenAPI schema: `photoUrl` and `photoAttribution` are nullable (not required)
- `HikingRoute` TS type: `photoUrl?: string | null`, `photoAttribution?: string | null`

## Side note — homeCanton notNull fix
`profiles.home_canton` is still `NOT NULL` in DB. `SaveMyProfileBody` has `homeCanton` as optional since home canton concept was removed. Fix: `homeCanton ?? ""` in insert/update values in `profile.ts` (no migration needed).
