import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { RouteAccordionCard } from "@/components/brand/RouteAccordionCard";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { GLAS_3D } from "@/constants/depth";
import {
  hasPurchasedPack,
  packEntitlementFuerKanton,
  SAGEN_PRO_PACK,
  sagaPackSlug,
} from "@/lib/kantonSlug";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useDownloads } from "@/contexts/DownloadContext";
import { useSubscription } from "@/lib/revenuecat";
import { useColors } from "@/hooks/useColors";
import { useRouteStrings } from "@/lib/i18n/screens/route";
import { allCantonSagasSorted, SagaProximityCategory, SagaWithMeta } from "@/lib/sagaMatch";
import { kantonSlug } from "@/lib/kantonSlug";
import { Saga } from "@/types";
import { alert } from "@/lib/appAlert";

export default function RouteSagaSelection() {
  const t = useRouteStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const routeId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { profile, premium, freeHikeUsed, hikeHistory } = useApp();
  const { hatEntitlement, isElite, isSubscribed } = useSubscription();
  const hasPremiumSubscription = premium || isSubscribed;
  const hasPremiumAccess = premium || isSubscribed || isElite;
  const { getRoute, sagas } = useCatalog();
  const { download, remove, isDownloaded, getRecord, progress } = useDownloads();
  const route = getRoute(routeId) ?? getRecord(routeId)?.routeSnapshot;
  const [selectedSagaId, setSelectedSagaId] = useState<string | null>(null);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const candidates = useMemo<SagaWithMeta[]>(
    () => (route ? allCantonSagasSorted(route.coordinates, route.region, sagas) : []),
    [route, sagas],
  );

  const isLocked = useCallback(
    (saga: Saga) => {
      if (hikeHistory.some((h) => h.sagaId === saga.id)) return false;
      if (isElite) return false;
      const slug = kantonSlug(saga.canton);
      const inCanton = sagas.filter((item) => item.canton === saga.canton);
      const index = inCanton.findIndex((item) => item.id === saga.id);
      const packSlug = index >= 0 ? sagaPackSlug(slug, index) : slug;
      const packUnlocked =
        hasPurchasedPack(profile?.purchasedPacks, packSlug) ||
        hatEntitlement(packEntitlementFuerKanton(packSlug));
      if (!hasPremiumSubscription) return freeHikeUsed && !packUnlocked;
      if (packUnlocked) return false;
      if (index < 0) return false;
      if (index >= SAGEN_PRO_PACK) return true;
      // `isAnchorPlace` ist ein Orts-/Katalogmerkmal und kein
      // Freischaltmerkmal. Ohne Kantonspack ist nur die erste Sage des
      // Kantons als Premium-Vorschau zugänglich.
      return index !== 0;
    },
    [freeHikeUsed, hikeHistory, hasPremiumSubscription, hatEntitlement, isElite, profile, sagas],
  );

  const selectedSaga = selectedSagaId
    ? candidates.find(({ saga }) => saga.id === selectedSagaId)?.saga
    : undefined;
  const selectedLocked = selectedSaga ? isLocked(selectedSaga) : false;
  const downloaded = selectedSaga ? isDownloaded(selectedSaga.id) : false;
  const record = selectedSaga ? getRecord(selectedSaga.id) : undefined;
  const downloading = Boolean(selectedSaga && progress?.sagaId === selectedSaga.id);
  const partialDownload = record?.status === "partial" || record?.status === "failed";
  const downloadProgress = downloading && progress
    ? progress.total > 0
      ? Math.min(progress.done / progress.total, 1)
      : 0.03
    : 0;
  const downloadProgressText = downloading
    ? progress?.phase === "tiles"
      ? t.loadingMap(progress.done, progress.total)
      : progress?.phase === "audio"
        ? t.loadingAudio(progress.done, progress.total)
        : progress?.phase === "pois"
          ? t.loadingPois
          : t.loadingSaga
    : "";
  const downloadPhaseIndex = ["story", "audio", "pois", "tiles"].indexOf(progress?.phase ?? "story");

  const selectSaga = (saga: Saga) => {
    if (isLocked(saga)) {
      router.push("/paywall");
      return;
    }
    setSelectedSagaId(saga.id);
  };

  const continueToSaga = () => {
    if (!route || !selectedSaga || selectedLocked) return;
    router.push(`/saga/${selectedSaga.id}?routeId=${route.id}`);
  };

  const onDownload = async () => {
    if (!profile || !route || !selectedSaga || downloading || busy || selectedLocked) return;
    setBusy(true);
    try {
      await download(selectedSaga, route, profile, hasPremiumAccess);
    } catch {
      alert(t.downloadFailed, t.downloadFailedText);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!selectedSaga) return;
    setBusy(true);
    try {
      await remove(selectedSaga.id);
    } finally {
      setBusy(false);
    }
  };

  if (!route) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top + 20 }]}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t.loadingSaga}
          </Text>
        </View>
      </Background>
    );
  }

  const categoryLabels: Record<SagaProximityCategory, string> = {
    on_route: t.sagaOnRoute,
    near: t.sagaNear,
    canton: t.sagaInCanton,
  };
  let lastCategory: SagaProximityCategory | null = null;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader eyebrow={route.region} title={t.matchingSaga} onBack />
        <Text style={[styles.introTitle, { color: colors.foreground }]}>
          {t.sagaPickerHint}
        </Text>
        <Text style={[styles.introText, { color: colors.mutedForeground }]}>
          {t.matchingSagaHintLoaded}
        </Text>

        <SparkDivider style={{ marginVertical: 18 }} />

        {candidates.map(({ saga, category }) => {
          const locked = isLocked(saga);
          const selected = selectedSagaId === saga.id;
          const showCategory = category !== lastCategory;
          lastCategory = category;
          const heard = hikeHistory.some((h) => h.sagaId === saga.id);
          return (
            <React.Fragment key={saga.id}>
              {showCategory ? (
                <Text style={[styles.category, { color: colors.mutedForeground }]}>
                  {categoryLabels[category]}
                </Text>
              ) : null}
              <Pressable
                onPress={() => selectSaga(saga)}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: locked }}
                style={[
                  styles.sagaCard,
                  {
                    borderColor: colors.glassBorder,
                    backgroundColor: colors.glassBg,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                    {saga.canton.toUpperCase()}
                  </Text>
                  <Text style={[styles.sagaTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {saga.title}
                  </Text>
                  <Text style={[styles.sagaStatus, { color: colors.mutedForeground }]}>
                    {locked
                      ? t.unlockMoreSagas
                      : heard
                        ? t.progressHeard
                        : t.progressNew}
                  </Text>
                </View>
                <Feather
                  name={locked ? "lock" : selected ? "check-circle" : "circle"}
                  size={20}
                  color={locked ? colors.mutedForeground : selected ? colors.accent : colors.mutedForeground}
                />
              </Pressable>
            </React.Fragment>
          );
        })}

        {candidates.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {t.sagaLoadError}
          </Text>
        ) : null}

        <PrimaryButton
          label={t.continueToSaga}
          variant="primary"
          onPress={continueToSaga}
          disabled={!selectedSaga || selectedLocked}
          style={{ marginTop: 20 }}
        />

        <RouteAccordionCard
          icon="download-cloud"
          title={t.saveForOffline}
          summary={t.downloadInfoTime}
          open={offlineOpen}
          onPress={() => setOfflineOpen((open) => !open)}
        >
          {!selectedSaga ? (
            <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
              {t.sagaPickerHint}
            </Text>
          ) : selectedLocked ? (
            <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
              {t.unlockMoreSagas}
            </Text>
          ) : (
            <>
              <View style={styles.downloadInfoBox}>
                {t.downloadInfoItems.map((item, index) => (
                  <View key={index} style={styles.downloadInfoRow}>
                    <Feather name="check" size={12} color={colors.accent} />
                    <Text style={[styles.downloadInfoItem, { color: colors.mutedForeground }]}>
                      {item}
                    </Text>
                  </View>
                ))}
                <View style={styles.downloadInfoTimeRow}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.downloadInfoTime, { color: colors.mutedForeground }]}>
                    {t.downloadInfoTime}
                  </Text>
                </View>
              </View>
              <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
                {partialDownload
                  ? t.downloadFailedText
                  : downloaded
                    ? t.offlineStatusActive(record?.sizeBytes ? `${Math.round(record.sizeBytes / 1024)} KB` : "")
                    : t.downloadInfoTime}
              </Text>
              {downloading ? (
                <View style={styles.downloadProgress}>
                  <View style={styles.downloadProgressHeader}>
                    <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
                      {downloadProgressText}
                    </Text>
                    <Text style={[styles.downloadPercent, { color: colors.mutedForeground }]}>
                      {Math.round(downloadProgress * 100)}%
                    </Text>
                  </View>
                  <View style={[styles.downloadBarTrack, { backgroundColor: colors.glassBorder }]}>
                    <View
                      style={[
                        styles.downloadBarFill,
                        {
                          backgroundColor: colors.accent,
                          width: `${Math.max(3, Math.round(downloadProgress * 100))}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.downloadPhaseRow}>
                    {t.downloadPhaseLabels.map((label, index) => {
                      const active = index <= downloadPhaseIndex;
                      return (
                        <Text
                          key={label}
                          style={[
                            styles.downloadPhaseLabel,
                            { color: active ? colors.accent : colors.mutedForeground },
                          ]}
                        >
                          {label}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ) : downloaded && !partialDownload ? (
                <PrimaryButton
                  label={t.removeDownload}
                  variant="secondary"
                  onPress={onDelete}
                  disabled={busy}
                  loading={busy}
                  style={{ marginTop: 14 }}
                />
              ) : (
                <PrimaryButton
                  label={t.download}
                  variant="secondary"
                  onPress={onDownload}
                  disabled={busy}
                  loading={busy}
                  style={{ marginTop: 14 }}
                />
              )}
            </>
          )}
        </RouteAccordionCard>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontFamily: fonts.body, fontSize: 14, textAlign: "center", lineHeight: 20 },
  introTitle: { fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 24, marginTop: 22 },
  introText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, marginTop: 7 },
  category: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 7,
    marginTop: 10,
  },
  sagaCard: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    minHeight: 88,
    marginBottom: 12,
  },
  sagaCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  sagaTitle: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 3 },
  sagaStatus: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  offlineHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  downloadInfoBox: { marginTop: 2, gap: 5 },
  downloadInfoRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  downloadInfoItem: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  downloadInfoTimeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  downloadInfoTime: { flex: 1, fontFamily: fonts.body, fontSize: 11, lineHeight: 16, fontStyle: "italic" },
  downloadProgress: { marginTop: 14 },
  downloadProgressHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  downloadPercent: { fontFamily: fonts.mono, fontSize: 13 },
  downloadBarTrack: { height: 5, borderRadius: 3, overflow: "hidden", marginTop: 8 },
  downloadBarFill: { height: 5, borderRadius: 3 },
  downloadPhaseRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  downloadPhaseLabel: { fontFamily: fonts.mono, fontSize: 10 },
});