---
name: Clerk iOS SPM + CocoaPods build crash
description: Native iOS build (EAS/Expo Launch) fails with "undefined method package_product_dependencies for nil:NilClass" in react-native's spm.rb when Clerk is installed.
---

`@clerk/expo`'s iOS podspec pulls in the native Clerk SDK (`ClerkKit`/`ClerkKitUI`) via React Native's `spm_dependency` CocoaPods-SPM bridge (RN >= 0.75). If the Podfile doesn't force dynamic framework linking, `pod install` crashes in `react-native/scripts/cocoapods/spm.rb` (`add_spm_to_target`) with `undefined method 'package_product_dependencies' for nil:NilClass` — the generated Xcode target for the SPM-consuming pod can't be resolved.

**Why:** RN's CocoaPods-SPM integration only reliably resolves targets when the whole iOS project uses `use_frameworks! :linkage => :dynamic`. Without it, static-linking pods (the RN/Expo managed-workflow default) leave the SPM package's target wiring incomplete.

**How to apply:** In an Expo managed-workflow project (no committed `ios/` folder — Podfile is generated at build time), fix it via config plugin, not by hand-editing a Podfile: install `expo-build-properties` (pin to the version matching the installed Expo SDK, e.g. `~1.0.10` for SDK 54 — `pnpm add` alone may resolve an incompatible major/latest version) and add to `app.json` plugins:
```json
["expo-build-properties", { "ios": { "useFrameworks": "dynamic" } }]
```
This emits the required `use_frameworks! :linkage => :dynamic` in the generated Podfile automatically on the next native build. Applies to any other RN/Expo dependency that ships a native SDK via SPM (not CocoaPods-only), not just Clerk.
