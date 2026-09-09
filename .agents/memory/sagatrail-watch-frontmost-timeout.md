---
name: Modern Watch app lifecycle
description: Why SagaTrail's single-target SwiftUI Watch app must not use the legacy WKExtension singleton.
---

Never instantiate `WKExtension.shared()` in SagaTrail's modern single-target SwiftUI Watch app. Use SwiftUI `scenePhase` to track whether the app is active; rely on the HealthKit workout session for continued hike execution.

**Why:** watchOS terminates the app with a WATCHKIT API Violation because `WKExtension` may only be instantiated by a legacy WatchKit Extension. Moving the call later in the SwiftUI lifecycle does not make it valid.

**How to apply:** Keep all lifecycle checks in SwiftUI scene state. Grep the complete Watch target for `WKExtension` before native releases; there must be no occurrences.