---
name: EAS native project tracking
description: Why checked-in native files are required when an Expo app contains ios/android directories.
---

When an Expo app contains native `ios` or `android` directories, EAS uses those checked-out projects rather than reconstructing every native file from app.json. The repository must therefore include the Android manifest/resources and the iOS project’s shared build scheme, along with any intentional native configuration.

**Why:** Selective ignore rules previously left the local native files present but absent from the GitHub build checkout. EAS then failed before compilation: Android could not read a manifest, and iOS found no shared scheme.

**How to apply:** Before a Production EAS build, check that `git ls-files` includes the native manifest and shared Xcode scheme, while excluding only caches, build products, and local credentials.