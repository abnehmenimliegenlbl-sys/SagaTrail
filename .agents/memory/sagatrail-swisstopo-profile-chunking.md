---
name: SwissTopo profile request size
description: Request-size constraint and geometry-preserving profile handling
---

The SwissTopo profile endpoint receives GeoJSON through a GET query parameter, so the HTTP request line becomes too large at roughly 126 LV95 coordinate pairs. A route with more points must be queried in overlapping chunks and the returned distances rebased to the original route distance.

**Why:** Raising the point cap alone turns normal 500-point routes into HTTP 400/414 failures and leaves the app without a profile.

**How to apply:** Keep each request below the measured safe size, overlap adjacent chunks by one route point, omit the duplicate profile sample at joins, and use original cumulative route distance for map alignment.