---
name: GPS-based recommendations
description: Recommendation and onboarding location source for SagaTrail.
---

SagaTrail onboarding must not ask for or require a home canton. Recommendations use the current foreground GPS position across all cantons; if location is unavailable, show an explicit status and use an all-canton fallback rather than an invented home canton.

**Why:** The home-canton onboarding question is obsolete, and a stored canton does not represent where the hiker currently wants to start.

**How to apply:** Keep location permission in the existing permissions flow, request a fresh position when opening recommendations, and never reintroduce `profile.homeCanton` as the recommendation or catalog default.