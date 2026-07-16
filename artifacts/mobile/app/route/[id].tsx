import { Feather } from "@expo/vector-icons";
import SacHuettenSection, { type SacHuette } from "@/components/SacHuettenSection";
import { ElevationChart, type ElevationPoint } from "@/components/ElevationChart";
import type { MapPoi } from "@/components/brand/swisstopoMapHtml";
import { getApiBaseUrl } from "@/lib/apiConfig";
import {
  getAerialways,
  getPartners,
  getWeather,
  getAvalancheBulletin,
  getTransportStationboard,
  importGpxRoute,
  useGetRouteConditions,
} from "@workspace/api-client-react";
import type { Partner, WeatherReport, AvalancheBulletin, TransportStationboard } from "@workspace/api-client-react";

interface TransportAnreiseResult {
  station: { id: string; name: string } | null;
  arrivals: Array<{
    time: string;
    from: string;
    category: string;
    number: string;
    delay: number | null;
    platform: string | null;
  }>;
}
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { KarteVollbild } from "@/components/brand/KarteVollbild";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteMap } from "@/components/brand/RouteMap";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { Skeleton } from "@/components/brand/Skeleton";
import { SwisstopoMap } from "@/components/brand/SwisstopoMap";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { ShareCard } from "@/components/brand/ShareCard";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useSubscription } from "@/lib/revenuecat";
import { kantonSlug, SAGEN_PRO_PACK, sagaPackSlug } from "@/lib/kantonSlug";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useColors } from "@/hooks/useColors";
import { useRouteStrings } from "@/lib/i18n/screens/route";
import { useSharedStrings } from "@/lib/i18n/screens/shared";
import { bboxAroundGeometry, haversineKm } from "@/lib/geo";
import { sagaLokalisierung } from "@/lib/sagaMatch";
import { Saga } from "@/types";
import { hapticMedium, hapticSelection } from "@/lib/haptics";

const WEB_TOP = 67;

const AVALANCHE_COLORS: Record<number, string> = {
  1: "#78C800",
  2: "#FFD000",
  3: "#FF8000",
  4: "#FF0000",
  5: "#222222",
};

