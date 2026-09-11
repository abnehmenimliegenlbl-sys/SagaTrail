---
name: SagaTrail story sequencing
description: Saga chapters must play in order independently of GPS position, official start proximity, or off-route state.
---

# Route-distributed saga sequencing

The saga is distributed across the hike. Projected distance along the active route makes the next chapter eligible; accumulated walked distance is the fallback when the user is off-route or the projection is unreliable. Audio completion is still the ordering gate: an eligible chapter waits until the previous chapter and any decision feedback have finished, and GPS may never skip chapters.

**Why:** the user wants the story spread over the route, but a late first GPS fix can otherwise make the app jump directly to a later chapter.

**How to apply:** anchor the chapter progress at the first reliable fix, use monotonic projected route progress with walked-distance fallback, and advance only one chapter at a time after audio completion. Decision chapters pause until the choice feedback is finished or a timeout/default choice resolves.

Decision-question opening and prompt playback are guarded separately: each chapter may open only once and may speak its prompt only once. Duplicate attempts are blocked and logged remotely with chapter index, trigger/prompt counts, source, and state flags only.

**Why:** a full-hike reproduction is expensive, so a later callback, chapter mutation, or group event must leave enough evidence to distinguish a blocked duplicate from a genuinely repeated question without logging route or user identifiers.

**How to apply:** keep the per-hike trigger/prompt counters alive for the whole hike, reset them only when a new story is loaded, and use the `decision_flow` diagnostics when investigating duplicate decision questions.