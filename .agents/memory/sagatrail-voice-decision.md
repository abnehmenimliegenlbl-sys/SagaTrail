---
name: SagaTrail hands-free voice decisions
description: How live-hike perception decisions are answered by speech instead of a button tap, and why it degrades gracefully.
---

Live-hike decision points can be answered by speaking (no tap required), using
`expo-speech-recognition` (community native module, not expo-speech which is
TTS-only). This joins background-audio/GPS as another native feature that
needs a dev/EAS build and does **not** work in Expo Go or web.

**Why:** the app's whole premise is being handsfree while hiking — a button
tap to answer a decision defeated that, even though narration itself was
already handsfree via TTS.

**How to apply:**
- Recognition auto-starts only once the question+options have finished being
  read aloud (`speaking === false`), so the app's own narration doesn't talk
  over the microphone.
- Matching (`lib/decisionVoiceMatch.ts`) tries spoken ordinal words first
  ("eins/one/un/uno/一" etc., per language) before falling back to keyword
  overlap with the option label/archetypeHint — ties or zero matches return
  `null` and the app keeps listening rather than guessing.
- Availability is feature-detected per session (permission denial or a
  native-module load failure just turns `supported` off); tap buttons remain
  visible and functional at all times as the permanent fallback, so this is
  never a hard requirement to progress the hike.
