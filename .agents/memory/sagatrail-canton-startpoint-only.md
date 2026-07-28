---
name: Route canton = start point only, multi-canton dropped
description: User decision — routes belong to exactly one canton (start point); no multi-canton backfill
---

Rule: each route in `external_routes` is assigned exactly ONE canton — the canton of its start point. The multi-canton feature (`cantons TEXT[]`, Nominatim sampling along the route) was built, then explicitly rejected by the user ("wir nehmen nur den Startpunkt", July 2026) and removed from the enrichment.

**Why:** User wants a simple one-canton assignment; the multi-canton backfill also added hours of Nominatim runtime.

**How to apply:** Do not re-add multi-canton backfill phases to enrich-next/enrich-all. The `cantons` column still exists (empty `{}` everywhere) and the `canton = X OR X = ANY(cantons)` filter in loadCachedRoutes is harmless but inert — safe to remove in a cleanup. Never repurpose the column without asking the user first.
