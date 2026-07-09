---
name: SagaTrail hardcoded colors.dark.* bypassing Hell/Dunkel theme
description: Root cause pattern when Hell mode still shows a dark background somewhere in SagaTrail.
---

Several shared components/layouts referenced `colors.dark.*` (or `colors.light.*`) directly
instead of calling `useColors()` / `useThemeModeSafe()`. This makes them ignore the user's
Hell/Dunkel choice entirely, even though `AppContext.themeMode` defaults to "hell" and is wired
correctly elsewhere.

**Why:** these files predate the Hell/Dunkel toggle (written when the app was dark-only), so the
old dark palette got hardcoded rather than reading the active theme.

**How to apply:** if a screen/background still looks dark (or light) in the wrong mode, grep for
`colors.dark.` / `colors.light.` across `artifacts/mobile` — known offenders already fixed:
`components/brand/Background.tsx`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx`,
`app/(auth)/_layout.tsx`. Still-unconverted (decorative SVG components, lower priority unless
flagged): `SwisstopoMap.tsx`/`.web.tsx`, `SparkMountain.tsx`, `RouteMap.tsx`. Fix by swapping the
hardcoded `colors.dark.X` reference for `useColors().X` inside the component/screen.
