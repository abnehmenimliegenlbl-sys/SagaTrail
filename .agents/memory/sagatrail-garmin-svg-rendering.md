---
name: Garmin simulator header rendering
description: Connect IQ SDK 9.2 can crash on decorative logo rendering during the first header update.
---

Keep the first Garmin header render text-only. Do not draw the launcher SVG at runtime, and avoid an extra decorative brand-mark helper in that initial update.

**Why:** The Connect IQ SDK 9.2 simulator aborted with `API code 0x300023b1` at the first header update for both the SVG bitmap call and its replacement decorative mark. Removing that additional render path allowed a clean rebuild.

**How to apply:** Keep the SVG only as the launcher icon. In the live header, use the existing text, divider, and status indicator calls; add decorative branding only after simulator and physical-device validation.