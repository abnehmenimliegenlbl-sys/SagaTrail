---
name: Start-route choice atomicity
description: Prevents duplicate walking-route requests when the initial start choice and GPS position update arrive in separate React renders.
---

The initial start detour flow must not calculate a default destination while the user’s choice is still null. `offRoutePos` and `startRecalcChoice` are updated from the delayed modal callback and may be observed in separate renders; the recalculation effect must return until the explicit mode (`start` or `fastest`) exists.

**Why:** Without this guard, the first render starts an unintended default route request and the next render starts the selected route request, causing duplicate pre-hike routing calls.

**How to apply:** Keep the null-choice guard in the Valhalla/recalculation effect, and do not infer a fallback mode during the initial start-choice transition.

The start-choice pending flag must remain true after the user selects "start" or
"fastest" and until `followRecalculatedRoute()` accepts the returned geometry.
The automatic-accept effect uses that flag as its trigger; clearing it in the
dialog callback leaves the old route active and lets the hike begin in the
middle of the original story route.

**Why:** The choice callback and the async routing response arrive in different
renders. The pending state is the hand-off between them, not merely a modal
visibility flag.

**How to apply:** Only clear both the state and ref in the accepted-route path
or when the user explicitly cancels the start detour.