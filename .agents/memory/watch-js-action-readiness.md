---
name: Watch JS action readiness
description: Native-to-JavaScript Watch action delivery can race React Native listener activation.
---

The phone-side Watch bridge must have an explicit JavaScript-listener readiness boundary after all `DeviceEventEmitter` listeners are registered, and that boundary must drain queued Watch actions.

**Why:** `RCTEventEmitter.startObserving` is not a reliable immediate signal for the listeners used by the app. A safety command can arrive while the native bridge still believes JavaScript is absent; without a second drain, the command remains queued and the phone never starts the safety timer.

**How to apply:** Keep native Watch actions queueable, call the explicit readiness method from the shared companion subscription immediately after listener registration, and retain the normal `startObserving` drain as a harmless fallback. Verify that the JS command handler and resulting live-state update are both logged.