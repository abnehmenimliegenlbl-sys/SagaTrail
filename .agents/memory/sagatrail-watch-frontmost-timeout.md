---
name: Watch frontmost timeout
description: How SagaTrail safely extends the watchOS frontmost timeout before its workout session is ready.
---

Set the watchOS extended frontmost timeout from the SwiftUI scene task after `WindowGroup` becomes active, and refresh it from live-state transitions until the hike is finished. Never access `WKExtension.shared()` from the SwiftUI `App.init()`.

**Why:** The HealthKit workout session starts asynchronously after WatchConnectivity delivers the active hike. Without the startup guard, watchOS can return to the watch face too early. But accessing the extension singleton before the SwiftUI scene exists can terminate the Watch app during launch.

**How to apply:** Keep the initial assignment in a scene/view task and the later assignment in live-state handling. Only release the live-state guard after `finished`; do not move the initial access into `App.init()`.