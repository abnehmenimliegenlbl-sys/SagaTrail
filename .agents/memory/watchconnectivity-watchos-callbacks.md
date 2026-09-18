---
name: WatchConnectivity watchOS callbacks
description: Target-specific availability rules for WatchConnectivity session lifecycle callbacks.
---

`WCSessionDelegate.sessionDidDeactivate` and `sessionDidBecomeInactive` are
iPhone-side lifecycle callbacks. Do not implement them in the watchOS app
target; the Watch uses normal session activation and reachability updates.

**Why:** Current watchOS SDKs mark `sessionDidDeactivate` unavailable. Adding
it to the single-target SwiftUI Watch app stops the Xcode archive with an
unavailable-method override error, even though the same method is valid in the
iPhone WatchConnectivity bridge.

**How to apply:** When changing delegate code, keep activation, reachability,
application-context, direct-message, and user-info handlers in the Watch
target. Keep deactivation/reactivation handlers only in the iPhone target.