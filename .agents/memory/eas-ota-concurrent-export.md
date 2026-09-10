---
name: EAS OTA concurrent export
description: Concurrent iOS and Android Expo OTA exports can kill one Metro export with SIGKILL.
---

Production OTA exports should run one platform at a time when Metro starts with a cold cache.

**Why:** Running iOS and Android exports concurrently caused the Android Expo export to terminate with SIGKILL, while the same export succeeded when retried alone.

**How to apply:** Publish one platform, wait for completion, then publish the other; treat a SIGKILL during `expo export` as a resource/concurrency failure before changing application code.