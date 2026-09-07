---
name: SagaTrail Watch companion
description: Watch support uses an authoritative iPhone companion, simplified MapKit route data, and permission-gated HealthKit heart rate.
---

The iPhone remains authoritative for route progress, GPS freshness, safety, and session state. The Watch may receive a bounded, simplified route polyline plus the current point only when GPS is fresh, so it can render a native MapKit mini-map. It does not receive POI or safety-link coordinates, and stale/unavailable GPS must never be rendered as a live point. HealthKit heart rate is permission-gated and only fresh samples may be shown.

**Why:** The Watch needs a small route context for a useful map, but sending the full phone route or stale location would increase payload/privacy risk. HealthKit is the only authoritative live heart-rate source.

**How to apply:** Keep MapKit payloads bounded and validate every point; use `current: nil` whenever GPS is not fresh. Keep navigation, SOS, safety check-in, and notification mirroring functional when map or HealthKit data is unavailable.