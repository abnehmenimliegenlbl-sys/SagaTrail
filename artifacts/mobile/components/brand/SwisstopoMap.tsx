import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import colors from "@/constants/colors";
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
  offlineTiles,
  aerialways,
  pois,
  onPoiPress,
}: SwisstopoMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const t = useMapStrings();
  const html = useMemo(
    () =>
      buildSwisstopoHtml(center, label, geometry, offlineTiles, aerialways, pois, {
        title: t.legendTitle,
        route: t.legendRoute,
        start: t.legendStart,
        ziel: t.legendZiel,
        position: t.legendPosition,
        wanderwege: t.legendWanderwege,
        seilbahn: t.legendSeilbahn,
        poi: t.legendPoi,
      }),
    [center.lat, center.lng, label, geometry, offlineTiles, aerialways, pois, t]
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

  return (
    <View style={[styles.wrap, { height }]}>
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
    borderRadius: colors.radius,
    borderWidth: 1,
    borderColor: colors.dark.glassBorder,
    backgroundColor: colors.dark.backgroundDeep,
  },
  web: { flex: 1, backgroundColor: "transparent" },
});
