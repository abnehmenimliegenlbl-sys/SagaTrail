---
name: Native Three texture and props
description: Physical-device constraints for loading Three.js textures and passing positions through React Three Fiber Native.
---

Do not use Three.js `TextureLoader` directly in SagaTrail native GL renderers. Load remote images through Expo Asset, construct a `Texture` with the EXGL `localUri` payload, and force the native data-texture upload path.

**Why:** React Three Fiber Native can patch a different Three.js module instance than the renderer imports. The unpatched loader then reaches for the browser-only `document` global and crashes only on a physical device.

**How to apply:** Reuse the native texture helper for SwissTopo and future remote GL textures. Keep a visible material color while the image loads.

Pass JSX positions as numeric tuples, not mutable `Vector3` objects.

**Why:** React Native can freeze component props; the reconciler may then throw `Cannot assign to read-only property 'position'` when applying a `Vector3`.

**How to apply:** Convert vectors to `[x, y, z]` at the JSX boundary. Mutable vectors remain fine for imperative camera calculations inside frame callbacks.