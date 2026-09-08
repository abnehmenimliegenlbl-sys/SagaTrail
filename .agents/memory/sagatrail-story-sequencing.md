---
name: SagaTrail story sequencing
description: Saga chapters must play in order independently of GPS position, official start proximity, or off-route state.
---

# GPS-independent saga sequencing

The saga is a complete linear listening experience. GPS may drive maps, navigation, terrain, POI, and route completion, but it must not skip, advance, restart, or stop saga chapters. A late first GPS fix, starting away from the official route point, and going off-route are all valid states in which the current chapter sequence must continue.

**Why:** the user can start walking while the app is still preparing its first reliable GPS fix; using the first fix to derive chapter position caused chapter 2 to appear before chapter 1 had been heard.

**How to apply:** advance the chapter index only after the current narration completes. Decision chapters pause the sequence until the choice feedback is finished or a timeout/default choice resolves. Keep route-progress logic separate from story playback.