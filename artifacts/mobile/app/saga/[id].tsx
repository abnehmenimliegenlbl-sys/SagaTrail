import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { alert } from "@/lib/appAlert";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GLAS_3D } from "@/constants/depth";
import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { SparkDivider } from "@/components/brand/SparkMountain";
import { fonts } from "@/constants/typography";
import { useApp } from "@/contexts/AppContext";
import { useCatalog } from "@/contexts/CatalogContext";
import { useColors } from "@/hooks/useColors";
import { useSagaStrings } from "@/lib/i18n/screens/saga";
import { kantonSlug } from "@/lib/kantonSlug";
import {
  KANTONSPACK_PACKAGE,
  REVENUECAT_PACKS_OFFERING,
  useSubscription,
} from "@/lib/revenuecat";
import { useClaimKantonspack, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveLang } from "@/lib/storyContent";
import { useSagaFoto, clearSagaFotoCache } from "@/lib/useSagaFoto";

export default function SagaDetail() {
  const t = useSagaStrings();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id, routeId } = useLocalSearchParams<{ id: string; routeId?: string }>();
  const { profile, premium, freeHikeUsed, registriereSagenEntdeckung } =
    useApp();
  const { getSaga, ensureRouteSaga, sagas } = useCatalog();
  const {
    isElite,
    offerings,
    purchase,
    isPurchasing,
    refreshCustomerInfo,
  } = useSubscription();
  const [packBusy, setPackBusy] = useState(false);
  const [fotoFehler, setFotoFehler] = useState(false);

  const [saga, setSaga] = useState(() => getSaga(id));
  const [loading, setLoading] = useState(!saga);
  const sagaFoto = useSagaFoto(saga ?? null);

  useEffect(() => {
    let cancelled = false;
    const known = getSaga(id);
    if (known) {
      setSaga(known);
      setLoading(false);
      return;
    }
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const result = await ensureRouteSaga(id);
      if (cancelled) return;
      setSaga(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, getSaga, ensureRouteSaga]);

  if (loading) {
    return (
      <Background>
        <View style={styles.notFound}>
          <ActivityIndicator color={colors.accent} />
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>
            {t.generating}
          </Text>
        </View>
      </Background>
    );
  }

  if (!saga) {
    return (
      <Background>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.foreground }]}>
            {t.notFound}
          </Text>
          <PrimaryButton label={t.back} variant="ghost" onPress={() => router.back()} />
        </View>
      </Background>
    );
  }

  // Ohne Premium: alles offen, solange die eine Gratis-Wanderung noch nicht
  // genutzt wurde (gleiche Regel wie kanton/[canton].tsx). Danach gesperrt.
  const locked = !premium && !isElite && freeHikeUsed;

  // Sagen-Pack-Regel fuer Premium-Kundschaft: die erste entdeckte Sage pro
  // Kanton ist inklusive; weitere Sagen des Kantons brauchen das passende Pack oder
  // Elite (alle Packs inklusive).
  // Autoritaetive Quelle: profiles.purchased_packs (server-seitiger Claim).
  // RC-Entitlements werden bewusst NICHT geprueft (s. Kommentar in kanton/[canton].tsx).
  const packSlug = kantonSlug(saga.canton);
  const sagasInCanton = sagas.filter((s) => s.canton === saga.canton);
  // Pack-Button-Regel: Premium (nicht Elite), Kanton hat >= 8 Sagen, Pack noch nicht gekauft.
  // Autoritaetive Quelle: profiles.purchased_packs (server-seitiger Claim).
  const dbPackUnlocked = (profile?.purchasedPacks ?? []).includes(packSlug);
  const packLocked = premium && !isElite && sagasInCanton.length >= 8 && !dbPackUnlocked;
  // Kaufoption: einziges RC-Produkt KANTONSPACK_PACKAGE im "packs"-Offering.
  const packPaket = offerings?.all?.[REVENUECAT_PACKS_OFFERING]?.availablePackages.find(
    (p) => p.identifier === KANTONSPACK_PACKAGE
  );
  const { mutateAsync: claimKantonspack } = useClaimKantonspack();
  const queryClient = useQueryClient();

  const kaufePack = async () => {
    if (!packPaket) return;
    setPackBusy(true);
    try {
      await purchase(packPaket);
      // Server-seitiger Grant (Best-Effort): RC vergibt das Entitlement
      // bereits automatisch; dieser Aufruf schlaegt bei fehlendem Connector
      // still fehl, ohne den Kauf rueckgaengig zu machen.
      try {
        await claimKantonspack({ data: { kanton: packSlug } });
        await queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      } catch {
        // Nicht fatal.
      }
      await refreshCustomerInfo();
    } catch (err: any) {
      if (!err?.userCancelled) {
        alert(t.packErrorTitle, err?.message ?? String(err));
      }
    } finally {
      setPackBusy(false);
    }
  };

  const starteWanderung = () => {
    // Erste entdeckte Sage des Kantons registrieren (No-op, falls schon
    // eine registriert ist) — Grundlage der Inklusiv-Regel.
    registriereSagenEntdeckung(saga.canton, saga.id).catch(() => {});
    router.replace(
      routeId ? `/hike/${saga.id}?routeId=${routeId}` : `/hike/${saga.id}`
    );
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Zusammenfassung in der gewaehlten Sprache; Deutsch als Fallback.
  const lang = resolveLang(profile?.language);
  const summaryText = saga.summaries[lang]?.text ?? saga.summary;
  const sagaTitle = saga.summaries[lang]?.title ?? saga.title;
  const reviewPending = saga.summaries[lang]?.reviewEmpfohlen ?? false;

  // Ehrliche Kennzeichnung der Ortsgenauigkeit der ueberlieferten Sage.
  const sicherheit =
    t.accuracy[saga.koordinatenSicherheit as keyof typeof t.accuracy] ??
    t.accuracy.nicht_lokalisierbar;

  const showKinderHinweis =
    profile?.ageTier === "kinder" && !!saga.altersstufenHinweis;

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroWrap}>
          <Image
            source={fotoFehler ? sagaFoto.fallback : sagaFoto.source}
            style={styles.hero}
            resizeMode="cover"
            onError={() => {
              if (saga) clearSagaFotoCache(saga.id);
              setFotoFehler(true);
            }}
          />
          <Pressable
            onPress={() => router.back()}
            style={[
              styles.back,
              { top: topInset + 6, borderColor: colors.glassBorder },
            ]}
            hitSlop={10}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={[styles.cantonChip, { backgroundColor: colors.accent, top: topInset + 6 }]}>
            <Text style={[styles.canton, { color: colors.accentForeground }]}>
              {saga.canton.toUpperCase()} · {saga.coreMotif.toUpperCase()}
            </Text>
          </View>
          <Animated.View entering={FadeIn} style={styles.heroText}>
            <View style={styles.heroTextScrim}>
              <Text style={[styles.title, { color: colors.photoScrimText }]}>
                {sagaTitle}
              </Text>
              <Text style={[styles.mood, { color: colors.photoScrimMuted }]}>
                {saga.mood}
              </Text>
            </View>
          </Animated.View>
          {!fotoFehler && sagaFoto.attribution && (
            <View style={styles.attributionScrim}>
              <Text style={styles.attributionText} numberOfLines={1}>
                {sagaFoto.attribution}
              </Text>
            </View>
          )}
        </View>

        <Animated.View entering={FadeInDown.delay(80)} style={styles.body}>
          <Text style={[styles.summary, { color: colors.foreground }]}>
            {summaryText}
          </Text>
          {reviewPending ? (
            <Text style={[styles.reviewNote, { color: colors.mutedForeground }]}>
              {t.reviewPending}
            </Text>
          ) : null}

          <SparkDivider style={{ marginVertical: 22 }} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={15} color={colors.accent} />
              <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>
                {t.coordinates}
              </Text>
              <Text style={[styles.metaValue, { color: colors.foreground }]}>
                {saga.coordinates
                  ? `${saga.coordinates.lat.toFixed(4)}, ${saga.coordinates.lng.toFixed(4)}`
                  : t.locationUnbound}
              </Text>
              <Text style={[styles.metaNote, { color: colors.mutedForeground }]}>
                {sicherheit}
              </Text>
            </View>
          </View>

          <View style={[styles.sourceBox, { borderColor: colors.glassBorder }]}>
            <Text style={[styles.sourceLabel, { color: colors.mutedForeground }]}>
              {t.sourceLabel}
            </Text>
            {saga.quelle ? (
              <>
                <Text style={[styles.sourceText, { color: colors.foreground }]}>
                  {saga.quelle.autor}: {saga.quelle.werk} ({saga.quelle.jahr})
                </Text>
                <Text style={[styles.sourceUrl, { color: colors.mutedForeground }]}>
                  {saga.quelle.fundstelleUrl}
                </Text>
              </>
            ) : (
              <Text style={[styles.sourceText, { color: colors.foreground }]}>
                {saga.source}
              </Text>
            )}
          </View>

          {showKinderHinweis ? (
            <View style={[styles.kinderBox, { borderColor: colors.glassBorder }]}>
              <Feather name="info" size={15} color={colors.accent} />
              <Text style={[styles.kinderText, { color: colors.foreground }]}>
                {saga.altersstufenHinweis}
              </Text>
            </View>
          ) : null}

          {locked ? (
            <View
              style={[
                styles.lockedBox,
                { borderColor: colors.accent, backgroundColor: colors.glassBg },
              ]}
            >
              <Feather name="lock" size={20} color={colors.accent} />
              <Text style={[styles.lockedText, { color: colors.foreground }]}>
                {t.lockedText}
              </Text>
              <PrimaryButton
                label={t.premiumButton}
                variant="gold"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: 12, alignSelf: "stretch" }}
              />
            </View>
          ) : packLocked ? (
            <View
              style={[
                styles.lockedBox,
                { borderColor: colors.accent, backgroundColor: colors.glassBg },
              ]}
            >
              <Feather name="lock" size={20} color={colors.accent} />
              <Text style={[styles.lockedText, { color: colors.foreground }]}>
                {t.packLockedText}
              </Text>
              {packPaket ? (
                <PrimaryButton
                  label={`${t.packBuyBtn} · ${packPaket.product.priceString}`}
                  variant="gold"
                  onPress={kaufePack}
                  disabled={packBusy || isPurchasing}
                  style={{ marginTop: 12, alignSelf: "stretch" }}
                />
              ) : (
                <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                  {t.packUnavailable}
                </Text>
              )}
              <Text style={[styles.lockedText, { color: colors.mutedForeground }]}>
                {t.eliteUpsell}
              </Text>
              <PrimaryButton
                label={t.eliteBtn}
                variant="ghost"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: 4, alignSelf: "stretch" }}
              />
            </View>
          ) : (
            <PrimaryButton
              label={t.startHike}
              onPress={starteWanderung}
              style={{ marginTop: 26 }}
            />
          )}
        </Animated.View>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  heroWrap: { height: 380 },
  hero: { width: "100%", height: "100%" },
  attributionScrim: {
    position: "absolute",
    top: 10,
    right: 10,
    maxWidth: "70%",
    backgroundColor: "rgba(8,10,12,0.58)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  attributionText: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.88)",
  },
  back: {
    position: "absolute",
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(16,24,26,0.4)",
  },
  cantonChip: {
    position: "absolute",
    left: 68,
    right: 20,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  heroText: { position: "absolute", left: 20, right: 20, bottom: 20 },
  heroTextScrim: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(16,24,26,0.42)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: "100%",
  },
  canton: {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    fontFamily: fonts.titleBlack,
    fontSize: 36,
    marginTop: 0,
    lineHeight: 38,
  },
  mood: {
    fontFamily: fonts.story,
    fontSize: 15,
    marginTop: 6,
  },
  body: { paddingHorizontal: 20, marginTop: 20 },
  summary: { fontFamily: fonts.story, fontSize: 18, lineHeight: 30 },
  reviewNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    fontStyle: "italic",
  },
  metaRow: { flexDirection: "row" },
  metaItem: { flex: 1 },
  metaLabel: { fontFamily: fonts.body, fontSize: 12, marginTop: 6 },
  metaValue: { fontFamily: fonts.mono, fontSize: 15, marginTop: 2 },
  metaNote: { fontFamily: fonts.body, fontSize: 12, marginTop: 4, fontStyle: "italic" },
  sourceBox: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 18,
  },
  sourceLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.5 },
  sourceText: { fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  sourceUrl: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6, lineHeight: 16 },
  kinderBox: { ...GLAS_3D,
    flexDirection: "row",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    alignItems: "flex-start",
  },
  kinderText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 20, flex: 1 },
  lockedBox: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginTop: 26,
    alignItems: "flex-start",
    gap: 6,
  },
  lockedText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 30 },
  notFoundText: { fontFamily: fonts.titleBold, fontSize: 20 },
});
