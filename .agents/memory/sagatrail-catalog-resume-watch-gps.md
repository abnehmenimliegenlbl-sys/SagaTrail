---
name: Catalog resume and Watch GPS
description: Resume launches from the canton/route catalog and the first fresh GPS state sent to the Watch
---

Only the explicit Home "Weiter wandern" entry may carry `resume=1`; catalog starts must stay fresh even when the selected saga and route match a persisted active hike. The first unavailable/stale-to-fresh GPS transition must bypass the live-state publish throttle.

**Why:** A persisted active hike can contain an earlier accepted walking detour that starts at the user's old location. Treating a new catalog selection as a resume silently restores that geometry and skips the GPS-based start choice; a quick explicit resume can also leave the Watch waiting for a fresh GPS snapshot behind the global publish throttle.

**How to apply:** Keep the Home resume card's explicit `resume=1`; do not infer it from `activeHike` in saga or route catalog entry points. When changing Watch snapshot throttling, preserve an explicit force path for the first fresh GPS transition.