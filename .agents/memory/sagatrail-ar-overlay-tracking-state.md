---
name: AR overlay tracking state
description: The AR overlay can display initializing after candidate updates even though the native Viro session is already ready.
---

Do not reset the user-visible tracking state merely because AR candidates or route props refresh. Treat native Viro tracking callbacks as the source of truth and reset only on a real camera-session start or teardown.

**Why:** A physical iOS run showed a mounted Viro scene with native tracking already ready, followed by an overlay reset to initializing while the route renderer still reported trackingReady=true. The misleading pause banner then persisted and masked the later native limited state.

**How to apply:** Separate camera open/close lifecycle effects from candidate/geometry updates. Candidate updates may replace stable marker data, but must preserve the last native tracking state.