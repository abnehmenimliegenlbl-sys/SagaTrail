---
name: Garmin simulator SVG rendering
description: Connect IQ launcher SVG resources are not reliable inputs for runtime drawBitmap calls.
---

Garmin UI branding must be rendered with native drawing primitives rather than passing an SVG launcher resource to `drawBitmap()`.

**Why:** The Connect IQ simulator can abort the app with `API code 0x300023b1` during the first header redraw when an SVG resource is used as a bitmap, even though the same SVG is valid as the launcher icon.

**How to apply:** Keep SVG resources for the launcher icon, but draw any in-app mark with lines, circles, rectangles, or other supported `Graphics.Dc` primitives.