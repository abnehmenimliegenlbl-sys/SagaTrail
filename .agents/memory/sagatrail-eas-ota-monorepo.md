---
name: EAS OTA monorepo root
description: SagaTrail's EAS OTA workflow belongs to the mobile app root, not the repository root.
---

EAS Workflows must be discovered from the Expo app directory that contains `eas.json`; for SagaTrail that directory is `artifacts/mobile`. Linking the GitHub repository at the monorepo root makes EAS report that no workflow files exist.

**Why:** The repository root contains a different Expo configuration, while the production update workflow and SagaTrail project configuration live under the mobile artifact.

**How to apply:** Restore an EAS project/app-root-aware trigger for `artifacts/mobile` before troubleshooting code or creating root-level workflow files; do not publish from the root Expo project.