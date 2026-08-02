/**
 * Generiert einen Partnerschaftsvertrag als PDF (pdfkit) und versendet ihn
 * per nodemailer an den Kontakt des anfragenden Betriebs sowie als Kopie an
 * info@sagatrail.ch.
 *
 * SMTP via Env-Vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */

import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Signatur-PNG laden (einmalig beim Modulimport) ────────────────────────────
let SIG_BUF: Buffer | null = null;
try {
  const here =
    typeof __dirname !== "undefined"
      ? __dirname
      : dirname(fileURLToPath(import.meta.url));
  SIG_BUF = readFileSync(join(here, "../src/assets/signature.png"));
} catch {
  try {
    SIG_BUF = readFileSync(join(process.cwd(), "src/assets/signature.png"));
  } catch {
    SIG_BUF = null;
  }
}

// ── Typen ─────────────────────────────────────────────────────────────────────
export interface PartnerAnfrageEmailData {
  betriebsName:    string;
  kontaktName:     string;
  kontaktEmail:    string;
  kontaktTelefon?: string | null;
  kategorie:       string;
  canton:          string;
  adresse?:        string | null;
  plz?:            string | null;
  ort?:            string | null;
  paket:           "basic" | "standard" | "premium";
}

// ── Paket-Details ─────────────────────────────────────────────────────────────
const PAKET_INFO: Record<string, { label: string; preis: string; beschreibung: string }> = {
  basic: {
    label: "Basic",
    preis: "CHF 29 / Monat",
    beschreibung: "Eintrag auf der Karte, 1 Foto, Basisangaben",
  },
  standard: {
    label: "Standard",
    preis: "CHF 59 / Monat",
    beschreibung: "Erweiterter Eintrag, 5 Fotos, Angebot & Öffnungszeiten",
  },
  premium: {
    label: "Premium",
    preis: "CHF 99 / Monat",
    beschreibung: "Vollständiger Eintrag, unbegrenzte Fotos, Story-Integration",
  },
};

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function heute(): string {
  return new Date().toLocaleDateString("de-CH", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function heuteKurz(): string {
  return new Date().toLocaleDateString("de-CH", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function refNummer(): string {
  const n = Date.now() % 100000;
  return "ST-P" + String(n).padStart(5, "0");
}

function katLabel(k: string): string {
  const map: Record<string, string> = {
    restaurant: "Restaurant / Gastronomie",
    cafe: "Café / Bäckerei",
    souvenir: "Souvenir / Geschenke",
    uebernachtung: "Übernachtung / Hotel",
    sonstiges: "Sonstiges",
  };
  return map[k] ?? k;
}

// ── PDF-Vertrag (pdfkit, A4) ──────────────────────────────────────────────────
export async function generatePartnerVertragPdf(
  data: PartnerAnfrageEmailData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const RED   = "#CC0000";
    const DARK  = "#1a1a1a";
    const MID   = "#646464";
    const LIGHT = "#969696";
    const L     = 56;
    const R     = doc.page.width - 56;
    const W     = R - L;

    const ref        = refNummer();
    const datum      = heute();
    const datumKurz  = heuteKurz();
    const paketInfo  = PAKET_INFO[data.paket] ?? PAKET_INFO.standard;

    // ── KOPF ─────────────────────────────────────────────────────────────────
    doc
      .fontSize(22).font("Helvetica-Bold").fillColor(RED)
      .text("SagaTrail", L, 56);

    doc
      .fontSize(8).font("Helvetica").fillColor(LIGHT)
      .text("www.sagatrail.ch  ·  info@sagatrail.ch", L, doc.y + 2);

    const lineY = doc.y + 6;
    doc
      .moveTo(L, lineY).lineTo(R, lineY)
      .strokeColor(RED).lineWidth(1.5).stroke();

    // ── TITEL ────────────────────────────────────────────────────────────────
    doc
      .fontSize(15).font("Helvetica-Bold").fillColor(DARK)
      .text("Partnerschaftsvereinbarung", L, lineY + 14);

    doc.moveDown(0.7);

    // ── PARTEIEN ─────────────────────────────────────────────────────────────
    const zwY = doc.y;

    doc.fontSize(9).font("Helvetica").fillColor(DARK)
       .text("zwischen", L, zwY);
    doc.fontSize(9).font("Helvetica").fillColor(LIGHT)
       .text(`Oberwil, den ${datumKurz}`, L, zwY, { width: W, align: "right" });

    doc.moveDown(0.4);

    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
       .text("A.i.L. by Koch", L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    for (const zeile of ["Rolf Koch", "Mühlemattstrasse 11", "CH-4104 Oberwil BL", "CHE-286.962.827"]) {
      doc.text(zeile, L);
    }

    doc.moveDown(0.5);

    doc.fontSize(9).font("Helvetica-Oblique").fillColor(MID).text("und", L);

    doc.moveDown(0.4);

    // Betriebs-Adresse
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
       .text(data.betriebsName, L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    doc.text(data.kontaktName + (data.kontaktTelefon ? `,  ${data.kontaktTelefon}` : ""), L);
    doc.text(data.kontaktEmail, L);

    const adresseTeile = [data.adresse, data.plz && data.ort ? `${data.plz} ${data.ort}` : data.ort].filter(Boolean);
    if (adresseTeile.length) {
      doc.text(adresseTeile.join(", ") + ` (${data.canton})`, L);
    } else {
      doc.text(`Kanton ${data.canton}`, L);
    }
    doc.text(`Kategorie: ${katLabel(data.kategorie)}`, L);

    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text(`Referenz: ${ref}`, L);

    doc.moveDown(1.2);

    // ── POSITIONSTABELLE ─────────────────────────────────────────────────────
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text("Vereinbartes Paket", L);
    doc.moveDown(0.5);

    const colPos   = 40;
    const colPreis = 140;
    const colDesc  = W - colPos - colPreis;
    const tableTop = doc.y;

    doc.moveTo(L, tableTop).lineTo(R, tableTop)
       .strokeColor("#aaaaaa").lineWidth(0.5).stroke();

    doc.moveDown(0.3);
    const headerY = doc.y;

    doc.fontSize(8).font("Helvetica-Bold").fillColor(MID)
       .text("Pos",          L,                   headerY, { width: colPos,   lineBreak: false });
    doc.text("Beschreibung", L + colPos,           headerY, { width: colDesc,  lineBreak: false });
    doc.text("Preis",        L + colPos + colDesc, headerY, { width: colPreis, align: "right" });

    doc.moveDown(0.15);
    const thickY = doc.y + 2;
    doc.moveTo(L, thickY).lineTo(R, thickY)
       .strokeColor("#323232").lineWidth(0.8).stroke();

    doc.moveDown(0.5);
    const rowY = doc.y;

    doc.fontSize(9).font("Helvetica").fillColor(DARK)
       .text("01",                    L,                   rowY, { width: colPos,   lineBreak: false });
    doc.text(
      `Paket ${paketInfo.label} – ${paketInfo.beschreibung}`,
                                      L + colPos,          rowY, { width: colDesc,  lineBreak: false });
    doc.font("Helvetica-Bold")
       .text(paketInfo.preis,         L + colPos + colDesc, rowY, { width: colPreis, align: "right" });

    doc.moveDown(0.5);
    const bottomY = doc.y + 2;
    doc.moveTo(L, bottomY).lineTo(R, bottomY)
       .strokeColor("#323232").lineWidth(0.8).stroke();

    doc.moveDown(1.5);

    // ── GEGENSTAND & LAUFZEIT ────────────────────────────────────────────────
    sectionHead(doc, "1. Gegenstand und Laufzeit", L, DARK);
    para(doc, MID, W,
      `SagaTrail und ${data.betriebsName} vereinbaren eine Partnerschaft für den Betrieb auf ` +
      `der SagaTrail-Wanderapplication. Die Partnerschaft beginnt nach beidseitiger Unterzeichnung ` +
      `dieser Vereinbarung und läuft unbefristet, kündbar mit einer Frist von 30 Tagen auf ` +
      `Monatsende.`
    );
    doc.moveDown(0.8);

    // ── LEISTUNGEN SagaTrail ─────────────────────────────────────────────────
    sectionHead(doc, "2. Leistungen SagaTrail", L, DARK);
    bulletList(doc, MID, L, W, [
      `Eintrag des Betriebs im Paket «${paketInfo.label}» auf der SagaTrail-Karte.`,
      "Sichtbarkeit für Wanderinnen und Wanderer entlang der Sagenrouten.",
      "Jederzeit aktualisierbare Betriebsangaben über das Partner-Portal.",
      "Monatsabrechnung per Rechnung oder Kreditkarte.",
    ]);
    doc.moveDown(0.8);

    // ── PFLICHTEN PARTNER ────────────────────────────────────────────────────
    sectionHead(doc, "3. Pflichten des Partners", L, DARK);
    bulletList(doc, MID, L, W, [
      "Bereitstellung korrekter Angaben zum Betrieb (Öffnungszeiten, Angebot, Fotos).",
      "Zeitgerechte Zahlung des vereinbarten Monatsbetrags.",
      "Kein Missbrauch des Partner-Portals oder der SagaTrail-Infrastruktur.",
    ]);
    doc.moveDown(0.8);

    // ── KONDITIONEN ──────────────────────────────────────────────────────────
    sectionHead(doc, "4. Konditionen & Zahlung", L, DARK);
    bulletList(doc, MID, L, W, [
      `Monatlicher Betrag: ${paketInfo.preis} (zzgl. gesetzlicher MwSt. falls anwendbar).`,
      "Abrechnung jeweils am Monatsersten für den laufenden Monat.",
      "Kündigung jederzeit schriftlich per E-Mail an info@sagatrail.ch, wirksam auf Ende des Folgemonats.",
      "SagaTrail behält sich vor, den Eintrag bei Zahlungsrückstand zu deaktivieren.",
    ]);
    doc.moveDown(0.8);

    // ── DATENSCHUTZ & GERICHTSSTAND ──────────────────────────────────────────
    sectionHead(doc, "5. Datenschutz & Gerichtsstand", L, DARK);
    para(doc, MID, W,
      "SagaTrail verarbeitet Betriebsdaten ausschliesslich zur Darstellung in der App " +
      "(DSG/DSGVO-konform). Personenbezogene Daten werden nicht an Dritte weitergegeben. " +
      "Es gilt Schweizer Recht. Gerichtsstand ist Oberwil BL."
    );
    doc.moveDown(1.2);

    // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────────
    if (doc.y + 130 > doc.page.height - 56) {
      doc.addPage();
      doc.y = 56;
    }

    const colW   = (W - 28) / 2;
    const leftX  = L;
    const rightX = L + colW + 28;
    const sigTop = doc.y;

    doc.fontSize(8).font("Helvetica").fillColor(MID)
       .text("A.i.L. by Koch  –  SagaTrail", leftX, sigTop, { width: colW });
    doc.text(data.betriebsName, rightX, sigTop, { width: colW });

    doc.moveDown(0.4);
    let afterSigY = doc.y + 10;

    if (SIG_BUF) {
      doc.image(SIG_BUF, leftX, afterSigY, { width: 90 });
      afterSigY += 58;
    } else {
      afterSigY += 44;
    }

    doc
      .moveTo(leftX,  afterSigY).lineTo(leftX  + colW, afterSigY)
      .strokeColor("#aaaaaa").lineWidth(0.5).stroke();
    doc
      .moveTo(rightX, afterSigY).lineTo(rightX + colW, afterSigY)
      .strokeColor("#aaaaaa").lineWidth(0.5).stroke();

    const afterLineY = afterSigY + 5;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
       .text("Rolf Koch, Inhaber", leftX, afterLineY, { width: colW });
    doc.fontSize(8).font("Helvetica").fillColor(MID)
       .text("Ort, Datum, Unterschrift", rightX, afterLineY, { width: colW });

    doc.fontSize(8).font("Helvetica").fillColor(LIGHT)
       .text(datum, leftX, doc.y + 1, { width: colW });

    // ── FUSSZEILE ─────────────────────────────────────────────────────────────
    const footY = doc.page.height - 36;
    doc
      .moveTo(L, footY - 6).lineTo(R, footY - 6)
      .strokeColor(RED).lineWidth(0.6).stroke();
    doc
      .fontSize(7.5).font("Helvetica-Oblique").fillColor(LIGHT)
      .text(
        `A.i.L. by Koch  ·  www.sagatrail.ch  ·  info@sagatrail.ch  |  Referenz: ${ref}`,
        L, footY,
        { align: "center", width: W },
      );

    doc.end();
  });
}

// ── Hilfsfunktionen PDF ────────────────────────────────────────────────────────
function sectionHead(
  doc: InstanceType<typeof PDFDocument>,
  title: string,
  l: number,
  dark: string,
) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(dark).text(title, l);
  doc.moveDown(0.35);
}

function para(
  doc: InstanceType<typeof PDFDocument>,
  mid: string,
  width: number,
  text: string,
) {
  doc.fontSize(9).font("Helvetica").fillColor(mid).text(text, { lineGap: 2, width });
}

function bulletList(
  doc: InstanceType<typeof PDFDocument>,
  mid: string,
  l: number,
  width: number,
  items: string[],
) {
  doc
    .fontSize(9).font("Helvetica").fillColor(mid)
    .list(items, l, doc.y, { bulletRadius: 1.8, textIndent: 12, lineGap: 2, width });
}

// ── SMTP-Transport ────────────────────────────────────────────────────────────
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST / SMTP_USER / SMTP_PASS not configured");
  }
  return nodemailer.createTransport({
    host,
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:   { user, pass },
  });
}

// ── Hauptfunktion: PDF generieren + 2 Mails versenden ────────────────────────
export async function sendPartnerVertrag(data: PartnerAnfrageEmailData): Promise<void> {
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const pdfBuf       = await generatePartnerVertragPdf(data);
  const transporter  = createTransporter();
  const paketInfo    = PAKET_INFO[data.paket] ?? PAKET_INFO.standard;

  const filename = `SagaTrail-Partnervertrag-${data.betriebsName.replace(/\s+/g, "_")}.pdf`;

  // 1) Mail an den Betrieb / Kontaktperson
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.kontaktEmail },
    from:     `SagaTrail <${envelopeFrom}>`,
    to:       data.kontaktEmail,
    replyTo:  "info@sagatrail.ch",
    subject:  `Partnerschaftsvereinbarung SagaTrail – ${data.betriebsName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">SagaTrail Partnerschaft</h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;
                    border-radius:0 0 12px 12px;background:#fff">
          <p style="margin-top:0">Guten Tag ${data.kontaktName}</p>
          <p>Vielen Dank für Ihr Interesse an einer Partnerschaft mit SagaTrail.</p>
          <p>Im Anhang finden Sie die <strong>Partnerschaftsvereinbarung</strong> für
             <strong>${data.betriebsName}</strong> (Paket <em>${paketInfo.label}</em>, ${paketInfo.preis})
             als PDF. Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie das
             unterzeichnete Exemplar per E-Mail zurück an:</p>
          <blockquote style="border-left:3px solid #CC0000;padding-left:16px;
                             color:#555;margin:20px 0">
            Rolf Koch · SagaTrail<br>
            <a href="mailto:info@sagatrail.ch">info@sagatrail.ch</a>
          </blockquote>
          <p>Wir melden uns danach innerhalb von 2 Werktagen, um den nächsten Schritt zu besprechen
             und Ihren Eintrag freizuschalten.</p>
          <p style="margin-top:32px">Freundliche Grüsse<br>
          <strong>Rolf Koch</strong><br>
          Gründer SagaTrail<br>
          <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a></p>
        </div>
      </div>
    `,
    attachments: [{ filename, content: pdfBuf, contentType: "application/pdf" }],
  });

  // 2) Interne Kopie an SagaTrail (ohne Cc, nur als separate Mail)
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: "info@sagatrail.ch" },
    from:     `SagaTrail System <${envelopeFrom}>`,
    to:       "info@sagatrail.ch",
    subject:  `[Partnervertrag gesendet] ${data.betriebsName}`,
    html: `
      <h2 style="font-family:sans-serif">Partnervertrag versendet</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Betrieb</td>
            <td><strong>${data.betriebsName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Paket</td>
            <td>${paketInfo.label} (${paketInfo.preis})</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td>
            <td>${data.kontaktName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td>
            <td>${data.kontaktEmail}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kanton</td>
            <td>${data.canton}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kategorie</td>
            <td>${katLabel(data.kategorie)}</td></tr>
      </table>
    `,
    attachments: [{ filename, content: pdfBuf, contentType: "application/pdf" }],
  });
}
