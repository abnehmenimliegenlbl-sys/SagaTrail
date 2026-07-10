---
name: SagaTrail premium purchase "already subscribed" bug
description: Why a confirmed StoreKit purchase could still leave a user without premium after restart, and how the paywall must treat "already subscribed" as success.
---

When a user taps Buy on an entitlement they already own, StoreKit/Play can respond with a native "you are currently subscribed" dialog and reject `Purchases.purchasePackage()` with an error (RevenueCat `PRODUCT_ALREADY_PURCHASED_ERROR` / message containing "already subscribed"), instead of resolving as a purchase success.

**Why:** the paywall's catch-all error handler treated this as a failed purchase and never refetched `customerInfo` or triggered the server sync (`unlockPremium`/`POST /me/premium/sync`). Since the entitlement really was active, the user saw "purchase confirmed" on Apple's side but the app's local + server premium flag never got updated — surviving across restarts because the sync only runs reactively off `isSubscribed` changes, which never changed.

**How to apply:** any purchase-error handler must special-case "already purchased/subscribed" (check `err.code === "2"` or message regex `/already\s+(subscribed|purchased|owns|active)/i`) and treat it as a restore: call `refreshCustomerInfo()`/refetch customer info so `isSubscribed` flips true and the existing AppContext sync effect fires, then show a success (not error) message. Separately, RevenueCat identity linking (`Purchases.logIn(clerkUserId)` at app start) has no retry — if it fails once (e.g. transient network at cold start), the app stays on the anonymous RC id all session and the server never checks the right customer; added a 3x retry with backoff plus an AppState-foreground retry as a safety net (`artifacts/mobile/lib/revenuecat.tsx`).
