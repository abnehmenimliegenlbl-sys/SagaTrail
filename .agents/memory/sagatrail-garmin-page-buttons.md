---
name: Garmin page-button callbacks
description: Reliable Connect IQ page switching through BehaviorDelegate callbacks.
---

Connect IQ watch-page navigation must implement `onNextPage` and `onPreviousPage`, with mode callbacks as device-compatible fallbacks. Do not rely only on raw `onKey` handling.

**Why:** The SDK 9.2 simulator displayed the app normally but ignored UP/DOWN when navigation existed only in `onKey`. Behavior callbacks are the portable input path for watch hardware and simulator controls.

**How to apply:** Route page and mode callbacks to the same page-change methods, retain raw key handling only as a fallback, and verify both directions on every targeted watch family.