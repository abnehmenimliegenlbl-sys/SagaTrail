import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import colors from "@/constants/colors";
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
  offlineTiles,
}: SwisstopoMapProps) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const html = useMemo(
    () => buildSwisstopoHtml(center, label, offlineTiles),
    [center.lat, center.lng, label, offlineTiles]
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
