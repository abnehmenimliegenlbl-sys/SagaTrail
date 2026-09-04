---
name: Viro initial scene data
description: How live app state reaches an already-mounted Viro AR scene.
---

`ViroARSceneNavigator` captures `initialScene` only in its constructor. Replacing the `initialScene` object later does not update the mounted scene. Keep the scene component stable and read changing callbacks and non-structural values from `sceneNavigator.viroAppProps`.

Do not feed a compass-sorted peak subset into the Viro scene while the phone is moving. Snapshot the selected peaks when AR starts and place them by absolute bearing in a `GravityAndHeading` world. Viro/ARKit then rotates the camera through a stable scene graph.

**Why:** Gipfel loaded after AR startup remained invisible when React recomputed `initialScene`. Later, continuously replacing the compass-sorted top-four markers while panning caused an iOS `NSInvalidArgumentException` in `VRTView/VRTNode/VRTScene removeReactSubview:`.

**How to apply:** Pass the initial marker snapshot through `viroAppProps`, but keep its identity and membership stable for the active AR session. Do not key/remount the navigator or add/remove markers on heading updates.