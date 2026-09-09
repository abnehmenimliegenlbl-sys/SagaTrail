# SagaTrail Garmin Connect IQ MVP

This is the Connect IQ watch-app project used by the Expo phone app. The native
phone bridge lives in the existing Expo iOS and Android targets and sends the
same coordinate-free protocol described below.

## What it does

`lib/watchCompanion.ts` publishes the canonical hike state to the native
`SagaTrailCompanion` module. Android uses Garmin's Connect IQ Mobile SDK
`2.2.0`; iOS uses Garmin's official
`connectiq-companion-app-sdk` Swift Package. Both require Garmin Connect
Mobile and a real paired/connected watch with this app installed.

The bridge reports unavailable when Garmin Connect Mobile, the selected device,
or the installed watch app is missing. It never promotes cached data to a
connected state. Until a real handshake is received, the watch UI fails closed
with **CIQ MOBILE COMPANION REQUIRED** and will not transmit SOS.

The foreground app uses the round-safe light **Horizon** design on four
SagaTrail pages with the `#CC0000` brand accent: Navigation, Status, Safety,
and Story/Audio. A small SagaTrail mountain/star logo and a persistent green
or red hiker sit inside the safe top arc. Navigation uses large, simple left,
right, turn-around, and straight-ahead arrows and labels, plus a
coordinate-free ridge horizon, route progress, off-route warning, time,
distance, and ETA. Status contains ascent, steps, local-or-phone heart rate,
terrain, weather, daylight, and the following turn. Safety contains check-ins,
alerts, off-route distance, and the two-step SOS action. Story/Audio mirrors
active narration and POI text while playback and images remain on the phone.
It says that the phone is playing only while the phone's real playback state
is active.

The app stores the coordinate-free snapshot in Connect IQ storage so it can
still show the latest cached instruction after the view is reopened.
New non-empty safety or narration text receives a short local vibration alert.

Open the Garmin menu for the phone-authoritative Start/Pause/Resume controls,
30/60/120-minute safety check-ins, and check-in confirmation. Local Garmin
heart rate is shown on the watch and forwarded to the phone when the device
provides a current sample.

Press **Select** once to arm SOS and a second time to confirm it; **Back**
cancels while armed. Choosing SOS from the menu only arms the same confirmation
flow and never transmits immediately. A confirmed request is *pending* until a
phone message explicitly acknowledges it. Connect transport success is not
treated as SOS success. If transport cannot reach the phone, it is shown as
failed.

When the device exposes it, heart rate is read through `ActivityMonitor` and is
always displayed as **HR local**. This MVP neither records nor promises
reliable continuous upload of heart rate to the phone.

## Compatibility and limitations

The manifest targets listed round/watch devices with Connect IQ API 3.2+:
fēnix 7 family, epix (Gen 2), Venu 2, vívoactive 4, and Forerunner 955. Other
devices need explicit manifest product validation and layout testing. Small
screens may truncate long phone text.

Connect IQ phone messages require the app to be active and the paired Garmin
Connect app/phone path to be available. This is intentionally not presented as
background navigation, continuous telemetry, guaranteed delivery, or emergency
service. The phone is responsible for actual SOS delivery and acknowledgement.

No raw coordinates are accepted, stored, rendered, or sent by this project.

## Phone setup

### Android

Install Garmin Connect Mobile, pair the watch, and install the signed
`SagaTrail` Connect IQ app on the watch. The Android phone app initializes the
Companion SDK through `ConnectIQ.IQConnectType.WIRELESS`, listens for the real
device status, and sends messages only while the device is connected.

### iPhone

Install Garmin Connect Mobile, pair the watch, and use the native
`selectGarminDevice` action once to grant SagaTrail access to the device. The
callback uses the `sagatrail-connectiq` URL scheme registered in the iOS
Info.plist. The iOS package is resolved from Garmin's official GitHub Swift
Package.

## Build and simulator

Install Garmin's Connect IQ SDK and make its `bin` directory available on
`PATH`. Then, from this folder:

```sh
monkeyc -f monkey.jungle -o bin/SagaTrail.prg -y /path/to/developer_key.der
connectiq
```

In the Device Simulator, select a matching product and load
`bin/SagaTrail.prg`. Tool names and simulator loading UX differ slightly by SDK
version. This repository does not bundle the SDK or developer key. The watch
app has been compiled and signed with Connect IQ SDK 9.2; a physical
phone/watch transport test still requires a Garmin watch.

See `docs/PHONE_PROTOCOL.md` for the constrained phone-message contract.