---
name: SagaTrail saga image search by motif, not place
description: Why saga hero photos use a separate curated text field instead of coordinates or coreMotif for Wikimedia Commons search.
---

Saga hero images must show what the saga is ABOUT (e.g. the mythical creature/figure), not the town/landscape where it's set — user explicitly rejected "Rheinufer" for a Vogel Gryff saga and "Stadt" for a bear-founding saga.

**Why:** `coreMotif` (the existing catalog field) is often an abstract theme like "Stadtgründung und Namensgebung" or "Pakt mit dem Teufel" — useless as a Commons search string. Coordinate-based photo search (existing `useRouteFoto`/`/routes/photo` pattern) just returns generic landscape/place photos.

**How to apply:** A new curated field `bildmotiv` (concrete, photographable noun phrase, German) was added per-saga to `catalogSagasTable`/`InsertCatalogSaga`/`Saga` type and both curated data files (`artifacts/api-server/src/lib/curatedSagas.ts` + mirrored `artifacts/mobile/constants/sagas.ts`, must stay in sync). A new endpoint `/sagas/photo?query=` does a Wikimedia Commons **text/relevance search** (`generator: "search"`, `gsrsearch`) as opposed to the existing geosearch. `useSagaFoto` tries `bildmotiv` search first, falls back to coordinate-based photo, then to the bundled fallback image. Note: many single/compound-word Commons searches return null in this sandbox due to 429 rate-limiting (see wikimedia-blocked-sandbox memory) — not necessarily a bad query; verify with retries before concluding a motif string is bad.
