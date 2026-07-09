---
name: SagaTrail canton coat-of-arms assets
description: Where the real, colored Swiss canton Wappen SVGs used in the app come from and why Wikimedia is not the source.
---

Real Wappen (coat of arms) for all 26 cantons are bundled locally as inline SVG strings, keyed by 2-letter canton code, rendered via `react-native-svg`'s `SvgXml`.

**Why:** `commons.wikimedia.org` and `upload.wikimedia.org` return HTTP 429 ("Wikimedia Error") for every request from this sandbox/workspace network — both the API and CDN, consistently, not a transient rate limit. Do not spend time retrying Wikimedia fetches for image assets; it doesn't recover.

**How to apply:** Source used instead: GitHub repo `nzzdev/ch-canton-symbols` (CC BY-SA 4.0), raw files at `symbols/13x13/<code>.svg` (lowercase 2-letter code, e.g. `zh.svg`). `raw.githubusercontent.com` is not blocked. If more coat-of-arms formats/sizes are needed later, pull from that same repo rather than Wikimedia.
