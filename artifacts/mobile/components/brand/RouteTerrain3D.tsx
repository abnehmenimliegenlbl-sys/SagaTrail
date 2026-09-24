import { Modal, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BackButton } from "@/components/brand/BackButton";
import { useColors } from "@/hooks/useColors";
import { useComponentStrings } from "@/lib/i18n/components";
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
  const t = useComponentStrings();
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <BackButton
          accessibilityLabel={t.backToApp}
          onPress={onClose}
          style={styles.backButton}
        />
        <View style={styles.message}>
          <Feather name="map" size={32} color={colors.mutedForeground} />
          <Text style={[styles.title, { color: colors.foreground }]}>{t.terrain3dTitle}</Text>
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            {t.terrain3dUnavailable}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backButton: { position: "absolute", top: 16, left: 16, zIndex: 2 },
  message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 36, gap: 12 },
  title: { fontSize: 23, fontWeight: "700" },
  copy: { textAlign: "center", fontSize: 16, lineHeight: 23 },
});