---
name: Lazy panorama peak loading
description: Decision for separating panorama peak discovery from normal POI loading and offline downloads.
---

The panorama must load named OSM `natural=peak` data through its own API path, only after the panorama tile is opened and only around a fresh live GPS position. Normal route POI loading must not use the panorama's large radius or include the peak discovery query.

**Why:** A route-wide 20 km bounding box makes the combined historic/tourist/alpine Overpass query too expensive and can time out before any peaks reach the app. The same separation lets offline downloads prefetch peak data without inflating the regular POI cache.

**How to apply:** Keep the live request centered on the current GPS position with a 20 km radius; keep the offline request on the dedicated peak endpoint using the route coverage area. Do not reintroduce peaks into the general POI request just to simplify the client.