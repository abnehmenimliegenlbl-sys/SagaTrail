---
name: EAS OTA monorepo release
description: Constraints for publishing SagaTrail OTA updates from its nested Expo app.
---

EAS OTA publishing must run with the Expo app directory as the project root. The prepackaged update job ignores `defaults.run.working_directory`; an unknown `params.working_directory` may validate but is ignored. The EAS project/GitHub link must therefore use the mobile app as its base directory.

Pin pnpm through workflow `defaults.tools.pnpm` so the automatic frozen install accepts the workspace lockfile. Keep iOS and Android exports sequential on cold caches, and exclude workspace caches/local data from archives. A direct platform-specific update remains the fallback when linked workflows cannot honor the app root.

**Why:** Root-linked update jobs successfully installed dependencies but then failed because Expo was resolved and executed from the repository root instead of the nested app. Earlier concurrent exports were also killed under cold-cache memory pressure.

**How to apply:** Ensure the EAS trigger is app-root-aware before debugging bundle code. Do not rely on workflow run-step working directories to relocate a prepackaged update job.