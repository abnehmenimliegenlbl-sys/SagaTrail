import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import colors from "@/constants/colors";
import { useMapStrings } from "@/lib/i18n/screens/map";
import { buildSwisstopoHtml, SwisstopoMapProps } from "./swisstopoMapHtml";

type MapWindow = Window & { sttSetPosition?: (lat: number, lng: number) => void };

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
  offlineTiles,
  aerialways,
  pois,
  onPoiPress,
  partners,
  onPartnerPress,
}: SwisstopoMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const t = useMapStrings();
  const html = useMemo(
    () =>
      buildSwisstopoHtml(
        center,
        label,
        geometry,
        offlineTiles,
        aerialways,
        pois,
        {
          title: t.legendTitle,
          route: t.legendRoute,
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
        },
        partners
      ),
    [center.lat, center.lng, label, geometry, offlineTiles, aerialways, pois, partners, t]
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

  // Der iframe teilt sich denselben Ursprung (srcDoc), Klicks auf POI-Marker
  // kommen daher per window.postMessage von seinem contentWindow zurueck.
  useEffect(() => {
    if (!onPoiPress && !onPartnerPress) return;
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
      } catch {
        // Ignoriere Nachrichten, die kein gueltiges JSON sind.
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPoiPress, onPartnerPress]);

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
