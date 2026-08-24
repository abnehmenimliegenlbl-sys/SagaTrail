---
name: Reverse-loop overlap guard
description: Geometric reverse-loop detection must stop at the shared turning point.
---

Reverse-loop matching must not consume past the shared turning point of two
palindromic traversals; otherwise the two sections overlap and the report can
mislabel the whole route as one self-overlapping loop.

**Why:** A route that walks out and back is naturally palindromic at its turn,
so unrestricted symmetric matching can extend beyond the intended two passes.

**How to apply:** Allow the two compared sections to meet at the turning point,
but stop before their interiors overlap; retain a minimum point count and
physical length threshold to avoid flagging short legitimate repeats.