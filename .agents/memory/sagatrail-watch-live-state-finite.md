---
name: Watch live-state finite values
description: Rules for keeping SagaTrail HikeLiveState valid across GPS and route-data edge cases.
---

Every numeric value sent in HikeLiveState must be finite before it crosses the JS/native boundary; a single NaN in an optional active-state field rejects the entire snapshot.

**Why:** Route ascent, distance, and duration can be NaN even when their TypeScript types are numbers, and the strict validator rejects the complete state once GPS progress makes derived fields non-null.

**How to apply:** Normalize route-derived metrics at construction time and use null for unavailable optional values. Keep JS validation aligned with the native WatchProtocol validation.