---
name: WatchConnectivity property-list payloads
description: React Native null values cross the native bridge as NSNull and must be removed before WatchConnectivity transport.
---

Every outgoing WatchConnectivity envelope must be recursively stripped of `NSNull` values and validated with `PropertyListSerialization` before it is cached or sent.

**Why:** WatchConnectivity accepts property-list-compatible values only. React Native preserves JavaScript `null` as `NSNull`; optional live-state fields can therefore make the whole application context and direct message undeliverable even though the native bridge method returned normally.

**How to apply:** Sanitize at the final phone-side transport boundary so nested dictionaries and arrays are covered. Treat a JavaScript “native publish returned” log as invocation evidence, not delivery acknowledgement.