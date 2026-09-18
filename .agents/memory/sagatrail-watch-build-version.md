---
name: Watch build version synchronization
description: Embedded SagaTrailWatch must use the upcoming EAS iOS build number so watchOS receives native updates.
---

The embedded Watch target's `CURRENT_PROJECT_VERSION` must be set to the next iOS build number before an EAS production build. EAS remote auto-increment advances the iOS app from the current remote number during the build, but does not automatically advance the embedded Watch target's native setting.

**Why:** A new iOS TestFlight build can otherwise contain a Watch binary whose own bundle version is still old, so a paired Watch may keep the previous native UI.

**How to apply:** Read the current EAS iOS build number, set both Debug and Release configurations of `SagaTrailWatch` to the next number, then start the production iOS build with the embedded Watch target.