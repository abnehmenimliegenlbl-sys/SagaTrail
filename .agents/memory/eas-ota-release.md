---
name: EAS OTA release
description: Reliable release path for SagaTrail OTA updates when EAS workflow uploads are too large or the project is not linked to GitHub.
---

Use `eas update` directly on the `production` branch for OTA releases when the EAS Workflow dashboard is not connected to the repository. Publish iOS and Android sequentially rather than together, because the combined Expo export can be terminated by the system due to memory pressure. Keep generated `dist`, `.expo`, and native build directories out of workflow source archives.

**Why:** The project can be authenticated with EAS while still lacking an EAS-to-GitHub repository link, and the full workflow source archive can exceed upload/quota limits. Direct platform-specific updates successfully publish the same runtime without a native build.

**How to apply:** Validate the mobile typecheck, run one `eas update --branch production --platform ios` and one for Android, then verify both update groups appear on the `production` branch with the expected runtime and full rollout. Start each update as a background shell: Metro export plus upload can exceed the five-minute foreground limit even when publishing succeeds. If a foreground call times out, check `eas update:list` before retrying; retry only when no new group exists.

**Additional constraint:** The repository's GitHub `origin` may reject pushes when no GitHub OAuth connection is attached to the workspace; the EAS push-trigger workflow cannot run until that authorization exists.

**Why:** A production app publish can create a local `main` commit without authenticating the workspace for the separate GitHub remote.

**How to apply:** If the OTA workflow is push-triggered and GitHub rejects the push, do not ask for a token in chat; use the Replit GitHub connection flow or leave the OTA pending.