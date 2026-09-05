# SagaTrail Wear OS MVP

This is a **standalone native Wear OS project**. It is not included by the Expo
Android Gradle settings and does not modify the phone, iOS, JavaScript, or Garmin
applications.

## Requirements and build

Install JDK 17, Gradle 8.9+, Android SDK Platform 35, and a Wear OS emulator or
device. Set `ANDROID_HOME` (or `ANDROID_SDK_ROOT`), then:

```sh
cd artifacts/mobile/wear-os
./gradlew :app:assembleDebug
```

The build fails at configuration time with an explicit message when Platform 35
is absent. The repository contains no signing key or signing configuration.
Generate/commit a standard Gradle wrapper only if your binary-wrapper policy
allows it; the checked-in launcher delegates to installed Gradle.

## Phone protocol

The phone writes a Data Layer `DataItem` at
`/sagatrail/live_state/v1`, with a UTF-8 JSON `payload` byte array. Its schema is
`HikeLiveState` contract version `1`; `receivedAtEpochMs` is required and makes a
snapshot stale after 90 seconds. The watch sends UTF-8 JSON commands to
`/sagatrail/command/v1`. The phone is authoritative for all navigation and SOS
outcomes. In particular, the watch only says an SOS was acknowledged after a
matching `sosAcknowledgement` arrives in a later phone snapshot.

The watch can start a Wear Health Services walking exercise after `BODY_SENSORS`
permission and publishes its local HR only to this watch UI. Safety snapshots
cause a haptic pattern and persistent text alert.

## Android phone bridge

`artifacts/mobile/android/app` registers the native module named exactly
`SagaTrailCompanion`. Its `publishLiveState(snapshot)` method accepts the
existing canonical JS fields `direction`, `heading`, `remainingKm`,
`heartRateBpm`, and `hasFreshGps` (with optional route/metric fields), then
maps them to this v1 Data Layer schema. Watch messages are exposed to JS as
`SagaTrailCompanion.heartRate` and `SagaTrailCompanion.sosRequest`. A phone
handler must authoritatively decide the SOS result and include the optional
`sosAcknowledgement` object in a later `publishLiveState` call; no request is
reported as successful by the watch before that acknowledgement.