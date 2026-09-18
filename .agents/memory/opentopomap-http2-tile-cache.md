---
name: OpenTopoMap HTTP/2 tile cache
description: Why a single valid OpenTopoMap tile can fail in WKWebView while all neighboring tiles load.
---

An individual OpenTopoMap cache entry can contain the HTTP/1.1-only response header `Upgrade: h2c`. When that cached response is served over HTTP/2, WKWebView rejects it even though the status is nominally 200, so Leaflet receives a tile error with zero image bytes.

**Why:** For the Basel route screenshot, tile `11/1067/715` reproduced this on all `a`, `b`, and `c` subdomains. HTTP/1.1 returned the valid 48,289-byte PNG, HTTP/2 failed repeatedly with the invalid header, and direct neighboring tiles worked. A query parameter produced a clean HTTP/2 cache MISS and the correct PNG.

**How to apply:** Do not switch map sources or merely rotate OpenTopoMap subdomains; they share the bad cache entry. After route decorations and dynamic POIs are ready, retry the same z/x/y with a bounded cache-busting query. Keep ordinary WebView resize handling separate.