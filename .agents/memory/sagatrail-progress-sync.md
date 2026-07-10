---
name: SagaTrail hike history/achievements server sync
description: Fixed "Sammlung (collection) screen empty after logout/login" data-loss bug
---

Root cause: `hikeHistory` (completed hikes / diary) and `achievements` (unlocked sagas) were stored ONLY in `AsyncStorage` on the mobile client, unlike `profile`/`premium` which sync with the server. `resetAll()` (called on every logout) wipes AsyncStorage, so logging back in — even on the same device — showed an empty "Sammlung" screen with no way to recover the data.

**Why:** profile/premium had a server source of truth from an earlier iteration; hikeHistory/achievements were added later and never got the same treatment, creating an inconsistent persistence model within the same app.

**How to apply / current design:**
- `profiles` table gained `hikeHistory`/`achievements` jsonb columns (loose schema — server treats entries as opaque objects keyed by `id`, doesn't interpret hike-session-specific fields like chapters/geometry).
- New endpoint `POST /me/progress/sync` takes the client's current arrays and returns the **union by id** merged with whatever is already stored server-side — it must never delete, since a client syncing with stale/empty local state (e.g. right after a fresh login) should never wipe out already-recorded achievements/hikes.
- Client (`AppContext.tsx`) pushes on every `saveHike`/`addAchievement`/`attachHikePhoto`, and once per login (guarded by a ref keyed on `userId` to avoid loops), always applying the merged server response back to local state + AsyncStorage.
- Caveat: hikes completed and lost *before* this fix shipped are only recoverable if the user's original device still has them in AsyncStorage (i.e., they never logged out there) — advise the user to log in with the fix on that specific device first so the one-time sync-on-login uploads the pre-existing local data to the server.
