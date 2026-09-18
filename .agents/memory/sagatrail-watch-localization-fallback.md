---
name: Watch localization fallback
description: Prevents partially translated Watch screens when copy is split across multiple dictionaries.
---

Resolve every Watch text table for the selected SagaTrail language before using German fallback text. Persist translated complication labels with the selected language, and expose internal HealthKit states as translation keys rather than German UI strings.

**Why:** Looking in the German main dictionary before the selected language’s shared dictionary made existing translations appear German. Raw workout statuses and old complication snapshots created the same mixed-language result.

**How to apply:** When adding Watch UI or complication text, add the key for all supported languages and run a key-coverage check across every copy table. Technical system errors belong in logs; visible status uses a localized generic key.