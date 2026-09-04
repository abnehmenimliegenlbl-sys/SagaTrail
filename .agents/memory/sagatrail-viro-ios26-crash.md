---
name: Viro iOS 26 camera crash
description: Native Viro AR startup crashes on iOS 26 can occur before JavaScript receives an error.
---

The confirmed iOS 26.6.1 report is the `AVCapturePhotoOutput.setMaxPhotoDimensions` issue: Apple's private `ARImageSensor` aborts while `ARSession` starts, before JavaScript can catch anything. ReactVision tracks the same failure as #459. SagaTrail must keep Viro enabled; the Expo-54-compatible Viro line remains 2.56.x, while newer releases require newer Expo/RN peers.

**Why:** AR support probes and scene callbacks only help with unsupported devices or recoverable native errors; they do not protect against uncaught Objective-C exceptions during AR session creation or Fabric child mounting.

**How to apply:** Require a physical-device crash report before changing scene content or modal timing further. On iOS 26+, intercept the actual Viro-owned `ARSession` just before run and choose the smallest ≤30 FPS entry from `ARWorldTrackingConfiguration.supportedVideoFormats`; querying a separate `AVCaptureSession` cannot constrain ARKit's private camera session. Keep Viro's low-quality setting as a second layer. Preserve this native hook through Expo prebuilds rather than editing generated iOS files only. For `insertReactSubview` range failures, prefer a stable scene tree with direct Viro primitives and props available at initial scene creation.