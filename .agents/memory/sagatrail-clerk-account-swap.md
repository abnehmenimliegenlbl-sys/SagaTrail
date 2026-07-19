---
name: SagaTrail Clerk account swap
description: Which Clerk instance the app uses and where the keys live after the July 2026 swap
---
The original external Clerk instance (glowing-jackal-56) belonged to an account the user had NO access to — Apple native login could never be configured there. Replaced July 2026 with the user's own new Clerk account (instance vast-shiner-71, external, user has dashboard access).

**Key locations:** CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY exist as Replit Secrets only (old plaintext copies in `.replit` env vars deleted). `eas.json` hardcodes the pk_test for TestFlight builds (publishable = public, OK). A stale `VITE_CLERK_PUBLISHABLE_KEY` secret may still hold the old key; nothing reads it.

**Why:** dev keys of an inaccessible tenant block production forever (no pk_live obtainable); all prior test users were lost by design (pre-launch).

**How to apply:** Apple native login requires the app registered in the USER's Clerk dashboard → Native Applications (Bundle ID com.sagatrail2.app, App ID Prefix R4254XKT8S). If "is invalid" recurs, check that registration first. Old accounts cannot be migrated.
