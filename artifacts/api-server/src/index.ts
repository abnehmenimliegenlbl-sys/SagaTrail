import app from "./app";
import { logger } from "./lib/logger";
import { seedCatalog } from "./lib/catalogSeed";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./lib/stripeClient";
import { warmAllCantonCaches, startDailyCantonSync, fillMissingRoutePhotos } from "./lib/routeService";
import { attachGroupsSocket } from "./ws/groupsSocket";
import { startWeatherNotificationCron } from "./lib/weatherNotifications";
import { db } from "@workspace/db";
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

  // Schema-Migrations: additive Spalten idempotent nachziehen.
  try {
    await db.execute(sql`
      ALTER TABLE partner_anfragen
        ADD COLUMN IF NOT EXISTS typ text NOT NULL DEFAULT 'anfrage'
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

  // Katalog beim Start idempotent seeden, damit die App sofort Daten sieht.
  try {
    await seedCatalog();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Katalog-Seeding fehlgeschlagen");
  }

  // Routen kommen ausschliesslich aus dem DB-Cache (kein Live-Overpass bei
  // User-Requests). Fehlende Fotos im Hintergrund nachladen.
  fillMissingRoutePhotos(logger).catch((err) => {
    logger.error({ err }, "Foto-Nachladen fehlgeschlagen");
  });

  // Taeglich-Wetter-Benachrichtigungen starten (07:00 UTC).
  startWeatherNotificationCron();

  // Jeden Tag um 02:00 UTC einen Kanton reihum aktualisieren (cap 150, inkl. Fotos).
  startDailyCantonSync();
});

attachGroupsSocket(server);
