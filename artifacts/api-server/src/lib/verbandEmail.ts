/**
 * Generiert PDF-Pilotpartnerschaftsvertrag (pdfkit) und versendet ihn per
 * nodemailer an die Kontaktperson des Tourismusverbands sowie an info@sagatrail.ch.
 *
 * Layout nach dem PHP-Vorbild (partner-contract.php):
 *  – Kopfzeile mit SagaTrail-Rot + Adresse + UID
 *  – Roter Trennstrich
 *  – Referenznummer
 *  – Parteien-Tabelle
 *  – Leistungen / Konditionen / Pflichten / Datenschutz
 *  – Zweispaltiger Unterschriften-Block mit echter Signatur (PNG)
 *
 * SMTP via Env-Vars: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */

import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Signatur-PNG laden (einmalig beim Modulimport) ────────────────────────────
// dist/index.mjs liegt in artifacts/api-server/dist/; Bild liegt in src/assets/
let SIG_BUF: Buffer | null = null;
try {
  const here = typeof __dirname !== "undefined"
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
export interface VerbandAnfrageData {
  verbandName:    string;
  email:          string;
  kontaktName:    string;
  kontaktTelefon?: string | null;
  kantone:        string; // comma-separated or "alle"
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────
function kantoneLabel(kantone: string): string {
  if (kantone === "alle") return "Alle 26 Kantone der Schweiz";
  return kantone.split(",").map(k => k.trim()).filter(Boolean).join(", ");
}

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
  return "ST-V" + String(n).padStart(5, "0");
}

// ── PDF-Vertrag (pdfkit, A4) — Brieflayout ────────────────────────────────────
export async function generateVertragPdf(data: VerbandAnfrageData): Promise<Buffer> {
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
    const L     = 56;               // left margin (pt)
    const R     = doc.page.width - 56;
    const W     = R - L;            // usable width
    const ref   = refNummer();
    const datum      = heute();      // "25. Juli 2026"
    const datumKurz  = heuteKurz(); // "25.07.2026"

    // ── KOPF ─────────────────────────────────────────────────────────────────
    doc
      .fontSize(22).font("Helvetica-Bold").fillColor(RED)
      .text("SagaTrail", L, 56);

    doc
      .fontSize(8).font("Helvetica").fillColor(LIGHT)
      .text("www.sagatrail.ch  ·  info@sagatrail.ch", L, doc.y + 2);

    // Roter Trennstrich
    const lineY = doc.y + 6;
    doc
      .moveTo(L, lineY).lineTo(R, lineY)
      .strokeColor(RED).lineWidth(1.5).stroke();

    // ── TITEL ────────────────────────────────────────────────────────────────
    doc
      .fontSize(15).font("Helvetica-Bold").fillColor(DARK)
      .text("Pilotpartnerschaftsvereinbarung", L, lineY + 14);

    doc.moveDown(0.7);

    // ── PARTEIEN — "zwischen … und …"-Block mit Datum rechts ─────────────────
    const zwY = doc.y;

    // "zwischen" links, Datum rechts — gleiche Zeile
    doc
      .fontSize(9).font("Helvetica").fillColor(DARK)
      .text("zwischen", L, zwY);
    doc
      .fontSize(9).font("Helvetica").fillColor(LIGHT)
      .text(`Oberwil, den ${datumKurz}`, L, zwY, { width: W, align: "right" });

    doc.moveDown(0.4);

    // SagaTrail-Adresse
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
       .text("A.i.L. by Koch", L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    for (const zeile of ["Rolf Koch", "Mühlemattstrasse 11", "CH-4104 Oberwil BL", "CHE-286.962.827"]) {
      doc.text(zeile, L);
    }

    doc.moveDown(0.5);

    // "und"
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(MID)
       .text("und", L);

    doc.moveDown(0.4);

    // Verband-Adresse
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK)
       .text(data.verbandName, L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    doc.text(data.kontaktName + (data.kontaktTelefon ? `,  ${data.kontaktTelefon}` : ""), L);
    doc.text(data.email, L);
    doc.text(`Kantone: ${kantoneLabel(data.kantone)}`, L);

    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT)
       .text(`Referenz: ${ref}`, L);

    doc.moveDown(1.2);

    // ── POSITIONSTABELLE ─────────────────────────────────────────────────────
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK)
       .text("Pilotpaket", L);
    doc.moveDown(0.5);

    const colPos   = 40;
    const colPreis = 120;
    const colDesc  = W - colPos - colPreis;
    const tableTop = doc.y;

    // Obere dünne Linie
    doc.moveTo(L, tableTop).lineTo(R, tableTop)
       .strokeColor("#aaaaaa").lineWidth(0.5).stroke();

    doc.moveDown(0.3);
    const headerY = doc.y;

    // Spalten-Header
    doc.fontSize(8).font("Helvetica-Bold").fillColor(MID)
       .text("Pos",          L,              headerY, { width: colPos,   lineBreak: false });
    doc.text("Beschreibung", L + colPos,     headerY, { width: colDesc,  lineBreak: false });
    doc.text("Preis",        L + colPos + colDesc, headerY, { width: colPreis, align: "right" });

    doc.moveDown(0.15);
    const thickY = doc.y + 2;
    doc.moveTo(L, thickY).lineTo(R, thickY)
       .strokeColor("#323232").lineWidth(0.8).stroke();

    doc.moveDown(0.5);
    const rowY = doc.y;

    // Datenzeile
    doc.fontSize(9).font("Helvetica").fillColor(DARK)
       .text("01",                           L,              rowY, { width: colPos,   lineBreak: false });
    doc.text("Pilotpartnerschaft (6 Monate)", L + colPos,    rowY, { width: colDesc,  lineBreak: false });
    doc.font("Helvetica-Bold")
       .text("kostenlos",                    L + colPos + colDesc, rowY, { width: colPreis, align: "right" });

    doc.moveDown(0.5);
    const bottomY = doc.y + 2;
    doc.moveTo(L, bottomY).lineTo(R, bottomY)
       .strokeColor("#323232").lineWidth(0.8).stroke();

    doc.moveDown(1.5);

    // ── GEGENSTAND & LAUFZEIT ────────────────────────────────────────────────
    sectionHead(doc, "1. Gegenstand und Laufzeit", L, DARK);
    para(doc, MID, W,
      "SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche " +
      "Pilotpartnerschaft für die Dauer von 6 Monaten ab Unterzeichnung dieses Dokuments. " +
      "Ziel ist die gemeinsame Förderung kulturell geprägter Wandererlebnisse durch die " +
      "SagaTrail-App in der Destination des Verbands."
    );

    doc.moveDown(0.8);

    // ── LEISTUNGEN SagaTrail ─────────────────────────────────────────────────
    sectionHead(doc, "2. Leistungen SagaTrail", L, DARK);
    bulletList(doc, MID, L, W, [
      "Kostenlose Premium-Zugänge für Infostellen-Mitarbeitende des Verbands.",
      "Fertige digitale Marketing-Materialien (Texte, Bilder, QR-Codes, Social-Media-Vorlagen).",
      "Live-Nutzungsdashboard auf Kantonsebene: jederzeit einsehbar.",
      "Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.",
    ]);

    doc.moveDown(0.8);

    // ── PFLICHTEN VERBAND ────────────────────────────────────────────────────
    sectionHead(doc, "3. Pflichten des Verbands", L, DARK);
    bulletList(doc, MID, L, W, [
      "Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start des Pilots.",
      "Platzierung eines QR-Codes oder Links auf der «Wandern»-Seite der Verbandswebsite.",
      "Vorstellung bei 3–5 lokalen Betrieben (Restaurants, Bergbahnen, Hotels), die als " +
        "SagaTrail-Partner in Frage kommen.",
    ]);

    doc.moveDown(0.8);

    // ── KONDITIONEN ──────────────────────────────────────────────────────────
    sectionHead(doc, "4. Konditionen", L, DARK);
    bulletList(doc, MID, L, W, [
      "Die Pilotpartnerschaft ist für den Verband vollständig kostenlos.",
      "Keine laufenden Gebühren während der Pilotphase.",
      "Kündigung jederzeit schriftlich per E-Mail an info@sagatrail.ch, wirksam mit Zugang der Erklärung.",
      "Nach 6 Monaten entscheiden beide Parteien gemeinsam über Weiterführung.",
    ]);

    doc.moveDown(0.8);

    // ── DATENSCHUTZ & GERICHTSSTAND ──────────────────────────────────────────
    sectionHead(doc, "5. Datenschutz & Gerichtsstand", L, DARK);
    para(doc, MID, W,
      "SagaTrail verarbeitet Nutzungsdaten ausschliesslich aggregiert und anonymisiert " +
      "(DSG/DSGVO-konform). Personenbezogene Daten des Verbands werden ausschliesslich zur " +
      "Durchführung dieser Vereinbarung genutzt und nicht an Dritte weitergegeben. " +
      "Es gilt Schweizer Recht. Gerichtsstand ist Oberwil BL."
    );

    doc.moveDown(1.2);

    // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────────
    if (doc.y + 130 > doc.page.height - 56) {
      doc.addPage();
      doc.y = 56;
    }

    const colW   = (W - 28) / 2;  // je ~228pt
    const leftX  = L;
    const rightX = L + colW + 28;
    const sigTop = doc.y;

    // Bezeichnungen
    doc.fontSize(8).font("Helvetica").fillColor(MID)
       .text("A.i.L. by Koch  –  SagaTrail", leftX, sigTop, { width: colW });
    doc.text(data.verbandName, rightX, sigTop, { width: colW });

    doc.moveDown(0.4);
    let afterSigY = doc.y + 10;

    if (SIG_BUF) {
      doc.image(SIG_BUF, leftX, afterSigY, { width: 90 });
      afterSigY += 58;
    } else {
      afterSigY += 44;
    }

    // Unterschriftslinien
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
       .text("Ort, Datum, Unterschrift",    rightX, afterLineY, { width: colW });

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

// ── Willkommens-E-Mail bei Verband-Anlage ────────────────────────────────────

export interface VerbandWillkommenData {
  verbandName:    string;
  email:          string;
  kontaktName:    string;
  passwort:       string;   // generiertes Initialpasswort für die SagaTrail-App
  portalUrl:      string;   // URL zum Verbandsportal
}

export async function sendVerbandWillkommen(data: VerbandWillkommenData): Promise<void> {
  const envelopeFrom = process.env.SMTP_USER ?? "info@sagatrail.ch";
  const transporter = createTransporter();

  // 1) Mail an den Verband
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.email },
    from:    `SagaTrail <${envelopeFrom}>`,
    to:      data.email,
    replyTo: "info@sagatrail.ch",
    subject: `Willkommen bei SagaTrail – Ihr Verbandsportal ist bereit`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:-.3px">
            Ihr SagaTrail-Account ist bereit
          </h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;
                    border-radius:0 0 12px 12px;background:#fff">
          <p style="margin-top:0">Guten Tag ${data.kontaktName}</p>
          <p>Wir haben Ihren Verbandsportal-Account für
             <strong>${data.verbandName}</strong> eingerichtet.
             Sie haben Zugang zu zwei Bereichen:</p>

          <h3 style="color:#CC0000;margin-top:24px;margin-bottom:6px">
            1 · Verbandsportal (Nutzungsdaten &amp; Datenpflege)
          </h3>
          <p style="margin:0 0 8px">Melden Sie sich mit Ihrer E-Mail-Adresse an —
             Sie erhalten jeweils einen direkten Zugangs-Link:</p>
          <a href="${data.portalUrl}"
             style="display:inline-block;background:#CC0000;color:#fff;
                    padding:10px 20px;border-radius:8px;text-decoration:none;
                    font-weight:700;font-size:14px;margin-bottom:20px">
            Zum Verbandsportal →
          </a>

          <h3 style="color:#CC0000;margin-top:24px;margin-bottom:6px">
            2 · SagaTrail-App (Premium-Zugang)
          </h3>
          <p style="margin:0 0 12px">Sie haben einen Premium-Account für die
             SagaTrail-App erhalten, um die App aus Nutzersicht kennenlernen
             zu können. Ihre Login-Daten:</p>
          <table style="border-collapse:collapse;font-size:14px;
                        background:#f7f6f4;border-radius:8px;
                        width:100%;margin-bottom:20px">
            <tr>
              <td style="padding:10px 14px;font-weight:700;width:100px;
                         color:#555;white-space:nowrap">E-Mail</td>
              <td style="padding:10px 14px">${data.email}</td>
            </tr>
            <tr style="border-top:1px solid #e5e5e5">
              <td style="padding:10px 14px;font-weight:700;color:#555">
                Passwort</td>
              <td style="padding:10px 14px;font-family:monospace;
                         font-size:15px;letter-spacing:.5px">
                <strong>${data.passwort}</strong></td>
            </tr>
          </table>
          <p style="font-size:12px;color:#888;margin-top:-8px">
            Wir empfehlen, das Passwort nach dem ersten Login zu ändern.</p>

          <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0"/>

          <p>Bei Fragen stehen wir jederzeit zur Verfügung.</p>
          <p style="margin-bottom:0">Freundliche Grüsse<br>
          <strong>Rolf Koch</strong><br>
          Gründer SagaTrail<br>
          <a href="mailto:info@sagatrail.ch" style="color:#CC0000">
            info@sagatrail.ch</a></p>
        </div>
      </div>
    `,
  });

  // 2) Interne Kopie
  await transporter.sendMail({
    from:    `SagaTrail System <${from}>`,
    to:      "info@sagatrail.ch",
    subject: `[Verband angelegt] ${data.verbandName} – ${data.email}`,
    html: `
      <h2 style="font-family:sans-serif">Verband-Account angelegt</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Verband</td>
            <td><strong>${data.verbandName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td>
            <td>${data.kontaktName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td>
            <td>${data.email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Passwort</td>
            <td>${data.passwort}</td></tr>
      </table>
    `,
  });
}

// ── E-Mail versenden ──────────────────────────────────────────────────────────

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

export async function sendVerbandVertrag(data: VerbandAnfrageData): Promise<void> {
  const envelopeFrom = process.env.SMTP_USER ?? "info@sagatrail.ch";
  const pdfBuf  = await generateVertragPdf(data);
  const transporter = createTransporter();

  const filename = `SagaTrail-Pilotvertrag-${data.verbandName.replace(/\s+/g, "_")}.pdf`;

  // 1) Mail an Kontaktperson
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.email },
    from:    `SagaTrail <${envelopeFrom}>`,
    to:      data.email,
    replyTo: "info@sagatrail.ch",
    subject: `Pilotpartnerschaftsvereinbarung SagaTrail – ${data.verbandName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
                  color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">SagaTrail Pilotpartnerschaft</h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
          <p>Guten Tag ${data.kontaktName}</p>
          <p>Vielen Dank für Ihre Anfrage zur Pilotpartnerschaft mit SagaTrail.</p>
          <p>Im Anhang finden Sie die <strong>Pilotpartnerschaftsvereinbarung</strong> als PDF.
          Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie das unterzeichnete
          Exemplar per E-Mail zurück an:</p>
          <blockquote style="border-left:3px solid #CC0000;padding-left:16px;
                             color:#555;margin:20px 0">
            Rolf Koch · SagaTrail<br>
            <a href="mailto:info@sagatrail.ch">info@sagatrail.ch</a>
          </blockquote>
          <p>Wir melden uns danach innerhalb von 2 Werktagen, um den nächsten Schritt zu besprechen.</p>
          <p style="margin-top:32px">Freundliche Grüsse<br>
          <strong>Rolf Koch</strong><br>
          Gründer SagaTrail<br>
          <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a></p>
        </div>
      </div>
    `,
    attachments: [{
      filename,
      content:     pdfBuf,
      contentType: "application/pdf",
    }],
  });

  // 2) Interne Kopie an SagaTrail
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: "info@sagatrail.ch" },
    from:    `SagaTrail System <${envelopeFrom}>`,
    to:      "info@sagatrail.ch",
    subject: `[Neue Verband-Anfrage] ${data.verbandName}`,
    html: `
      <h2 style="font-family:sans-serif">Neue Tourismusverband-Anfrage</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Verband</td>
            <td><strong>${data.verbandName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td>
            <td>${data.email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td>
            <td>${data.kontaktName}${data.kontaktTelefon ? " · " + data.kontaktTelefon : ""}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kantone</td>
            <td>${kantoneLabel(data.kantone)}</td></tr>
      </table>
      <p style="font-family:sans-serif;color:#555;font-size:13px">
        Vertrag wurde automatisch als PDF an ${data.email} gesendet.
      </p>
    `,
    attachments: [{
      filename,
      content:     pdfBuf,
      contentType: "application/pdf",
    }],
  });
}
