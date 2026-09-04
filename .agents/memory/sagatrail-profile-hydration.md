---
name: SagaTrail profile hydration ordering
description: Server profile data must win over the local AsyncStorage cache after startup
---

Rule: do not apply the authenticated server profile until local AsyncStorage hydration has completed.

**Why:** A slower local-cache read can otherwise overwrite freshly fetched fields such as purchased canton packs and make an entitled user appear locked.

**How to apply:** Gate the server-profile synchronization effect on the hydration flag; keep RevenueCat entitlement checks as a fallback for pack access.