---
name: API startup Stripe reconciliation
description: Startup side effects from the API server's managed Stripe webhook reconciliation.
---

Treat API-server restarts as potentially mutating Stripe configuration. Startup reconciliation compares managed webhook endpoints with the local registry, removes stale registry rows when Stripe returns 404, and can delete Stripe endpoints considered orphaned.

**Why:** A routine API workflow restart unexpectedly ran this reconciliation and removed an orphaned webhook endpoint in the configured Stripe account.

**How to apply:** Before restarting the API for verification, consider that startup may alter webhook configuration; do not assume the restart is read-only.