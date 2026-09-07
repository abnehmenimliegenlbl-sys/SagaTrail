---
name: SagaTrail exclusive speech
description: Project-wide rule preventing overlapping narration, POI, terrain, decision, and navigation audio.
---

Only one audible SagaTrail speech source may play at any time. Narration and short navigation clips must use the same cancellation and exclusivity barrier; no feature may introduce an independent audible player. A POI story reserves its queue priority as soon as its asynchronous content load starts, so chapter or saga interrupts cannot clear it before the audio exists.

**Why:** Route transitions such as accepting a feeder can trigger new narration while an existing chapter or navigation clip is still active, causing two speakers to overlap. POI text is loaded asynchronously, so a chapter can otherwise appear to be the current speaker and discard the still-pending POI.

**How to apply:** Invalidate pending synthesis and delayed sequence callbacks, stop and unload every active audible player, and await that barrier before route-state changes or new playback. Timers need cancellation plus a generation check. Register POI narration as pending before its story request and release it only after playback finishes; chapter/saga interrupts must queue while that marker exists. Replaceable route-status cues such as surface and ordinary terrain changes must coalesce to the newest pending state rather than accumulate in FIFO. After every asynchronous setup boundary, reject stale playback before calling play. Silent keepalive audio is exempt.