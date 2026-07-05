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
- `artifacts/mobile/constants/` — `colors.ts` (brand palette), `typography.ts` (fonts), `sagas.ts` (8 seed sagas — the offline-first core), `routes.ts` (nur noch Typen `HikingRoute` + `CantonWithRoutes`; KEIN Routen-Seed mehr), `onboarding.ts` (cantons, languages, archetypes, age tiers)
- `artifacts/mobile/lib/storyEngine.ts` — generates 4-6 chapters per hike with archetype/age variation and 1-2 decision points; language-aware (pulls text + TTS locale from `storyContent.ts`)
- `artifacts/mobile/lib/storyContent.ts` — multilingual narration source (8 languages), `SPEECH_LOCALE` map, `resolveLang` fallback, per-saga summaries
- `artifacts/mobile/lib/i18n/` — UI-chrome localization (separate from narration): `languageCode.ts` (LanguageCode type, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE = "en", NATIVE_LANGUAGE_NAMES endonyms), `systemLocale.ts` (detectSystemLanguage via expo-localization), `createStrings.ts` (createUseStrings(dict) hook factory reading AppContext.language), `screens/<screen>.ts` (one strings dict per screen, all 8 languages, TS-enforced completeness)
- `artifacts/mobile/contexts/AppContext.tsx` — AsyncStorage-backed app state (profile, premium, achievements, emergency contact, energiesparmodus, last hike, group session)
- `artifacts/mobile/components/brand/` — SparkMountain, AchievementMarker, SparkDivider, Glass, Background, PrimaryButton, ScreenHeader, RouteMap
- `artifacts/mobile/hooks/useColors.ts` — always returns the dark brand palette

## Architecture decisions

