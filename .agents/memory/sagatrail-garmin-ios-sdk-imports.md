---
name: Garmin iOS SDK imports
description: Non-obvious repository and Swift importer details for the Garmin Connect IQ iOS companion SDK.
---

Use Garmin's official Swift package repository `connectiq-companion-app-sdk-ios`, not the similarly named non-iOS repository. In Swift, the Objective-C SDK imports `showConnectIQDeviceSelection` as `showDeviceSelection()`, `parseDeviceSelectionResponseFromURL` returns an optional array, and `IQApp.appWithUUID:storeUuid:device:` is called as `IQApp(uuid:store:device:)` with Swift `UUID`.

**Why:** The wrong repository cannot be cloned by EAS, and the Objective-C names in Garmin's documentation do not match the Swift 3 importer used by the current SDK.

**How to apply:** When upgrading or rebuilding the iOS Garmin bridge, verify the package URL and compile against the SDK's imported Swift signatures rather than copying the Objective-C examples verbatim.