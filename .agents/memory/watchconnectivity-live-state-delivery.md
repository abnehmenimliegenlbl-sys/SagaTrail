---
name: WatchConnectivity live-state delivery
description: Reliable delivery of SagaTrail live hike state from the iPhone to the Apple Watch
---

The phone must keep the latest hike state in `applicationContext` for an unreachable watch, but when `WCSession.isReachable` is true it must also send the same state with `sendMessage`. Do not return immediately after a successful `updateApplicationContext`; that leaves an active watch waiting for delayed context delivery.

**Why:** The watch could remain on its waiting screen even though the phone had already published `sessionStatus: "active"`. The persisted context is eventually delivered, but it is not a reliable immediate-start channel.

**How to apply:** Use `applicationContext` as the durable fallback and the direct message channel as the immediate path. Only fall back to `transferUserInfo` when neither direct delivery nor a successful context update is available.