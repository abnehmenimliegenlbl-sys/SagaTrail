---
name: SagaTrail background narration/GPS
description: How narration + GPS tracking continue when the app is backgrounded or the phone is locked, and its Expo Go limitation.
---

Background continuation of narration + live GPS during a hike requires two independent pieces:

1. **Audio**: `Audio.setAudioModeAsync({ staysActiveInBackground: true, ... })` for both `expo-speech` (free tier) and `expo-av` (premium ElevenLabs audio) playback modes.
2. **GPS**: `expo-location`'s foreground `watchPositionAsync` stops when the app is backgrounded. True background tracking needs `expo-task-manager` with a module-level `TaskManager.defineTask` (must be defined at import time, not inside a component, so the OS can relaunch the app headlessly) plus `Location.startLocationUpdatesAsync` with an Android foreground-service notification.

**Why:** iOS/Android suspend JS timers and location callbacks in the background by default; only an OS-registered background task + audio session flag survive backgrounding/lock screen.

**How to apply:** Wire the background location task through a small pub/sub module imported as a side effect in the root layout (`_layout.tsx`) so the task definition registers before any navigation. Feature-detect and gracefully fall back to foreground `watchPositionAsync` if `startLocationUpdatesAsync` throws (e.g., unsupported in Expo Go on iOS) — do not hard-require it.

**Caveat:** TaskManager-based background location + foreground service does NOT work in Expo Go — it requires a custom dev client or an EAS production build. Communicate this honestly rather than implying it works out of the box in the Expo Go preview.
