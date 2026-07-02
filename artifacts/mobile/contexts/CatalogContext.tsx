import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCatalog,
  getCantonRoutes,
  getRouteSaga,
} from "@workspace/api-client-react";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CANTONS } from "@/constants/onboarding";
import {
  ROUTES,
  HikingRoute,
  CantonWithRoutes,
  getRoutesByCanton as curatedRoutesByCanton,
} from "@/constants/routes";
import { SAGAS } from "@/constants/sagas";
import { Saga } from "@/types";
import { configureApiClient } from "@/lib/apiConfig";
import { nearestSaga } from "@/lib/sagaMatch";

/**
 * Katalog-Datenschicht: Routen, Sagen und Kantone kommen bevorzugt vom Server,
 * werden lokal zwischengespeichert und fallen bei fehlender Verbindung sauber
 * auf die im Build hinterlegten Seed-Daten zurueck (Offline-First).
 *
 * Zusaetzlich lassen sich pro Kanton echte Wanderrouten (OpenStreetMap, mit
 * swisstopo-Hoehenmetern) nachladen; jeder Route wird die naechstgelegene
 * kuratierte, gemeinfrei belegte Sage zugeordnet (keine frei erzeugten Sagen).
 * Die Kantonsrouten werden dynamisch gecacht; ohne Verbindung greift der
 * kuratierte Seed.
 *
 * `source` macht die Herkunft transparent:
 * - "server": frisch vom API-Server geladen
 * - "cache":  aus dem lokalen Zwischenspeicher (Server nicht erreichbar)
 * - "seed":   aus den gebuendelten Seed-Daten (weder Server noch Cache)
 */
export type CatalogSource = "server" | "cache" | "seed";

const CACHE_KEY = "sagatrail:catalogCache";
const DYNAMIC_KEY = "sagatrail:dynamicCache";

interface CatalogData {
  routes: HikingRoute[];
  sagas: Saga[];
}

interface DynamicData {
  cantonRoutes: Record<string, HikingRoute[]>;
  routeSagas: Record<string, Saga>;
}

/** Ergebnis eines Kanton-Ladevorgangs samt Herkunft der Routen. */
export interface CantonRoutesResult {
  routes: HikingRoute[];
  source: CatalogSource;
}