export default function Routenplanung() {
  const t = useRouteStrings();
  const ts = useSharedStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { energiesparmodus, setEnergiesparmodus, profile, premium, freeHikeUsed, freieSagen, hikeHistory, istSageInklusive, language, savedSagaIds, toggleBookmark } = useApp();
  const { isElite } = useSubscription();
  const { getRoute, getSagaForRoute, getSagasForRoute, ensureRouteSaga, addCustomRoute, getRoutesByCanton, sagas } = useCatalog();
  const [importing, setImporting] = useState(false);
  const { download, remove, isDownloaded, getRecord, progress } = useDownloads();

  const route = getRoute(id);
  const topPad = Platform.OS === "web" ? WEB_TOP : insets.top + 8;

  // Routentyp aus der Geometrie ableiten: liegen Start und Ziel nahe
  // beieinander (unter 500 m oder unter 5 % der Streckenlaenge), ist es ein
  // Rundweg — sonst eine Streckenwanderung, bei der die Rueckreise in der
  // Schweiz ueblicherweise mit Bahn oder Postauto erfolgt.
  const routentyp = React.useMemo<"rundweg" | "strecke" | null>(() => {
    const g = route?.geometry;
    if (!g || g.length < 2) return null;
    const start = { lat: g[0][0], lng: g[0][1] };
    const ende = { lat: g[g.length - 1][0], lng: g[g.length - 1][1] };
    const lueckeKm = haversineKm(start, ende);
    const schwelleKm = Math.max(0.5, (route?.distanceKm ?? 0) * 0.05);
    return lueckeKm <= schwelleKm ? "rundweg" : "strecke";
  }, [route?.geometry, route?.distanceKm]);

  // Strecke umkehren – tauscht Start und Ziel lokal aus (kein Server-Request)
  const [reversed, setReversed] = useState(false);

  // Effektive Geometrie: umgekehrt wenn reversed=true (keine Mutation des Originals).
  const effectiveGeom = useMemo(() => {
    const g = route?.geometry ?? [];
    return reversed ? [...g].reverse() : g;
  }, [route?.geometry, reversed]);

  // Oeffnet die SBB-Anreise zum Routenstart (Trailhead).
  // Bei umgekehrter Strecke werden die Koordinaten des alten Endpunkts verwendet.
  const oeffneAnreise = React.useCallback(() => {
    let dest: string;
    if (reversed && effectiveGeom.length > 0) {
      const p = effectiveGeom[0];
      dest = `${p[0]},${p[1]}`;
    } else {
      dest = route?.region ?? "";
    }
    Linking.openURL(`https://www.sbb.ch/fahrplan?nach=${encodeURIComponent(dest)}`).catch(() => {});
  }, [route?.region, effectiveGeom, reversed]);

  // Oeffnet die SBB-Rueckreise vom Routenende zurueck zum Routenstart.
  // VON = Routenendpunkt, NACH = Routenstartpunkt (beide als Koordinaten).
  const oeffneRueckreise = React.useCallback(() => {
    if (effectiveGeom.length < 2) return;
    const start = effectiveGeom[0];
    const ende = effectiveGeom[effectiveGeom.length - 1];
    const von = `${ende[0]},${ende[1]}`;
    const nach = `${start[0]},${start[1]}`;
    Linking.openURL(
      `https://www.sbb.ch/fahrplan?von=${encodeURIComponent(von)}&nach=${encodeURIComponent(nach)}`
    ).catch(() => {});
  }, [effectiveGeom]);

  const onImportGpx = useCallback(async () => {
    setImporting(true);
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["application/gpx+xml", "application/octet-stream", "text/xml", "application/xml", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      let gpx: string;
      try {
        gpx =
          Platform.OS === "web"
            ? await (await fetch(asset.uri)).text()
            : await FileSystem.readAsStringAsync(asset.uri);
      } catch {
        alert(t.importGpxTitle, t.importGpxReadError);
        return;
      }
      const name = asset.name?.replace(/\.gpx$/i, "").trim() || undefined;
      const imported = (await importGpxRoute({ gpx, name })) as import("@/constants/routes").HikingRoute;
      addCustomRoute(imported);
      router.replace(`/route/${imported.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      alert(t.importGpxTitle, message || t.importGpxText);
    } finally {
      setImporting(false);
    }
  }, [addCustomRoute, router, t]);

  const [saga, setSaga] = useState<Saga | undefined>(
    route ? getSagaForRoute(route) : undefined,
  );
  const similarRoutes = useMemo(() => {
    if (!saga?.canton || route?.distanceKm == null || !route?.id) return [];
    return getRoutesByCanton(saga.canton)
      .filter((r) => r.id !== route.id)
      .sort(
        (a, b) =>
          Math.abs(a.distanceKm - route.distanceKm) -
          Math.abs(b.distanceKm - route.distanceKm),
      )
      .slice(0, 3);
  }, [route?.id, route?.distanceKm, saga?.canton, getRoutesByCanton]);
  const [sagaLoading, setSagaLoading] = useState(!saga);
  const [sagaRetryCount, setSagaRetryCount] = useState(0);
  const sagaCandidates = useMemo(
    () => (route ? getSagasForRoute(route, 3) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [route?.id],
  );

  // Prueft ob eine bestimmte Sage fuer den aktuellen User gesperrt ist.
  // Entspricht der bestehenden `locked`-Logik, aber sagen-individuell damit
  // der Picker gefiltert werden kann.
  // Autoritaetive Quelle: profiles.purchased_packs (server-seitiger Claim).
  // RC-Entitlements werden bewusst NICHT geprueft (s. Kommentar in kanton/[canton].tsx).
  const isSagaLocked = useCallback(
    (s: Saga): boolean => {
      if (!premium) return !s.isAnchorPlace;
      if (isElite) return false;
      const slug = kantonSlug(s.canton);
      const sagasInCanton = sagas.filter((cs) => cs.canton === s.canton);
      const sagaIdx = sagasInCanton.findIndex((cs) => cs.id === s.id);
      // Nicht im Katalog (dynamisch generierte Sage) → als Pack-1-Sage behandeln
      const isInPack1 = sagaIdx < 0 || sagaIdx < SAGEN_PRO_PACK;
      if (!isInPack1) return true; // Pack-2-Sage: noch nicht kaufbar
      const effectiveSlug = sagaIdx >= 0 ? sagaPackSlug(slug, sagaIdx) : slug;
      if ((profile?.purchasedPacks ?? []).includes(effectiveSlug)) return false;
      return !istSageInklusive(s.canton, s.id);
    },
    [premium, isElite, profile, sagas, istSageInklusive],
  );

  // Nur freigeschaltete Sagen im Picker anzeigen. Gesperrte Kandidaten werden
  // gefiltert — stattdessen erscheint ein "Weitere Sagen freischalten"-Button.
  const unlockedCandidates = useMemo(
    () => sagaCandidates.filter((s) => !isSagaLocked(s)),
    [sagaCandidates, isSagaLocked],
  );
  const hasLockedCandidates = sagaCandidates.length > unlockedCandidates.length;

  const [pickerDismissed, setPickerDismissed] = useState(false);
  const showPicker = unlockedCandidates.length > 1 && !pickerDismissed;
  function selectFromPicker(s: Saga) {
    setSaga(s);
    setSagaLoading(false);
    setPickerDismissed(true);
  }
  const [lowBattery] = useState(false);
  const [busy, setBusy] = useState(false);
  // Community Trail Conditions
  const { data: trailConditions, isLoading: conditionsLoading, refetch: refetchConditions } =
    useGetRouteConditions(id ?? "");
  const [aerialways, setAerialways] = useState<
    { id: string; geometry: number[][] }[] | null
  >(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [weather, setWeather] = useState<WeatherReport | null>(null);
  const [weatherError, setWeatherError] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(true);
  // Zaehler fuer manuelle Wetter-Neuversuche (Retry-Knopf im Fehlerzustand).
  const [weatherVersuch, setWeatherVersuch] = useState(0);
  // Lawinenbulletin (EAWS) – alpine Kantone, Winterhalbjahr
  const [avalanche, setAvalanche] = useState<AvalancheBulletin | null>(null);
  const [avalancheLoading, setAvalancheLoading] = useState(false);
  // SBB live am Ziel – naechste Abfahrten am Routenendpunkt
  const [transport, setTransport] = useState<TransportStationboard | null>(null);
  const [transportLoading, setTransportLoading] = useState(false);
  // SBB live am Start – Ankünfte am naechsten Bahnhof zum Wanderstart
  const [transportStart, setTransportStart] = useState<TransportAnreiseResult | null>(null);
  const [transportStartLoading, setTransportStartLoading] = useState(false);
  // SAC-Hütten in der Nähe der Route
  const [sacHuetten, setSacHuetten] = useState<SacHuette[]>([]);
  const [sacHuettenLoading, setSacHuettenLoading] = useState(false);
  const [sacHuettenError, setSacHuettenError] = useState(false);
  // Höhenprofil der Route
  const [elevProfile, setElevProfile] = useState<ElevationPoint[] | null>(null);
  const [elevProfileLoading, setElevProfileLoading] = useState(false);
  // Trinkwasserquellen entlang der Route (für die Karte)
  const [waterSources, setWaterSources] = useState<MapPoi[]>([]);
  // Parkplaetze am Start- und Endpunkt der Route (für die Karte)
  const [parkingSpots, setParkingSpots] = useState<MapPoi[]>([]);

  // ShareCard ref für Native-Share-Export
  const shareCardRef = useRef<View>(null);

  // Lesezeichen (Bookmark) für die Saga dieser Route
  const isBookmarked = saga ? savedSagaIds.includes(saga.id) : false;

  // Sperrungen & Wegschäden (Wanderwege Schweiz)
  interface Sperrung {
    id: string;
    title: string;
    details?: string | null;
    affectsFrom?: string | null;
    affectsUntil?: string | null;
    url?: string | null;
    canton?: string | null;
  }
  const [sperrungen, setSperrungen] = useState<Sperrung[]>([]);
  const [sperrungenLoading, setSperrungenLoading] = useState(true);

  useEffect(() => {
    setSperrungenLoading(true);
    const canton = saga?.canton ? kantonSlug(saga.canton) : "";
    const url = canton
      ? `${getApiBaseUrl()}api/sperrungen?canton=${encodeURIComponent(canton)}`
      : `${getApiBaseUrl()}api/sperrungen`;
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: unknown) => {
        const arr = Array.isArray(data) ? (data as Sperrung[]) : [];
        setSperrungen(arr);
      })
      .catch(() => setSperrungen([]))
      .finally(() => setSperrungenLoading(false));
  }, [saga?.canton]);

  const shareRoute = async () => {
    if (!route) return;
    try {
      if (shareCardRef.current) {
        const uri = await captureRef(shareCardRef, { format: "png", quality: 0.9 });
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: route.name });
      }
    } catch {
      // Teilen fehlgeschlagen (z.B. Web oder keine Berechtigung)
    }
  };


  // Seilbahnen/Standseilbahnen im Kartenausschnitt laden (typisches alpines
  // Wander-Verkehrsmittel) — nur mit Wegverlauf sinnvoll, best effort.
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route.geometry, route.coordinates);
    getAerialways(bbox)
      .then((result) => {
        if (!cancelled) setAerialways(result);
      })
      .catch(() => {
        if (!cancelled) setAerialways(null);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id]);

  // Aktive Partnerbetriebe (Restaurants, Souvenirlaeden, ...) entlang der Route
  // laden — best effort, gleiche Bounding Box wie die Seilbahnen.
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const bbox = bboxAroundGeometry(route.geometry, route.coordinates);
    getPartners(bbox)
      .then((result) => {
        if (!cancelled) setPartners(result);
      })
      .catch(() => {
        if (!cancelled) setPartners([]);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id]);

  // Live-Wetter + abgeleiteter Wegzustand fuer den Ausgangspunkt der Route.
  useEffect(() => {
    if (!route?.coordinates) {
      setWeatherLoading(false);
      return;
    }
    let cancelled = false;
    setWeatherLoading(true);
    setWeatherError(false);
    getWeather({ lat: route.coordinates.lat, lng: route.coordinates.lng })
      .then((result) => {
        if (cancelled) return;
        setWeather(result);
        setWeatherLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setWeather(null);
        setWeatherError(true);
        setWeatherLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [route?.id, weatherVersuch]);

  // Lawinenbulletin (EAWS) – nur alpine Kantone, Winterhalbjahr.
  // Im Sommer gibt die API available=false zurueck (korrekt, kein Fehler).
  // HikingRoute hat kein .canton-Feld; Kanton via sagaId aus dem Sagen-Katalog.
  useEffect(() => {
    if (!route?.sagaId) return;
    const sagaCanton = sagas.find((s) => s.id === route.sagaId)?.canton;
    if (!sagaCanton) return;
    let cancelled = false;
    const slug = kantonSlug(sagaCanton);
    setAvalancheLoading(true);
    getAvalancheBulletin({ canton: slug, lang: (language ?? "de") as "de" | "fr" | "it" | "en" })
      .then((result) => { if (!cancelled) { setAvalanche(result); setAvalancheLoading(false); } })
      .catch(() => { if (!cancelled) { setAvalanche(null); setAvalancheLoading(false); } });
    return () => { cancelled = true; };
  }, [route?.id, sagas.length]);

  // Höhenprofil via swisstopo-Profildienst (POST /api/elevation-profile).
  // Wird neu geladen wenn sich die Geometrie durch Umkehren ändert.
  useEffect(() => {
    const geom = effectiveGeom.length >= 2 ? effectiveGeom : (route?.geometry ?? []);
    if (geom.length < 2) return;
    let cancelled = false;
    setElevProfileLoading(true);
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/elevation-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geometry: geom }),
    })
      .then((r) => r.json())
      .then((data: { profile: ElevationPoint[] }) => {
        if (!cancelled && Array.isArray(data?.profile)) {
          setElevProfile(data.profile);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setElevProfileLoading(false); });
    return () => { cancelled = true; };
  }, [route?.id, reversed]);

  // Trinkwasserquellen im Umkreis der Route laden (Routenmittelpunkt).
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const geom = effectiveGeom.length > 0 ? effectiveGeom : (route.geometry ?? []);
    const midIdx = geom.length > 0 ? Math.floor(geom.length / 2) : -1;
    const center = midIdx >= 0
      ? { lat: geom[midIdx][0], lng: geom[midIdx][1] }
      : route.coordinates;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/trinkwasser?lat=${center.lat}&lng=${center.lng}&radius=8000`)
      .then((r) => r.json())
      .then((data: { osmId: string; lat: number; lng: number; name: string | null }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setWaterSources(data.map((w) => ({ id: w.osmId, name: w.name ?? "Trinkwasser", lat: w.lat, lng: w.lng })));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [route?.id]);

  // Parkplaetze am Start- und Endpunkt der Route laden (je 800 m Radius).
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    const geom = effectiveGeom.length >= 2 ? effectiveGeom : (route.geometry ?? []);
    if (geom.length < 2) return;
    const startPt = { lat: geom[0][0], lng: geom[0][1] };
    const endPt   = { lat: geom[geom.length - 1][0], lng: geom[geom.length - 1][1] };
    const base = getApiBaseUrl() ?? "";
    type ParkingItem = { osmId: string; lat: number; lng: number; name: string | null };
    const fetchOne = (lat: number, lng: number) =>
      fetch(`${base}/api/parking?lat=${lat}&lng=${lng}&radius=800`)
        .then((r) => r.json() as Promise<ParkingItem[]>)
        .catch(() => [] as ParkingItem[]);
    Promise.all([fetchOne(startPt.lat, startPt.lng), fetchOne(endPt.lat, endPt.lng)])
      .then(([fromStart, fromEnd]) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const merged: MapPoi[] = [];
        for (const item of [...fromStart, ...fromEnd]) {
          if (!item?.osmId || seen.has(item.osmId)) continue;
          seen.add(item.osmId);
          merged.push({ id: item.osmId, name: item.name ?? "Parkplatz", lat: item.lat, lng: item.lng });
        }
        setParkingSpots(merged);
      });
    return () => { cancelled = true; };
  }, [route?.id, effectiveGeom.length]);

  // SAC-Hütten im Umkreis der Route laden (Mittelpunkt der Geometrie).
  useEffect(() => {
    if (!route?.coordinates) return;
    let cancelled = false;
    setSacHuettenLoading(true);
    setSacHuettenError(false);
    const geom = reversed ? [...(route.geometry ?? [])].reverse() : (route.geometry ?? []);
    const midIdx = geom.length > 0 ? Math.floor(geom.length / 2) : -1;
    const center = midIdx >= 0
      ? { lat: geom[midIdx][0], lng: geom[midIdx][1] }
      : route.coordinates;
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/sac-huetten?lat=${center.lat}&lng=${center.lng}&radius=12000`)
      .then((r) => r.json())
      .then((data: SacHuette[]) => {
        if (!cancelled) { setSacHuetten(data); setSacHuettenLoading(false); }
      })
      .catch(() => {
        if (!cancelled) { setSacHuettenError(true); setSacHuettenLoading(false); }
      });
    return () => { cancelled = true; };
  }, [route?.id, reversed]);

  // SBB live am Start – Ankünfte am naechsten Bahnhof zum Wanderstart.
  useEffect(() => {
    if (!route) return;
    const geom = reversed ? [...(route.geometry ?? [])].reverse() : (route.geometry ?? []);
    const startPt = geom.length > 0
      ? { lat: geom[0][0], lng: geom[0][1] }
      : route.coordinates;
    if (!startPt) return;
    let cancelled = false;
    setTransportStartLoading(true);
    const base = getApiBaseUrl() ?? "";
    fetch(`${base}/api/transport-anreise?lat=${startPt.lat}&lng=${startPt.lng}`)
      .then((r) => r.json())
      .then((data: TransportAnreiseResult) => {
        if (!cancelled) { setTransportStart(data); setTransportStartLoading(false); }
      })
      .catch(() => { if (!cancelled) { setTransportStart(null); setTransportStartLoading(false); } });
    return () => { cancelled = true; };
  }, [route?.id, reversed]);

  // SBB live am Ziel – Abfahrten am naechsten Bahnhof zum Routenendpunkt.
  // Fuer Rundwege = Ausgangspunkt; fuer Streckenwanderungen = letzter Wegpunkt.
  useEffect(() => {
    if (!route) return;
    const geom = reversed ? [...(route.geometry ?? [])].reverse() : (route.geometry ?? []);
    const endPt = geom.length > 0
      ? { lat: geom[geom.length - 1][0], lng: geom[geom.length - 1][1] }
      : route.coordinates;
    if (!endPt) return;
    let cancelled = false;
    setTransportLoading(true);
    getTransportStationboard({ lat: endPt.lat, lng: endPt.lng })
      .then((result) => { if (!cancelled) { setTransport(result); setTransportLoading(false); } })
      .catch(() => { if (!cancelled) { setTransport(null); setTransportLoading(false); } });
    return () => { cancelled = true; };
  }, [route?.id, reversed]);

  useEffect(() => {
    let cancelled = false;
    // Wenn der User bereits aus dem Picker gewaehlt hat, den State NICHT
    // ueberschreiben — der useEffect laeuft sonst erneut wenn showPicker
    // nach der Auswahl false wird und wuerde die Picker-Wahl mit der
    // Standard-Route-Sage ueberschreiben.
    if (!route || pickerDismissed || showPicker) return;
    const known = getSagaForRoute(route);
    if (known) {
      setSaga(known);
      setSagaLoading(false);
      return;
    }
    setSagaLoading(true);
    (async () => {
      const result = await ensureRouteSaga(route.id);
      if (cancelled) return;
      setSaga(result);
      setSagaLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [route, ensureRouteSaga, getSagaForRoute, sagaRetryCount, showPicker, pickerDismissed]);

  if (!route) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.foreground, fontFamily: fonts.titleBold }}>
            {t.notFound}
          </Text>
        </View>
      </Background>
    );
  }

  const meta = route;
  const routePackSlug = saga?.canton ? kantonSlug(saga.canton) : "";
  // Position der aktuellen Sage im Kanton bestimmen
  const routeSagasInCanton = saga?.canton ? sagas.filter((s) => s.canton === saga.canton) : [];
  const routeSagaIdx = saga ? routeSagasInCanton.findIndex((s) => s.id === saga.id) : -1;
  const routeSagaIsInPack1 = routeSagaIdx < 0 || routeSagaIdx < SAGEN_PRO_PACK;
  const routeEffectivePackSlug =
    routeSagaIdx >= 0 ? sagaPackSlug(routePackSlug, routeSagaIdx) : routePackSlug;
  const dbPackUnlocked = (profile?.purchasedPacks ?? []).includes(routeEffectivePackSlug);
  // Pack-2+-Sagen sind nie via Pack 1 entsperrt, auch nicht via Elite entfaellt dies nicht
  const packUnlocked = premium && (isElite || (routeSagaIsInPack1 && dbPackUnlocked));
  const sagaPackLocked =
    premium &&
    !packUnlocked &&
    !!saga?.canton &&
    (routeSagaIsInPack1
      ? !istSageInklusive(saga.canton, route.sagaId ?? saga.id)
      : true);
  const locked = sagaPackLocked || (!premium && !saga?.isAnchorPlace);
  const h = Math.floor(meta.minutes / 60);
  const m = meta.minutes % 60;

  // saga?.id hat Vorrang vor route.sagaId: Routen aus der OSM-Suche haben
  // sagaId erst nach dem asynchronen ensureRouteSaga-Abgleich gesetzt; der
  // Download wird aber unter saga.id gespeichert — also dieselbe ID verwenden.
  const sagaId = saga?.id ?? route.sagaId;
  const downloaded = isDownloaded(sagaId);
  const record = getRecord(sagaId);
  const downloading = progress?.sagaId === sagaId;
  const progressText = downloading
    ? progress?.phase === "tiles"
      ? t.loadingMap(progress.done, progress.total)
      : t.loadingSaga
    : "";

  const onDownload = async () => {
    if (!profile || !saga || downloading || busy) return;
    setBusy(true);
    try {
      await download(saga, route, profile, premium);
    } catch {
      alert(
        t.downloadFailed,
        t.downloadFailedText
      );
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await remove(sagaId);
    } finally {
      setBusy(false);
    }
  };

  const sizeLabel = record
    ? record.sizeBytes >= 1024 * 1024
      ? `${(record.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(record.sizeBytes / 1024))} KB`
    : "";

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={route.region} title={t.title} onBack />

        {/* ── Share + Lesezeichen ────────────────────────────────── */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 2 }}>
          <Pressable
            onPress={() => { hapticSelection(); void shareRoute(); }}
            style={[styles.actionChip, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}
            accessibilityRole="button"
            accessibilityLabel={t.shareRoute}
          >
            <Feather name="share-2" size={14} color={colors.accent} />
            <Text style={[styles.actionChipText, { color: colors.accent }]}>{t.shareRoute}</Text>
          </Pressable>
          {saga && (
            <Pressable
              onPress={() => { hapticMedium(); void toggleBookmark(saga.id); }}
              style={[styles.actionChip, {
                borderColor: isBookmarked ? colors.accent : colors.glassBorder,
                backgroundColor: isBookmarked ? colors.accent + "22" : colors.glassBg,
              }]}
              accessibilityRole="button"
              accessibilityLabel={isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
              accessibilityState={{ selected: isBookmarked }}
            >
              <Feather name="bookmark" size={14} color={isBookmarked ? colors.accent : colors.mutedForeground} />
              <Text style={[styles.actionChipText, { color: isBookmarked ? colors.accent : colors.mutedForeground }]}>
                {isBookmarked ? t.bookmarkRemove : t.bookmarkAdd}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.routeName, { color: colors.foreground }]}>
          {meta.name}
        </Text>
        <Text style={[styles.forSaga, { color: colors.accent }]}>
          {route.terrain}
        </Text>

        <View style={{ marginTop: 18 }}>
          <KarteVollbild
            height={200}
            renderKarte={(hoehe, safeAreaTop) =>
              route.coordinates ? (
                <SwisstopoMap
                  center={route.coordinates}
                  label={route.name}
                  height={hoehe}
                  geometry={effectiveGeom.length > 0 ? effectiveGeom : route.geometry}
                  aerialways={aerialways}
                  partners={partners}
                  waterSources={waterSources.length > 0 ? waterSources : null}
                  parkingSpots={parkingSpots.length > 0 ? parkingSpots : null}
                  safeAreaInsetTop={safeAreaTop}
                />
              ) : (
                <RouteMap progress={0.15} height={hoehe} />
              )
            }
          />
        </View>

        <Animated.View entering={FadeInDown} style={styles.statsGrid}>
          <Stat label={t.distance} value={`${meta.distanceKm}`} unit="km" />
          <Stat label={t.ascent} value={`${meta.ascentM}`} unit="hm" />
          <Stat label={t.duration} value={`${h}:${String(m).padStart(2, "0")}`} unit="h" />
          <Stat label={t.sacScale} value={meta.sac} unit="" />
        </Animated.View>

        {/* ── Höhenprofil ────────────────────────────────────────────── */}
        {(elevProfile || elevProfileLoading) && (
          <View
            style={[
              styles.elevChartCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.elevChartTitle, { color: colors.foreground }]}>
              {t.elevationProfile}
            </Text>
            {elevProfileLoading && !elevProfile ? (
              <View style={{ height: 110, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : elevProfile ? (
              <ElevationChart profile={elevProfile} height={110} />
            ) : null}
          </View>
        )}

        {/* ── Strecke umkehren ──────────────────────────────────────── */}
        {effectiveGeom.length >= 2 && routentyp === "strecke" && (
          <Pressable
            onPress={() => setReversed((r) => !r)}
            style={[
              styles.rueckreiseButton,
              {
                borderColor: reversed ? colors.accent : colors.glassBorder,
                backgroundColor: reversed ? colors.accent + "22" : colors.glassBg,
                marginTop: 10,
              },
            ]}
          >
            <Feather name="repeat" size={15} color={reversed ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.rueckreiseText, { color: reversed ? colors.accent : colors.mutedForeground }]}>
              {t.reverseRoute}
            </Text>
          </Pressable>
        )}

        {/* ── Höhenwarnung ──────────────────────────────────────────── */}
        {route && (route.maxElevationM ?? 0) >= 2000 && (() => {
          const elev = route.maxElevationM ?? 0;
          const color = elev >= 3000 ? "#EF4444" : elev >= 2500 ? "#F97316" : "#F59E0B";
          const msg = elev >= 3000
            ? t.altitudeWarningAlpin
            : elev >= 2500
              ? t.altitudeWarningHoch
              : t.altitudeWarningBerg;
          return (
            <View style={[styles.checkCard, { borderColor: color, backgroundColor: colors.glassBg, marginTop: 12, borderWidth: 1 }]}>
              <View style={styles.checkRow}>
                <Feather name="alert-triangle" size={16} color={color} />
                <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold }]}>
                  {t.altitudeWarning}
                </Text>
                <Text style={[styles.checkValue, { color, fontFamily: fonts.bodyBold }]}>
                  {elev >= 1000
                    ? `${Math.round(elev / 100) / 10}k m`
                    : `${Math.round(elev)} m`}
                </Text>
              </View>
              <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 4 }]}>
                {t.altitudeM(Math.round(elev))}
              </Text>
              <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 2 }]}>
                {msg}
              </Text>
            </View>
          );
        })()}

        <View style={styles.checkRow}>
          <Feather
            name={meta.season === "ganzjaehrig" ? "sun" : "cloud-snow"}
            size={16}
            color={colors.mutedForeground}
          />
          <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.seasonLabel}</Text>
          <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
            {t.season[
              meta.season === "ganzjaehrig"
                ? "ganzjaehrig"
                : meta.season === "nur_sommer"
                  ? "nurSommer"
                  : "eherSommer"
            ]}
          </Text>
        </View>
        <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.seasonNote}</Text>

        {routentyp && (
          <>
            <View style={styles.checkRow}>
              <Feather
                name={routentyp === "rundweg" ? "rotate-cw" : "arrow-right"}
                size={16}
                color={colors.mutedForeground}
              />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                {t.routeTypeLabel}
              </Text>
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
                {routentyp === "rundweg" ? t.routeTypeRundweg : t.routeTypeStrecke}
              </Text>
            </View>
            {routentyp === "strecke" && (
              <>
                <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
                  {t.streckeHint}
                </Text>
                <Pressable
                  onPress={oeffneRueckreise}
                  style={[
                    styles.rueckreiseButton,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <Feather name="send" size={15} color={colors.accent} />
                  <Text style={[styles.rueckreiseText, { color: colors.accent }]}>
                    {t.planReturn}
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}

        {/* SBB-Anreise-Button — für alle Routentypen sichtbar */}
        <Pressable
          onPress={oeffneAnreise}
          style={[
            styles.rueckreiseButton,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 14 },
          ]}
        >
          <Feather name="send" size={15} color={colors.accent} />
          <Text style={[styles.rueckreiseText, { color: colors.accent }]}>
            {t.planOutward}
          </Text>
        </Pressable>

        {/* ── SBB live am Start (Ankünfte am Trailhead) ─────────────── */}
        <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
          <View style={[styles.checkRow, { marginBottom: 6 }]}>
            <Feather name="log-in" size={15} color={colors.accent} />
            <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold, flex: 1 }]}>
              {t.transportAnreiseLive}
            </Text>
            {transportStart?.station && (
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t.transportArrivingAt(transportStart.station.name)}
              </Text>
            )}
          </View>
          {transportStartLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportLoading}</Text>
            </View>
          ) : !transportStart?.station ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportNoStation}</Text>
          ) : transportStart.arrivals.length === 0 ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportError}</Text>
          ) : (
            transportStart.arrivals.slice(0, 6).map((arr, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder, gap: 6 }}>
                <Text style={[styles.checkValue, { color: colors.foreground, fontFamily: fonts.bodyBold, width: 42 }]}>
                  {arr.time}
                </Text>
                <Text style={[styles.checkNote, { color: colors.accent, fontFamily: fonts.bodyBold, width: 36 }]} numberOfLines={1}>
                  {arr.category}{arr.number}
                </Text>
                <Text style={[styles.checkNote, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                  {arr.from}
                </Text>
                {arr.platform ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, width: 36, textAlign: "right" }]} numberOfLines={1}>
                    {t.transportPlatform(arr.platform)}
                  </Text>
                ) : null}
                {arr.delay != null && arr.delay > 0 ? (
                  <Text style={[styles.checkNote, { color: "#EF4444", width: 44, textAlign: "right" }]}>
                    {t.transportDelay(arr.delay)}
                  </Text>
                ) : arr.delay === 0 ? (
                  <Text style={[styles.checkNote, { color: "#78C800", width: 44, textAlign: "right" }]}>
                    {t.transportOnTime}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* ── SBB live am Ziel ──────────────────────────────────────── */}
        <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
          <View style={[styles.checkRow, { marginBottom: 6 }]}>
            <Feather name="navigation" size={15} color={colors.accent} />
            <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold, flex: 1 }]}>
              {t.transportLive}
            </Text>
            {transport?.station && (
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t.transportDepartingFrom(transport.station.name)}
              </Text>
            )}
          </View>
          {transportLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportLoading}</Text>
            </View>
          ) : !transport?.station ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportNoStation}</Text>
          ) : transport.departures.length === 0 ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportError}</Text>
          ) : (
            transport.departures.slice(0, 6).map((dep, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder, gap: 6 }}>
                <Text style={[styles.checkValue, { color: colors.foreground, fontFamily: fonts.bodyBold, width: 42 }]}>
                  {dep.time}
                </Text>
                <Text style={[styles.checkNote, { color: colors.accent, fontFamily: fonts.bodyBold, width: 36 }]} numberOfLines={1}>
                  {dep.category}{dep.number}
                </Text>
                <Text style={[styles.checkNote, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                  {dep.to}
                </Text>
                {dep.platform ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, width: 36, textAlign: "right" }]} numberOfLines={1}>
                    {t.transportPlatform(dep.platform)}
                  </Text>
                ) : null}
                {dep.delay != null && dep.delay > 0 ? (
                  <Text style={[styles.checkNote, { color: "#EF4444", width: 44, textAlign: "right" }]}>
                    {t.transportDelay(dep.delay)}
                  </Text>
                ) : dep.delay === 0 ? (
                  <Text style={[styles.checkNote, { color: "#78C800", width: 44, textAlign: "right" }]}>
                    {t.transportOnTime}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* ── SAC-Hütten in der Nähe ──────────────────────────────── */}
        <SacHuettenSection
          huetten={sacHuetten}
          loading={sacHuettenLoading}
          error={sacHuettenError}
        />

        <View
          style={[
            styles.downloadCard,
            {
              borderColor: downloaded ? colors.accent : colors.glassBorder,
              backgroundColor: colors.glassBg,
            },
          ]}
        >
          <View style={styles.downloadHead}>
            <Feather
              name={downloaded ? "check-circle" : "download-cloud"}
              size={18}
              color={downloaded ? colors.accent : colors.foreground}
            />
            <Text style={[styles.downloadTitle, { color: colors.foreground }]}>
              {downloaded ? t.offlineAvailable : t.saveForOffline}
            </Text>
          </View>
          <Text style={[styles.downloadHint, { color: colors.mutedForeground }]}>
            {downloaded
              ? t.offlineStatusActive(sizeLabel)
              : t.offlineStatusInactive}
          </Text>

          {downloading ? (
            <View style={styles.downloadProgress}>
              <Feather name="loader" size={15} color={colors.accent} />
              <Text style={[styles.downloadProgressText, { color: colors.accent }]}>
                {progressText}
              </Text>
            </View>
          ) : downloaded ? (
            <PrimaryButton
              label={t.removeDownload}
              variant="secondary"
              onPress={onDelete}
              disabled={busy}
              loading={busy}
              style={{ marginTop: 14 }}
            />
          ) : (
            <PrimaryButton
              label={t.download}
              variant="secondary"
              onPress={onDownload}
              disabled={!saga || sagaLoading || downloading || busy}
              loading={downloading || busy}
              style={{ marginTop: 14 }}
            />
          )}
        </View>

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {t.checkBeforeTour}
        </Text>
        <View
          style={[
            styles.checkCard,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          {weatherLoading ? (
            <View style={styles.checkRow}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkLabel, { color: colors.mutedForeground }]}>
                {t.weatherLoading}
              </Text>
            </View>
          ) : weatherError || !weather ? (
            <View style={styles.checkRow}>
              <Feather name="cloud-off" size={16} color={colors.destructive} />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.weather}</Text>
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
                {t.weatherNotAvailable}
              </Text>
              <Pressable
                onPress={() => setWeatherVersuch((v) => v + 1)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={ts.retry}
                style={[styles.retryChip, { borderColor: colors.glassBorder }]}
              >
                <Feather name="refresh-cw" size={12} color={colors.accent} />
                <Text style={[styles.retryChipText, { color: colors.accent }]}>
                  {ts.retry}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <CheckRow
                icon="cloud"
                label={t.weather}
                value={t.weatherValues(weather.conditionLabel, Math.round(weather.temperatureC))}
                ok
              />
              <CheckRow
                icon="wind"
                label={t.wind}
                value={t.windValues(Math.round(weather.windKmh), Math.round(weather.windGustsKmh))}
                ok
              />
              <CheckRow
                icon="alert-triangle"
                label={t.trailCondition}
                value={
                  t.trailConditions[
                    weather.trailConditionLevel as keyof typeof t.trailConditions
                  ] ?? weather.trailConditionLabel
                }
                ok={weather.trailConditionLevel === "gut"}
                warn={weather.trailConditionLevel !== "gut"}
              />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
                {weather.trailConditionNote} {t.weatherNote}
              </Text>
            </>
          )}
        </View>

        {/* ── Lawinenbulletin (EAWS) ───────────────────────────────── */}
        {avalancheLoading ? (
          <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
            <View style={styles.checkRow}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkLabel, { color: colors.mutedForeground }]}>
                {t.avalancheLoading}
              </Text>
            </View>
          </View>
        ) : avalanche?.available ? (
          <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
            <View style={styles.checkRow}>
              <Feather name="alert-triangle" size={16} color={AVALANCHE_COLORS[avalanche.dangerLevel as keyof typeof AVALANCHE_COLORS] ?? colors.mutedForeground} />
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.avalancheBulletin}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.checkValue, { color: AVALANCHE_COLORS[avalanche.dangerLevel as keyof typeof AVALANCHE_COLORS] ?? colors.foreground, fontFamily: fonts.bodyBold }]}>
                  {t.avalancheLevelLabel(avalanche.dangerLevel ?? 0, t.avalancheLevelNames[(avalanche.dangerLevel ?? 1) as 1|2|3|4|5])}
                </Text>
                {avalanche.dangerText ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 4 }]} numberOfLines={3}>
                    {avalanche.dangerText}
                  </Text>
                ) : null}
                <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 2 }]}>
                  {t.avalancheSource}
                </Text>
              </View>
            </View>
          </View>
        ) : avalanche && !avalanche.available && avalanche.reason !== "no-alpine-region" && avalanche.reason !== "no-bulletin" ? (
          <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
            <CheckRow icon="check-circle" label={t.avalancheBulletin} value={t.avalancheError} ok />
          </View>
        ) : null}

        {/* ── Sperrungen & Wegschäden ──────────────────────────────── */}
        {sperrungenLoading ? null : sperrungen.length > 0 ? (
          <View style={[styles.checkCard, { borderColor: "#EF4444", backgroundColor: colors.glassBg, marginTop: 12 }]}>
            <View style={[styles.checkRow, { marginBottom: 6 }]}>
              <Feather name="alert-octagon" size={16} color="#EF4444" />
              <Text style={[styles.checkLabel, { color: "#EF4444", fontFamily: fonts.bodyBold, flex: 1 }]}>
                {t.sperrungenTitle}
              </Text>
            </View>
            {sperrungen.map((s) => (
              <View key={s.id} style={{ paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder }}>
                <Text style={[styles.checkLabel, { color: colors.foreground }]}>{s.title}</Text>
                {s.details ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 2 }]} numberOfLines={3}>
                    {s.details}
                  </Text>
                ) : null}
                {(s.affectsFrom || s.affectsUntil) ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 2 }]}>
                    {s.affectsFrom && s.affectsUntil
                      ? `${new Date(s.affectsFrom).toLocaleDateString()} – ${new Date(s.affectsUntil).toLocaleDateString()}`
                      : s.affectsFrom
                        ? `Ab ${new Date(s.affectsFrom).toLocaleDateString()}`
                        : `Bis ${new Date(s.affectsUntil!).toLocaleDateString()}`}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Community Trail Conditions ────────────────────────────── */}
        <SparkDivider style={{ marginVertical: 22 }} />
        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {t.communityConditions}
        </Text>
        <View
          style={[
            styles.checkCard,
            { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
          ]}
        >
          {conditionsLoading ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : !trailConditions || trailConditions.length === 0 ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
              {t.conditionNoReports}
            </Text>
          ) : (
            trailConditions.map((r) => {
              const level = r.condition as keyof typeof t.conditions;
              const emoji = t.conditionEmoji[level] ?? "";
              const relTime = (() => {
                const diff = Date.now() - new Date(r.reportedAt).getTime();
                const mins = Math.floor(diff / 60000);
                if (mins < 60) return `${mins} min`;
                const hrs = Math.floor(mins / 60);
                if (hrs < 24) return `${hrs} h`;
                return `${Math.floor(hrs / 24)} d`;
              })();
              return (
                <View key={r.id} style={styles.conditionRow}>
                  <Text style={styles.conditionEmoji}>{emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.conditionLabel, { color: colors.foreground }]}>
                      {t.conditions[level] ?? r.condition}
                    </Text>
                    {r.note ? (
                      <Text style={[styles.conditionNote, { color: colors.mutedForeground }]}>
                        {r.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.conditionTime, { color: colors.mutedForeground }]}>
                    {t.conditionReportedAgo(relTime)}
                  </Text>
                </View>
              );
            })
          )}
        </View>


        <View
          style={[
            styles.energyCard,
            { borderColor: colors.glassBorder },
            lowBattery && { borderColor: colors.accent },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.energyTitle, { color: colors.foreground }]}>
              {t.energySavingTitle}
            </Text>
            <Text style={[styles.energyHint, { color: colors.mutedForeground }]}>
              {t.energySavingHint}
            </Text>
          </View>
          <Switch
            value={energiesparmodus}
            onValueChange={setEnergiesparmodus}
            trackColor={{ true: colors.accent, false: colors.card }}
            thumbColor={colors.foreground}
          />
        </View>

        <PrimaryButton
          label={importing ? t.importGpxImporting : t.importGpx}
          variant="secondary"
          onPress={onImportGpx}
          disabled={importing}
          style={{ marginTop: 20 }}
        />

        <SparkDivider style={{ marginVertical: 22 }} />

        <Text style={[styles.blockTitle, { color: colors.foreground }]}>
          {t.matchingSaga}
        </Text>

        {showPicker ? (
          <>
            <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
              {t.sagaPickerHint}
            </Text>
            {unlockedCandidates.map((s) => {
              const sessions = hikeHistory.filter((h) => h.sagaId === s.id);
              const prog =
                sessions.length === 0 ? 'new'
                : sessions.some((h) => (h.chapters?.length ?? 0) >= 3) ? 'done'
                : 'partial';
              const progLabel = prog === 'done' ? t.progressDone : prog === 'partial' ? t.progressStarted : t.progressNew;
              const progDot = prog === 'done' ? '#4caf50' : prog === 'partial' ? '#ff9800' : colors.mutedForeground;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => selectFromPicker(s)}
                  style={[
                    styles.sagaCard,
                    { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                      {s.canton.toUpperCase()} · {s.coreMotif.toUpperCase()}
                    </Text>
                    <Text style={[styles.sagaTitle, { color: colors.foreground }]}>
                      {s.summaries?.[(profile?.language ?? 'de') as string]?.title ?? s.title}
                    </Text>
                    <Text style={[styles.sagaMood, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {s.mood}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <View style={{
                      backgroundColor: prog === 'done' ? '#4caf5022' : prog === 'partial' ? '#ff980022' : colors.glassBg,
                      borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                      borderWidth: 1, borderColor: progDot + '55',
                    }}>
                      <Text style={{ color: progDot, fontSize: 11, fontWeight: '600' }}>{progLabel}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.accent} />
                  </View>
                </Pressable>
              );
            })}
            {hasLockedCandidates && (
              <PrimaryButton
                label={t.unlockMoreSagas}
                variant="gold"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: 8 }}
              />
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
              {sagaLoading
                ? t.matchingSagaHintLoading
                : t.matchingSagaHintLoaded}
            </Text>

            {sagaLoading ? (
              <View
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                {/* Skeleton in Sagakarten-Form — Titel, zwei Textzeilen, Meta. */}
                <View style={{ flex: 1 }}>
                  <Skeleton height={20} width="55%" radius={8} />
                  <Skeleton height={13} radius={7} style={{ marginTop: 10 }} />
                  <Skeleton height={13} width="80%" radius={7} style={{ marginTop: 7 }} />
                  <Text
                    style={[styles.sagaLoadingText, { color: colors.mutedForeground, marginTop: 12 }]}
                  >
                    {t.sagaWriting}
                  </Text>
                </View>
              </View>
            ) : !saga ? (
              <View
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <Text style={[styles.sagaMood, { color: colors.mutedForeground }]}>
                  {t.sagaLoadError}
                </Text>
                <Pressable
                  onPress={() => {
                    setSagaLoading(true);
                    setSagaRetryCount((c) => c + 1);
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  style={[styles.retryChip, { borderColor: colors.glassBorder, marginTop: 10 }]}
                >
                  <Feather name="refresh-cw" size={12} color={colors.accent} />
                  <Text style={[styles.retryChipText, { color: colors.accent }]}>
                    {ts.retry}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push(`/saga/${saga.id}?routeId=${route.id}`)}
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                    {saga.canton.toUpperCase()} · {saga.coreMotif.toUpperCase()}
                  </Text>
                  <Text style={[styles.sagaTitle, { color: colors.foreground }]}>
                    {saga.summaries?.[(profile?.language ?? 'de') as string]?.title ?? saga.title}
                  </Text>
                  <Text
                    style={[styles.sagaMood, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {saga.mood}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {(() => {
                    const sessions = hikeHistory.filter((h) => h.sagaId === saga.id);
                    const prog =
                      sessions.length === 0 ? 'new'
                      : sessions.some((h) => (h.chapters?.length ?? 0) >= 3) ? 'done'
                      : 'partial';
                    const progLabel = prog === 'done' ? t.progressDone : prog === 'partial' ? t.progressStarted : t.progressNew;
                    const progDot = prog === 'done' ? '#4caf50' : prog === 'partial' ? '#ff9800' : colors.mutedForeground;
                    return (
                      <View style={{
                        backgroundColor: prog === 'done' ? '#4caf5022' : prog === 'partial' ? '#ff980022' : colors.glassBg,
                        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: progDot + '55',
                      }}>
                        <Text style={{ color: progDot, fontSize: 11, fontWeight: '600' }}>{progLabel}</Text>
                      </View>
                    );
                  })()}
                  {locked ? (
                    <Feather name="lock" size={18} color={colors.mutedForeground} />
                  ) : (
                    <Feather name="chevron-right" size={20} color={colors.accent} />
                  )}
                </View>
              </Pressable>
            )}

            {saga &&
            !sagaLoading &&
            sagaLokalisierung(route, saga) === "nicht_exakt_lokalisierbar" ? (
              <Text style={[styles.localisationNote, { color: colors.mutedForeground }]}>
                {t.localisationNote}
              </Text>
            ) : null}

            {saga && !sagaLoading && !showPicker ? (
              <PrimaryButton
                label={locked ? t.premiumButton : t.continueToSaga}
                variant={locked ? "gold" : "primary"}
                onPress={() =>
                  router.push(
                    locked ? "/paywall" : `/saga/${saga.id}?routeId=${route.id}`,
                  )
                }
                style={{ marginTop: 16 }}
              />
            ) : null}
          </>
        )}

        {similarRoutes.length > 0 && (
          <>
            <SparkDivider style={{ marginVertical: 22 }} />
            <Text style={[styles.blockTitle, { color: colors.foreground }]}>
              {t.similarRoutes}
            </Text>
            {similarRoutes.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/route/${encodeURIComponent(r.id)}`)}
                style={[
                  styles.similarRouteCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.similarRouteName, { color: colors.foreground }]}
                    numberOfLines={2}
                  >
                    {r.name}
                  </Text>
                  <Text style={[styles.similarRouteMeta, { color: colors.mutedForeground }]}>
                    {r.distanceKm.toFixed(1)} km · {r.region}
                  </Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.accent} />
              </Pressable>
            ))}
          </>
        )}
        {/* Verstecktes ShareCard für captureRef (off-screen Export) */}
        {route && saga && (
          <View
            pointerEvents="none"
            collapsable={false}
            style={{ position: "absolute", left: -2000, top: 0 }}
          >
            <ShareCard
              ref={shareCardRef}
              sagaTitle={saga.title}
              routeName={route.name}
              distanceKm={meta.distanceKm}
              ascentM={meta.ascentM}
              sacScale={meta.sac}
              geometry={route.geometry ?? []}
              distanceLabel={t.distance}
              ascentLabel={t.ascent}
              timeLabel={t.duration}
              stepsLabel=""
            />
          </View>
        )}
      </ScrollView>
    </Background>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.stat,
        { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
      ]}
    >
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
      <View style={styles.statValRow}>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? (
          <Text style={[styles.statUnit, { color: colors.accent }]}>{unit}</Text>
        ) : null}
      </View>
    </View>
  );
}

