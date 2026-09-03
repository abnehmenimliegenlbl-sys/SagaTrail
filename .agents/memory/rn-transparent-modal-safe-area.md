---
name: Transparent modal safe area
description: Safe-area behavior for SagaTrail's transparent React Native modals on iOS.
---

Transparent React Native `Modal` containers do not reliably apply the native `SafeAreaView` inset on every iOS version.

**Why:** The modal header can render underneath the status bar even when it is wrapped in `SafeAreaView`, making the title and controls visibly overlap system chrome.

**How to apply:** For transparent feature modals, use the already available safe-area inset values as explicit top and bottom margins on the modal card. Keep the modal content itself otherwise unchanged.