---
name: SagaTrail walk-to-trailhead hint
description: How the pre-hike "you're not on the route yet" distance/direction banner works and why it's straight-line-only, not a real walking route.
---

# Guidance to the trailhead before the official route starts

When a hike starts away from the route's official start point, the app shows
a banner + one-time spoken hint with straight-line distance and 8-point
compass direction (`bearingDeg`/`compassIndex` in `lib/geo.ts`) to
`route.geometry[0]`. It disappears once within ~50m of the start.

When the hike is started away from the trailhead, the first off-route
recalculation presents a choice: route to the official start or route to the
nearest point on the hiking route. Both choices use pedestrian routing via
FOSSGIS Valhalla; later off-route recalculations keep the existing lookahead
behavior.

**Why:** hikers may begin at a station or parking area and need either the
official story start or the quickest practical entry onto the route; the
existing straight-line hint alone did not make that choice possible.

**How to apply:** keep the banner and spoken straight-line hint as orientation.
Treat the selected Valhalla geometry as a temporary recalculated route that
must be accepted with “Dieser Route folgen” before it replaces the active
route.
