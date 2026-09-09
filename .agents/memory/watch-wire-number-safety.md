---
name: Watch wire-number safety
description: Numeric values received by the Watch must be finite and bounded before conversion, persistence, or rendering.
---

Validate every numeric live-state field at the Watch protocol boundary. Required malformed values reject the state; malformed optional values are omitted. Any value later converted to `Int` needs a practical upper and lower bound. Unix milliseconds must use `Int64`, never platform-width `Int`.

**Why:** Swift traps when converting NaN, infinity, or an out-of-range `Double` to `Int`. On the Watch arm64_32 slice, `Int` is 32-bit, so current Unix milliseconds overflow immediately even though the same code is safe on arm64 iPhone.

**How to apply:** Keep finite/range checks centralized in wire decoding, retain defensive checks for locally sourced HealthKit values, use the shared `Int64` Unix-millisecond helper for outbound timestamps, and test the arm64_32 Watch slice before native releases.