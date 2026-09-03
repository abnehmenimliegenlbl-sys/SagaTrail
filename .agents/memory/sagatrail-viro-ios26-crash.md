---
name: Viro iOS 26 camera crash
description: Native Viro AR startup crashes on iOS 26 can occur before JavaScript receives an error.
---

The first real SagaTrail report (iPhone 16 Plus, iOS 26.6.1) was not the `AVCapturePhotoOutput` issue: it was an uncaught `NSRangeException` from `VRTView insertReactSubview:atIndex:` while Fabric mounted the Viro scene. The native Viro/React child tree can therefore abort before JavaScript `onError` runs. ReactVision separately tracks the `AVCapturePhotoOutput.setMaxPhotoDimensions` issue as #459. The Expo-54-compatible Viro line remains 2.56.x; newer 2.57.x releases require newer Expo/RN peers and are not drop-in upgrades.

**Why:** AR support probes and scene callbacks only help with unsupported devices or recoverable native errors; they do not protect against uncaught Objective-C exceptions during AR session creation or Fabric child mounting.

**How to apply:** Require a physical-device crash report before changing scene content or modal timing further. For `insertReactSubview` range failures, prefer a stable scene tree with direct Viro primitives and props available at initial scene creation; verify the exception and Viro version together. Keep the current AR marker layer GPS/compass-driven and fail-open for terrain visibility while the custom Viro terrain mesh is disabled. Do not upgrade Expo/RN solely to try a newer Viro binary without a separate compatibility migration.