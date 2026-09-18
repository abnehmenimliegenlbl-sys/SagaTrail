fficial SchweizMobil local-route rows that have no geometry.
 * The extractor returns only validated WGS84 points. Existing route metadata
 * (name, saga, photos, etc.) is deliberately preserved.
 */
export async function restoreMissingSchweizMobilGeometries(log: Logger): Promise<{
  expected: number;
  restored: string[];
  skipped: { id: string; reason: string }[];
  source: string;
}> {
  const official = await loadOfficialSchweizMobilGeometries(log);
  const byRef = new Map(official.map((route) => [route.ref, route]));
  const ids = MISSING_SCHWEIZMOBIL_LWN_REFS.map((ref) => `schweizmobil-lwn-${ref}`);
  const existing = await db
    .select({
      id: externalRoutesTable.id,
      distanceKm: externalRoutesTable.distanceKm,
      distanceTagKm: externalRoutesTable.distanceTagKm,
      ascentM: externalRoutesTable.ascentM,
      geometry: externalRoutesTable.geometry,
      geometryVersion: externalRoutesTable.geometryVersion,
    })
    .from(externalRoutesTable)
    .where(inArray(externalRoutesTable.id, ids));
  const existingById = new Map(existing.map((row) => [row.id, row]));
  const restored: string[] = [];
  const skipped: { id: string; reason: string }[] = [];

  for (const ref of MISSING_SCHWEIZMOBIL_LWN_REFS) {
    const id = `schweizmobil-lwn-${ref}`;
    const route = byRef.get(ref);
    const row = existingById.get(id);
    if (!route) {
      skipped.push({ id, reason: "official route missing from GeoPackage" });
      continue;
    }
    if (!row) {
      skipped.push({ id, reason: "database row missing" });
      continue;
    }
    if (row.geometryVersion >= GEOMETRY_VERSION && isPlausibleOfficialGeometry(row.geometry)) {
      skipped.push({ id, reason: "geometry already restored" });
      continue;
    }
    if (!isPlausibleOfficialGeometry(route.points)) {
      skipped.push({ id, reason: "official geometry failed validation" });
      continue;
    }

    // Keep the two distance meanings separate: distanceKm is measured from
    // the stored geometry, while distanceTagKm is the official label value.
    const distanceKm = pathDistanceKm(route.points.map(([lat, lng]) => ({ lat, lng })));
    const start = route.points[0]!;
    await db
      .update(externalRoutesTable)
      .set({
        geometry: route.points as any,
        geometryVersion: GEOMETRY_VERSION,
        distanceKm: Math.round(distanceKm * 10) / 10,
        distanceTagKm: route.officialDistanceKm ?? row.distanceTagKm,
        lat: start[0],
        lng: start[1],
        fetchedAt: new Date(),
        source: "SchweizMobil Open Data · swisstopo",
      })
      .where(eq(externalRoutesTable.id, id))
      .execute();
    restored.push(id);
  }

  log.info(
    { expected: ids.length, restored: restored.length, skipped: skipped.length },
    "SchweizMobil-Geometrien wiederhergestellt",
  );
  return {
    expected: ids.length,
    restored,
    skipped,
    source: SCHWEIZMOBIL_WANDERLAND_SOURCE,
  };
}

function isFresh(row: ExternalRouteRow): boolean {
  return (
    row.geometryVersion >= GEOMETRY_VERSION &&
    Date.now() - row.fetchedAt.getTime() < CACHE_TTL_MS
  );
}

/** Mapping Kanton-Name → 2-stelliges Kürzel (für K-Routen-Label "K4 AG Name"). */
const CANTON_ABBREVIATIONS: Record<string, string> = {
  "Aargau": "AG", "Appenzell Ausserrhoden": "AR", "Appenzell Innerrhoden": "AI",
  "Basel-Landschaft": "BL", "Basel-Stadt": "BS", "Bern": "BE",
  "Freiburg": "FR", "Fribourg": "FR", "Genf": "GE", "Genève": "GE",
  "Glarus": "GL", "Graubünden": "GR", "Jura": "JU", "Luzern": "LU",
  "Nidwalden": "NW", "Obwalden": "OW", "Schaffhausen": "SH", "Schwyz": "SZ",
  "Solothurn": "SO", "St. Gallen": "SG", "Tessin": "TI", "Ticino": "TI",
  "Thurgau": "TG", "Uri": "UR", "Waadt": "VD", "Vaud": "VD",
  "Wallis": "VS", "Valais": "VS", "Zug": "ZG", "Zürich": "ZH",
};

/**
 * Nummeriert alle K-Routen eines Kantons neu durch: K1 AG, K2 AG, K3 AG …
 * Sortierung nach OSM-ID (stabil — gleiche Route bekommt immer die gleiche Nummer).
 * Wird nach enrichAndStore aufgerufen damit neue Routen korrekt eingereiht werden.
 */
async function renumberKRoutes(canton: string, log: Logger): Promise<void> {
  const abbrev = CANTON_ABBREVIATIONS[canton];
  if (!abbrev) return;

  const kRoutes = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        eq(externalRoutesTable.canton, canton),
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
        sql`${externalRoutesTable.name} ~ '^K[0-9]+'`,
      ),
    )
    .orderBy(sql`CAST(SPLIT_PART(${externalRoutesTable.id}, '-', 2) AS BIGINT)`);

  for (let i = 0; i < kRoutes.length; i++) {
    const row = kRoutes[i];
    const baseName = row.name.replace(/^K\d+\s+(?:[A-Z]{2}\s+)?/, "");
    const newName = `K${i + 1} ${abbrev} ${baseName}`;
    if (newName === row.name) continue;
    await db
      .update(externalRoutesTable)
      .set({ name: newName })
      .where(eq(externalRoutesTable.id, row.id))
      .execute()
      .catch((err) => log.warn({ err, id: row.id }, "renumberKRoutes: Update fehlgeschlagen"));
  }
  log.info({ canton, count: kRoutes.length, abbrev }, "K-Routen neu nummeriert");
}

export async function loadCachedRoutes(canton: string): Promise<ExternalRouteRow[]> {
  // Nur primärer Kanton (Startpunkt) — cantons[] ist inaktiv (one canton per route).
  return db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.canton, canton));
}

/**
 * Laedt die Geometrie der ausgewaehlten Kandidaten nach, berechnet die exakte
 * Laenge, reichert mit swisstopo-Hoehen + SAC-Grad an und schreibt die Treffer
 * in den Cache. Kandidaten ausserhalb des plausiblen Laengenfensters
 * (MIN_KM..MAX_KM) entfallen.
 */
