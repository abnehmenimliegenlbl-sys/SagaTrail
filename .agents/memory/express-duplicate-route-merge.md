---
name: Express duplicate route after task merge
description: Parallel task agents can add a handler for a path you also added; first-defined wins silently
---

If you and a task agent both add an endpoint with the same method+path, the merge keeps BOTH handlers; Express silently uses only the first-defined one — the second is dead code with possibly different behavior (happened with a bulk-import route: active handler dropped fields the script sent).

**Why:** No error, no warning; the bug only shows as "some fields didn't update" in data.

**How to apply:** After merging a task that touches the same router file you edited, `grep -n` for your route paths and verify each appears exactly once; consolidate immediately.
