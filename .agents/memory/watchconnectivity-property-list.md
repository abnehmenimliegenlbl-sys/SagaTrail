---
name: Watch property-list payloads
description: WatchConnectivity envelopes and complication snapshots must contain only property-list-compatible values.
---

Every outgoing WatchConnectivity envelope must be recursively stripped of `NSNull` values and validated with `PropertyListSerialization` before it is cached or sent. UserDefaults snapshots must use `[String: Any]` and add optional fields only when values exist.

**Why:** WatchConnectivity and UserDefaults accept property-list-compatible values only. React Native preserves JavaScript `null` as `NSNull`; boxed Swift optionals in a complication snapshot can also terminate the Watch app immediately after the first live state.

**How to apply:** Sanitize at the final phone-side transport boundary so nested dictionaries and arrays are covered. Build Watch-side persisted dictionaries incrementally rather than inserting optional expressions directly. Treat a JavaScript “native publish returned” log as invocation evidence, not delivery acknowledgement.