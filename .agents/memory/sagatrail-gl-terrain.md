---
name: Shared GL terrain renderer
description: Rendering boundary for the normal panorama, future full-route 3D view, AR, and fallbacks.
---

Use Expo GL with Three.js as the shared terrain-rendering foundation for the normal panorama and the future animated full-route landscape. Keep Viro restricted to the dedicated AR screen, and retain the SVG terrain as a fallback when the native GL module is unavailable.

**Why:** The non-AR Viro scene navigator is deprecated and entered a repeated warning/render loop on a real iPhone while producing an empty embedded view. Skia is primarily 2D and would require rebuilding perspective, depth, clipping, and texture projection manually.

**How to apply:** Feed both panorama and route-wide views from geographic terrain meshes with real SwissTopo DTM heights and UV coordinates. Change camera and route overlays per view instead of creating separate rendering engines. Use SVG terrain only when native GL is unavailable, never as a texture-loading placeholder.

For the full-screen route view, use an axis-aligned rectangular SwissTopo terrain area around the complete route, expanded to the device viewport aspect. A bent route corridor is forbidden because it leaves visible background beside the route instead of filling the screen. Missing elevations stay null, and triangles that touch them must be omitted.

**Why:** The observer-centered radial panorama model cannot cover a long route, while the former parallel route corridor remained a narrow textured band. A strict rectangular grid covers the full portrait view and still preserves SwissTopo gaps.

**How to apply:** Sample the rectangle row-by-row with bounded concurrency. Never pass this area through the generic profile interpolation, which can bridge missing samples; retain nulls at interior and coverage-edge gaps. Use route distance separately for animation and grade lookup.

Keep swissALTI3D-derived DTM values as the authoritative ground geometry in the full-route view. Add visual surface detail by multiplying the official multidirectional swissSURFACE3D Raster hillshade over SWISSIMAGE; do not treat vegetation or building tops as hiking elevation.

**Why:** Raw swissSURFACE3D Raster is delivered as large 1 km COG tiles and is impractical across a full mobile route. Its official WMS hillshade adds forest, rock, and built-surface depth without replacing honest ground heights.

**How to apply:** Load SWISSIMAGE as the required base texture and `ch.swisstopo.swisssurface3d-reliefschattierung-multidirektional` as an optional transparent overlay. If the overlay fails, keep the satellite texture visible.

The panorama camera belongs at the radial mesh origin near eye level and must look horizontally outward. Never reuse the elevated overview camera from the full-route scene or aim the panorama camera back at the origin.

**Why:** A camera outside the mesh looking at its center turns the panorama into a miniature terrain map. The physical-iPhone test confirmed the origin-level outward camera restores the intended panorama.

**How to apply:** Keep the mesh centered at zero, rotate it by the compass bearing, and use a forward horizon target. Route-wide overview/follow cameras remain separate.

Use the label-free SwissTopo SWISSIMAGE orthophoto for the panorama texture, not the text-heavy pixel map.

**Why:** Place names and map symbols compete with terrain silhouettes and peak labels. The physical-iPhone comparison confirmed SWISSIMAGE is markedly clearer in the panorama.

**How to apply:** Keep the normal SwissTopo map available for route-oriented views where paths and labels aid navigation; this choice is specific to the panorama.

Never show an untextured colored panorama mesh. While the initial texture or a newly selected map/satellite mode loads, cover the GL surface and show a labeled progress bar.

**Why:** Fast panning and failed texture loads exposed a red material fallback, and the user explicitly rejected showing that mesh. A progress state is clearer than stale or untextured terrain during a deliberate layer switch.

**How to apply:** Render neither the Three mesh nor the legacy SVG terrain faces/lines until a real texture exists. Reset readiness on mode changes, keep the neutral loading cover above GL, and reveal terrain only from the successful texture-load callback.

The panorama SVG overlay must use `preserveAspectRatio="none"` when it fills the tall, flexible native panorama container.

**Why:** The default SVG `meet` behavior preserved the old 360×350 aspect ratio and vertically centered it, creating large apparent gaps above and below guide lines even though the container itself already filled the modal.

**How to apply:** Keep the overlay viewBox for its coordinate system, but disable aspect-ratio preservation whenever the panorama height is flexible. Otherwise line-coordinate changes cannot remove the letterboxing.

The panorama renderer is ready only after the geographic texture has loaded, not when the GL canvas is created. Initial texture failures retry while the modal remains open.

**Why:** A canvas-level ready callback hid the fallback before SWISSIMAGE arrived, and a transient first-load failure required closing and reopening the panorama because no retry existed.

**How to apply:** Fire readiness from the successful texture-load path and retain the progress surface until then. Retry transient texture failures without remounting the modal.

For panorama map mode, use the same OpenTopoMap raster style as the hike screen, assembled server-side from bounded zoom-13 XYZ tiles. Keep SWISSIMAGE for satellite mode.

**Why:** SwissTopo's lightweight layer is only gray relief, and swisstlm3d has large white/gray coverage holes around Basel. OpenTopoMap publishes only XYZ tiles, not a WMS/static export.

**How to apply:** Mosaic and crop OpenTopoMap tiles to the terrain radius through the API. Coalesce identical work and strictly bound concurrency, download size, timeout, PNG dimensions and inflate output.

Use one uniform 2048×2048 WMS texture for both panorama modes rather than 3072×3072.

**Why:** For the same 5 km area, 3072px SWISSIMAGE took about 85 seconds to return while 2048px took about 11 seconds; the map improved from roughly 3.4 to 2 seconds. Reliability outweighs the marginal resolution gain.

**How to apply:** Keep map and satellite dimensions identical. Re-measure both layers before increasing them, and account for native download and texture-upload memory rather than validating only HTTP status.

The normal panorama uses tiled imagery: keep a lower-resolution overview layer, then load higher-resolution tiles from a full-terrain grid around the current camera focal footprint while retaining peak markers and elevation profiles.

**Why:** A central-only detail pool can load successfully yet never cover the visible focal terrain: the outward panorama camera focuses several kilometres ahead. Aligned base tiles plus a small moving detail set improve sharpness without keeping the full grid in GPU memory.

**How to apply:** Define descriptors across the complete terrain UV domain, retain a few observer-adjacent tiles, and choose the rest around the bearing-dependent camera target. Cap resident details, disable mipmaps for memory safety, evict deselected tiles, and leave the overview visible on failures.