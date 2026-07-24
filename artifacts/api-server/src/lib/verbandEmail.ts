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

function refNummer(): string {
  const n = Date.now() % 100000;
  return "ST-V" + String(n).padStart(5, "0");
}

// ── PDF-Vertrag (pdfkit, A4, mm-äquivalent über 72dpi points) ────────────────
export async function generateVertragPdf(data: VerbandAnfrageData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const RED   = "#CC0000";
    const DARK  = "#1a1a1a";
    const MID   = "#646464";
    const LIGHT = "#969696";
    const L     = 56;                         // left margin
    const R     = doc.page.width - 56;        // right margin
    const W     = R - L;                      // usable width
    const ref   = refNummer();
    const datum = heute();

    // ── KOPF ─────────────────────────────────────────────────────────────────
    // SagaTrail-Name rot + groß
    doc
      .fontSize(22).font("Helvetica-Bold").fillColor(RED)
      .text("SagaTrail", L, 56);

    // Adresszeile
    doc
      .fontSize(8).font("Helvetica").fillColor(LIGHT)
      .text(
        "A.i.L. by Koch  |  Mühlemattstrasse 11, 4104 Oberwil BL  |  info@sagatrail.ch",
        L, 84,
      );

    // Roter Trennstrich
    const lineY = 98;
    doc
      .moveTo(L, lineY).lineTo(R, lineY)
      .strokeColor(RED).lineWidth(1.5).stroke();

    // Titel + Referenz
    doc
      .fontSize(14).font("Helvetica-Bold").fillColor(DARK)
      .text("Pilotpartnerschaftsvereinbarung", L, lineY + 12);
    doc
      .fontSize(9).font("Helvetica").fillColor(MID)
      .text(`Referenz: ${ref}   |   Datum: ${datum}`, L, doc.y + 2);

    doc.moveDown(1);

    // ── PARTEIEN ─────────────────────────────────────────────────────────────
    sectionHead(doc, "Vertragsparteien", L, RED, DARK);

    const rows: [string, string][] = [
      ["Anbieter:",       "A.i.L. by Koch, Mühlemattstrasse 11, 4104 Oberwil BL"],
      ["UID:",            "CHE-286.962.827  |  info@sagatrail.ch"],
      ["Partner:",        `${data.verbandName}`],
      ["Kontaktperson:",  `${data.kontaktName}${data.kontaktTelefon ? ", " + data.kontaktTelefon : ""}`],
      ["E-Mail:",         data.email],
      ["Kantone:",        kantoneLabel(data.kantone)],
    ];
    tableRows(doc, rows, L, MID, DARK);

    doc.moveDown(0.8);

    // ── GEGENSTAND & LAUFZEIT ────────────────────────────────────────────────
    sectionHead(doc, "1. Gegenstand und Laufzeit", L, RED, DARK);
    para(doc, MID, W,
      "SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche " +
      "Pilotpartnerschaft für die Dauer von 6 Monaten ab Unterzeichnung dieses Dokuments. " +
      "Ziel ist die gemeinsame Förderung kulturell geprägter Wandererlebnisse durch die " +
      "SagaTrail-App in der Destination des Verbands."
    );

    // ── LEISTUNGEN SagaTrail ─────────────────────────────────────────────────
    sectionHead(doc, "2. Leistungen SagaTrail", L, RED, DARK);
    bulletList(doc, MID, L, [
      "Kostenlose Premium-Zugänge für Infostellen-Mitarbeitende des Verbands.",
      "Fertige digitale Marketing-Materialien (Texte, Bilder, QR-Codes, Social-Media-Vorlagen).",
      "Live-Nutzungsdashboard auf Kantonsebene: jederzeit einsehbar.",
      "Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.",
    ]);

    // ── PFLICHTEN VERBAND ────────────────────────────────────────────────────
    sectionHead(doc, "3. Pflichten des Verbands", L, RED, DARK);
    bulletList(doc, MID, L, [
      "Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start des Pilots.",
      "Platzierung eines QR-Codes oder Links auf der «Wandern»-Seite der Verbandswebsite.",
      "Vorstellung bei 3–5 lokalen Betrieben (Restaurants, Bergbahnen, Hotels), die als " +
        "SagaTrail-Partner in Frage kommen.",
    ]);

    // ── KONDITIONEN ──────────────────────────────────────────────────────────
    sectionHead(doc, "4. Konditionen", L, RED, DARK);
    bulletList(doc, MID, L, [
      "Die Pilotpartnerschaft ist für den Verband vollständig kostenlos.",
      "Keine laufenden Gebühren während der Pilotphase.",
      "Kündigung jederzeit schriftlich per E-Mail, wirksam mit Zugang der Erklärung.",
      "Nach 6 Monaten entscheiden beide Parteien gemeinsam über Weiterführung.",
    ]);

    // ── DATENSCHUTZ & GERICHTSSTAND ──────────────────────────────────────────
    sectionHead(doc, "5. Datenschutz & Gerichtsstand", L, RED, DARK);
    para(doc, MID, W,
      "SagaTrail verarbeitet Nutzungsdaten ausschliesslich aggregiert und anonymisiert " +
      "(DSG/DSGVO-konform). Personenbezogene Daten des Verbands werden ausschliesslich zur " +
      "Durchführung dieser Vereinbarung genutzt und nicht an Dritte weitergegeben. " +
      "Es gilt Schweizer Recht. Gerichtsstand ist Basel."
    );

    doc.moveDown(0.6);

    // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────────
    // Sicherstellen, dass genug Platz auf der Seite ist
    const neededH = 120;
    if (doc.y + neededH > doc.page.height - 56) {
      doc.addPage();
      doc.y = 56;
    }

    sectionHead(doc, "Unterschriften", L, RED, DARK);

    const colW   = (W - 36) / 2;
    const leftX  = L;
    const rightX = L + colW + 36;
    const sigTop = doc.y + 4;

    // Linke Spalte — SagaTrail (vorunterschrieben)
    doc
      .fontSize(8).font("Helvetica").fillColor(MID)
      .text("A.i.L. by Koch – SagaTrail", leftX, sigTop, { width: colW });

    let afterSigY = sigTop + 16;

    if (SIG_BUF) {
      // Signature PNG (transparent background) — 90 points breit
      doc.image(SIG_BUF, leftX, afterSigY, { width: 90 });
      afterSigY += 56;
    } else {
      afterSigY += 40;
    }

    // Linie links
    doc
      .moveTo(leftX, afterSigY).lineTo(leftX + colW, afterSigY)
      .strokeColor("#aaaaaa").lineWidth(0.5).stroke();

    doc
      .fontSize(9).font("Helvetica-Bold").fillColor(DARK)
      .text("Rolf Koch, Inhaber", leftX, afterSigY + 4, { width: colW });
    doc
      .fontSize(8).font("Helvetica").fillColor(LIGHT)
      .text(datum, leftX, doc.y + 1, { width: colW });

    // Rechte Spalte — Verband (leer zum Ausfüllen)
    doc
      .fontSize(8).font("Helvetica").fillColor(MID)
      .text(data.verbandName, rightX, sigTop, { width: colW });

    // Linie rechts (gleiche Y wie links)
    doc
      .moveTo(rightX, afterSigY).lineTo(rightX + colW, afterSigY)
      .strokeColor("#aaaaaa").lineWidth(0.5).stroke();

    doc
      .fontSize(8).font("Helvetica").fillColor(LIGHT)
      .text("Ort, Datum, Unterschrift", rightX, afterSigY + 4, { width: colW });

    // ── FUSSZEILE ─────────────────────────────────────────────────────────────
    doc
      .fontSize(7.5).font("Helvetica-Oblique").fillColor(LIGHT)
      .text(
        `A.i.L. by Koch – www.sagatrail.ch – info@sagatrail.ch  |  Referenz: ${ref}`,
        L,
        doc.page.height - 36,
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
  red: string,
  dark: string,
) {
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica-Bold").fillColor(dark).text(title, l);
  const y = doc.y + 1;
  doc.moveTo(l, y).lineTo(l + 28, y).strokeColor(red).lineWidth(1.2).stroke();
  doc.moveDown(0.45);
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
  items: string[],
) {
  doc
    .fontSize(9).font("Helvetica").fillColor(mid)
    .list(items, l, doc.y, { bulletRadius: 1.8, textIndent: 12, lineGap: 2 });
}

function tableRows(
  doc: InstanceType<typeof PDFDocument>,
  rows: [string, string][],
  l: number,
  mid: string,
  dark: string,
) {
  const labelW = 90;
  for (const [label, value] of rows) {
    const y = doc.y;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(dark).text(label, l, y, { width: labelW, continued: false });
    doc.fontSize(9).font("Helvetica").fillColor(mid).text(value, l + labelW, y, { width: 340 });
    doc.moveDown(0.15);
  }
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
  const from    = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "info@sagatrail.ch";
  const pdfBuf  = await generateVertragPdf(data);
  const transporter = createTransporter();

  const filename = `SagaTrail-Pilotvertrag-${data.verbandName.replace(/\s+/g, "_")}.pdf`;

  // 1) Mail an Kontaktperson
  await transporter.sendMail({
    from:    `SagaTrail <${from}>`,
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
    from:    `SagaTrail System <${from}>`,
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
