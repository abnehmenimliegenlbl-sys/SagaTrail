---
name: POI tile closing
description: Confirmed behavior for automatically opened POI proximity tiles.
---

An automatically opened POI tile is tied to the approach phase, not to a fixed maximum distance. It should close once the user is clearly moving away: three consecutive readings with at least 5 m increase in distance.

**Why:** A single GPS fluctuation must not close the tile, while continuing past the POI should close it promptly rather than waiting for a 500 m boundary.

**How to apply:** Track the previous distance per active nearby POI, reset the consecutive-increase counter on a decrease or changes within 5 m, and keep manually selected POI panels separate.