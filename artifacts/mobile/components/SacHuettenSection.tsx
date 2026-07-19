import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { fonts } from "@/constants/typography";
import { GLAS_3D } from "@/constants/depth";
import { useRouteStrings } from "@/lib/i18n/screens/route";

export interface SacHuette {
  osmId: string;
  name: string;
  lat: number;
  lng: number;
  telefon: string | null;
  websiteUrl: string | null;
  elevation: number | null;
  openingHours: string | null;
  isPartner: boolean;
  partnerId: string | null;
  beschreibung: string | null;
  angebot: string | null;
  fotoUrl: string | null;
}

interface Props {
  huetten: SacHuette[];
  loading: boolean;
  error: boolean;
}

const MONTHS_EN: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function parseOpenStatus(
  openingHours: string | null,
  elevation: number | null,
): boolean | null {
  const month = new Date().getMonth() + 1;
  if (openingHours) {
    const m = /([A-Za-z]{3})\s*[-–]\s*([A-Za-z]{3})/i.exec(openingHours);
    if (m) {
      const start = MONTHS_EN[m[1].toLowerCase().slice(0, 3)];
      const end = MONTHS_EN[m[2].toLowerCase().slice(0, 3)];
      if (start && end) return month >= start && month <= end;
    }
  }
  if (elevation != null) {
    if (elevation > 2500) return month >= 6 && month <= 10;
    return month >= 5 && month <= 10;
  }
  return null;
}

function StatusBadge({ isOpen, t }: { isOpen: boolean | null; t: ReturnType<typeof useRouteStrings> }) {
  if (isOpen === null) return null;
  const color = isOpen ? "#16a34a" : "#dc2626";
  const bg = isOpen ? "#16a34a22" : "#dc262622";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: bg }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color, fontSize: 12, fontFamily: fonts.bodyBold }}>
        {isOpen ? t.sacHuettenOpen : t.sacHuettenClosed}
      </Text>
    </View>
  );
}

