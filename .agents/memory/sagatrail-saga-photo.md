---
name: SagaTrail per-saga hero photo
description: How the saga detail screen gets a real, location-matched hero photo instead of one generic bundled image.
---
The saga detail screen originally showed one of two bundled fallback images (generic valley / Teufelsbrücke) for all ~27 curated sagas, regardless of the saga's actual location — this made the hero image feel generic/mismatched.

Fix: reuse the existing server-side Wikimedia Commons geo-photo endpoint (already built for hiking routes, keyed by lat/lng) with the saga's own `coordinates` field. A saga-specific hook (`useSagaFoto`) mirrors the route photo hook: cache by rounded coordinates, fall back to the bundled image when the saga has no coordinates or Commons has no photo.

**Why:** Consistent with the project's "curated public-domain content, no AI image generation" policy — reusing a real geo-photo lookup keeps images authentic and free, and avoids building a second photo pipeline from scratch.

**How to apply:** When a screen needs a location-appropriate real photo and the entity has lat/lng, prefer wiring it to the existing Commons photo endpoint/hook pattern rather than generating or hand-picking one image per entity.