export async function enrichAndStore(
  canton: string,
  osmIds: number[],
  log: Logger,
  fetchOpts?: { timeoutMs?: number; batchSize?: number; pauseMs?: number; skipPhotos?: boolean },
): Promise<void> {
  const raw = await fetchRouteGeometries(osmIds, log, fetchOpts);
  // Laengenfenster gegen die massgebliche Distanz pruefen: amtlicher Tag-Wert
  // (falls vorhanden) vor berechneter Laenge — sonst fallen in OSM unvollstaendig
  // erfasste Routen faelschlich unter MIN_KM.
  const withDist = raw.map((r) => ({ r, distanceKm: r.distanceTagKm ?? pathDistanceKm(r.points) }));
  // Nur untere Schranke (< 5 km = kein echter Wanderweg). Keine obere Schranke
  // mehr — nwn/rwn-Langstreckenrouten (z.B. 323 km Via Gottardo) wären sonst
  // fälschlicherweise aus der DB gelöscht worden.
  const prepared = withDist.filter(({ distanceKm }) => distanceKm >= MIN_KM);

  // Nur wirklich zu kurze Routen löschen.
  const zuLoeschen = withDist
    .filter(({ distanceKm }) => distanceKm < MIN_KM)
    .map(({ r }) => `osm-${r.osmId}`);
  if (zuLoeschen.length > 0) {
    await db.delete(externalRoutesTable)
      .where(sql`${externalRoutesTable.id} = ANY(${zuLoeschen})`)
      .execute()
      .catch((err) => log.warn({ err, anzahl: zuLoeschen.length }, "enrichAndStore: Kurzrouten-Cleanup fehlgeschlagen"));
    log.info({ anzahl: zuLoeschen.length }, "enrichAndStore: zu kurze Routen aus DB entfernt");
  }

  // Startpunkt-Filter: nur Routen behalten deren erster Punkt im Ziel-Kanton
  // liegt. Verhindert dass Durchgangsrouten (z.B. Via Gottardo via AG) im
  // falschen Kanton landen. Geocoding sequentiell wegen Nominatim-Rate-Limit.
  // Bei unklarem Ergebnis (null) wird die Route nicht verworfen.
  const startKantonGeprüft: typeof prepared = [];
  for (const item of prepared) {
    const start = item.r.points[0];
    if (!start) { startKantonGeprüft.push(item); continue; }
    await new Promise<void>((r) => setTimeout(r, 1_100));
    const geo = await reverseGeocode(start.lat, start.lng, log);
    if (!geo.canton || geo.canton === canton) {
      startKantonGeprüft.push(item);
    } else {
      log.debug(
        { id: `osm-${item.r.osmId}`, name: item.r.name, startKanton: geo.canton, zielKanton: canton },
        "enrichAndStore: Route startet in anderem Kanton — übersprungen",
      );
    }
  }
  log.info(
    { gesamt: prepared.length, behalten: startKantonGeprüft.length, verworfen: prepared.length - startKantonGeprüft.length },
    "enrichAndStore: Startpunkt-Filter abgeschlossen",
  );

  // Lookup: bestehende 2-stellige (rwn) Routen im Kanton → Basis-Name → ref-Nummer.
  // Wird benutzt damit rwn-Etappen ohne eigenes ref-Tag (z.B. Sardona Etappe 1–6)
  // den korrekten 2-stelligen ref ihrer Elternroute erhalten statt einer K-Nummer.
  const rwnRefLookup = new Map<string, number>();
  {
    const existingRwn = await db
      .select({ name: externalRoutesTable.name })
      .from(externalRoutesTable)
      .where(
        and(
          eq(externalRoutesTable.canton, canton),
          sql`${externalRoutesTable.name} ~ '^[1-9][0-9] '`,
        ),
      );
    for (const row of existingRwn) {
      const m = row.name.match(/^(\d{2})\s+(.+?)(?:\s+Etappe\s|\s+-\s|$)/);
      if (m) rwnRefLookup.set(m[2].trim().toLowerCase(), parseInt(m[1], 10));
    }
  }

  const rows = await mapPool(startKantonGeprüft, ELEVATION_CONCURRENCY, async ({ r, distanceKm: computedKm }) => {
    const elevation = await computeElevationStats(r.points, log);
    // Amtliche SchweizMobil-Angaben aus den OSM-Relation-Tags (`distance`/`ascent`)
    // haben Vorrang vor der eigenen Berechnung: bei in OSM unvollständig
    // erfassten Routen (z.B. 831 Rigi Scheidegg, fixme=complete) ist die
    // berechnete Länge sonst viel zu kurz.
    // distanceKm = aus Geometrie berechnet (weisse Kachel, Navigation)
    // distanceTagKm = amtlicher OSM-Tag-Wert (roter Balken Kantonsliste)
    const distanceKm = computedKm;
    const distanceTagKm = r.distanceTagKm != null ? Math.round(r.distanceTagKm * 10) / 10 : null;
    const minutesKm = distanceTagKm ?? distanceKm;
    const ascentM = r.ascentTagM ?? elevation?.ascentM ?? 0;
    const maxElevationM = elevation?.maxElevationM ?? 0;
    // Schwierigkeit: OSM-`sac_scale` normalisieren; fehlt sie, aus dem amtlichen
    // swissTLM3D-Wanderwegnetz ableiten; sonst bleibt sie unbekannt.
    const sacAssessment = assessSac(r.sac, await deriveSacFromSwissTlm3d(r.points, log));
    const sac = sacAssessment.value;
    const start = r.points[0];
    const geometry: [number, number][] = rdpSimplify(r.points, 5, STORED_GEOMETRY_POINTS).map(
      (p: LatLng) => [p.lat, p.lng],
    );
    // Foto überspringen wenn skipPhotos gesetzt — Backfill läuft beim nächsten
    // Server-Start automatisch über loadMissingRoutePhotos().
    const photo = fetchOpts?.skipPhotos
      ? { photoUrl: null, attribution: null }
      : await getCachedRoutePhoto(start.lat, start.lng, log, r.name);
    // OSM-Platzhalter "fixme" (in jeder Schreibweise) bereinigen,
    // inkl. haengender Trennstriche: "Hüttner Brugg - Finstersee - fixme" →
    // "Hüttner Brugg - Finstersee".
    const cleanedName = r.name
      .replace(/\s*[-–—]?\s*\bfixme\b\s*[-–—]?\s*/gi, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/^\s*[-–—]\s*|\s*[-–—]\s*$/g, "")
      .trim();

    // Von-Bis anhängen wenn OSM `from`/`to` gesetzt und noch nicht im Namen enthalten.
    const vonBis = (() => {
      const f = r.from?.trim();
      const t = r.to?.trim();
      if (!f && !t) return "";
      // Nicht doppelt einfügen: prüfen ob Startort schon im Namen steht.
      if (f && cleanedName.includes(f)) return "";
      if (f && t) return ` ${f} - ${t}`;
      if (f) return ` ${f}`;
      return ` - ${t}`;
    })();
    const nameWithVonBis = cleanedName + vonBis;

    // Routenname mit Nummer aufbauen — Kombination aus network-Tag und ref:
    // • nwn/iwn + ref 1–9   → Nationalroute   (1-stellig)
    // • rwn     + ref 10–99 → Regionalroute   (2-stellig)
    // • lwn     + ref 100–999 → Lokalroute    (3-stellig)
    // • alles andere (z.B. lwn+ref=1, kein Netz) → K-Kennung aus OSM-ID
    const refNum = r.ref ? parseInt(r.ref, 10) : NaN;
    const net = (r.network ?? "").toLowerCase();
    const isNwn = net === "nwn" || net === "iwn";
    const isRwn = net === "rwn";
    const isLwn = net === "lwn" || net === "";
    const hasValidRef =
      (isNwn && !isNaN(refNum) && refNum >= 1  && refNum <= 9)   ||
      (isRwn && !isNaN(refNum) && refNum >= 10 && refNum <= 99)  ||
      (isLwn && !isNaN(refNum) && refNum >= 100 && refNum <= 999);
    // rwn ohne eigenes ref: Eltern-ref via Name-Lookup finden
    const derivedRwnRef = (!hasValidRef && isRwn)
      ? rwnRefLookup.get(cleanedName.replace(/\s*[Ee]tappe\s+\d+.*$/, "").replace(/\s*-\s*$/, "").trim().toLowerCase())
      : undefined;
    const routeName = hasValidRef
      ? `${refNum} ${nameWithVonBis}`
      : derivedRwnRef
        ? `${derivedRwnRef} ${nameWithVonBis}`
        : `K${(Math.abs(r.osmId ?? 0) % 900) + 100} ${nameWithVonBis}`;
    return {
      id: r.id,
      sagaId: r.id,
      canton,
      name: routeName,
      ref: r.ref,
      distanceKm: Math.round(distanceKm * 10) / 10,
      distanceTagKm,
      ascentM,
      maxElevationM,
      minutes: estimateMinutes(minutesKm, ascentM),
      sac,
      sacSource: sacAssessment.source,
      terrain: terrainLabel(r.ref, r.network, sac),
      lat: start.lat,
      lng: start.lng,
      geometry,
      geometryVersion: GEOMETRY_VERSION,
      source: "OpenStreetMap · swisstopo",
      featured: false,
      photoUrl: photo.photoUrl,
      photoAttribution: photo.attribution,
    };
  });

  if (rows.length > 0) {
    await db
      .insert(externalRoutesTable)
      .values(rows)
      .onConflictDoUpdate({
        target: externalRoutesTable.id,
        set: {
          // name, ref, route_type, is_etappe werden NIE überschrieben —
          // manuelle Korrekturen (K-Nummerierung, nwn/rwn/lwn/kantonal) bleiben erhalten.
          distanceKm: sql`excluded.distance_km`,
          distanceTagKm: sql`excluded.distance_tag_km`,
          ascentM: sql`excluded.ascent_m`,
          maxElevationM: sql`excluded.max_elevation_m`,
          minutes: sql`excluded.minutes`,
          sac: sql`excluded.sac`,
          sacSource: sql`excluded.sac_source`,
          terrain: sql`excluded.terrain`,
          geometry: sql`excluded.geometry`,
          geometryVersion: sql`excluded.geometry_version`,
          // Foto nur ueberschreiben wenn ein neues da ist — kein COALESCE um
          // veraltete URLs durch aktuellere zu ersetzen, aber NULL nie setzen.
          photoUrl: sql`COALESCE(excluded.photo_url, ${externalRoutesTable.photoUrl})`,
          photoAttribution: sql`COALESCE(excluded.photo_attribution, ${externalRoutesTable.photoAttribution})`,
          fetchedAt: new Date(),
        },
      });
  }

  await db
    .insert(cantonFetchesTable)
    .values({ canton, routeCount: rows.length })
    .onConflictDoUpdate({
      target: cantonFetchesTable.canton,
      set: { routeCount: rows.length, fetchedAt: new Date() },
    });
}

