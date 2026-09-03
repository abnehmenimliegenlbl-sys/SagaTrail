---
name: Safety share links
description: Durable rules for SagaTrail's temporary external safety-monitoring links.
---

External safety links are temporary, unguessable bearer links. The server stores only a token hash and exposes no account identity; public status contains route name, lifecycle state, expiry, and the latest throttled fresh GPS fix.

**Why:** The link is intended for a trusted emergency contact without requiring that person to sign in, while minimizing exposure and preventing stale or simulated positions from looking live.

**How to apply:** Enforce expiry and owner revocation server-side, throttle location writes, persist the active token locally for app restarts, and label a network-failure fallback as a local timer rather than implying external monitoring.