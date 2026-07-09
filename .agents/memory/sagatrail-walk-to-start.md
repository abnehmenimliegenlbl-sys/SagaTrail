---
name: SagaTrail walk-to-trailhead hint
description: How the pre-hike "you're not on the route yet" distance/direction banner works and why it's straight-line-only, not a real walking route.
---

# Guidance to the trailhead before the official route starts

When a hike starts away from the route's official start point, the app shows
a banner + one-time spoken hint with straight-line distance and 8-point
compass direction (`bearingDeg`/`compassIndex` in `lib/geo.ts`) to
`route.geometry[0]`. It disappears once within ~50m of the start.

**Why:** a real walking route to the trailhead (via FOSSGIS Valhalla, see
`public-routers-no-key.md`) would need a second routing call, its own
geometry, and its own turn-cue set — a half-day+ feature. The straight-line
hint covers "which direction do I even need to go" for a fraction of the
effort and was the explicitly chosen tradeoff over full pedestrian routing.

**How to apply:** if asked to upgrade this to real turn-by-turn navigation to
the trailhead, treat it as a separate feature (new routing call + geometry +
cue detection), not an extension of the existing haversine hint.
