import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { useColors } from "@/hooks/useColors";
import { useMapStrings } from "@/lib/i18n/screens/map";
import { buildLeafletMapHtml } from "./leafletMapHtml";
import { SwisstopoMapProps } from "./swisstopoMapHtml";

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
  elevationProfile,
  altGeometry,
  offlineTiles,
  aerialways,
  pois,
  onPoiPress,
  partners,
  onPartnerPress,
  waterSources,
  parkingSpots,
  safetyPois,
  pickerMode,
  onMapClick,
  safeAreaInsetTop = 0,
  sagaPin,
}: SwisstopoMapProps) {
  const ref = useRef<WebView>(null);
  const [ready, setReady] = useState(false);
  const t = useMapStrings();

  // HTML erzeugen — OHNE pois/partners/aerialways (die werden per inject nachgeliefert).
  const html = useMemo(
    () =>
      buildLeafletMapHtml(
        {
          center,
          label,
          geometry,
          offlineTiles,
          aerialways,
          pois,
          partners,
          pickerMode,
          altGeometry,
          waterSources,
          parkingSpots,
          elevationProfile,
          safetyPois,
          sagaPin,
          safeAreaInsetTop,
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
    // aerialways/pois/partners BEWUSST NICHT in deps — werden per inject geliefert.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center.lat, center.lng, label, geometry, elevationProfile, altGeometry, offlineTiles, waterSources, parkingSpots, safetyPois, pickerMode, safeAreaInsetTop, t]
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

  // Sicherheits-POIs werden nachgeladen, damit die Karte bei Overpass-Latenz
  // nicht neu aufgebaut werden muss.
  useEffect(() => {
    if (!ready) return;
    const json = safetyPois && safetyPois.length > 0 ? JSON.stringify(safetyPois) : "null";
    ref.current?.injectJavaScript(
      `window.sttSetSafetyPois && window.sttSetSafetyPois(${json}); true;`
    );
  }, [ready, safetyPois]);

  // Saga-Pin per injectJavaScript einspielen.
  useEffect(() => {
    if (!ready) return;
    const json = sagaPin ? JSON.stringify(sagaPin) : "null";
    ref.current?.injectJavaScript(
      `window.sttSetSagaPin && window.sttSetSagaPin(${json}); true;`
    );
  }, [ready, sagaPin?.lat, sagaPin?.lng, sagaPin?.name]);

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
        // Wenn das native Layout der WebView sich ändert (z.B. Vollbild-Übergang
        // oder erster Render), schicken wir ein explizites map.resize() rein —
        // MapLibre kennt sonst die tatsächliche Canvas-Grösse nicht und lädt
        // nur Kacheln für einen falschen (oft 0x0) Viewport.
        onLayout={() => {
          ref.current?.injectJavaScript(
            "if(window.sttMapResize) window.sttMapResize(); true;"
          );
        }}
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
