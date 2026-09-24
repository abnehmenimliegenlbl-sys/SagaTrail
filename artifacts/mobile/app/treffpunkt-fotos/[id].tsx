import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { captureRef } from "react-native-view-shot";
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Background } from "@/components/brand/Background";
import { PrimaryButton } from "@/components/brand/PrimaryButton";
import { ScreenHeader } from "@/components/brand/ScreenHeader";
import { ShareCard } from "@/components/brand/ShareCard";
import { fonts } from "@/constants/typography";
import { useColors } from "@/hooks/useColors";
import {
  getGetMyCommunitiesQueryKey,
  useGetMeetup,
  useGetMyCommunities,
} from "@workspace/api-client-react";
import { alert } from "@/lib/appAlert";
import { useMeetupPhotoStrings } from "@/lib/i18n/screens/meetupPhotos";
import {
  deleteMeetupPhoto,
  fetchMeetupPhotos,
  prepareMeetupShare,
  saveMeetupNameConsent,
  uploadMeetupPhoto,
  type MeetupPhoto,
} from "@/lib/meetupPhotos";

export default function MeetupPhotos() {
  const colors = useColors();
  const t = useMeetupPhotoStrings();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { getToken } = useAuth();
  const params = useLocalSearchParams<{ id?: string }>();
  const meetupId = Array.isArray(params.id) ? params.id[0] : params.id ?? "";
  const meetupQuery = useGetMeetup(meetupId);
  const communities = useGetMyCommunities({
    query: {
      queryKey: getGetMyCommunitiesQueryKey(),
      refetchOnMount: "always",
    },
  });
  const shareRef = useRef<View>(null);
  const [photos, setPhotos] = useState<MeetupPhoto[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [rightsConsent, setRightsConsent] = useState(false);
  const [depictedPeopleConsent, setDepictedPeopleConsent] = useState(false);
  const [allowNameMention, setAllowNameMention] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const meetup = meetupQuery.data;
  const selectedPhotos = useMemo(
    () => photos.filter((photo) => selectedIds.includes(photo.id)),
    [photos, selectedIds],
  );

  const refresh = useCallback(async () => {
    if (!meetupId) return;
    setLoading(true);
    try {
      const result = await fetchMeetupPhotos(meetupId, getToken);
      setPhotos(result.photos);
      setIsOrganizer(result.isOrganizer);
      setAllowNameMention(result.allowNameMention);
      setSelectedIds(result.photos.filter((photo) => photo.selected).map((photo) => photo.id));
    } catch {
      alert(t.title, t.loadFailure);
    } finally {
      setLoading(false);
    }
  }, [getToken, meetupId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const chooseAndUpload = async () => {
    if (!rightsConsent || !depictedPeopleConsent) {
      alert(
        t.consentRequiredTitle,
        t.consentRequiredBody,
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: 10,
        quality: 0.82,
        allowsEditing: false,
      });
      if (result.canceled || result.assets.length === 0) return;
      setUploading(true);
      if (meetupId) {
        await saveMeetupNameConsent(meetupId, allowNameMention, getToken);
        for (const asset of result.assets) {
          if (asset.uri) await uploadMeetupPhoto(meetupId, asset.uri, getToken, asset.mimeType);
        }
      }
      setRightsConsent(false);
      setDepictedPeopleConsent(false);
      await refresh();
    } catch (error) {
       alert(t.uploadTitle, t.uploadFailure);
    } finally {
      setUploading(false);
    }
  };

  const toggleNameConsent = async (value: boolean) => {
    setAllowNameMention(value);
    try {
      await saveMeetupNameConsent(meetupId, value, getToken);
    } catch {
      setAllowNameMention(!value);
      alert(t.nameTitle, t.nameFailure);
    }
  };

  const toggleSelected = (photoId: string) => {
    setSelectedIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : current.length >= 20
          ? current
          : [...current, photoId],
    );
  };

  const removePhoto = async (photo: MeetupPhoto) => {
    try {
      await deleteMeetupPhoto(meetupId, photo.id, getToken);
      await refresh();
    } catch {
      alert(t.title, t.deleteFailure);
    }
  };

  const openFacebookGroup = async () => {
    const communityUrl = meetup?.communityId
      ? communities.data?.find((community) => community.id === meetup.communityId)?.facebookGroupUrl
      : null;
    if (communityUrl) {
      await Linking.openURL(communityUrl).catch(() => {});
      return;
    }
    const deepLink = "fb://group/1405863634716590";
    try {
      const canOpen = await Linking.canOpenURL(deepLink);
      await Linking.openURL(canOpen ? deepLink : "https://www.facebook.com/groups/1405863634716590");
    } catch {
      await Linking.openURL("https://www.facebook.com/groups/1405863634716590").catch(() => {});
    }
  };

  const sharePost = async () => {
    if (!meetup || !isOrganizer) return;
    try {
      setSharing(true);
      const prepared = await prepareMeetupShare(meetupId, selectedIds, caption.trim(), getToken);
      const names = prepared.participantNames.length
        ? `\n\n${t.participantsLabel}: ${prepared.participantNames.join(", ")}`
        : "";
      const message = `${prepared.routeName}${names}\n\n${prepared.caption || t.sharedCaption}`;
      let uri: string | undefined;
      try {
        uri = await captureRef(shareRef, { format: "png", quality: 1, result: "tmpfile" });
      } catch {
        // Falls die Grafik auf einem Gerät nicht erstellt werden kann,
        // bleibt der vorbereitete Begleittext teilbar.
      }

      let result;
      try {
        result = await Share.share(
          uri ? { message, url: uri } : { message },
          { dialogTitle: t.shareDialogTitle },
        );
      } catch (shareError) {
        if (!uri) throw shareError;
        result = await Share.share(
          { message },
          { dialogTitle: t.shareDialogTitle },
        );
      }

      if (result.action === Share.dismissedAction) return;
      alert(
        t.shareReadyTitle,
        t.shareReadyBody,
        [{ text: t.openFacebook, onPress: () => void openFacebookGroup() }],
      );
    } catch (error) {
       alert(t.shareDialogTitle, t.sharePrepareFailure);
    } finally {
      setSharing(false);
    }
  };

  if (meetupQuery.isLoading || loading) {
    return <Background><View style={[styles.center, { paddingTop: insets.top }]}><ActivityIndicator color={colors.accent} /></View></Background>;
  }
  if (!meetup || meetupQuery.isError) {
    return <Background><View style={[styles.center, { paddingTop: insets.top }]}><Text style={{ color: colors.foreground }}>{t.notFound}</Text></View></Background>;
  }

  return (
    <Background>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 20, paddingBottom: insets.bottom + 80 }}
      >
        <ScreenHeader eyebrow={t.eyebrow} title={t.title} onBack />
        <Text style={[styles.routeName, { color: colors.foreground }]}>{meetup.routeName}</Text>
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.intro}
        </Text>

        <View style={[styles.card, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.addTitle}</Text>
            <ConsentRow checked={rightsConsent} onPress={() => setRightsConsent((value) => !value)} colors={colors}>
              {t.rightsConsent}
            </ConsentRow>
            <ConsentRow checked={depictedPeopleConsent} onPress={() => setDepictedPeopleConsent((value) => !value)} colors={colors}>
              {t.peopleConsent}
            </ConsentRow>
            <ConsentRow checked={allowNameMention} onPress={() => void toggleNameConsent(!allowNameMention)} colors={colors}>
              {t.nameConsent}
            </ConsentRow>
            <PrimaryButton label={t.uploadButton} loading={uploading} onPress={() => void chooseAndUpload()} style={{ marginTop: 12 }} />
        </View>

        {isOrganizer ? (
          <View style={[styles.card, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.facebookTitle}</Text>
            <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>
              {t.facebookBody}
            </Text>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              maxLength={1200}
              multiline
              placeholder={t.captionPlaceholder}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.caption, { color: colors.foreground, borderColor: colors.glassBorder }]}
            />
            <PrimaryButton
              label={t.preparePost(selectedIds.length)}
              loading={sharing}
              disabled={sharing}
              onPress={() => void sharePost()}
              style={{ marginTop: 10 }}
            />
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>
              {t.facebookHint}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {photos.length ? t.photoCount(photos.length) : t.noPhotos}
        </Text>
        {photos.length ? (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => isOrganizer ? toggleSelected(photo.id) : undefined}
                style={[
                  styles.photoTile,
                  { borderColor: selectedIds.includes(photo.id) ? colors.accent : colors.glassBorder },
                ]}
              >
                <Image source={{ uri: photo.url }} style={styles.photo} />
                {isOrganizer ? (
                  <View style={[styles.check, { backgroundColor: selectedIds.includes(photo.id) ? colors.accent : colors.glassBgStrong }]}>
                    <Feather name={selectedIds.includes(photo.id) ? "check" : "plus"} size={14} color={selectedIds.includes(photo.id) ? colors.background : colors.foreground} />
                  </View>
                ) : null}
                <View style={[styles.photoMeta, { backgroundColor: colors.background + "dd" }]}>
                  <Text numberOfLines={1} style={[styles.photoName, { color: colors.foreground }]}>{photo.uploaderName}</Text>
                  {(photo.isOwn || isOrganizer) ? (
                    <Pressable onPress={() => void removePhoto(photo)} hitSlop={8}>
                      <Feather name="trash-2" size={14} color={colors.destructive} />
                    </Pressable>
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>{t.empty}</Text>
        )}

        {isOrganizer ? (
          <View ref={shareRef} collapsable={false} style={styles.shareCanvas}>
            <ShareCard
              sagaTitle={t.shareSagaTitle}
              routeName={meetup.routeName}
              canton={meetup.canton}
              distanceKm={0}
              ascentM={0}
              sacScale={t.shareScale}
              visitedPlaceCount={0}
              distanceLabel={t.distanceLabel}
              ascentLabel={t.ascentLabel}
              timeLabel={t.timeLabel}
              stepsLabel={t.stepsLabel}
            />
            {selectedPhotos.map((photo) => (
              <Image key={photo.id} source={{ uri: photo.url }} style={styles.sharePhoto} />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Background>
  );
}

function ConsentRow({
  checked,
  onPress,
  colors,
  children,
}: {
  checked: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  children: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.consentRow}>
      <Feather name={checked ? "check-square" : "square"} size={20} color={checked ? colors.accent : colors.mutedForeground} />
      <Text style={[styles.consentText, { color: colors.foreground }]}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  routeName: { fontFamily: fonts.titleBold, fontSize: 25, marginTop: 14 },
  intro: { fontFamily: fonts.story, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 18 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginBottom: 18 },
  cardTitle: { fontFamily: fonts.titleBold, fontSize: 19 },
  cardBody: { fontFamily: fonts.story, fontSize: 14, lineHeight: 20, marginTop: 6 },
  consentRow: { flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 14 },
  consentText: { flex: 1, fontFamily: fonts.story, fontSize: 14, lineHeight: 20 },
  caption: { minHeight: 92, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 14, textAlignVertical: "top", fontFamily: fonts.story, fontSize: 15 },
  hint: { fontFamily: fonts.story, fontSize: 12, lineHeight: 18, marginTop: 10 },
  sectionTitle: { fontFamily: fonts.titleBold, fontSize: 19, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  photoTile: { width: "48%", aspectRatio: 1, borderRadius: 14, overflow: "hidden", borderWidth: 2 },
  photo: { width: "100%", height: "100%" },
  check: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  photoMeta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 9, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 },
  photoName: { flex: 1, fontFamily: fonts.story, fontSize: 12 },
  empty: { fontFamily: fonts.story, fontSize: 14, marginBottom: 20 },
  shareCanvas: { position: "absolute", left: -5000, top: 0, width: 390, backgroundColor: "#ffffff", paddingBottom: 12 },
  sharePhoto: { width: 390, height: 260, marginTop: 8, resizeMode: "cover" },
});