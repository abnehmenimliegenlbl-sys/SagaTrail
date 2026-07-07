---
name: Prod premium admin endpoint
description: How to grant premium in production (read-only prod DB, separate prod Clerk)
---

Prod DB is READ-ONLY from the workspace (executeSql environment:"production" allows SELECT only) and prod Clerk users are invisible from dev (separate stores, live keys only in the deployment).

**Rule:** grant/revoke premium in prod via `POST /api/admin/premium` (header `x-admin-token` = shared env `ADMIN_TOKEN`, body `{email, monate}`) curled against the prod domain AFTER publishing.

**Why:** no direct prod write path exists; the endpoint resolves the email via prod Clerk at runtime and sets `profiles.premium_bis` (timed premium; effective status = premium flag OR premium_bis > now).

**How to apply:** self-upgrade via PATCH /me/premium is deliberately blocked (403 on premium=true) until a server-verified RevenueCat flow exists — do not "fix" that by re-allowing it.
