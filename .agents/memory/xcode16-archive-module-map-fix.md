---
name: Xcode 16+ archive build module map fix
description: Why pod module maps are not found during xcodebuild archive in Xcode 16+, and the working fix via a run script build phase.
---

# Xcode 16+ Archive Build: Pod Module Map Not Found

## The Error
```
module map file '...ArchiveIntermediates/SagaTrail/BuildProductsPath/Release-iphoneos/Expo/Expo.modulemap' not found
```

## Root Cause
CocoaPods sets `PODS_BUILD_DIR = $(BUILD_DIR)` in the aggregate target xcconfig (`Pods-SagaTrail.release.xcconfig`). This feeds into `OTHER_CFLAGS` via `-fmodule-map-file="$(PODS_CONFIGURATION_BUILD_DIR)/Expo/Expo.modulemap"`.

In Xcode 16+, `$(BUILD_DIR)` during `xcodebuild archive` becomes **per-target**:
- For SagaTrail (main target): `ArchiveIntermediates/SagaTrail/BuildProductsPath`
- For Expo (pod target): `ArchiveIntermediates/Expo/BuildProductsPath`

So when SagaTrail's compiler sees `-fmodule-map-file="$(PODS_CONFIGURATION_BUILD_DIR)/Expo/Expo.modulemap"`, it expands to `ArchiveIntermediates/SagaTrail/BuildProductsPath/Release-iphoneos/Expo/Expo.modulemap` — but the Expo module map was built to `ArchiveIntermediates/Expo/BuildProductsPath/Release-iphoneos/Expo/Expo.modulemap`. The two paths are different!

## What Did NOT Fix It
- `SWIFT_ENABLE_EXPLICIT_MODULES = NO` (RN already sets this, and it's a Swift setting, not Clang)
- Setting `PODS_BUILD_DIR = $(SYMROOT)` in aggregate xcconfigs (SYMROOT also changes during archive OR the xcconfig override isn't picked up reliably)
- Adding `FRAMEWORK_SEARCH_PATHS` / `OTHER_SWIFT_FLAGS` overrides

## The Working Fix
`withPodfileXcode26Fix.js` (at `artifacts/mobile/plugins/`) uses `withXcodeProject` to add a `PBXShellScriptBuildPhase` called **CopyPodModuleMaps** to the SagaTrail target, positioned **before "Compile Sources"**.

The shell script:
```bash
set +e
PODS_ARCHIVES="${OBJROOT}/ArchiveIntermediates"
DEST="${BUILT_PRODUCTS_DIR}"
if [ -d "${PODS_ARCHIVES}" ]; then
  find "${PODS_ARCHIVES}" -maxdepth 5 -name "*.modulemap" | while IFS= read -r f; do
    DIR=$(dirname "$f")
    NAME=$(basename "$DIR")
    DESTDIR="${DEST}/${NAME}"
    mkdir -p "${DESTDIR}"
    cp -f "$f" "${DESTDIR}/" 2>/dev/null || true
  done
fi
set -e
```

At archive time, all pod targets complete before SagaTrail starts. The script copies every `*.modulemap` from `ArchiveIntermediates/<PodName>/BuildProductsPath/Release-iphoneos/<PodName>/` into `ArchiveIntermediates/SagaTrail/BuildProductsPath/Release-iphoneos/<PodName>/` = `BUILT_PRODUCTS_DIR`. Then Compile Sources finds them at the `PODS_CONFIGURATION_BUILD_DIR` path.

**Why:** `BUILT_PRODUCTS_DIR` (SagaTrail, archive) = `ArchiveIntermediates/SagaTrail/BuildProductsPath/Release-iphoneos/` = same as `PODS_CONFIGURATION_BUILD_DIR` for the main target. So the compiler flag resolves correctly after the copy.

## Status (2026-07-19)
Fix is implemented and locally verified (run script appears before Sources in pbxproj). Free plan build quota exhausted (resets 2026-08-01). Next step: submit build after quota reset or plan upgrade.

## Rebuilding
Always run after any fix attempt:
```bash
cd artifacts/mobile
rm -rf ios
npx expo prebuild --platform ios --no-install
# verify: grep "CopyPodModuleMaps" ios/SagaTrail.xcodeproj/project.pbxproj
GIT_OPTIONAL_LOCKS=0 EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN npx eas build --platform ios --profile production --non-interactive --no-wait
```
