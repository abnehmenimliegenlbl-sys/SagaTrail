---
name: SagaTrail free-hike gating rule
description: Single source of truth for how the one free hike is gated for non-premium users
---

Rule: non-premium users have exactly ONE free hike anywhere (any canton). Until `freeHikeUsed` is true, NOTHING is locked for them; afterwards everything is locked.

**Why:** The old rule "only `isAnchorPlace` sagas are free" is obsolete because `isAnchorPlace` describes catalog/location anchoring, not access. It caused nearly every saga in a premium user's unpurchased canton to appear unlocked.

**How to apply:** For non-premium gating always check `!premium && freeHikeUsed`, never `isAnchorPlace`. For premium users, an unpurchased canton exposes only that canton's first saga; a purchased canton pack exposes its first `SAGEN_PRO_PACK` sagas, and higher indexes remain locked until their pack exists. Keep route/[id]/saga.tsx, route/[id].tsx, and saga/[id].tsx in sync. A dynamically resolved route anchor can have catalog index `-1`; treat that as the first saga, not as a later locked index.
