---
name: Xcode MARKETING_VERSION sync
description: EAS Build ignoriert app.json version wenn ein natives ios/ Verzeichnis vorhanden ist; die Version muss direkt im Xcode-Projekt gesetzt werden.
---

## Regel

Wenn ein natives `ios/` Verzeichnis existiert, liest EAS Build die App-Version **ausschliesslich** aus `ios/SagaTrail.xcodeproj/project.pbxproj` (`MARKETING_VERSION`), nicht aus `app.json`.

**Why:** EAS loggt explizit: "Specified value for 'ios.bundleIdentifier' in app.json is ignored because an ios directory was detected." Das gilt auch für die Version.

**How to apply:** Bei jedem Versions-Bump beide Stellen anpassen:
1. `app.json` → `"version": "x.y.z"`
2. `ios/SagaTrail.xcodeproj/project.pbxproj` → `MARKETING_VERSION = x.y.z;` (kommt zweimal vor: Debug + Release)

Änderung per `sed -i 's/MARKETING_VERSION = OLD;/MARKETING_VERSION = NEW;/g'` — der Edit-Tool schlägt wegen Tab/Space-Mix fehl.

Build Number wird von EAS remote auto-inkrementiert (`autoIncrement: true` in eas.json), nicht aus `app.json` / `ios/` gelesen.
