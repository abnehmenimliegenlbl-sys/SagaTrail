---
name: Official Wanderland catalog imports
description: Safety rules for importing missing official SchweizMobil parent routes and stages.
---

Official multipart route geometry must be ordered by its shared endpoints before conversion and resampling. Never flatten parts in storage order, and reject any result that still contains a large unexplained gap.

**Why:** The official GeoPackage can store connected route parts out of traversal order. Simple flattening created false multi-kilometre lines. A genuinely disconnected stage must remain pending rather than receive an invented connector.

**How to apply:** Build an endpoint graph from the official LV95 parts, traverse connected parts, convert to WGS84, then validate every segment. For an official cross-border stage whose first point is outside Switzerland, keep its full geometry but assign the catalog canton from the first point inside Switzerland or Liechtenstein.