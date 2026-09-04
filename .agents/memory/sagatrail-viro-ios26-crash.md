---
name: Viro iOS 26 camera crash
description: Native Viro AR startup crashes on iOS 26 can occur before JavaScript receives an error.
---

The confirmed iOS 26.6.1 report is the `AVCapturePhotoOutput.setMaxPhotoDimensions` issue: `ARImageSensor` aborts while `ARSession` starts, inside ViroKit, before JavaScript can catch anything. ReactVision tracks the same failure as #459. SagaTrail must keep Viro enabled; the Expo-54-compatible Viro line remains 2.56.x, while newer releases require newer Expo/RN peers. `videoQuality="Low"` is the compatible mitigation to try because it makes Viro select a smaller ARKit camera format instead of disabling the Viro surface.

**Why:** AR support probes and scene callbacks only help with unsupported devices or recoverable native errors; they do not protect against uncaught Objective-C exceptions during AR session creation or Fabric child mounting.

**How to apply:** Require a physical-device crash report before changing scene content or modal timing further. For camera-session failures, keep Viro enabled and use the supported low-quality session setting before considering an Expo/RN migration. For `insertReactSubview` range failures, prefer a stable scene tree with direct Viro primitives and props available at initial scene creation; verify the exception and Viro version together. Keep the current AR marker layer GPS/compass-driven and fail-open for terrain visibility while the custom Viro terrain mesh is disabled.