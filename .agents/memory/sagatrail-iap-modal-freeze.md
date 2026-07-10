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
- The same collision pattern also applies to our OWN modal-to-modal/navigation transitions: closing a custom `Modal`-based alert and firing its button's navigation callback (e.g. `router.back()`) in the same tick can deadlock UIKit too — delay the callback by ~250ms until the close animation finishes.

**Expo Go caveat:** in Expo Go, `react-native-purchases` has no native module and silently falls back to "Browser Mode" (`purchases-js` web checkout) — logged as `Using RevenueCat in Browser Mode`. This opens a web checkout overlay instead of the real StoreKit sheet, and that overlay can itself get stuck/frozen after a simulated purchase. Contrary to the note above, this freeze DOES reproduce on a real phone in Expo Go (not just TestFlight) — so it's not purely a testing artifact.

**Confirmed fix (2026-07-10):** delay-tuning (600ms/250ms setTimeouts) never fully closed the race — it just narrowed the window. The actual fix was structural: a debug `[HEARTBEAT]` setInterval(500ms) log in the root layout kept ticking with zero gaps straight through a reported freeze, proving the JS thread was never blocked — the hang was in the native/UIKit layer, not JS. Root cause: `AppModal` (our `Alert.alert` replacement) was built on RN's native `Modal` component, which creates a real UIViewController presentation; overlapping it with StoreKit's/RC-Browser-Mode's own native presentation deadlocked UIKit. Fix: rebuilt `AppModal` as a pure JS overlay (absolutely-positioned `Animated.View`, conditional render on `visible`, no RN `Modal` import at all) — this removes the native presentation entirely, so there is nothing left to collide with StoreKit's sheet regardless of timing. General lesson: if a "freeze" survives even with a live heartbeat log, stop tuning delays and look for anything using RN's native `Modal` near the freeze point — replace it with a JS-only overlay instead of trying to time around the native transition.
