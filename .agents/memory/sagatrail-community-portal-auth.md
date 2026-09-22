---
name: Community portal authentication
description: Authentication boundary between community administrators and commercial partner accounts.
---

Community administrators are a separate portal principal. Their email may exist in `community_admins` without a corresponding `partners` row, so portal magic-link login must use `community_portal_tokens` and must not depend on partner onboarding.

**Why:** Community admins need the same portal entry point for community statistics, but they do not own a partner listing or subscription.

**How to apply:** Keep community-admin login/read access separate from partner profile editing, photo upload, and billing flows; identify the community through the admin-to-community association.