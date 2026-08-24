---
name: Voice decision confirmation audio
description: Native voice decisions must serialize recognition shutdown, confirmation playback, and audio-session restoration.
---

The voice decision flow must synchronously claim a chapter choice before starting any confirmation or personality feedback, and native TTS must await the DuckOthers audio-session transition before speaking.

**Why:** A speech result and a fast tap can arrive in the same render window, while iOS may still be in the recognition recording session. Without both guards, prompts or feedback can play twice and other apps can remain ducked.

**How to apply:** Keep the chapter-level chosen-option guard in the shared decision handler, await native audio-mode changes on every device-TTS path before starting Speech.speak, and wait briefly after recognition.stop() before starting any confirmation playback because iOS releases PlayAndRecord asynchronously.