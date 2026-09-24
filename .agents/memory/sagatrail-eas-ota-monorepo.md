---
name: EAS OTA monorepo release
description: Constraints for publishing SagaTrail OTA updates from its nested Expo app.
---

EAS OTA publishing must run with the Expo app directory as the project root. The prepackaged update job ignores `defaults.run.working_directory`; an unknown `params.working_directory` may validate but is ignored. The EAS project/GitHub link must therefore use the mobile app as its base directory.

Pin pnpm through workflow `defaults.tools.pnpm` so the automatic frozen install accepts the workspace lockfile. Keep iOS and Android exports sequential on cold caches, and exclude workspace caches/local data from archives. A direct platform-specific update remains the fallback when linked workflows cannot honor the app root.

**Why:** Root-linked update jobs successfully installed dependencies but then failed because Expo was resolved and executed from the repository root instead of the nested app. Earlier concurrent exports were also killed under cold-cache memory pressure.

**How to apply:** Ensure the EAS trigger is app-root-aware before debugging bundle code. Do not rely on workflow run-step working directories to relocate a prepackaged update job. For non-interactive `eas update`, pass the matching `--environment` explicitly; production uses `--environment production`.

A connected GitHub API integration does not imply that local `git push` is authenticated. Its REST proxy can manage API resources but cannot upload an existing local Git history. Do not replace a history-preserving release with a single snapshot commit without explicit user approval.

**Why:** Local Git push authentication can fail independently while the GitHub connector remains usable; an API snapshot would squash the local commit chain.

**How to apply:** Before an OTA triggered by push to `main`, confirm normal Git push access. If it fails, stop before publishing; ask the user to restore Git push access, or offer a snapshot only with clear disclosure that commit history will not be preserved.