function CheckRow({
  icon,
  label,
  value,
  ok,
  warn,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const colors = useColors();
  const tint = warn ? colors.accent : colors.mutedForeground;
  return (
    <View style={styles.checkRow}>
      <Feather name={icon} size={16} color={tint} />
      <Text style={[styles.checkLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  retryChipText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  routeName: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 18 },
  forSaga: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  elevChartCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },
  elevChartTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 10 },
  stat: { ...GLAS_3D,
    width: "47.5%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  statLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  statValRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 26 },
  statUnit: { fontFamily: fonts.mono, fontSize: 13 },
  blockTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginBottom: 12 },
  downloadCard: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  downloadHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  downloadTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  downloadHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  downloadProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
  },
  downloadProgressText: { fontFamily: fonts.mono, fontSize: 13 },
  checkCard: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  checkValue: { fontFamily: fonts.mono, fontSize: 13 },
  checkNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: "italic" },
  conditionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  conditionEmoji: { fontSize: 20, lineHeight: 24 },
  conditionLabel: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  conditionNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  conditionTime: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  rueckreiseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  rueckreiseText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  energyCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  energyTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  energyHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 2 },
  sagaHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  sagaCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sagaCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  sagaTitle: { fontFamily: fonts.titleBold, fontSize: 19, marginTop: 4 },
  sagaMood: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  sagaLoadingText: { fontFamily: fonts.mono, fontSize: 13 },
  localisationNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: "italic",
  },
  similarRouteCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  similarRouteName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  similarRouteMeta: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionChipText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
