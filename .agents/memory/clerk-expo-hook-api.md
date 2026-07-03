---
name: Clerk Expo hook API (signals vs legacy)
description: Why `useSignIn`/`useSignUp` from `@clerk/expo` fail to typecheck with the classic imperative pattern, and where the classic API actually lives.
---

# `@clerk/expo` default hooks are the new "signals" API

In `@clerk/expo` (seen at v3.6.5), the top-level `useSignIn`/`useSignUp` re-exported from `./hooks` -> `@clerk/react` resolve to the newer signal-based/"future" experimental API (`SignInSignalValue`/`SignUpSignalValue`), NOT the classic `{ signIn, setActive, isLoaded }` imperative shape used throughout Clerk's own docs and this project's `clerk-auth` skill templates.

The classic imperative API is still shipped, but under a separate subpath:

```ts
import { useSignIn, useSignUp } from "@clerk/expo/legacy";
```

`useAuth`, `useSSO`, `useOAuth` are unaffected and import fine from the main `@clerk/expo` entrypoint.

**Why:** cost ~30+ minutes digging through `dist/*.d.ts` (`index.d.ts`, `legacy.d.ts`, `hooks/index.d.ts`) to find this; the error surfaces only as confusing generic type mismatches (`SignInSignalValue` etc.), not a clear "wrong import" message.

**How to apply:** when wiring Clerk email/password sign-in/sign-up in Expo with the classic `signIn.create(...)` / `setActive(...)` pattern, always import those two hooks from `@clerk/expo/legacy`, and verify against the installed version's `dist/legacy.d.ts` if it still fails (subpath may change across major versions).
