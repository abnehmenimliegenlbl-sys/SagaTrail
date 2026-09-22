+= BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) {
        const t = el.tags ?? {};
        tagMap.set(el.id, { ref: t.ref, from: t.from, to: t.to });
      }
    } catch (err) {
      log.warn({ err, batch: batch.slice(0, 3) }, "fix-lwn-refs: Overpass-Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  log.info({ fetched: tagMap.size }, "fix-lwn-refs: Overpass-Tags geholt");

  // 3. DB-Updates berechnen und ausführen
  let refUpdates = 0;
  let vonBisUpdates = 0;
  let combined = 0;

  for (const row of rows) {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const tags = tagMap.get(osmId);
    if (!tags) continue;

    const refNum = tags.ref ? parseInt(tags.ref, 10) : NaN;
    const hasValidRef = !isNaN(refNum) && refNum >= 100 && refNum <= 999;
    const hasVonBis = row.name.includes(" - ");
    const hasOsmVonBis = !!(tags.from && tags.to);

    if (!hasValidRef && (hasVonBis || !hasOsmVonBis)) continue; // nichts zu tun

    // Basis-Name ohne aktuellen Zahlen-Prefix
    const baseName = row.name.replace(/^\d+\s+/, "");
    // Von-Bis anhängen wenn nötig
    const nameWithVonBis =
      !hasVonBis && hasOsmVonBis
        ? `${baseName} ${tags.from} - ${tags.to}`
        : baseName;

    const newName = hasValidRef
      ? `${refNum} ${nameWithVonBis}`
      : `${row.name.match(/^\d+/)?.[0] ?? "100"} ${nameWithVonBis}`;

    const newRef = hasValidRef ? String(refNum) : null;

    if (newName === row.name && newRef === null) continue;

    await db
      .update(externalRoutesTable)
      .set({ name: newName, ...(newRef !== null ? { ref: newRef } : {}) })
      .where(eq(externalRoutesTable.id, row.id))
      .execute()
      .catch((err) => log.warn({ err, id: row.id }, "fix-lwn-refs: Update fehlgeschlagen"));

    if (hasValidRef && !hasVonBis && hasOsmVonBis) combined++;
    else if (hasValidRef) refUpdates++;
    else vonBisUpdates++;
  }

  res.json({
    geprüft: rows.length,
    overpassTags: tagMap.size,
    refUmbenannt: refUpdates,
    vonBisErgänzt: vonBisUpdates,
    beides: combined,
  });
});

/**
 * POST /admin/routes/check-lwn-tags
 * Prüft die 797 3-stelligen Routen ohne ref nochmals in Overpass:
 * Hat die OSM-Relation network=lwn UND eine 3-stellige Zahl irgendwo in den Tags
 * (ref, name, alt_name, ref:schweizmobil …)? → ref-Spalte + Name-Prefix aktualisieren.
 */
router.post("/admin/routes/check-lwn-tags", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        isNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} ~ '^[1-9][0-9][0-9] '`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "check-lwn-tags: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const tagMap = new Map<number, Record<string, string>>();

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) tagMap.set(el.id, el.tags ?? {});
    } catch (err) {
      log.warn({ err }, "check-lwn-tags: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  log.info({ fetched: tagMap.size }, "check-lwn-tags: Tags geholt");

  // Alle Tags nach 3-stelliger Zahl (100–999) durchsuchen
  const DREI_DIGIT = /\b([1-9][0-9][0-9])\b/;
  let updated = 0;
  const found: Array<{ id: string; newRef: number; newName: string }> = [];

  for (const row of rows) {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const tags = tagMap.get(osmId);
    if (!tags) continue;

    const network = (tags.network ?? "").toLowerCase();
    if (network !== "lwn") continue; // nur echte lwn

    // Suche 3-stellige Zahl in allen Tag-Werten
    let foundNum: number | null = null;
    for (const val of Object.values(tags)) {
      const m = DREI_DIGIT.exec(val);
      if (m) { foundNum = parseInt(m[1], 10); break; }
    }
    if (!foundNum) continue;

    // Name-Prefix ersetzen
    const baseName = row.name.replace(/^\d+\s+/, "");
    const newName = `${foundNum} ${baseName}`;
    found.push({ id: row.id, newRef: foundNum, newName });
  }

  // Updates in DB schreiben
  for (const item of found) {
    await db
      .update(externalRoutesTable)
      .set({ name: item.newName, ref: String(item.newRef) })
      .where(eq(externalRoutesTable.id, item.id))
      .execute()
      .catch((err) => log.warn({ err, id: item.id }, "check-lwn-tags: Update fehlgeschlagen"));
    updated++;
  }

  res.json({ geprüft: rows.length, overpassTags: tagMap.size, lwnMit3Stellig: found.length, updated });
});

/**
 * POST /admin/routes/undo-check-lwn-tags
 * Macht die check-lwn-tags-Änderungen rückgängig:
 * Prüft alle 3-stelligen Routen mit ref IS NOT NULL gegen Overpass.
 * Wenn der OSM ref-Tag NICHT mit dem DB-ref übereinstimmt (Zahl wurde aus
 * name/alt_name geholt, nicht aus dem ref-Tag) → sequentielle Nummer zurück,
 * ref auf NULL setzen.
 */
router.post("/admin/routes/undo-check-lwn-tags", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  // Alle 3-stelligen Routen mit ref IS NOT NULL
  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name, ref: externalRoutesTable.ref, canton: externalRoutesTable.canton })
    .from(externalRoutesTable)
    .where(
      and(
        isNotNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} ~ '^[1-9][0-9][0-9] '`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "undo-check-lwn-tags: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const osmRefMap = new Map<number, string | null>(); // osmId → OSM ref-Tag (oder null)

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      for (const el of elements) osmRefMap.set(el.id, el.tags?.ref ?? null);
    } catch (err) {
      log.warn({ err }, "undo-check-lwn-tags: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  // Routen identifizieren wo DB-ref ≠ OSM ref-Tag → waren check-lwn-tags
  const toReset = rows.filter((row) => {
    const osmId = parseInt(row.id.replace("osm-", ""), 10);
    const osmRef = osmRefMap.get(osmId);
    return osmRef !== row.ref; // OSM ref passt nicht zum DB ref
  });

  log.info({ toReset: toReset.length }, "undo-check-lwn-tags: Routen zum Zurücksetzen");
  if (toReset.length === 0) { res.json({ zurückgesetzt: 0 }); return; }

  // Nur ref auf NULL setzen — Name bleibt unverändert
  let updated = 0;
  for (const row of toReset) {
    await db
      .update(externalRoutesTable)
      .set({ ref: null })
      .where(eq(externalRoutesTable.id, row.id))
      .execute()
      .catch((err) => log.warn({ err, id: row.id }, "undo-check-lwn-tags: Update fehlgeschlagen"));
    updated++;
  }

  res.json({ geprüft: rows.length, overpassTags: osmRefMap.size, zurückgesetzt: updated });
});

/**
 * POST /admin/routes/lwn-ref-dryrun
 * Dry-run: prüft die 818 Routen ohne Prefix und ohne ref in Overpass.
 * Gibt zurück wieviele einen lwn ref-Tag (100–999) haben — ändert nichts.
 */
