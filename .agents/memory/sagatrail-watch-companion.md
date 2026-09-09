---
name: SagaTrail Watch companion
description: Watch support uses an authoritative iPhone companion, simplified MapKit route data, and permission-gated HealthKit heart rate.
---

The iPhone remains authoritative for route progress, GPS freshness, safety, and session state. The Watch may receive a bounded, simplified route polyline plus the current point only when GPS is fresh, so it can render a native MapKit mini-map. It does not receive POI or safety-link coordinates, and stale/unavailable GPS must never be rendered as a live point. HealthKit heart rate is permission-gated and only fresh samples may be shown.

**Why:** The Watch needs a small route context for a useful map, but sending the full phone route or stale location would increase payload/privacy risk. HealthKit is the only authoritative live heart-rate source.

**How to apply:** Keep MapKit payloads bounded and validate every point; use `current: nil` whenever GPS is not fresh. Keep navigation, SOS, safety check-in, and notification mirroring functional when map or HealthKit data is unavailable.

**Live-state delivery:** Treat `updateApplicationContext` as the preferred cache, not the only transport. If WCSession is not activated yet or the context update fails, fall back to `sendMessage` when reachable and `transferUserInfo` otherwise; alert delivery alone does not prove that the live hike state arrived.

**Why:** A Watch can receive an immediate alert while still displaying an older cached session state when the phone publishes during WCSession activation.

**How to apply:** Keep the phone's live-state language explicit in every snapshot and localize alert text before crossing the native bridge; the Watch should normalize `gsw` to German for its UI.

**Turn-haptic mirroring:** Emit the Watch-native turn haptic only while the Watch app is active; when it is inactive, let the iPhone's mirrored local notification be the sole turn-notification surface.

**Why:** The same turn can arrive through the live-state channel and the iPhone notification mirror, causing two wrist vibrations.

**How to apply:** Keep the active-state guard around native turn haptics and re-arm the turn only after the distance leaves the approach window.

Circular Watch complications use a single SF Symbol rather than stacked text:
turn arrows for navigation, a location-slash symbol for stale GPS, a warning
triangle for off-route, pause for inactive sessions, and a walking symbol as
the active fallback.

**Why:** Circular complication families have too little space for route text,
and truncated distance/status strings are less glanceable than a state icon.

**How to apply:** Keep distance, weather, and remaining-route text in modular
or rectangular families; use the symbol-only templates for circular families.