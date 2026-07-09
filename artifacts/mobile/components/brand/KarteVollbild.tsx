import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface KarteVollbildProps {
  /** Hoehe der eingebetteten (nicht-Vollbild-)Karte. */
  height?: number;
  /** Rendert die Karte fuer eine gegebene Hoehe (einmal klein, einmal Vollbild). */
  renderKarte: (hoehe: number) => React.ReactNode;
  /**
   * Wird aufgerufen, sobald der Vollbild-Zustand sich aendert. Erlaubt es der
   * aufrufenden Seite, z. B. bei Antippen eines POI die Vollbild-Karte VOR
   * dem Oeffnen des POI-Detail-Modals zu schliessen — zwei gleichzeitig
   * sichtbare RN-`Modal`e stapeln sich plattformabhaengig unzuverlaessig
   * (auf Android/Web landet das zuletzt geoeffnete Modal teils hinter dem
   * ersten), was das POI-Detail von der noch offenen Vollbild-Karte
   * ueberlagert erscheinen liess.
   */
  onVollbildChange?: (vollbild: boolean) => void;
  /**
   * Erzwingt das Schliessen der Vollbild-Karte von aussen (z. B. beim
   * Antippen eines POI-Markers). `onVollbildChange` allein reicht dafuer
   * NICHT: es ist nur eine Benachrichtigung nach aussen, keine Steuerung
   * von aussen -- der interne Vollbild-State reagiert sonst nicht darauf.
   * Jede Aenderung dieses Werts (Zaehler hochzaehlen) schliesst die Karte.
   */
  closeSignal?: number;
}

/**
 * Macht eine eingebettete Karte per Antippen zum Vollbild. Im eingebetteten
 * Zustand faengt eine transparente Flaeche den Tipp ab (die kleine Karte ist
 * ohnehin kaum sinnvoll bedienbar); rechts oben zeigt ein Symbol die
 * Vergroesserbarkeit an. Im Vollbild ist die Karte voll interaktiv, ein
 * kleiner Knopf rechts oben bringt sie in die Ursprungsgroesse zurueck.
 */
export function KarteVollbild({
  height = 200,
  renderKarte,
  onVollbildChange,
  closeSignal,
}: KarteVollbildProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height: fensterHoehe } = useWindowDimensions();
  const [vollbild, setVollbildState] = useState(false);
  const setVollbild = (v: boolean) => {
    setVollbildState(v);
    onVollbildChange?.(v);
  };
  const letzterCloseSignal = React.useRef(closeSignal);
  React.useEffect(() => {
    if (closeSignal !== undefined && closeSignal !== letzterCloseSignal.current) {
      letzterCloseSignal.current = closeSignal;
      setVollbildState(false);
    }
  }, [closeSignal]);

  return (
    <>
      <View style={{ height }}>
        {/* Im Vollbild laeuft nur EINE Karteninstanz (WebView/iframe ist
            teuer) — die eingebettete Karte pausiert solange als leere Flaeche. */}
        {!vollbild && renderKarte(height)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Karte im Vollbild anzeigen"
          onPress={() => setVollbild(true)}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[styles.hinweis, { backgroundColor: colors.background + "CC" }]}
        >
          <Feather name="maximize-2" size={14} color={colors.foreground} />
        </View>
      </View>

      <Modal
        visible={vollbild}
        animationType="fade"
        onRequestClose={() => setVollbild(false)}
      >
        <View style={[styles.vollbild, { backgroundColor: colors.background }]}>
          {renderKarte(fensterHoehe)}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Vollbild schliessen"
            onPress={() => setVollbild(false)}
            hitSlop={10}
            style={[
              styles.schliessen,
              {
                top: insets.top + 12,
                backgroundColor: colors.background + "E6",
                borderColor: colors.border,
              },
            ]}
          >
            <Feather name="minimize-2" size={18} color={colors.foreground} />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  hinweis: {
    position: "absolute",
    top: 10,
    right: 10,
    borderRadius: 8,
    padding: 6,
  },
  vollbild: {
    flex: 1,
  },
  schliessen: {
    position: "absolute",
    right: 16,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
});
