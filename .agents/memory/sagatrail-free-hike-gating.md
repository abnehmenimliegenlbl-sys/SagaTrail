---
name: SagaTrail free-hike gating rule
description: Single source of truth for how the one free hike is gated for non-premium users
---

Rule: non-premium users have exactly ONE free hike anywhere (any canton). Until `freeHikeUsed` is true, NOTHING is locked for them; afterwards everything is locked.

**Why:** The old rule "only `isAnchorPlace` (Basel seed) sagas are free" is obsolete. All server-side package sagas (curatedSagasPakete) carry `isAnchorPlace: false`, so the old check locked every non-Basel saga even before the free hike — user-reported bug (July 2026).

**How to apply:** For non-premium gating always check `!premium && freeHikeUsed`, never `isAnchorPlace`. The gate exists in three screens: kanton/[canton].tsx (route cards), route/[id].tsx (isSagaLocked), saga/[id].tsx (locked box). Keep them in sync. `isAnchorPlace` is still used in the premium pack-fallback path only.
