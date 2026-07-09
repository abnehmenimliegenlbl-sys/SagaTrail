---
name: Two simultaneous React Native Modals stack unreliably
description: A fullscreen map Modal and a detail Modal open at once overlap/misrender cross-platform (Android/web); close one before opening the other.
---

Two independently-opened RN `Modal` components visible at the same time (e.g. a fullscreen-map `Modal` and a POI-detail `Modal`) do not reliably z-stack across platforms — on Android/web the first-opened Modal can render on top of or behind the second, overlapping its content.

**Fix pattern:** give the "outer" Modal component a change callback (e.g. `onVollbildChange`) so the parent screen can track its open state, then explicitly close it (set state to `false`) in the same handler that opens the second Modal — before setting the state that triggers the second Modal, not after.

**Why:** RN's Modal has no shared stacking/z-index context between independently-mounted instances; the platform layers them by mount/host order, which isn't guaranteed to match visual intent.

**How to apply:** any screen with a fullscreen map/image Modal plus a tap-triggered detail Modal (POIs, markers, list items) needs this coordination — audit all screens reusing the same fullscreen component (e.g. `KarteVollbild`) for the same pattern, not just the one that was reported.
