---
name: SagaTrail background narration/GPS
description: How narration + GPS tracking continue when the app is backgrounded or the phone is locked, and its Expo Go limitation.
---

Background continuation of narration + live GPS during a hike requires two independent pieces:

1. **Audio**: `expo-audio` uses `setAudioModeAsync({ shouldPlayInBackground: true, ... })` for both `expo-speech` (free tier) and premium generated audio. Its config plugin should keep background playback enabled; `expo-asset` is a direct peer dependency.
2. **GPS**: `expo-location`'s foreground `watchPositionAsync` stops when the app is backgrounded. True background tracking needs `expo-task-manager` with a module-level `TaskManager.defineTask` (must be defined at import time, not inside a component, so the OS can relaunch the app headlessly) plus `Location.startLocationUpdatesAsync` with an Android foreground-service notification.

**Why:** iOS/Android suspend JS timers and location callbacks in the background by default; only an OS-registered background task + audio session flag survive backgrounding/lock screen.

**How to apply:** Wire the background location task through a small pub/sub module imported as a side effect in the root layout (`_layout.tsx`) so the task definition registers before any navigation. Keep a foreground `watchPositionAsync` active while the hike screen is visible even when the background task starts; the background task is an additional locked-screen channel, not a replacement. Recover the foreground watcher after a stale period, and still fall back gracefully if `startLocationUpdatesAsync` throws (e.g., unsupported in Expo Go on iOS).

**Caveat:** TaskManager-based background location + foreground service does NOT work in Expo Go — it requires a custom dev client or an EAS production build. Communicate this honestly rather than implying it works out of the box in the Expo Go preview.

For generated clips, keep player lifecycle management explicit: `createAudioPlayer` returns a synchronous `AudioPlayer`, so callers must remove each player on stop/unmount and subscribe to `playbackStatusUpdate` for natural completion. Translate `currentTime` seconds to the legacy millisecond status only at the compatibility boundary.

**Why:** Expo SDK 57 replaces the unmaintained `expo-av` playback API with `expo-audio`; its mode names and player cleanup model are different, while the hike queue still needs deterministic interruption and completion callbacks.

**How to apply:** Use `interruptionMode: "mixWithOthers"` for the silent keepalive and after narration, `"duckOthers"` only while narration or a navigation clip is active, and always retain `shouldPlayInBackground: true`.
