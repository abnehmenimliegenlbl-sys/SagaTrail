---
name: Shared GL terrain renderer
description: Rendering boundary for the normal panorama, future full-route 3D view, AR, and fallbacks.
---

Use Expo GL with Three.js as the shared terrain-rendering foundation for the normal panorama and the future animated full-route landscape. Keep Viro restricted to the dedicated AR screen, and retain the SVG terrain as a fallback when the native GL module is unavailable.

**Why:** The non-AR Viro scene navigator is deprecated and entered a repeated warning/render loop on a real iPhone while producing an empty embedded view. Skia is primarily 2D and would require rebuilding perspective, depth, clipping, and texture projection manually.

**How to apply:** Feed both panorama and route-wide views from geographic terrain meshes with real SwissTopo DTM heights and UV coordinates. Change camera and route overlays per view instead of creating separate rendering engines. Never hide the SVG fallback until the GL context reports ready.