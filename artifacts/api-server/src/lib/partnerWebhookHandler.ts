/**
 * Business logic for Stripe webhook events relevant to partner onboarding.
 * Called alongside stripe-replit-sync's processWebhook to act on events.
 */
import { randomBytes, randomUUID } from "crypto";
import nodemailer from "nodemailer";
import Stripe from "stripe";
import { db, partnersTable, partnerTokensTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ─── SMTP ─────────────────────────────────────────────────────────────────────

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS fehlen");
  const port = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  return nodemailer.createTransport({
    host, port, secure,
    name: "sagatrail.ch",
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout:   15_000,
    socketTimeout:     30_000,
    tls: { rejectUnauthorized: false },
  });
}

const PORTAL_BASE = "https://sagatrail.ch/portal";

// ─── Magic-Link senden ────────────────────────────────────────────────────────

async function sendMagicLink(partnerId: string, partnerName: string, email: string, isTrial = false): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.insert(partnerTokensTable).values({
    id: randomUUID(),
    partnerId,
    token,
    expiresAt,
  });

  const portalUrl = `${PORTAL_BASE}?token=${token}`;

  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const transporter = createTransporter();

  const subject = isTrial
    ? "Ihr 30-tägiger SagaTrail-Test beginnt jetzt"
    : "Ihr SagaTrail-Partner-Portal ist bereit";
  const intro = isTrial
    ? `Ihre kostenlose 30-Tage-Testphase hat begonnen. Sie haben vollen Zugang zu allen Partner-Funktionen – ohne Kosten, ohne Risiko. Nach Ablauf der Testphase wird Ihr Abo automatisch aktiviert.`
    : `Ihr SagaTrail-Partner-Konto wurde erfolgreich aktiviert.`;

  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: email },
    from: `SagaTrail <${envelopeFrom}>`,
    to: email,
    subject,
    text: [
      `Guten Tag ${partnerName},`,
      "",
      intro,
      "",
      "Über folgenden Link gelangen Sie direkt in Ihr Partner-Portal:",
      "",
      portalUrl,
      "",
      "Der Link ist 24 Stunden gültig. Danach können Sie jederzeit einen neuen Link über das Portal anfordern.",
      "",
      "Im Portal können Sie:",
      "• Ihr Profil (Beschreibung, Öffnungszeiten, Foto) bearbeiten",
      "• Ihren genauen Standort auf der Karte setzen",
      "• Profilaufrufe und Angebot-Tipps einsehen",
      "",
      "Bei Fragen stehen wir gerne zur Verfügung.",
      "",
      "Herzliche Grüsse",
      "Das SagaTrail-Team",
      "info@sagatrail.ch",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:540px;margin:0 auto;color:#1a1a1a">
        <div style="font-size:22px;font-weight:800;color:#CC0000;margin-bottom:24px;letter-spacing:.3px">SagaTrail</div>
        <p>Guten Tag <strong>${partnerName}</strong>,</p>
        <p>Ihr SagaTrail-Partner-Konto wurde erfolgreich aktiviert. Über folgenden Button gelangen Sie direkt in Ihr Partner-Portal:</p>
        <p style="text-align:center;margin:32px 0">
          <a href="${portalUrl}" style="display:inline-block;padding:14px 28px;background:#CC0000;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px">Partner-Portal öffnen</a>
        </p>
        <p style="font-size:13px;color:#777">Der Link ist <strong>24 Stunden</strong> gültig. Danach können Sie jederzeit einen neuen Link über das Portal anfordern.</p>
        <p style="font-size:13px">Im Portal können Sie Ihr Profil (Beschreibung, Öffnungszeiten, Foto) bearbeiten, Ihren genauen Standort setzen und Ihre Statistiken einsehen.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:28px 0">
        <p style="font-size:12px;color:#aaa">Fragen? <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a></p>
      </div>
    `,
  });

  logger.info({ partnerId, email }, "Partner Magic-Link versendet");
}

// ─── Hauptfunktion: Event verarbeiten ─────────────────────────────────────────

export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};

    // Nur Partner-Checkouts verarbeiten
    if (meta.flow !== "partner_onboarding") return;

    const email = meta.email ?? session.customer_details?.email ?? "";
    if (!email) {
      logger.warn({ sessionId: session.id }, "checkout.session.completed ohne E-Mail — übersprungen");
      return;
    }

    // Idempotenz: Partner existiert bereits → nur Magic-Link senden
    const [existing] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.email, email))
      .limit(1);

    if (existing) {
      logger.info({ partnerId: existing.id }, "Partner existiert bereits — sende neuen Magic-Link");
      await sendMagicLink(existing.id, existing.name, email, false);
      return;
    }

    // Trial-Status aus Subscription ermitteln
    const stripeSubscriptionId = typeof session.subscription === "string"
      ? session.subscription
      : (session.subscription as any)?.id ?? null;

    let isTrial = false;
    let trialEnd: Date | null = null;

    if (stripeSubscriptionId) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? process.env.STRIPE_SECRET_KEY_TEST ?? "");
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        isTrial = sub.status === "trialing";
        if (isTrial && sub.trial_end) {
          trialEnd = new Date(sub.trial_end * 1000);
        }
      } catch (err) {
        logger.warn({ err, stripeSubscriptionId }, "Konnte Subscription-Status nicht abrufen");
      }
    }

    const now = new Date();
    const paket = (meta.paket as "basic" | "standard" | "premium") ?? "basic";
    const abrechnungsperiode = meta.abrechnungsperiode ?? "jaehrlich";

    // Laufzeit: bei Trial → bis Trial-Ende; sonst 1 Monat / 1 Jahr
    const laufzeitEnde = trialEnd ?? (() => {
      const d = new Date(now);
      if (abrechnungsperiode === "monatlich") d.setMonth(d.getMonth() + 1);
      else d.setFullYear(d.getFullYear() + 1);
      return d;
    })();

    const partnerId = randomUUID();
    const stripeCustomerId = typeof session.customer === "string"
      ? session.customer
      : (session.customer as any)?.id ?? null;

    const notizenIntern = JSON.stringify({
      adresse:     meta.adresse,
      plz:         meta.plz,
      ort:         meta.ort,
      kontaktName: meta.kontaktName,
    });

    await db.insert(partnersTable).values({
      id:                   partnerId,
      name:                 meta.betriebsName ?? "Unbekannt",
      email,
      kategorie:            (meta.kategorie ?? "sonstiges") as any,
      canton:               meta.canton ?? "",
      telefon:              meta.telefon ?? null,
      paket,
      zahlungsstatus:       isTrial ? "trial" : "bezahlt",
      laufzeitStart:        now,
      laufzeitEnde,
      isActive:             true,
      notizenIntern,
      stripeCustomerId,
      stripeSubscriptionId,
      createdAt:            now,
      updatedAt:            now,
    });

    logger.info({ partnerId, email, paket, isTrial }, "Partner via Stripe-Webhook angelegt");

    await sendMagicLink(partnerId, meta.betriebsName ?? "Partner", email, isTrial);
  }

  // Trial abgelaufen → erste echte Zahlung eingegangen
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
    const subId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription as any)?.id ?? null;
    if (!subId) return;

    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.stripeSubscriptionId, subId))
      .limit(1);

    if (!partner) return;

    // Nur upgraden, nie downgraden (falls invoice.paid mehrfach feuert)
    if (partner.zahlungsstatus === "trial" || partner.zahlungsstatus === "ausstehend") {
      // Laufzeit ab jetzt verlängern
      const now = new Date();
      const laufzeitEnde = new Date(now);
      const isMonatlich = partner.paket === "basic" && invoice.period_end
        ? (invoice.period_end - invoice.period_start) < 35 * 86400
        : false;
      if (isMonatlich) laufzeitEnde.setMonth(laufzeitEnde.getMonth() + 1);
      else laufzeitEnde.setFullYear(laufzeitEnde.getFullYear() + 1);

      await db
        .update(partnersTable)
        .set({ zahlungsstatus: "bezahlt", laufzeitEnde, updatedAt: now })
        .where(eq(partnersTable.id, partner.id));

      logger.info({ partnerId: partner.id, subId }, "Partner Trial → bezahlt (invoice.paid)");
    }
  }

  // Abo gekündigt / Zahlung fehlgeschlagen → Partner deaktivieren
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.stripeSubscriptionId, sub.id))
      .limit(1);

    if (partner) {
      await db
        .update(partnersTable)
        .set({ isActive: false, zahlungsstatus: "gekündigt" as any, updatedAt: new Date() })
        .where(eq(partnersTable.id, partner.id));
      logger.info({ partnerId: partner.id, subscriptionId: sub.id }, "Partner deaktiviert (Abo gekündigt)");
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice & { subscription?: string | { id: string } | null };
    const subId = typeof invoice.subscription === "string"
      ? invoice.subscription
      : (invoice.subscription as any)?.id ?? null;
    if (!subId) return;

    const [partner] = await db
      .select()
      .from(partnersTable)
      .where(eq(partnersTable.stripeSubscriptionId, subId))
      .limit(1);

    if (partner) {
      await db
        .update(partnersTable)
        .set({ zahlungsstatus: "mahnung1" as any, updatedAt: new Date() })
        .where(eq(partnersTable.id, partner.id));
      logger.info({ partnerId: partner.id }, "Partner-Zahlungsstatus → mahnung1");
    }
  }
}