router.post("/admin/routes/lwn-ref-dryrun", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const log = req.log;

  const rows = await db
    .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
    .from(externalRoutesTable)
    .where(
      and(
        isNull(externalRoutesTable.ref),
        sql`${externalRoutesTable.name} !~ '^[1-9]'`,
        sql`${externalRoutesTable.id} LIKE 'osm-%'`,
      ),
    );

  const osmIds = rows.map((r) => parseInt(r.id.replace("osm-", ""), 10)).filter((n) => !isNaN(n));
  log.info({ total: osmIds.length }, "lwn-ref-dryrun: Routen geladen");

  const { runOverpass } = await import("../lib/overpass");
  const BATCH = 80;
  const found: Array<{ id: string; name: string; ref: number }> = [];
  let fetched = 0;

  for (let i = 0; i < osmIds.length; i += BATCH) {
    const batch = osmIds.slice(i, i + BATCH);
    const query = `[out:json][timeout:30];\nrelation(id:${batch.join(",")});\nout tags;`;
    try {
      const elements = await runOverpass<{ id: number; tags?: Record<string, string> }>(query);
      fetched += elements.length;
      const DREI_DIGIT = /\b([1-9][0-9][0-9])\b/;
      for (const el of elements) {
        const vals = Object.values(el.tags ?? {});
        const hasLwn = vals.some((v) => v.toLowerCase().includes("lwn"));
        if (!hasLwn) continue;
        // Zusätzlich: 3-stellige Zahl (100–999) irgendwo in den Tags
        let foundNum: number | null = null;
        for (const v of vals) {
          const m = DREI_DIGIT.exec(v);
          if (m) { foundNum = parseInt(m[1], 10); break; }
        }
        if (!foundNum) continue;
        const row = rows.find((r) => r.id === `osm-${el.id}`);
        if (row) found.push({ id: row.id, name: row.name, ref: foundNum });
      }
    } catch (err) {
      log.warn({ err }, "lwn-ref-dryrun: Batch fehlgeschlagen");
    }
    if (i + BATCH < osmIds.length) await new Promise<void>((r) => setTimeout(r, 1_200));
  }

  res.json({
    geprüft: osmIds.length,
    overpassGefunden: fetched,
    mitLwnRef: found.length,
    beispiele: found.slice(0, 10),
  });
});

/**
 * POST /admin/routes/fetch-etappen
 * Prüft alle rwn/nwn-Elternrouten (is_etappe=FALSE) ob OSM direkte
 * Unter-Relationen (Etappen) kennt, die wir noch nicht haben, und
 * speichert diese — inkl. is_etappe=TRUE Markierung.
 * Läuft im Hintergrund; Fortschritt per GET /admin/routes/fetch-etappen-status.
 */
let fetchEtappenLaeuft = false;
const fetchEtappenStatus = { laufend: false, geprueft: 0, gefunden: 0, gespeichert: 0, fehler: 0 };

router.get("/admin/routes/fetch-etappen-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(fetchEtappenStatus);
});

