---
name: Garmin Android companion callbacks
description: Non-obvious callback and connection details for Garmin Connect IQ Android SDK 2.2.0.
---

Garmin Connect IQ Android SDK 2.2.0 delivers app messages to
`IQApplicationEventListener` as a `List<Object>`, even when the watch sends a
dictionary. The phone bridge must unwrap the first element and then validate it
as a map before reading protocol keys.

**Why:** Treating the callback as a map directly is a compile-time/API mismatch
and would prevent incoming SOS requests from reaching JavaScript.

**How to apply:** Keep device-event and application-event listeners typed to the
SDK interfaces; only report `connected` from a real `IQDeviceStatus.CONNECTED`
device and only parse coordinate-free protocol dictionaries after unwrapping
the callback list.