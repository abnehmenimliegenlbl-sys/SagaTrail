---
name: AR route visibility across phone tilt
description: Ground-only route overlays disappear from an upright camera view; keep a restrained forward direction cue in addition to the anchored route.
---

The AR route should be one clearly visible ground-anchored line covering the next 50 metres of the connected route; it should not be replaced by a billboard arrow.

**Why:** The user needs the actual path geometry, and the camera angle should only control whether a ground point is inside the camera view, not change the route into a different visual object.

**How to apply:** Render a connected 50-metre path-length prefix with a clearly visible ground projection and verify both upright and downward phone angles on a physical device.