interface CatalogContextValue {
  ready: boolean;
  source: CatalogSource;
  routes: HikingRoute[];
  sagas: Saga[];
  cantons: CantonWithRoutes[];
  getRoute: (id?: string) => HikingRoute | undefined;
  getSaga: (id?: string) => Saga | undefined;
  getSagaForRoute: (route: HikingRoute) => Saga | undefined;
  getRouteBySaga: (sagaId?: string) => HikingRoute | undefined;
  getRoutesByCanton: (canton?: string) => HikingRoute[];
  /** Laedt echte Routen des Kantons (Server) mit kuratiertem Offline-Fallback. */
  loadCantonRoutes: (canton: string) => Promise<CantonRoutesResult>;
  /** Liefert die naechstgelegene kuratierte Sage zu einer Route. */
  ensureRouteSaga: (routeId: string) => Promise<Saga | undefined>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const SEED: CatalogData = { routes: ROUTES, sagas: SAGAS };
const EMPTY_DYNAMIC: DynamicData = { cantonRoutes: {}, routeSagas: {} };

/**
 * Kantonsliste fuer den Einstieg: alle 26 Kantone sind waehlbar. Die Zahl der
 * kuratierten Routen dient nur als Vorschau; echte Routen werden beim Oeffnen
 * des Kantons live geladen.
 */
function cantonsFrom(routes: HikingRoute[]): CantonWithRoutes[] {
  const counts = new Map<string, number>();
  for (const r of routes) {
    counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }
  return CANTONS.map((canton) => ({
    canton,
    routeCount: counts.get(canton) ?? 0,
  })).sort((a, b) => a.canton.localeCompare(b.canton, "de"));
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<CatalogSource>("seed");
  const [data, setData] = useState<CatalogData>(SEED);
  const [dynamic, setDynamic] = useState<DynamicData>(EMPTY_DYNAMIC);

  // Refs spiegeln den aktuellen Stand, damit asynchrone Loader nicht auf
  // veralteten Closures arbeiten.
  const dataRef = useRef<CatalogData>(SEED);
  const dynamicRef = useRef<DynamicData>(EMPTY_DYNAMIC);
  dataRef.current = data;
  dynamicRef.current = dynamic;

  // Laufende Server-Anfragen bündeln, damit parallel geöffnete Screens
  // (Route + Sage) nicht dieselbe Abfrage doppelt anstoßen.
  const sagaInFlight = useRef<Map<string, Promise<Saga | undefined>>>(new Map());

  const persistDynamic = useCallback(() => {
    AsyncStorage.setItem(
      DYNAMIC_KEY,
      JSON.stringify(dynamicRef.current),
    ).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    configureApiClient();

    (async () => {
      // Dynamischen Cache (Kanton-Routen + Route-Sagen) hydrieren.
      try {
        const rawDyn = await AsyncStorage.getItem(DYNAMIC_KEY);
        if (!cancelled && rawDyn) {
          const parsed = JSON.parse(rawDyn) as DynamicData;
          const next: DynamicData = {
            cantonRoutes: parsed.cantonRoutes ?? {},
            routeSagas: parsed.routeSagas ?? {},
          };
          dynamicRef.current = next;
          setDynamic(next);
        }
      } catch {
        // Defekter Cache — ignorieren.
      }

      // 1. Server versuchen — die verlaesslichste Quelle.
      try {
        const res = await getCatalog();
        if (cancelled) return;
        const next: CatalogData = {
          routes: res.routes as HikingRoute[],
          sagas: res.sagas as Saga[],
        };
        setData(next);
        setSource("server");
        setReady(true);
        AsyncStorage.setItem(CACHE_KEY, JSON.stringify(next)).catch(() => {});
        return;
      } catch {
        // Server nicht erreichbar — auf Cache ausweichen.
      }

      // 2. Lokalen Zwischenspeicher versuchen.
      try {
        const raw = await AsyncStorage.getItem(CACHE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as CatalogData;
          if (parsed.routes?.length) {
            setData(parsed);
            setSource("cache");
            setReady(true);
            return;
          }
        }
      } catch {
        // Cache defekt — auf Seed ausweichen.
      }

      // 3. Gebuendelte Seed-Daten (immer vorhanden).
      if (!cancelled) {
        setData(SEED);
        setSource("seed");
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadCantonRoutes = useCallback(
    async (canton: string): Promise<CantonRoutesResult> => {
      const cached = dynamicRef.current.cantonRoutes[canton];
      if (cached?.length) {
        return { routes: cached, source: "cache" };
      }
      try {
        const res = await getCantonRoutes(canton);
        const routes = res as HikingRoute[];
        if (routes.length) {
          const next: DynamicData = {
            ...dynamicRef.current,
            cantonRoutes: {
              ...dynamicRef.current.cantonRoutes,
              [canton]: routes,
            },
          };
          dynamicRef.current = next;
          setDynamic(next);
          persistDynamic();
          return { routes, source: "server" };
        }
      } catch {
        // Server/OSM nicht erreichbar — kuratierten Seed nutzen.
      }
      return { routes: curatedRoutesByCanton(canton), source: "seed" };
    },
    [persistDynamic],
  );

  const ensureRouteSaga = useCallback(
    async (routeId: string): Promise<Saga | undefined> => {
      // Direkter Katalogtreffer (Sage-Id == Route-Id bei Seed-Ankern).
      const inCatalog = dataRef.current.sagas.find((s) => s.id === routeId);
      if (inCatalog) return inCatalog;

      // Route lokal finden und die naechstgelegene kuratierte Sage bestimmen —
      // funktioniert offline, da der Sagen-Katalog immer gebuendelt vorliegt.
      const findRoute = (id: string): HikingRoute | undefined => {
        for (const list of Object.values(dynamicRef.current.cantonRoutes)) {
          const hit = list.find((r) => r.id === id);
          if (hit) return hit;
        }
        return dataRef.current.routes.find((r) => r.id === id);
      };
      const route = findRoute(routeId);
      if (route) {
        const match = nearestSaga(
          route.coordinates,
          route.region,
          dataRef.current.sagas,
        );
        if (match) return match;
      }

      // Fallback: Server nach der naechstgelegenen Sage fragen (Route lokal
      // unbekannt, z. B. direkt geöffnete Route-Id ohne geladenen Kanton).
      const pending = sagaInFlight.current.get(routeId);
      if (pending) return pending;

      const request = (async (): Promise<Saga | undefined> => {
        try {
          return (await getRouteSaga(routeId)) as Saga;
        } catch {
          return undefined;
        } finally {
          sagaInFlight.current.delete(routeId);
        }
      })();

      sagaInFlight.current.set(routeId, request);
      return request;
    },
    [],
  );

  const value = useMemo<CatalogContextValue>(() => {
    const { routes, sagas } = data;
    const { cantonRoutes } = dynamic;
    const dynRouteLists = Object.values(cantonRoutes);

    const findDynRoute = (predicate: (r: HikingRoute) => boolean) => {
      for (const list of dynRouteLists) {
        const hit = list.find(predicate);
        if (hit) return hit;
      }
      return undefined;
    };

    return {
      ready,
      source,
      routes,
      sagas,
      cantons: cantonsFrom(routes),
      getRoute: (id) =>
        id
          ? findDynRoute((r) => r.id === id) ?? routes.find((r) => r.id === id)
          : undefined,
      getSaga: (id) => (id ? sagas.find((s) => s.id === id) : undefined),
      getSagaForRoute: (route) =>
        sagas.find((s) => s.id === route.sagaId) ??
        nearestSaga(route.coordinates, route.region, sagas),
      getRouteBySaga: (sagaId) =>
        sagaId
          ? findDynRoute((r) => r.sagaId === sagaId) ??
            routes.find((r) => r.sagaId === sagaId)
          : undefined,
      getRoutesByCanton: (canton) => {
        if (!canton) return [];
        return cantonRoutes[canton] ?? routes.filter((r) => r.region === canton);
      },
      loadCantonRoutes,
      ensureRouteSaga,
    };
  }, [data, dynamic, ready, source, loadCantonRoutes, ensureRouteSaga]);

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog muss innerhalb von CatalogProvider genutzt werden");
  }
  return ctx;
}
