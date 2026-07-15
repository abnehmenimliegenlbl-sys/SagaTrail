import React from "react";
import {
  View,
  Text,
  Pressable,
  Linking,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { fonts } from "@/constants/typography";
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

export default function SacHuettenSection({ huetten, loading, error }: Props) {
  const colors = useColors();
  const t = useRouteStrings();

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
            const phone = h.telefon;
            const website = h.websiteUrl;
            return (
              <View
                key={h.osmId}
                style={{
                  width: 220,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: h.isPartner ? colors.accent : colors.glassBorder,
                  backgroundColor: colors.glassBg,
                  overflow: "hidden",
                }}
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
                      style={{
                        color: colors.foreground,
                        fontFamily: fonts.bodyBold,
                        fontSize: 14,
                        flex: 1,
                      }}
                      numberOfLines={2}
                    >
                      {h.name}
                    </Text>
                    {h.isPartner && (
                      <View
                        style={{
                          backgroundColor: colors.accent,
                          borderRadius: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                        }}
                      >
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
                    {isOpen !== null && (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: isOpen ? "#16a34a22" : "#dc262622",
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: isOpen ? "#16a34a" : "#dc2626",
                          }}
                        />
                        <Text
                          style={{
                            color: isOpen ? "#16a34a" : "#dc2626",
                            fontSize: 11,
                            fontFamily: fonts.bodyBold,
                          }}
                        >
                          {isOpen ? t.sacHuettenOpen : t.sacHuettenClosed}
                        </Text>
                      </View>
                    )}
                  </View>

                  {h.beschreibung ? (
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 12 }}
                      numberOfLines={2}
                    >
                      {h.beschreibung}
                    </Text>
                  ) : null}

                  {h.angebot ? (
                    <Text
                      style={{ color: colors.accent, fontSize: 12 }}
                      numberOfLines={2}
                    >
                      {h.angebot}
                    </Text>
                  ) : null}

                  <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                    {phone ? (
                      <Pressable
                        onPress={() => Linking.openURL(`tel:${phone}`)}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.glassBorder,
                          backgroundColor: colors.glassBg,
                        }}
                      >
                        <Feather name="phone" size={13} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 12, fontFamily: fonts.bodyBold }}>
                          {t.sacHuettenCall}
                        </Text>
                      </Pressable>
                    ) : null}
                    {website ? (
                      <Pressable
                        onPress={() => Linking.openURL(website)}
                        style={{
                          flex: 1,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          paddingVertical: 7,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.glassBorder,
                          backgroundColor: colors.glassBg,
                        }}
                      >
                        <Feather name="calendar" size={13} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 12, fontFamily: fonts.bodyBold }}>
                          {t.sacHuettenReserve}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
