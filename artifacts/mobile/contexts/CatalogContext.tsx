import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getCatalog,
  getCantonRoutes,
  getRouteSaga,
  type GetCantonRoutesParams,
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
import { HikingRoute, CantonWithRoutes } from "@/constants/routes";
import { SAGAS } from "@/constants/sagas";
import { Saga } from "@/types";
import { nearestSaga, nearestNSagas } from "@/lib/sagaMatch";
import { normalizeSagaTitle, normalizeSagaTitles } from "@/lib/sagaTitle";

/**
 * Katalog-Datenschicht: Sagen kommen vom Server, werden lokal
 * zwischengespeichert und fallen bei fehlender Verbindung auf die gebuendelten
 * Seed-Sagen zurueck. Routen gibt es NICHT mehr als Seed — sie kommen
 * ausschliesslich live pro Kanton aus den verbundenen Quellen (OSM + swisstopo).
 *
 * Zusaetzlich lassen sich pro Kanton echte Wanderrouten (OpenStreetMap, mit
 * swisstopo-Hoehenmetern) nachladen; jeder Route wird die naechstgelegene
 * kuratierte, gemeinfrei belegte Sage zugeordnet (keine frei erzeugten Sagen).
 * Die Kantonsrouten werden dynamisch gecacht; ohne Verbindung wird dieser
 * Cache mit lokal angewendetem Filter verwendet, sofern vorhanden.
 *
 * `source` macht die Herkunft transparent:
 * - "server": frisch vom API-Server geladen
 * - "cache":  aus dem lokalen Zwischenspeicher (Server nicht erreichbar)
 * - "seed":   aus den gebuendelten Seed-Sagen (weder Server noch Cache)
 * - "error":  Server/OSM nicht erreichbar; es gibt keinen Routen-Seed als Ersatz
 */
export type CatalogSource = "server" | "cache" | "seed" | "error";

// Inhaltsänderungen bei gleichbleibender Saga-Anzahl müssen alte Geräte-Caches
// verwerfen können (z. B. redaktionelle Ersatzsagen).
const CACHE_KEY = "sagatrail:catalogCache:v3";
const DYNAMIC_KEY = "sagatrail:dynamicCache";

interface CatalogData {
  routes: HikingRoute[];
  sagas: Saga[];
}

interface DynamicData {
  cantonRoutes: Record<string, HikingRoute[]>;
  routeSagas: Record<string, Saga>;
  /**
   * Selbst per Start/Ziel angegebene Routen (server-seitig live berechnet,
   * NICHT auf einen Kanton-Katalog persistiert). Nur im Speicher gehalten
   * (nicht Teil des AsyncStorage-Caches), da sie pro Anfrage neu entstehen.
   */
  customRoutes: Record<string, HikingRoute>;
}

/** Ergebnis eines Kanton-Ladevorgangs samt Herkunft der Routen. */
export interface CantonRoutesResult {
  routes: HikingRoute[];
  source: CatalogSource;
}

/**
 * Suchfilter fuer die Kantonsrouten. Fehlende Felder bedeuten "keine Grenze":
 * Der Aufrufer laesst eine Grenze weg, wenn der Schieberegler am Anschlag steht
 * (nach oben offen). Werden Schwierigkeitsgrenzen gesetzt, entfallen Routen mit
 * unbekanntem SAC-Grad.
 */
export interface RouteSearchFilter {
  distMin?: number;
  distMax?: number;
  ascMin?: number;
  ascMax?: number;
  diffMin?: number;
  diffMax?: number;
  /** Nur Routen, die als ganzjaehrig begehbar gelten (tiefe Lage, einfacher Grad). */
  ganzjaehrigNur?: boolean;
  /** Breitengrad des Nutzer-Standorts — sortiert Ergebnisse nach Naehe. */
  nearLat?: number;
  /** Laengengrad des Nutzer-Standorts — sortiert Ergebnisse nach Naehe. */
  nearLng?: number;
}

