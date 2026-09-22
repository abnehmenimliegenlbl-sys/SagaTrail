---
name: OTA dependency closure
description: Why production OTA source-integrity checks can pass while the Expo export still fails on an omitted imported file
---

The OTA source manifest only verifies the files explicitly listed in it. Before publishing from a remote branch, the full mobile import closure must exist on that branch; adding a source file without its imported constants/assets can pass integrity and still fail Metro.

**Why:** The remote branch can lag behind the local workspace. A community screen passed the manifest check but Expo export failed because its imported cover-image constants file was absent remotely.

**How to apply:** When syncing selected files through GitHub or another remote commit path, inspect every new import and its transitive local dependencies before triggering the Production OTA. Treat an export failure naming a missing module as a remote source-closure issue, not as an Expo cache issue.