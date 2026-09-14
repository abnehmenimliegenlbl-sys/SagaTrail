---
name: Watch turn-distance rounding
description: Product rule for displaying distances to the next turn on Apple Watch surfaces.
---

Apple Watch turn distances use human-friendly metric rounding: values at or above 1 km are rounded to the nearest 100 m and displayed in km; 100–999 m values are rounded to the nearest 10 m; values below 100 m are rounded to the nearest 5 m. The same formatter feeds the main navigation page and the complication.

**Why:** Raw GPS-derived meter values such as 823 m or 3,247 m are noisy and harder to act on while hiking.

**How to apply:** Reuse the central Watch formatter for any new Watch turn-distance surface instead of formatting raw `distanceToTurnMeters` independently.