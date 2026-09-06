import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { hapticSelection } from "@/lib/haptics";
import type { TerrainProfilePoint } from "@/lib/terrainCues";

type Props = {
  visible: boolean;
  onClose: () => void;
  geometry: number[][] | null | undefined;
  terrainProfile: TerrainProfilePoint[] | null;
};

/** Web/non-GL is deliberately not a fake 3D scene. */
export default function RouteTerrain3D({ visible, onClose }: Props) {
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Pressable
          onPress={() => {
            hapticSelection();
            onClose();
          }}
          style={styles.close}
          accessibilityLabel="3D-Ansicht schliessen"
        >
          <Feather name="x" size={24} color={colors.foreground} />
        </Pressable>
        <View style={styles.message}>
          <Feather name="map" size={32} color={colors.mutedForeground} />
          <Text style={[styles.title, { color: colors.foreground }]}>3D-Gelände</Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            Die 3D-Geländeansicht ist auf diesem Gerät ohne native Grafikunterstützung nicht verfügbar.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  close: { position: "absolute", top: 54, right: 20, zIndex: 2, padding: 10 },
  message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, gap: 12 },
  title: { fontSize: 23, fontWeight: "700" },
  copy: { textAlign: "center", fontSize: 16, lineHeight: 23 },
});