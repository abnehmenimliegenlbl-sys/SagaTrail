---
name: Local terrain AR
description: Durable rules for observer-centered SwissTopo terrain meshes, occlusion, and offline coverage in SagaTrail.
---

The native AR scene uses an observer-centered radial SwissTopo model. Its local coordinates are aligned by subtracting the current compass heading, and peak labels use the same proportional display scale as the mesh. The user-facing local model is shown as a georeferenced SwissTopo map card by default, with Swissimage satellite imagery as a selectable alternative; a solid red or abstract cyan terrain plane is visually ambiguous. That map remains available as a separate presentation, but the Gipfelpanorama opens directly into Viro AR rather than mounting a normal CameraView, and the AR view intentionally has no central crosshair/reticle. The route overlay is projected into the landscape frame, shows only portions inside the local terrain radius, and uses a distinct line plus a central “DU” marker.

**Why:** A route elevation profile is not a surrounding digital elevation model. Using it as one produced false terrain surfaces and could make a peak appear blocked without evidence.

**How to apply:** Online models may be refreshed only after meaningful movement or elapsed time. Offline downloads intentionally store one model at the route start to keep packages bounded; after leaving its coverage, the app must keep peaks visible as unknown rather than fabricate terrain or occlusion. Missing observer elevation, missing rays, unknown peak heights, or peaks outside model radius always fail open for occlusion; the route overlay may still draw level from the live GPS center. The flat map card has its own Viro-world size and must not inherit the former mesh scale; a live AR route must stay in Viro's absolute GravityAndHeading frame, while the retained map card may use a camera-relative frame.

**Why:** The first visible mesh technically rendered but looked like an unexplained red slab in the camera view, so the terrain source and scale were not understandable. A real map layer makes the local model and route immediately legible while preserving the terrain data for occlusion.

The live AR scene must not receive the UI compass heading as a frequently changing Viro app prop: `GravityAndHeading` owns the geographic frame, and re-rendering the native scene on every sensor tick can add instability without changing geographic marker coordinates. The separate UI compass uses tilt compensation from DeviceMotion gravity plus Magnetometer, a circular sample window, and low-pass smoothing.

**Why:** A raw magnetometer x/y calculation becomes unstable when the phone is held upright, while passing that changing value into an already north-aligned Viro scene creates unnecessary native updates.

**How to apply:** Keep `heading` available to compass cards and overlays, but exclude it from `PeakArSceneAppProps`/`viroAppProps`. If the AR markers still drift after this separation, investigate Viro/ARKit/ARCore world alignment on a physical device rather than tightening the UI heading filter.