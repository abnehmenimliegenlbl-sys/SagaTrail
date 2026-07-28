---
name: Long background jobs must live in the server, not the shell
description: Workspace background processes get killed and /tmp is wiped; use server-side fire-and-forget loops
---

Rule: for multi-hour batch jobs (route enrichment, Overpass syncs), never rely on `nohup`/`setsid` shell processes or scripts in `/tmp`.

**Why:** Workspace shell background processes are killed on ShellExec cancellation and environment restarts, and `/tmp` is wiped on restart — a whole fetch script and its resume state were lost mid-session. The API server workflow, however, runs persistently.

**How to apply:** Follow the existing `warm-all` pattern in the admin router: an ADMIN_TOKEN-protected endpoint responds immediately and runs the loop in a fire-and-forget async IIFE with a module-level "already running" guard (e.g. `/admin/routes/enrich-all`). Keep helper scripts in `scripts/` (workspace, survives restarts), never `/tmp`.
