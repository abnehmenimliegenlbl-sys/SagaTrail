---
name: Viro initial scene data
description: How live app state reaches an already-mounted Viro AR scene.
---

`ViroARSceneNavigator` captures `initialScene` only in its constructor. Replacing the `initialScene` object later does not update the mounted scene. Keep the scene component stable and read changing peaks, callbacks, and other live values from `sceneNavigator.viroAppProps`.

**Why:** Gipfel loaded after AR startup remained invisible even though React recomputed a new `initialScene`; the navigator ignored it after mounting.

**How to apply:** Pass current data through the navigator's `viroAppProps`. Do not key or remount the navigator for compass/peak updates, because that tears down the native camera session.