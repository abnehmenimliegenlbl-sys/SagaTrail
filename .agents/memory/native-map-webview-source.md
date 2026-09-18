---
name: Native map WebView source identity
description: Preventing full WKWebView map reloads while dynamic position data is injected.
---

Keep the React Native WebView `source` object stable for as long as the generated HTML is unchanged. Dynamic GPS, POI, partner, and similar updates belong in JavaScript injection and must not allocate a fresh `{ html }` source on each render.

**Why:** React Native WebView can interpret a newly allocated source object as a document change even when the HTML string is identical. Frequent GPS updates then reload the complete Leaflet map and erase transient tile state.

**How to apply:** Memoize the source object by the HTML string. Rebuild it only when a map-defining input intentionally changes. Per-tile retry logic may change an individual tile URL without replacing the document.