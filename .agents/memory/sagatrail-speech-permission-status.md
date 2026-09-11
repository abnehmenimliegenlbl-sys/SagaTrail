---
name: Speech permission status
description: expo-speech-recognition permission responses differ from standard Expo permission objects on iOS.
---

Always treat `status == "granted"` as authoritative for `expo-speech-recognition`, while accepting `granted === true` for wrappers that expose it.

**Why:** The iOS permission requester returns `status` and can omit the convenience `granted` boolean. Reading only `granted` makes an already-approved microphone/speech permission look lost after a bundle update and can surface a permission prompt when voice decisions start.

**How to apply:** Use one shared normalization helper in onboarding and every automatic speech-recognition start gate. The decision listener may request permission once at the listening boundary when a confirmed non-granted status is returned; transient read failures must still fall back silently without opening a dialog.