---
name: Group location consent
description: Privacy and lifecycle rules for sharing member positions in group hikes
---

Group member location sharing is explicit opt-in per member, not enabled merely by joining a group or starting a hike. Only fresh foreground GPS fixes may be shared over the authenticated group socket; disabling the option must clear the previously shared location on the server.

**Why:** A group session is not consent to expose a person's position, and stale positions can create unsafe assumptions.

**How to apply:** Keep the consent control visible in the group UI, gate the foreground watcher with it, and represent missing or stale locations as unavailable rather than substituting route or saga coordinates.