function DetailModal({ huette, onClose, t }: { huette: SacHuette; onClose: () => void; t: ReturnType<typeof useRouteStrings> }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isOpen = parseOpenStatus(huette.openingHours, huette.elevation);

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(160)}
        exiting={FadeOut.duration(160)}
        style={[StyleSheet.absoluteFillObject, styles.backdrop]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View
          entering={FadeInDown.duration(240).springify().damping(18)}
          style={[styles.sheet, { maxWidth: Math.min(width - 32, 480), borderColor: huette.isPartner ? colors.accent : colors.glassBorder }]}
        >
          <View style={[styles.sheetClip, { borderRadius: 20 }]}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassBgStrong }]} />

            {/* Foto */}
            {huette.fotoUrl ? (
              <Image source={{ uri: huette.fotoUrl }} style={styles.heroImg} resizeMode="cover" />
            ) : (
              <View style={[styles.heroPlaceholder, { backgroundColor: colors.glassBg }]}>
                <Feather name="home" size={32} color={colors.accent} />
              </View>
            )}

            {/* Partner-Streifen */}
            {huette.isPartner && (
              <View style={[styles.partnerBanner, { backgroundColor: colors.accent }]}>
                <Feather name="star" size={11} color="#fff" />
                <Text style={styles.partnerBannerText}>{t.sacHuettenPartnerBadge}</Text>
              </View>
            )}

            {/* Scroll-Inhalt */}
            <ScrollView
              style={{ maxHeight: 420 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}
            >
              {/* Name + Status */}
              <Text style={[styles.name, { color: colors.foreground }]}>{huette.name}</Text>

              <View style={styles.metaRow}>
                {huette.elevation != null && (
                  <View style={styles.metaItem}>
                    <Feather name="trending-up" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                      {t.sacHuettenAltitude(Math.round(huette.elevation))}
                    </Text>
                  </View>
                )}
                <StatusBadge isOpen={isOpen} t={t} />
              </View>

              {/* Öffnungszeiten */}
              {huette.openingHours ? (
                <View style={styles.infoBlock}>
                  <View style={styles.infoRow}>
                    <Feather name="clock" size={13} color={colors.accent} />
                    <Text style={[styles.infoLabel, { color: colors.accent }]}>{t.sacHuettenOeffnungszeiten}</Text>
                  </View>
                  <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{huette.openingHours}</Text>
                </View>
              ) : null}

              {/* Beschreibung */}
              {huette.beschreibung ? (
                <Text style={[styles.beschreibung, { color: colors.mutedForeground }]}>{huette.beschreibung}</Text>
              ) : null}

              {/* Angebot */}
              {huette.angebot ? (
                <View style={[styles.angebotBox, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
                  <Feather name="tag" size={13} color={colors.accent} />
                  <Text style={[styles.angebotText, { color: colors.accent }]}>{huette.angebot}</Text>
                </View>
              ) : null}

              {/* Buttons */}
              <View style={styles.actionRow}>
                {huette.telefon ? (
                  <Pressable
                    onPress={() => { Linking.openURL(`tel:${huette.telefon}`); }}
                    style={({ pressed }) => [styles.actionBtn, GLAS_3D, { borderColor: colors.accent, backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Feather name="phone" size={14} color="#fff" />
                    <Text style={[styles.actionBtnText, { color: "#fff" }]}>{t.sacHuettenCall}</Text>
                  </Pressable>
                ) : null}
                {huette.websiteUrl ? (
                  <Pressable
                    onPress={() => { Linking.openURL(huette.websiteUrl!); }}
                    style={({ pressed }) => [styles.actionBtn, GLAS_3D, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Feather name="calendar" size={14} color={colors.accent} />
                    <Text style={[styles.actionBtnText, { color: colors.accent }]}>{t.sacHuettenReserve}</Text>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>

            {/* Schliessen-Button */}
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [styles.closeBtn, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder, opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

export default function SacHuettenSection({ huetten, loading, error }: Props) {
  const colors = useColors();
  const t = useRouteStrings();
  const [selected, setSelected] = useState<SacHuette | null>(null);

  function openHuette(h: SacHuette) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(h);
  }

  return (
    <View style={{ marginTop: 20 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Feather name="home" size={16} color={colors.accent} />
        <Text style={{ color: colors.foreground, fontFamily: fonts.bodyBold, fontSize: 15 }}>
          {t.sacHuettenTitle}
        </Text>
      </View>

      {loading && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t.sacHuettenLoading}</Text>
        </View>
      )}

      {!loading && error && (
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t.sacHuettenError}</Text>
      )}

      {!loading && !error && huetten.length === 0 && (
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{t.sacHuettenNone}</Text>
      )}

      {!loading && !error && huetten.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingRight: 20 }}
        >
          {huetten.map((h) => {
            const isOpen = parseOpenStatus(h.openingHours, h.elevation);
            return (
              <Pressable
                key={h.osmId}
                onPress={() => openHuette(h)}
                style={({ pressed }) => ({
                  width: 220,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: h.isPartner ? colors.accent : colors.glassBorder,
                  backgroundColor: colors.glassBg,
                  overflow: "hidden",
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                {h.fotoUrl ? (
                  <Image
                    source={{ uri: h.fotoUrl }}
                    style={{ width: "100%", height: 100 }}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={{ padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{ color: colors.foreground, fontFamily: fonts.bodyBold, fontSize: 14, flex: 1 }}
                      numberOfLines={2}
                    >
                      {h.name}
                    </Text>
                    {h.isPartner && (
                      <View style={{ backgroundColor: colors.accent, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: "#fff", fontSize: 10, fontFamily: fonts.bodyBold }}>
                          {t.sacHuettenPartnerBadge}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {h.elevation != null && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Feather name="trending-up" size={12} color={colors.mutedForeground} />
                        <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                          {t.sacHuettenAltitude(Math.round(h.elevation))}
                        </Text>
                      </View>
                    )}
                    <StatusBadge isOpen={isOpen} t={t} />
                  </View>

                  {h.beschreibung ? (
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }} numberOfLines={2}>
                      {h.beschreibung}
                    </Text>
                  ) : null}

                  {/* Tap-Hinweis */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <Feather name="info" size={11} color={colors.accent} />
                    <Text style={{ color: colors.accent, fontSize: 11, fontFamily: fonts.body }}>Details</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {selected && (
        <DetailModal huette={selected} onClose={() => setSelected(null)} t={t} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(6,10,11,0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 9999,
  },
  sheet: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 20,
    overflow: "hidden",
  },
  sheetClip: {
    overflow: "hidden",
  },
  heroImg: {
    width: "100%",
    height: 180,
  },
  heroPlaceholder: {
    width: "100%",
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  partnerBannerText: {
    color: "#fff",
    fontFamily: fonts.bodyBold,
    fontSize: 12,
  },
  body: {
    padding: 20,
    gap: 12,
    paddingBottom: 24,
  },
  name: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    lineHeight: 26,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: fonts.body,
  },
  infoBlock: {
    gap: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  infoLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
  },
  infoText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
  },
  beschreibung: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
  },
  angebotBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  angebotText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
