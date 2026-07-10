---
name: SagaTrail partner admin
description: How the restaurant/souvenir-shop "Partner" promotion feature is built and where the gaps are.
---

Partners (restaurants, souvenir shops, etc. promoted along routes) are managed via a `partners` table (lib/db/src/schema/partners.ts) and CRUD endpoints at `/api/admin/partner` (GET/POST), `/api/admin/partner/:id` (PATCH/DELETE), protected by the same `x-admin-token`/`ADMIN_TOKEN` timing-safe check as the existing `/admin/premium` endpoint. A self-contained HTML/vanilla-JS admin page is served at `/api/admin/partner-ui` (artifacts/api-server/src/lib/partnerAdminHtml.ts) — token is entered client-side and kept only in memory, never persisted.

**Why:** user wanted a lightweight internal tool (no separate user-account system) to let non-technical staff add/edit/deactivate partner listings without touching code, matching a precedent already in the codebase.

**How to apply:** when extending this — e.g. adding a public read endpoint so the mobile app can display partners on the map/route screens — filter by `isActive` and the `aktivVon`/`aktivBis` window (both nullable = always active), and go through the openapi.yaml + api-zod codegen flow since that part *is* app-facing, unlike the internal admin CRUD which deliberately bypasses OpenAPI codegen.

Public read endpoint (`GET /routes/partners`, bbox query params) is done, plus map display: gold diamond markers (distinct from POI's blue) + legend row on the swisstopo Leaflet map in both hike and route-preview screens, with a tap-to-detail modal (name/beschreibung/angebot) on the hike screen. `buildSwisstopoHtml()`'s positional signature grew a trailing `partners` arg after `legend` — check both `SwisstopoMap.tsx` and `SwisstopoMap.web.tsx` call sites if it changes again.
