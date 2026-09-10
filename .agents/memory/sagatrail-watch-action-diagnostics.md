---
name: Watch action remote diagnostics
description: Remote diagnostic coverage required for Apple Watch safety actions.
---

Apple Watch safety actions must emit privacy-safe remote diagnostics at the Watch interaction, WatchConnectivity send, iPhone receipt, native delivery, and JavaScript receipt boundaries.

**Why:** JavaScript remote logs alone only prove that an action reached React Native. Native `NSLog` entries remain on Apple devices and cannot distinguish a failed Watch tap, queued transfer, phone receipt, or native-to-JS handoff from Replit production logs.

**How to apply:** For check-in and SOS changes, keep each remote event limited to stage, command kind, duration option, connectivity booleans, protocol outcome, and timestamp. Never include coordinates, contact details, story text, or identifiers.