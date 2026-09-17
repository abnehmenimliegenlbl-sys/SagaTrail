---
name: Group location consent
description: Privacy and lifecycle rules for sharing member positions in group hikes
---

Group member location sharing is explicit opt-in per member and per app/group session, not enabled merely by joining a group or starting a hike. A previous opt-in must never be restored after an app restart. Only fresh foreground GPS fixes may be shared over the authenticated group socket; disabling the option or leaving the foreground must clear the previously shared location on the server.

**Why:** A group session or old preference is not current consent to expose a person's position, and stale positions can create unsafe assumptions.

**How to apply:** Keep consent in runtime state only, show the control in the group UI, gate the watcher on active foreground state, clear location when sharing stops or the app backgrounds, and never substitute route or saga coordinates.