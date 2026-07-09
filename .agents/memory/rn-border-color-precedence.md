---
name: React Native per-side border color beats shorthand borderColor
description: Why a themed borderColor on a card can silently render as black/white even though the color value is correct — relevant whenever a shared "glass/3D" style mixin sets border edges.
---

In React Native, per-side border properties (`borderTopColor`, `borderLeftColor`, `borderRightColor`, `borderBottomColor`) always win over the generic `borderColor`, regardless of which one appears later in a style array (arrays merge key-by-key, not shorthand-vs-longhand like CSS cascade).

**Why this matters:** a shared depth/glass mixin (e.g. `GLAS_3D`) that sets hardcoded per-side bevel colors (light edge top/left, dark edge bottom/right, for a 3D look) will permanently mask any `borderColor` a caller sets afterward for theming — the mixin's hardcoded colors always show instead. This can make an entire app's cards appear to have a stray black/gray border even after the theme's accent color is "correctly" set at every call site, because the actual rendered edge color comes from the mixin, not the call site.

**How to apply:** if a shared style mixin needs to coexist with per-instance themed borders, either (a) don't hardcode per-side border colors in the mixin — keep it to shadow/elevation only and let each call site fully own `borderColor`, or (b) have every call site also override all four per-side properties explicitly. Option (a) is simpler and scales better across many call sites.
