---
name: Watch action remote diagnostics
description: Remote diagnostic coverage required for Apple Watch safety actions.
---

Apple Watch safety actions must emit privacy-safe remote diagnostics at the Watch interaction, WatchConnectivity send, iPhone receipt, native delivery, and JavaScript receipt boundaries.

**Why:** JavaScript remote logs alone only prove that an action reached React Native. Native `NSLog` entries remain on Apple devices and cannot distinguish a failed Watch tap, queued transfer, phone receipt, or native-to-JS handoff from Replit production logs.

Queued safety actions must be drained explicitly only after every event-specific JavaScript listener is registered; never drain them directly from `RCTEventEmitter.startObserving()`.

**Why:** `startObserving()` runs when the first listener is attached. If that first listener handles heart rate, a queued safety command can be emitted before the hike-command listener exists and disappear despite successful WatchConnectivity delivery.

**How to apply:** For check-in and SOS changes, register all JS listeners, activate the companion, then request the native pending-action drain. Keep each remote event limited to stage, command kind, duration option, connectivity booleans, protocol outcome, and timestamp. Never include coordinates, contact details, story text, or identifiers.

The native emitter must also retry the pending-action drain asynchronously from `startObserving()`.

**Why:** React Native can invoke the JS-side drain before `RCTEventEmitter` has completed its observing transition; the native guard then sees no listeners and leaves a valid Watch command queued indefinitely.

**How to apply:** Keep the explicit JS drain, but schedule a second main-queue drain from native `startObserving()`; draining an already-empty queue is harmless.