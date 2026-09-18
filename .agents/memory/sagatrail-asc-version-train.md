---
name: App Store Connect version train
description: EAS-Submissions können den Apple-Fehler nur im verknüpften JobRun ausweisen.
---

Wenn eine EAS-iOS-Submission `ERRORED` ist, aber `submission.error` und `logFiles` leer sind, den verknüpften `jobRun.errors`-Eintrag abfragen. Der Fehler `EAS_UPLOAD_TO_ASC_CLOSED_VERSION_TRAIN` bedeutet, dass Apple für `CFBundleShortVersionString` keinen weiteren Build im aktuellen Versionszug akzeptiert.

**Why:** `eas submit:view` kann in diesem Fall nur den allgemeinen Status anzeigen; der konkrete Apple-Grund liegt trotzdem im EAS-JobRun. Ein Retry desselben Builds kann deshalb nicht helfen.

**How to apply:** Eine höhere App-Version setzen, sowohl `app.json` als auch alle nativen `MARKETING_VERSION`-Einträge (inklusive eingebetteter Watch-App) synchronisieren, einen neuen Produktionsbuild erzeugen und diesen automatisch submitten. Build-Nummer nicht manuell festlegen, wenn EAS `autoIncrement` verwendet.