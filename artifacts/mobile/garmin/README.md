# SagaTrail Garmin Connect IQ MVP

This is a standalone Connect IQ watch-app project. It does not change the Expo,
iOS, Android, or Wear OS projects.

## What it does

The existing Expo `lib/watchCompanion.ts` only mirrors notifications. It is
**not** a Garmin Connect Mobile SDK companion, so this repository does not
currently provide working phone-to-watch transport. Until a future native
bridge sends the documented handshake, the watch UI fails closed with **CIQ
MOBILE COMPANION REQUIRED** and will not transmit SOS.

The foreground app displays the last accepted `HikeLiveState`: next direction
and distance, elapsed time, distance, ascent, steps, freshness, phone
connection state, safety text, and narration text. It stores that
coordinate-free snapshot in Connect IQ storage so it can still show the latest
cached instruction after the view is reopened.
New non-empty safety or narration text receives a short local vibration alert.

Press **Select** once to arm SOS and a second time to confirm it; **Back**
cancels while armed. A confirmed request is *pending* until a phone message
explicitly acknowledges it. Connect transport success is not treated as SOS
success. If transport cannot reach the phone, it is shown as failed.

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

## Build and simulator

Install Garmin's Connect IQ SDK and make its `bin` directory available on
`PATH`. Then, from this folder:

```sh
monkeyc -f monkey.jungle -o bin/SagaTrail.prg -y /path/to/developer_key.der
connectiq
```

In the Device Simulator, select a matching product and load
`bin/SagaTrail.prg`. Tool names and simulator loading UX differ slightly by SDK
version. This repository does not bundle the SDK or developer key. No CIQ
tooling was available when this MVP was added, so no executable CIQ test was
run.

See `docs/PHONE_PROTOCOL.md` for the constrained phone-message contract.