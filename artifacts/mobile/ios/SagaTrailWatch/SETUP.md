# SagaTrail Apple Watch MVP setup

The iPhone bridge is included in the checked-in `SagaTrail` target. The watch
target is intentionally **not** injected into `project.pbxproj`: creating a
watch extension/product relationship and provisioning settings in an
Expo-managed project is not deterministic without selecting a development team
and signing profile. No Pods or Viro build phase has been changed.

## One-time Xcode target step

1. Open `SagaTrail.xcworkspace` (not the `.xcodeproj`) in Xcode.
2. Add a **watchOS App** target named `SagaTrailWatch`, with companion app
   `SagaTrail` and bundle identifier `com.sagatrail2.app.watchkitapp`.
3. Replace the generated SwiftUI files with every `.swift` file in
   `SagaTrailWatch/`; set `Info.plist` and `SagaTrailWatch.entitlements` from
   this directory on that target.
4. In Signing & Capabilities select the same development team as the phone,
   enable HealthKit, and enable the **Workout Processing** background mode.
   Set the watch deployment target to watchOS 10.0 or newer.
5. Add `HealthKit.framework` and `WatchConnectivity.framework` to the watch
   target. Xcode links both system frameworks automatically in most templates.
6. Build the paired phone and watch targets on a real paired device, accept the
   Health permission prompt, and start the live heart-rate session from the
   watch.

## Protocol v1

All messages are dictionaries/JSON objects:

```json
{ "v": 1, "type": "liveState", "timestamp": 0, "payload": { "updatedAt": 0 } }
```

`liveState.payload` supports `routeName`, `nextInstruction`,
`navigationDirection`, `isHiking`, `elapsedSeconds`, `distanceMeters`,
`ascentMeters`, `steps`, `heartRateBpm`, `bearingDegrees`,
`distanceToTurnMeters`, and required `updatedAt` (Unix milliseconds).
The phone is authoritative for every route and progress field. The watch
renders stale after 45 seconds and disconnected when unreachable.

`alert` has only `title` and `body`. `sosConfirmed` travels watch-to-phone only
after the on-watch confirmation. Coordinates are rejected from live-state and
are never shown in the watch SOS UI or native alert payload.

The React Native module is named `SagaTrailCompanion`; its canonical entry
point is `publishLiveState(state)` using the `HikeLiveState` contract in
`lib/watchCompanion.ts`. It also retains `activate()`, `updateHikeLiveState`,
`sendAlert(alert)`, and `getStatus()`. It emits the exact
`SagaTrailCompanion.heartRate` and `SagaTrailCompanion.sosRequest` events,
plus diagnostic watch-status events.