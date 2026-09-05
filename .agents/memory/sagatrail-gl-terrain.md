---
name: Shared GL terrain renderer
description: Rendering boundary for the normal panorama, future full-route 3D view, AR, and fallbacks.
---

Use Expo GL with Three.js as the shared terrain-rendering foundation for the normal panorama and the future animated full-route landscape. Keep Viro restricted to the dedicated AR screen, and retain the SVG terrain as a fallback when the native GL module is unavailable.

**Why:** The non-AR Viro scene navigator is deprecated and entered a repeated warning/render loop on a real iPhone while producing an empty embedded view. Skia is primarily 2D and would require rebuilding perspective, depth, clipping, and texture projection manually.

**How to apply:** Feed both panorama and route-wide views from geographic terrain meshes with real SwissTopo DTM heights and UV coordinates. Change camera and route overlays per view instead of creating separate rendering engines. Never hide the SVG fallback until the GL context reports ready.

For the full-route view, build the terrain corridor from several parallel SwissTopo profile lanes along a distance-resampled route. Keep each returned cell's real latitude and longitude; do not force curved lanes into a rectangular geographic grid. Missing elevations stay null, and triangles that touch them must be omitted.

**Why:** The observer-centered radial panorama model cannot cover a long route and would flatten points outside its radius. Parallel route lanes cover the complete corridor with a bounded number of official profile requests while preserving gaps as gaps.

**How to apply:** Use cumulative route distance for resampling, animation, grade lookup, and camera following. Use geographic bounds only for UV mapping—not to reconstruct cell positions.

The panorama camera belongs at the radial mesh origin near eye level and must look horizontally outward. Never reuse the elevated overview camera from the full-route scene or aim the panorama camera back at the origin.

**Why:** A camera outside the mesh looking at its center turns the panorama into a miniature terrain map. The physical-iPhone test confirmed the origin-level outward camera restores the intended panorama.

**How to apply:** Keep the mesh centered at zero, rotate it by the compass bearing, and use a forward horizon target. Route-wide overview/follow cameras remain separate.

Use the label-free SwissTopo SWISSIMAGE orthophoto for the panorama texture, not the text-heavy pixel map.

**Why:** Place names and map symbols compete with terrain silhouettes and peak labels. The physical-iPhone comparison confirmed SWISSIMAGE is markedly clearer in the panorama.

**How to apply:** Keep the normal SwissTopo map available for route-oriented views where paths and labels aid navigation; this choice is specific to the panorama.

Keep the last successfully loaded panorama texture visible while refreshed terrain or imagery loads. Do not reset GL readiness merely because `fetchedAt` changes, and do not clear the current texture before its replacement is ready.

**Why:** Fast panning and terrain refreshes exposed the red SVG/material fallback for a frame. Physical-iPhone testing confirmed stale-while-revalidate removes the flash without interrupting movement.

**How to apply:** Reset GL readiness only when there is no terrain model at all. Swap textures atomically after the new native texture has completed loading.

The panorama SVG overlay must use `preserveAspectRatio="none"` when it fills the tall, flexible native panorama container.

**Why:** The default SVG `meet` behavior preserved the old 360×350 aspect ratio and vertically centered it, creating large apparent gaps above and below guide lines even though the container itself already filled the modal.

**How to apply:** Keep the overlay viewBox for its coordinate system, but disable aspect-ratio preservation whenever the panorama height is flexible. Otherwise line-coordinate changes cannot remove the letterboxing.

The panorama renderer is ready only after the geographic texture has loaded, not when the GL canvas is created. Initial texture failures retry while the modal remains open.

**Why:** A canvas-level ready callback hid the fallback before SWISSIMAGE arrived, and a transient first-load failure required closing and reopening the panorama because no retry existed.

**How to apply:** Fire readiness from the successful texture-load path and retain the previous/fallback visual until then. Retry transient texture failures without remounting the modal.

For the panorama's low-label map mode, use the complete `swisstlm3d-karte-farbe` WMS layer. Do not use `leichte-basiskarte_reliefschattierung` as a standalone map.

**Why:** Despite its name, the lightweight-base-map WMS layer contains only gray relief shading; it appeared as an untextured gray terrain surface. The swisstlm3d color map is complete and has few labels.

**How to apply:** Keep SWISSIMAGE for satellite mode and switch map mode to the complete swisstlm3d color layer. Validate requested WMS dimensions as an actual JPEG before adopting another layer.