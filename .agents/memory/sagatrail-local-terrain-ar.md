---
name: Local terrain AR
description: Durable rules for observer-centered SwissTopo terrain meshes, occlusion, and offline coverage in SagaTrail.
---

The native AR scene uses an observer-centered radial SwissTopo model. Its local coordinates are aligned by subtracting the current compass heading, and peak labels use the same proportional display scale as the mesh. The user-facing local model is shown as a georeferenced SwissTopo map card by default, with Swissimage satellite imagery as a selectable alternative; a solid red or abstract cyan terrain plane is visually ambiguous. The route overlay is projected into the same map frame, shows only portions inside the local terrain radius, and uses a distinct line plus a central “DU” marker.

**Why:** A route elevation profile is not a surrounding digital elevation model. Using it as one produced false terrain surfaces and could make a peak appear blocked without evidence.

**How to apply:** Online models may be refreshed only after meaningful movement or elapsed time. Offline downloads intentionally store one model at the route start to keep packages bounded; after leaving its coverage, the app must keep peaks visible as unknown rather than fabricate terrain or occlusion. Missing observer elevation, missing rays, unknown peak heights, or peaks outside model radius always fail open. The flat map card has its own Viro-world size and must not inherit the former mesh scale; a live AR route must stay in Viro's absolute GravityAndHeading frame, while the retained map card may use a camera-relative frame.

**Why:** The first visible mesh technically rendered but looked like an unexplained red slab in the camera view, so the terrain source and scale were not understandable. A real map layer makes the local model and route immediately legible while preserving the terrain data for occlusion.