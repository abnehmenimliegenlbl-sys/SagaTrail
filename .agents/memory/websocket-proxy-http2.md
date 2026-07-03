---
name: WebSocket testing over the shared proxy hits an HTTP/2 quirk
description: Browser-based e2e tests (Playwright/runTest) can fail to open WebSocket connections through the Replit shared proxy even when server-side WS auth/logic is fully correct.
---

When a workflow's WebSocket endpoint is exercised by a real headless browser through the shared reverse proxy, the handshake can fail with "WebSocket is closed before the connection is established" even though the server and proxy path config are correct.

Root cause: the proxy negotiates HTTP/2 by default over HTTPS. A plain `curl` WS upgrade forced to HTTP/1.1 (a fresh connection) completes a proper 101 handshake and reaches app-level auth logic. The same request over a connection that negotiated HTTP/2 (default ALPN, or a browser reusing an existing h2 connection from the page load) never reaches the app as a WS upgrade at all — it arrives as a plain GET, because the proxy does not support WebSocket-over-HTTP/2 (RFC 8441 extended CONNECT). Browsers can hit this path when they coalesce the WS attempt onto an already-open h2 connection to the same origin.

**Why:** This matters because it means an e2e test through a browser preview can look like a real app bug (auth failing, connection dropping) when the actual server-side code is correct — verified independently by minting a real auth token via the backend SDK and hand-testing the raw protocol with curl (`--http1.1` forced vs default ALPN).

**How to apply:** When a WS feature fails only in browser-driven e2e tests but plain `curl --http1.1` handshakes succeed with the same real token, suspect this proxy/ALPN interaction before assuming the app auth/logic is broken. Native app clients (Expo/React Native) open dedicated connections and are not subject to this browser page-connection-coalescing behavior, so the feature can still be correct for real native users even if the web-preview e2e test can't cleanly verify it. To confirm without burning e2e test budget: mint a token via the backend SDK (e.g. `clerkClient.sessions.getToken`) directly in a shell script placed inside the relevant workspace package (so module resolution works), then hand-test with curl using both `--http1.1` and default ALPN against the public dev domain.
