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
  renderKarte: (hoehe: number, safeAreaTop: number) => React.ReactNode;
  /**
   * Wird aufgerufen, sobald der Vollbild-Zustand sich aendert. Erlaubt es der
   * aufrufenden Seite, den aktuellen Vollbild-Status mitzuverfolgen.
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
  /**
   * Wird aufgerufen, sobald die Vollbild-Karte VOLLSTAENDIG geschlossen ist
   * (nach Abschluss der Fade-Animation) — nicht schon, wenn closeSignal
   * eingeht. Erlaubt es der aufrufenden Seite, ein zweites Modal (z. B.
   * POI-Detail oder Partner-Detail) erst dann zu oeffnen, wenn der Vollbild-
   * Modal den Bildschirm vollstaendig freigegeben hat und keine Touch-Events
   * mehr abfaengt. Ohne diese Sequenzierung lagen beide Modals gleichzeitig
   * offen; der noch-fading-out Karten-Modal schluckte Touches auf dem
   * darunter liegenden Detail-Modal (X-Button reagierte nicht).
   */
  onFullyClosed?: () => void;
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
  onFullyClosed,
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
      // onVollbildChange explizit benachrichtigen (setVollbild koennte den
      // State nicht setzen wenn vollbild bereits false ist).
      onVollbildChange?.(false);
    }
  }, [closeSignal, onVollbildChange]);

  return (
    <>
      <View style={{ height }}>
        {/* Im Vollbild laeuft nur EINE Karteninstanz (WebView/iframe ist
            teuer) — die eingebettete Karte pausiert solange als leere Flaeche. */}
        {!vollbild && renderKarte(height, 0)}
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
        onDismiss={onFullyClosed}
      >
        <View style={[styles.vollbild, { backgroundColor: colors.background }]}>
          {renderKarte(fensterHoehe, insets.top)}
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