router.post("/admin/routes/fetch-etappen", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (fetchEtappenLaeuft) {
    res.json({ ok: false, message: "Läuft bereits", status: fetchEtappenStatus });
    return;
  }
  fetchEtappenLaeuft = true;
  fetchEtappenStatus.laufend = true;
  fetchEtappenStatus.geprueft = 0;
  fetchEtappenStatus.gefunden = 0;
  fetchEtappenStatus.gespeichert = 0;
  fetchEtappenStatus.fehler = 0;
  res.json({ ok: true, message: "Gestartet — Status via GET /admin/routes/fetch-etappen-status" });

  const log: Logger = req.log;

  (async () => {
    try {
      // Alle rwn/nwn Elternrouten ohne eigene Etappen-Markierung holen
      const eltern = await db
        .select({ id: externalRoutesTable.id, canton: externalRoutesTable.canton, name: externalRoutesTable.name, routeType: externalRoutesTable.routeType })
        .from(externalRoutesTable)
        .where(
          and(
            sql`${externalRoutesTable.routeType} IN ('rwn', 'nwn')`,
            eq(externalRoutesTable.isEtappe, false),
            sql`${externalRoutesTable.id} LIKE 'osm-%'`,
          ),
        );

      // Bekannte OSM-IDs vorab laden — kein Doppel-Insert
      const bekannteIds = new Set(
        (await db.select({ id: externalRoutesTable.id }).from(externalRoutesTable)).map((r) => r.id),
      );

      /** Statische Mapping-Tabelle: rwn-Nummer → exakter Wikipedia-Artikeltitel.
       *  Quelle: de.wikipedia.org/wiki/Schweizer_Wanderwege, Sektion 13. */
      const RWN_WIKI: Record<string, string> = {
        "22": "Kulturspur Appenzellerland",
        "23": "Senda Scuol–Samnaun",
        "24": "Thurweg",
        "25": "Senda Segantini",
        "26": "Panorama Rundweg Thunersee",
        "27": "Swiss Tour Monte Rosa",
        "29": "Pragelpass-Weg",
        "30": "Via Valtellina",
        "31": "Chemin du Jura",
        "32": "ViaSurprise",
        "33": "Via Albula/Bernina",
        "34": "Klettgau-Rhein-Weg",
        "35": "Walserweg Graubünden",
        "36": "Chemin du vignoble",
        "37": "Berner Voralpenweg",
        "38": "ViaBerna",
        "39": "Aletsch-Panoramaweg",
        "40": "Via Sbrinz",
        "42": "Aargauer Weg",
        "43": "Jakobsweg Graubünden",
        "44": "Appenzeller Weg",
        "45": "Nationalpark-Panoramaweg",
        "46": "Tour des Alpes Vaudoises",
        "47": "Zürich-Zugerland-Panoramaweg",
        "48": "Toggenburger Höhenweg",
        "49": "Vier-Quellen-Weg",
        "50": "Via Spluga",
        "51": "Furka-Höhenweg",
        "52": "Sentiero Lago di Lugano",
        "53": "Bernina-Tour",
        "54": "Mittelbünden-Panoramaweg",
        "55": "Via Suworow",
        "56": "Lötschberg-Panoramaweg",
        "57": "Obwaldner Höhenweg",
        "58": "Chemin des Bisses",
        "59": "Sentiero Cristallina",
        "60": "Via Rhenana",
        "61": "Walliser Sonnenweg",
        "63": "Schwyzer Höhenweg",
        "64": "ViaSett",
        "65": "Grenzpfad Napfbergland",
        "66": "Liechtensteiner Panoramaweg",
        "67": "Dreiland-Wanderweg",
        "68": "WALSA-Weg",
        "69": "Züri Oberland-Höhenweg",
        "70": "Via Francigena",
        "71": "Chemin des Trois-Lacs",
        "72": "Prättigauer Höhenweg",
        "73": "Sardona-Welterbe-Weg",
        "74": "Sentiero Verzasca",
        "76": "Seeland-Solothurn-Weg",
        "78": "Freiburger Voralpenweg",
        "79": "Thurgauer Panoramaweg",
        "80": "ViaJura",
        "81": "Fribourg en diagonale",
        "82": "Sanetsch-Muveran-Weg",
        "84": "Zürichsee-Rundweg",
        "85": "Senda Sursilvana",
        "86": "Rheintaler Höhenweg",
        "87": "Via Engiadina",
        "88": "Nidwaldner Höhenweg",
        "90": "Via Stockalper",
        "91": "Chemin du Jura bernois",
        "95": "Au fil du Doubs",
        "98": "Waldstätterweg",
        "99": "Weg der Schweiz",
      };

      /** Wikipedia-Artikeltitel aus DB-Routenname ableiten.
       *  Zuerst statische Map per Routennummer (zuverlässig),
       *  Fallback: Zahl-Prefix abschneiden.
       */
      function wikiTitelAus(routeName: string | null): string {
        if (!routeName) return "";
        const nrMatch = routeName.match(/^(\d{1,3})\s+/);
        if (nrMatch) {
          const titel = RWN_WIKI[nrMatch[1]];
          if (titel) return titel;
        }
        // Fallback: nur Zahl-Prefix abschneiden
        return routeName.replace(/^\d{1,3}\s+/, "").trim();
      }

      /** Enrich-Hilfsfunktion: OSM-IDs einpflegen + is_etappe setzen */
      async function enrichEtappenIds(canton: string | null, osmIds: number[]): Promise<void> {
        if (osmIds.length === 0) return;
        await enrichAndStore(canton ?? "CH", osmIds, log, { skipPhotos: false });
        const ids = osmIds.map((id) => `osm-${id}`);
        await db
          .update(externalRoutesTable)
          .set({ isEtappe: true })
          .where(sql`${externalRoutesTable.id} = ANY(${ids})`)
          .execute();
        fetchEtappenStatus.gespeichert += osmIds.length;
        ids.forEach((id) => bekannteIds.add(id));
      }

      for (const parent of eltern) {
        const osmId = parseInt(parent.id.replace("osm-", ""), 10);
        if (isNaN(osmId)) continue;
        fetchEtappenStatus.geprueft++;

        // ── 1. OSM Sub-Relationen ─────────────────────────────────────────
        const { results: subs, overpassOk } = await fetchSubRelations(osmId, log);
        await new Promise((r) => setTimeout(r, 1_500)); // Overpass schonen

        const neuOsm = subs.filter((s) => !bekannteIds.has(`osm-${s.osmId}`));
        if (neuOsm.length > 0) {
          fetchEtappenStatus.gefunden += neuOsm.length;
          log.info({ parent: parent.id, neuEtappen: neuOsm.length }, "fetch-etappen: OSM Etappen gefunden");
          try {
            await enrichEtappenIds(parent.canton, neuOsm.map((s) => s.osmId));
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, parent: parent.id }, "fetch-etappen: enrichAndStore (OSM) fehlgeschlagen");
          }
          continue; // OSM hat geliefert — kein Wikipedia-Fallback nötig
        }

        // ── 2. Wikipedia-Fallback ────────────────────────────────────────
        const wikiTitel = wikiTitelAus(parent.name);
        if (!wikiTitel) continue;

        const etappen = await fetchWikiEtappen(wikiTitel, log);
        if (etappen.length === 0) {
          log.info({ parent: parent.id, wikiTitel }, "fetch-etappen: kein Wikipedia-Eintrag gefunden");
          continue;
        }

        log.info({ parent: parent.id, wikiTitel, etappen: etappen.length, overpassOk }, "fetch-etappen: Wikipedia-Fallback");
        const wikiOsmIds: number[] = [];

        // OSM from/to-Suche nur wenn Overpass erreichbar war — sonst direkt Platzhalter
        if (overpassOk) {
          for (const etappe of etappen) {
            await new Promise((r) => setTimeout(r, 1_200)); // Overpass schonen
            const gefunden = await searchOsmRouteByFromTo(etappe.from, etappe.to, log);
            for (const id of gefunden) {
              if (!bekannteIds.has(`osm-${id}`) && !wikiOsmIds.includes(id)) {
                wikiOsmIds.push(id);
              }
            }
          }
        }

        if (wikiOsmIds.length > 0) {
          // OSM hat passende Relationen geliefert → normal enrich
          fetchEtappenStatus.gefunden += wikiOsmIds.length;
          log.info({ parent: parent.id, wikiTitel, wikiOsmIds }, "fetch-etappen: Wikipedia→OSM Etappen gefunden");
          try {
            await enrichEtappenIds(parent.canton, wikiOsmIds);
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, parent: parent.id }, "fetch-etappen: enrichAndStore (Wiki) fehlgeschlagen");
          }
          continue;
        }

        // OSM nicht erreichbar / keine Treffer → Wiki-Daten direkt als Platzhalter speichern
        const neuWikiEtappen = etappen.filter(
          (e) => !bekannteIds.has(`wiki-${osmId}-${e.nr}`),
        );
        if (neuWikiEtappen.length === 0) continue;

        log.info(
          { parent: parent.id, wikiTitel, anzahl: neuWikiEtappen.length },
          "fetch-etappen: Wikipedia-Platzhalter direkt gespeichert",
        );

        for (const e of neuWikiEtappen) {
          const wikiId = `wiki-${osmId}-${e.nr}`;
          const distKm = e.distKm ?? 10;
          try {
            await db
              .insert(externalRoutesTable)
              .values({
                id: wikiId,
                sagaId: parent.id, // Elternroute als Sagen-Anker
                canton: "", // wird per slice-wiki-etappen vom Startpunkt gesetzt
                name: `${parent.name.match(/^(\d{1,3})\s+/)?.[1] ?? ""} ${wikiTitel} Etappe ${e.nr} ${e.from} – ${e.to}`.trimStart(),
                distanceKm: distKm,
                distanceTagKm: e.distKm ?? null,
                ascentM: 0,
                maxElevationM: 0,
                minutes: Math.round((distKm / 4) * 60), // ~4 km/h
                sac: "unbekannt",
                terrain: "Wanderweg",
                lat: 0,
                lng: 0,
                geometry: [],
                source: "wiki",
                routeType: parent.routeType ?? "rwn",
                isEtappe: true,
              })
              .onConflictDoNothing()
              .execute();
            bekannteIds.add(wikiId);
            fetchEtappenStatus.gefunden++;
            fetchEtappenStatus.gespeichert++;
          } catch (err) {
            fetchEtappenStatus.fehler++;
            log.warn({ err, wikiId }, "fetch-etappen: Wiki-Platzhalter Insert fehlgeschlagen");
          }
        }
      }
      log.info(fetchEtappenStatus, "fetch-etappen: abgeschlossen");
    } finally {
      fetchEtappenStatus.laufend = false;
      fetchEtappenLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "fetch-etappen: unerwarteter Fehler");
    fetchEtappenStatus.laufend = false;
    fetchEtappenLaeuft = false;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /admin/routes/slice-wiki-etappen
// Schneidet die Geometrie der Elternroute für wiki-* Platzhalter-Etappen zu.
// Benutzt SBB-Bahnhof-Koordinaten (transport.opendata.ch) als Schnittpunkte,
// fällt auf Nominatim (Stadtmitte) zurück, falls kein Bahnhof gefunden.
// ─────────────────────────────────────────────────────────────────────────────

const OPENDATA_BASE_ADMIN = "https://transport.opendata.ch/v1";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";


function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/** Normalisiert einen Geometrie-Punkt zu [lat, lng] */
function toLatLng(pt: unknown): [number, number] | null {
  if (Array.isArray(pt) && pt.length >= 2) return [Number(pt[0]), Number(pt[1])];
  if (pt && typeof pt === "object") {
    const o = pt as Record<string, number>;
    if ("lat" in o && "lng" in o) return [o.lat, o.lng];
  }
  return null;
}

