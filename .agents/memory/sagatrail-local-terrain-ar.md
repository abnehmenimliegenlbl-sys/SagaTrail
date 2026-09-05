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

For the live route projection, prefer the current GPS observer position over `terrainModel.center`. The radial terrain model is intentionally refreshed less often than GPS and may be stale while the AR observer has moved; using its center as the route origin can filter every route point outside the local radius.

**Why:** A valid route with 166 points produced zero Viro polylines because all points were evaluated against a stale terrain-model center, so the route silently disappeared.

**How to apply:** Keep `terrainModel.center` as the fallback only when no live observer position exists. Continue limiting the rendered route to the local model radius; do not fabricate a distant route overlay.

AR route input must use the active `navigationGeometry`, not the original catalog `route.geometry`. After a start detour is accepted, `navigationGeometry` contains the combined detour plus remaining official route and is the same geometry used by map, progress, and narration.

**Why:** Passing the catalog geometry to AR made the overlay continue pointing at the old route even though the app had already accepted and followed a newly calculated route from the user's current location.

**How to apply:** At every AR entry point pass the active geometry; keep the original route only for catalog metadata and fallback before a detour exists.

AR route materials must follow the map's smoothed grade bands: green below 10%, yellow from 10% to under 20%, orange from 20% to under 30%, and red from 30% upward, using absolute grade so steep descents are visible too.

**Why:** A single global AR route color hid the route's existing slope semantics and contradicted the map legend.

**How to apply:** Build colored approximately-50 m segments from the active route's elevation profile; keep missing-profile sections green rather than inventing a grade.

Live AR now projects the entire active route into a bounded virtual depth: the first ~500 m retain geographic scale and real DTM elevation, while farther sections are logarithmically compressed, rendered with progressively thinner lines, and end in a fixed small destination-flag slot.

**Why:** A hard 2 km cutoff hid the destination and made the AR overlay incomplete, while uncompressed long routes placed the end outside a useful AR viewing distance.

**How to apply:** Keep the complete `navigationGeometry`, cap only the number of stable native polyline slots by merging adjacent grade sections, and never use the compression as evidence for terrain outside the DTM radius; those sections stay level.

Compressed route segments need a continuous centerline beneath the colored grade polylines, and the finish marker must use a fixed readable minimum size plus billboard orientation. The finish design is the 3×2 black-and-white Formula 1 chequered flag, not a solid red placeholder.

**Why:** At the compressed far end, separately rendered thin polylines can show hairline gaps and a physically small flag becomes unreadable in the camera view.

**How to apply:** Keep the centerline as one stable native Viro polyline, preserve colored grade segments above it, and size the flag in AR-world units independently of route distance.

The panorama card is a compass-driven 360° horizon view, not a 3D camera replacement: all nearby named peaks are retained, the current heading is the viewport center, and swiping explores the full circle. Perspective is conveyed with depth-scaled, shaded mountain faces; actual spatial AR remains behind the AR button.

**Why:** The old card claimed a “3D view” while showing only a small heading-sorted 2D slice, and peaks outside that slice could not be discovered by swiping.

**How to apply:** Keep the live compass as the automatic center, apply wrapped bearing math at the 0°/360° seam, load enough peaks for the full horizon, and keep the visible viewport narrower than the navigable 360° panorama.

Wide geographic features such as rivers require dense real DTM sampling; texture resolution alone cannot make a coarse radial triangle follow a valley.

**Why:** A coarse 5 km radial mesh draped the geographically correct Rhine texture across broad sloped triangles, making the river appear to climb the terrain.

**How to apply:** Increase real SwissTopo sector/ring density within service limits and retain the missing-sector gap guard. Never invent intermediate heights or bridge missing rays for visual smoothness.