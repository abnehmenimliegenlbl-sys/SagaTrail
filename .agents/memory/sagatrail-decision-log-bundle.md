---
name: SagaTrail decision log bundle
description: How to distinguish a missing decision-flow execution from a broken remote debug transport.
---

When `peak_camera` reaches `/api/debug/log` but `decision_flow` does not appear
in a deployment log, that is not enough evidence that the decision path did
not run. Deployment logs are ephemeral and can lose the relevant session.
Decision and story-audio events must be persisted and queried by hike/session
identity before concluding that the screen path was not mounted. The hike
screen emits `screen_instance_mounted` before any prompt, so its absence in the
persistent session bundle is stronger evidence than a missing `prompt_started`
event.

**Why:** Repeatedly adding prompt guards cannot explain an empty `decision_flow`
tag when the only available evidence is a truncated or restarted server log.
The previous fire-and-forget logger silently discarded transport failures.
Broad deployment-log searches can also omit earlier events; exact trace and
short time-window queries exposed acknowledgements that were missing from the
full-day result. A source-ready event alone does not prove playback completed.

**How to apply:** Prefer the persisted `decision_flow` and `story_audio` bundle
by client hike/session identity; correlate it with `screen_instance_mounted`.
If only deployment logs are available, narrow by exact trace ID and timestamp,
then distinguish player creation, playback-start/native-playing, and a
`finished` outcome. Do not infer a duplicate prompt from camera-only logs or
from a source-ready event alone.