function filterCachedRoutes(routes: HikingRoute[], filter?: RouteSearchFilter): HikingRoute[] {
  if (!filter) return routes;
  const inRange = (value: number | null | undefined, min?: number, max?: number) =>
    (min == null || (value != null && value >= min)) &&
    (max == null || (value != null && value <= max));
  let result = routes.filter((r) =>
    inRange(r.distanceKm, filter.distMin, filter.distMax) &&
    inRange(r.ascentM, filter.ascMin, filter.ascMax) &&
    inRange(r.sac ? Number.parseFloat(r.sac.replace(",", ".")) : null, filter.diffMin, filter.diffMax)
  );
  if (filter.ganzjaehrigNur) {
    result = result.filter((r) =>
      (r.maxElevationM ?? 0) < 1800 &&
      (!r.sac || Number.parseFloat(r.sac.replace(",", ".")) <= 3)
    );
  }
  if (filter.nearLat != null && filter.nearLng != null) {
    const distance = (r: HikingRoute) => {
      const dLat = r.coordinates.lat - filter.nearLat!;
      const dLng = r.coordinates.lng - filter.nearLng!;
      return dLat * dLat + dLng * dLng;
    };
    result.sort((a, b) => distance(a) - distance(b));
  }
  return result;
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
  getSagasForRoute: (route: HikingRoute, n?: number) => Saga[];
  getRouteBySaga: (sagaId?: string) => HikingRoute | undefined;
  getRoutesByCanton: (canton?: string) => HikingRoute[];
  /**
   * Sucht passende Routen des Kantons direkt an der externen Quelle (Server/OSM,
   * mit swisstopo-Hoehenmetern); der optionale Filter grenzt die Suche ein.
  * Ohne Verbindung wird der lokale Kanton-Cache mit Quelle "cache" verwendet;
  * nur wenn kein Cache existiert, liefert die Suche Quelle "error".
   */
  loadCantonRoutes: (
    canton: string,
    filter?: RouteSearchFilter,
  ) => Promise<CantonRoutesResult>;
  /** Liefert die naechstgelegene kuratierte Sage zu einer Route. */
  ensureRouteSaga: (routeId: string) => Promise<Saga | undefined>;
  /**
   * Merkt eine selbst per Start/Ziel berechnete Route vor, damit `getRoute`
   * sie danach ueber `route/[id]` -> `saga/[id]` wie jede andere Route findet.
   */
  addCustomRoute: (route: HikingRoute) => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

// Routen kommen ausschliesslich live pro Kanton (OSM/swisstopo); es gibt keinen
// gebuendelten Routen-Seed mehr. Nur die kuratierten Sagen bleiben als
// Offline-Rueckfall erhalten.
const SEED: CatalogData = { routes: [], sagas: normalizeSagaTitles(SAGAS) };
const EMPTY_DYNAMIC: DynamicData = { cantonRoutes: {}, routeSagas: {}, customRoutes: {} };

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
    // customRoutes bewusst NICHT persistieren: sie sind pro Sitzung ephemer
    // und werden bei Bedarf neu vom Server berechnet.
    const { cantonRoutes, routeSagas } = dynamicRef.current;
    AsyncStorage.setItem(
      DYNAMIC_KEY,
      JSON.stringify({ cantonRoutes, routeSagas }),
    ).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Dynamischen Cache (Kanton-Routen + Route-Sagen) hydrieren.
      try {
        const rawDyn = await AsyncStorage.getItem(DYNAMIC_KEY);
        if (!cancelled && rawDyn) {
          const parsed = JSON.parse(rawDyn) as DynamicData;
          const next: DynamicData = {
            cantonRoutes: parsed.cantonRoutes ?? {},
            routeSagas: parsed.routeSagas ?? {},
            customRoutes: {},
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
          sagas: normalizeSagaTitles(res.sagas as Saga[]),
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
          if (parsed.sagas?.length) {
            const normalized = { ...parsed, sagas: normalizeSagaTitles(parsed.sagas) };
            setData(normalized);
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
    async (
      canton: string,
      filter?: RouteSearchFilter,
    ): Promise<CantonRoutesResult> => {
      // Nur gesetzte Grenzen als Query-Parameter senden; fehlende bleiben offen.
      const params: GetCantonRoutesParams = {};
      if (filter?.distMin != null) params.distMin = filter.distMin;
      if (filter?.distMax != null) params.distMax = filter.distMax;
      if (filter?.ascMin != null) params.ascMin = filter.ascMin;
      if (filter?.ascMax != null) params.ascMax = filter.ascMax;
      if (filter?.diffMin != null) params.diffMin = filter.diffMin;
      if (filter?.diffMax != null) params.diffMax = filter.diffMax;
      if (filter?.ganzjaehrigNur != null) params.ganzjaehrigNur = filter.ganzjaehrigNur;
      if (filter?.nearLat != null) params.nearLat = filter.nearLat;
      if (filter?.nearLng != null) params.nearLng = filter.nearLng;

      try {
        // Suche stets an der externen Quelle ausloesen (kein Cache-Kurzschluss).
        const res = await getCantonRoutes(canton, params);
        const routes = res as HikingRoute[];
        // Fuer die spaetere Id-Suche (getRoute/ensureRouteSaga) einen Index ueber
        // ALLE bisher gesehenen Routen des Kantons pflegen (Vereinigung nach Id),
        // damit ein frueher gefundenes Ziel nach einer engeren Suche auffindbar
        // bleibt. Angezeigt wird weiterhin nur das aktuelle Suchergebnis.
        const byId = new Map<string, HikingRoute>(
          (dynamicRef.current.cantonRoutes[canton] ?? []).map((r) => [r.id, r]),
        );
        for (const r of routes) byId.set(r.id, r);
        const next: DynamicData = {
          ...dynamicRef.current,
          cantonRoutes: {
            ...dynamicRef.current.cantonRoutes,
            [canton]: Array.from(byId.values()),
          },
        };
        dynamicRef.current = next;
        setDynamic(next);
        persistDynamic();
        return { routes, source: "server" };
      } catch {
        const cached = dynamicRef.current.cantonRoutes[canton];
        if (cached?.length) {
          return { routes: filterCachedRoutes(cached, filter), source: "cache" };
        }
        return { routes: [], source: "error" };
      }
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
        const custom = dynamicRef.current.customRoutes[id];
        if (custom) return custom;
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
          return normalizeSagaTitle((await getRouteSaga(routeId)) as Saga);
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

  const addCustomRoute = useCallback((route: HikingRoute) => {
    const next: DynamicData = {
      ...dynamicRef.current,
      customRoutes: { ...dynamicRef.current.customRoutes, [route.id]: route },
    };
    dynamicRef.current = next;
    setDynamic(next);
  }, []);

  const value = useMemo<CatalogContextValue>(() => {
    const { routes, sagas } = data;
    const { cantonRoutes, customRoutes } = dynamic;
    const dynRouteLists = Object.values(cantonRoutes);

    const findDynRoute = (predicate: (r: HikingRoute) => boolean) => {
      const custom = Object.values(customRoutes).find(predicate);
      if (custom) return custom;
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
      getSagasForRoute: (route, n = 3) =>
        nearestNSagas(route.coordinates, route.region, sagas, n),
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
      addCustomRoute,
    };
  }, [data, dynamic, ready, source, loadCantonRoutes, ensureRouteSaga, addCustomRoute]);

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
