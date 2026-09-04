---
name: SagaTrail Viro/Expo compatibility
description: Version choice and native-build requirements for the cross-platform AR layer.
---

SagaTrail's main Expo 54 / React Native 0.81 baseline uses `@reactvision/react-viro` 2.54.0. The isolated Expo 57 / React Native 0.86 branch uses Viro 2.58.1, whose peer range supports Expo 55–57 and RN 0.83–0.86. Viro AR remains an explicit mode entered after the stable camera opens; the initial AR scene is intentionally limited to Viro text markers, not the custom terrain mesh.

Expo 57 rejects the legacy root `splash` and `notification` config fields during Doctor validation. Keep those settings as `expo-splash-screen` and `expo-notifications` plugin options instead. React Native 0.86's public stylesheet type is `StyleSheet.absoluteFill`, not `absoluteFillObject`.

**Why:** Viro's ARKit/ARCore module is native and cannot run in Expo Go. The current app also has several native integrations, so the Expo 57 upgrade must remain isolated until a real development build is tested. The earlier automatic AR mount caused a process-level camera crash, and native JavaScript error handlers cannot catch that failure.

**How to apply:** Keep the Viro config plugin enabled with New Architecture and validate AR on iOS/Android Development or EAS builds. Treat web and Expo Go as non-native fallbacks only. The user-facing peak camera should start with expo-camera's stable camera-only overlay; do not mount Viro automatically because a native AR initialization failure can terminate the app before JavaScript receives `onError`. This camera-only flow was confirmed stable on the user's device on 2026-09-03. On the SDK 57 branch, use the plugin-based splash/notification config and run Doctor plus both platform exports before attempting native builds.