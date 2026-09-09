---
name: Watch frontmost timeout
description: Why SagaTrail must extend the watchOS frontmost timeout before its workout session is ready.
---

Set the watchOS extended frontmost timeout immediately during Watch app initialization and refresh it from live-state transitions until the hike is finished.

**Why:** The HealthKit workout session starts asynchronously after WatchConnectivity delivers the active hike. Without the startup guard, watchOS can return to the watch face within seconds before the workout keeps the app active. A later cleanup once removed both guards and reintroduced the issue.

**How to apply:** Preserve both lifecycle points when refactoring the Watch app entry point or hike model. Only release the live-state guard after the session reaches `finished`; do not rely solely on HealthKit authorization or workout startup timing.