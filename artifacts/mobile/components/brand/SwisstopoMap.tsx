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
 *
 * pois, partners, aerialways werden NICHT ins HTML gebacken — sie werden nach
 * map-load per injectJavaScript injiziert (window.sttSetPois / sttSetPartners /
 * sttSetAerialways). So lädt die WebView nur einmal, auch wenn diese Daten
 * async nachkommen. Ein WKWebView-Reload während eines postMessage-Aufrufs
 * würde die Nachricht fallen lassen und den POI-Klick-Kanal brechen.
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
  waterSources,
  parkingSpots,
  pickerMode,
  onMapClick,
  safeAreaInsetTop = 0,
}: SwisstopoMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const t = useMapStrings();

  // HTML erzeugen — OHNE pois/partners/aerialways (die werden per inject nachgeliefert).
  const html = useMemo(
    () =>
      buildSwisstopoHtml(
        center,
        label,
        geometry,
        offlineTiles,
        null,   // aerialways — per sttSetAerialways injiziert
        null,   // pois      — per sttSetPois injiziert
        {
          title: t.legendTitle,
          route: t.legendRoute,
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
        },
        null,   // partners  — per sttSetPartners injiziert
        pickerMode,
        altGeometry,
        waterSources,
        safeAreaInsetTop,
        parkingSpots
      ),
    // aerialways/pois/partners BEWUSST NICHT in deps — werden per inject geliefert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center.lat, center.lng, label, geometry, altGeometry, offlineTiles, waterSources, parkingSpots, pickerMode, safeAreaInsetTop, t]
  );

  // Bei neuem Dokument (Kartenwechsel) den Ladezustand zuruecksetzen.
  useEffect(() => {
    setReady(false);
  }, [html]);

  // Position per injectJavaScript einspielen (kein Reload).
  useEffect(() => {
    if (!ready || !position) return;
    ref.current?.injectJavaScript(
      `window.sttSetPosition && window.sttSetPosition(${position.lat}, ${position.lng}); true;`
    );
  }, [ready, position?.lat, position?.lng]);

  // POIs per injectJavaScript einspielen (kein Reload).
  useEffect(() => {
    if (!ready) return;
    const json = pois && pois.length > 0 ? JSON.stringify(pois) : "null";
    ref.current?.injectJavaScript(
      `window.sttSetPois && window.sttSetPois(${json}); true;`
    );
  }, [ready, pois]);

  // Partner per injectJavaScript einspielen (kein Reload).
  useEffect(() => {
    if (!ready) return;
    const json = partners && partners.length > 0 ? JSON.stringify(partners) : "null";
    ref.current?.injectJavaScript(
      `window.sttSetPartners && window.sttSetPartners(${json}); true;`
    );
  }, [ready, partners]);

  // Seilbahnen per injectJavaScript einspielen (kein Reload).
  useEffect(() => {
    if (!ready) return;
    const json = aerialways && aerialways.length > 0 ? JSON.stringify(aerialways) : "null";
    ref.current?.injectJavaScript(
      `window.sttSetAerialways && window.sttSetAerialways(${json}); true;`
    );
  }, [ready, aerialways]);

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
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data?.type === "stt-html-ready") {
              // Erst wenn die Karte selbst "bereit" meldet, injizieren wir
              // Daten — onLoadEnd feuert bei WKWebView auch fuer Zwischen-
              // Dokumente und die Injektion ginge dann verloren.
              setReady(true);
            }
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
