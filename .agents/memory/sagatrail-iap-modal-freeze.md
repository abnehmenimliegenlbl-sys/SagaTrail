---
name: SagaTrail native Modal after IAP freeze
description: Real-device (TestFlight) "app freezes after premium purchase" root cause and fix pattern
---

Symptom: after a real (TestFlight/production) in-app purchase completes, the app goes completely unresponsive (not a JS crash, no error/log — matches user reports of "freeze" rather than "crash").

Root cause: react-native's `Modal` component (used by our custom `appAlert`/`AppModal`) is backed by a native UIViewController presentation on iOS. Presenting it immediately after Apple's own StoreKit purchase confirmation sheet is still closing — or after the screen that triggered it has already been unmounted/navigated away from — causes two native presentation transitions to collide, deadlocking UIKit. This is silent: no exception, no crash report, just a frozen app requiring force-quit.

**Why:** StoreKit's automatic post-purchase message ("You're all set / Your purchase was successful") and any navigation transition away from the paywall screen are both native transitions; a same-tick or too-soon native Modal.show() on top of them is a classic collision.

**How to apply:**
- After any `Purchases.purchasePackage()` / `restorePurchases()` resolves, delay showing a follow-up native `Modal`-based alert by ~600ms so StoreKit's own UI can fully dismiss first.
- Guard delayed alerts with an `isMounted` ref so they never fire after the triggering screen has been navigated away from.
- Add a client-side timeout around the purchase call itself so a genuinely hung native purchase doesn't leave the UI stuck in a busy/loading state forever.
