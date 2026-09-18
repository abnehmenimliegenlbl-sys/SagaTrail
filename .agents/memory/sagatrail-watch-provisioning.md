---
name: SagaTrail Watch provisioning
description: One-time EAS credential requirement for the embedded Apple Watch target.
---

The embedded Watch app has its own bundle identifier and therefore needs a
separate provisioning profile, even though it shares the iPhone app's Apple
distribution certificate.

**Why:** EAS correctly discovers both targets, but a non-interactive build
cannot create the first internal-distribution profile for a newly added Watch
bundle identifier.

**How to apply:** Before the first non-interactive iOS development or production
build containing the Watch app, create or upload credentials for the Watch
bundle in the project's iOS credentials. After that one-time setup, existing
non-interactive workflows can reuse them.