# Phone message protocol: canonical `HikeLiveState` v1 adapter

This is the contract between the Connect IQ watch app and the native
`SagaTrailCompanion` phone module. `artifacts/mobile/lib/watchCompanion.ts`
remains the JavaScript source of truth; Android and iOS only adapt and
transport its coordinate-free snapshot through Garmin's Connect IQ Mobile SDK.

Messages are Connect IQ dictionaries; key names below map to Monkey C symbols
(for example, `protocolVersion` is read as `message[:protocolVersion]`).

## Phone → watch: `hikeLiveState`

Every accepted message has `protocolVersion: 1`, `type: "hikeLiveState"`, and
the canonical JS `HikeLiveState` fields below. The Garmin parser copies these
exact names; it does not use a compact-key transport.

| Canonical JS field / wire key | Type | Garmin use |
| --- | --- | --- |
| `direction` | string | Next-turn instruction. |
| `sessionStatus` | string | `preparing`, `active`, `paused`, `finished`, or `sos_requested`. |
| `nextInstruction` | string | Short display instruction for the current screen. |
| `heading` | number/null | Canonical heading; retained but not rendered in this MVP. |
| `remainingKm` | number | Next-instruction distance, rendered in km. |
| `heartRateBpm` | number/null | Retained only; not rendered as phone HR. Watch HR is labeled local. |
| `hasFreshGps` | boolean | Canonical GPS-freshness signal; retained for state consumers. |
| `protocolVersion` | number | Adapter version; must be `1`. |
| `type` | string | Must be `hikeLiveState`. |
| `bridge` | string | Must be `connectIqMobile` to unlock connected UI. |
| `companionStatus` | string | Must be `connected` to unlock connected UI. |
| `updatedAtMs` | number | Optional phone snapshot timestamp. |
| `elapsedS` | number | Optional hike elapsed seconds. |
| `totalDistanceM` | number | Optional hike distance in meters. |
| `ascentM` | number | Optional ascended meters. |
| `steps` | number | Optional phone-supplied step count. |
| `remainingDistanceM` | number | Remaining route distance. |
| `remainingSeconds` | number | Estimated time to arrival. |
| `arrivalAtEpochMs` | number | Estimated arrival timestamp. |
| `plannedAscentM` | number | Planned route ascent. |
| `remainingAscentM` | number | Estimated ascent remaining. |
| `upcomingNavigations` | array | Up to three coordinate-free upcoming turns. |
| `terrainSection` | object | Current uphill/downhill grade and distance. |
| `safetyCheckin` | object | Check-in status, remaining time, and live-link state. |
| `offRoute` | object | Distance and return bearing, never a position. |
| `weather` | object | Current temperature, wind, precipitation, and storm flag. |
| `daylight` | object | Sunset timestamp and after-sunset arrival warning. |
| `language` | string | Current app language for watch display. |
| `freshnessS` | number | Optional age of the source state in seconds. |
| `safetyText` | string | Brief safety warning; empty when absent. |
| `narrationText` | string | Brief narration cue; empty when absent. |
| `audioPlaying` | boolean | True only while narration audio is actually playing on the phone. |
| `alertKind` / `alertText` | string | Current short alert and its category, including discovery and SOS. |
| `sosAcknowledgement` | string | `none`, `acknowledged`, or `failed`. |

The fields through `hasFreshGps` are the exact fields in the current
`WatchLiveSnapshot` / canonical JS `HikeLiveState` surface in
`lib/watchCompanion.ts`. The remaining keys are this Garmin adapter's optional
display and acknowledgement envelope; they do not rename or replace canonical
fields. No `distanceM` or `connectionState` key is accepted.

The protocol contains **no latitude, longitude, geometry, location history, or
raw coordinates**. The phone must omit unknown fields rather than adding
coordinates. The watch whitelists only the listed fields.

The Garmin UI fails closed: cached state remains visible, but it displays
**CIQ MOBILE COMPANION REQUIRED** and blocks SOS transmission unless it receives
a versioned `hikeLiveState` from a real bridge with both
`bridge: "connectIqMobile"` and `companionStatus: "connected"`. Receiving an
old cached snapshot never restores connected status.

`freshnessS` is a display fact, not a guarantee that a new message will arrive.
Keep strings short for round watch screens.
Changing a non-empty `safetyText` or `narrationText` triggers one short local
vibration while the watch app is active.

## Watch → phone: hike controls and confirmed SOS request

The Garmin app exposes the same phone-authoritative hike controls as the Apple
Watch companion through its SagaTrail menu:

```json
{ "protocolVersion": 1, "type": "hikeCommand", "command": "pause", "requestedAt": 123456 }
```

`command` is one of `start`, `pause`, `resume`, `safetyStart`, or
`safetyConfirm`. `safetyStart` additionally carries `durationMinutes` with one
of `30`, `60`, or `120`. The phone remains authoritative and may reject or
ignore a command when the hike state does not allow it.

When the watch exposes a local heart-rate sample, it may send:

```json
{ "protocolVersion": 1, "type": "heartRate", "bpm": 138, "measuredAt": 1234567890000 }
```

The phone labels that source as Garmin and applies the same freshness rules as
the Apple Watch source.

After the wearer presses Select twice *and the real bridge is connected*, the
watch transmits:

```json
{ "protocolVersion": 1, "type": "sosRequest", "requestId": 123456 }
```

`requestId` is a watch timer value only and is not an emergency identifier.
The companion must attempt its own user-authorized SOS flow and then send a
normal `HikeLiveState` with `sosAcknowledgement: "acknowledged"` only after it
has a real acknowledgement under the phone's policy. Send `"failed"` if it
cannot complete the request. A successful Connect IQ transport callback means
only that the watch reached its phone transport; it is never an SOS
acknowledgement.

## Communication expectations

The native bridge is implemented on Android and iOS. It makes no promise of
background delivery, persistent connection, continuous navigation updates, or
continuous HR upload. The bridge sends the latest full snapshot when the
platform permits and makes delayed or absent communication visible through
`freshnessS` and a disconnected `companionStatus`.

Android requires Garmin Connect Mobile to be installed. iOS additionally
requires device selection through Garmin Connect Mobile; the callback is
handled through the `sagatrail-connectiq` URL scheme. A successful SDK send is
only delivery to the watch app and is never treated as SOS acknowledgement.