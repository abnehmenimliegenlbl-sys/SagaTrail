---
name: SagaTrail Cloud Vision authentication
description: Authentication boundary for the server-side Cloud Vision integration.
---

Cloud Vision must use a dedicated Google service account whose JSON credential is stored as a Replit Secret. Do not reuse the EAS/Google Play submission account or a Gemini API key.

**Why:** Image recognition is a separate server capability and should follow least privilege; mixing it with release credentials increases blast radius and makes rotation harder.

**How to apply:** Keep the credential server-side, pass only short-lived OAuth access tokens to the Vision REST API, and rotate/revoke the JSON key if it is ever exposed.