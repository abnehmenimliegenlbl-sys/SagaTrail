import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";
import { useMapStrings } from "@/lib/i18n/screens/map";
import { buildSwisstopoHtml, SwisstopoMapProps } from "./swisstopoMapHtml";

/**
 * Native Kartenansicht (iOS/Android): rendert die swisstopo-Leaflet-Karte in
 * einer WebView. Position-Updates werden per injectJavaScript eingespielt,
 * damit die Kacheln nicht neu geladen werden.
 */
export function SwisstopoMap({
  center,
  position,
  label = "Start",
  height = 220,
  geometry,
  altGeometry,
  offlineTiles,
  aerialways,
  pois,
  onPoiPress,
  partners,
  onPartnerPress,
  pickerMode,
  onMapClick,
}: SwisstopoMapProps) {
  const ref = useRef<WebView>(null);
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
        partners,
        pickerMode,
        altGeometry
      ),
    [center.lat, center.lng, label, geometry, altGeometry, offlineTiles, aerialways, pois, partners, pickerMode, t]
  );

  // Bei neuem Dokument (Kartenwechsel) den Ladezustand zuruecksetzen, damit die
  // Position erst nach vollstaendigem Neuladen eingespielt wird.
  useEffect(() => {
    setReady(false);
  }, [html]);

  useEffect(() => {
    if (!ready || !position) return;
    ref.current?.injectJavaScript(
      `window.sttSetPosition && window.sttSetPosition(${position.lat}, ${position.lng}); true;`
    );
  }, [ready, position?.lat, position?.lng]);

  const colors = useColors();
  return (
    <View
      style={[
        styles.wrap,
        {
          height,
          borderRadius: colors.radius,
          borderColor: colors.glassBorder,
          backgroundColor: colors.backgroundDeep,
        },
      ]}
    >
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        onLoadEnd={() => setReady(true)}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
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
          } catch {
            // Ignoriere Nachrichten, die kein gueltiges JSON sind.
          }
        }}
        style={styles.web}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    borderWidth: 1,
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
