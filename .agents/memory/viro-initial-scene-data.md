---
name: Viro initial scene data
description: How live app state reaches an already-mounted Viro AR scene.
---

`ViroARSceneNavigator` captures `initialScene` only in its constructor. Replacing the `initialScene` object later does not update the mounted scene. Keep the scene component stable and read changing callbacks and non-structural values from `sceneNavigator.viroAppProps`.

Do not feed a compass-sorted peak subset into the Viro scene while the phone is moving. Snapshot the 40 nearest candidates across the full 360° when AR starts and place them by absolute bearing in a `GravityAndHeading` world. Keep all native nodes mounted and let Viro's camera frustum decide which are visible.

**Why:** Gipfel loaded after AR startup remained invisible when React recomputed `initialScene`. Later, continuously replacing the compass-sorted top-four markers while panning caused an iOS `NSInvalidArgumentException` in `VRTView/VRTNode/VRTScene removeReactSubview:`.

**How to apply:** Pass the candidate snapshot through `viroAppProps` and keep its identity/membership stable for the active AR session. Do not use JS heading changes to add, remove, or hide markers; do not key/remount the navigator.

When live AR data can change after startup, keep fixed native slot counts for both peak markers and route segments. Update slot position, text, material, and opacity in place instead of mapping a changing array of Viro children.

**Why:** New peak or terrain data arriving during an active session can make React remove native Viro subviews; on iOS this has caused the camera surface to turn black or the session to fail.

**How to apply:** Render a fixed 40-marker pool and a bounded route-segment pool with stable slot keys. New data may replace slot contents, but the Viro navigator and its native child structure must not remount.

Fast device motion can legitimately put Viro into limited/unavailable tracking; recover with the navigator's native `resetARSession(true, false)` after a sustained loss rather than remounting the React camera surface.

**Why:** A rapid phone movement can leave the AR camera black even when React has not changed the scene tree; remounting the navigator risks the separate native remove-subview failure.

**How to apply:** Observe `onTrackingUpdated`; tolerate brief excessive-motion states, then reset the AR tracking session once after a short sustained timeout with a cooldown. Keep anchors and the mounted navigator intact.