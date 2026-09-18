---
name: EAS pnpm version
description: EAS OTA archives need the workspace pnpm version pinned to accept the frozen lockfile.
---

Pin the workspace package manager to the pnpm version that generated the lockfile. Otherwise EAS can find `pnpm-lock.yaml` but reject it as incompatible before the OTA export.

**Why:** The local workspace uses pnpm 10 and a lockfile v9; the EAS workflow did not have a package-manager version pinned and rejected the lockfile during frozen install.

**How to apply:** Keep `packageManager` in the root package manifest synchronized with the lockfile generator before triggering OTA workflows.