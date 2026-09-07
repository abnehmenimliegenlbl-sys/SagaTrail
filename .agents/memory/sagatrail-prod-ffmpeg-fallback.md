---
name: Production narration ffmpeg fallback
description: The published API image does not provide ffmpeg, so sentence-pacing synthesis falls back to a single TTS file while narration requests still succeed.
---

The production API currently has no `ffmpeg` executable. Multi-sentence OpenAI narration therefore logs a pacing warning and returns the unpaced single TTS result through the existing fallback; this is not itself an audio-request failure.

**Why:** Production logs showed `spawn ffmpeg ENOENT`, but the same requests completed with HTTP 200 and cached audio bytes. Treating this warning as the reason for playback stopping would misdiagnose the client-side playback-completion problem.

**How to apply:** Keep the fallback behavior when diagnosing narration incidents. Only address ffmpeg separately if sentence-level pauses are required in production.