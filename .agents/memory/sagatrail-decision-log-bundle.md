---
name: SagaTrail decision log bundle
description: How to distinguish a missing decision-flow execution from a broken remote debug transport.
---

When `peak_camera` or `story_audio` reaches `/api/debug/log` but `decision_flow`
does not, the remote logger and endpoint are working; the tested session either
did not mount the decision screen path or is running a bundle without the
decision instrumentation. The hike screen emits `screen_instance_mounted`
before any prompt, so its absence is stronger evidence than a missing
`prompt_started` event.

**Why:** Repeatedly adding prompt guards cannot explain an empty `decision_flow`
tag when other tags from the same app and endpoint arrive normally.

**How to apply:** First correlate the exact client session and bundle with
`screen_instance_mounted`; only analyze prompt duplication after that event is
present. Do not infer a duplicate prompt from camera-only deployment logs.