/**
 * Liefert die realen Wanderrouten eines Kantons, distanzbewusst.
 *
 * Ablauf: leichten Kanton-Index holen (gecacht), daraus per Bounding-Box-
 * Vorfilter + Rang die Kandidaten waehlen, fuer noch nicht (frisch) gecachte
 * Kandidaten die Geometrie nachladen und anreichern, dann die frischen Treffer
 * des Kantons zurueckgeben. Der exakte Filter und der Ergebnis-Deckel folgen im
 * Router (`cantons.ts`). `distMax` steuert den Vorfilter, damit in dichten
 * Kantonen auch kurze lokale Routen in die Auswahl gelangen.
 */
// Mindestanzahl frischer DB-Routen, ab der der Overpass-Index-Aufruf
// uebersprungen wird. 50 = erst wenn ein Kanton gut befüllt ist keinen
// neuen OSM-Abruf machen.
const DB_SHORTCUT_MIN = 50;

export async function getCantonRoutes(
  canton: string,
  log: Logger,
  distMax?: number,
  fetchOpts?: { timeoutMs?: number; batchSize?: number; pauseMs?: number; forceRefresh?: boolean; skipPhotos?: boolean },
): Promise<ExternalRouteRow[]> {
  const iso = isoForCanton(canton);
  if (!iso) {
    log.warn({ canton }, "Kein ISO-Code fuer Kanton bekannt");
    return [];
  }

  // DB-First-Shortcut: sind genuegend frische Routen in der DB, Overpass komplett
  // ueberspringen. Das verhindert den langen Cold-Start nach Server-Restart.
  const cached = await loadCachedRoutes(canton);
  const fresh = cached.filter((row) => isFresh(row));
  if (!fetchOpts?.forceRefresh && fresh.length >= DB_SHORTCUT_MIN) {
    log.debug({ canton, count: fresh.length }, "Kanton-Routen aus DB-Cache (Shortcut)");
    return fresh;
  }

  let index: RouteIndexEntry[];
  try {
    index = await getCantonIndex(canton, iso, log, fetchOpts?.timeoutMs);
  } catch (err) {
    // Index nicht ladbar: auf bereits FRISCH gecachte Routen ausweichen, sonst
    // Fehler durchreichen (der Router meldet dann 502 -> UI "Server nicht
    // erreichbar"). Nur veraltete Cache-Zeilen zaehlen nicht als Treffer, sonst
    // wuerde ein Serverausfall faelschlich als "keine Routen" erscheinen.
    if (fresh.length > 0) {
      log.warn({ canton, err }, "Kanton-Index nicht ladbar, nutze Cache");
      return fresh;
    }
    throw err;
  }

  const candidates = selectCandidates(index, distMax);
  const freshIds = new Set(fresh.map((row) => row.id));

  // Routen die bereits als schweizmobil-* gespeichert sind nicht nochmals als
  // osm-* einfügen — globaler Ref-Check über alle Kantone.
  // WICHTIG: placeholder-* absichtlich NICHT schützen — Placeholder sollen
  // ersetzt werden sobald echte OSM-Daten verfügbar sind.
  const candidateRefs = candidates.map((c) => c.ref).filter((r): r is string => !!r);
  const coveredRefs = new Set<string>(
    candidateRefs.length > 0
      ? (
          await db
            .select({ ref: externalRoutesTable.ref })
            .from(externalRoutesTable)
            .where(
              and(
                isNotNull(externalRoutesTable.ref),
                sql`${externalRoutesTable.ref} = ANY(${candidateRefs})`,
                sql`${externalRoutesTable.id} LIKE 'schweizmobil-%'`,
              ),
            )
        )
          .map((r) => r.ref)
          .filter((r): r is string => !!r)
      : [],
  );

  // Bbox-Vorfilter: Kandidaten mit sehr kleiner Bounding-Box können unmöglich
  // ≥ MIN_KM lang sein — Geometrie erst gar nicht holen. Faktor 0.5 weil eine
  // gewundene Route deutlich länger als ihre Bbox-Diagonale sein kann.
  const missing = candidates
    .filter(
      (c) =>
        !freshIds.has(`osm-${c.osmId}`) &&
        !(c.ref && coveredRefs.has(c.ref)) &&
        c.bboxDiagKm >= MIN_KM * 0.5,
    )
    .map((c) => c.osmId);

  if (missing.length > 0) {
    try {
      await enrichAndStore(canton, missing, log, fetchOpts);
    } catch (err) {
      // Anreicherung fehlgeschlagen: vorhandene frische Treffer trotzdem liefern.
      if (freshIds.size > 0) {
        log.warn({ canton, err }, "Geometrie-Anreicherung fehlgeschlagen, nutze Cache");
        return fresh;
      }
      throw err;
    }
    // Neue Routen eingereiht → K-Nummern für diesen Kanton neu vergeben.
    await renumberKRoutes(canton, log).catch((err) =>
      log.warn({ err, canton }, "renumberKRoutes fehlgeschlagen"),
    );
    // Placeholder bereinigen: falls eine neue osm-* Route dieselbe ref hat wie
    // ein bestehender Placeholder, wird der Placeholder gelöscht — er hat seinen
    // Zweck erfüllt. schweizmobil-* bleiben unberührt.
    await db
      .delete(externalRoutesTable)
      .where(
        and(
          sql`${externalRoutesTable.id} LIKE 'placeholder-%'`,
          eq(externalRoutesTable.canton, canton),
          isNotNull(externalRoutesTable.ref),
          sql`${externalRoutesTable.ref} IN (
            SELECT ref FROM ${externalRoutesTable}
            WHERE id LIKE 'osm-%'
              AND canton = ${canton}
              AND ref IS NOT NULL
          )`,
        ),
      )
      .execute()
      .then(({ rowCount }) => {
        if ((rowCount ?? 0) > 0)
          log.info({ canton, rowCount }, "Placeholder durch echte OSM-Routen ersetzt und gelöscht");
      })
      .catch((err) => log.warn({ err, canton }, "Placeholder-Cleanup fehlgeschlagen"));
  }

  const stored = await loadCachedRoutes(canton);
  return stored.filter((row) => isFresh(row));
}

const WARM_STAGGER_MS = 4000;

/**
 * Waermt den Routen-Cache aller Kantone im Hintergrund vor (nach Serverstart).
 *
 * Die erste Routensuche eines Nutzers in einem noch nicht gecachten Kanton
 * dauert ueber Overpass typischerweise 15-25s (Index + Geometrie), was am
 * Client wie "Server nicht erreichbar" wirkt, wenn eine zwischengeschaltete
 * Verbindung frueher abbricht. Indem wir alle Kantone der Reihe nach (nicht
 * parallel, um Overpass nicht zu ueberlasten) direkt nach dem Start
 * durchlaufen, landen die Ergebnisse im DB-Cache, bevor echte Nutzer suchen -
 * spaetere Anfragen sind dann Cache-Treffer (Millisekunden statt Sekunden).
 * Laeuft komplett im Hintergrund; Fehler pro Kanton werden nur geloggt, damit
 * ein einzelner haengender Kanton den Start nicht blockiert oder die anderen
 * verhindert.
 */
let warmAllLaeuft = false;

export async function warmAllCantonCaches(log: Logger): Promise<void> {
  // Debounce: Catch-up und Artefakt-Fix koennen beide beim Start einen
  // Warm-all ausloesen — nie zwei parallel laufen lassen (Overpass-Last).
  if (warmAllLaeuft) {
    log.info("Warm-all laeuft bereits — zweiter Aufruf uebersprungen");
    return;
  }
  warmAllLaeuft = true;
  try {
    await warmAllCantonCachesInner(log);
  } finally {
    warmAllLaeuft = false;
  }
}

async function warmAllCantonCachesInner(log: Logger): Promise<void> {
  const cantons = Object.keys(CANTON_ISO);
  for (const canton of cantons) {
    // Kanton überspringen wenn bereits genug frische Routen in DB —
    // verhindert unnötige Overpass-Last beim Serverneustart.
    const cached = await loadCachedRoutes(canton);
    const fresh = cached.filter((row) => isFresh(row));
    if (fresh.length >= DB_SHORTCUT_MIN) {
      log.debug({ canton, count: fresh.length }, "Kanton-Cache aktuell – Vorwaermung übersprungen");
      continue;
    }
    try {
      const routes = await getCantonRoutes(canton, log);
      log.info({ canton, count: routes.length }, "Kanton-Cache vorgewaermt");
    } catch (err) {
      log.warn({ canton, err }, "Kanton-Cache-Vorwaermung fehlgeschlagen");
    }
    await new Promise((resolve) => setTimeout(resolve, WARM_STAGGER_MS));
  }
}