/** Nächster Index in geometry ab startFrom */
function nearestIdx(geom: [number, number][], lat: number, lng: number, startFrom = 0): number {
  let best = startFrom;
  let bestDist = Infinity;
  for (let i = startFrom; i < geom.length; i++) {
    const d = haversineKm(lat, lng, geom[i][0], geom[i][1]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Koordinaten via SBB-Bahnhof oder Nominatim */
async function geocodeCity(
  city: string,
  log: Logger,
): Promise<{ lat: number; lng: number; via: string } | null> {
  // 1. SBB Hauptbahnhof
  try {
    const url = `${OPENDATA_BASE_ADMIN}/locations?query=${encodeURIComponent(city)}&type=station`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const json = (await res.json()) as {
        stations: Array<{
          id: string | null;
          name: string;
          coordinate: { x: number; y: number } | null;
        }>;
      };
      // Priorisiere Schweizer Bahnhöfe (ID beginnt mit 85)
      const candidates = (json.stations ?? []).filter(
        (s): s is typeof s & { id: string; coordinate: { x: number; y: number } } =>
          !!s.id && /^\d+$/.test(s.id) && !!s.coordinate,
      );
      const best =
        candidates.find((s) => s.id.startsWith("85")) ??
        candidates.find((s) => s.id.startsWith("8")) ??
        candidates[0];
      if (best) {
        return { lat: best.coordinate.x, lng: best.coordinate.y, via: `SBB:${best.name}` };
      }
    }
  } catch (_e) {
    /* weiter zu Nominatim */
  }

  // 2. Nominatim (Stadtmitte)
  await new Promise((r) => setTimeout(r, 1100)); // Rate-Limit 1/s
  try {
    const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(city + " Schweiz")}&format=json&limit=1&countrycodes=ch,de,at,li`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "SagaTrail/1.0 (admin slice-etappen)" },
    });
    if (res.ok) {
      const json = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (json[0]) {
        return {
          lat: parseFloat(json[0].lat),
          lng: parseFloat(json[0].lon),
          via: `Nominatim:${json[0].display_name.split(",")[0]}`,
        };
      }
    }
  } catch (_e) {
    /* nichts gefunden */
  }

  log.warn({ city }, "slice-wiki: Geocoding fehlgeschlagen");
  return null;
}

/** Parst "Etappe N: FROM – TO" → { nr, from, to } */
function parseEtappeName(name: string): { nr: number; from: string; to: string } | null {
  const m = name.match(/^Etappe\s+(\d+):\s*(.+?)\s*[–\-]\s*(.+)$/);
  if (!m) return null;
  return { nr: parseInt(m[1], 10), from: m[2].trim(), to: m[3].trim() };
}

let sliceWikiLaeuft = false;
let sliceWikiStatus: {
  laufend: boolean;
  geprueft: number;
  aktualisiert: number;
  uebersprungen: number;
  fehler: number;
} = { laufend: false, geprueft: 0, aktualisiert: 0, uebersprungen: 0, fehler: 0 };

router.get("/admin/routes/slice-wiki-etappen-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(sliceWikiStatus);
});

router.post("/admin/routes/slice-wiki-etappen", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  if (sliceWikiLaeuft) {
    return res.status(409).json({ error: "Läuft bereits", status: sliceWikiStatus });
  }
  sliceWikiLaeuft = true;
  sliceWikiStatus = { laufend: true, geprueft: 0, aktualisiert: 0, uebersprungen: 0, fehler: 0 };
  res.json({ gestartet: true });

  const log: Logger = req.log;

  (async () => {
    try {
      // 1. Alle wiki-* Routen mit leerer Geometrie laden
      const wikiRouten = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          sagaId: externalRoutesTable.sagaId,
        })
        .from(externalRoutesTable)
        .where(
          and(
            sql`${externalRoutesTable.id} LIKE 'wiki-%'`,
            sql`(${externalRoutesTable.geometry}::jsonb = '[]'::jsonb OR ${externalRoutesTable.lat} = 0)`,
          ),
        );

      // 2. Elternrouten-Geometrien laden
      const parentIds = [...new Set(wikiRouten.map((r) => r.sagaId).filter(Boolean))] as string[];
      const parents = await db
        .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry })
        .from(externalRoutesTable)
        .where(sql`${externalRoutesTable.id} = ANY(ARRAY[${sql.raw(
          parentIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(","),
        )}])`);

      const parentGeom = new Map<string, [number, number][]>();
      for (const p of parents) {
        if (!p.geometry || !Array.isArray(p.geometry) || (p.geometry as unknown[]).length === 0)
          continue;
        const pts: [number, number][] = [];
        for (const raw of p.geometry as unknown[]) {
          const pt = toLatLng(raw);
          if (pt) pts.push(pt);
        }
        if (pts.length > 1) parentGeom.set(p.id, pts);
      }

      // 3. Gruppiert nach Elternroute, sortiert nach Etappennummer
      const grouped = new Map<string, typeof wikiRouten>();
      for (const r of wikiRouten) {
        if (!r.sagaId) continue;
        if (!grouped.has(r.sagaId)) grouped.set(r.sagaId, []);
        grouped.get(r.sagaId)!.push(r);
      }

      for (const [parentId, etappen] of grouped) {
        const geom = parentGeom.get(parentId); // kann null sein → reiner Geocoding-Modus

        // Etappen nach Nummer sortieren
        const sortiert = etappen
          .map((e) => ({ ...e, parsed: parseEtappeName(e.name ?? "") }))
          .filter((e): e is typeof e & { parsed: NonNullable<typeof e.parsed> } => !!e.parsed)
          .sort((a, b) => a.parsed.nr - b.parsed.nr);

        // ── Richtungserkennung (nur wenn Elterngeometrie vorhanden) ──────────
        let arbeitsGeom: [number, number][] | null = geom ?? null;
        if (arbeitsGeom && sortiert.length > 0) {
          const ersteEtappe = sortiert[0].parsed;
          const erstFromCoord = await geocodeCity(ersteEtappe.from, log);
          if (erstFromCoord) {
            const distZumAnfang = haversineKm(
              erstFromCoord.lat, erstFromCoord.lng,
              arbeitsGeom[0][0], arbeitsGeom[0][1],
            );
            const distZumEnde = haversineKm(
              erstFromCoord.lat, erstFromCoord.lng,
              arbeitsGeom[arbeitsGeom.length - 1][0], arbeitsGeom[arbeitsGeom.length - 1][1],
            );
            if (distZumEnde < distZumAnfang) {
              arbeitsGeom = [...arbeitsGeom].reverse();
              log.info(
                { parentId, distZumAnfang: distZumAnfang.toFixed(2), distZumEnde: distZumEnde.toFixed(2) },
                "slice-wiki: Geometrie umgekehrt (Etappen laufen gegen Geometrie-Richtung)",
              );
            }
          }
        } else if (!arbeitsGeom) {
          log.info({ parentId }, "slice-wiki: kein Elterngeometrie → reiner Geocoding-Modus (2-Punkte-Stubs)");
        }

        // Geocoding-Cache damit jede Stadt nur einmal abgefragt wird
        const coordCache = new Map<string, { lat: number; lng: number; via: string } | null>();
        const cachedGeocode = async (city: string) => {
          if (!coordCache.has(city)) coordCache.set(city, await geocodeCity(city, log));
          return coordCache.get(city)!;
        };

        let suchStartIdx = 0; // Monoton voranschreiten (nur bei vorhandener Geometrie relevant)

        for (const etappe of sortiert) {
          sliceWikiStatus.geprueft++;
          const { from, to } = etappe.parsed;
          log.info({ id: etappe.id, from, to }, "slice-wiki: geocodiere Schnittpunkte");

          const fromCoord = await cachedGeocode(from);
          const toCoord = await cachedGeocode(to);

          if (!fromCoord || !toCoord) {
            log.warn({ id: etappe.id, from, to }, "slice-wiki: Geocoding unvollständig – übersprungen");
            sliceWikiStatus.uebersprungen++;
            continue;
          }

          const straightLineDist = haversineKm(fromCoord.lat, fromCoord.lng, toCoord.lat, toCoord.lng);
          let segment: [number, number][];
          let usedFallback = false;

          if (!arbeitsGeom) {
            // Kein Elterngeometrie → direkt Geocoding-Stub
            segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
            usedFallback = true;
          } else {
            const fromIdx = nearestIdx(arbeitsGeom, fromCoord.lat, fromCoord.lng, suchStartIdx);
            const toIdx = nearestIdx(arbeitsGeom, toCoord.lat, toCoord.lng, fromIdx + 1);

            if (fromIdx >= toIdx) {
              segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
              usedFallback = true;
            } else {
              const candidate = arbeitsGeom.slice(fromIdx, toIdx + 1);
              const candidateDist = (() => {
                let d = 0;
                for (let i = 1; i < candidate.length; i++)
                  d += haversineKm(candidate[i-1][0], candidate[i-1][1], candidate[i][0], candidate[i][1]);
                return d;
              })();
              // Wenn Segment << Luftlinie (< 30%), war Geometrie unvollständig → Stub ehrlicher
              if (candidateDist < straightLineDist * 0.3 && straightLineDist > 2) {
                segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
                usedFallback = true;
              } else {
                segment = candidate;
                suchStartIdx = fromIdx;
              }
            }
          }

          const midPt = segment[Math.floor(segment.length / 2)];
          const distKm = (() => {
            if (usedFallback) return Math.round(straightLineDist * 10) / 10;
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1][0], segment[i - 1][1], segment[i][0], segment[i][1]);
            return Math.round(d * 10) / 10;
          })();

          // Kanton vom Startpunkt der Etappe (nicht vom Elternrouten-Kanton)
          const geoResult = await reverseGeocode(fromCoord.lat, fromCoord.lng, log).catch(() => null);
          const kantonVomStart = geoResult?.canton ?? null;

          try {
            await db
              .update(externalRoutesTable)
              .set({
                geometry: segment as unknown as typeof externalRoutesTable.geometry._,
                lat: midPt[0],
                lng: midPt[1],
                distanceKm: distKm > 0 ? distKm : undefined,
                minutes: distKm > 0 ? Math.round((distKm / 4) * 60) : undefined,
                ...(kantonVomStart ? { canton: kantonVomStart } : {}),
              })
              .where(eq(externalRoutesTable.id, etappe.id))
              .execute();

            sliceWikiStatus.aktualisiert++;
            log.info(
              {
                id: etappe.id,
                segPts: segment.length,
                distKm,
                usedFallback,
                fromVia: fromCoord.via,
                toVia: toCoord.via,
              },
              "slice-wiki: Geometrie gesetzt",
            );
          } catch (err) {
            sliceWikiStatus.fehler++;
            log.warn({ err, id: etappe.id }, "slice-wiki: DB-Update fehlgeschlagen");
          }
        }
      }

      log.info(sliceWikiStatus, "slice-wiki: abgeschlossen");
    } finally {
      sliceWikiStatus.laufend = false;
      sliceWikiLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "slice-wiki: unerwarteter Fehler");
    sliceWikiStatus.laufend = false;
    sliceWikiLaeuft = false;
  });
  return;
});

// ─── Enrich Super-Relationen & Placeholder-Etappen ───────────────────────────
let enrichSuperLaeuft = false;
let enrichSuperStatus: {
  laufend: boolean;
  resetA: number;
  behandeltB: number;
  fehlerB: number;
  log: string[];
} = { laufend: false, resetA: 0, behandeltB: 0, fehlerB: 0, log: [] };

router.get("/admin/routes/enrich-super-status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(enrichSuperStatus);
});

/**
 * POST /admin/routes/enrich-super
 *
 * Gruppe A: 24 osm-* Super-Relationen (geometry_version=-1) → auf 0 zurücksetzen,
 *           damit der Enrich-Loop sie mit dem neuen SuperDeep-Fallback verarbeitet.
 * Gruppe B:  9 placeholder-*-Etappen → Geometrie via Wikipedia + Elternroute schneiden.
 */
router.post("/admin/routes/enrich-super", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  if (enrichSuperLaeuft) {
    res.json({ ok: false, message: "Läuft bereits", status: enrichSuperStatus });
    return;
  }
  enrichSuperLaeuft = true;
  enrichSuperStatus = { laufend: true, resetA: 0, behandeltB: 0, fehlerB: 0, log: [] };
  res.json({ ok: true, message: "Gestartet — Status via GET /admin/routes/enrich-super-status" });

  const log: Logger = req.log;
  const addLog = (s: string) => {
    enrichSuperStatus.log.push(s);
    log.info(s);
  };

  // Wikipedia-Artikel für fehlende NWN/RWN-Etappen
  const PLACEHOLDER_WIKI: Record<string, Record<string, string>> = {
    nwn: {
      "2": "Trans Swiss Trail",
      "4": "Via Jacobi",
      "5": "Jura-Höhenweg",
      "6": "Voie des Alpes",
    },
    rwn: {
      "62": "Walserweg Gottardo",
    },
  };

  (async () => {
    try {
      // ── Gruppe A: osm-* Super-Relationen ohne Geometrie → zurücksetzen ──────
      const gruppeA = await db
        .select({ id: externalRoutesTable.id })
        .from(externalRoutesTable)
        .where(
          and(
            sql`geometry_version = -1`,
            sql`${externalRoutesTable.id} LIKE 'osm-%'`,
          ),
        );

      if (gruppeA.length > 0) {
        const ids = gruppeA.map((r) => r.id);
        for (const slice of [ids]) {
          await db
            .update(externalRoutesTable)
            .set({ geometryVersion: 0 })
            .where(
              sql`${externalRoutesTable.id} = ANY(ARRAY[${sql.raw(slice.map((id) => `'${id.replace(/'/g, "''")}'`).join(","))}])`,
            );
        }
        enrichSuperStatus.resetA = ids.length;
        addLog(`Gruppe A: ${ids.length} osm-* Super-Relationen → geometry_version=0 (enrich-loop mit SuperDeep-Fallback übernimmt)`);
      } else {
        addLog("Gruppe A: keine osm-* Routen mit geometry_version=-1");
      }

      // ── Gruppe B: placeholder-Etappen → Geometrie aus Elternroute schneiden ─
      const gruppeB = await db
        .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
        .from(externalRoutesTable)
        .where(
          and(
            sql`geometry_version = -1`,
            sql`${externalRoutesTable.id} LIKE 'placeholder-%'`,
          ),
        );

      addLog(`Gruppe B: ${gruppeB.length} Placeholder-Etappen`);

      for (const etappe of gruppeB) {
        const m = /^placeholder-(nwn|rwn)-(\d+)-etappe-(\d+)$/.exec(etappe.id);
        if (!m) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: unbekanntes ID-Format`);
          continue;
        }
        const [, network, ref, stageStr] = m;
        const stageNr = parseInt(stageStr!, 10);

        const wikiTitle = PLACEHOLDER_WIKI[network!]?.[ref!];
        if (!wikiTitle) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: kein Wiki-Artikel für ${network}-${ref}`);
          continue;
        }

        // Elternroute in DB: name LIKE 'ref %', hat Geometrie
        const parents = await db
          .select({ id: externalRoutesTable.id, geometry: externalRoutesTable.geometry })
          .from(externalRoutesTable)
          .where(
            and(
              sql`geometry_version > 0`,
              sql`${externalRoutesTable.id} LIKE 'osm-%'`,
              sql`${externalRoutesTable.name} LIKE ${ref + " %"}`,
              eq(externalRoutesTable.isEtappe, false),
            ),
          )
          .limit(1);

        const parent = parents[0];
        let parentGeom: [number, number][] | null = null;
        if (parent?.geometry && Array.isArray(parent.geometry)) {
          const pts: [number, number][] = [];
          for (const raw of parent.geometry as unknown[]) {
            const pt = toLatLng(raw);
            if (pt) pts.push(pt);
          }
          if (pts.length > 1) parentGeom = pts;
        }
        addLog(`  ${etappe.id}: Wiki="${wikiTitle}", Eltern=${parent?.id ?? "—"} (${parentGeom?.length ?? 0} Punkte)`);

        // ── Strategie 1: Wikipedia-Etappen (bereits bekannte Artikel) ───────
        let stageFrom: string | null = null;
        let stageTo: string | null = null;
        let stageDistKm: number | null = null;
        let directGeom: [number, number][] | null = null;

        const wikiEtappen = await fetchWikiEtappen(wikiTitle, log).catch((): WikiEtappe[] => []);
        const stageData = wikiEtappen.find((e) => e.nr === stageNr);
        if (stageData?.from && stageData?.to) {
          stageFrom = stageData.from;
          stageTo = stageData.to;
          stageDistKm = stageData.distKm ?? null;
          addLog(`  → Wikipedia: Etappe ${stageNr}: ${stageFrom} – ${stageTo} (${stageDistKm ?? "?"}km)`);
        } else {
          addLog(`  Wikipedia lieferte ${wikiEtappen.length} Etappen (Etappe ${stageNr} nicht dabei) — OSM-Fallback`);

          // ── Strategie 2: Direkt OSM-Sub-Relationen ───────────────────────
          const osmCandidates = await fetchOsmRelationsByRef(ref!, log);
          const anyEtappeRe = /(etappe|étape|tappa|stage)/i;
          // Parent-Kandidaten: selbes Netzwerk, kein Etappen-Name
          const parentCandidates = osmCandidates.filter(
            (r) => r.network === network && !anyEtappeRe.test(r.name ?? ""),
          );
          const topCandidates = parentCandidates.slice(0, 4);
          addLog(`  OSM: ${osmCandidates.length} Relationen mit ref=${ref!}, ${parentCandidates.length} Eltern-Kandidaten (prüfe ${topCandidates.length})`);

          for (const pc of topCandidates) {
            const { results: subRels } = await fetchSubRelations(pc.osmId, log);
            // Sub-Relation mit passender Etappennummer suchen
            const stageRe = new RegExp(
              String.raw`(?:etappe|étape|tappa|stage)\s*0?${stageNr}\b`,
              "i",
            );
            const match = subRels.find((s) => stageRe.test(s.name ?? "") || s.ref === String(stageNr));
            if (match) {
              addLog(`  OSM: Sub-Relation gefunden: ${match.osmId} "${match.name ?? match.ref}"`);
              const rawGeoArr = await fetchRouteGeometries([match.osmId], log, {
                batchSize: 1,
                timeoutMs: 60_000,
              }).catch(() => []);
              const rawGeo = rawGeoArr[0];
              if (rawGeo?.points && rawGeo.points.length >= 2) {
                directGeom = rawGeo.points.map((p) => [p.lat, p.lng] as [number, number]);
                stageDistKm = rawGeo.distanceTagKm ?? null;
                addLog(`  ✓ OSM: ${directGeom.length} Punkte geladen`);
              }
              break;
            }
          }

          if (!directGeom) {
            enrichSuperStatus.fehlerB++;
            addLog(`  ✗ ${etappe.id}: weder Wikipedia noch OSM haben Etappe ${stageNr}`);
            continue;
          }
        }

        // ── Geometrie: entweder direkt aus OSM oder via from/to aus Elternroute ─
        let segment: [number, number][];
        let distKm: number;

        if (directGeom) {
          segment = directGeom;
          distKm = stageDistKm ?? (() => {
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1]![0], segment[i - 1]![1], segment[i]![0], segment[i]![1]);
            return Math.round(d * 10) / 10;
          })();
        } else {
          // from/to über Geocoding + Elternroute schneiden
          const fromCoord = await geocodeCity(stageFrom!, log).catch(() => null);
          const toCoord = await geocodeCity(stageTo!, log).catch(() => null);
          if (!fromCoord || !toCoord) {
            enrichSuperStatus.fehlerB++;
            addLog(`  ✗ ${etappe.id}: Geocoding fehlgeschlagen (${stageFrom} / ${stageTo})`);
            continue;
          }
          if (parentGeom) {
            const fromIdx = nearestIdx(parentGeom, fromCoord.lat, fromCoord.lng, 0);
            const toIdx = nearestIdx(parentGeom, toCoord.lat, toCoord.lng, fromIdx + 1);
            segment = fromIdx < toIdx
              ? parentGeom.slice(fromIdx, toIdx + 1)
              : [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
          } else {
            segment = [[fromCoord.lat, fromCoord.lng], [toCoord.lat, toCoord.lng]];
          }
          distKm = stageDistKm ?? (() => {
            let d = 0;
            for (let i = 1; i < segment.length; i++)
              d += haversineKm(segment[i - 1]![0], segment[i - 1]![1], segment[i]![0], segment[i]![1]);
            return Math.round(d * 10) / 10;
          })();
        }

        const midPt = segment[Math.floor(segment.length / 2)]!;
        const geoResult = await reverseGeocode(midPt[0], midPt[1], log).catch(() => null);
        const canton = geoResult?.canton ?? null;

        try {
          await db
            .update(externalRoutesTable)
            .set({
              geometry: segment as unknown as typeof externalRoutesTable.geometry._,
              lat: midPt[0],
              lng: midPt[1],
              distanceKm: distKm > 0 ? distKm : undefined,
              minutes: distKm > 0 ? Math.round((distKm / 4) * 60) : undefined,
              geometryVersion: GEOMETRY_VERSION,
              ...(canton ? { canton } : {}),
            })
            .where(eq(externalRoutesTable.id, etappe.id))
            .execute();

          enrichSuperStatus.behandeltB++;
          addLog(`  ✓ ${etappe.id}: gespeichert (${segment.length} Punkte, ${distKm}km, ${canton ?? "?"})`);
        } catch (err) {
          enrichSuperStatus.fehlerB++;
          addLog(`  ✗ ${etappe.id}: DB-Update fehlgeschlagen`);
          log.warn({ err, id: etappe.id }, "enrich-super: DB-Fehler");
        }
      }

      addLog(
        `Fertig: A=${enrichSuperStatus.resetA} zurückgesetzt, B=${enrichSuperStatus.behandeltB} behandelt, Fehler=${enrichSuperStatus.fehlerB}`,
      );
    } finally {
      enrichSuperStatus.laufend = false;
      enrichSuperLaeuft = false;
    }
  })().catch((err) => {
    log.error({ err }, "enrich-super: unerwarteter Fehler");
    enrichSuperStatus.laufend = false;
    enrichSuperLaeuft = false;
  });
});

// ---------------------------------------------------------------------------
// POST /admin/migrate-20260731
// Einmalige Datenmigration: Route-43-Korrekturen + Parent-Geometrien restitch
// Nur einmal gegen Prod aufrufen nach Publish.
// ---------------------------------------------------------------------------
const migrate20260731Status = { done: false, log: [] as string[] };

router.post("/migrate-20260731", (req, res) => {
  if (!requireAdminToken(req, res)) return;

  const addLog = (msg: string) => {
    migrate20260731Status.log.push(msg);
    console.log("[migrate-20260731]", msg);
  };

  res.json({ ok: true, message: "Migration gestartet – GET /admin/migrate-20260731/status für Fortschritt" });

  (async () => {
    if (migrate20260731Status.done) { addLog("Bereits ausgeführt."); return; }
    addLog("=== Migration 2026-07-31 Start ===");

    // -----------------------------------------------------------------------
    // 1. Route 43 Etappen-Korrekturen
    // -----------------------------------------------------------------------
    const etappenUpdates: Array<{ id: string; name: string; isEtappe: boolean; distanceKm?: number; distanceTagKm?: number; ascentM?: number }> = [
      { id: "osm-17065236", name: "43 Jakobsweg Graubünden Etappe 13 Tamins - Trin Digg",  isEtappe: true, distanceKm: 4.9, distanceTagKm: 5,  ascentM: 260 },
      { id: "osm-20113042", name: "43 Jakobsweg Graubünden Etappe 19 Rueras - Oberalppass", isEtappe: true, distanceTagKm: 12, ascentM: 1050 },
      { id: "osm-20113013", name: "43 Jakobsweg Graubünden Etappe 18 Disentis - Rueras",   isEtappe: true, distanceTagKm: 12, ascentM: 500 },
      { id: "osm-17057573", name: "43 Jakobsweg Graubünden Etappe 1 Müstair - Lü",          isEtappe: true, distanceTagKm: 18, ascentM: 820 },
      { id: "osm-17057571", name: "43 Jakobsweg Graubünden Etappe 2 Lü - S-charl",          isEtappe: true, distanceTagKm: 15, ascentM: 500 },
      { id: "osm-17057572", name: "43 Jakobsweg Graubünden Etappe 3 S-charl - Scuol",       isEtappe: true, distanceTagKm: 14, ascentM: 280 },
      { id: "osm-17059092", name: "43 Jakobsweg Graubünden Etappe 7 S-chanf (Cinuos-chel) - Dürrboden", isEtappe: true, distanceTagKm: 18, ascentM: 1050 },
      { id: "osm-17064977", name: "43 Jakobsweg Graubünden Etappe 8 Dürrboden - Davos Dorf", isEtappe: true, ascentM: 70 },
      { id: "osm-20112862", name: "43 Jakobsweg Graubünden Etappe 10 Langwies - Tschiertschen", isEtappe: true, ascentM: 640 },
      { id: "osm-20112882", name: "43 Jakobsweg Graubünden Etappe 11 Tschiertschen - Chur",  isEtappe: true, ascentM: 240 },
      { id: "osm-17065237", name: "43 Jakobsweg Graubünden Etappe 12 Chur - Tamins",         isEtappe: true, distanceTagKm: 13, ascentM: 360 },
      { id: "osm-17066113", name: "43 Jakobsweg Graubünden Etappe 14 Trin Digg - Laax (Falera)", isEtappe: true, distanceTagKm: 17, ascentM: 950 },
      { id: "osm-17066346", name: "43 Jakobsweg Graubünden Etappe 15 Laax (Falera) - Brigels (Andiast)", isEtappe: true, distanceTagKm: 21, ascentM: 800 },
      { id: "osm-17066412", name: "43 Jakobsweg Graubünden Etappe 16 Brigels (Andiast) - Trun", isEtappe: true, ascentM: 727 },
    ];

    for (const u of etappenUpdates) {
      try {
        await db
          .update(externalRoutesTable)
          .set({
            name: u.name,
            isEtappe: u.isEtappe,
            ...(u.distanceKm    !== undefined ? { distanceKm:    u.distanceKm }    : {}),
            ...(u.distanceTagKm !== undefined ? { distanceTagKm: u.distanceTagKm } : {}),
            ...(u.ascentM       !== undefined ? { ascentM:       u.ascentM }       : {}),
          })
          .where(eq(externalRoutesTable.id, u.id))
          .execute();
        addLog(`✓ Etappe ${u.id} aktualisiert`);
      } catch (err) {
        addLog(`✗ Etappe ${u.id} Fehler: ${err}`);
      }
    }

    // -----------------------------------------------------------------------
    // 2. Parent-Routen: distance_tag_km, ascent_m korrigieren + gv=-1 setzen
    // -----------------------------------------------------------------------
    const parentUpdates: Array<{ id: string; distanceTagKm?: number; ascentM?: number }> = [
      { id: "schweizmobil-rwn-43", distanceTagKm: 265,    ascentM: 11140 },
      { id: "schweizmobil-rwn-24", distanceTagKm: 100,    ascentM: 220 },
      { id: "schweizmobil-rwn-32", distanceTagKm: 87 },
      { id: "schweizmobil-rwn-55", distanceTagKm: 172,    ascentM: 7590 },
      { id: "schweizmobil-rwn-60", distanceTagKm: 110 },
      { id: "schweizmobil-rwn-64", distanceTagKm: 110,    ascentM: 4520 },
      { id: "schweizmobil-rwn-71", distanceTagKm: 45.7 },
      { id: "schweizmobil-rwn-80", distanceTagKm: 52 },
      { id: "schweizmobil-rwn-83", distanceTagKm: 66 },
      { id: "schweizmobil-rwn-86", distanceTagKm: 94 },
      { id: "schweizmobil-rwn-87", distanceTagKm: 132.8 },
      { id: "schweizmobil-rwn-98", distanceTagKm: 114 },
      { id: "schweizmobil-rwn-99", distanceTagKm: 34,     ascentM: 1380 },
    ];

    for (const p of parentUpdates) {
      try {
        await db
          .update(externalRoutesTable)
          .set({
            ...(p.distanceTagKm !== undefined ? { distanceTagKm: p.distanceTagKm } : {}),
            ...(p.ascentM       !== undefined ? { ascentM:       p.ascentM }       : {}),
            geometryVersion: -1,
          })
          .where(eq(externalRoutesTable.id, p.id))
          .execute();
        addLog(`✓ Parent ${p.id} → tagKm=${p.distanceTagKm ?? "unbeh."}, gv=-1`);
      } catch (err) {
        addLog(`✗ Parent ${p.id} Fehler: ${err}`);
      }
    }

    // -----------------------------------------------------------------------
    // 3. Restitch: Parents mit gv=-1 aus Etappen neu aufbauen
    // -----------------------------------------------------------------------
    addLog("--- Restitch Start ---");

    const R = 6371;
    const hav = (a: [number, number], b: [number, number]) => {
      const dLat = ((b[0] - a[0]) * Math.PI) / 180;
      const dLng = ((b[1] - a[1]) * Math.PI) / 180;
      const s = Math.sin(dLat / 2) ** 2 +
        Math.cos(a[0] * Math.PI / 180) * Math.cos(b[0] * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s));
    };

    const normGeo = (g: unknown): [number, number][] | null => {
      if (!g) return null;
      try {
        const parsed = typeof g === "string" ? JSON.parse(g) : g;
        if (!Array.isArray(parsed) || parsed.length < 2) return null;
        return parsed.map((p: unknown) =>
          Array.isArray(p) ? [p[0], p[1]] : [(p as any).lat ?? (p as any)[0], (p as any).lng ?? (p as any)[1]]
        );
      } catch { return null; }
    };

    const etappenNrFromName = (name: string): number | null => {
      const m = name.match(/(?:Etappe|Étape|Etape|Tappa|Stage)\s+(\d+)/i);
      return m ? parseInt(m[1], 10) : null;
    };

    const stitch = (segs: [number, number][][]): [number, number][] => {
      let chain = segs[0].slice();
      for (let i = 1; i < segs.length; i++) {
        const seg = segs[i].slice();
        const end = chain[chain.length - 1];
        if (hav(end, seg[seg.length - 1]) < hav(end, seg[0])) seg.reverse();
        chain = chain.concat(seg);
      }
      return chain;
    };

    // Alle Parents mit gv=-1 laden (nur die, die wir gerade gesetzt haben)
    const targetParentIds = parentUpdates.map(p => p.id);

    const parentsToStitch = await db
      .select({ id: externalRoutesTable.id, name: externalRoutesTable.name })
      .from(externalRoutesTable)
      .where(
        and(
          inArray(externalRoutesTable.id, targetParentIds),
          eq(externalRoutesTable.geometryVersion, -1)
        )
      )
      .execute();

    addLog(`${parentsToStitch.length} Parents zum Restitch gefunden`);

    for (const parent of parentsToStitch) {
      // Etappen dieses Parents laden (via saga_id)
      const etappen = await db
        .select({
          id: externalRoutesTable.id,
          name: externalRoutesTable.name,
          geometry: externalRoutesTable.geometry,
        })
        .from(externalRoutesTable)
        .where(
          and(
            eq(externalRoutesTable.sagaId, parent.id),
            eq(externalRoutesTable.isEtappe, true)
          )
        )
        .execute();

      if (etappen.length === 0) {
        addLog(`SKIP ${parent.id} — keine Etappen verlinkt`);
        continue;
      }

      const withGeo = etappen
        .map(e => ({ ...e, pts: normGeo(e.geometry) }))
        // Mindestens 3 Punkte: 2-Punkt-Etappen sind Geraden (wiki-Platzhalter)
        // und dürfen die Parent-Geometrie nicht einfrieren (#72)
        .filter(e => e.pts && e.pts.length >= 3);

      if (withGeo.length < etappen.length) {
        addLog(`SKIP ${parent.id} — ${etappen.length - withGeo.length}/${etappen.length} Etappen ohne Geo`);
        continue;
      }

      // Nach Etappen-Nummer sortieren
      const ordered = [...withGeo].sort((a, b) => {
        const na = etappenNrFromName(a.name ?? "");
        const nb = etappenNrFromName(b.name ?? "");
        if (na !== null && nb !== null) return na - nb;
        return 0;
      });

      try {
        const chain = stitch(ordered.map(e => e.pts!));
        const rounded = chain.map(([lat, lng]) => [
          Math.round(lat * 1e6) / 1e6,
          Math.round(lng * 1e6) / 1e6,
        ]);

        await db
          .update(externalRoutesTable)
          .set({ geometry: rounded as any, geometryVersion: 5 })
          .where(eq(externalRoutesTable.id, parent.id))
          .execute();

        addLog(`✓ Restitch ${parent.id}: ${ordered.length} Etappen → ${rounded.length} Punkte`);
      } catch (err) {
        addLog(`✗ Restitch ${parent.id} Fehler: ${err}`);
      }
    }

    migrate20260731Status.done = true;
    addLog("=== Migration 2026-07-31 FERTIG ===");
  })().catch(err => {
    migrate20260731Status.log.push(`FATAL: ${err}`);
    console.error("[migrate-20260731] Fehler:", err);
  });
});

router.get("/migrate-20260731/status", (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json(migrate20260731Status);
});

// ---------------------------------------------------------------------------
// POST /admin/sagas/geocode-ungefaehr
// Liest alle Sagen mit koordinaten_sicherheit='ungefaehr', extrahiert per
// Claude den spezifischsten genannten Ort aus dem Summary und geocodiert
// ihn via Nominatim. Wenn der Treffer <30 km vom bestehenden Mittelpunkt
// liegt, wird lat/lng + sicherheit='exakt' in die DB geschrieben.
// Gibt einen vollständigen Report zurück (aktualisiert / nicht gefunden / Fehler).
// ---------------------------------------------------------------------------
router.post("/admin/sagas/geocode-ungefaehr", async (req, res): Promise<void> => {
  if (!requireAdminToken(req, res)) return;
  const dryRun = req.query.dry === "1";

  const sagas = await db
    .select({
      id: catalogSagasTable.id,
      title: catalogSagasTable.title,
      canton: catalogSagasTable.canton,
      summary: catalogSagasTable.summary,
      lat: catalogSagasTable.lat,
      lng: catalogSagasTable.lng,
    })
    .from(catalogSagasTable)
    .where(eq(catalogSagasTable.koordinatenSicherheit, "ungefaehr"));

  req.log.info({ count: sagas.length, dryRun }, "Starte Geocodierung ungefähr-Sagen");

  const results: {
    title: string;
    canton: string;
    status: "aktualisiert" | "kein_ort" | "zu_weit" | "geocode_fehler" | "ki_fehler";
    ort?: string;
    lat?: number;
    lng?: number;
    distKm?: number;
  }[] = [];

  const NOMINATIM_UA = "SagaTrail/1.0 (Swiss hiking app)";
  const MAX_DIST_KM = 30;

  for (const saga of sagas) {
    await new Promise((r) => setTimeout(r, 1100)); // Nominatim: max 1 req/s

    // 1. Ortsname per Claude extrahieren
    let ortName: string | null = null;
    try {
      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 64,
        messages: [{
          role: "user",
          content: [
            `Sage: "${saga.title}" (Kanton ${saga.canton})`,
            `Summary: ${saga.summary}`,
            ``,
            `Aufgabe: Nenne NUR den spezifischsten konkreten Ort, der im Summary explizit erwähnt wird`,
            `(z.B. "Rheinfähre Basel", "Spalentor Basel", "Teufelsbrücke Andermatt").`,
            `Wenn kein konkreter Ort genannt wird, antworte exakt: KEIN_ORT`,
            `Keine Erklärung, nur der Ortsname oder KEIN_ORT.`,
          ].join("\n"),
        }],
      });
      const block = msg.content.find((b) => b.type === "text");
      const raw = block?.type === "text" ? block.text.trim() : "KEIN_ORT";
      ortName = raw === "KEIN_ORT" || raw.length < 3 ? null : raw;
    } catch {
      results.push({ title: saga.title, canton: saga.canton, status: "ki_fehler" });
      continue;
    }

    if (!ortName) {
      results.push({ title: saga.title, canton: saga.canton, status: "kein_ort" });
      continue;
    }

    // 2. Geocodieren via Nominatim (Schweiz + Liechtenstein)
    let hitLat: number | null = null;
    let hitLng: number | null = null;
    try {
      const query = `${ortName}, ${saga.canton}, Schweiz`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ch,li`;
      const resp = await fetch(url, { headers: { "User-Agent": NOMINATIM_UA }, signal: AbortSignal.timeout(8000) });
      const hits = await resp.json() as { lat: string; lon: string }[];
      if (hits.length > 0) {
        hitLat = parseFloat(hits[0].lat);
        hitLng = parseFloat(hits[0].lon);
      }
    } catch {
      results.push({ title: saga.title, canton: saga.canton, status: "geocode_fehler", ort: ortName });
      continue;
    }

    if (hitLat === null || hitLng === null) {
      results.push({ title: saga.title, canton: saga.canton, status: "geocode_fehler", ort: ortName });
      continue;
    }

    // 3. Distanz zum bestehenden Mittelpunkt prüfen
    const distKm = saga.lat && saga.lng
      ? Math.sqrt(
          Math.pow((hitLat - saga.lat) * 111.32, 2) +
          Math.pow((hitLng - saga.lng) * 111.32 * Math.cos((saga.lat * Math.PI) / 180), 2)
        )
      : 0;

    if (distKm > MAX_DIST_KM) {
      results.push({ title: saga.title, canton: saga.canton, status: "zu_weit", ort: ortName, lat: hitLat, lng: hitLng, distKm: Math.round(distKm) });
      continue;
    }

    // 4. DB updaten
    if (!dryRun) {
      await db
        .update(catalogSagasTable)
        .set({ lat: hitLat, lng: hitLng, koordinatenSicherheit: "exakt" })
        .where(eq(catalogSagasTable.id, saga.id));
    }
    results.push({ title: saga.title, canton: saga.canton, status: "aktualisiert", ort: ortName, lat: hitLat, lng: hitLng, distKm: Math.round(distKm) });
    req.log.info({ title: saga.title, ort: ortName, lat: hitLat, lng: hitLng, distKm, dryRun }, "Saga geocodiert");
  }

  const summary = {
    gesamt: sagas.length,
    aktualisiert: results.filter((r) => r.status === "aktualisiert").length,
    kein_ort: results.filter((r) => r.status === "kein_ort").length,
    zu_weit: results.filter((r) => r.status === "zu_weit").length,
    fehler: results.filter((r) => ["geocode_fehler", "ki_fehler"].includes(r.status)).length,
    dryRun,
  };
  req.log.info(summary, "Geocodierung abgeschlossen");
  res.json({ summary, results });
});

export default router;

