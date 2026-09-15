---
name: Native OTA API base URL
description: Why native OTA bundles must carry a production API fallback when EAS environment variables are not present.
---

Native mobile bundles must have a static production API base URL in Expo config as a fallback. `EXPO_PUBLIC_DOMAIN` is injected by the local workflow and may be absent during an EAS Update export; without a fallback, direct native uploads construct an invalid URL while relative generated-client requests may fail differently.

**Why:** An OTA can publish successfully while native profile writes silently fail if the bundle has no API host.

**How to apply:** Keep the development environment override for proxy testing, but resolve the native production host from `Constants.expoConfig.extra` when the environment variable is absent. Do not require a native rebuild solely for this JS/config fallback.