---
name: Watch active-state source
description: The native Watch bridge derives the displayed active state from the canonical session status, and route loading must not restart story preparation.
---

The Watch's native bridge computes `isHiking` from the canonical `sessionStatus == "active"` value. The JavaScript `isHiking` field is not the authoritative signal on this path.

**Why:** A story-loading effect once depended on the selected route even though it did not use the route. When route data was loaded or replaced, it set `preparing` again; the resulting `sessionStatus: "preparing"` was validly forwarded to the Watch, which stayed in its waiting state even while other narration or POI flows were active.

**How to apply:** Keep story preparation dependencies limited to story inputs. When diagnosing the Watch, inspect the actual `sessionStatus` transition (`preparing` → `active`) before changing native Watch rendering or payload fields.

The Watch UI also uses the same “waiting for hike start” text when no decoded `LiveState` exists. `WCSession.receivedApplicationContext` must therefore be applied again from `activationDidCompleteWith`; reading it immediately after `session.activate()` can see an empty context and leave the Watch state nil.

Optional rich fields such as navigation, map, weather, POI, or audio must be validated independently. One malformed optional block may be omitted and diagnosed, but must never suppress an otherwise valid active core state.

The Watch must not offer a Start button while the phone is awaiting the GPS-based start decision. Starting a new hike remains phone-authoritative; the Watch may only pause or resume an already confirmed hike.