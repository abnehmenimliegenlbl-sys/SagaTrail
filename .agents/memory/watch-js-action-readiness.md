---
name: Watch JS action readiness
description: Native-to-JavaScript Watch action delivery can race React Native listener activation.
---

The phone-side Watch bridge must have an explicit JavaScript-listener readiness boundary after all listeners are registered. On iOS, an `RCTEventEmitter` must be consumed through a `NativeEventEmitter` bound to that native module, not only through the global `DeviceEventEmitter`. Only the React Native module instance crossing the readiness boundary may bind the singleton Watch action handler, and the boundary must drain queued actions.

**Why:** `RCTEventEmitter.startObserving` is not a reliable immediate signal for the listeners used by the app. A global emitter can also leave native logs showing “forwarding to JS” while the module callback never fires. React Native can construct short-lived duplicate native module instances; binding the singleton handler from `init` lets one overwrite the active handler and later discard actions through a cleared weak reference.

**How to apply:** Keep native Watch actions queueable. Bind the iOS listener with `new NativeEventEmitter(theNativeModule)`. Bind the singleton action handler only inside the explicit readiness method called after listener registration; use a weak reference to the ready module and never bind from module initialization. Retain the normal `startObserving` drain as a fallback. On the Watch side, request cached live state after activation/reachability recovery. Verify native receipt, native forwarding, JS receipt, component receipt, and the resulting live-state update as separate logged boundaries. Apply the same queue/cache behavior to Garmin-originated events.