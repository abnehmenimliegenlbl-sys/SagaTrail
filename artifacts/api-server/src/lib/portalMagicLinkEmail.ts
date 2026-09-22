import nodemailer from "nodemailer";

export type PortalMagicLinkType = "partner" | "verband";

export interface PortalMagicLinkData {
  email: string;
  name: string;
  type: PortalMagicLinkType;
  token: string;
  expiresAt: Date;
  portalUrl?: string;
}

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS not configured");
  }

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getSafePartnerPortalUrl(requestedUrl: string | undefined): string {
  const fallback = process.env.SAGATRAIL_PORTAL_PAGE ?? "https://www.sagatrail.ch/portal";
  if (!requestedUrl) return fallback;

  try {
    const parsed = new URL(requestedUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isSagaTrailHost = hostname === "sagatrail.ch" || hostname.endsWith(".sagatrail.ch");
    if (parsed.protocol !== "https:" || !isSagaTrailHost) return fallback;
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "") || parsed.origin;
  } catch {
    return fallback;
  }
}

function buildPortalLink(data: PortalMagicLinkData): string {
  if (data.type === "verband") {
    const apiBase = (process.env.SAGATRAIL_API_BASE ?? "https://api.sagatrail.ch").replace(/\/+$/, "");
    return `${apiBase}/api/verband/portal?token=${encodeURIComponent(data.token)}`;
  }

  return `${getSafePartnerPortalUrl(data.portalUrl)}?token=${encodeURIComponent(data.token)}`;
}

export async function sendPortalMagicLink(data: PortalMagicLinkData): Promise<void> {
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const link = buildPortalLink(data);
  const safeName = escapeHtml(data.name);
  const safeLink = escapeHtml(link);
  const expiresAt = data.expiresAt.toLocaleString("de-CH", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Zurich",
  });
  const isVerband = data.type === "verband";
  const subject = isVerband
    ? "Ihr SagaTrail Verbandsportal Login"
    : "Ihr SagaTrail Partner-Portal Login";
  const intro = isVerband
    ? "Hier ist Ihr persönlicher Anmeldelink für das SagaTrail Verbandsportal:"
    : "Hier ist Ihr persönlicher Anmeldelink für das SagaTrail Partner-Portal:";
  const button = isVerband ? "Zum Verbandsportal" : "Zum Partner-Portal";

  await createTransporter().sendMail({
    envelope: { from: envelopeFrom, to: data.email },
    from: `SagaTrail <${envelopeFrom}>`,
    replyTo: "info@sagatrail.ch",
    to: data.email,
    subject,
    text: [
      `Guten Tag ${data.name}`,
      "",
      intro,
      "",
      link,
      "",
      `Der Link ist bis ${expiresAt} Uhr gültig.`,
      "",
      "Freundliche Grüsse",
      "Das SagaTrail-Team",
    ].join("\n"),
    html: `
      <!DOCTYPE html>
      <html lang="de">
      <body style="margin:0;padding:32px 16px;background:#f4f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden">
          <tr><td style="background:#CC0000;padding:28px 36px 24px;color:#fff">
            <div style="font-size:22px;font-weight:800">SagaTrail</div>
            <div style="font-size:13px;opacity:.75;margin-top:3px">sagatrail.ch</div>
          </td></tr>
          <tr><td style="padding:32px 36px">
            <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a1a1a">Guten Tag ${safeName}</p>
            <p style="margin:18px 0 24px;font-size:15px;color:#444;line-height:1.6">${intro}</p>
            <p style="margin:0 0 28px">
              <a href="${safeLink}" style="display:inline-block;padding:14px 32px;background:#CC0000;border-radius:10px;color:#fff;text-decoration:none;font-size:15px;font-weight:700">${button} →</a>
            </p>
            <p style="margin:0 0 20px;font-size:13px;color:#888;background:#f7f6f4;border-radius:8px;padding:10px 14px">Der Link ist gültig bis <strong>${escapeHtml(expiresAt)} Uhr</strong>.</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.65">Falls der Button nicht funktioniert, können Sie diesen Link direkt öffnen:</p>
            <p style="font-size:12px;word-break:break-all"><a href="${safeLink}" style="color:#CC0000">${safeLink}</a></p>
            <p style="margin:28px 0 0;font-size:14px;color:#444;line-height:1.6">Freundliche Grüsse<br>Das SagaTrail-Team</p>
            <p style="margin:16px 0 0;font-size:12px;color:#aaa">Fragen? Schreiben Sie uns: <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a></p>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  });
}