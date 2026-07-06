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
This emits the required `use_frameworks! :linkage => :dynamic` in the generated Podfile.

**This alone is NOT sufficient for `@clerk/expo` specifically.** `ClerkExpo.podspec` also sets `s.static_framework = true` on itself, which overrides/conflicts with the project-wide dynamic linkage for that one pod and causes CocoaPods/RN's SPM bridge to lose track of the `ClerkExpo` pod's own Xcode target (it never appears in the `pod install` target list at all) — same crash, same `spm.rb:80` site, even with dynamic linkage already active project-wide. Confirmed root cause via a full `pod install` log: "Adding SPM dependency on product" fires right before the nil crash, and grepping the entire log shows no `ClerkExpo` line in the installed-pods list.

Fix: patch out `s.static_framework = true` from `@clerk/expo`'s `ios/ClerkExpo.podspec` so it inherits the project's dynamic linkage like every other pod. Since this lives in `node_modules` (not the repo), use pnpm's native patch feature — `pnpm patch @clerk/expo@<version>`, edit the podspec in the temp checkout, `pnpm patch-commit <path>` — which records the patch under `patches/` and `patchedDependencies` in `pnpm-workspace.yaml` so it reapplies on every `pnpm install`, including in Expo Launch's remote build. Do not guard-clause `spm.rb` itself (`return unless target`) as an alternative — that just silently skips linking `ClerkKit`/`ClerkKitUI`, likely trading the install crash for a later missing-symbol crash.
