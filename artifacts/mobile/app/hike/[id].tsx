Border },
                    ]}
                    onPress={() => {
                      const start = navigationGeometry?.[0];
                      if (!start) return;
                      void routeToTarget(
                        { lat: start[0], lng: start[1] },
                        t.routeChangeStart,
                      );
                    }}
                    accessibilityRole="button"
                  >
                    <Feather
                      name="corner-left-up"
                      size={18}
                      color={colors.accent}
                    />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeStart}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.routeChangeOption,
                      { borderColor: colors.glassBorder },
                    ]}
                    onPress={() => {
                      setRouteChangeError(false);
                      setRouteChangeOpen(false);
                      setRouteChangePickerOpen(true);
                      setKarteVollbild(true);
                    }}
                    accessibilityRole="button"
                  >
                    <Feather name="map-pin" size={18} color={colors.accent} />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeWaypoint}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.routeChangeOption,
                      { borderColor: colors.glassBorder },
                    ]}
                    onPress={() => void routeToNearestTransport()}
                    accessibilityRole="button"
                  >
                    <Feather
                      name="navigation"
                      size={18}
                      color={colors.accent}
                    />
                    <Text
                      style={[
                        styles.routeChangeOptionText,
                        { color: colors.foreground },
                      ]}
                    >
                      {t.routeChangeTransport}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ── Sicherheits-POIs filtern ───────────────────────────────── */}
        <View
          style={[
            styles.safetyFilterTile,
            {
              borderColor: colors.glassBorder,
              backgroundColor: poiOverlay ?? colors.glassBgStrong,
            },
          ]}
        >
          <View style={styles.safetyFilterHeader}>
            <Pressable
              onPress={() => setSafetyPoiFiltersOpen((open) => !open)}
              style={styles.safetyFilterHeaderMain}
              accessibilityRole="button"
              accessibilityLabel={mapT.safetyPoiFilterTitle}
              accessibilityState={{ expanded: safetyPoiFiltersOpen }}
            >
              <View style={styles.safetyFilterHeaderText}>
                <Feather name="shield" size={18} color={colors.destructive} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.safetyFilterTitle,
                      { color: colors.foreground },
                    ]}
                  >
                    {mapT.safetyPoiFilterTitle}
                  </Text>
                  <Text
                    style={[
                      styles.safetyFilterCount,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    {enabledSafetyPoiCount}/{SAFETY_POI_CATEGORIES.length}
                  </Text>
                </View>
              </View>
              {!safetyPoiFiltersOpen && (
                <Feather
                  name="chevron-down"
                  size={18}
                  color={colors.mutedForeground}
                />
              )}
            </Pressable>
            {safetyPoiFiltersOpen && (
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => setSafetyPoiFiltersOpen(false)}
              />
            )}
          </View>

          {safetyPoiFiltersOpen && (
            <Animated.View
              entering={FadeIn.duration(180)}
              style={[
                styles.safetyFilterBody,
                { borderTopColor: colors.glassBorder },
              ]}
            >
              <Text
                style={[
                  styles.safetyFilterHint,
                  { color: colors.mutedForeground },
                ]}
              >
                {mapT.safetyPoiFilterHint}
              </Text>
              <View style={styles.safetyFilterGrid}>
                {safetyPoiFilterLabels.map(({ category, code, label }) => {
                  const enabled = enabledSafetyPoiCategories[category];
                  return (
                    <Pressable
                      key={category}
                      onPress={() =>
                        setEnabledSafetyPoiCategories((current) => ({
                          ...current,
                          [category]: !current[category],
                        }))
                      }
                      style={[
                        styles.safetyFilterOption,
                        {
                          borderColor: enabled
                            ? colors.destructive
                            : colors.glassBorder,
                          backgroundColor: enabled
                            ? `${colors.destructive}18`
                            : colors.glassBg,
                        },
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: enabled }}
                      accessibilityLabel={`${code} ${label}`}
                    >
                      <View
                        style={[
                          styles.safetyFilterCode,
                          {
                            backgroundColor: colors.destructive,
                            borderColor: colors.primaryForeground,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.safetyFilterCodeText,
                            { color: colors.primaryForeground },
                          ]}
                        >
                          {code}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.safetyFilterLabel,
                          { color: colors.foreground },
                        ]}
                      >
                        {label}
                      </Text>
                      <Feather
                        name={enabled ? "check-circle" : "circle"}
                        size={15}
                        color={
                          enabled ? colors.destructive : colors.mutedForeground
                        }
                      />
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() =>
                  setEnabledSafetyPoiCategories(
                    allSafetyPoiCategoriesEnabled
                      ? (Object.fromEntries(
                          SAFETY_POI_CATEGORIES.map(({ category }) => [
                            category,
                            false,
                          ]),
                        ) as Record<SafetyPoiCategory, boolean>)
                      : DEFAULT_SAFETY_POI_FILTERS,
                  )
                }
                style={[
                  styles.safetyFilterAll,
                  { borderTopColor: colors.glassBorder },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: allSafetyPoiCategoriesEnabled }}
              >
                <Feather
                  name={
                    allSafetyPoiCategoriesEnabled ? "check-square" : "square"
                  }
                  size={16}
                  color={colors.accent}
                />
                <Text
                  style={[styles.safetyFilterAllText, { color: colors.accent }]}
                >
                  {mapT.safetyPoiFilterAll}
                </Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </ScrollView>

      {/* POI-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPoi && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPoi(null)}
        >
          <Pressable
            style={{ width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Glass overlayColor={poiOverlay}>
              {selectedPoiWiki === undefined ? (
                <View
                  style={[
                    styles.poiModalImage,
                    { alignItems: "center", justifyContent: "center" },
                  ]}
                >
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : selectedPoiWiki?.image ? (
                <Image
                  source={{ uri: selectedPoiWiki.image }}
                  style={styles.poiModalImage}
                  resizeMode="cover"
                />
              ) : null}
              <View style={styles.poiRow}>
                <Feather name="map-pin" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {t.poiDetailEyebrow}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {poiDisplayName(selectedPoi.name, selectedPoi.kind)}
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={t.close}
                  onPress={() => setSelectedPoi(null)}
                />
              </View>
              <Text
                style={[
                  styles.poiSummary,
                  { color: colors.foreground, marginTop: 10 },
                ]}
              >
                {poiStoryLoading && !poiStory
                  ? t.poiStoryLoading
                  : (poiStory ?? selectedPoi.wiki?.extract ?? t.notAvailable)}
              </Text>
            </Glass>
          </Pressable>
        </Pressable>
      )}

      {/* Partner-Detail — tier-spezifisch (Basic / Standard / Premium) */}
      {!!selectedPartner && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPartner(null)}
        >
          <Pressable
            style={{ width: "100%" }}
            onPress={(e) => e.stopPropagation()}
          >
            <Glass overlayColor={poiOverlay}>
              {/* Titelbild — identisch mit POI-Karte (Standard + Premium mit Foto) */}
              {!!selectedPartner.fotoUrl &&
                selectedPartner.paket !== "basic" && (
                  <Image
                    source={{ uri: selectedPartner.fotoUrl }}
                    style={styles.poiCardImage}
                    resizeMode="cover"
                  />
                )}

              {/* Header — Kategorie-Icon + Label */}
              <View style={styles.poiCardHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 7,
                    flex: 1,
                  }}
                >
                  <Feather
                    name={
                      (
                        PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ??
                        PARTNER_KAT_DEFAULT
                      ).icon
                    }
                    size={15}
                    color={colors.accent}
                  />
                  <Text style={[styles.poiEyebrow, { color: colors.accent }]}>
                    {
                      (
                        PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ??
                        PARTNER_KAT_DEFAULT
                      ).label
                    }
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={t.close}
                  onPress={() => setSelectedPartner(null)}
                />
              </View>

              {/* Titel — identisch mit POI-Karte */}
              <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                {selectedPartner.name}
              </Text>

              {/* Offen / Geschlossen Badge + nächste Änderung */}
              {selectedPartner.istOffen != null ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: selectedPartner.istOffen
                        ? "#22C55E"
                        : "#EF4444",
                    }}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: selectedPartner.istOffen ? "#22C55E" : "#EF4444",
                      fontFamily: fonts.bodyBold,
                    }}
                  >
                    {selectedPartner.istOffen
                      ? t.partnerOffen
                      : t.partnerGeschlossen}
                  </Text>
                  {(() => {
                    const info = formatPartnerOeffnungsInfo(
                      selectedPartner,
                      t,
                      storyLanguage,
                    );
                    return info ? (
                      <Text
                        style={{ fontSize: 12, color: colors.mutedForeground }}
                      >
                        {"· "}
                        {info}
                      </Text>
                    ) : null;
                  })()}
                </View>
              ) : null}

              {/* Beschreibung — nicht für Basic */}
              {!!(partnerAnnouncementText?.partnerId ===
              String(selectedPartner.id)
                ? partnerAnnouncementText.text
                : (partnerTranslation?.beschreibung ??
                  selectedPartner.beschreibung)) &&
                selectedPartner.paket !== "basic" && (
                  <Text
                    style={[styles.poiSummary, { color: colors.foreground }]}
                  >
                    {partnerAnnouncementText?.partnerId ===
                    String(selectedPartner.id)
                      ? partnerAnnouncementText.text
                      : (partnerTranslation?.beschreibung ??
                        selectedPartner.beschreibung)}
                  </Text>
                )}

              {/* Standard + Premium: Telefon, Reservierung, Website */}
              {(selectedPartner.paket === "premium" ||
                selectedPartner.paket === "standard") && (
                <>
                  {!!selectedPartner.telefon && (
                    <Pressable
                      onPress={() =>
                        Linking.openURL(`tel:${selectedPartner.telefon}`)
                      }
                      style={{ marginTop: 12 }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Feather name="phone" size={16} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 16 }}>
                          {selectedPartner.telefon}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  {(!!selectedPartner.reservierungUrl ||
                    !!selectedPartner.websiteUrl) && (
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        marginTop: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {!!selectedPartner.reservierungUrl && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(selectedPartner.reservierungUrl!)
                          }
                          style={{
                            backgroundColor: colors.accent,
                            borderRadius: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 9,
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 14,
                              fontFamily: fonts.bodyBold,
                            }}
                          >
                            {t.partnerReservierung}
                          </Text>
                        </Pressable>
                      )}
                      {!!selectedPartner.websiteUrl && (
                        <Pressable
                          onPress={() =>
                            Linking.openURL(selectedPartner.websiteUrl!)
                          }
                          style={{
                            borderWidth: 1.5,
                            borderColor: colors.accent,
                            borderRadius: 8,
                            paddingHorizontal: 16,
                            paddingVertical: 9,
                          }}
                        >
                          <Text style={{ color: colors.accent, fontSize: 14 }}>
                            {t.partnerWebsite}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}

              {/* SagaTrail-Angebot — alle Tiers */}
              {!!(partnerTranslation?.angebot ?? selectedPartner.angebot) && (
                <Pressable
                  onPress={() => {
                    if (selectedPartner.id) {
                      const base = getApiBaseUrl() ?? "";
                      fetch(`${base}/partners/${selectedPartner.id}/tap`, {
                        method: "POST",
                      }).catch(() => {});
                    }
                  }}
                >
                  <View
                    style={{
                      backgroundColor: colors.accent + "20",
                      borderRadius: 8,
                      padding: 12,
                      marginTop: 14,
                      borderLeftWidth: 3,
                      borderLeftColor: colors.accent,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.accent,
                        fontFamily: fonts.bodyBold,
                        marginBottom: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                      }}
                    >
                      {t.partnerOffer}
                    </Text>
                    <Text
                      style={[
                        styles.poiSummary,
                        { color: colors.foreground, marginTop: 0 },
                      ]}
                    >
                      {partnerTranslation?.angebot ?? selectedPartner.angebot}
                    </Text>
                  </View>
                </Pressable>
              )}
            </Glass>
          </Pressable>
        </Pressable>
      )}

      {/* SOS — bewusst KEIN Glas, immer sichtbar und deckend */}
      <Pressable
        onPress={() => {
          requestPhoneSideSos();
        }}
        accessibilityRole="button"
        accessibilityLabel={`${t.sos} — ${t.emergency}`}
        style={[
          styles.sosBtn,
          { bottom: insets.bottom + 20, backgroundColor: colors.primary },
        ]}
      >
        <Text style={styles.sosText}>{t.sos}</Text>
      </Pressable>

      {sosOpen && (
        <View style={styles.sosOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSosOpen(false)}
          />
          <Animated.View
            entering={FadeInUp}
            style={[
              styles.sosSheet,
              {
                paddingBottom: insets.bottom + 20,
                backgroundColor: colors.card,
              },
            ]}
          >
            <View
              style={[
                styles.sosHandle,
                { backgroundColor: colors.glassBorder },
              ]}
            />
            <Text style={[styles.sosTitle, { color: colors.foreground }]}>
              {t.emergency}
            </Text>
            <Text style={[styles.sosSub, { color: colors.mutedForeground }]}>
              {t.emergencySub}
            </Text>

            <Pressable
              onPress={() => callNumber("1414")}
              accessibilityRole="button"
              accessibilityLabel={`${t.regaTitle} — ${t.regaSub}`}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="phone"
                size={20}
                color={colors.primaryForeground}
              />
              <View>
                <Text style={styles.sosCallTitle}>{t.regaTitle}</Text>
                <Text style={styles.sosCallSub}>{t.regaSub}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => callNumber("112")}
              accessibilityRole="button"
              accessibilityLabel={`${t.euroEmergencyTitle} — ${t.euroEmergencySub}`}
              style={[styles.sosCall, { backgroundColor: colors.primary }]}
            >
              <Feather
                name="phone"
                size={20}
                color={colors.primaryForeground}
              />
              <View>
                <Text style={styles.sosCallTitle}>{t.euroEmergencyTitle}</Text>
                <Text style={styles.sosCallSub}>{t.euroEmergencySub}</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!hasFreshGps || !livePos) {
                  alert(
                    t.emergency,
                    "Eine aktuelle GPS-Position ist erforderlich, bevor dein Standort geteilt werden kann.",
                  );
                  return;
                }
                if (!emergencyContact?.phone?.trim()) {
                  alert(
                    t.emergency,
                    "Bitte hinterlege zuerst einen Notfallkontakt.",
                  );
                  return;
                }
                const coords = `${livePos.lat.toFixed(5)}, ${livePos.lng.toFixed(5)}`;
                const senderName = profile?.name?.trim() || undefined;
                const body = t.emergencySmsBody(coords, senderName);
                const phone = emergencyContact.phone.replace(/\s+/g, "");
                openUrlSafely(
                  `sms:${phone}&body=${encodeURIComponent(body)}`,
                  t.smsNotAvailable,
                );
              }}
              style={[styles.sosSecondary, { borderColor: colors.glassBorder }]}
              accessibilityRole="button"
              accessibilityLabel={t.sendLocationToContact}
            >
              <Feather name="share-2" size={18} color={colors.foreground} />
              <Text
                style={[styles.sosSecondaryText, { color: colors.foreground }]}
              >
                {t.sendLocationToContact}
              </Text>
            </Pressable>

            <View style={styles.sosClose}>
              <CloseButton
                accessibilityLabel={t.close}
                onPress={() => setSosOpen(false)}
              />
            </View>
          </Animated.View>
        </View>
      )}
      <SafetyCheckin
        ref={safetyCheckinRef}
        hideTrigger
        routeId={routeId ?? id}
        routeName={route?.name ?? t.unknown}
        emergencyContact={emergencyContact}
        livePosition={livePos}
        hasFreshGps={hasFreshGps}
        getAuthToken={getSafetyAuthToken}
        onStatusChange={handleSafetyCheckinStatus}
        labels={{
          button: t.safetyCheckinButton,
          title: t.safetyCheckinTitle,
          explanation: t.safetyCheckinExplanation,
          chooseDuration: t.safetyCheckinChooseDuration,
          minutes: t.safetyCheckinMinutes,
          start: t.safetyCheckinStart,
          cancel: t.close,
          confirm: t.safetyCheckinConfirm,
          active: t.safetyCheckinActive,
          overdue: t.safetyCheckinOverdue,
          share: t.sendLocationToContact,
          noGps: t.safetyCheckinNoGps,
          noContact: t.safetyCheckinNoContact,
          shareUnavailable: t.smsNotAvailable,
          safeMessage: t.safetyCheckinMessage,
          externalShare: t.safetyCheckinExternalShare,
          externalShareActive: t.safetyCheckinExternalShareActive,
          shareFailed: t.safetyCheckinShareFailed,
          loadFailed: t.safetyCheckinLoadFailed,
          endFailed: t.safetyCheckinEndFailed,
          startFailed: t.safetyCheckinStartFailed,
          localOnly: t.safetyCheckinLocalOnly,
          shareWhatsApp: t.safetyCheckinShareWhatsApp,
          shareSms: t.safetyCheckinShareSms,
          whatsappUnavailable: t.safetyCheckinWhatsappUnavailable,
        }}
      />
    </Background>
  );
}

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <View style={styles.metricValRow}>
        <Text style={[styles.metricVal, { color: colors.destructive }]}>
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.metricUnit, { color: colors.accent }]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function formatCountdown(seconds: number) {
  const mins = Math.floor(Math.max(0, seconds) / 60);
  const secs = Math.max(0, seconds) % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function GpsLiveCard({
  hasFreshGps,
  gpsAgeSec,
  accuracyM,
  place,
  coordinates,
  altitude,
  liveLabel,
  noLocationLabel,
  locationHint,
  altitudeUnit,
  coordinatesLabel,
  placeLabel,
  altitudeLabel,
}: {
  hasFreshGps: boolean;
  gpsAgeSec: number | null;
  accuracyM: number | null;
  place: string | null;
  coordinates: string | null;
  altitude: number | null;
  liveLabel: string;
  noLocationLabel: string;
  locationHint: string;
  altitudeUnit: string;
  coordinatesLabel: string;
  placeLabel: string;
  altitudeLabel: string;
}) {
  const colors = useColors();
  const values = [
    {
      label: "Signalalter",
      value: hasFreshGps && gpsAgeSec != null ? `${gpsAgeSec} s` : "—",
    },
    {
      label: "Genauigkeit",
      value: accuracyM != null ? `±${Math.round(accuracyM)} m` : "—",
    },
    { label: placeLabel, value: hasFreshGps ? (place ?? "—") : "—" },
    { label: coordinatesLabel, value: coordinates ?? "—" },
    {
      label: altitudeLabel,
      value: altitude != null ? `${Math.round(altitude)} ${altitudeUnit}` : "—",
    },
  ];

  return (
    <View style={styles.gpsCard}>
      <View style={styles.gpsCardStatus}>
        <View
          style={[
            styles.gpsCardDot,
            {
              backgroundColor: hasFreshGps
                ? GPS_LIVE_COLOR
                : colors.destructive,
            },
          ]}
        />
        <Text style={[styles.gpsCardTitle, { color: colors.foreground }]}>
          {hasFreshGps ? liveLabel : noLocationLabel}
        </Text>
      </View>
      <View
        style={[styles.gpsValueList, { borderTopColor: colors.glassBorder }]}
      >
        {values.map(({ label, value }) => (
          <View key={label} style={styles.gpsValueRow}>
            <Text
              style={[styles.gpsValueLabel, { color: colors.mutedForeground }]}
            >
              {label}
            </Text>
            <Text
              style={[styles.gpsValue, { color: colors.foreground }]}
              numberOfLines={1}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
      {!hasFreshGps && (
        <Text style={[styles.gpsCardHint, { color: colors.mutedForeground }]}>
          {locationHint}
        </Text>
      )}
    </View>
  );
}

function WatchCompanionCard({
  ready,
  direction,
  remainingKm,
  onEnable,
}: {
  ready: boolean | null;
  direction: string | null;
  remainingKm: number;
  onEnable: () => void;
}) {
  const colors = useColors();
  const enabled = ready === true;
  const status = enabled
    ? "Watch-Verbindung aktiv"
    : ready === false
      ? "Watch-Mitteilungen nicht erlaubt"
      : "Watch-Begleitung wird geprüft";
  return (
    <Glass style={{ marginTop: 14 }}>
      <View style={styles.watchCardHead}>
        <View
          style={[
            styles.watchIcon,
            {
              backgroundColor: enabled ? colors.accent + "22" : colors.glassBg,
            },
          ]}
        >
          <Feather
            name="watch"
            size={18}
            color={enabled ? colors.accent : colors.mutedForeground}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.watchTitle, { color: colors.foreground }]}>
            Watch-Begleitung
          </Text>
          <Text
            style={[
              styles.watchStatus,
              { color: enabled ? colors.accent : colors.mutedForeground },
            ]}
          >
            {status}
          </Text>
        </View>
        {ready === false && (
          <Pressable
            onPress={() => {
              hapticRigid();
              onEnable();
            }}
            accessibilityRole="button"
            accessibilityLabel="Watch-Mitteilungen erlauben"
            style={[styles.watchEnable, { borderColor: colors.glassBorder }]}
          >
            <Text
              style={[styles.watchEnableText, { color: colors.foreground }]}
            >
              Erlauben
            </Text>
          </Pressable>
        )}
      </View>
      <View
        style={[styles.watchMetrics, { borderTopColor: colors.glassBorder }]}
      >
        <View style={styles.watchMetric}>
          <Feather name="navigation" size={14} color={colors.accent} />
          <Text
            style={[styles.watchMetricLabel, { color: colors.mutedForeground }]}
          >
            Richtung
          </Text>
          <Text style={[styles.watchMetricValue, { color: colors.foreground }]}>
            {direction ?? "—"}
          </Text>
        </View>
        <View style={styles.watchMetric}>
          <Feather name="map-pin" size={14} color={colors.accent} />
          <Text
            style={[styles.watchMetricLabel, { color: colors.mutedForeground }]}
          >
            Rest
          </Text>
          <Text style={[styles.watchMetricValue, { color: colors.foreground }]}>
            {remainingKm.toFixed(1)} km
          </Text>
        </View>
      </View>
      <Text style={[styles.watchHint, { color: colors.mutedForeground }]}>
        Nur Abbiegehinweise und SOS werden als native Mitteilungen auf die
        gekoppelte Watch gespiegelt. Regelmässige Status-Pushes mit Richtung
        oder Distanz sind deaktiviert.
      </Text>
    </Glass>
  );
}

function CompassCard({
  heading,
  sagaBearing,
  sagaName,
  available,
  direction,
  coordinates,
  place,
  altitude,
  title,
  unavailable,
  coordinatesLabel,
  placeLabel,
  altitudeLabel,
  altitudeUnit,
}: {
  heading: number | null;
  sagaBearing: number | null;
  sagaName: string;
  available: boolean | null;
  direction: string | null;
  coordinates: string | null;
  place: string | null;
  altitude: number | null;
  title: string;
  unavailable: string;
  coordinatesLabel: string;
  placeLabel: string;
  altitudeLabel: string;
  altitudeUnit: string;
}) {
  const colors = useColors();
  const ready = available === true && heading != null && direction != null;
  const northNeedleRotation = heading == null ? 0 : -heading;
  const sagaNeedleRotation =
    heading == null || sagaBearing == null
      ? 0
      : ((sagaBearing - heading + 540) % 360) - 180;
  const altitudeText =
    altitude == null
      ? "—"
      : `${Math.round(altitude).toLocaleString()} ${altitudeUnit}`;

  return (
    <View
      style={[styles.compassCard, { borderColor: "#8A5C34" }]}
      accessibilityLabel={
        ready
          ? `${title}: ${direction}, ${Math.round(heading!)}°, ${placeLabel} ${place ?? "—"}, ${coordinatesLabel} ${coordinates ?? "—"}, ${altitudeLabel} ${altitudeText}`
          : unavailable
      }
    >
      <Image
        source={require("../../assets/images/antique-compass-card-wood.jpg")}
        style={styles.compassCardWood}
        resizeMode="cover"
      />
      <View style={styles.compassCardShade} />
      <View style={styles.compassHeader}>
        {ready && (
          <Text style={[styles.compassDegrees, { color: COMPASS_GOLD }]}>
            {Math.round(heading!)}°
          </Text>
        )}
      </View>

      {ready ? (
        <View style={styles.compassBody}>
          <Text style={styles.compassTopValue}>{direction}</Text>
          <View style={styles.compassPhotoStage}>
            <Image
              source={require("../../assets/images/antique-saga-compass-full-wood.jpg")}
              style={styles.compassPhoto}
              resizeMode="contain"
            />
            <Text style={styles.photoNorth}>N</Text>
            <Text style={styles.photoEast}>E</Text>
            <Text style={styles.photoSouth}>S</Text>
            <Text style={styles.photoWest}>W</Text>

            <View
              style={[
                styles.needleLayer,
                { transform: [{ rotate: `${northNeedleRotation}deg` }] },
              ]}
            >
              <View style={styles.northNeedleTip} />
              <View style={styles.northNeedleShaft} />
              <View style={styles.northNeedleTail} />
            </View>

            {sagaBearing != null && (
              <View
                style={[
                  styles.needleLayer,
                  { transform: [{ rotate: `${sagaNeedleRotation}deg` }] },
                ]}
              >
                <View style={styles.sagaNeedleShaft} />
                <View style={styles.sagaNeedleIcon}>
                  <Image
                    source={require("../../assets/images/compass-saga-pointer.png")}
                    style={styles.sagaNeedleImage}
                    resizeMode="contain"
                  />
                </View>
              </View>
            )}

            <View style={styles.compassCenterOuter}>
              <View style={styles.compassCenterInner} />
            </View>
          </View>
          <View style={styles.compassReadout}>
            <Text style={styles.compassBottomValue}>{altitudeText}</Text>
            <View style={styles.compassLegend}>
              <View style={styles.compassLegendItem}>
                <View style={styles.northLegendMark} />
                <Text style={styles.compassLegendText}>N</Text>
              </View>
              {sagaName ? (
                <View style={[styles.compassLegendItem, { flex: 1 }]}>
                  <Image
                    source={require("../../assets/images/compass-saga-pointer.png")}
                    style={styles.compassSagaLegendIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.compassSagaName} numberOfLines={1}>
                    {sagaName}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      ) : available === null ? (
        <View style={styles.compassUnavailableRow}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.compassHint, { color: COMPASS_GOLD }]}>…</Text>
        </View>
      ) : (
        <Text style={[styles.compassHint, { color: COMPASS_GOLD }]}>
          {unavailable}
        </Text>
      )}

      <View style={[styles.compassLocationData, { borderTopColor: "#704725" }]}>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {placeLabel}
          </Text>
          <Text
            style={[styles.compassDataValue, { color: COMPASS_GOLD }]}
            numberOfLines={1}
          >
            {place ?? "—"}
          </Text>
        </View>
        <View style={styles.compassLocationRow}>
          <Text style={[styles.compassDataLabel, { color: COMPASS_GOLD }]}>
            {coordinatesLabel}
          </Text>
          <Text
            style={[styles.compassDataValue, { color: COMPASS_GOLD }]}
            numberOfLines={1}
          >
            {coordinates ?? "—"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  gpsTileDot: { width: 11, height: 11, borderRadius: 6, marginTop: 3 },
  gpsCard: { paddingHorizontal: 12, paddingVertical: 12 },
  gpsCardStatus: { flexDirection: "row", alignItems: "center", gap: 9 },
  gpsCardDot: { width: 11, height: 11, borderRadius: 6 },
  gpsCardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, flex: 1 },
  gpsValueList: { borderTopWidth: 1, marginTop: 13, paddingTop: 8 },
  gpsValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  gpsValueLabel: { fontFamily: fonts.body, fontSize: 12 },
  gpsValue: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    flexShrink: 1,
    textAlign: "right",
  },
  gpsCardHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bannerHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerText: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 13 },
  bannerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  offlineBannerInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  gpsRetryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 9,
  },
  gpsRetryText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  offRouteBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 10,
  },
  offRouteBannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  offRouteBannerTitle: { fontFamily: fonts.bodyBold, fontSize: 13 },
  offRouteBannerHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  offRouteFollowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  offRouteFollowText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  routeChangeArea: { marginTop: 12 },
  routeChangePanel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    gap: 9,
  },
  routeChangeTitle: { fontFamily: fonts.titleBold, fontSize: 18 },
  routeChangeHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  routeChangeOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  routeChangeOptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    flex: 1,
  },
  routeChangeError: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  bannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 10,
  },
  bannerAction: { fontFamily: fonts.bodyBold, fontSize: 13 },
  headRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  eyebrow: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  title: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  statBar: { flexDirection: "row", justifyContent: "space-between" },
  watchCardHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  watchIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  watchTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  watchStatus: { fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
  watchEnable: {
    borderWidth: 1,
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  watchEnableText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  watchMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 12,
  },
  watchMetric: { alignItems: "center", gap: 3, flex: 1 },
  watchMetricLabel: { fontFamily: fonts.body, fontSize: 11 },
  watchMetricValue: { fontFamily: fonts.monoBold, fontSize: 14, marginTop: 1 },
  watchHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
  },
  watchTilePulse: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    lineHeight: 12,
    marginTop: 2,
  },
  metric: { alignItems: "flex-start" },
  metricLabel: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1 },
  metricValRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginTop: 3,
  },
  metricVal: { fontFamily: fonts.monoBold, fontSize: 20 },
  metricUnit: { fontFamily: fonts.mono, fontSize: 11 },
  compassCard: {
    position: "relative",
    marginTop: 12,
    borderWidth: 2,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#351B10",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.42,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  compassCardWood: {
    ...StyleSheet.absoluteFill,
    opacity: 0.9,
  },
  compassCardShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(38,18,11,0.48)",
  },
  compassHeader: {
    position: "relative",
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  compassDegrees: { fontFamily: COMPASS_ANTIQUE_FONT, fontSize: 14 },
  compassBody: {
    position: "relative",
    zIndex: 1,
    alignItems: "center",
    gap: 12,
    marginTop: 14,
  },
  compassTopValue: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 30,
    lineHeight: 34,
    textAlign: "center",
  },
  compassPhotoStage: {
    position: "relative",
    width: "100%",
    maxWidth: 330,
    aspectRatio: 1,
    alignSelf: "center",
  },
  compassPhoto: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  photoNorth: {
    position: "absolute",
    left: "50%",
    top: "17.5%",
    marginLeft: -7,
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 17,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoEast: {
    position: "absolute",
    right: "16%",
    top: "48%",
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoSouth: {
    position: "absolute",
    left: "50%",
    top: "78%",
    marginLeft: -6,
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  photoWest: {
    position: "absolute",
    left: "17%",
    top: "48%",
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 15,
    textShadowColor: "rgba(42,22,9,0.9)",
    textShadowRadius: 1,
    textShadowOffset: { width: 0, height: 1 },
  },
  needleLayer: {
    position: "absolute",
    left: "50%",
    top: "50.2%",
    marginLeft: -78,
    marginTop: -78,
    width: 156,
    height: 156,
    alignItems: "center",
    justifyContent: "center",
  },
  northNeedleTip: {
    position: "absolute",
    top: 13,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderBottomWidth: 17,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#B22A2E",
  },
  northNeedleShaft: {
    position: "absolute",
    top: 28,
    width: 4,
    height: 51,
    backgroundColor: "#B22A2E",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  northNeedleTail: {
    position: "absolute",
    top: 78,
    width: 4,
    height: 46,
    backgroundColor: "#E7D8B8",
    borderWidth: 1,
    borderColor: "#5C4938",
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  sagaNeedleShaft: {
    position: "absolute",
    top: 35,
    width: 3,
    height: 45,
    backgroundColor: "#D8A84E",
    shadowColor: "#6B4316",
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  sagaNeedleIcon: {
    position: "absolute",
    top: 0,
    width: 23,
    height: 41,
    alignItems: "center",
    justifyContent: "center",
  },
  sagaNeedleImage: {
    width: "100%",
    height: "100%",
  },
  compassCenterOuter: {
    position: "absolute",
    left: "50%",
    top: "50.2%",
    marginLeft: -11,
    marginTop: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    borderColor: "#6B4316",
    backgroundColor: "#D8A84E",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2A1609",
    shadowOpacity: 0.6,
    shadowRadius: 3,
  },
  compassCenterInner: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2A1B11",
  },
  compassReadout: { width: "100%", alignItems: "center", gap: 8 },
  compassBottomValue: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 24,
  },
  compassLegend: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  compassLegendItem: {
    minWidth: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  northLegendMark: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#B22A2E",
  },
  compassLegendText: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 10,
  },
  compassSagaLegendIcon: {
    width: 12,
    height: 22,
  },
  compassSagaName: {
    color: COMPASS_GOLD,
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 13,
    flexShrink: 1,
  },
  compassHint: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 13,
    lineHeight: 18,
  },
  compassUnavailableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  compassLocationData: {
    position: "relative",
    zIndex: 1,
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    gap: 7,
  },
  compassLocationRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  compassDataLabel: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 9,
    letterSpacing: 1,
  },
  compassDataValue: {
    fontFamily: COMPASS_ANTIQUE_FONT,
    fontSize: 12,
    flexShrink: 1,
    textAlign: "right",
  },
  preparing: { alignItems: "center", paddingVertical: 50, gap: 16 },
  preparingText: { fontFamily: fonts.story, fontSize: 16 },
  poiRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  poiThumb: { width: 40, height: 40, borderRadius: 8 },
  poiCardImage: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 14,
    height: 220,
  },
  poiCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  poiEyebrow: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 1.2 },
  poiTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  poiSummary: {
    fontFamily: fonts.story,
    fontSize: 18,
    marginTop: 8,
    lineHeight: 28,
  },
  poiModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,26,0.7)",
    justifyContent: "center",
    padding: 16,
  },
  poiModalImage: {
    width: "100%",
    height: 200,
    borderRadius: 10,
    marginBottom: 12,
  },
  storyWrap: { marginTop: 24 },
  storyTileHeader: {
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storyTileHeaderMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  storyTileHeaderText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  storyTileTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  storyTileSubtitle: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  chapterActions: { flexDirection: "row", gap: 8 },
  chapterHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  chapterMark: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1.5 },
  nowPlayingCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 10,
  },
  nowPlayingTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  nowPlayingMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    flex: 1,
  },
  nowPlayingLabel: {
    fontFamily: fonts.monoBold,
    fontSize: 10,
    letterSpacing: 1.2,
  },
  nowPlayingTitle: { fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: 3 },
  nowPlayingText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  audioMiniPlayer: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioMiniMeta: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  audioMiniLabel: { fontFamily: fonts.monoBold, fontSize: 10, letterSpacing: 1 },
  audioMiniTitle: { fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 2 },
  audioMiniButton: {
    width: 32,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  audioMiniOpen: { padding: 6 },
  audioWaveform: {
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  audioWaveBar: { width: 3, minHeight: 5, borderRadius: 3 },
  playBtn: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  playText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  storyText: { fontFamily: fonts.story, fontSize: 20, lineHeight: 32 },
  narrationUnavailable: { fontFamily: fonts.body, fontSize: 13, marginTop: 8 },
  decisionWrap: { marginTop: 24 },
  conditionSection: { paddingTop: 8, paddingBottom: 20 },
  conditionTileContent: { paddingVertical: 8 },
  conditionDivider: { height: 1, marginVertical: 16 },
  conditionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  conditionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  conditionEmojiText: { fontSize: 18, lineHeight: 22 },
  conditionChipLabel: { fontFamily: fonts.body, fontSize: 13 },
  conditionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontFamily: fonts.body,
    fontSize: 13,
    minHeight: 72,
    textAlignVertical: "top",
    marginTop: 4,
  },
  conditionSuccess: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  conditionError: { fontFamily: fonts.body, fontSize: 12, marginTop: 8 },
  safetyFilterTile: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    marginTop: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  safetyFilterHeader: {
    minHeight: 60,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  safetyFilterHeaderMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  safetyFilterHeaderText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  safetyFilterTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  safetyFilterCount: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  safetyFilterBody: {
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  safetyFilterHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  safetyFilterGrid: { gap: 8, marginTop: 12 },
  safetyFilterOption: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  safetyFilterCode: {
    minWidth: 32,
    height: 26,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  safetyFilterCodeText: {
    fontFamily: fonts.monoBold,
    fontSize: 13,
    lineHeight: 14,
    textAlign: "center",
  },
  safetyFilterLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, flex: 1 },
  safetyFilterAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  safetyFilterAllText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  choiceFeedbackWrap: { marginTop: 16 },
  choiceFeedbackPanel: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceFeedbackText: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  decisionPanel: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 18 },
  decisionLabel: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 2 },
  decisionQuestion: {
    fontFamily: fonts.titleBold,
    fontSize: 20,
    marginTop: 6,
    marginBottom: 14,
  },
  voiceHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  voiceHintText: { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 1 },
  optionBtn: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  optionLabel: { fontFamily: fonts.bodyMedium, fontSize: 15, lineHeight: 21 },
  optionHint: { fontFamily: fonts.mono, fontSize: 11, marginTop: 5 },
  storyActionArea: { width: "100%", gap: 10 },
  completionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  completionHeader: { flexDirection: "row", alignItems: "center", gap: 9 },
  completionTitle: { fontFamily: fonts.titleBold, fontSize: 18 },
  completionStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 12,
  },
  completionStat: { fontFamily: fonts.monoBold, fontSize: 13 },
  completionHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 10 },
  photoRow: { alignItems: "stretch", marginTop: 20, gap: 8 },
  hikeActionButton: { width: "100%", minHeight: 56 },
  photoFab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoFabText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  photoStrip: { width: "100%", flexGrow: 0, maxHeight: 52 },
  photoStripContent: { gap: 6 },
  photoThumbWrap: { position: "relative", width: 48, height: 48 },
  photoThumb: { width: 48, height: 48, borderRadius: 8 },
  photoThumbBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  photoChallengeWrap: { marginTop: 24 },
  photoChallengePanel: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  photoChallengeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  photoChallengeTitel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  photoChallengeActions: { flexDirection: "row", gap: 10 },
  photoChallengeBtn: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  photoChallengeBtnText: { fontFamily: fonts.bodyMedium, fontSize: 13 },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  countdownBar: { flex: 1, height: 4, borderRadius: 2, overflow: "hidden" },
  countdownFill: { height: 4, borderRadius: 2 },
  countdownNum: {
    fontFamily: fonts.monoBold,
    fontSize: 14,
    minWidth: 22,
    textAlign: "right",
  },
  sosBtn: {
    position: "absolute",
    right: 18,
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  sosText: {
    fontFamily: fonts.titleBlack,
    fontSize: 18,
    color: "#F5F3EC",
    letterSpacing: 1,
  },
  sosOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
    zIndex: 50,
  },
  sosSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
  },
  sosHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sosTitle: { fontFamily: fonts.titleBlack, fontSize: 26 },
  sosSub: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
    marginBottom: 18,
  },
  sosCall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sosCallTitle: { fontFamily: fonts.titleBold, fontSize: 18, color: "#F5F3EC" },
  sosCallSub: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: "rgba(245,243,236,0.8)",
  },
  sosSecondary: {
    ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginTop: 4,
  },
  sosSecondaryText: { fontFamily: fonts.bodyMedium, fontSize: 15 },
  sosClose: { alignItems: "center", paddingVertical: 16 },
});