/** Millisekunden bis zur nächsten 02:00 Uhr MEZ/MESZ (Europe/Zurich). */
function millisUntilNextMezHour(hour: number): number {
  const now = new Date();
  // Zurich-Wanduhr als "UTC-Fake" parsen: toLocaleString gibt die lokale Uhrzeit
  // in Zürich zurück, new Date() interpretiert sie als UTC → getTime() ist falsch
  // absolut, aber getHours/getDate stimmen mit der Zürich-Wanduhr überein.
  const zurichWall = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Zurich" }));
  const offsetMs = now.getTime() - zurichWall.getTime(); // UTC-Offset in ms (negativ im Sommer)
  const target = new Date(zurichWall);
  target.setHours(hour, 0, 0, 0);
  if (target <= zurichWall) target.setDate(target.getDate() + 1);
  return target.getTime() + offsetMs - now.getTime();
}

function millisUntilNext2amMez(): number {
  return millisUntilNextMezHour(2);
}

/**
 * Taeglich-Kanton-Sync: jeden Tag um 02:00 UTC wird ein Kanton reihum
 * (stabiler Index = Tag-der-Epoche mod 26) frisch aus Waymarked Trails +
 * Overpass geladen und inkl. Fotos in external_routes geschrieben.
 * Nach 26 Tagen ist jeder Kanton einmal aktualisiert worden.
 * Laeuft komplett im Hintergrund; Fehler werden nur geloggt.
 */
