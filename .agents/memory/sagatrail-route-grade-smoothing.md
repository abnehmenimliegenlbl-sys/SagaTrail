---
name: Route grade smoothing
description: Stable map slope coloring from swisstopo elevation profiles
---

Route color bands must be calculated over smoothed windows of roughly 50 m, not from every adjacent geometry/profile point. The absolute grade is used so steep descents are visible too.

**Why:** Short or uneven geometry segments amplify small DTM/profile fluctuations and can make a route look falsely red even when the contour map does not support that reading.

**How to apply:** Keep the map-color calculation aligned with the terrain-analysis window in the mobile app and the duplicated WordPress route-map implementation. The WordPress map also depends on the published `/api/elevation-profile` endpoint; if SwissTopo returns sparse or string-typed values, retain valid samples instead of failing the whole profile.

Profile distances are authoritative cumulative distances along the geometry submitted to the elevation endpoint; never rescale them to the active geometry's total length. Offline profiles from the catalog route must not overwrite a newly fetched profile for an accepted navigation detour.

**Why:** Rescaling or applying a stale catalog profile transfers steep sections onto unrelated detour coordinates, which can colour a geographically flat feeder red.

**How to apply:** Fetch the profile again whenever `navigationGeometry` changes, use the returned distances directly for grade windows, and only hydrate an offline profile when no accepted detour is active.