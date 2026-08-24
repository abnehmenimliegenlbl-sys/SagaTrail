---
name: Premium partner proximity
description: Reliability rules for GPS-triggered premium partner announcements.
---

Premium partner proximity is client-side and starts at 500 m. The partner must be active and have `paket=premium`; the announcement request is asynchronous.

**Why:** Marking a partner as announced before the request and playback succeeded caused one timeout, missing text, or a decision-point skip to permanently suppress the partner for the rest of the hike.

**How to apply:** Keep separate in-flight and completed sets. Clear in-flight state on failure, mark completed only when text is available and playback is scheduled, and let decision-state changes retry a deferred announcement.