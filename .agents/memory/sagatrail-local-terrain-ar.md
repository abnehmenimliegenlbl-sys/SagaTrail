---
name: Local terrain AR
description: Durable rules for observer-centered SwissTopo terrain meshes, occlusion, and offline coverage in SagaTrail.
---

The native AR scene uses an observer-centered radial SwissTopo model. Its local coordinates are aligned by subtracting the current compass heading, and peak labels use the same proportional display scale as the mesh.

**Why:** A route elevation profile is not a surrounding digital elevation model. Using it as one produced false terrain surfaces and could make a peak appear blocked without evidence.

**How to apply:** Online models may be refreshed only after meaningful movement or elapsed time. Offline downloads intentionally store one model at the route start to keep packages bounded; after leaving its coverage, the app must keep peaks visible as unknown rather than fabricate terrain or occlusion. Missing observer elevation, missing rays, unknown peak heights, or peaks outside model radius always fail open.