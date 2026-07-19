---
name: CopyPodModuleMaps workaround was harmful (superseded)
description: Why the CopyPodModuleMaps run-script phase was removed — it broke Swift module resolution with "umbrella header not found"; the real bug was elsewhere.
---

# CopyPodModuleMaps: entfernt, nicht wieder einbauen

Ein früherer Workaround gegen `module map file '...ArchiveIntermediates/.../Expo.modulemap' not found` fügte per Config-Plugin eine Run-Script-Phase **CopyPodModuleMaps** (vor Compile Sources) ein, die alle `*.modulemap` aus `ArchiveIntermediates/<Pod>/BuildProductsPath/...` nach `BUILT_PRODUCTS_DIR/<Pod>/` kopierte.

**Warum das schädlich war:** Die kopierten modulemaps referenzieren `umbrella header "<Pod>-umbrella.h"` relativ zu ihrem eigenen Verzeichnis — die Header wurden aber NICHT mitkopiert. Swift/Clang findet die kopierte (kaputte) modulemap zuerst → `umbrella header 'ClerkExpo-umbrella.h' not found` / `could not build Objective-C module 'ClerkExpo'` beim Kompilieren von ExpoModulesProvider.swift. Das brach den ersten Build, der die pod-install-Phase überlebte.

**Die ursprüngliche Fehlerkette hatte eine andere Ursache:** eine xcodeproj-UUID-Kollision beim SPM-Bridge-Code (`spm.rb`), die das Pods-Projekt korrumpierte — Details und funktionierender Fix (UUID-Guard) in `clerk-ios-spm-cocoapods.md`. Nach Behebung der echten Ursache war CopyPodModuleMaps nur noch destruktiv.

**Lehre:** Symptom-Workarounds, die Build-Artefakte manipulieren, nach dem Root-Cause-Fix sofort entfernen — "kann ja nicht schaden" gilt bei Xcode-Buildphasen nicht. Nach Plugin-Änderungen immer `rm -rf ios && npx expo prebuild --platform ios --no-install` und per grep verifizieren, dass die Phase wirklich aus `project.pbxproj` verschwunden ist.
