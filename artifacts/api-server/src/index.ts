import app from "./app";
import { logger } from "./lib/logger";
import { seedCatalog } from "./lib/catalogSeed";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { warmAllCantonCaches, startDailyCantonSync, startDailySchweizMobilHandicapSync, fillMissingRoutePhotos, fixArtefaktRouten, GEOMETRY_VERSION } from "./lib/routeService";
import { startEnrichAllIfNeeded, scheduleNightlyRestitch } from "./routes/admin";
import { attachGroupsSocket } from "./ws/groupsSocket";
import { startWeatherNotificationCron } from "./lib/weatherNotifications";
import { db, externalRoutesTable } from "@workspace/db";
import { eq, gte, isNotNull } from "drizzle-orm";
import { vorbelegeVergebeneUrls } from "./lib/commonsPhoto";
import { sql } from "drizzle-orm";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Android-Beta-Tester-Tabelle (idempotent).
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS android_beta_testers (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email        TEXT NOT NULL UNIQUE,
        name         TEXT,
        added_to_play BOOLEAN NOT NULL DEFAULT FALSE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Schema-Migration: android_beta_testers sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration android_beta_testers fehlgeschlagen (nicht kritisch)");
  }

  // Schema-Migrations: additive Spalten idempotent nachziehen.
  try {
    await db.execute(sql`
      ALTER TABLE partner_anfragen
        ADD COLUMN IF NOT EXISTS typ text NOT NULL DEFAULT 'anfrage',
        ADD COLUMN IF NOT EXISTS vertrag_zurueck BOOLEAN NOT NULL DEFAULT FALSE
    `);
    logger.info("Schema-Migration: typ-Spalte sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration typ-Spalte fehlgeschlagen (nicht kritisch)");
  }

  // Partner-Tabelle: neue Spalten (idempotent, Prod-DB nachrüsten).
  try {
    await db.execute(sql`
      ALTER TABLE partners
        ADD COLUMN IF NOT EXISTS beschreibung text,
        ADD COLUMN IF NOT EXISTS angebot text,
        ADD COLUMN IF NOT EXISTS foto_url text,
        ADD COLUMN IF NOT EXISTS telefon text,
        ADD COLUMN IF NOT EXISTS website_url text,
        ADD COLUMN IF NOT EXISTS reservierung_url text,
        ADD COLUMN IF NOT EXISTS oeffnungszeiten text,
        ADD COLUMN IF NOT EXISTS stripe_customer_id text,
        ADD COLUMN IF NOT EXISTS stripe_subscription_id text
    `);
    // lat/lng sind jetzt optional (für via Stripe ongeboardete Partner ohne Adresse)
    await db.execute(sql`
      ALTER TABLE partners
        ALTER COLUMN lat DROP NOT NULL,
        ALTER COLUMN lng DROP NOT NULL
    `);
    logger.info("Schema-Migration: partners-Spalten sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration partners-Spalten fehlgeschlagen (nicht kritisch)");
  }

  // Massen-E-Mail-Log-Tabellen (idempotent).
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS partner_email_log (
        id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id    UUID NOT NULL,
        subject        TEXT NOT NULL,
        email          TEXT NOT NULL,
        recipient_name TEXT,
        status         TEXT NOT NULL,
        error          TEXT,
        sent_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS partner_email_blocklist (
        id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email      TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pel_campaign ON partner_email_log(campaign_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pel_email    ON partner_email_log(email)`);
    logger.info("Schema-Migration: partner_email_log + blocklist sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration partner_email_log fehlgeschlagen (nicht kritisch)");
  }

  // Partner-Leads-Tabelle: zentrale Lead-Datenbank (ersetzt WP-MySQL).
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS partner_leads (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        quelle      TEXT        NOT NULL DEFAULT 'leads',
        osm_id      TEXT,
        name        TEXT        NOT NULL,
        email       TEXT,
        kanton      TEXT        NOT NULL DEFAULT '',
        sprache     TEXT        NOT NULL DEFAULT 'DE',
        route       TEXT        NOT NULL DEFAULT '',
        typ         TEXT        NOT NULL DEFAULT '',
        kategorie   TEXT,
        satz        TEXT,
        adresse     TEXT,
        telefon     TEXT,
        website     TEXT,
        route_id    TEXT,
        lat         REAL,
        lng         REAL,
        tier        TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pl_quelle_osm
        ON partner_leads(quelle, osm_id)
        WHERE osm_id IS NOT NULL
    `);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pl_orgs_email
        ON partner_leads(email)
        WHERE quelle = 'orgs' AND email IS NOT NULL
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pl_kanton ON partner_leads(kanton)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pl_quelle ON partner_leads(quelle)`);
    logger.info("Schema-Migration: partner_leads sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration partner_leads fehlgeschlagen (nicht kritisch)");
  }


  // partner_anfragen: Vertrag-Konditionen-Spalten (idempotent).
  try {
    await db.execute(sql`ALTER TABLE partner_anfragen ADD COLUMN IF NOT EXISTS preis_chf INTEGER`);
    await db.execute(sql`ALTER TABLE partner_anfragen ADD COLUMN IF NOT EXISTS laufzeit_start TIMESTAMPTZ`);
    await db.execute(sql`ALTER TABLE partner_anfragen ADD COLUMN IF NOT EXISTS laufzeit_ende TIMESTAMPTZ`);
    logger.info("Schema-Migration: partner_anfragen Vertrag-Spalten sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration partner_anfragen Vertrag-Spalten fehlgeschlagen (nicht kritisch)");
  }

  // Verbands-Tabelle: logo_url-Spalte (idempotent).
  try {
    await db.execute(sql`
      ALTER TABLE verbands
        ADD COLUMN IF NOT EXISTS logo_url text
    `);
    logger.info("Schema-Migration: verbands.logo_url sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration verbands.logo_url fehlgeschlagen (nicht kritisch)");
  }

  // verband_anfragen Tabelle anlegen (idempotent — fehlte bisher komplett).
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS verband_anfragen (
        id                TEXT        PRIMARY KEY,
        verband_name      TEXT        NOT NULL,
        email             TEXT        NOT NULL,
        kontakt_name      TEXT        NOT NULL,
        kontakt_telefon   TEXT,
        kantone           TEXT        NOT NULL,
        status            TEXT        NOT NULL DEFAULT 'neu',
        contract_sent_at  TIMESTAMPTZ,
        notizen           TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    logger.info("Schema-Migration: verband_anfragen sichergestellt");
  } catch (migErr) {
    logger.warn({ err: migErr }, "Schema-Migration verband_anfragen fehlgeschlagen (nicht kritisch)");
  }

  // Einmalig: aufgelöste Betreffs in partner_email_log auf Template-Form korrigieren
  // damit der Dedup-Check bei variablen Betreffs (%NAME% etc.) korrekt greift.
  try {
    const fixed = await db.execute(sql`
      UPDATE partner_email_log
      SET subject = '%NAME% – Ihr Restaurant in der SagaTrail-Wander-App?'
      WHERE subject LIKE '% – Ihr Restaurant in der SagaTrail-Wander-App?'
        AND subject NOT LIKE '%NAME%'
    `);
    if ((fixed.rowCount ?? 0) > 0) {
      logger.info({ count: fixed.rowCount }, "Migration: email_log Betreffs auf Template korrigiert");
    }
  } catch (migErr) {
    logger.warn({ err: migErr }, "Migration email_log Betreffs fehlgeschlagen (nicht kritisch)");
  }

  // Stripe: Schema + Webhook + Backfill (im Hintergrund, nicht blockierend).
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    runMigrations({ databaseUrl })
      .then(() => getStripeSync())
      .then(async (stripeSync) => {
        const webhookBase = `https://${(process.env.REPLIT_DOMAINS ?? "").split(",")[0]}`;
        await stripeSync.findOrCreateManagedWebhook(`${webhookBase}/api/stripe/webhook`);
        logger.info("Stripe-Webhook konfiguriert");
        stripeSync.syncBackfill().catch((e) => logger.warn({ err: e }, "Stripe syncBackfill fehlgeschlagen"));
      })
      .catch((e) => logger.warn({ err: e }, "Stripe-Init fehlgeschlagen (nicht kritisch)"));
  } else {
    logger.warn("DATABASE_URL fehlt — Stripe-Init übersprungen");
  }

  // Schema-Migration: neue Spalten die per ALTER TABLE hinzugefügt wurden,
  // aber noch nicht in der Prod-DB existieren (IF NOT EXISTS = idempotent).
  try {
    await db.execute(
      sql`ALTER TABLE catalog_sagas ADD COLUMN IF NOT EXISTS ort_name TEXT`
    );
  } catch (colErr) {
    logger.warn({ err: colErr }, "Spalten-Migration ort_name fehlgeschlagen (nicht kritisch)");
  }

  // Difficulty provenance is additive so existing production route caches
  // remain readable during rollout.
  try {
    await db.execute(sql`
      ALTER TABLE external_routes
        ADD COLUMN IF NOT EXISTS sac_source TEXT NOT NULL DEFAULT 'unknown',
        ADD COLUMN IF NOT EXISTS schweizmobil_condition TEXT,
        ADD COLUMN IF NOT EXISTS schweizmobil_technique TEXT
    `);
    logger.info("Schema-Migration: Difficulty-Quellen sichergestellt");
  } catch (colErr) {
    logger.warn({ err: colErr }, "Spalten-Migration Difficulty fehlgeschlagen (nicht kritisch)");
  }

  // Katalog beim Start idempotent seeden, damit die App sofort Daten sieht.
  try {
    await seedCatalog();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Katalog-Seeding fehlgeschlagen");
  }

  // Vergebene Foto-URLs aus der DB vorbelegen, damit die in-memory-Dedupe
  // (vergebeneUrls) auch nach einem Neustart weiss, welche Bilder schon an
  // Routen haengen — sonst waehlen benachbarte Routen dasselbe Panoramabild.
  try {
    const zeilen = await db
      .selectDistinct({ photoUrl: externalRoutesTable.photoUrl })
      .from(externalRoutesTable)
      .where(isNotNull(externalRoutesTable.photoUrl));
    const anzahl = vorbelegeVergebeneUrls(zeilen.map((z) => z.photoUrl));
    logger.info({ anzahl }, "Vergebene Foto-URLs aus DB vorbelegt");
  } catch (err) {
    logger.warn({ err }, "Vorbelegung vergebener Foto-URLs fehlgeschlagen (nicht kritisch)");
  }

  // Routen kommen ausschliesslich aus dem DB-Cache (kein Live-Overpass bei
  // User-Requests). Fehlende Fotos im Hintergrund nachladen.
  fillMissingRoutePhotos(logger).catch((err) => {
    logger.error({ err }, "Foto-Nachladen fehlgeschlagen");
  });

  // Einmaliger Catch-up: falls die DB noch viele Routen mit veralteter
  // Geometrie-Version hat (z.B. nach einem Deploy mit neuem Stitching-
  // Algorithmus), alle Kantone im Hintergrund auffrischen. Zaehlt Routen mit
  // aktueller GEOMETRY_VERSION — nach vollstaendigem Warm-all ist die
  // Bedingung nie mehr erfuellt.
  db.select({ count: sql<number>`COUNT(*)::int` })
    .from(externalRoutesTable)
    .where(gte(externalRoutesTable.geometryVersion, GEOMETRY_VERSION))
    .then(([row]) => {
      const aktuellCount = row?.count ?? 0;
      if (aktuellCount < 500) {
        logger.info({ aktuellCount }, "DB-Catch-up: starte Warm-all aller Kantone im Hintergrund");
        warmAllCantonCaches(logger).catch((err) =>
          logger.warn({ err }, "DB-Catch-up Warm-all fehlgeschlagen"),
        );
      } else {
        logger.info({ aktuellCount }, "DB-Catch-up: DB aktuell, kein Warm-all noetig");
      }
    })
    .catch((err) => logger.warn({ err }, "DB-Catch-up Zaehlung fehlgeschlagen"));

  // Artefakt-Luecken-Fix: prueft alle v3-Routen auf Phantomlinien > 500 m
  // (entstehen durch fehlerhaftes OSM-Stitching). Kaputte Routen werden auf
  // geometry_version = 1 gesetzt; wenn welche gefunden wurden, startet ein
  // Warm-all im Hintergrund, der sie mit dem korrigierten Algorithmus neu
  // aufbaut. Laeuft auf jedem Deploy bis alle Routen sauber sind.
  fixArtefaktRouten(logger)
    .then((count) => {
      if (count > 0) {
        logger.info({ count }, "Artefakt-Fix: starte Warm-all im Hintergrund");
        warmAllCantonCaches(logger).catch((err) =>
          logger.warn({ err }, "Artefakt-Fix Warm-all fehlgeschlagen"),
        );
      }
    })
    .catch((err) => logger.warn({ err }, "Artefakt-Fix fehlgeschlagen (nicht kritisch)"));

  // Taeglich-Wetter-Benachrichtigungen starten (07:00 UTC).
  startWeatherNotificationCron();

  // Jeden Tag um 02:00 UTC einen Kanton reihum aktualisieren (cap 150, inkl. Fotos).
  startDailyCantonSync();
  // Offizielle Handicap-Klassifikation täglich nach dem Kantons-Sync prüfen.
  startDailySchweizMobilHandicapSync();

  // Routen-Anreicherung nach Server-Boot automatisch fortsetzen, falls noch
  // Routen mit geometry_version=0 vorhanden sind — so geht nach einem Neustart
  // kein Fortschritt verloren.
  startEnrichAllIfNeeded(logger);

  // Nächtlicher Restitch der SchweizMobil-Eltern-Routen um ~02:00 UTC.
  scheduleNightlyRestitch(logger);
});

attachGroupsSocket(server);
