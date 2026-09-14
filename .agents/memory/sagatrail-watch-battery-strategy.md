---
name: Watch battery strategy
description: Energy constraints and design rules for the SagaTrail Apple Watch companion.
---

The iPhone is authoritative for route GPS and progress. The Watch HealthKit workout is for live heart rate and energy metrics only, so its location type must not request a second outdoor GPS stream. Routine live-state snapshots use a 15-second minimum interval; urgent turn, safety, SOS, and active-alert states may use 7.5 seconds. The MapKit route view should only exist while the status page is visible.

**Why:** Running an outdoor Watch workout, refreshing MapKit off-screen, and waking the Watch with frequent routine snapshots can compound into high battery usage even when the phone already provides the route position.

**How to apply:** Preserve fast delivery only for actionable/critical states, avoid a second location source, and keep map rendering lazy when changing Watch UI.