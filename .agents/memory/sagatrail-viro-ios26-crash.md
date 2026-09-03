---
name: Viro iOS 26 camera crash
description: Native Viro AR startup crashes on iOS 26 can occur before JavaScript receives an error.
---

The `AVCapturePhotoOutput.setMaxPhotoDimensions` iOS 26 crash is a native Viro/ARKit startup failure, so JavaScript `onError` handlers cannot catch it. ReactVision tracks it as issue #459. The Expo-54-compatible Viro line remains 2.56.x; newer 2.57.x releases require newer Expo/RN peers and are not drop-in upgrades.

**Why:** AR support probes and scene callbacks only help with unsupported devices or recoverable native errors; they do not protect against an uncaught Objective-C exception during AR session creation.

**How to apply:** Require a physical-device crash report before changing scene content or modal timing further. Verify the exception and Viro version together; do not upgrade Expo/RN solely to try a newer Viro binary without a separate compatibility migration.