---
name: Offline theme evidence
description: How offline route packages distinguish a checked no-match from unavailable theme evidence
---

An offline POI cache must preserve the difference between a valid empty response and missing storage. The first means that no matching POI evidence was found; the second means that themed route claims cannot be verified offline and must be shown as unavailable.

**Why:** Treating both states as null makes an incomplete offline package look like a trustworthy route with no themes, which hides a data gap from the hiker.

**How to apply:** Return an empty array for a stored empty POI response, return null only when the payload is absent or invalid, and show an explicit offline notice only for the latter when no server `themeKeys` exist.