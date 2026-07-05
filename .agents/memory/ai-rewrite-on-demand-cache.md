---
name: On-demand AI text rewrite with hash-keyed cache
description: Pattern for restyling fetched content (e.g. Wikipedia extracts) into a brand voice via AI, cheaply.
---

When a feature needs source text (fetched live, e.g. Wikipedia) restyled into an app's narrative
voice, prefer an on-demand rewrite over eager/bulk rewriting of every item returned by a list
endpoint.

**Why:** list endpoints (e.g. a POI bounding-box query) can return dozens of items per request;
rewriting all of them eagerly multiplies AI cost and latency for content the user may never open.
Rewriting only what the user actually taps/opens keeps cost proportional to attention.

**How to apply:**
- Add a small dedicated endpoint that takes the raw text (+ any params affecting the rewrite, e.g.
  target language) and returns just the rewritten text — don't bolt the rewrite onto the list
  endpoint's response shape.
- Cache server-side in-memory, keyed by a hash/concat of the exact inputs that affect the output
  (source text + language, etc.), with a long TTL (days), since the source text for a given item is
  stable.
- On the client, fetch on the triggering interaction (e.g. tap-to-open a detail view), show the raw
  source text as an immediate fallback/loading state, and swap in the rewritten text when it
  resolves — never block the UI on the AI call.
