---
name: Terrain grade color perception
description: Visual color choices for saturated 3D route-grade rendering
---

In additive-bloom terrain rendering, yellow-green colors can be perceived as yellow even when the segment is classified as green. Flat grade segments need an unambiguous neon green; reserve pure yellow for the next grade band.

**Why:** The previous yellow-green green value visually collapsed into the yellow band on the route glow, making a mostly flat route appear incorrectly classified.

**How to apply:** When changing route-grade colors or bloom layers, validate the perceived hue with the full layered render, not only the hex values or grade-band tests.