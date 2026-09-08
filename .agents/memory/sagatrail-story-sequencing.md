---
name: SagaTrail story sequencing
description: Saga chapters must play in order independently of GPS position, official start proximity, or off-route state.
---

# Route-distributed saga sequencing

The saga is distributed across the hike. Projected distance along the active route makes the next chapter eligible; accumulated walked distance is the fallback when the user is off-route or the projection is unreliable. Audio completion is still the ordering gate: an eligible chapter waits until the previous chapter and any decision feedback have finished, and GPS may never skip chapters.

**Why:** the user wants the story spread over the route, but a late first GPS fix can otherwise make the app jump directly to a later chapter.

**How to apply:** anchor the chapter progress at the first reliable fix, use monotonic projected route progress with walked-distance fallback, and advance only one chapter at a time after audio completion. Decision chapters pause until the choice feedback is finished or a timeout/default choice resolves.