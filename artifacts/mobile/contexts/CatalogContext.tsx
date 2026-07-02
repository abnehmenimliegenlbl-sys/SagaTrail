import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCatalog } from "@workspace/api-client-react";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { ROUTES, HikingRoute, CantonWithRoutes } from "@/constants/routes";
import { SAGAS } from "@/constants/sagas";
import { Saga } from "@/types";
import { configureApiClient } from "@/lib/apiConfig";

/**
 * Katalog-Datenschicht: Routen, Sagen und Kantone kommen bevorzugt vom Server,
 * werden lokal zwischengespeichert und fallen bei fehlender Verbindung sauber
 * auf die im Build hinterlegten Seed-Daten zurueck (Offline-First).
 *
 * `source` macht die Herkunft transparent:
 * - "server": frisch vom API-Server geladen
 * - "cache":  aus dem lokalen Zwischenspeicher (Server nicht erreichbar)
 * - "seed":   aus den gebuendelten Seed-Daten (weder Server noch Cache)
 */
export type CatalogSource = "server" | "cache" | "seed";

const CACHE_KEY = "sagatrail:catalogCache";

interface CatalogData {
  routes: HikingRoute[];
  sagas: Saga[];
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
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

const SEED: CatalogData = { routes: ROUTES, sagas: SAGAS };

function cantonsFrom(routes: HikingRoute[]): CantonWithRoutes[] {
  const counts = new Map<string, number>();
  for (const r of routes) {
    counts.set(r.region, (counts.get(r.region) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([canton, routeCount]) => ({ canton, routeCount }))
    .sort((a, b) => a.canton.localeCompare(b.canton, "de"));
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<CatalogSource>("seed");
  const [data, setData] = useState<CatalogData>(SEED);

  useEffect(() => {
    let cancelled = false;
    configureApiClient();

    (async () => {
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

  const value = useMemo<CatalogContextValue>(() => {
    const { routes, sagas } = data;
    return {
      ready,
      source,
      routes,
      sagas,
      cantons: cantonsFrom(routes),
      getRoute: (id) => routes.find((r) => r.id === id),
      getSaga: (id) => sagas.find((s) => s.id === id),
      getSagaForRoute: (route) => sagas.find((s) => s.id === route.sagaId),
      getRouteBySaga: (sagaId) => routes.find((r) => r.sagaId === sagaId),
      getRoutesByCanton: (canton) =>
        canton ? routes.filter((r) => r.region === canton) : [],
    };
  }, [data, ready, source]);

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
