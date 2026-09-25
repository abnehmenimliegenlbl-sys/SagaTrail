---
name: EAS native project tracking
description: Why checked-in native files are required when an Expo app contains ios/android directories.
---

When an Expo app contains native `ios` or `android` directories, EAS uses those checked-out projects rather than reconstructing every native file from app.json. The repository must therefore include the Android manifest/resources and the iOS project’s shared build scheme, along with any intentional native configuration.

**Why:** Selective ignore rules previously left the local native files present but absent from the GitHub build checkout. EAS then failed before compilation: Android could not read a manifest, and iOS found no shared scheme.

Expo prebuild can also clear checked-in native files even when `--clean` is omitted. In this project, Android prebuild removed an unregistered custom Kotlin module while regenerating config-plugin resources.

**Why:** A seemingly targeted splash-resource refresh can otherwise remove native functionality unrelated to Expo's config plugins.

**How to apply:** Prefer targeted resource generation when only generated assets need refreshing. If prebuild is necessary, inspect the full Git diff and restore or re-add intentional native files before keeping the result. Before a Production EAS build, also check that `git ls-files` includes the native manifest and shared Xcode scheme, while excluding only caches, build products, and local credentials.