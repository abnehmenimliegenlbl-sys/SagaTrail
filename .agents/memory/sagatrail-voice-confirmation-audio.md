---
name: Voice decision confirmation audio
description: Native voice decisions must serialize recognition shutdown, confirmation playback, and audio-session restoration.
---

The voice decision flow must synchronously claim a chapter choice before starting any confirmation or personality feedback, and native TTS must await the DuckOthers audio-session transition before speaking. Chapter progression stays locked until acknowledgement and personality feedback have both finished; the answered chapter index must also be fenced against stale prompt and microphone callbacks.

**Why:** A speech result and a fast tap can arrive in the same render window, while iOS may still be in the recognition recording session. If awaiting-decision is cleared before delayed feedback finishes, GPS can advance to another decision, reopen listening, and ask a new question before the prior answer is confirmed.

**How to apply:** Read the chosen-option guard from the synchronously updated decision ref, not delayed React state. Mark the current chapter index as resolved before awaiting any cleanup, clear stale queued prompts, and make both the prompt effect and voice hook reject that index. Hold a separate synchronous feedback-pending gate across recognition shutdown, acknowledgement, and full feedback; progression and stronger non-navigation interrupts must wait. Release the gate on successful or failed playback completion. Await native audio-mode changes on every device-TTS path, and wait briefly after recognition.stop() because iOS releases PlayAndRecord asynchronously.