- Curated public-domain sagas only: the app reads sagas exclusively from a curated, verifiably public-domain dataset. There is NO runtime AI saga generation. Each saga carries a structured `quelle` (autor/werk/jahr/fundstelleUrl), per-language `summaries` (8 languages), an `altersstufenHinweis`, and a `koordinatenSicherheit` (`exakt`/`ungefaehr`/`nicht_lokalisierbar`). Saga data is intentionally duplicated between server (`artifacts/api-server/src/lib/curatedSagas.ts`) and mobile (`constants/sagas.ts`) because leaf packages cannot import each other — keep them in sync.
- Sagas are seeded + offline-first; routes are online-only (no seed): sagas load from the API server (`contexts/CatalogContext.tsx`) with a three-tier source — server, then AsyncStorage cache, then bundled seed (`constants/sagas`). Routes have NO bundled seed and NO offline fallback: they come exclusively live per canton from the connected sources (OSM + swisstopo). The mobile client only sets the API host once (`lib/apiConfig.ts`, from `EXPO_PUBLIC_DOMAIN`). Server `catalogSeed` upserts the curated sagas and purges any `catalog_sagas` row not in the curated set, AND purges the entire `catalog_routes` table on every start, so `/catalog` returns `routes: []` and only sagas. The cache-freshness gate keys on `sagas.length` (routes are always empty).
- Route load failure is an explicit error state (no silent seed fallback): `CatalogContext.loadCantonRoutes` returns `source: "error"` with an empty list when the server/OSM is unreachable. `CatalogSource` is `"server" | "cache" | "seed" | "error"`. The Kanton screen (`kanton/[canton].tsx`) shows a "Server nicht erreichbar." hint (`loadError`) instead of pretending offline routes exist.
- Live weather + derived trail condition on the route screen: `GET /routes/weather?lat&lng` (`artifacts/api-server/src/lib/weather.ts` -> `routes/weather.ts`, 15 min in-memory cache) calls Open-Meteo (free, unauthenticated) for the route's start point and derives a `gut`/`vorsicht`/`kritisch` Wegzustand heuristic from precipitation/snow/temperature/gusts — explicitly labeled as a derived estimate, NOT an official closure/avalanche status (no free live Swiss source exists for that). Mobile `route/[id].tsx` fetches it on mount and shows an explicit "Nicht verfügbar" state on failure (no fake numbers).
- Saga resolution is a 3-stage, ranked resolver (routes do NOT own a specific saga): `routeService.getRouteSaga` tries (1) nearest same-canton curated saga, then (2) a synthetic saga built live from a Wikipedia canton-legend search (`lib/wikipedia.ts` `searchCantonLegend` -> `sagaFromWikiSummary`, non-persisted, id prefix `wiki-<canton-slug>`), then (3) nearest curated saga fallback regardless of canton. Mobile only mirrors stage (3): `lib/sagaMatch.ts` `nearestSaga` (canton-first haversine, `EXAKT_RADIUS_M = 3500`) drives `getSagaForRoute`/`ensureRouteSaga`; `sagaLokalisierung` marks a route assignment `exakt` only when same canton AND <= 3.5 km, else the UI shows "nicht exakt lokalisierbar". This route-assignment certainty is separate from a saga's intrinsic `koordinatenSicherheit`.
- Live Wikipedia/OSM POI enrichment (separate from saga resolution): `GET /routes/pois` (`routes/pois.ts` -> `routeService.getPois`, cached) returns nearby historic/tourism OSM nodes (`lib/overpass.ts` `fetchHistoricPois`) enriched with a live Wikipedia summary via `lib/wikipedia.ts` where an OSM `wikidata`/`wikipedia` tag resolves — all through public unauthenticated Wikipedia/Wikidata REST endpoints. Mobile `hike/[id].tsx` fetches POIs for the route's bounding box and surfaces a "nearby" info card, announced once per POI, when the live GPS (or simulated) position comes within ~350 m.
- Dynamic per-canton catalog (distance-aware, bbox pre-selection): all 26 cantons are selectable. Opening a canton fetches REAL OpenStreetMap hiking routes (Overpass, enriched with swisstopo ascent) via `loadCantonRoutes`; there is no offline fallback. Fetching is TWO-phase and distance-aware so that even short local routes surface in route-dense cantons: (1) `fetchCantonRouteIndex` runs `out tags bb;` for ALL named `route=hiking` relations of the canton — cheap even for >1000 relations (Bern ~1324 in ~0.5 MB) — and derives each route's bbox diagonal, a LOWER BOUND on true length. The index is cached in-memory per canton (`INDEX_TTL_MS`, 6 h). (2) `selectCandidates` drops routes whose bbox diagonal exceeds `distMax` (× `BBOX_SLACK` 1.1) BEFORE any geometry is fetched, ranks the rest (network iwn<nwn<rwn<lwn<other, ref-present, name) and caps to `GEOMETRY_POOL_FILTERED` (60) / `GEOMETRY_POOL_DEFAULT` (40). (3) `fetchRouteGeometries` loads `out geom;` only for candidates not already fresh in `external_routes` (batched by 80), stitches geometry (drops `points.length < 2`), computes exact length, enriches (ascent + SAC), upserts. So the first search of a canton is slower (~15-30 s cold: index + geometry) and subsequent searches are fast (index cached, geometry accumulates in `external_routes`). Server `external_routes` TTL refresh upserts with `excluded.*` values.
- Result cap applies AFTER the filter (not before): `cantons.ts` exact-filters the enriched candidate rows (`applyFilter`), then `.sort(byRelevance).slice(0, RESULT_LIMIT)` (16). Combined with the bbox pre-selection, a "0-5 km" search returns the top 16 routes UNDER 5 km, not the 16 highest-ranked routes of the canton (which are all long Wanderland routes) filtered down to whatever happens to be short.
- Long first search has a branded progress UI: because the server does not stream progress, the Kanton screen shows `components/brand/SearchProgress.tsx` while `searching` — an indeterminate reanimated sliding bar plus staged status lines ("… wird durchsucht", "… herausgefiltert", "… Höhenprofile", "… zusammengestellt"). It signals ongoing work without faking a percentage.
- SAC difficulty ("beides kombinieren"): OSM keeps the Wanderland named-route discovery; difficulty is resolved in `artifacts/api-server/src/lib/swisstopoHiking.ts` as `sacScaleToT(osm sac_scale) ?? deriveSacFromSwissTlm3d(geometry) ?? "unbekannt"`. `deriveSacFromSwissTlm3d` runs ONE geo.admin polyline `identify` on `ch.swisstopo.swisstlm3d-wanderwege` and maps the hardest `hikingtype` on the route (Wanderweg/null→T1, Bergwanderweg→T3, Alpinwanderweg→T5). The official ASTRA Wanderland layer (`ch.astra.wanderland`) is WMS-only and NOT queryable via `identify`, so it is deliberately not used as a route source; attribution stays truthfully "OpenStreetMap · swisstopo".
- Season heuristic is a derived estimate, not an official statement (same "derived estimate" precedent as the weather/trail-condition heuristic): `artifacts/api-server/src/lib/season.ts` `deriveSeason(maxElevationM, sac)` returns `"ganzjaehrig" | "eher_sommer" | "nur_sommer"` from the route's max elevation (`elevation.ts` `computeElevationStats`, swisstopo profile) plus its SAC difficulty — no live snow/closure data is used. Server includes `maxElevationM`/`season` on every `CatalogRoute`; mobile shows a season badge on `kanton/[canton].tsx` route cards and a season row + explanatory note on `route/[id].tsx`, both fully localized (8 languages).
- Per-hike offline download (`contexts/DownloadContext.tsx`): downloads the story (server `createStory`, else local `generateStory`) plus a bounded corridor of Carto Voyager base tiles (`lib/offlineTiles.ts`, native only). Live hike resolves stories offline-first via `resolveStory` (local -> server -> local `generateStory`) and passes local tiles to the map. Note: a downloaded route object is what makes a hike replayable offline — there is no route seed to fall back on.
- Offline map render: `swisstopoMapHtml.ts` accepts optional `offlineTiles`; a Leaflet `getTileUrl` override prefers local data-URI tiles and falls back to online Carto Voyager. Web has no filesystem, so tile download/render is native-only and the web map stays online.
- Hands-free voice control for decision points (`lib/useVoiceDecision.ts`, `lib/decisionVoiceMatch.ts`): once a perception decision has finished being read aloud, the app automatically listens (`expo-speech-recognition`) and picks the matching option — spoken ordinal words ("eins/one/un/uno/一" per language) are tried first, then keyword overlap with the option label/hint; no match keeps listening. Like background audio/GPS, this needs a dev/EAS build (not Expo Go/web) and silently falls back to the always-visible tap buttons when unsupported or denied.
- Still staged for later: WebSocket group sync, RevenueCat, Clerk.
- Live/route map basemap (native and web) is Carto Voyager + Waymarked Trails hiking overlay (not swisstopo raster, which felt too busy/cluttered), rendered via Leaflet in a WebView/iframe (`components/brand/swisstopoMapHtml.ts`); the route's own line is drawn on top. The offline-downloaded tile corridor uses the same Carto Voyager base tiles, so offline hikes keep the same look (the Waymarked Trails overlay is not downloaded, being an online-only extra layer). Nearby Seilbahnen/cable cars are fetched server-side (`GET /routes/aerialways`, Overpass) and rendered as dashed lines with small station markers — never fetched client-side, since direct Overpass calls from the app are unreliable.
- Custom SVG `RouteMap` instead of react-native-maps — cross-platform and web-preview stable.
- App is always dark; `useColors` ignores the OS color scheme.
- Sharing uses React Native's built-in `Share` API (no expo-file-system dependency).
- SOS button in the live hike is intentionally opaque almrausch (never glass) and always visible; calls Rega 1414 / Euro 112 and can SMS a location to an emergency contact.