export function startDailyCantonSync(): void {
  const cantons = Object.keys(CANTON_ISO);
  const log = rootLogger.child({ cron: "dailyCantonSync" });

  const runSync = async () => {
    const dayIndex = Math.floor(Date.now() / 86_400_000) % cantons.length;
    const canton = cantons[dayIndex]!;
    log.info({ canton, dayIndex }, "Taeglich-Kanton-Sync gestartet");
    try {
      // getCantonRoutes vergleicht bereits gecachte mit neuen Kandidaten und
      // enrichAndStore holt nur fehlende oder abgelaufene Eintraege nach.
      const routes = await getCantonRoutes(canton, log);
      log.info({ canton, count: routes.length }, "Taeglich-Kanton-Sync abgeschlossen");
      try {
        const themeResult = await refreshCantonRouteThemes(routes, log);
        log.info(
          { canton, routeCount: routes.length, ...themeResult },
          "Taeglicher POI-Themen-Sync abgeschlossen",
        );
      } catch (themeErr) {
        log.warn(
          { canton, err: themeErr },
          "Taeglicher POI-Themen-Sync fehlgeschlagen",
        );
      }
    } catch (err) {
      log.warn({ canton, err }, "Taeglich-Kanton-Sync fehlgeschlagen");
    }
  };

  const scheduleNext = () => {
    const delay = millisUntilNext2amMez();
    log.info({ inMinutes: Math.round(delay / 60_000) }, "Naechster Kanton-Sync geplant");
    setTimeout(() => {
      void runSync();
      setInterval(() => void runSync(), 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}

/**
 * Taeglicher Abgleich der offiziellen SchweizMobil-Handicap-Klassifikation.
 * Läuft nach dem Kantons-Sync um 03:00 Uhr Europe/Zurich und schreibt nur
 * exakte Ref-Zuordnungen; unbekannte lokale Routen bleiben unverändert.
 */
export function startDailySchweizMobilHandicapSync(): void {
  const log = rootLogger.child({ cron: "dailySchweizMobilHandicapSync" });

  const runSync = async () => {
    try {
      const result = await syncOfficialSchweizMobilHandicap(log);
      log.info(result, "Taeglicher SchweizMobil-Handicap-Sync abgeschlossen");
    } catch (err) {
      log.warn({ err }, "Taeglicher SchweizMobil-Handicap-Sync fehlgeschlagen");
    }
  };

  const scheduleNext = () => {
    const delay = millisUntilNextMezHour(3);
    log.info({ inMinutes: Math.round(delay / 60_000) }, "Naechster SchweizMobil-Handicap-Sync geplant");
    setTimeout(() => {
      void runSync();
      setInterval(() => void runSync(), 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}

function nearestOf(
  pool: CatalogSagaRow[],
  lat: number,
  lng: number,
): CatalogSagaRow | null {
  let best: CatalogSagaRow | null = null;
  let bestD = Infinity;
  for (const s of pool) {
    const d = haversineM({ lat, lng }, { lat: s.lat as number, lng: s.lng as number });
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

/**
 * Baut aus einer live geladenen Wikipedia-Zusammenfassung eine
 * katalogkompatible Sage (nicht persistiert). Dient als Zwischenstufe der
 * Zuordnung, wenn im Kanton der Route keine kuratierte Sage liegt.
 */
function sagaFromWikiSummary(
  canton: string,
  wiki: WikiSummary,
  lat: number,
  lng: number,
): CatalogSagaRow {
  return {
    id: `wiki-${canton.toLowerCase().replace(/[^a-z]+/g, "-")}`,
    title: wiki.title,
    canton,
    coreMotif: "Regionale Ueberlieferung",
    bildmotiv: null,
    mood: "unbekannt",
    summary: wiki.extract,
    summaries: { de: { text: wiki.extract, reviewEmpfohlen: false } },
    altersstufenHinweis: null,
    quelle: {
      autor: "Wikipedia-Autoren",
      werk: wiki.title,
      jahr: String(new Date().getFullYear()),
      fundstelleUrl: wiki.url,
    },
    source: "Wikipedia (CC BY-SA)",
    lat,
    lng,
    ortName: null,
    koordinatenSicherheit: "ungefaehr",
    isAnchorPlace: false,
    fotoUrl: null,
    fotoAttribution: null,
  } as CatalogSagaRow;
}

/**
 * Findet die Sage zu einer Position in drei Stufen (bestaetigte Reihenfolge):
 * (1) kuratierte Sage im gleichen Kanton, (2) live von Wikipedia geladene
 * Kantonssage, falls im Kanton keine kuratierte Sage liegt, (3) kantons-
 * uebergreifend die naechstgelegene kuratierte Sage als letzter Rueckfall.
 */
async function findNearestCuratedSaga(
  canton: string,
  lat: number,
  lng: number,
  log: Logger,
): Promise<CatalogSagaRow | null> {
  const sagas = await db.select().from(catalogSagasTable);
  const located = sagas.filter((s) => s.lat != null && s.lng != null);
  if (located.length === 0) return null;

  const sameCanton = located.filter((s) => s.canton === canton);
  if (sameCanton.length > 0) return nearestOf(sameCanton, lat, lng);

  const wiki = await searchCantonLegend(canton, log);
  if (wiki) return sagaFromWikiSummary(canton, wiki, lat, lng);

  return nearestOf(located, lat, lng);
}

const PHOTO_FILL_STAGGER_MS = 3000;

/**
 * Holt fehlende Fotos fuer alle gecachten Routen im Hintergrund nach.
 * Laeuft einmalig nach dem Kanton-Warmup; Fehler pro Route werden nur geloggt.
 * Stagger 3s zwischen Requests damit Wikimedia Commons nicht ueberfordert wird.
 */
export async function fillMissingRoutePhotos(log: Logger): Promise<void> {
  const missing = await db
    .select()
    .from(externalRoutesTable)
    .where(and(isNull(externalRoutesTable.photoUrl), sql`lat IS NOT NULL`));

  log.info({ count: missing.length }, "Routen ohne Foto gefunden – starte Nachladen");

  for (const route of missing) {
    if (route.lat == null || route.lng == null) continue;
    try {
      const foto = await getCachedRoutePhoto(route.lat, route.lng, log, route.name ?? undefined);
      if (foto.photoUrl) {
        await db
          .update(externalRoutesTable)
          .set({ photoUrl: foto.photoUrl, photoAttribution: foto.attribution })
          .where(and(eq(externalRoutesTable.id, route.id), isNull(externalRoutesTable.photoUrl)))
          .execute();
        log.debug({ routeId: route.id }, "Route-Foto nachgeladen");
      }
    } catch (err) {
      log.warn({ err, routeId: route.id }, "Route-Foto-Nachladen fehlgeschlagen");
    }
    await new Promise((resolve) => setTimeout(resolve, PHOTO_FILL_STAGGER_MS));
  }

  log.info({ count: missing.length }, "Routen-Foto-Nachladen abgeschlossen");
}

/**
 * Prueft alle v3-Routen in der DB auf zwei Artefakt-Typen aus fehlerhaftem
 * OSM-Stitching:
 *   1. Luecken > 500 m (gerade Phantomlinien quer durchs Gelaende)
 *   2. Zickzack-Knicke: >= 2 Richtungsumkehrungen > 150 Grad zwischen
 *      Segmenten > 15 m (falsch ausgerichtete Wegstuecke; einzelne scharfe
 *      Kehren koennen echte Serpentinen sein und bleiben unangetastet)
 * Kaputte Routen werden auf geometry_version = 1 zurueckgesetzt, damit der
 * naechste Warm-all sie mit dem geordneten Stitching neu aufbaut. Gibt die
 * Anzahl der markierten Routen zurueck.
 *
 * Wird einmalig beim Server-Start aufgerufen. Sobald alle Routen korrekt
 * sind, findet die Funktion nichts mehr und kehrt sofort zurueck (O(n) Scan,
 * n = Anzahl v3-Routen).
 */
export async function fixArtefaktRouten(log: Logger): Promise<number> {
  const LUECKE_M = 500;
  const KNICK_GRAD = 150;
  const KNICK_MIN_SEGMENT_M = 15;
  const KNICK_MAX_OK = 1; // 1 scharfe Kehre kann echt sein (Serpentine)

  const rows = await db
    .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry, canton: externalRoutesTable.canton })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.geometryVersion, 3));

  const kompass = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x = Math.sin(dLng) * Math.cos(lat2);
    const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
  };

  const kaputt: string[] = [];
  for (const row of rows) {
    const geom = row.geometry as [number, number][] | null;
    if (!geom || geom.length < 2) continue;
    const pts = geom.map(([lat, lng]) => ({ lat: lat!, lng: lng! }));

    let defekt = false;
    let knicke = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = haversineM(pts[i - 1]!, pts[i]!);
      if (d > LUECKE_M) {
        defekt = true;
        break;
      }
      // Knick-Check am Punkt i (braucht Nachfolger)
      if (i < pts.length - 1 && d > KNICK_MIN_SEGMENT_M) {
        const d2 = haversineM(pts[i]!, pts[i + 1]!);
        if (d2 > KNICK_MIN_SEGMENT_M) {
          let diff = Math.abs(kompass(pts[i]!, pts[i + 1]!) - kompass(pts[i - 1]!, pts[i]!));
          if (diff > 180) diff = 360 - diff;
          if (diff > KNICK_GRAD) knicke++;
          if (knicke > KNICK_MAX_OK) {
            defekt = true;
            break;
          }
        }
      }
    }
    if (defekt) kaputt.push(row.id);
  }

  if (kaputt.length === 0) {
    log.info("Artefakt-Check: keine kaputten Routen gefunden");
    return 0;
  }

  // In Batches a 100 updaten (IN-Klausel-Laenge begrenzen).
  const BATCH = 100;
  for (let i = 0; i < kaputt.length; i += BATCH) {
    const slice = kaputt.slice(i, i + BATCH);
    await db.execute(
      sql`UPDATE external_routes SET geometry_version = 1 WHERE id = ANY(${sql.raw(`ARRAY[${slice.map((id) => `'${id}'`).join(",")}]`)})`,
    );
  }

  log.info({ count: kaputt.length }, "Artefakt-Check: kaputte Routen auf v1 zurueckgesetzt");

  // Betroffene Kantone bestimmen und jeweils mit forceRefresh neu aufbauen.
  // warmAllCantonCaches wuerde Kantone mit genuegend v3-Routen ueberspringen —
  // deshalb pro Kanton direkt getCantonRoutes({ forceRefresh: true }) aufrufen.
  const betroffeneKantone = [...new Set(
    rows
      .filter((r) => kaputt.includes(r.id))
      .map((r) => (r as { canton?: string }).canton)
      .filter((c): c is string => !!c),
  )];

  log.info({ kantone: betroffeneKantone }, "Artefakt-Fix: starte forceRefresh fuer betroffene Kantone");
  return kaputt.length;
}

// ---------------------------------------------------------------------------
// SchweizMobil-Sync: alle nummerierten Schweizer Wanderrouten (1–999)
// ---------------------------------------------------------------------------

/**
 * Normalisiert einen OSM-Routennamen und stellt die offizielle Nummer voran.
 *
 * Beispiel:
 *   ref="7", name="Via Gottardo - Etappe 1: Basel - Liestal"
 *   → "7 Via Gottardo Etappe 1 Basel - Liestal"
 */
/**
 * Waehlt den besten Anzeigenamen:
 * 1. name:de bevorzugt
 * 2. Fallback auf name
 * Dann: Formatierung + Ref-Praefix
 */
export function formatNumberedRouteName(
  ref: string | null,
  osmName: string,
  nameDe?: string | null,
): string {
  let name = (nameDe || osmName).trim();
  // OSM-Platzhalter "fixme" (in jeder Schreibweise) entfernen, inkl.
  // haengender Trennstriche: "Hüttner Brugg - Finstersee - fixme" →
  // "Hüttner Brugg - Finstersee", "fixme - Chapf" → "Chapf"
  name = name
    .replace(/\s*[-–—]?\s*\bfixme\b\s*[-–—]?\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s*[-–—]\s*|\s*[-–—]\s*$/g, "")
    .trim();
  // "ViaJacobi" / "ViaGottardo" → "Via Jacobi" / "Via Gottardo"
  name = name.replace(/\bVia([A-ZÄÖÜ])/g, "Via $1");
  // " - Etappe" oder " – Etappe" → " Etappe"
  name = name.replace(/\s+[-–]\s+(?=Etappe\s)/gi, " ");
  // "Etappe 1: Basel" → "Etappe 1 Basel"
  name = name.replace(/(Etappe\s+\d+)\s*:\s*/gi, "$1 ");
  // Mehrfache Leerzeichen bereinigen
  name = name.replace(/\s{2,}/g, " ").trim();
  return ref ? `${ref} ${name}` : name;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Laedt und speichert alle nummerierten Schweizer Wanderrouten (nwn + rwn,
 * Nummern 1–999) aus OSM. Routen werden dem Kanton zugeordnet, in dem der
 * Startpunkt liegt (Nominatim-Reverse-Geocoding, gecacht nach ~10-km-Zelle).
 *
 * Laeuft als Hintergrundprozess; gibt die Anzahl gespeicherter Routen zurueck.
 */
export async function syncSwissNumberedRoutes(
  log: Logger,
  opts?: {
    skipPhotos?: boolean;
    batchSize?: number;
    pauseMs?: number;
    timeoutMs?: number;
    forceRefresh?: boolean;
    /** Nur bestimmte Netzwerk-Typen verarbeiten, z.B. ["nwn"] oder ["rwn","lwn"] */
    networks?: string[];
  },
): Promise<number> {
  const batchSize = opts?.batchSize ?? 3;
  const pauseMs = opts?.pauseMs ?? 4_000;
  const timeoutMs = opts?.timeoutMs ?? 90_000;

  // 1. Index aller nummerierten Routen in der Schweiz holen
  let index = await fetchSwissNumberedIndex(log);

  // Optional: nur bestimmte Netzwerk-Typen verarbeiten
  if (opts?.networks && opts.networks.length > 0) {
    const nets = new Set(opts.networks);
    index = index.filter((e) => nets.has(e.network ?? ""));
    log.info({ networks: opts.networks, filtered: index.length }, "Nummerierte-Routen-Sync: Netzwerk-Filter aktiv");
  }

  // 2. Bereits frisch gecachte OSM-IDs überspringen (ausser forceRefresh)
  let toFetch: RouteIndexEntry[];
  if (opts?.forceRefresh) {
    toFetch = index;
  } else {
    const existing = await db
      .select({ id: externalRoutesTable.id, fetchedAt: externalRoutesTable.fetchedAt })
      .from(externalRoutesTable);
    const freshIds = new Set(
      existing
        .filter((r) => Date.now() - r.fetchedAt.getTime() < CACHE_TTL_MS)
        .map((r) => r.id),
    );
    toFetch = index.filter((e) => !freshIds.has(`osm-${e.osmId}`));
  }

  log.info(
    { total: index.length, toFetch: toFetch.length },
    "Nummerierte-Routen-Sync: starte",
  );

  if (toFetch.length === 0) {
    log.info("Alle nummerierten Routen bereits aktuell");
    return 0;
  }

  // 3. Kanton-Cache: Nominatim-Anfragen per ~10-km-Gitterzelle bündeln
  // Nur erfolgreiche Kantone cachen — null-Ergebnisse werden NICHT gecacht,
  // damit eine temporaer fehlgeschlagene Nominatim-Anfrage nicht alle
  // Routen im selben ~10-km-Gitter dauerhaft blockiert.
  const cantonCache = new Map<string, string>();
  async function detectCanton(lat: number, lng: number): Promise<string | null> {
    const key = `${lat.toFixed(1)},${lng.toFixed(1)}`;
    if (cantonCache.has(key)) return cantonCache.get(key)!;
    await sleep(1_100);
    const result = await reverseGeocode(lat, lng, log);
    if (result.canton) cantonCache.set(key, result.canton);
    return result.canton;
  }

  // 4. Pro Route einzeln verarbeiten — bei Geometrie-Fehler überspringen statt
  //    die ganze Sync-Runde abbrechen. Nationale Routen haben bis zu 1000+ Ways;
  //    ein einziger Overpass-Timeout soll nicht alle anderen mitreissen.
  let stored = 0;
  let skipped = 0;
  for (let i = 0; i < toFetch.length; i++) {
    const entry = toFetch[i];
    if (i > 0) await sleep(pauseMs); // Rate-Limit zwischen Overpass-Anfragen

    let raw: RawHikingRoute[];
    try {
      raw = await fetchRouteGeometries([entry.osmId], log, { batchSize: 1, pauseMs: 0, timeoutMs });
    } catch (geoErr) {
      log.warn(
        { osmId: entry.osmId, name: entry.name, ref: entry.ref, err: geoErr },
        "Nummerierte Route: Geometrie-Fetch fehlgeschlagen, übersprungen",
      );
      skipped++;
      continue;
    }

    const r = raw[0];
    if (!r || r.points.length < 2) { skipped++; continue; }

    // 5. Minimale Länge (< 1 km = keine echte Wanderroute), kein Maximum –
    //    nationale Mehrtagesrouten (100+ km) werden bewusst vollständig geladen.
    // Amtlicher Tag-Wert für den Längencheck (unvollständige Geometrien nicht wegfiltern).
    const geomKm2 = pathDistanceKm(r.points);
    const distanceTagKm2 = r.distanceTagKm != null ? Math.round(r.distanceTagKm * 10) / 10 : null;
    if ((distanceTagKm2 ?? geomKm2) < MIN_KM) {
      log.debug({ osmId: entry.osmId, geomKm2 }, "Nummerierte Route: zu kurz → übersprungen");
      skipped++;
      continue;
    }

    // 6. Kanton, Elevation, SAC, Name → DB-Zeile bauen
    try {
      const start = r.points[0];
      const canton = await detectCanton(start.lat, start.lng);
      if (!canton) {
        log.debug({ id: r.id, name: r.name }, "Nummerierte Route: kein Kanton → übersprungen");
        skipped++;
        continue;
      }

      const elevation = await computeElevationStats(r.points, log);
      // distanceKm = Geometrie (weisse Kachel), distanceTagKm = OSM-Tag (roter Balken)
      const distanceKm2 = Math.round(geomKm2 * 10) / 10;
      const minutesKm2 = distanceTagKm2 ?? distanceKm2;
      const ascentM = r.ascentTagM ?? elevation?.ascentM ?? 0;
      const maxElevationM = elevation?.maxElevationM ?? 0;
      const sacAssessment = assessSac(r.sac, await deriveSacFromSwissTlm3d(r.points, log));
      const sac = sacAssessment.value;
      const geometry: [number, number][] = rdpSimplify(r.points, 5, STORED_GEOMETRY_POINTS).map(
        (p: LatLng) => [p.lat, p.lng],
      );
      const formattedName = formatNumberedRouteName(r.ref, r.name);
      const photo = opts?.skipPhotos
        ? { photoUrl: null, attribution: null }
        : await getCachedRoutePhoto(start.lat, start.lng, log, r.name);

      const row = {
        id: r.id,
        sagaId: r.id,
        canton,
        name: formattedName,
        ref: r.ref,
        distanceKm: distanceKm2,
        distanceTagKm: distanceTagKm2,
        ascentM,
        maxElevationM,
        minutes: estimateMinutes(minutesKm2, ascentM),
        sac,
        sacSource: sacAssessment.source,
        terrain: terrainLabel(r.ref, r.network, sac),
        lat: start.lat,
        lng: start.lng,
        geometry,
        geometryVersion: GEOMETRY_VERSION,
        source: "SchweizMobil · OSM",
        featured: false,
        photoUrl: photo.photoUrl,
        photoAttribution: photo.attribution,
      };

      await db
        .insert(externalRoutesTable)
        .values(row)
        .onConflictDoUpdate({
          target: externalRoutesTable.id,
          set: {
            name: sql`excluded.name`,
            canton: sql`excluded.canton`,
            distanceKm: sql`excluded.distance_km`,
            distanceTagKm: sql`excluded.distance_tag_km`,
            ascentM: sql`excluded.ascent_m`,
            maxElevationM: sql`excluded.max_elevation_m`,
            minutes: sql`excluded.minutes`,
            sac: sql`excluded.sac`,
            sacSource: sql`excluded.sac_source`,
            terrain: sql`excluded.terrain`,
            geometry: sql`excluded.geometry`,
            geometryVersion: sql`excluded.geometry_version`,
            source: sql`excluded.source`,
            ref: sql`excluded.ref`,
            photoUrl: sql`COALESCE(excluded.photo_url, ${externalRoutesTable.photoUrl})`,
            photoAttribution: sql`COALESCE(excluded.photo_attribution, ${externalRoutesTable.photoAttribution})`,
            fetchedAt: new Date(),
          },
        })
        .execute();

      stored++;
      if (stored % 5 === 0) {
        log.info({ stored, total: toFetch.length, skipped }, "Nummerierte-Routen-Sync: Fortschritt");
      }
    } catch (err) {
      log.warn({ id: r.id, name: r.name, err }, "Nummerierte Route: DB/Verarbeitung fehlgeschlagen, weiter");
      skipped++;
    }
  }

  log.info({ stored, skipped, total: toFetch.length }, "Nummerierte-Routen-Sync: abgeschlossen");
  return stored;
}

/**
 * Reichert eine einzelne Route (id = "osm-XXXXXX") mit Geometrie, Distanz,
 * Hoehenprofil und Kanton an. Wird vom /admin/routes/enrich-next Cron-Endpoint
 * aufgerufen — laeuft langsam, eine Route nach der anderen.
 */
export async function enrichOneRoute(
  rowId: string,
  log: Logger,
): Promise<{ ok: true; distanceKm: number; canton: string } | { ok: false; reason: string }> {
  let osmId = parseInt(rowId.replace("osm-", ""), 10);
  if (isNaN(osmId)) {
    // Alt-IDs ohne OSM-ID: "schweizmobil-<net>-<ref>" oder
    // "placeholder-<net>-<ref>-etappe-<n>" → Relation via network+ref aufloesen.
    const m = /^(?:schweizmobil|placeholder)-(nwn|rwn|lwn)-(\d+)(?:-etappe-(\d+))?$/.exec(rowId);
    if (!m) return { ok: false, reason: "kein OSM-ID" };
    const [, network, ref, etappe] = m;
    let resolved: number | null;
    try {
      resolved = await resolveNumberedRouteOsmId(
        network!,
        ref!,
        { etappe: etappe ? parseInt(etappe, 10) : undefined },
        log,
      );
    } catch (e: any) {
      // Netzwerk-/Timeout-Fehler: NICHT dauerhaft markieren, spaeter erneut.
      return { ok: false, reason: `OSM-ID-Aufloesung: ${e.message}` };
    }
    if (resolved == null) {
      await db
        .update(externalRoutesTable)
        .set({ geometryVersion: -1 })
        .where(eq(externalRoutesTable.id, rowId));
      return { ok: false, reason: "keine passende OSM-Relation — als -1 markiert" };
    }
    osmId = resolved;
  }

  // Erst der normale Weg (ganze Relation mit `out geom;`); wenn der scheitert
  // (typisch: sehr grosse Relationen laufen ins Overpass-Timeout), der
  // Chunked-Fallback: Member-Liste + Way-Geometrien in kleinen Bloecken.
  let route: RawHikingRoute | null = null;
  let ersterFehler: string | null = null;
  try {
    const raw = await fetchRouteGeometries([osmId], log, { batchSize: 1, timeoutMs: 60_000 });
    route = raw[0] ?? null;
  } catch (e: any) {
    ersterFehler = e.message;
  }
  if (!route) {
    log.info({ id: rowId, ersterFehler }, "enrich: Standard-Lader leer/gescheitert — Chunked-Fallback");
    try {
      route = await fetchRouteGeometryChunked(osmId, log);
    } catch (e: any) {
      // Netzwerk-/Timeout-Fehler: NICHT dauerhaft markieren, spaeter erneut.
      return { ok: false, reason: `Overpass (auch chunked): ${e.message}` };
    }
  }
  if (!route) {
    // Dritter Versuch: 2-Ebenen-Expansion für NWN/RWN-Super-Relationen
    // (Super-Relation → Parent-Routen → Etappen → Ways).
    log.info({ id: rowId }, "enrich: Chunked-Lader leer — SuperDeep-Fallback (2-Ebenen)");
    try {
      route = await fetchRouteSuperDeep(osmId, log);
    } catch (e: any) {
      return { ok: false, reason: `Overpass (superdeep): ${e.message}` };
    }
    if (!route) {
      // Nachweislich nicht anreicherbar: dauerhaft markieren.
      await db
        .update(externalRoutesTable)
        .set({ geometryVersion: -1 })
        .where(eq(externalRoutesTable.id, rowId));
      return { ok: false, reason: "nicht anreicherbar (auch 2-Ebenen-Expansion leer) — als -1 markiert" };
    }
  }

  const r = route;
  // distanceKm = aus Geometrie berechnet (weisse Kachel, Navigation)
  // distanceTagKm = amtlicher OSM-Tag-Wert (roter Balken); null wenn kein Tag
  const geomKm = pathDistanceKm(r.points);
  const distanceTagKm = r.distanceTagKm != null ? Math.round(r.distanceTagKm * 10) / 10 : null;
  const distanceKm = Math.round(geomKm * 10) / 10;
  const minutesKm = distanceTagKm ?? distanceKm;
  const elevation = await computeElevationStats(r.points, log);
  const ascentM = r.ascentTagM ?? elevation?.ascentM ?? 0;
  const maxElevationM = elevation?.maxElevationM ?? 0;
  const sacAssessment = assessSac(r.sac, await deriveSacFromSwissTlm3d(r.points, log));
  const sac = sacAssessment.value;
  const start = r.points[0]!;
  const geometry: [number, number][] = rdpSimplify(r.points, 5, STORED_GEOMETRY_POINTS).map(
    (p) => [p.lat, p.lng],
  );
  const minutes = estimateMinutes(minutesKm, ascentM);

  // Kanton aus DB lesen falls schon gesetzt, sonst reverse geocoden.
  // '__hidden__' und 'pending' werden wie null behandelt → immer neu geocoden,
  // damit versteckte Routen nach erfolgreichem Enrichment automatisch wieder
  // sichtbar werden (falls die Geometrie gut genug ist, s.u.).
  const [existing] = await db
    .select({ canton: externalRoutesTable.canton, ref: externalRoutesTable.ref })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, rowId));
  const wasHidden = existing?.canton === "__hidden__";
  let canton =
    START_CANTON_OVERRIDES[rowId] ??
    (existing?.canton && existing.canton !== "pending" && existing.canton !== "__hidden__"
      ? existing.canton
      : null);
  if (!canton) {
    await sleep(1_100);
    const geo = await reverseGeocode(start.lat, start.lng, log);
    canton = geo.canton ?? "unbekannt";
  }

  const terrain = terrainLabel(r.ref ?? existing?.ref ?? null, r.network, sac);
  const cantons = await detectRouteCantons(r.points, canton, log);

  // Von-Bis an den Namen anhängen (gleiche Logik wie in enrichAndStore).
  const [nameRow] = await db
    .select({ name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, rowId));
  let updatedName: string | undefined;
  if (nameRow?.name) {
    // Nummernpräfix (1–3 Stellen) oder K-Kantonal-Prefix → Name geschützt, nie überschreiben.
    const nameIsProtected = /^(\d{1,3} |K\d+ [A-Z]{2} )/.test(nameRow.name);
    if (!nameIsProtected) {
      // "ViaXxx" → "Via Xxx" bereinigen
      const cleanedName = nameRow.name
        .replace(/\bVia([A-ZÄÖÜ])/g, "Via $1")
        .trim();
      const f = r.from?.trim();
      const t = r.to?.trim();
      const vonBis = (() => {
        if (!f && !t) return "";
        if (f && cleanedName.includes(f)) return "";
        if (f && t) return ` ${f} - ${t}`;
        if (f) return ` ${f}`;
        return ` - ${t}`;
      })();
      const candidate = cleanedName + vonBis;
      if (candidate !== nameRow.name) updatedName = candidate;
    }
  }

  // Wenn die Route vorher versteckt war: Geometrie-Qualität prüfen.
  // Mindestens 10 Punkte pro km — sonst bleibt sie versteckt und wird erneut
  // in gv=0 gesetzt damit der Loop es später nochmal versucht.
  const ptsPerKm = distanceKm > 0 ? geometry.length / distanceKm : 0;
  const HIDDEN_QUALITY_THRESHOLD = 10; // pts/km
  const stillHidden = wasHidden && ptsPerKm < HIDDEN_QUALITY_THRESHOLD;
  const finalCanton = stillHidden ? "__hidden__" : canton;
  const finalGv     = stillHidden ? 0 : GEOMETRY_VERSION;

  if (wasHidden) {
    if (stillHidden) {
      log.info(
        { id: rowId, ptsPerKm: Math.round(ptsPerKm), threshold: HIDDEN_QUALITY_THRESHOLD },
        "enrich: Route war __hidden__, Geometrie noch zu dünn — bleibt versteckt, gv=0",
      );
    } else {
      log.info(
        { id: rowId, canton, ptsPerKm: Math.round(ptsPerKm) },
        "enrich: Route war __hidden__, Geometrie gut genug — wird wieder sichtbar",
      );
    }
  }

  await db
    .update(externalRoutesTable)
    .set({
      lat: start.lat,
      lng: start.lng,
      distanceKm,
      distanceTagKm,
      ascentM,
      maxElevationM,
      minutes,
      sac,
      sacSource: sacAssessment.source,
      terrain,
      canton: finalCanton,
      cantons,
      geometry: geometry as any,
      geometryVersion: finalGv,
      source: "OpenStreetMap · swisstopo",
      ...(updatedName ? { name: updatedName } : {}),
    })
    .where(eq(externalRoutesTable.id, rowId));

  return { ok: true, distanceKm, canton: finalCanton };
}

/**
 * Ermittelt alle durchquerten Kantone einer Route: Geometrie an bis zu 6
 * Stuetzpunkten sampeln und reverse geocoden (1.1s Pause pro Nominatim-
 * Anfrage). Startkanton ist immer enthalten.
 */
export async function detectRouteCantons(
  points: LatLng[],
  startCanton: string,
  log: Logger,
): Promise<string[]> {
  const found = new Set<string>();
  if (startCanton && startCanton !== "pending" && startCanton !== "unbekannt") {
    found.add(startCanton);
  }
  if (points.length < 2) return [...found];
  const SAMPLES = 6;
  const step = Math.max(1, Math.floor(points.length / SAMPLES));
  for (let i = step; i < points.length; i += step) {
    const p = points[i]!;
    try {
      await sleep(1_100);
      const geo = await reverseGeocode(p.lat, p.lng, log);
      if (geo.canton) found.add(geo.canton);
    } catch {
      // Einzelner Geocoding-Fehler ist unkritisch — Sample überspringen
    }
  }
  return [...found];
}

/**
 * Backfill: ermittelt fuer eine bereits angereicherte Route (geometry
 * vorhanden) nur die Multi-Kanton-Liste, ohne Overpass-Anfrage.
 */
export async function backfillCantonsForRoute(
  rowId: string,
  log: Logger,
): Promise<{ ok: true; cantons: string[] } | { ok: false; reason: string }> {
  const [row] = await db
    .select({ canton: externalRoutesTable.canton, geometry: externalRoutesTable.geometry })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, rowId));
  if (!row) return { ok: false, reason: "nicht gefunden" };
  const geom = row.geometry as [number, number][] | null;
  if (!geom || !Array.isArray(geom) || geom.length < 2) {
    // Keine Geometrie — nur Startkanton eintragen, damit der Backfill-Cron
    // die Route nicht endlos erneut anfasst.
    const only = row.canton && row.canton !== "pending" ? [row.canton] : ["unbekannt"];
    await db
      .update(externalRoutesTable)
      .set({ cantons: only })
      .where(eq(externalRoutesTable.id, rowId));
    return { ok: true, cantons: only };
  }
  const points: LatLng[] = geom.map(([lat, lng]) => ({ lat, lng }));
  const cantons = await detectRouteCantons(points, row.canton, log);
  await db
    .update(externalRoutesTable)
    .set({ cantons })
    .where(eq(externalRoutesTable.id, rowId));
  return { ok: true, cantons };
}

/**
 * Versucht, einen Wiki-Etappen-Platzhalter durch echte OSM-Geometrie zu ersetzen.
 * Läuft als Teil des enrich-all-Loops oder über den Endpoint
 * POST /admin/routes/replace-wiki-etappen.
 *
 * Strategie:
 * 1. From/To aus dem Name-Feld parsen ("…Etappe N From – To")
 * 2. Per Overpass Wanderrouten-Relation mit passenden from/to-Tags suchen
 * 3. Bei Treffer: Route über enrichAndStore einpflegen
 * 4. sagaId + isEtappe aus dem wiki-* Datensatz auf die osm-* Zeile schreiben
 *    (auch wenn die osm-* Zeile schon existierte)
 * 5. Erst dann wiki-* Eintrag löschen (verhindert Verlust bei Absturz zwischen 4 und 5)
 * 6. Kein Treffer → nichts tun (OSM kann die Route später nachrüsten)
 *
 * Gibt replaced=false zurück wenn:
 * - from/to nicht erkennbar
 * - Overpass findet keine passende Relation
 * - enrichAndStore scheitert (transiente Fehler — erneuter Versuch beim nächsten Lauf)
 */
export async function tryReplaceWikiRoute(
  row: Pick<ExternalRouteRow, "id" | "name" | "canton" | "sagaId" | "routeType" | "isEtappe">,
  log: Logger,
): Promise<{ replaced: boolean; osmId?: number; reason?: string }> {
  // From/To aus Name extrahieren: "4a Via Jacobi Etappe 24 Rapperswil (SG) – Luzern"
  // Trennzeichen: em-dash (–), en-dash (—) oder Spiegelstrich ( - )
  const nameStr = row.name ?? "";
  const vonBisMatch = nameStr.match(/[Ee]tappe\s+\d+\s+(.+?)\s*(?:[–—]|-(?=\s))\s*(.+)$/);
  if (!vonBisMatch) {
    return { replaced: false, reason: "from/to nicht im Name erkennbar" };
  }
  const from = vonBisMatch[1].trim();
  const to = vonBisMatch[2].trim();
  if (!from || !to || from === to) {
    return { replaced: false, reason: `ungültige from/to: "${from}" → "${to}"` };
  }

  // Overpass: Relation mit passenden from/to-Tags suchen
  let osmIds: number[];
  try {
    osmIds = await searchOsmRouteByFromTo(from, to, log);
  } catch (err) {
    return { replaced: false, reason: `Overpass-Fehler: ${String(err)}` };
  }
  if (osmIds.length === 0) {
    return { replaced: false, reason: `keine OSM-Relation für from="${from}" to="${to}"` };
  }

  const osmId = osmIds[0]!;
  const osmRouteId = `osm-${osmId}`;
  // Canton aus der wiki-* Zeile übernehmen; leerer String = unbekannt → "CH" als Fallback
  const canton = row.canton && row.canton !== "" ? row.canton : "CH";

  // Prüfen ob die osm-* Route bereits gespeichert ist (Doppelarbeit vermeiden)
  const [existingRow] = await db
    .select({ id: externalRoutesTable.id })
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, osmRouteId));

  if (!existingRow) {
    // OSM-Route vollständig einreichern (Geometrie + Höhenmeter + SAC + Foto)
    try {
      await enrichAndStore(canton, [osmId], log, { skipPhotos: false });
    } catch (err) {
      log.warn({ wikiId: row.id, osmId, err }, "tryReplaceWikiRoute: enrichAndStore gescheitert");
      return { replaced: false, reason: `enrichAndStore gescheitert: ${String(err)}` };
    }

    // Sicherstellen dass der Insert erfolgreich war (Längen-/Kantonfilter könnte ablehnen)
    const [inserted] = await db
      .select({ id: externalRoutesTable.id })
      .from(externalRoutesTable)
      .where(eq(externalRoutesTable.id, osmRouteId));
    if (!inserted) {
      return { replaced: false, reason: "enrichAndStore lieferte kein Ergebnis (Längen- oder Kantonfilter?)" };
    }
  }

  // sagaId und isEtappe aus dem wiki-* Datensatz übernehmen — IMMER, egal ob die
  // osm-* Zeile neu angelegt wurde oder schon existierte. enrichAndStore setzt sagaId
  // auf die eigene ID; die wiki-* Zeile kennt dagegen den echten Eltern-Anker.
  await db
    .update(externalRoutesTable)
    .set({
      sagaId: row.sagaId ?? osmRouteId,
      isEtappe: row.isEtappe,
    })
    .where(eq(externalRoutesTable.id, osmRouteId))
    .execute();

  // Erst nach erfolgreichem Update den wiki-* Eintrag entfernen — so geht bei einem
  // Absturz zwischen Update und Delete die Etappe nicht verloren (bei erneutem Lauf
  // wird der wiki-* Eintrag gefunden, osm-* existiert bereits, Update + Delete laufen).
  await db
    .delete(externalRoutesTable)
    .where(eq(externalRoutesTable.id, row.id))
    .execute();

  log.info({ wikiId: row.id, osmId, canton, sagaId: row.sagaId }, "tryReplaceWikiRoute: wiki-Platzhalter durch OSM-Route ersetzt");

  // #71: Automatisch Parent-Route neu vernähen wenn alle Etappen jetzt echte Geometrie haben.
  // Nur wenn sagaId auf eine bekannte Parent-Route zeigt (nicht auf eine Sagen-ID).
  const parentId = row.sagaId ?? "";
  const looksLikeParent = /^(schweizmobil|osm|placeholder)-/.test(parentId);
  if (looksLikeParent) {
    // Fire-and-forget — kein await, damit die Ersetzungs-Schleife nicht aufgehalten wird
    tryRestitchParentRoute(parentId, log).catch((e) =>
      log.warn({ parentId, err: String(e) }, "tryReplaceWikiRoute: Auto-Restitch fehlgeschlagen"),
    );
  }

  return { replaced: true, osmId };
}

