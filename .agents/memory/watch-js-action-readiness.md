---
name: Watch JS action readiness
description: Native-to-JavaScript Watch action delivery can race React Native listener activation.
---

The phone-side Watch bridge must have an explicit JavaScript-listener readiness boundary after all `DeviceEventEmitter` listeners are registered, and that boundary must drain queued Watch actions.

**Why:** `RCTEventEmitter.startObserving` is not a reliable immediate signal for the listeners used by the app. A safety command can arrive while the native bridge still believes JavaScript is absent; without a second drain, the command remains queued and the phone never starts the safety timer.

**How to apply:** Keep native Watch actions queueable, export and call the explicit readiness method from the shared companion subscription immediately after listener registration, and retain the normal `startObserving` drain as a harmless fallback. On the Watch side, request the cached live state after activation/reachability recovery; use a transport sequence only as a same-timestamp tie-breaker because the phone screen can restart its local counter. Verify that the JS command handler, native Watch receipt, and resulting live-state update are all logged. Apply the same queue/cache behavior to Garmin-originated events.