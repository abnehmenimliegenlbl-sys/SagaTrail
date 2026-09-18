}
          onRetryWeather={() => setWeatherVersuch((value) => value + 1)}
        />

        <View style={[styles.qualityCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
          <View style={styles.qualityHeader}>
            <Feather
              name={route?.qualityStatus === "invalid" ? "alert-triangle" : "check-circle"}
              size={16}
              color={route?.qualityStatus === "invalid" ? colors.accent : colors.mutedForeground}
            />
            <Text style={[styles.qualityTitle, { color: colors.foreground }]}>
              {qualityT.title}
            </Text>
          </View>
          <Text style={[styles.qualityStatus, { color: colors.mutedForeground }]}>
            {qualityDate ? qualityT.checkedAt(qualityDate) : qualityStatusText}
          </Text>
          {qualityDate && (
            <Text style={[styles.qualityStatus, { color: colors.mutedForeground }]}>
              {qualityStatusText}
            </Text>
          )}
          {!!route?.sources && (
            <View style={styles.qualitySources}>
              {Object.entries(route.sources).map(([key, source]) => (
                <Pressable
                  key={key}
                  disabled={!source.url}
                  onPress={() => source.url && void Linking.openURL(source.url)}
                  accessibilityRole={source.url ? "link" : undefined}
                  style={styles.qualitySourceRow}
                >
                  <Text style={[styles.qualitySourceKind, { color: colors.mutedForeground }]}>
                    {key}
                  </Text>
                  <Text style={[styles.qualitySourceLabel, { color: colors.foreground }]}>
                    {source.label}
                  </Text>
                  {!!source.url && <Feather name="external-link" size={12} color={colors.accent} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {routeThemes.length > 0 && (
          <View style={styles.routeThemes} accessibilityLabel="Themen dieser Route">
            {routeThemes.map((theme) => (
              <View
                key={theme}
                style={[
                  styles.routeThemeChip,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <Feather name="tag" size={12} color={colors.accent} />
                <Text style={[styles.routeThemeText, { color: colors.foreground }]}>
                  {routeThemeLabel(theme, language)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {offlineThemeEvidenceMissing && (
          <View
            style={[
              styles.themeEvidenceNotice,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
            accessibilityRole="text"
          >
            <Feather name="info" size={14} color={colors.mutedForeground} />
            <Text style={[styles.themeEvidenceNoticeText, { color: colors.mutedForeground }]}>
              {t.themeEvidenceUnavailableOffline}
            </Text>
          </View>
        )}

        <Pressable
          onPress={() =>
            router.push(
              `/treffpunkte/neu?routeId=${encodeURIComponent(route.id)}&routeName=${encodeURIComponent(route.name)}&canton=${encodeURIComponent(route.canton ?? route.region)}`,
            )
          }
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.meetupCta,
            {
              borderColor: colors.accent,
              backgroundColor: colors.accent + "14",
              opacity: pressed ? 0.78 : 1,
            },
          ]}
        >
          <Feather name="users" size={18} color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.meetupCtaTitle, { color: colors.foreground }]}>
              {meetupT.create}
            </Text>
            <Text style={[styles.meetupCtaText, { color: colors.mutedForeground }]}>
              {meetupT.intro}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.accent} />
        </Pressable>

        <Pressable
          onPress={() => setRouteTerrain3dOpen(true)}
          disabled={
            (effectiveGeom.length < 2 && (route.geometry?.length ?? 0) < 2) ||
            !elevProfile ||
            elevProfile.length < 2
          }
          accessibilityRole="button"
          accessibilityLabel="Diese Route virtuell ansehen"
          accessibilityHint="Öffnet die Route als dreidimensionale Landschaft"
          style={({ pressed }) => [
            styles.virtualRouteCard,
            {
              borderColor: colors.glassBorder,
              backgroundColor: colors.glassBg,
              opacity:
                !elevProfile || elevProfile.length < 2
                  ? 0.58
                  : pressed
                    ? 0.82
                    : 1,
            },
          ]}
        >
          <View
            style={[
              styles.virtualRouteIcon,
              { backgroundColor: colors.accent + "1F" },
            ]}
          >
            <Feather name="box" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.virtualRouteEyebrow,
                { color: colors.accent },
              ]}
            >
              3D ROUTE
            </Text>
            <Text
              style={[
                styles.virtualRouteTitle,
                { color: colors.foreground },
              ]}
            >
              Diese Route virtuell ansehen
            </Text>
            <Text
              style={[
                styles.virtualRouteSubtitle,
                { color: colors.mutedForeground },
              ]}
            >
              {elevProfile && elevProfile.length >= 2
                ? "Übersicht, Gehen und Flug"
                : "Wird vorbereitet …"}
            </Text>
          </View>
          {elevProfileLoading && !elevProfile ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Feather
              name="chevron-right"
              size={20}
              color={colors.mutedForeground}
            />
          )}
        </Pressable>

        <RouteTerrain3D
          visible={routeTerrain3dOpen}
          onClose={() => setRouteTerrain3dOpen(false)}
          geometry={
            effectiveGeom.length >= 2 ? effectiveGeom : route.geometry ?? []
          }
          terrainProfile={elevProfile}
        />

        {/* ── Höhenprofil ────────────────────────────────────────────── */}
        {(elevProfile || elevProfileLoading) && (
          <View
            style={[
              styles.elevChartCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.elevChartTitle, { color: colors.foreground }]}>
              {t.elevationProfile}
            </Text>
            {elevProfileLoading && !elevProfile ? (
              <View style={{ height: 110, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={colors.accent} />
              </View>
            ) : elevProfile ? (
              <ElevationChart
                profile={elevProfile}
                height={140}
                dangerLevel={avalanche?.available ? (avalanche.dangerLevel ?? null) : null}
                snowLineM={2000}
                uvIndex={weather?.uvIndex ?? null}
                isThunderstorm={weather?.isThunderstorm ?? false}
                officialDistanceKm={meta.distanceKm}
              />
            ) : null}
          </View>
        )}

        {/* ── Routenbeschreibung (Wikipedia) ────────────────────────── */}
        {!!route.description && (
          <View
            style={[
              styles.elevChartCard,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
            ]}
          >
            <Text style={[styles.elevChartTitle, { color: colors.foreground }]}>
              Über diese Route
            </Text>
            <Text
              style={{ color: colors.mutedForeground, fontSize: 14, lineHeight: 21 }}
              numberOfLines={beschreibungOffen ? undefined : 5}
            >
              {route.description}
            </Text>
            <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Pressable onPress={() => setBeschreibungOffen((v) => !v)} hitSlop={8}>
                <Text style={{ color: colors.accent, fontSize: 13, fontFamily: fonts.bodyMedium }}>
                  {beschreibungOffen ? "Weniger anzeigen" : "Mehr anzeigen"}
                </Text>
              </Pressable>
              {!!route.descriptionSource && beschreibungOffen && (
                <Pressable
                  onPress={() => Linking.openURL(route.descriptionSource!).catch(() => {})}
                  hitSlop={8}
                >
                  <Text style={{ color: colors.mutedForeground, fontSize: 12, textDecorationLine: "underline" }}>
                    Quelle: Wikipedia
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* ── Strecke umkehren ──────────────────────────────────────── */}
        {effectiveGeom.length >= 2 && routentyp === "strecke" && (
          <Pressable
            onPress={() => setReversed((r) => !r)}
            style={[
              styles.rueckreiseButton,
              {
                borderColor: reversed ? colors.accent : colors.glassBorder,
                backgroundColor: reversed ? colors.accent + "22" : colors.glassBg,
                marginTop: 10,
              },
            ]}
          >
            <Feather name="repeat" size={15} color={reversed ? colors.accent : colors.mutedForeground} />
            <Text style={[styles.rueckreiseText, { color: reversed ? colors.accent : colors.mutedForeground }]}>
              {t.reverseRoute}
            </Text>
          </Pressable>
        )}

        {/* ── Höhenwarnung ──────────────────────────────────────────── */}
        {route && (route.maxElevationM ?? 0) >= 2000 && (() => {
          const elev = route.maxElevationM ?? 0;
          const color = elev >= 3000 ? "#EF4444" : elev >= 2500 ? "#F97316" : "#F59E0B";
          const msg = elev >= 3000
            ? t.altitudeWarningAlpin
            : elev >= 2500
              ? t.altitudeWarningHoch
              : t.altitudeWarningBerg;
          return (
            <View style={[styles.checkCard, { borderColor: color, backgroundColor: colors.glassBg, marginTop: 12, borderWidth: 1 }]}>
              <View style={styles.checkRow}>
                <Feather name="alert-triangle" size={16} color={color} />
                <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold }]}>
                  {t.altitudeWarning}
                </Text>
                <Text style={[styles.checkValue, { color, fontFamily: fonts.bodyBold }]}>
                  {elev >= 1000
                    ? `${Math.round(elev / 100) / 10}k m`
                    : `${Math.round(elev)} m`}
                </Text>
              </View>
              <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 4 }]}>
                {t.altitudeM(Math.round(elev))}
              </Text>
              <Text style={[styles.checkNote, { color: colors.mutedForeground, marginTop: 2 }]}>
                {msg}
              </Text>
            </View>
          );
        })()}

        <RouteAccordionCard
          icon={meta.season === "ganzjaehrig" ? "sun" : "cloud-snow"}
          title={t.seasonLabel}
          summary={t.season[
            meta.season === "ganzjaehrig"
              ? "ganzjaehrig"
              : meta.season === "nur_sommer"
                ? "nurSommer"
                : "eherSommer"
          ]}
          open
          onPress={() => {}}
          collapsible={false}
        >
          <View style={styles.checkRow}>
            <Feather name="sun" size={16} color={colors.mutedForeground} />
            <Text style={[styles.checkLabel, { color: colors.foreground }]}>{t.seasonLabel}</Text>
            <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
              {t.season[
                meta.season === "ganzjaehrig"
                  ? "ganzjaehrig"
                  : meta.season === "nur_sommer"
                    ? "nurSommer"
                    : "eherSommer"
              ]}
            </Text>
          </View>
          <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.seasonNote}</Text>
          {routentyp ? (
            <>
              <View style={styles.checkRow}>
                <Feather
                  name={routentyp === "rundweg" ? "rotate-cw" : "arrow-right"}
                  size={16}
                  color={colors.mutedForeground}
                />
                <Text style={[styles.checkLabel, { color: colors.foreground }]}>
                  {t.routeTypeLabel}
                </Text>
                <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>
                  {routentyp === "rundweg" ? t.routeTypeRundweg : t.routeTypeStrecke}
                </Text>
              </View>
              {routentyp === "strecke" ? (
                <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>
                  {t.streckeHint}
                </Text>
              ) : null}
            </>
          ) : null}
        </RouteAccordionCard>

        <RouteAccordionCard
          icon="send"
          title="SBB Live"
          summary={routentyp === "strecke" ? `${t.planOutward} · ${t.planReturn}` : t.planOutward}
          open={sbbOpen}
          onPress={() => setSbbOpen((open) => !open)}
        >
          {/* SBB-Anreise-Button — für alle Routentypen sichtbar */}
          <Pressable
            onPress={oeffneAnreise}
            style={[
              styles.rueckreiseButton,
              { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 0 },
            ]}
          >
            <Feather name="send" size={15} color={colors.accent} />
            <Text style={[styles.rueckreiseText, { color: colors.accent }]}>
              {t.planOutward}
            </Text>
          </Pressable>

          {/* SBB-Rückreise-Button — nur für Streckenwanderungen */}
          {routentyp === "strecke" ? (
            <Pressable
              onPress={oeffneRueckreise}
              style={[
                styles.rueckreiseButton,
                { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 8 },
              ]}
            >
              <Feather name="send" size={15} color={colors.accent} />
              <Text style={[styles.rueckreiseText, { color: colors.accent }]}>
                {t.planReturn}
              </Text>
            </Pressable>
          ) : null}

        {/* ── SBB live am Start (Abfahrten vom aktuellen Standort) ──── */}
        <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
          <View style={[styles.checkRow, { marginBottom: 6 }]}>
            <Feather name="log-in" size={15} color={colors.accent} />
            <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold, flex: 1 }]}>
              {t.transportAnreiseLive}
            </Text>
            {transportStart?.station && (
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t.transportDepartingFrom(transportStart.station.name)}
              </Text>
            )}
          </View>
          {transportStartLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportLoading}</Text>
            </View>
          ) : !transportStart?.station ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportNoStation}</Text>
          ) : transportStart.departures.length === 0 ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportError}</Text>
          ) : (
            transportStart.departures.slice(0, 6).map((dep, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder, gap: 6 }}>
                <Text style={[styles.checkValue, { color: colors.foreground, fontFamily: fonts.bodyBold, width: 42 }]}>
                  {dep.time}
                </Text>
                <Text style={[styles.checkNote, { color: colors.accent, fontFamily: fonts.bodyBold, width: 36 }]} numberOfLines={1}>
                  {dep.category}{dep.number}
                </Text>
                <Text style={[styles.checkNote, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                  {dep.to}
                </Text>
                {dep.platform ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, width: 36, textAlign: "right" }]} numberOfLines={1}>
                    {t.transportPlatform(dep.platform)}
                  </Text>
                ) : null}
                {dep.delay != null && dep.delay > 0 ? (
                  <Text style={[styles.checkNote, { color: "#EF4444", width: 44, textAlign: "right" }]}>
                    {t.transportDelay(dep.delay)}
                  </Text>
                ) : dep.delay === 0 ? (
                  <Text style={[styles.checkNote, { color: "#78C800", width: 44, textAlign: "right" }]}>
                    {t.transportOnTime}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* ── SBB live am Ziel ──────────────────────────────────────── */}
        <View style={[styles.checkCard, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg, marginTop: 12 }]}>
          <View style={[styles.checkRow, { marginBottom: 6 }]}>
            <Feather name="navigation" size={15} color={colors.accent} />
            <Text style={[styles.checkLabel, { color: colors.foreground, fontFamily: fonts.bodyBold, flex: 1 }]}>
              {t.transportLive}
            </Text>
            {transport?.station && (
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t.transportDepartingFrom(transport.station.name)}
              </Text>
            )}
          </View>
          {transportLoading ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator size="small" color={colors.mutedForeground} />
              <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportLoading}</Text>
            </View>
          ) : !transport?.station ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportNoStation}</Text>
          ) : transport.departures.length === 0 ? (
            <Text style={[styles.checkNote, { color: colors.mutedForeground }]}>{t.transportError}</Text>
          ) : (
            transport.departures.slice(0, 6).map((dep, i) => (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 4, borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder, gap: 6 }}>
                <Text style={[styles.checkValue, { color: colors.foreground, fontFamily: fonts.bodyBold, width: 42 }]}>
                  {dep.time}
                </Text>
                <Text style={[styles.checkNote, { color: colors.accent, fontFamily: fonts.bodyBold, width: 36 }]} numberOfLines={1}>
                  {dep.category}{dep.number}
                </Text>
                <Text style={[styles.checkNote, { color: colors.foreground, flex: 1 }]} numberOfLines={1}>
                  {dep.to}
                </Text>
                {dep.platform ? (
                  <Text style={[styles.checkNote, { color: colors.mutedForeground, width: 36, textAlign: "right" }]} numberOfLines={1}>
                    {t.transportPlatform(dep.platform)}
                  </Text>
                ) : null}
                {dep.delay != null && dep.delay > 0 ? (
                  <Text style={[styles.checkNote, { color: "#EF4444", width: 44, textAlign: "right" }]}>
                    {t.transportDelay(dep.delay)}
                  </Text>
                ) : dep.delay === 0 ? (
                  <Text style={[styles.checkNote, { color: "#78C800", width: 44, textAlign: "right" }]}>
                    {t.transportOnTime}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>

          {/* ── Fahrplan-Disclaimer ─────────────────────────────────── */}
          <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 6, textAlign: "center", opacity: 0.7 }}>
            {t.transportDisclaimer}
          </Text>
        </RouteAccordionCard>

        {/* ── SAC-Hütten in der Nähe ──────────────────────────────── */}
        <SacHuettenSection
          huetten={sacHuetten}
          loading={sacHuettenLoading}
          error={sacHuettenError}
        />

        {false && !!saga && (
          <View
            style={[
              styles.downloadCard,
              {
                borderColor: downloaded && !partialDownload ? colors.accent : colors.glassBorder,
                backgroundColor: colors.glassBg,
              },
            ]}
          >
            <View style={styles.downloadHead}>
              <Feather
                name={downloaded && !partialDownload ? "check-circle" : partialDownload ? "alert-triangle" : "download-cloud"}
                size={18}
                color={downloaded && !partialDownload ? colors.accent : partialDownload ? colors.destructive : colors.foreground}
              />
              <Text style={[styles.downloadTitle, { color: colors.foreground }]}>
                {partialDownload ? t.downloadFailed : downloaded ? t.offlineAvailable : t.saveForOffline}
              </Text>
            </View>
            <Text style={[styles.downloadHint, { color: colors.mutedForeground }]}>
              {partialDownload
                ? t.downloadFailedText
                : downloaded
                ? t.offlineStatusActive(sizeLabel)
                : t.offlineStatusInactive}
            </Text>

            {/* Was wird geladen — nur vor dem ersten Download */}
            {!downloaded && !downloading && (
              <View style={styles.downloadInfoBox}>
                {t.downloadInfoItems.map((item, i) => (
                  <View key={i} style={styles.downloadInfoRow}>
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
            )}

            {downloading ? (
              <View style={{ marginTop: 14 }}>
                {/* Fortschrittsbalken + Prozent */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 11 }}>
                  <View style={[styles.dlBarTrack, { backgroundColor: colors.glassBorder, flex: 1 }]}>
                    <RNAnimated.View
                      style={[
                        styles.dlBarFill,
                        {
                          backgroundColor: colors.accent,
                          width: dlAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0%", "100%"],
                          }),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.downloadProgressText, { color: colors.mutedForeground, minWidth: 38, textAlign: "right" }]}>
                    {Math.round(overallProgress * 100)}%
                  </Text>
                </View>
                {/* Phasen-Schritte */}
                <View style={styles.dlPhaseRow}>
                  {(["story", "audio", "pois", "tiles"] as const).map((ph, i) => {
                    const order = ["story", "audio", "pois", "tiles"];
                    const cur = order.indexOf(progress?.phase ?? "story");
                    const isDone = i < cur;
                    const isActive = i === cur;
                    const c = isDone || isActive ? colors.accent : colors.mutedForeground;
                    return (
                      <View key={ph} style={styles.dlPhaseStep}>
                        <View
                          style={[
                            styles.dlPhaseDot,
                            {
                              backgroundColor: isDone || isActive ? colors.accent : "transparent",
                              borderColor: isDone || isActive ? colors.accent : colors.mutedForeground,
                              opacity: isDone || isActive ? 1 : 0.35,
                            },
                          ]}
                        >
                          {isDone && <Feather name="check" size={9} color={colors.background} />}
                        </View>
                        <Text style={[styles.dlPhaseLabel, { color: c, opacity: isDone || isActive ? 1 : 0.4 }]}>
                          {t.downloadPhaseLabels[i]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                {/* Statuszeile */}
                <Text style={[styles.downloadProgressText, { color: colors.mutedForeground, marginTop: 8, fontSize: 12 }]}>
                  {progressText}
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
                disabled={!saga || sagaLoading || downloading || busy}
                loading={downloading || busy}
                style={{ marginTop: 14 }}
              />
            )}
          </View>
        )}

        <View
          style={[
            styles.energyCard,
            { borderColor: colors.glassBorder },
            lowBattery && { borderColor: colors.accent },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.energyTitle, { color: colors.foreground }]}>
              {t.energySavingTitle}
            </Text>
            <Text style={[styles.energyHint, { color: colors.mutedForeground }]}>
              {t.energySavingHint}
            </Text>
          </View>
          <Switch
            value={energiesparmodus}
            onValueChange={setEnergiesparmodus}
            trackColor={{ true: colors.accent, false: colors.muted }}
              ios_backgroundColor={colors.muted}
            thumbColor={colors.foreground}
          />
        </View>

        <View style={{ display: "none" }}>
          <SparkDivider style={{ marginVertical: 22 }} />

          <Text style={[styles.blockTitle, { color: colors.foreground }]}>
            {t.matchingSaga}
          </Text>

        {showPicker ? (
          <>
            <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
              {t.sagaPickerHint}
            </Text>
            {(() => {
              const CAT_LABEL: Record<SagaProximityCategory, string> = {
                on_route: t.sagaOnRoute,
                near: t.sagaNear,
                canton: t.sagaInCanton,
              };
              let lastCat: SagaProximityCategory | null = null;
              return unlockedCandidatesWithMeta.map(({ saga: s, category }) => {
                const showHeader = category !== lastCat;
                lastCat = category;
                const heard = hikeHistory.some((h) => h.sagaId === s.id);
                const progLabel = heard ? t.progressHeard : t.progressNew;
                const progDot = heard ? colors.mutedForeground : colors.accent;
                const progBg = heard ? colors.glassBg : colors.accent + "22";
                const progBorder = heard ? colors.glassBorder : colors.accent + "55";
                return (
                  <React.Fragment key={s.id}>
                    {showHeader && (
                      <Text style={[styles.pickerCategoryLabel, { color: colors.mutedForeground }]}>
                        {CAT_LABEL[category]}
                      </Text>
                    )}
                    <Pressable
                      onPress={() => selectFromPicker(s)}
                      style={[
                        styles.sagaCard,
                        { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                          {s.coreMotif.toUpperCase()}
                        </Text>
                        <Text style={[styles.sagaTitle, { color: colors.foreground }]}>
                          {getLocalizedSagaTitle(s, profile?.language)}
                        </Text>
                        <Text style={[styles.sagaMood, { color: colors.mutedForeground }]} numberOfLines={1}>
                          {s.mood}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 6 }}>
                        <View style={{
                          backgroundColor: progBg,
                          borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                          borderWidth: 1, borderColor: progBorder,
                        }}>
                          <Text style={{ color: progDot, fontSize: 11, fontFamily: fonts.bodyMedium }}>{progLabel}</Text>
                        </View>
                        <Feather name="chevron-right" size={18} color={colors.accent} />
                      </View>
                    </Pressable>
                  </React.Fragment>
                );
              });
            })()}
            {hasLockedCandidates && (
              <PrimaryButton
                label={t.unlockMoreSagas}
                variant="gold"
                onPress={() => router.push("/paywall")}
                style={{ marginTop: 8 }}
              />
            )}
          </>
        ) : (
          <>
            <Text style={[styles.sagaHint, { color: colors.mutedForeground }]}>
              {sagaLoading
                ? t.matchingSagaHintLoading
                : t.matchingSagaHintLoaded}
            </Text>

            {sagaLoading ? (
              <View
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                {/* Skeleton in Sagakarten-Form — Titel, zwei Textzeilen, Meta. */}
                <View style={{ flex: 1 }}>
                  <Skeleton height={20} width="55%" radius={8} />
                  <Skeleton height={13} radius={7} style={{ marginTop: 10 }} />
                  <Skeleton height={13} width="80%" radius={7} style={{ marginTop: 7 }} />
                  <Text
                    style={[styles.sagaLoadingText, { color: colors.mutedForeground, marginTop: 12 }]}
                  >
                    {t.sagaWriting}
                  </Text>
                </View>
              </View>
            ) : !saga ? (
              <View
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <Text style={[styles.sagaMood, { color: colors.mutedForeground }]}>
                  {t.sagaLoadError}
                </Text>
                <Pressable
                  onPress={() => {
                    setSagaLoading(true);
                    setSagaRetryCount((c) => c + 1);
                  }}
                  hitSlop={10}
                  accessibilityRole="button"
                  style={[styles.retryChip, { borderColor: colors.glassBorder, marginTop: 10 }]}
                >
                  <Feather name="refresh-cw" size={12} color={colors.accent} />
                  <Text style={[styles.retryChipText, { color: colors.accent }]}>
                    {ts.retry}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => router.push(`/saga/${saga.id}?routeId=${route.id}`)}
                style={[
                  styles.sagaCard,
                  { borderColor: colors.glassBorder, backgroundColor: colors.glassBg },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sagaCanton, { color: colors.accent }]}>
                    {saga.coreMotif.toUpperCase()}
                  </Text>
                  <Text style={[styles.sagaTitle, { color: colors.foreground }]}>
                    {getLocalizedSagaTitle(saga, profile?.language)}
                  </Text>
                  <Text
                    style={[styles.sagaMood, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {saga.mood}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  {(() => {
                    const sessions = hikeHistory.filter((h) => h.sagaId === saga.id);
                    const prog =
                      sessions.length === 0 ? 'new'
                      : sessions.some((h) => (h.chapters?.length ?? 0) >= 3) ? 'done'
                      : 'partial';
                    const progLabel = prog === 'done' ? t.progressDone : prog === 'partial' ? t.progressStarted : t.progressNew;
                    const progDot = prog === 'done' ? '#4caf50' : prog === 'partial' ? '#ff9800' : colors.mutedForeground;
                    return (
                      <View style={{
                        backgroundColor: prog === 'done' ? '#4caf5022' : prog === 'partial' ? '#ff980022' : colors.glassBg,
                        borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                        borderWidth: 1, borderColor: progDot + '55',
                      }}>
                        <Text style={{ color: progDot, fontSize: 11, fontFamily: fonts.bodyMedium }}>{progLabel}</Text>
                      </View>
                    );
                  })()}
                  {locked ? (
                    <Feather name="lock" size={18} color={colors.mutedForeground} />
                  ) : (
                    <Feather name="chevron-right" size={20} color={colors.accent} />
                  )}
                </View>
              </Pressable>
            )}

            {saga &&
            !sagaLoading &&
            sagaLokalisierung(route, saga) === "nicht_exakt_lokalisierbar" ? (
              <Text style={[styles.localisationNote, { color: colors.mutedForeground }]}>
                {t.localisationNote}
              </Text>
            ) : null}

            {saga && !sagaLoading && !showPicker ? (
              <>
                <PrimaryButton
                  label={locked ? t.premiumButton : t.continueToSaga}
                  variant={locked ? "gold" : "primary"}
                  onPress={() =>
                    router.push(
                      locked ? "/paywall" : `/saga/${saga.id}?routeId=${route.id}`,
                    )
                  }
                  style={{ marginTop: 16 }}
                />
                {unlockedCandidatesWithMeta.length > 1 && (
                  <Pressable
                    onPress={() => setPickerDismissed(false)}
                    hitSlop={10}
                    accessibilityRole="button"
                    style={{ alignSelf: "center", marginTop: 12, flexDirection: "row", alignItems: "center", gap: 6 }}
                  >
                    <Feather name="repeat" size={13} color={colors.accent} />
                    <Text style={[styles.retryChipText, { color: colors.accent }]}>
                      {t.chooseOtherSaga}
                    </Text>
                  </Pressable>
                )}
              </>
            ) : null}
          </>
        )}

        </View>

        <PrimaryButton
          label={t.selectRoute}
          variant="primary"
          onPress={() => router.push(`/route/${encodeURIComponent(id)}/saga`)}
          style={{ marginTop: 22 }}
        />

        {/* Verstecktes ShareCard für captureRef (off-screen Export) */}
        {route && saga && (
          <View
            pointerEvents="none"
            collapsable={false}
            style={{ position: "absolute", left: -2000, top: 0 }}
          >
            <ShareCard
              ref={shareCardRef}
              sagaTitle={getLocalizedSagaTitle(saga, profile?.language)}
              routeName={route.name}
              distanceKm={meta.distanceKm}
              ascentM={meta.ascentM}
              sacScale={meta.sac}
              geometry={route.geometry ?? []}
              distanceLabel={t.distance}
              ascentLabel={t.ascent}
              timeLabel={t.duration}
              stepsLabel=""
            />
          </View>
        )}
      </ScrollView>

      {/* POI-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPoi && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPoi(null)}
        >
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass overlayColor={poiOverlay}>
              {selectedPoiWiki === undefined ? (
                <View style={[styles.poiModalImage, { alignItems: "center", justifyContent: "center" }]}>
                  <ActivityIndicator color={colors.accent} />
                </View>
              ) : selectedPoiWiki?.image ? (
                <ExpoImage
                  source={{ uri: selectedPoiWiki.image }}
                  style={styles.poiModalImage}
                  contentFit="cover"
                />
              ) : null}
              <View style={styles.poiRow}>
                <Feather name="map-pin" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {poiDisplayName(selectedPoi.name, selectedPoi.kind)}
                  </Text>
                </View>
                <CloseButton accessibilityLabel={ts.close} onPress={() => setSelectedPoi(null)} />
              </View>
              {!!(selectedPoiWiki?.extract) && (
                <Text style={[styles.poiSummary, { color: colors.foreground, marginTop: 10 }]}>
                  {selectedPoiWiki.extract}
                </Text>
              )}
              {!!selectedPoi.source && (
                <Pressable
                  disabled={!selectedPoi.sourceUrl}
                  onPress={() => selectedPoi.sourceUrl && void Linking.openURL(selectedPoi.sourceUrl)}
                  accessibilityRole={selectedPoi.sourceUrl ? "link" : undefined}
                  style={styles.poiSourceRow}
                >
                  <Feather name="database" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.poiSourceText, { color: colors.mutedForeground }]}>
                    {selectedPoi.source}
                    {formatQualityDate(selectedPoi.checkedAt, language)
                      ? ` · ${qualityT.checkedAt(formatQualityDate(selectedPoi.checkedAt, language)!)}` : ""}
                  </Text>
                  {!!selectedPoi.sourceUrl && <Feather name="external-link" size={12} color={colors.accent} />}
                </Pressable>
              )}
            </Glass>
          </Pressable>
        </Pressable>
      )}

      {/* Partner-Detail — ausserhalb ScrollView damit absoluteFill den ganzen Screen abdeckt */}
      {!!selectedPartner && (
        <Pressable
          style={[StyleSheet.absoluteFill, styles.poiModalBackdrop]}
          onPress={() => setSelectedPartner(null)}
        >
          <Pressable style={{ width: "100%" }} onPress={(e) => e.stopPropagation()}>
            <Glass overlayColor={poiOverlay}>
              {!!selectedPartner.fotoUrl && selectedPartner.paket !== "basic" && (
                <ExpoImage
                  source={{ uri: selectedPartner.fotoUrl }}
                  style={styles.poiModalImage}
                  contentFit="cover"
                />
              )}
              <View style={styles.poiRow}>
                <Feather
                  name={(PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ?? PARTNER_KAT_DEFAULT).icon}
                  size={18}
                  color={colors.accent}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: colors.accent, fontFamily: fonts.bodyBold, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {(PARTNER_KATEGORIE[selectedPartner.kategorie ?? ""] ?? PARTNER_KAT_DEFAULT).label}
                  </Text>
                  <Text style={[styles.poiTitle, { color: colors.foreground }]}>
                    {selectedPartner.name}
                  </Text>
                </View>
                <CloseButton
                  accessibilityLabel={ts.close}
                  onPress={() => setSelectedPartner(null)}
                />
              </View>

              {selectedPartner.istOffen != null && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedPartner.istOffen ? "#22C55E" : "#EF4444" }} />
                  <Text style={{ fontSize: 13, color: selectedPartner.istOffen ? "#22C55E" : "#EF4444", fontFamily: fonts.bodyBold }}>
                    {selectedPartner.istOffen ? "Geöffnet" : "Geschlossen"}
                  </Text>
                  {(() => {
                    const info = formatPartnerOeffnungszeit(selectedPartner, language ?? "de");
                    return info ? (
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{"· "}{info}</Text>
                    ) : null;
                  })()}
                </View>
              )}

              {!!selectedPartner.beschreibung && selectedPartner.paket !== "basic" && (
                <Text style={[styles.poiSummary, { color: colors.foreground, marginTop: 10 }]}>
                  {selectedPartner.beschreibung}
                </Text>
              )}

              {(selectedPartner.paket === "premium" || selectedPartner.paket === "standard") && (
                <>
                  {!!selectedPartner.telefon && (
                    <Pressable onPress={() => Linking.openURL(`tel:${selectedPartner.telefon}`)} style={{ marginTop: 12 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Feather name="phone" size={16} color={colors.accent} />
                        <Text style={{ color: colors.accent, fontSize: 16 }}>{selectedPartner.telefon}</Text>
                      </View>
                    </Pressable>
                  )}
                  {(!!selectedPartner.reservierungUrl || !!selectedPartner.websiteUrl) && (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      {!!selectedPartner.reservierungUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(selectedPartner.reservierungUrl!)}
                          style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 }}
                        >
                          <Text style={{ color: "#fff", fontSize: 14, fontFamily: fonts.bodyBold }}>Reservieren</Text>
                        </Pressable>
                      )}
                      {!!selectedPartner.websiteUrl && (
                        <Pressable
                          onPress={() => Linking.openURL(selectedPartner.websiteUrl!)}
                          style={{ borderWidth: 1.5, borderColor: colors.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9 }}
                        >
                          <Text style={{ color: colors.accent, fontSize: 14 }}>Website</Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                </>
              )}

              {!!selectedPartner.angebot && (
                <View style={{ backgroundColor: colors.accent + "20", borderRadius: 8, padding: 12, marginTop: 14, borderLeftWidth: 3, borderLeftColor: colors.accent }}>
                  <Text style={{ fontSize: 11, color: colors.accent, fontFamily: fonts.bodyBold, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    SagaTrail-Angebot
                  </Text>
                  <Text style={[styles.poiSummary, { color: colors.foreground, marginTop: 0 }]}>
                    {selectedPartner.angebot}
                  </Text>
                </View>
              )}
            </Glass>
          </Pressable>
        </Pressable>
      )}
    </Background>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  const colors = useColors();
  return (
    <View style={[styles.stat, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
      <View style={styles.statValRow}>
        <Text style={[styles.statVal, { color: colors.foreground }]}>{value}</Text>
        {unit ? <Text style={[styles.statUnit, { color: colors.accent }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

function StatTile({ icon, label, value, unit }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string; value: string; unit: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.statTile, { borderColor: colors.glassBorder, backgroundColor: colors.glassBg }]}>
      <Feather name={icon} size={14} color={colors.accent} style={{ marginBottom: 4 }} />
      <Text style={[styles.statTileVal, { color: colors.foreground }]}>{value}
        {unit ? <Text style={[styles.statTileUnit, { color: colors.accent }]}>{" "}{unit}</Text> : null}
      </Text>
      <Text style={[styles.statTileLabel, { color: colors.mutedForeground }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function ReadinessRow({
  icon,
  label,
  value,
  positive,
}: {
  icon: FeatherIconName;
  label: string;
  value: string;
  positive: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.readinessRow}>
      <Feather name={icon} size={15} color={positive ? colors.accent : colors.mutedForeground} />
      <Text style={[styles.readinessRowLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.readinessRowValue, { color: positive ? colors.accent : colors.foreground }]}>
        {value}
      </Text>
    </View>
  );
}

function CheckRow({
  icon,
  label,
  value,
  ok,
  warn,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  ok?: boolean;
  warn?: boolean;
}) {
  const colors = useColors();
  const tint = warn ? colors.accent : colors.mutedForeground;
  return (
    <View style={styles.checkRow}>
      <Feather name={icon} size={16} color={tint} />
      <Text style={[styles.checkLabel, { color: colors.foreground }]}>{label}</Text>
      <Text style={[styles.checkValue, { color: colors.mutedForeground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  poiModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(16,24,26,0.7)",
    justifyContent: "center",
    padding: 16,
    zIndex: 50,
  },
  poiRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  poiTitle: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 2 },
  poiSummary: { fontFamily: fonts.story, fontSize: 18, marginTop: 8, lineHeight: 28 },
  poiSourceRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  poiSourceText: { flex: 1, fontFamily: fonts.mono, fontSize: 11, lineHeight: 16 },
  qualityCard: { marginTop: 14, borderWidth: 1, borderRadius: 14, padding: 14 },
  qualityHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  qualityTitle: { fontFamily: fonts.bodyBold, fontSize: 14 },
  qualityStatus: { fontFamily: fonts.mono, fontSize: 11, marginTop: 6, lineHeight: 16 },
  qualitySources: { marginTop: 10, gap: 7 },
  qualitySourceRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  qualitySourceKind: { width: 74, fontFamily: fonts.mono, fontSize: 10, textTransform: "uppercase" },
  qualitySourceLabel: { flex: 1, fontFamily: fonts.body, fontSize: 12 },
  poiModalImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  retryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  retryChipText: { fontFamily: fonts.bodyBold, fontSize: 12 },
  routeName: { fontFamily: fonts.titleBold, fontSize: 26, marginTop: 18 },
  forSaga: { fontFamily: fonts.story, fontSize: 14, marginTop: 2 },
  // ── Hero photo ──────────────────────────────────────────────────────
  heroCard: {
    marginTop: 14,
    marginHorizontal: -20,
    height: 220,
    overflow: "hidden",
  },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  heroRegionRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  heroDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#cc0000" },
  heroRegion: { fontFamily: fonts.mono, fontSize: 10, color: "#FFFFFF", letterSpacing: 1.5 },
  heroTitle: { fontFamily: fonts.titleBold, fontSize: 26, color: "#fff", lineHeight: 30 },
  heroTerrain: { fontFamily: fonts.story, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  // ── Stats 5-Spalten ─────────────────────────────────────────────────
  statsGrid: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  routeThemes: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  themeEvidenceNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginTop: 12,
  },
  themeEvidenceNoticeText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },
  routeThemeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  routeThemeText: { fontFamily: fonts.bodyBold, fontSize: 11 },
  meetupCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
  },
  meetupCtaTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  meetupCtaText: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
  statTile: {
    ...GLAS_3D,
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statTileVal: { fontFamily: fonts.monoBold, fontSize: 14, textAlign: "center" },
  statTileUnit: { fontFamily: fonts.mono, fontSize: 10 },
  statTileLabel: { fontFamily: fonts.mono, fontSize: 8, letterSpacing: 0.8, marginTop: 2, textAlign: "center" },
  readinessCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },
  readinessHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  readinessIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  readinessTitle: { fontFamily: fonts.bodyBold, fontSize: 16 },
  readinessHint: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 3 },
  readinessRows: { borderTopWidth: 1, marginTop: 14, paddingTop: 7 },
  readinessRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  readinessRowLabel: { fontFamily: fonts.body, fontSize: 12, flex: 1 },
  readinessRowValue: { fontFamily: fonts.bodyBold, fontSize: 12, textAlign: "right" },
  // ── Saga-Teaser ─────────────────────────────────────────────────────
  sagaTeaserCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sagaTeaserEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sagaTeaserEyebrow: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 1.2, marginBottom: 3 },
  sagaTeaserTitle: { fontFamily: fonts.bodyBold, fontSize: 14, lineHeight: 18 },
  elevChartCard: {
    ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
  },
  elevChartTitle: { fontFamily: fonts.bodyBold, fontSize: 14, marginBottom: 10 },
  virtualRouteCard: {
    ...GLAS_3D,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  virtualRouteIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  virtualRouteEyebrow: {
    fontFamily: fonts.monoBold,
    fontSize: 9,
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  virtualRouteTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    lineHeight: 19,
  },
  virtualRouteSubtitle: {
    fontFamily: fonts.body,
    fontSize: 12,
    marginTop: 2,
  },
  stat: { ...GLAS_3D,
    width: "47.5%",
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  statLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1 },
  statValRow: { flexDirection: "row", alignItems: "baseline", gap: 4, marginTop: 4 },
  statVal: { fontFamily: fonts.monoBold, fontSize: 26 },
  statUnit: { fontFamily: fonts.mono, fontSize: 13 },
  blockTitle: { fontFamily: fonts.titleBold, fontSize: 20, marginBottom: 12 },
  downloadCard: { ...GLAS_3D,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  downloadHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  downloadTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  downloadHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 6 },
  downloadInfoBox: { marginTop: 12, gap: 5 },
  downloadInfoRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 7 },
  downloadInfoItem: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, flex: 1 },
  downloadInfoTimeRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 5, marginTop: 4 },
  downloadInfoTime: { fontFamily: fonts.body, fontSize: 11, lineHeight: 16, flex: 1, fontStyle: "italic" as const },
  downloadProgressText: { fontFamily: fonts.mono, fontSize: 13 },
  dlBarTrack: { height: 5, borderRadius: 3, overflow: "hidden" as const },
  dlBarFill: { height: 5, borderRadius: 3 },
  dlPhaseRow: { flexDirection: "row" as const, justifyContent: "space-between" as const },
  dlPhaseStep: { alignItems: "center" as const, flex: 1, gap: 4 },
  dlPhaseDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dlPhaseLabel: { fontFamily: fonts.mono, fontSize: 10, textAlign: "center" as const },
  checkCard: { ...GLAS_3D, borderWidth: 1, borderRadius: 16, padding: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  checkLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, flex: 1 },
  checkValue: { fontFamily: fonts.mono, fontSize: 13 },
  checkNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, marginTop: 8, fontStyle: "italic" },
  conditionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  conditionEmoji: { fontSize: 20, lineHeight: 24 },
  conditionLabel: { fontFamily: fonts.bodyMedium, fontSize: 14 },
  conditionNote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, marginTop: 2 },
  conditionTime: { fontFamily: fonts.mono, fontSize: 11, marginTop: 2 },
  rueckreiseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  rueckreiseText: { fontFamily: fonts.bodyBold, fontSize: 13 },
  energyCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  energyTitle: { fontFamily: fonts.bodyBold, fontSize: 15 },
  energyHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginTop: 2 },
  sagaHint: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  sagaCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sagaCanton: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 1.2 },
  sagaTitle: { fontFamily: fonts.titleBold, fontSize: 19, marginTop: 4 },
  sagaMood: { fontFamily: fonts.story, fontSize: 13, marginTop: 3 },
  sagaLoadingText: { fontFamily: fonts.mono, fontSize: 13 },
  pickerCategoryLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 6,
  },
  localisationNote: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    fontStyle: "italic",
  },
  similarRouteCard: { ...GLAS_3D,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  similarRouteName: { fontFamily: fonts.bodyBold, fontSize: 15 },
  similarRouteMeta: { fontFamily: fonts.mono, fontSize: 11, marginTop: 3 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  actionChipText: { fontFamily: fonts.bodyBold, fontSize: 13 },
});
