---
name: Start choice GPS gate
description: Keep SagaTrail's start-point versus fastest-route choice independent from story loading
---

Story content may begin as soon as it is loaded, but that must not mark the physical route start as reached. `startReached` is a GPS fact: it becomes true only after the user is within the configured start radius or after accepting a recalculated route. The start-point/fastest-route choice relies on that distinction.

**Why:** Marking `startReached` during story preparation suppresses the off-route start choice before GPS can evaluate the user's distance to the route.

**How to apply:** Keep story audio release and route-start detection as separate state transitions. Do not set `startReached` from story loading or generic preparation completion.