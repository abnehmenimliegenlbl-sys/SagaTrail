---
name: Compass permission retry
description: iOS heading startup can race the foreground-location permission prompt.
---

The native compass must be started again after foreground location permission changes. Starting `watchHeadingAsync` only once on screen mount can fail while the OS permission dialog is still unresolved, leaving the compass tile visible but permanently without a heading.

**Why:** The Hike screen initializes location and heading effects in parallel; on a fresh install, Core Location may reject heading setup before the user grants location access.

**How to apply:** Tie the heading effect to the permission-granted retry signal, while keeping the location initializer itself one-shot. Do not replace the real sensor with simulated headings.