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