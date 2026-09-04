---
name: SagaTrail profile hydration ordering
description: Server profile data must win over the local AsyncStorage cache after startup
---

Rule: do not apply the authenticated server profile until local AsyncStorage hydration has completed.

**Why:** A slower local-cache read can otherwise overwrite freshly fetched fields such as purchased canton packs and make an entitled user appear locked.

**How to apply:** Gate the server-profile synchronization effect on the hydration flag; keep RevenueCat entitlement checks as a fallback for pack access.

Additional rule: keep purchased pack slugs in an independent authenticated sync as well as in the profile object.

**Why:** The visible route Saga picker can render without a fresh profile-query response; a stale or missing query result otherwise turns a valid DB pack grant into a false lock.

**How to apply:** On an authenticated hydrated app start, read the pack list from `/api/me`, update only the pack state/profile field, and leave existing cache data intact on request failure.