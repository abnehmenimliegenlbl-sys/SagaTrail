---
name: SagaTrail Watch companion
description: Watch support currently uses native phone notification mirroring; heart rate must remain unavailable until a real HealthKit/Health Connect bridge exists.
---

The current watch companion deliberately uses local native notifications mirrored by the paired watch. It can provide fresh-GPS direction, remaining distance, and SOS context without claiming a separate watch app. Heart rate stays null and is rendered as unavailable; never substitute simulated or stale values.

**Why:** Expo Sensors does not provide a reliable live heart-rate stream, and users must not be given a medically misleading value.

**How to apply:** A future HealthKit/Health Connect implementation must provide an explicit permission-gated provider and feed only fresh samples into the existing watch status payload. Keep notification mirroring and SOS behavior working when health access is denied.