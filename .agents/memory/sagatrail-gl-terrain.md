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