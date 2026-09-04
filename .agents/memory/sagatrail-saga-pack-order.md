---
name: SagaTrail saga pack order
description: Stable saga ordering and the progress rule for free canton sagas versus purchased canton packs.
---

# Saga progress and pack ordering

The canton overview uses one accessible saga as the default progress total (`x von 1`). A purchased canton pack (or Elite access) uses the full current canton catalog, which is nine sagas (`x von 9` today). Pack 1 therefore covers the first nine catalog entries; later pack indices remain available for future expansion.

**Why:** PostgreSQL does not promise row order without `ORDER BY`. Deriving pack membership from an arbitrary catalog query made the first curated Basel-Stadt saga appear in a later pack and incorrectly locked it.

**How to apply:** Keep the API catalog sorted by the authoritative curated bundle order, and keep mobile pack-index calculations aligned with that order. Do not use proximity sorting or incidental DB row order for pack assignment.