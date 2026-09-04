---
name: EAS workspace archive exclusions
description: EAS builds launched from the mobile package can archive the Git workspace root.
---

When SagaTrail is built from `artifacts/mobile` inside the pnpm Git workspace, EAS can use the repository root as the archive root. A `.easignore` only inside `artifacts/mobile` is therefore insufficient for workspace-only directories such as `.cache`, `.pythonlibs`, `.config`, and `attached_assets`.

**Why:** An otherwise normal iOS Development Build grew beyond 1 GB and failed during local tarball upload because root workspace data was included.

**How to apply:** Keep the root `.easignore` authoritative and explicitly exclude workspace caches, credentials/tooling directories, local assets, and non-mobile artifacts. Keep `artifacts/mobile/ios` included when a generated native AppDelegate or Config Plugin must reach the native build.