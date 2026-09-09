---
name: Watch wire-number safety
description: Numeric values received by the Watch must be finite and bounded before conversion, persistence, or rendering.
---

Validate every numeric live-state field at the Watch protocol boundary. Required malformed values reject the state; malformed optional values are omitted. Any value later converted to `Int` needs a practical upper and lower bound.

**Why:** Swift traps when converting NaN, infinity, or an out-of-range `Double` to `Int`. A malformed but transport-valid live state can therefore close the Watch app immediately during its first render or complication snapshot.

**How to apply:** Keep finite/range checks centralized in wire decoding, retain defensive checks for locally sourced HealthKit values, and test absent, NaN, infinite, and extreme values before native releases.