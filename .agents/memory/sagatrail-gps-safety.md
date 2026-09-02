---
name: Live-GPS safety gate
description: Safety rule for position-dependent hiking UI and narration
---

All position-dependent hike behavior must require a fresh accepted GPS fix. This includes route progress, chapter progression, POI proximity, turn/terrain/milestone narration, start guidance, and the map position marker. A stale fix must be treated like no fix.

**Why:** A simulated or stale point can make the app announce a nearby hazard or location, advance a story, or imply navigation confidence while the hiker is elsewhere.

**How to apply:** Keep a freshness window based on the last accepted fix and gate every effect or derived value that uses position. If GPS is unavailable, show the route without a live marker and an explicit paused state; do not advance from elapsed time or route interpolation.