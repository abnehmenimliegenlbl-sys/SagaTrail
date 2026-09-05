# Phone message protocol: canonical `HikeLiveState` v1 adapter

This is the contract for a **future native Garmin Connect Mobile SDK
companion**. `artifacts/mobile/lib/watchCompanion.ts` is currently an Expo
notification-mirroring helper, not a Connect IQ Mobile SDK transport. It cannot
send any of the messages documented here. This Garmin project therefore does
not claim a working phone transport.

Messages are Connect IQ dictionaries; key names below map to Monkey C symbols
(for example, `protocolVersion` is read as `message[:protocolVersion]`).

## Phone → watch: `hikeLiveState`

Every accepted message has `protocolVersion: 1`, `type: "hikeLiveState"`, and
the canonical JS `HikeLiveState` fields below. The Garmin parser copies these
exact names; it does not use a compact-key transport.

| Canonical JS field / wire key | Type | Garmin use |
| --- | --- | --- |
| `direction` | string | Next-turn instruction. |
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
| `freshnessS` | number | Optional age of the source state in seconds. |
| `safetyText` | string | Brief safety warning; empty when absent. |
| `narrationText` | string | Brief narration cue; empty when absent. |
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

## Watch → phone: confirmed SOS request

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

There is no implemented native Garmin Connect Mobile SDK bridge in this
repository and no promise of background delivery, persistent connection,
continuous navigation updates, or continuous HR upload. A future companion
should send full canonical-key latest-state snapshots when its own platform
permits and make delayed or absent communication visible through `freshnessS`
and a disconnected `companionStatus`.