---
name: Safety check-in durability
description: Reliability rules for check-in expiry, restoration, and confirmation across iOS backgrounding and termination.
---

A started safety check-in must use a native scheduled notification tagged to one stable hike identity. Persist the intended expiry before scheduling, reconcile the persisted record against the native scheduled-notification list on restore, and retain overdue state after expiry.

**Why:** JavaScript intervals stop when iOS suspends or terminates the app. Best-effort cancellation and non-transactional persistence can also create orphan or duplicate safety alarms after the user has confirmed they are safe.

**How to apply:** Serialize start/hydration/confirmation. Reconcile to exactly one notification for the stored expiry, retry failed reconciliation, and write a durable cancellation tombstone before awaiting removal of every tagged native notification.