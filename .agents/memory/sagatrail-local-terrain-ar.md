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

For live route projection, capture the GPS position once when the GravityAndHeading AR session starts and keep it as the fixed geographic world anchor for that mounted session. The 50 m near-field may be reprojected around each fresh GPS position, but it must then be translated back into the fixed AR world by the observer's geographic offset.

**Why:** Viro's geographic world origin stays at AR-session start. Re-centering route coordinates without translating them makes the virtual line slide relative to the physical landscape; never refreshing the near-field makes new route sections disappear after the user walks beyond the initial radius.

**How to apply:** Keep the session-start position as the stable world anchor, project the live near-field around the current observer, add the geographic anchor offset to route, terrain, and peak coordinates, and reset the captured anchor by unmounting the AR navigator when a new session starts. Continue limiting the rendered route to the local 50 m near-field and DTM radius; do not fabricate a distant route overlay.

When opening AR, snap the session origin to the nearest active-route segment only if the GPS fix is within 50 m; leave farther off-route fixes unchanged.

**Why:** A stationary GPS fix can still sit several metres beside the visible trail, which makes an otherwise correct absolute AR line visibly miss the way.

**How to apply:** Use the snapped origin only for the initial AR georeference; never continuously snap or recenter while the session is mounted, and never pull a clearly off-route user onto the route.

AR route input must use the active `navigationGeometry`, not the original catalog `route.geometry`. After a start detour is accepted, `navigationGeometry` contains the combined detour plus remaining official route and is the same geometry used by map, progress, and narration.

**Why:** Passing the catalog geometry to AR made the overlay continue pointing at the old route even though the app had already accepted and followed a newly calculated route from the user's current location.

**How to apply:** At every AR entry point pass the active geometry; keep the original route only for catalog metadata and fallback before a detour exists.

AR route materials must follow the map's smoothed grade bands: green below 10%, yellow from 10% to under 20%, orange from 20% to under 30%, and red from 30% upward, using absolute grade so steep descents are visible too.

**Why:** A single global AR route color hid the route's existing slope semantics and contradicted the map legend.

**How to apply:** Build colored approximately-50 m segments from the active route's elevation profile; keep missing-profile sections green rather than inventing a grade.

Live AR renders the first 50 m around the current observer at geographic 1:1 scale and refreshes that near-field as the user walks; farther route lines are omitted, while the destination is shown as a bounded directional flag. The 500 m DTM radius remains separate from the 50 m reliable visual-depth radius.

**Why:** A hard 2 km cutoff hid the destination and made the AR overlay incomplete, while uncompressed long routes placed the end outside a useful AR viewing distance. A compressed full-route line also suggested false camera depth for distant turns.

**How to apply:** Keep the complete `navigationGeometry`, cap only the number of stable native polyline slots by merging adjacent grade sections, and use the same projection options for route segments and the destination flag. Never use compression as evidence for terrain outside the DTM radius; those sections stay level.

The live AR route should use one semi-transparent colored polyline per smoothed grade band, with a colored arrowhead at the visible line end and additional arrowheads only at meaningful direction changes. Do not fill the route with regularly spaced chevrons; preserve the map's green/yellow/orange/red grade colors for both lines and arrows.

**Why:** Regularly repeated chevrons made the AR route look noisy and obscured the actual path. A continuous line makes the route legible while turn/end arrowheads communicate direction without losing slope information.

**How to apply:** Render each `TerrainRouteSegment` separately so grade colors and gaps remain intact. Detect turns from projected segment headings with a meaningful angle threshold and spacing guard; always place the final arrow on the last visible segment.

Destination flags need a screen-space minimum, not only a fixed AR-world size: scale the billboard with camera distance so its projected width stays approximately 30 px.

**Why:** A physically sized flag becomes unreadably small at the bounded virtual depth used for distant destinations.

**How to apply:** Compute the billboard scale from estimated camera focal length and viewport width; keep the minimum scale at 1 so nearby flags do not shrink.

Compressed route segments need a continuous centerline beneath the colored grade polylines, and the finish marker must use a fixed readable minimum size plus billboard orientation. The finish design is the 3×2 black-and-white Formula 1 chequered flag, not a solid red placeholder.

**Why:** At the compressed far end, separately rendered thin polylines can show hairline gaps and a physically small flag becomes unreadable in the camera view.

**How to apply:** Keep the centerline as one stable native Viro polyline, preserve colored grade segments above it, and size the flag in AR-world units independently of route distance.

The panorama card is a compass-driven 360° horizon view, not a 3D camera replacement: all nearby named peaks are retained, the current heading is the viewport center, and swiping explores the full circle. Perspective is conveyed with depth-scaled, shaded mountain faces; actual spatial AR remains behind the AR button.

**Why:** The old card claimed a “3D view” while showing only a small heading-sorted 2D slice, and peaks outside that slice could not be discovered by swiping.

**How to apply:** Keep the live compass as the automatic center, apply wrapped bearing math at the 0°/360° seam, load enough peaks for the full horizon, and keep the visible viewport narrower than the navigable 360° panorama.

Wide geographic features such as rivers require dense real DTM sampling; texture resolution alone cannot make a coarse radial triangle follow a valley.

**Why:** A coarse 5 km radial mesh draped the geographically correct Rhine texture across broad sloped triangles, making the river appear to climb the terrain.

**How to apply:** Increase real SwissTopo sector/ring density within service limits and retain the missing-sector gap guard. Never invent intermediate heights or bridge missing rays for visual smoothness.

On iOS, panorama heading must come from Core Location's calibrated heading, not from the custom magnetometer transform or a fixed 180-degree correction. Native WMS textures with flipY map geographic north to increasing V.

**Why:** The custom transform contained an explicit 180-degree offset yet still differed from Apple Maps by about 66 degrees on the same physical phone orientation. The old UV sign separately mirrored the WMS texture north/south.

**How to apply:** Prefer trueHeading, falling back to magHeading only when unavailable; keep Android's sensor fallback separate. Validate mesh rotation algebraically and texture axes independently instead of compensating one with the other.