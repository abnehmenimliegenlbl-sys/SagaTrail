---
name: Route 28 geometry source
description: Source and limitation of the development geometry imported for Freiburger Saane-Weg.
---

Route 28's public SchweizMobil pages expose the route details but not a directly usable GPX download in the current environment. The development import therefore uses the real Saane-Trails GPX published by Freiburg Tourismus, split near Fribourg, while retaining the official SchweizMobil metadata (39 km total; 17/21 km stages; 480/560 m ascent).

**Why:** Overpass timed out repeatedly for ref 28, and a straight or empty geometry would break route navigation and violate the route-data rules.

**How to apply:** Treat the imported track as a real fallback geometry, not proof of exact official alignment; replace it with an official SchweizMobil/OSM track if an authoritative export becomes available.