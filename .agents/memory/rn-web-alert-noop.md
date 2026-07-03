---
name: react-native-web Alert.alert is a no-op
description: Why native confirm dialogs (logout, delete, reset) silently do nothing in the browser/web preview of an Expo app, and why that's expected, not a bug.
---

# `Alert.alert()` does nothing on web

`react-native-web`'s `Alert` module (`Alert.alert()`) is an empty no-op stub — it never renders any UI in a browser. Any app flow gated behind `Alert.alert(title, message, buttons)` (confirm-before-destructive-action patterns like logout, delete account, reset data) will appear completely inert when driven through a browser/Playwright test or the web preview: the button click registers, but no dialog appears and the confirm callback never fires.

**Why:** this is a real, long-standing `react-native-web` limitation, not a project bug. In this codebase multiple existing flows already accept this tradeoff (e.g. data-export, delete-account, logout confirmations all use bare `Alert.alert` with no web-specific fallback) — native iOS/Android is the primary target and web is a secondary preview surface.

**How to apply:** when e2e-testing (or reviewing) any Expo/React Native app on the web preview, do NOT treat an `Alert.alert`-gated action failing to show a dialog as a regression by itself — check whether the same pattern already exists unguarded elsewhere in the codebase before "fixing" it. If a specific confirm flow truly needs to work on web, gate it with `Platform.OS === "web" ? window.confirm(...) : Alert.alert(...)` rather than assuming `Alert.alert` works cross-platform.

## Related: React Query hooks need the API base URL configured before first render

When wiring a generated React Query hook (e.g. orval `useGetX`) into a top-level context provider that mounts early (auth/profile bootstrap), call the base-URL setup (`setBaseUrl`/equivalent) at **module scope** in the root layout — not inside a `useEffect` in a sibling/child provider (e.g. a catalog context) that may mount after or in parallel. Otherwise the first request can fire with an unconfigured base URL on native (relative fetch URLs aren't reliable in React Native).

Also scope any per-user query key and cached local state (e.g. `[...queryKey, userId]`, reset on `userId` change) when auth supports switching accounts on the same device — otherwise a stale cached response from the previous account can flash before refetch.

**React effect ordering caveat:** child effects fire before parent effects, but relying on that ordering across separate providers (e.g. an auth-bridge `useEffect` inside a component nested under a data-fetching provider) is fragile and was flagged in code review as unsafe. The robust fix is to register the token getter **synchronously during render** (not inside `useEffect`) in a component that is an ancestor of the data-fetching provider — parent render always precedes child render/mount, so this guarantees the getter exists before the first request fires, with no dependence on effect scheduling order.

**Error-status handling for "no resource yet" endpoints:** when a fetch-my-profile-style query can 404 (no server record yet) but also fail for other reasons (401 while auth is still warming up, 5xx, network), only treat an explicit `error.status === 404` as "no record — show onboarding/first-run state." Treating *any* query error as "no record" will wrongly wipe local/cached state and bounce authenticated users into onboarding on transient failures.
