# SagaTrail

SagaTrail is a native iOS/Android (Expo) Swiss hiking companion that narrates regional Swiss legends (Sagen) live, synced to your route, so the myth of a valley unfolds as you walk it.

## Run & Operate

- Mobile app runs via the `artifacts/mobile: expo` workflow; API server via `artifacts/api-server: API Server` (port 5000)
- `pnpm --filter @workspace/mobile run typecheck` / `pnpm run typecheck` (full)
- Server env: `DATABASE_URL`; Admin: `ADMIN_TOKEN` (Secret, see Gotchas)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (expo-router), React Native, reanimated, react-native-svg, expo-speech, AsyncStorage
- API: Express 5, PostgreSQL + Drizzle, Zod, Orval codegen, Anthropic (story generation), ElevenLabs (premium TTS)

## Where things live

- `artifacts/mobile/app/` — screens: `onboarding`, `(tabs)/` (index = Kanton-Auswahl, sammlung, gruppe, einstellungen), `kanton/[canton]`, `saga/[id]`, `route/[id]`, `hike/[id]` (live GPS narration), `summary`, `paywall`, `legal/[doc]`
- `artifacts/mobile/constants/` — brand palette, fonts, 8 seed sagas (offline core), route TYPES only (no route seed), onboarding data
- `artifacts/mobile/lib/` — `storyEngine.ts` (local fallback chapters), `storyContent.ts` (8-language narration source + TTS locales), `i18n/` (UI-chrome strings, one dict per screen, TS-enforced 8-language completeness)
- `artifacts/mobile/contexts/` — `AppContext` (AsyncStorage app state), `CatalogContext` (sagas/routes), `DownloadContext` (offline stories + tiles)
- `artifacts/mobile/components/brand/` — brand components incl. the Leaflet map HTML (`swisstopoMapHtml.ts`)
- `artifacts/api-server/src/lib/` — curated sagas, story/POI generation, OSM/swisstopo/weather/season/custom-route logic

## Architecture decisions