## Product

- Onboarding collects name, home canton, language, narrative archetype, and age tier to personalise stories.
- Entry flow is location-first: pick the canton (home tab), then a hiking route in that canton (`kanton/[canton]`), then the matching saga (`route/[id]` -> `saga/[id]`), then start the live hike. The home canton is highlighted and free; other cantons are premium-gated.
- Narration follows the selected language (text + TTS voice). App chrome (buttons, headers, labels, alerts, empty states) is fully localized into all 8 supported languages — see `lib/i18n/` below.
- Live hike narrates a saga chapter-by-chapter as simulated progress advances along the route, with occasional perception decisions that shade the story.
- Collection (Sammlung) tracks discovered sagas and achievements; Group (Gruppe) is a staged shared-session view.
- Summary recaps the route, decisions, and unlocked achievement, shareable via the OS share sheet.

## User preferences

- Code and comments for app-specific logic are written in German.
- Never use emojis anywhere in the app or code.

## Gotchas

- The mobile workflow name is `artifacts/mobile: expo` (not `mobile`).
- expo-speech / expo-sharing show Expo version-mismatch warnings; they run fine — do not "fix" by downgrading blindly.
- UI-chrome language selection has permanent priority once set (onboarding step 4 or Einstellungen); before that, the app uses the detected system language, falling back to English if unsupported. This UI language is independent from narration language, though they are initialized from the same source.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for mobile UI and native permission patterns
