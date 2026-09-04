---
name: Viro initial scene data
description: How live app state reaches an already-mounted Viro AR scene.
---

`ViroARSceneNavigator` captures `initialScene` only in its constructor. Replacing the `initialScene` object later does not update the mounted scene. Keep the scene component stable and read changing callbacks and non-structural values from `sceneNavigator.viroAppProps`.

Do not feed a compass-sorted peak subset into the Viro scene while the phone is moving. Snapshot all nearby candidates when AR starts and place them by absolute bearing in a `GravityAndHeading` world. Keep all native nodes mounted; choose the four nearest in the current ±70° view by toggling node visibility only.

**Why:** Gipfel loaded after AR startup remained invisible when React recomputed `initialScene`. Later, continuously replacing the compass-sorted top-four markers while panning caused an iOS `NSInvalidArgumentException` in `VRTView/VRTNode/VRTScene removeReactSubview:`.

**How to apply:** Pass the candidate snapshot through `viroAppProps` and keep its identity/membership stable for the active AR session. Heading updates may change `visible`, but must not key/remount the navigator or add/remove markers.