- Curated public-domain sagas only, NO runtime AI saga generation. Each saga has structured `quelle`, 8-language `summaries`, `altersstufenHinweis`, `koordinatenSicherheit`. Saga data is deliberately duplicated server (`curatedSagas.ts`) / mobile (`constants/sagas.ts`) — leaf packages can't import each other; keep in sync.
- Sagas are three-tier offline-first (server -> AsyncStorage cache -> bundled seed); routes are ONLINE-ONLY (no seed, no offline fallback). Route load failure is an explicit error state (`source: "error"`, "Server nicht erreichbar." hint) — never a silent fallback.
- Story style is version-cached: the Anthropic prompt (`storyGenerator.ts`) produces scenic chapters (120-200 words, sensory detail, direct speech, tension arc — no summary tone). Any prompt change MUST bump `STORY_SOURCE` in `routes/stories.ts` AND the `storyKeyPrefix` in `DownloadContext.tsx` together (server filters cache on source and lazily upserts; client ignores old local chapters).
- Premium AI voice (ElevenLabs via server) falls back to on-device expo-speech on failure — narration never goes silent; a visible "nicht verfuegbar" hint appears (no silent swap). Free tier always uses expo-speech.
- Crash-safe resume: `ActiveHike` persists the FULL route object (routes are online-only, catalog is empty after cold start); the hike screen uses it as last-resort fallback.
- Saga resolution is a 3-stage ranked resolver (routes don't own a saga): nearest same-canton curated -> live Wikipedia canton-legend synthetic (`wiki-` prefix, not persisted) -> nearest curated regardless of canton. Route-assignment certainty (`exakt` = same canton AND <= 3.5 km) is separate from a saga's intrinsic `koordinatenSicherheit`.
- Per-canton route catalog is two-phase and distance-aware: cheap Overpass tags+bbox index over ALL canton hiking relations first (bbox diagonal = lower bound on length, 6 h in-memory cache), THEN geometry only for filtered candidates; result cap (16) applies AFTER the distance filter — so short-route searches surface short routes, not truncated long ones. First canton search is slow (~15-30 s cold); a branded indeterminate progress UI (`SearchProgress`) bridges it without faking a percentage.
- SAC difficulty: OSM `sac_scale` first, else ONE swisstopo TLM3D `identify` on the polyline (hardest `hikingtype` -> T1/T3/T5), else "unbekannt". ASTRA Wanderland layer is WMS-only (not identifiable) — deliberately not a route source.
- Weather/trail condition and season are DERIVED estimates, clearly labeled as such (Open-Meteo heuristic; season from max elevation + SAC) — never presented as official closure/avalanche status; failures show an explicit "Nicht verfuegbar" state, no fake numbers.
- POIs: server-side Overpass historic/tourism nodes enriched with live Wikipedia (`GET /routes/pois`); Wikipedia geo-search capped per request. Mobile fetches with TIGHT 0.5 km bbox padding (dense cities blow up Overpass otherwise), keeps a 300 m corridor around the track (100 m proved too sparse in field test), announces once within ~350 m. POI markers have a 36-px tap area; the map legend sits above the attribution (z-index/margin).
- Map: Carto Voyager + Waymarked Trails overlay via Leaflet in WebView/iframe (swisstopo raster felt too busy); collapsible localized legend; aerialways fetched server-side only (client Overpass calls are unreliable). Offline download stores the story + a Carto tile corridor (native only; web stays online).
- Custom routes (`GET /routes/custom`) use the FOSSGIS Valhalla router with `costing: "pedestrian"` — NOT the OSRM demo server, which serves car data regardless of URL profile (foot routes went over motorways). Enrichment identical to canton routes.
- Rundweg detection is client-side from geometry (start-end gap <= max(0.5 km, 5% of length)); point-to-point hikes get a transit deeplink for the return leg.
- Hands-free voice decisions (expo-speech-recognition): auto-listen after a decision is read; ordinals first, then keyword overlap; falls back silently to tap buttons. Needs dev/EAS build.
- Group hikes: WebSocket with server-enforced leader-only hike events; members follow chapters/decisions with disabled controls; non-fatal WS errors never close the socket; late joiners resync via rebroadcast.
- Monetization (RevenueCat): offering `default` = 5 subscriptions (entitlement `premium` on all, `elite` on both Elite tiers); offering `packs` = ONE consumable product `sagatrail_kantonspack` (6.90, multi-purchasable). The 26 `pack_<kantonSlug>` entitlements are granted SERVER-side only (`POST /me/packs/claim` counts RevenueCat purchases vs granted packs) — the client never grants itself packs, and tries to claim an open purchase BEFORE any new buy (409 = none open). First discovered saga per canton is free (`freieSagen` in AppContext). Never hardcode prices — always read offering packages. `kantonSlug` is deliberately triplicated (scripts, mobile lib, claim lib) — keep in sync. Admin/inspection scripts live in `scripts/src/`.
- Custom SVG `RouteMap` (not react-native-maps); app is always dark (`useColors` ignores OS scheme); sharing via built-in `Share` API; SOS button is always visible and opaque (Rega 1414 / 112 + emergency SMS).
- Still staged: Clerk (partially wired), GSW voice product (4.90).

## Product

- Onboarding: name, home canton, language, archetype, age tier — personalises stories.
- Flow is location-first: canton -> route -> saga -> live hike. Home canton free; others premium-gated.
- Narration language = selected language (text + TTS); UI chrome fully localized (8 languages) and independent of narration language.
- Live hike narrates chapter-by-chapter with perception decisions that shade (never change) the story; interrupted hikes resume via home-tab card; summary is shareable.
- Smartwatch turn notifications ~100 m before turns; POI notifications with Wikipedia image attachment (iOS). Web no-op; needs dev/EAS build.

## User preferences

- Code and comments for app-specific logic are written in German.
- Never use emojis anywhere in the app or code.

## Gotchas

- The mobile workflow name is `artifacts/mobile: expo` (not `mobile`).
- `ADMIN_TOKEN` only as Secret, NEVER as env var (all env scopes land in plaintext in the versioned `.replit`). A leaked value was rotated 2026-07-08.
- expo-sharing/expo-speech/expo-localization MUST stay on SDK-54 versions (~14.0.8 / ~14.0.8 / ~17.0.9): SDK-55 versions work in dev/web but fail to compile in the real iOS EAS build.
- Background audio/GPS, voice control, notifications: dev/EAS build required (not Expo Go/web).
- UI-chrome language choice is permanent once set; before that, detected system language with English fallback.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile UI and native permission patterns
