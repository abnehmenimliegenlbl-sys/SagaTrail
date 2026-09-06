# SagaTrail Apple Watch MVP setup

The checked-in Xcode project contains both sides of the integration:

- `SagaTrail` embeds `SagaTrailWatch.app` and depends on the Watch target.
- `SagaTrailWatch` compiles all SwiftUI sources in this directory.
- Both targets use the same development team and marketing/build versions.
- The Watch target links HealthKit and WatchConnectivity, enables HealthKit,
  and supports watchOS 10 or newer.

No Pods or Viro build phase is shared with the Watch target.

## Device validation

Before the first non-interactive EAS build, create or upload a provisioning
profile for `com.sagatrail2.app.watchkitapp` in the project's iOS credentials.
The phone and Watch targets may share the distribution certificate, but each
bundle identifier requires its own provisioning profile.

1. Install a development or TestFlight build on a paired iPhone and Apple Watch.
2. Open SagaTrail on both devices and start a hike on the iPhone.
3. Confirm route status and navigation updates appear on the Watch.
4. Accept the Health permission prompt and start the live heart-rate session
   from the Watch.
5. Confirm SOS on the Watch and verify the iPhone opens the existing emergency
   flow without exposing coordinates on the Watch.

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