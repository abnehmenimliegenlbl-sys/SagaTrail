---
name: Connect IQ SDK 9.2 Linux build
description: Environment and API constraints for compiling the Garmin Connect IQ MVP from the Windows SDK archive on Replit Linux.
---

Connect IQ SDK 9.2's Windows archive can compile on Replit Linux when its CRLF launcher is handled outside the archive and the compiler is invoked with the SDK's `monkeybrains.jar`. The SDK 9.2 jungle format expects only `project.manifest`; source and resource discovery comes from the SDK default jungle.

**Why:** The Windows launcher cannot execute directly on Linux, and copying it to `/tmp` changes its relative JAR lookup. Older project jungle path entries also fail the current parser.

**How to apply:** Keep the SDK archive untouched, normalize or bypass the launcher in a temporary build step, invoke the JAR from its original `bin` directory, and keep only `project.manifest = manifest.xml` in the app jungle. For SDK 9.2, use `PhoneAppMessage.data`, a typed `Communications.ConnectionListener` for `transmit`, `WatchUi.KEY_ENTER`, and declare `SensorHistory` permission before using heart-rate history.

The SDK archive's embedded `devices.xml` is authoritative for product IDs, but the Linux compiler's default `~/.Garmin/ConnectIQ/Devices` JSON catalog may be absent. In that case `monkeyc` reports every valid manifest product as invalid; `--override-devices-json` accepts only the JSON catalog format, not the embedded XML.

**Why:** Replit's Linux workspace does not necessarily have the Garmin desktop-installed device database even when the Windows SDK archive is present.

**How to apply:** Validate manifest IDs against the embedded SDK XML before building, keep the SDK-standard drawable indirection (`@Drawables.LauncherIcon` to `drawables.xml`), and treat default Linux invalid-device warnings as catalog-environment diagnostics unless a matching JSON catalog is supplied.