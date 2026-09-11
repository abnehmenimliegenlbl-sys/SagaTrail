---
name: Speech permission status
description: expo-speech-recognition permission responses differ from standard Expo permission objects on iOS.
---

Always treat `status == "granted"` as authoritative for `expo-speech-recognition`, while accepting `granted === true` for wrappers that expose it.

**Why:** The iOS permission requester returns `status` and can omit the convenience `granted` boolean. Reading only `granted` makes an already-approved microphone/speech permission look lost after a bundle update and can surface a permission prompt when voice decisions start.

**How to apply:** Use one shared normalization helper in onboarding and every automatic speech-recognition start gate. Only the explicit onboarding action may request permission; the decision listener must only read and fall back to buttons when access is not confirmed.