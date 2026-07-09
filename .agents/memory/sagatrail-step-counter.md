---
name: SagaTrail step counter
description: How step tracking is wired into the hike screen and session data
---
Steps are tracked live during a hike via `expo-sensors` `Pedometer.watchStepCount`, started only once `!preparing && !finished`, and stored per-hike in `HikeSession.steps` (no lifetime/aggregate total, not fed into the rank/points system).

**Why:** Matches the existing pattern for other device-dependent features (GPS, background audio) — must degrade gracefully since Pedometer isn't available on web/emulator and requires ACTIVITY_RECOGNITION on Android; user only asked for a simple per-hike counter, not cross-device aggregation.

**How to apply:** If steps should later feed into spark points/rank system or become a lifetime stat in the collection screen, that's a deliberate follow-up — not assumed by the current implementation.

**Pitfall (fixed 2026-07-09):** `Pedometer.watchStepCount`'s callback returns the CUMULATIVE step count since the subscription began, not a delta since the last event. Doing `setSteps(prev => prev + result.steps)` therefore multiplies the real count by however many events have fired (10-40x overcount reported). Fix: `setSteps(result.steps)` directly (replace, don't add), since the subscription's own base is 0 and is only created once per hike (`preparing`/`finished` don't retrigger mid-hike).
