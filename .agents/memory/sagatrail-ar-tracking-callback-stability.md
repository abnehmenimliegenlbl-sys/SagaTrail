---
name: AR tracking callback stability
description: Native Viro tracking can remain initializing when parent callback identity churn repeatedly restarts the support-check lifecycle.
---

Keep the AR support-check and native navigator callbacks referentially stable across parent GPS/heading renders. Do not let an inline parent `onClose` or error callback become a dependency of the support-check effect.

**Why:** On iOS, the support probe can report AR support as true while no native tracking callback has arrived yet. Repeated effect cancellation and navigator ref churn then leave the UI in `initializing` and make the camera overlay appear to work while AR anchors are not trustworthy.

**How to apply:** Store parent dismissal callbacks in refs, log the native tracking callback separately from the JS state mapper, and render no AR geometry until a native callback has produced `TRACKING_NORMAL`.