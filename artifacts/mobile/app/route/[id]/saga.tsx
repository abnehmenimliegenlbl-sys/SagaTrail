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
import { SAGEN_PRO_PACK, sagaPackSlug } from "@/lib/kantonSlug";
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
  const { isElite } = useSubscription();
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
      if (!premium) return freeHikeUsed;
      const slug = kantonSlug(saga.canton);
      const inCanton = sagas.filter((item) => item.canton === saga.canton);
      const index = inCanton.findIndex((item) => item.id === saga.id);
      if (index >= SAGEN_PRO_PACK) return true;
      const packSlug = sagaPackSlug(slug, index);
      if ((profile?.purchasedPacks ?? []).includes(packSlug)) return false;
      return !saga.isAnchorPlace;
    },
    [freeHikeUsed, hikeHistory, isElite, premium, profile, sagas],
  );

  const selectedSaga = selectedSagaId
    ? candidates.find(({ saga }) => saga.id === selectedSagaId)?.saga
    : undefined;
  const selectedLocked = selectedSaga ? isLocked(selectedSaga) : false;
  const downloaded = selectedSaga ? isDownloaded(selectedSaga.id) : false;
  const record = selectedSaga ? getRecord(selectedSaga.id) : undefined;
  const downloading = Boolean(selectedSaga && progress?.sagaId === selectedSaga.id);
  const partialDownload = record?.status === "partial" || record?.status === "failed";

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
      await download(selectedSaga, route, profile, premium);
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
                    borderColor: selected ? colors.accent : colors.glassBorder,
                    backgroundColor: selected ? colors.accent + "16" : colors.glassBg,
                  },
                ]}
              >
                <View style={[styles.sagaIcon, { backgroundColor: colors.accent + "1A" }]}>
                  <Text style={{ fontSize: 21 }}>🧚</Text>
                </View>
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
              <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
                {partialDownload
                  ? t.downloadFailedText
                  : downloaded
                    ? t.offlineStatusActive(record?.sizeBytes ? `${Math.round(record.sizeBytes / 1024)} KB` : "")
                    : t.downloadInfoTime}
              </Text>
              {downloading ? (
                <View style={styles.downloadStatus}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.offlineHint, { color: colors.mutedForeground }]}>
                    {t.loadingSaga}
                  </Text>
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  sagaIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  sagaCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  sagaTitle: { fontFamily: fonts.titleBold, fontSize: 18, marginTop: 3 },
  sagaStatus: { fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  offlineHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  downloadStatus: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 14 },
});