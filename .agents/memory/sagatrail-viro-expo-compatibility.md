---
name: SagaTrail Viro/Expo compatibility
description: Version choice and native-build requirements for the cross-platform AR layer.
---

SagaTrail's Expo 54 / React Native 0.81 stack should use `@reactvision/react-viro` 2.54.0. Later Viro releases can raise the Expo/RN peer floor to Expo 55 / RN 0.83, so do not upgrade the AR package independently.

**Why:** Viro's ARKit/ARCore module is native and cannot run in Expo Go. The current app also has several native integrations, so an Expo SDK upgrade would widen the build risk without being required for the first AR implementation.

**How to apply:** Keep the Viro config plugin enabled with New Architecture and validate AR on iOS/Android Development or EAS builds. Treat web and Expo Go as non-native fallbacks only.