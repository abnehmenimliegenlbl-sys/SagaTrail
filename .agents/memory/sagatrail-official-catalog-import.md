---
name: Official Wanderland catalog imports
description: Safety rules for importing missing official SchweizMobil parent routes and stages.
---

Official multipart route geometry must be ordered by its shared endpoints before conversion and resampling. Never flatten parts in storage order, and reject any result that still contains a large unexplained gap. Confirmed lake-route crossings are an explicit exception and may retain their official straight water segment.

**Why:** The official GeoPackage can store connected route parts out of traversal order. Simple flattening created false multi-kilometre lines. However, Trans Swiss Trail stage 2/7 Neuchâtel–Murten intentionally contains a straight lake section, confirmed by the user, so not every large official segment is a data defect.

**How to apply:** Build an endpoint graph from the official LV95 parts, traverse connected parts, convert to WGS84, then validate every segment. Permit a large gap only when the route is confirmed to cross water; keep calculated and official distance separate. For an official cross-border stage whose first point is outside Switzerland, keep its full geometry but assign the catalog canton from the first point inside Switzerland or Liechtenstein.