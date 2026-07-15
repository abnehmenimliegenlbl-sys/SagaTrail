---
name: EAWS avalanche API
description: How SagaTrail fetches EAWS avalanche bulletins, seasonal behavior, and the canton→region mapping pattern.
---

## Rule
Use EAWS Connect-JSON endpoint: `https://api.avalanche-forecasting.eu/v6/bulletin/latest/YYYY-MM-DD?regions=CH-XX&format=CAAMLv6_0_JSON`

**Why:** EAWS v6 is the current standard. The legacy LWD endpoints no longer exist for many regions.

## Seasonal behavior
In summer (roughly May–Nov) the EAWS API returns HTTP 200 with an empty body (`Content-Length: 0`). This is **correct** — no bulletin is published outside the winter season. The server handles it by returning `{ available: false, reason: "no-bulletin" }`.

## Non-alpine cantons
Cantons without an alpine EAWS region (e.g. Zürich, Basel, Genf) map to `null` in the canton→region table and the server returns `{ available: false, reason: "no-alpine-region" }`.

## HikingRoute.canton quirk
`HikingRoute` (constants/routes.ts) has **no `.canton` field**. To resolve the canton for a given route, do:
```ts
const canton = sagas.find(s => s.id === route.sagaId)?.canton;
const slug = kantonSlug(canton);
```

## How to apply
- Server caches EAWS responses for 1 h (bulletin changes at most once per day).
- Mobile UI only shows the avalanche card when the route's saga canton maps to an alpine EAWS region.
- UI renders colored EAWS danger levels 1–5 using a fixed color palette (1=green, 2=yellow, 3=orange, 4=red, 5=dark-red).
