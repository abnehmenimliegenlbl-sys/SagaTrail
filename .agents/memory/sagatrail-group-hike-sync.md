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

## Clerk getToken reference instability breaks GroupSocket
Clerk's `useAuth().getToken` reference can change across renders; if the callback passed
to `GroupSocket` depends on it directly, the socket is torn down/recreated every render
(effect cleanup calls `socket.disconnect()`), which looks like "create session needs
multiple presses" / "join does nothing".
**Why:** effect dependency array included a useCallback whose own deps included `getToken`.
**How to apply:** hold the latest `getToken` in a ref and give the callback passed into
the socket constructor an empty dependency array, so the socket is created once per app
lifetime. Also avoid gating actions like "create session" on a `premium` boolean that is
hydrated asynchronously after mount — let the server be the source of truth and redirect
to paywall only on an actual `premium_required` error.
