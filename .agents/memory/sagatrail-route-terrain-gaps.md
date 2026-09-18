---
name: Route terrain data gaps
description: Integrity rule for missing SwissTopo DTM cells in full-route 3D terrain.
---

Missing SwissTopo DTM cells must remain holes in the rendered terrain. Do not copy, interpolate, or infer heights from neighbouring cells, and only emit a mesh triangle when all three of its source heights are real.

**Why:** Filling null cells creates plausible-looking but invented terrain and can visually bridge genuine coverage gaps, which violates the product's requirement to distinguish unavailable data from measured landscape.

**How to apply:** Preserve null elevations from API parsing through mesh construction. Any future renderer, level-of-detail system, or offline terrain cache must use validity masks and omit incomplete triangles.