---
name: Xcode MARKETING_VERSION sync
description: EAS Build ignoriert app.json version wenn ein natives ios/ Verzeichnis vorhanden ist; die Version muss direkt im Xcode-Projekt gesetzt werden.
---

## Regel

Wenn ein natives `ios/` Verzeichnis existiert, liest EAS Build die App-Version **ausschliesslich** aus `ios/SagaTrail.xcodeproj/project.pbxproj` (`MARKETING_VERSION`) UND aus `ios/SagaTrail/Info.plist` (`CFBundleShortVersionString`).

**Why:** EAS loggt explizit: "Specified value for 'ios.bundleIdentifier' in app.json is ignored because an ios directory was detected." Das gilt auch für die Version. Zusätzlich kann `Info.plist` einen hardcodierten `CFBundleShortVersionString`-Wert enthalten, der `MARKETING_VERSION` aus dem pbxproj überschreibt — und dann zeigt EAS/ASC immer den alten Wert (z. B. 1.0.0), egal was im pbxproj steht.

**Fix (einmalig durchgeführt):** `ios/SagaTrail/Info.plist` → `CFBundleShortVersionString` auf `$(MARKETING_VERSION)` gesetzt (Xcode-Variable). Damit liest Xcode die Version ausschliesslich aus dem pbxproj.

**How to apply:** Bei jedem Versions-Bump nur noch zwei Stellen anpassen:
1. `app.json` → `"version": "x.y.z"`
2. `ios/SagaTrail.xcodeproj/project.pbxproj` → `MARKETING_VERSION = x.y.z;` (kommt zweimal vor: Debug + Release), per `sed -i 's/MARKETING_VERSION = OLD;/MARKETING_VERSION = NEW;/g'` — Edit-Tool schlägt wegen Tab/Space-Mix fehl.

Info.plist muss **nicht** mehr manuell geändert werden (liest jetzt via `$(MARKETING_VERSION)` automatisch aus pbxproj).

Build Number wird von EAS remote auto-inkrementiert (`autoIncrement: true` in eas.json), nicht aus `app.json` / `ios/` gelesen.
