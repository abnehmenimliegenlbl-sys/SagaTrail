import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import colors from "@/constants/colors";
import { useMapStrings } from "@/lib/i18n/screens/map";
import { buildLeafletMapHtml } from "./leafletMapHtml";
import { SwisstopoMapProps } from "./swisstopoMapHtml";

type MapWindow = Window & {
  sttSetPosition?: (lat: number, lng: number) => void;
  sttMapResize?: () => void;
};

/**
 * Web-Variante der Kartenansicht: rendert die swisstopo-Leaflet-Karte in einem
 * srcDoc-iframe (gleicher Ursprung), sodass Position-Updates direkt ueber die
 * globale Funktion sttSetPosition eingespielt werden koennen.
 */
export function SwisstopoMap({
  center,
  position,
  label = "Start",
  height = 220,
  geometry,
  elevationProfile,
  offlineTiles,
  aerialways,
  pois,
  onPoiPress,
  partners,
  onPartnerPress,
  waterSources,
  parkingSpots,
  safetyPois,
  sagaPin: _sagaPin, // Web-Variante: Pin wird via inline-HTML baked (kein inject nötig)
  pickerMode,
  drawMode,
  preserveViewOnReload = false,
  zoom = 14,
  onMapClick,
  onMapDraw,
}: SwisstopoMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const lastMapViewRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const [ready, setReady] = useState(false);
  const t = useMapStrings();
  const initialView = preserveViewOnReload && lastMapViewRef.current
    ? {
        lat: lastMapViewRef.current.lat,
        lng: lastMapViewRef.current.lng,
      }
    : center;
  const initialZoom = preserveViewOnReload && lastMapViewRef.current
    ? lastMapViewRef.current.zoom
    : zoom;
  const html = useMemo(
    () =>
      buildLeafletMapHtml(
        {
          center: initialView,
          label,
          geometry,
          pickerMode,
          drawMode,
          zoom: initialZoom,
          preserveViewOnReload,
          offlineTiles,
          aerialways,
          pois,
          partners,
          altGeometry: null,
          waterSources,
          parkingSpots,
          elevationProfile,
          safetyPois,
          sagaPin: _sagaPin,
        },
        {
          title: t.legendTitle,
          route: t.legendRoute,
          routeFlat: t.legendRouteFlat,
          routeGrade10to20: t.legendRouteGrade10to20,
          routeGrade20to30: t.legendRouteGrade20to30,
          routeGrade30plus: t.legendRouteGrade30plus,
          altRoute: t.legendAltRoute,
          start: t.legendStart,
          ziel: t.legendZiel,
          position: t.legendPosition,
          wegInternational: t.legendWegInternational,
          wegNational: t.legendWegNational,
          wegRegional: t.legendWegRegional,
          wegLokal: t.legendWegLokal,
          wegMehrfach: t.legendWegMehrfach,
          nummerWanderland: t.legendNummerWanderland,
          nummerLokal: t.legendNummerLokal,
          wegzeichen: t.legendWegzeichen,
          wegweiser: t.legendWegweiser,
          seilbahn: t.legendSeilbahn,
          seilbahnStation: t.legendSeilbahnStation,
          poi: t.legendPoi,
          partner: t.legendPartner,
          safetyCodes: t.legendSafetyCodes,
        },
      ),
    [initialView.lat, initialView.lng, initialZoom, label, geometry, elevationProfile, offlineTiles, aerialways, pois, partners, waterSources, parkingSpots, safetyPois, pickerMode, drawMode, preserveViewOnReload, t]
  );

  // Bei neuem Dokument (Kartenwechsel) den Ladezustand zuruecksetzen, damit die
  // Position erst nach vollstaendigem Neuladen eingespielt wird.
  useEffect(() => {
    setReady(false);
  }, [html]);

  useEffect(() => {
    if (!ready || !position) return;
    const win = ref.current?.contentWindow as MapWindow | null | undefined;
    if (win && typeof win.sttSetPosition === "function") {
      win.sttSetPosition(position.lat, position.lng);
    }
  }, [ready, position?.lat, position?.lng]);

  useEffect(() => {
    if (!ready) return;
    const win = ref.current?.contentWindow as MapWindow | null | undefined;
    win?.sttMapResize?.();
    requestAnimationFrame(() => win?.sttMapResize?.());
  }, [ready]);

  // Der iframe teilt sich denselben Ursprung (srcDoc), Klicks auf POI-Marker
  // kommen daher per window.postMessage von seinem contentWindow zurueck.
  useEffect(() => {
    if (!onPoiPress && !onPartnerPress && !onMapClick && !onMapDraw && !preserveViewOnReload) return;
    const handler = (event: MessageEvent) => {
      if (event.source !== ref.current?.contentWindow) return;
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "stt-poi-press" && typeof data.id === "string") {
          onPoiPress?.(data.id);
        }
        if (data?.type === "stt-partner-press" && typeof data.id === "string") {
          onPartnerPress?.(data.id);
        }
        if (
          data?.type === "stt-mapclick" &&
          typeof data.lat === "number" &&
          typeof data.lng === "number"
        ) {
          onMapClick?.(data.lat, data.lng);
        }
        if (data?.type === "stt-mapdraw" && Array.isArray(data.points)) {
          const points = data.points.filter(
            (point: unknown): point is { lat: number; lng: number } =>
              !!point &&
              typeof point === "object" &&
              Number.isFinite((point as { lat?: unknown }).lat) &&
              Number.isFinite((point as { lng?: unknown }).lng),
          );
          onMapDraw?.(points);
        }
        if (
          preserveViewOnReload &&
          data?.type === "stt-mapview" &&
          Number.isFinite(data.lat) &&
          Number.isFinite(data.lng) &&
          Number.isFinite(data.zoom)
        ) {
          lastMapViewRef.current = {
            lat: data.lat,
            lng: data.lng,
            zoom: data.zoom,
          };
        }
      } catch {
        // Ignoriere Nachrichten, die kein gueltiges JSON sind.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPoiPress, onPartnerPress, onMapClick, onMapDraw, preserveViewOnReload]);

  return (
    <View style={[styles.wrap, { height }]}>
      <iframe
        ref={ref}
        srcDoc={html}
        onLoad={() => setReady(true)}
        title="swisstopo Karte"
        style={{ border: "none", width: "100%", height: "100%", display: "block" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.dark.glassBorder,
    backgroundColor: colors.dark.backgroundDeep,
  },
});
