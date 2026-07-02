---
name: SagaTrail content model
description: What it takes to add a new saga/route so it works in every language without silent German fallback.
---

# Adding a saga/route to SagaTrail

Adding one legend correctly means touching three places:

1. `constants/sagas.ts` — the German `Saga` (id, title, canton, coreMotif, mood, summary, source, optional coordinates, isAnchorPlace).
2. `constants/routes.ts` — a `HikingRoute` whose `sagaId` must resolve to that saga (1:1). Cantons with >1 route just get >1 route entry pointing at different sagas.
3. `lib/storyContent.ts` `SAGA_SUMMARIES` — a translated summary for the new saga id in **all 7 non-German blocks** (gsw, fr, it, en, zh, es, pt).

**Why:** `localizedSummary(lang, id, fallback)` returns `SAGA_SUMMARIES[lang]?.[id] ?? fallback`, and the fallback is the German `saga.summary`. A missing key does not error — it silently serves German inside an otherwise-localized narration. Only the *summary sentence* is per-saga; the chapter bodies (ch1..chFinal) are generic per-language templates parameterized by canton/title/summary/archetype, so they need no per-saga work.

**How to apply:** whenever you add or rename a saga id, update all 7 non-German summary maps in lockstep and confirm every `route.sagaId` still resolves. German needs no SAGA_SUMMARIES entry by design.
