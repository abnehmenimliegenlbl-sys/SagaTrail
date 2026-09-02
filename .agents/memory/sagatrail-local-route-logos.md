---
name: Local regional route logos
description: Runtime behavior and source availability for regional and local SchweizMobil route SVGs in Expo
---
Regional and local SchweizMobil SVGs must be bundled into the mobile app instead of loaded with `SvgUri` at runtime. The official image host can return HTTP 403 to Expo/native requests even when the same URLs work with a server-side download. Only route/canton combinations for which the official host returns a real SVG should be bundled; missing official files must render no logo and never use a custom fallback design. The WordPress resolver must return 404 for an unknown or unavailable canton instead of selecting another canton’s asset.

**Why:** Native Expo sessions produced repeated fetch errors for direct `images.schweizmobil.ch` SVG requests, and many numbered combinations have no corresponding official file at either the `_075.svg` or unsuffixed URL.

**How to apply:** When new routes are added, download verified official SVGs or JPGs during development, add them to the local asset map, and keep the runtime component free of external logo URLs. The public SharePoint Routenfelder download is the authoritative source for JPG-only routes; files may use `WL_086_SG.jpg` rather than the older `WL_SG_86.svg` naming pattern. For WordPress, resolve regional JPGs by route number plus the selected canton; never fall back to another canton’s logo.