/**
 * Vernäht eine Elternroute automatisch neu, sobald alle verknüpften Etappen
 * echte Geometrie haben (> 2 Punkte; keine Wiki-Geraden).
 * Wird nach erfolgreichem wiki-Ersatz aufgerufen (#71).
 */
export async function tryRestitchParentRoute(parentId: string, log: Logger): Promise<void> {
  // Alle Etappen dieses Parents laden
  const etappen = await db
    .select({
      id: externalRoutesTable.id,
      name: externalRoutesTable.name,
      geometry: externalRoutesTable.geometry,
    })
    .from(externalRoutesTable)
    .where(
      and(
        eq(externalRoutesTable.sagaId, parentId),
        eq(externalRoutesTable.isEtappe, true),
      ),
    );

  if (etappen.length < 2) return; // Zu wenige Etappen

  // Alle Etappen müssen echte Geometrie haben (> 2 Punkte)
  const normGeo = (raw: unknown): [number, number][] | null => {
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed) || parsed.length < 3) return null;
      return parsed.map((p: unknown) =>
        Array.isArray(p) ? [p[0] as number, p[1] as number] : [(p as any).lat ?? 0, (p as any).lng ?? 0],
      );
    } catch { return null; }
  };

  const withGeo = etappen
    .map((e) => ({ ...e, pts: normGeo(e.geometry) }))
    .filter((e): e is typeof e & { pts: [number, number][] } => e.pts !== null);

  if (withGeo.length < etappen.length) {
    log.debug({ parentId, total: etappen.length, withGeo: withGeo.length }, "tryRestitchParent: noch nicht alle Etappen bereit");
    return; // Warten bis alle Etappen echte Geometrie haben
  }

  // Etappen nach Etappen-Nummer sortieren
  const etappenNrFromName = (name: string): number =>
    parseInt(name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i)?.[1] ?? "0", 10);

  const ordered = [...withGeo].sort((a, b) => etappenNrFromName(a.name) - etappenNrFromName(b.name));

  // Verketten (Endpunkt-nächste Ausrichtung)
  const R = 6371;
  const hav = (a: [number, number], b: [number, number]) => {
    const dLat = ((b[0] - a[0]) * Math.PI) / 180;
    const dLng = ((b[1] - a[1]) * Math.PI) / 180;
    const s = Math.sin(dLat / 2) ** 2 +
      Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };

  let chain: [number, number][] = ordered[0].pts.slice();
  for (let i = 1; i < ordered.length; i++) {
    const seg = ordered[i].pts.slice();
    const end = chain[chain.length - 1]!;
    if (hav(end, seg[seg.length - 1]!) < hav(end, seg[0]!)) seg.reverse();
    chain = chain.concat(seg);
  }

  if (chain.length < 3) return;

  const rounded = chain.map(([lat, lng]) => [
    Math.round(lat * 1e6) / 1e6,
    Math.round(lng * 1e6) / 1e6,
  ]);

  await db
    .update(externalRoutesTable)
    .set({ geometry: rounded as any, geometryVersion: 5 })
    .where(eq(externalRoutesTable.id, parentId))
    .execute();

  log.info({ parentId, etappen: ordered.length, pts: rounded.length }, "tryRestitchParent: Elternroute automatisch vernäht (#71)");
}

/**
 * Liefert die kuratierte Sage zu einer dynamischen (OSM-)Route: die
 * naechstgelegene belegte Regionalsage. Es werden keine Sagen mehr erzeugt.
 */
export async function getRouteSaga(
  routeId: string,
  log: Logger,
): Promise<CatalogSagaRow | null> {
  const [route] = await db
    .select()
    .from(externalRoutesTable)
    .where(eq(externalRoutesTable.id, routeId));
  if (!route) return null;
  return findNearestCuratedSaga(route.canton, route.lat, route.lng, log);
}
