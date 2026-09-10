---
name: Catalog resume and Watch GPS
description: Resume launches from the canton/route catalog and the first fresh GPS state sent to the Watch
---

Catalog resume launches must carry `resume=1` when the selected saga and route match the persisted active hike; the first unavailable/stale-to-fresh GPS transition must bypass the live-state publish throttle.

**Why:** The Home resume card already carried the resume marker, but the catalog path did not. A new hike instance could therefore lose the saved story context, and a quick resume could leave the Watch waiting for a fresh GPS snapshot behind the global publish throttle.

**How to apply:** Keep Home and catalog entry points equivalent. When changing Watch snapshot throttling, preserve an explicit force path for the first fresh GPS transition.