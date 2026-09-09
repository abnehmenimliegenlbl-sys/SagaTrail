---
name: EAS build/submit from Replit workspace
description: How to reliably run eas build/submit from this workspace (timeouts, TTY prompts, missing env) and diagnose ERRORED submissions.
---

Bash tool has a hard 120s limit — long `eas` uploads get killed. The notebook sandbox has NO `EXPO_TOKEN` (secrets aren't exposed there). Working pattern: create a temporary console workflow (autoStart) whose command runs the eas call, tee output to /tmp, then `sleep 3600`; poll the /tmp log from bash; remove the workflow after the exit marker appears.

**Required env in that command:** `EXPO_APPLE_TEAM_ID=R4254XKT8S` — the workflow HAS a TTY, so eas-cli prompts "Apple Team ID:" and hangs forever without it. Also `GIT_OPTIONAL_LOCKS=0` and `EAS_SKIP_AUTO_FINGERPRINT=1`.

**Submissions:** prefer `eas build --auto-submit --no-wait` (submission scheduled server-side after the build) over a separate `eas submit`. If a submission shows ERRORED with `error: null` and empty `logFiles` (query via `curl https://api.expo.dev/graphql -H "Authorization: Bearer $EXPO_TOKEN"` — bash env DOES have EXPO_TOKEN), the likely cause is Apple rejecting a duplicate CFBundleVersion. Verify against App Store Connect directly: PyJWT + `ASC_API_KEY_*` secrets (ES256, aud appstoreconnect-v1) → `GET /v1/builds?filter[app]=...&sort=-uploadedDate`.

**Build numbers:** appVersionSource is "remote", so local ios.buildNumber is ignored for EAS. `eas build:version:set` is prompt-only (fails without TTY, ignores stdin) and can return a generic GraphQL error; prefer autoIncrement in every profile that builds native binaries so the remote counter bumps automatically and the embedded Watch target can be kept in sync.

**Polling:** `timeout 90 npx eas build:view <id> --json` from bash (plain calls can exceed 120s). Log URLs from logFiles expire in 900s; fetch with `curl --compressed`.

**Submission status:** this EAS CLI version has no `submit:view` or `submit:list`; query `submissions.byId(submissionId: ...)` through authenticated GraphQL at `https://api.expo.dev/graphql` and inspect `status`, `error`, and `completedAt`.
