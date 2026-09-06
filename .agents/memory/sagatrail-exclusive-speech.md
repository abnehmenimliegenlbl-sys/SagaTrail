---
name: SagaTrail exclusive speech
description: Project-wide rule preventing overlapping narration, POI, terrain, decision, and navigation audio.
---

Only one audible SagaTrail speech source may play at any time. Narration and short navigation clips must use the same cancellation and exclusivity barrier; no feature may introduce an independent audible player.

**Why:** Route transitions such as accepting a feeder can trigger new narration while an existing chapter or navigation clip is still active, causing two speakers to overlap.

**How to apply:** Invalidate pending synthesis, stop and unload every active audible player, and await that barrier before route-state changes or new playback. After every asynchronous setup boundary, reject stale playback before calling play. Silent keepalive audio is exempt.