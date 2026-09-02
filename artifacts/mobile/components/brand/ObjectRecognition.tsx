import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { ObjectRecognitionCandidate } from "@workspace/api-client-react";
import { getApiBaseUrl } from "@/lib/apiConfig";
import { AppModal } from "@/components/brand/AppModal";
import { PremiumUpsellBanner } from "@/components/brand/PremiumUpsellBanner";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { fonts } from "@/constants/typography";
import { GLAS_3D, GLAS_3D_STARK } from "@/constants/depth";
import { useColors } from "@/hooks/useColors";
import type { ObjectRecognitionStrings } from "@/lib/i18n/objectRecognition";
import { persistJournalImage } from "@/lib/journalMedia";
import type { RecognitionJournalEntry } from "@/types";

interface Props {
  premium: boolean;
  strings: ObjectRecognitionStrings;
  getToken: () => Promise<string | null>;
  language: string;
  lat?: number | null;
  lng?: number | null;
  heading?: number | null;
  nearbyContext?: string;
  onAnalyzed?: (entry: RecognitionJournalEntry) => void | Promise<void>;
}

type RecognitionState = "idle" | "capturing" | "analyzing";

export function ObjectRecognition({
  premium,
  strings,
  getToken,
  language,
  lat,
  lng,
  heading,
  nearbyContext,
  onAnalyzed,
}: Props) {
  const colors = useColors();
  const [state, setState] = useState<RecognitionState>("idle");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [candidates, setCandidates] = useState<ObjectRecognitionCandidate[]>([]);
  const [confirmed, setConfirmed] = useState<ObjectRecognitionCandidate | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);
  const runIdRef = useRef(0);

  const deleteTemporaryPhoto = useCallback(async (uri: string | null) => {
    if (!uri) return;
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {
      // Camera caches are temporary by design; failure to delete is non-fatal.
    }
  }, []);

  useEffect(() => () => {
    void deleteTemporaryPhoto(photoUri);
  }, [deleteTemporaryPhoto, photoUri]);

  const closeResults = useCallback(() => {
    runIdRef.current += 1;
    busyRef.current = false;
    setState("idle");
    setModalVisible(false);
    setConfirmed(null);
    setCandidates([]);
    setNote("");
    setError(null);
    void deleteTemporaryPhoto(photoUri);
    setPhotoUri(null);
  }, [deleteTemporaryPhoto, photoUri]);

  const openCamera = useCallback(async () => {
    if (!premium || busyRef.current) return;
    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    busyRef.current = true;
    setError(null);
    setState("capturing");
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError(strings.cameraPermissionMessage);
        setModalVisible(true);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.72,
        exif: false,
      });
      if (result.canceled || !result.assets[0]?.uri) return;
      if (runId !== runIdRef.current) return;

      const uri = result.assets[0].uri;
      setPhotoUri(uri);
      setModalVisible(true);
      setState("analyzing");
      const imageBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const token = await getToken();
      const mediaType =
        result.assets[0].mimeType === "image/png" || result.assets[0].mimeType === "image/webp"
          ? result.assets[0].mimeType
          : "image/jpeg";
      const response = await fetch(`${getApiBaseUrl() ?? ""}/api/object-recognition/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64,
          mediaType,
          lat: lat ?? null,
          lng: lng ?? null,
          heading: heading ?? null,
          language,
          nearbyContext: nearbyContext || null,
        }),
      });
      if (runId !== runIdRef.current) return;
      if (!response.ok) {
        if (response.status === 403) throw new Error(strings.premiumTitle);
        throw new Error(strings.analysisError);
      }
      const payload = (await response.json()) as {
        analysisNote?: string;
        candidates?: ObjectRecognitionCandidate[];
      };
      const analyzedCandidates = Array.isArray(payload.candidates)
        ? payload.candidates.slice(0, 3)
        : [];
      const analysisNote = payload.analysisNote ?? "";
      setNote(analysisNote);
      setCandidates(analyzedCandidates);
      // Das Ergebnis wird sofort als Tagebuchbild gesichert. Die Kandidaten
      // bleiben bewusst als vorsichtige Kandidaten formuliert; die Analyse
      // muss nicht erst bestaetigt werden, damit kein aufgenommenes Bild
      // verloren geht.
      if (onAnalyzed) {
        try {
          const persistentUri = await persistJournalImage(uri, "object");
          const candidateText = analyzedCandidates
            .map(
              (candidate, index) =>
                `${index + 1}. ${candidate.title} (${Math.round(candidate.confidence * 100)} %): ${candidate.description} ${candidate.whyLikely}`,
            )
            .join("\n\n");
          await onAnalyzed({
            id: `recognition-object-${Date.now()}`,
            kind: "object",
            photoUri: persistentUri,
            title: analyzedCandidates[0]?.title ?? strings.title,
            text: [analysisNote, candidateText || strings.noCandidates]
              .filter(Boolean)
              .join("\n\n"),
            capturedAt: Date.now(),
            confidence: analyzedCandidates[0]?.confidence,
            ...(analyzedCandidates[0]?.sourceUrl
              ? { sourceUrl: analyzedCandidates[0].sourceUrl }
              : {}),
            ...(analyzedCandidates[0]?.sourceTitle
              ? { sourceTitle: analyzedCandidates[0].sourceTitle }
              : {}),
          });
        } catch {
          // Die Analyse bleibt sichtbar, auch wenn das lokale Kopieren
          // wegen eines vollen/gesperrten Dateisystems nicht gelingt.
        }
      }
    } catch (err) {
      if (runId === runIdRef.current) {
        setError(err instanceof Error && err.message ? err.message : strings.analysisError);
        setModalVisible(true);
      }
    } finally {
      if (runId === runIdRef.current) {
        busyRef.current = false;
        setState("idle");
      }
    }
  }, [
    getToken,
    heading,
    language,
    lat,
    lng,
    nearbyContext,
    onAnalyzed,
    premium,
    strings.analysisError,
    strings.cameraPermissionMessage,
    strings.premiumTitle,
  ]);

  const modalMessage = error
    ? error
    : state === "analyzing"
      ? strings.analyzing
      : note;

  return (
    <>
      {!premium ? (
        <PremiumUpsellBanner
          title={strings.premiumTitle}
          body={strings.premiumBody}
          cta={strings.premiumCta}
          style={styles.upsell}
        />
      ) : (
        <View
          style={[
            styles.panel,
            GLAS_3D_STARK,
            { backgroundColor: colors.glassBgStrong, borderColor: colors.glassBorder, borderRadius: colors.radius },
          ]}
        >
          <View style={styles.panelHeader}>
            <View style={[styles.iconWrap, { backgroundColor: colors.primary + "20" }]}>
              <Feather name="maximize" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.primary }]}>{strings.title}</Text>
              <Text style={[styles.intro, { color: colors.mutedForeground }]}>{strings.intro}</Text>
            </View>
          </View>
          <PrimaryButton
            label={strings.analyze}
            onPress={openCamera}
            loading={state === "capturing"}
            style={styles.analyzeButton}
          />
        </View>
      )}

      <AppModal
        visible={modalVisible}
        onRequestClose={closeResults}
        icon={<Feather name={error ? "alert-circle" : "camera"} size={30} color={error ? colors.destructive : colors.primary} />}
        title={error ? strings.analysisError : strings.candidatesTitle}
        message={modalMessage}
        buttons={[
          { text: strings.close, onPress: closeResults, style: "cancel" },
          ...(state === "idle" && !error
            ? [{ text: strings.retake, onPress: () => { closeResults(); setTimeout(() => void openCamera(), 120); } }]
            : []),
        ]}
        backdropStyle={styles.recognitionModalBackdrop}
        cardStyle={styles.recognitionModalCard}
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.preview} resizeMode="cover" />
        ) : null}
        {state === "analyzing" ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 18 }} />
        ) : error ? null : candidates.length === 0 ? (
          <Text style={[styles.noCandidates, { color: colors.mutedForeground }]}>{strings.noCandidates}</Text>
        ) : (
          <ScrollView style={styles.results} contentContainerStyle={styles.resultsContent}>
            <Text style={[styles.confirmHint, { color: colors.mutedForeground }]}>{strings.confirmHint}</Text>
            {candidates.map((candidate) => {
              const isConfirmed = confirmed?.id === candidate.id;
              return (
                <View
                  key={candidate.id}
                  style={[
                    styles.candidate,
                    GLAS_3D,
                    { borderColor: isConfirmed ? colors.primary : colors.glassBorder, backgroundColor: colors.glassBg },
                  ]}
                >
                  <View style={styles.candidateTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.candidateCategory, { color: colors.primary }]}>
                        {candidate.category}
                      </Text>
                      <Text style={[styles.candidateTitle, { color: colors.foreground }]}>{candidate.title}</Text>
                    </View>
                    <Text style={[styles.confidence, { color: colors.accent }]}>
                      {strings.confidence(Math.round(candidate.confidence * 100))}
                    </Text>
                  </View>
                  {!isConfirmed ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setConfirmed(candidate)}
                      style={[styles.confirmButton, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.confirmButtonText, { color: colors.primaryForeground }]}>{strings.confirm}</Text>
                    </Pressable>
                  ) : (
                    <View style={[styles.confirmedBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name="check" size={14} color={colors.primary} />
                      <Text style={[styles.confirmedText, { color: colors.primary }]}>{strings.confirmed}</Text>
                    </View>
                  )}
                  {isConfirmed ? (
                    <>
                      <Text style={[styles.description, { color: colors.foreground }]}>{candidate.description}</Text>
                      <Text style={[styles.whyLabel, { color: colors.mutedForeground }]}>{strings.whyLikely}</Text>
                      <Text style={[styles.whyText, { color: colors.mutedForeground }]}>{candidate.whyLikely}</Text>
                      {candidate.sourceUrl ? (
                        <Pressable
                          onPress={() => void Linking.openURL(candidate.sourceUrl!)}
                          accessibilityRole="link"
                          style={styles.sourceLink}
                        >
                          <Feather name="external-link" size={14} color={colors.accent} />
                          <Text style={[styles.sourceText, { color: colors.accent }]}>
                            {strings.source}: {candidate.sourceTitle ?? "Wikipedia"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {candidate.sourceExtract ? (
                        <Text style={[styles.sourceExtract, { color: colors.mutedForeground }]}>{candidate.sourceExtract}</Text>
                      ) : null}
                    </>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  upsell: { marginTop: 14 },
  panel: { marginTop: 14, borderWidth: 1, padding: 16 },
  panelHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontFamily: fonts.titleBold, fontSize: 12, letterSpacing: 1.1 },
  intro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 3 },
  analyzeButton: { marginTop: 14 },
  recognitionModalBackdrop: { paddingHorizontal: 12, paddingVertical: 16 },
  recognitionModalCard: { maxWidth: 620, minHeight: "82%", maxHeight: "94%" },
  preview: { width: "100%", height: 130, borderRadius: 12, marginTop: 14, backgroundColor: "#10181A" },
  results: { width: "100%", maxHeight: 340, marginTop: 14 },
  resultsContent: { gap: 10, paddingBottom: 2 },
  confirmHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, textAlign: "left" },
  noCandidates: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 16 },
  candidate: { borderWidth: 1, borderRadius: 13, padding: 13 },
  candidateTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  candidateCategory: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  candidateTitle: { fontFamily: fonts.titleBold, fontSize: 17, marginTop: 3 },
  confidence: { fontFamily: fonts.bodyBold, fontSize: 11, textAlign: "right", maxWidth: 92 },
  confirmButton: { alignItems: "center", borderRadius: 9, marginTop: 11, paddingVertical: 10, paddingHorizontal: 12 },
  confirmButtonText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  confirmedBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, marginTop: 10, paddingVertical: 6, paddingHorizontal: 9 },
  confirmedText: { fontFamily: fonts.bodyBold, fontSize: 11, letterSpacing: 0.8 },
  description: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, marginTop: 12 },
  whyLabel: { fontFamily: fonts.bodyBold, fontSize: 12, marginTop: 11 },
  whyText: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginTop: 3 },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  sourceText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  sourceExtract: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 6 },
});