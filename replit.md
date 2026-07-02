# SagaTrail

SagaTrail is a native iOS/Android (Expo) Swiss hiking companion that narrates regional Swiss legends (Sagen) live, synced to your route, so the myth of a valley unfolds as you walk it.

## Run & Operate

- Mobile app runs via the `artifacts/mobile: expo` workflow (Expo, port 18115)
- `pnpm --filter @workspace/mobile run typecheck` — typecheck the mobile app
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- Required env (server, staged for later): `DATABASE_URL`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo (expo-router), React Native, react-native-reanimated, react-native-svg
- TTS: expo-speech (de-DE). Storage: @react-native-async-storage/async-storage
- API (staged): Express 5, PostgreSQL + Drizzle, Zod, Orval codegen

## Where things live

- `artifacts/mobile/app/` — expo-router screens: `onboarding.tsx`, `(tabs)/` (index = Kanton-Auswahl, sammlung, gruppe, einstellungen), `kanton/[canton]` (Routen des Kantons), `saga/[id]`, `route/[id]`, `hike/[id]` (live GPS narration), `summary.tsx`, `paywall.tsx`, `legal/[doc]`
- `artifacts/mobile/constants/` — `colors.ts` (brand palette), `typography.ts` (fonts), `sagas.ts` (8 seed sagas), `routes.ts` (8 Wanderrouten, 1:1 zu einer Sage, plus Kanton-Helfer), `onboarding.ts` (cantons, languages, archetypes, age tiers)
- `artifacts/mobile/lib/storyEngine.ts` — generates 4-6 chapters per hike with archetype/age variation and 1-2 decision points; language-aware (pulls text + TTS locale from `storyContent.ts`)
- `artifacts/mobile/lib/storyContent.ts` — multilingual narration source (8 languages), `SPEECH_LOCALE` map, `resolveLang` fallback, per-saga summaries
- `artifacts/mobile/contexts/AppContext.tsx` — AsyncStorage-backed app state (profile, premium, achievements, emergency contact, energiesparmodus, last hike, group session)
- `artifacts/mobile/components/brand/` — SparkMountain, AchievementMarker, SparkDivider, Glass, Background, PrimaryButton, ScreenHeader, RouteMap
- `artifacts/mobile/hooks/useColors.ts` — always returns the dark brand palette

## Architecture decisions

- Curated public-domain sagas only: the app reads sagas exclusively from a curated, verifiably public-domain dataset. There is NO runtime AI saga generation. Each saga carries a structured `quelle` (autor/werk/jahr/fundstelleUrl), per-language `summaries` (8 languages), an `altersstufenHinweis`, and a `koordinatenSicherheit` (`exakt`/`ungefaehr`/`nicht_lokalisierbar`). Saga data is intentionally duplicated between server (`artifacts/api-server/src/lib/curatedSagas.ts`) and mobile (`constants/sagas.ts`) because leaf packages cannot import each other — keep them in sync.
- Online catalog + offline-first: routes/sagas load from the API server (`contexts/CatalogContext.tsx`) with a three-tier source — server, then AsyncStorage cache, then bundled seed (`constants/routes` + `constants/sagas`). The mobile client only sets the API host once (`lib/apiConfig.ts`, from `EXPO_PUBLIC_DOMAIN`). Server `catalogSeed` purges any `catalog_sagas` row not in the curated set, then upserts the curated sagas, so the catalog always contains exactly the curated sagas.
- Nearest-saga matching (routes do NOT own a specific saga): each route resolves to the NEAREST curated saga. Server `catalogSeed` remaps every seed route's `sagaId` to the nearest curated saga (`naechsteKuratierteSagenId`, canton-first then haversine) so the `/catalog` contract never returns a dangling `sagaId`; `routeService.getRouteSaga` uses `findNearestCuratedSaga` for dynamic OSM routes. Mobile `lib/sagaMatch.ts` `nearestSaga` (canton-first haversine, `EXAKT_RADIUS_M = 3500`) drives `getSagaForRoute`/`ensureRouteSaga`; `sagaLokalisierung` marks a route assignment `exakt` only when same canton AND <= 3.5 km, else the UI shows "nicht exakt lokalisierbar". This route-assignment certainty is separate from a saga's intrinsic `koordinatenSicherheit`.
- Dynamic per-canton catalog: all 26 cantons are selectable. Opening a canton fetches REAL OpenStreetMap hiking routes (Overpass, enriched with swisstopo ascent) via `loadCantonRoutes`, falling back to the curated seed routes offline. Dynamic routes live in both a ref (async loaders) and state (re-render). Server `external_routes` TTL refresh upserts with `excluded.*` values.
- SAC difficulty ("beides kombinieren"): OSM keeps the Wanderland named-route discovery; difficulty is resolved in `artifacts/api-server/src/lib/swisstopoHiking.ts` as `sacScaleToT(osm sac_scale) ?? deriveSacFromSwissTlm3d(geometry) ?? "unbekannt"`. `deriveSacFromSwissTlm3d` runs ONE geo.admin polyline `identify` on `ch.swisstopo.swisstlm3d-wanderwege` and maps the hardest `hikingtype` on the route (Wanderweg/null→T1, Bergwanderweg→T3, Alpinwanderweg→T5). The official ASTRA Wanderland layer (`ch.astra.wanderland`) is WMS-only and NOT queryable via `identify`, so it is deliberately not used as a route source; attribution stays truthfully "OpenStreetMap · swisstopo".
- Per-hike offline download (`contexts/DownloadContext.tsx`): downloads the story (server `createStory`, else local `generateStory`) plus a bounded corridor of swisstopo tiles (`lib/offlineTiles.ts`, native only). Live hike resolves stories offline-first via `resolveStory` (local -> server -> seed) and passes local tiles to the map.
- Offline map render: `swisstopoMapHtml.ts` accepts optional `offlineTiles`; a Leaflet `getTileUrl` override prefers local data-URI tiles and falls back to online swisstopo. Web has no filesystem, so tile download/render is native-only and the web map stays online.
- Still staged for later: WebSocket group sync, RevenueCat, Clerk.
- Custom SVG `RouteMap` instead of react-native-maps — cross-platform and web-preview stable.
- App is always dark; `useColors` ignores the OS color scheme.
- Sharing uses React Native's built-in `Share` API (no expo-file-system dependency).
- SOS button in the live hike is intentionally opaque almrausch (never glass) and always visible; calls Rega 1414 / Euro 112 and can SMS a location to an emergency contact.

## Product

- Onboarding collects name, home canton, language, narrative archetype, and age tier to personalise stories.
- Entry flow is location-first: pick the canton (home tab), then a hiking route in that canton (`kanton/[canton]`), then the matching saga (`route/[id]` -> `saga/[id]`), then start the live hike. The home canton is highlighted and free; other cantons are premium-gated.
- Narration follows the selected language (text + TTS voice); the app chrome stays German.
- Live hike narrates a saga chapter-by-chapter as simulated progress advances along the route, with occasional perception decisions that shade the story.
- Collection (Sammlung) tracks discovered sagas and achievements; Group (Gruppe) is a staged shared-session view.
- Summary recaps the route, decisions, and unlocked achievement, shareable via the OS share sheet.

## User preferences

- Code and comments for app-specific logic are written in German.
- Never use emojis anywhere in the app or code.

## Gotchas

- The mobile workflow name is `artifacts/mobile: expo` (not `mobile`).
- expo-speech / expo-sharing show Expo version-mismatch warnings; they run fine — do not "fix" by downgrading blindly.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile UI and native permission patterns
