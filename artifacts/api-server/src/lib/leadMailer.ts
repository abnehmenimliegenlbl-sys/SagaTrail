/**
 * Massen-E-Mail-Kampagnen für Partner-Leads.
 * Liest Leads aus WordPress MySQL via WP AJAX,
 * sendet per SMTP/nodemailer, loggt in PostgreSQL.
 */

import nodemailer from "nodemailer";
import { randomUUID, createHmac } from "node:crypto";
import { db, partnerEmailLogTable, partnerEmailBlocklistTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// ─── Typen ────────────────────────────────────────────────────────────────────

export interface Lead {
  name: string;
  email: string;
  kanton: string;
  sprache: string;  // DE | FR | IT | RM
  route: string;
  typ: string;
  satz?: string;    // anschreiben_satz aus organisationen → %SATZ%
  adresse?: string;
  telefon?: string;
  website?: string;
}

export interface LeadFilter {
  typ?: string;
  kanton?: string;
  kantone?: string[];   // Mehrfachauswahl; hat Vorrang vor kanton
  sprache?: string;
}

export interface OrgFilter {
  kategorie?: string;
  typ?: string;     // national | regional | kantonal
  kanton?: string;
  kantone?: string[];   // Mehrfachauswahl; hat Vorrang vor kanton
  sprache?: string;
}

export interface CampaignState {
  status: "idle" | "running" | "done" | "error";
  campaignId: string | null;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  error: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  lastRecipient: string | null;
}

export const campaignState: CampaignState = {
  status: "idle",
  campaignId: null,
  total: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
  error: null,
  startedAt: null,
  finishedAt: null,
  lastRecipient: null,
};

// ─── WP AJAX: Leads laden ────────────────────────────────────────────────────

export async function fetchOrgsFromWp(
  filter: OrgFilter,
  wpAjaxUrl: string,
  hookSecret: string,
): Promise<Lead[]> {
  const form = new URLSearchParams();
  form.set("action",      "sagatrail_get_organisationen");
  form.set("hook_secret", hookSecret);
  if (filter.kategorie) form.set("kategorie", filter.kategorie);
  if (filter.typ)       form.set("typ",       filter.typ);
  // Bei Mehrfach-Kanton: WP ohne Kanton-Filter aufrufen, danach server-seitig filtern
  if (!filter.kantone?.length && filter.kanton) form.set("kanton", filter.kanton);

  const res = await fetch(wpAjaxUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WP AJAX HTTP ${res.status}`);
  const json = await res.json() as { success: boolean; data?: Lead[]; error?: string };
  if (!json.success) throw new Error(json.error ?? "WP AJAX Fehler");
  let leads = json.data ?? [];
  if (filter.kantone?.length) {
    leads = leads.filter((l) => filter.kantone!.includes(l.kanton));
  }
  return leads;
}

export async function fetchLeadsFromWp(
  filter: LeadFilter,
  wpAjaxUrl: string,
  hookSecret: string,
): Promise<Lead[]> {
  const form = new URLSearchParams();
  form.set("action",     "sagatrail_get_leads");
  form.set("hook_secret", hookSecret);
  if (filter.typ)     form.set("typ",     filter.typ);
  // Bei Mehrfach-Kanton: WP ohne Kanton-Filter aufrufen, danach server-seitig filtern
  if (!filter.kantone?.length && filter.kanton) form.set("kanton", filter.kanton);
  if (filter.sprache) form.set("sprache", filter.sprache);

  const res = await fetch(wpAjaxUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`WP AJAX HTTP ${res.status}`);
  const json = await res.json() as { success: boolean; data?: Lead[]; error?: string };
  if (!json.success) throw new Error(json.error ?? "WP AJAX Fehler");
  let leads = json.data ?? [];
  if (filter.kantone?.length) {
    leads = leads.filter((l) => filter.kantone!.includes(l.kanton));
  }
  return leads;
}

// ─── Variablen ersetzen ───────────────────────────────────────────────────────

function resolveVars(text: string, lead: Lead): string {
  return text
    .replace(/%TYP%/gi,    lead.typ    ?? "")
    .replace(/%NAME%/gi,   lead.name   ?? "")
    .replace(/%KANTON%/gi, lead.kanton ?? "")
    .replace(/%ROUTE%/gi,  lead.route  ?? "")
    .replace(/%SATZ%/gi,   lead.satz   ?? "");
}

// ─── Unsubscribe-Token ────────────────────────────────────────────────────────

const UNSUB_SECRET = process.env.SESSION_SECRET ?? "sagatrail-unsub";

export function makeUnsubToken(email: string, campaignId: string): string {
  return createHmac("sha256", UNSUB_SECRET)
    .update(`${campaignId}:${email}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyUnsubToken(email: string, campaignId: string, token: string): boolean {
  return makeUnsubToken(email, campaignId) === token;
}

// ─── HTML-E-Mail-Template ─────────────────────────────────────────────────────

/** Unsubscribe-URL + beide Header nach RFC 2369 / RFC 8058 */
export function buildUnsubInfo(recipientEmail: string, campaignId: string, apiBase: string) {
  const token    = makeUnsubToken(recipientEmail, campaignId);
  const emailB64 = Buffer.from(recipientEmail).toString("base64url");
  const url      = `${apiBase}/api/unsubscribe?e=${emailB64}&t=${token}&c=${campaignId}`;
  return { url, emailB64, token };
}

/** Einfache Plain-Text-Version aus dem Vorlagentext */
function buildPlainText(bodyText: string, unsubUrl: string): string {
  return [
    bodyText,
    "",
    "---",
    "SagaTrail · Rolf Koch · info@sagatrail.ch · sagatrail.ch",
    "",
    "Abmelden (DE): " + unsubUrl,
    "Se désabonner (FR): " + unsubUrl,
    "Annullare (IT): " + unsubUrl,
  ].join("\n");
}

export function buildEmailHtml(opts: {
  bodyText:    string;
  recipientEmail: string;
  campaignId:  string;
  apiBase:     string;
}): string {
  const { bodyText, recipientEmail, campaignId, apiBase } = opts;
  const { url: unsubUrl } = buildUnsubInfo(recipientEmail, campaignId, apiBase);

  // Zeilenumbrüche → <br>-Tags
  const htmlBody = bodyText
    .split("\n")
    .map((l) => `<p style="margin:0 0 14px">${l || "&nbsp;"}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#f5f4f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f1;padding:32px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.10)">

  <!-- HEADER -->
  <tr>
    <td style="background:#CC0000;padding:24px 36px">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:middle;padding-right:14px">
            <img src="https://sagatrail.ch/wp-content/uploads/2026/07/cropped-sagatrail-icon-1024-1.png"
                 alt="SagaTrail" width="48" height="48"
                 style="display:block;border-radius:10px;border:0"/>
          </td>
          <td style="vertical-align:middle">
            <p style="margin:0;font-size:22px;font-weight:800;color:#fff;letter-spacing:.5px">
              Saga<span style="opacity:.75">Trail</span>
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75)">
              Schweizer Sagenerlebnis App
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="background:#ffffff;padding:36px 36px 28px">
      <div style="font-size:15px;color:#1a1a1a;line-height:1.7">
        ${htmlBody}
      </div>
    </td>
  </tr>

  <!-- DIVIDER -->
  <tr>
    <td style="background:#ffffff;padding:0 36px">
      <hr style="border:none;border-top:1px solid #e8e8e8;margin:0"/>
    </td>
  </tr>

  <!-- ABSENDER -->
  <tr>
    <td style="background:#ffffff;padding:24px 36px 28px">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:44px;vertical-align:top">
            <img src="https://sagatrail.ch/wp-content/uploads/2026/07/cropped-sagatrail-icon-1024-1.png"
                 alt="SagaTrail" width="40" height="40"
                 style="display:block;border-radius:8px;border:0"/>
          </td>
          <td style="padding-left:12px;vertical-align:top">
            <p style="margin:0;font-size:14px;font-weight:700;color:#1a1a1a">Rolf Koch</p>
            <p style="margin:2px 0 0;font-size:12px;color:#777">Gründer &amp; CEO, SagaTrail</p>
            <p style="margin:2px 0 0;font-size:12px">
              <a href="mailto:info@sagatrail.ch" style="color:#CC0000;text-decoration:none">info@sagatrail.ch</a>
              &nbsp;·&nbsp;
              <a href="https://sagatrail.ch" style="color:#CC0000;text-decoration:none">sagatrail.ch</a>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- FOOTER -->
  <tr>
    <td style="background:#f0eeeb;padding:20px 36px;border-top:1px solid #e5e5e5">
      <p style="margin:0 0 8px;font-size:11px;color:#888;line-height:1.6">
        🇩🇪 Wenn Sie keine weiteren E-Mails von SagaTrail erhalten möchten,
        <a href="${unsubUrl}" style="color:#CC0000">klicken Sie hier, um sich abzumelden</a>.<br/>
        🇫🇷 Si vous ne souhaitez plus recevoir d'e-mails de SagaTrail,
        <a href="${unsubUrl}" style="color:#CC0000">cliquez ici pour vous désabonner</a>.<br/>
        🇮🇹 Se non desiderate più ricevere e-mail da SagaTrail,
        <a href="${unsubUrl}" style="color:#CC0000">cliccate qui per annullare l'iscrizione</a>.
      </p>
      <p style="margin:0;font-size:10px;color:#aaa">
        SagaTrail · Rolf Koch · info@sagatrail.ch · sagatrail.ch
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Vorschau-HTML (ohne echte Links) ────────────────────────────────────────

export function buildPreviewHtml(bodyText: string, sampleLead: Partial<Lead>): string {
  const resolved = resolveVars(bodyText, {
    name: sampleLead.name ?? "Muster Restaurant",
    email: "preview@example.com",
    kanton: sampleLead.kanton ?? "Bern",
    sprache: sampleLead.sprache ?? "DE",
    route: sampleLead.route ?? "Sagapfad Bern",
    typ: sampleLead.typ ?? "Restaurant",
  });
  return buildEmailHtml({
    bodyText: resolved,
    recipientEmail: "preview@example.com",
    campaignId: "preview",
    apiBase: "https://api.sagatrail.ch",
  });
}

// ─── SMTP ─────────────────────────────────────────────────────────────────────

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS fehlen");
  const port   = Number(process.env.SMTP_PORT ?? 587);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  console.log(`[SMTP] host=${host} port=${port} secure=${secure} user=${user}`);
  return nodemailer.createTransport({
    pool:           true,   // Verbindungen wiederverwenden statt pro Mail neu öffnen
    maxConnections: 5,      // 5 parallele SMTP-Verbindungen zu Brevo
    maxMessages:    100,    // max. Mails pro Verbindung bevor sie erneuert wird
    host,
    port,
    secure,
    name: "sagatrail.ch",
    auth: { user, pass },
    connectionTimeout: 15_000,
    greetingTimeout:   15_000,
    socketTimeout:     30_000,
    tls: { rejectUnauthorized: false },
  });
}

// ─── Kampagne senden ──────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function startCampaign(opts: {
  subject:  string;
  bodyText: string;
  leads:    Lead[];
  apiBase:  string;
}): Promise<void> {
  if (campaignState.status === "running") return;

  const campaignId = randomUUID();
  campaignState.status      = "running";
  campaignState.campaignId  = campaignId;
  campaignState.total       = opts.leads.length;
  campaignState.sent        = 0;
  campaignState.failed      = 0;
  campaignState.skipped     = 0;
  campaignState.error       = null;
  campaignState.startedAt   = new Date();
  campaignState.finishedAt  = null;
  campaignState.lastRecipient = null;

  runCampaign(campaignId, opts).catch((err) => {
    campaignState.status = "error";
    campaignState.error  = err instanceof Error ? err.message : String(err);
    campaignState.finishedAt = new Date();
  });
}

async function runCampaign(campaignId: string, opts: {
  subject:  string;
  bodyText: string;
  leads:    Lead[];
  apiBase:  string;
}): Promise<void> {
  const { subject, bodyText, leads, apiBase } = opts;
  // SMTP_FROM = verifizierte Absenderadresse (info@sagatrail.ch)
  // SMTP_USER = Brevo-Login (b35820001@smtp-brevo.com) – nur für Auth, nicht als From
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "info@sagatrail.ch";
  const envelopeFrom = from; // Brevo erlaubt beliebige verifizierte Sender als envelope.from

  // Blocklist laden
  const blocklist = await db
    .select({ email: partnerEmailBlocklistTable.email })
    .from(partnerEmailBlocklistTable);
  const blocked = new Set(blocklist.map((r) => r.email.toLowerCase()));

  // Bereits mit diesem Subject gesendet
  const prevSent = await db.execute(sql`
    SELECT DISTINCT email FROM partner_email_log
    WHERE subject = ${subject} AND status = 'ok'
  `);
  const alreadySent = new Set(
    (prevSent.rows as Array<{ email: string }>).map((r) => r.email.toLowerCase()),
  );

  const transporter = createTransporter();
  const BATCH_SIZE  = 5;   // parallele Sends pro Batch
  const BATCH_DELAY = 100; // ms zwischen Batches (Brevo-Rate-Limit schonen)

  // Filtern bevor wir batchen
  const toSend = leads.filter((lead) => {
    if (!lead.email) { campaignState.skipped++; return false; }
    const lc = lead.email.toLowerCase();
    if (blocked.has(lc) || alreadySent.has(lc)) { campaignState.skipped++; return false; }
    return true;
  });

  // In Batches aufteilen
  for (let i = 0; i < toSend.length; i += BATCH_SIZE) {
    const batch = toSend.slice(i, i + BATCH_SIZE);

    // Alle im Batch vorab als "unterwegs" markieren → verhindert Doppel-Send
    for (const lead of batch) alreadySent.add(lead.email.toLowerCase());

    await Promise.all(batch.map(async (lead) => {
      campaignState.lastRecipient = lead.email;

      const resolvedText    = resolveVars(bodyText, lead);
      const resolvedSubject = resolveVars(subject, lead);
      const html            = buildEmailHtml({ bodyText: resolvedText, recipientEmail: lead.email, campaignId, apiBase });
      const { url: unsubUrl } = buildUnsubInfo(lead.email, campaignId, apiBase);
      const unsubMailto     = `mailto:info@sagatrail.ch?subject=Abmelden%20${encodeURIComponent(lead.email)}`;

      let status: "ok" | "fail" = "ok";
      let error: string | null  = null;

      try {
        await transporter.sendMail({
          envelope: { from: envelopeFrom, to: lead.email },
          from:    `SagaTrail <${envelopeFrom}>`,
          to:      `${lead.name} <${lead.email}>`,
          replyTo: "info@sagatrail.ch",
          subject: resolvedSubject,
          html,
          text:    buildPlainText(resolvedText, unsubUrl),
          headers: {
            "Precedence":            "bulk",
            "List-Unsubscribe":      `<${unsubUrl}>, <${unsubMailto}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            "X-Campaign-Id":         campaignId,
          },
        });
        campaignState.sent++;
      } catch (err) {
        status = "fail";
        error  = err instanceof Error ? err.message : String(err);
        campaignState.failed++;
        console.error(`[SMTP-ERROR] to=${lead.email} err=${error}`);
      }

      // Log-Eintrag (fire-and-forget, blockiert den Batch nicht)
      db.insert(partnerEmailLogTable).values({
        campaignId,
        subject,       // Template-Betreff für Dedup-Check
        email:         lead.email,
        recipientName: lead.name,
        status,
        error,
      }).execute().catch((e: unknown) =>
        console.error(`[DB-LOG-ERROR] ${lead.email}:`, e)
      );
    }));

    if (i + BATCH_SIZE < toSend.length) await sleep(BATCH_DELAY);
  }

  // Warten bis alle Log-Inserts durch sind
  await sleep(300);

  campaignState.status     = "done";
  campaignState.finishedAt = new Date();
}
