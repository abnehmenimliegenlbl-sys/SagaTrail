---
name: SagaTrail Referral System
description: Architecture of the invite-a-friend referral system — DB schema, API routes, reward trigger, mobile screens.
---

## Rules
- `profiles.referral_code TEXT UNIQUE` — generated on first GET /me/referral-code call (6-char ABCDE23-style)
- `profiles.pending_pack_rewards INT DEFAULT 0` — incremented when an invitee's first premium purchase is confirmed
- `referrals` table: `inviter_id`, `invitee_id UNIQUE`, `status` (pending→rewarded), `rewarded_at`

**Why:** RC connector is read-only (403 on grant); pack access lives in `purchasedPacks` DB column; reward must go through the same column.

## Trigger
POST /me/premium/sync — if `!bestehend.premium && premiumAktiv` → call `rewardReferralInviter(userId)` fire-and-forget. Finds a pending referral for the invitee, marks it rewarded, increments inviter's `pending_pack_rewards`.

## Mobile Flow
- Einstellungen screen: "Freunde einladen" shows hint text (i18n: `freundeEinladenHint`) + "Einladungscode einlösen" row that opens a Modal with TextInput → POST /api/referrals/claim
- Home/index screen: banner when `pendingPackRewards > 0` → navigates to `/referral-reward`
- referral-reward.tsx: canton picker + POST /api/me/pack-reward/claim; invalidates profile query after success

## How to Apply
- To add more reward triggers (e.g. anniversary), increment `pending_pack_rewards` via `sql\`${profilesTable.pendingPackRewards} + 1\`` (Drizzle sql template required for atomic increment)
- Claim is idempotent: POST /referrals/claim returns `{ok:true, alreadyClaimed:true}` if already linked
