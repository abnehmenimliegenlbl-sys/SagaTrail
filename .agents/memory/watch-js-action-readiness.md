---
name: Watch JS action readiness
description: Native-to-JavaScript Watch action delivery can race React Native listener activation.
---

The phone-side Watch bridge must have an explicit JavaScript-listener readiness boundary after all `DeviceEventEmitter` listeners are registered. Only the React Native module instance crossing that boundary may bind the singleton Watch action handler, and the boundary must drain queued actions.

**Why:** `RCTEventEmitter.startObserving` is not a reliable immediate signal for the listeners used by the app. Also, React Native can construct short-lived duplicate native module instances. Binding the singleton handler from `init` lets such an instance overwrite the active handler; after its weak reference clears, the phone can log an action as delivered while nothing reaches JavaScript.

**How to apply:** Keep native Watch actions queueable. Bind the singleton action handler only inside the explicit readiness method called by the shared companion subscription after listener registration; use a weak reference to the ready module and never bind from module initialization. Retain the normal `startObserving` drain as a fallback. On the Watch side, request cached live state after activation/reachability recovery. Verify native receipt, native forwarding, JS receipt, component receipt, and the resulting live-state update as separate logged boundaries. Apply the same queue/cache behavior to Garmin-originated events.