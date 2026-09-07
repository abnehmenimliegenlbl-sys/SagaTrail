---
name: Start-route choice atomicity
description: Prevents duplicate walking-route requests when the initial start choice and GPS position update arrive in separate React renders.
---

The initial start detour flow must not calculate a default destination while the user’s choice is still null. `offRoutePos` and `startRecalcChoice` are updated from the delayed modal callback and may be observed in separate renders; the recalculation effect must return until the explicit mode (`start` or `fastest`) exists.

**Why:** Without this guard, the first render starts an unintended default route request and the next render starts the selected route request, causing duplicate pre-hike routing calls.

**How to apply:** Keep the null-choice guard in the Valhalla/recalculation effect, and do not infer a fallback mode during the initial start-choice transition.