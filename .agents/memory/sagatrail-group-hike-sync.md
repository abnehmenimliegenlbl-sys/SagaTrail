---
name: SagaTrail group hike sync
description: Design rules for the leader-only live group hike sync over the groups WebSocket.
---

- Leader-only decisions are enforced SERVER-side (`broadcastHikeEvent` checks `leaderId`), never just hidden client-side.
- **Why:** Members must not be able to inject decisions by crafting raw WS messages.
- Non-fatal WS error codes (`not_leader`, `invalid_message`) must be ignored by the mobile client; treating every `error` as fatal kills the whole group session on a harmless protocol rejection.
- Sync events carry a `receivedAt` marker in AppContext state so identical consecutive events still trigger effects, and hike screens process each event exactly once via a ref.
- Late joiners: the leader re-broadcasts the current chapter whenever the member count changes (there is no server-side snapshot).
- A member's open decision point only closes when the incoming decision targets the currently shown chapter — otherwise state drifts.
