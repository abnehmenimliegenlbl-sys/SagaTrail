---
name: Profile rebuild wipes optional fields
description: Client-side loss of purchasedPacks when local Profile is rebuilt from a server response without copying all fields.
---
Rule: any code path that rebuilds the local Profile object from a server response and persists it (state + AsyncStorage) must copy ALL profile fields — especially `purchasedPacks` — not just the editable subset.

**Why:** A user's purchased Schwyz pack "disappeared" after finishing a hike; server DB was intact. `applyServerProfile` rebuilt the profile without `purchasedPacks` and overwrote local state/AsyncStorage. All profile API responses DO include `purchasedPacks`, so the fix is to take it from the response, with a `profileRef.current?.purchasedPacks` fallback.

**How to apply:** When adding new Profile fields, grep for every `setProfile(` / `AsyncStorage.setItem(KEYS.profile` site and ensure the field survives all rebuild paths (server-hydration effect + applyServerProfile).
