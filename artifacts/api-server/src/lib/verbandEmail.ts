/**
 * Generiert PDF-Vertrag und versendet ihn per E-Mail an die Kontaktperson
 * des Tourismusverbands sowie als Kopie an info@sagatrail.ch.
 *
 * SMTP-Konfiguration via Env-Vars:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 */
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";

export interface VerbandAnfrageData {
  verbandName: string;
  email: string;
  kontaktName: string;
  kontaktTelefon?: string | null;
  kantone: string; // comma-separated
}

// ── PDF-Vertrag generieren ────────────────────────────────────────────────────

function kantoneLabel(kantone: string): string {
  if (kantone === "alle") return "Alle 26 Kantone der Schweiz";
  return kantone
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .join(", ");
}

function heute(): string {
  return new Date().toLocaleDateString("de-CH", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export async function generateVertragPdf(data: VerbandAnfrageData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 72, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const RED = "#CC0000";
    const DARK = "#1a1a1a";
    const MID = "#555555";
    const W = doc.page.width - 144; // usable width

    // ── Header ────────────────────────────────────────────────────────────────
    doc
      .fontSize(22)
      .fillColor(RED)
      .font("Helvetica-Bold")
      .text("SagaTrail", { continued: true })
      .fillColor(DARK)
      .text("  ·  Pilotpartnerschaftsvereinbarung");

    doc.moveDown(0.4);
    doc
      .fontSize(10)
      .fillColor(MID)
      .font("Helvetica")
      .text(`Datum: ${heute()}`);

    doc.moveDown(0.3);
    doc
      .moveTo(72, doc.y)
      .lineTo(72 + W, doc.y)
      .strokeColor(RED)
      .lineWidth(2)
      .stroke();

    doc.moveDown(1.2);

    // ── Parteien ──────────────────────────────────────────────────────────────
    doc
      .fontSize(12)
      .fillColor(DARK)
      .font("Helvetica-Bold")
      .text("Zwischen den Parteien:");

    doc.moveDown(0.6);

    doc
      .fontSize(10)
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text("Partei A — SagaTrail");
    doc
      .font("Helvetica")
      .fillColor(MID)
      .text("Rolf Koch, Gründer SagaTrail")
      .text("E-Mail: info@sagatrail.ch");

    doc.moveDown(0.8);

    doc
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text(`Partei B — ${data.verbandName}`);
    doc
      .font("Helvetica")
      .fillColor(MID)
      .text(`Ansprechpartner: ${data.kontaktName}`)
      .text(`E-Mail: ${data.email}`);
    if (data.kontaktTelefon) {
      doc.text(`Telefon: ${data.kontaktTelefon}`);
    }
    doc.text(`Zuständige Kantone: ${kantoneLabel(data.kantone)}`);

    doc.moveDown(1.2);

    // ── Gegenstand ────────────────────────────────────────────────────────────
    section(doc, RED, DARK, MID, "1. Gegenstand und Laufzeit");
    para(doc, MID,
      "SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche Pilotpartnerschaft " +
      "für die Dauer von 6 Monaten ab Unterzeichnung dieses Dokuments. Ziel ist die gemeinsame Förderung " +
      "kulturell geprägter Wandererlebnisse durch die SagaTrail-App in der Destination des Verbands."
    );

    section(doc, RED, DARK, MID, "2. Beiträge des Verbands");
    bulletList(doc, MID, [
      "Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start des Pilots.",
      "Platzierung eines QR-Codes oder Links auf der «Wandern»-Seite der Verbandswebsite und an Infostellen.",
      "Vorstellung bei 3–5 lokalen Betrieben (Restaurants, Bergbahnen, Hotels), die als SagaTrail-Partner in Frage kommen.",
    ]);

    section(doc, RED, DARK, MID, "3. Leistungen SagaTrail");
    bulletList(doc, MID, [
      "Kostenlose Premium-Zugänge für Infostellen-Mitarbeitende des Verbands.",
      "Fertige digitale Marketing-Materialien (Texte, Bilder, QR-Codes, Social-Media-Vorlagen).",
      "Live-Nutzungsdashboard auf Kantonsebene: jederzeit einsehbar.",
      "Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.",
    ]);

    section(doc, RED, DARK, MID, "4. Kosten");
    para(doc, MID,
      "Die Pilotpartnerschaft ist für den Verband vollständig kostenlos. Es entstehen keine laufenden " +
      "Gebühren. Nach Ablauf der 6 Monate entscheiden beide Parteien gemeinsam über eine allfällige " +
      "Weiterführung oder Vertiefung der Zusammenarbeit."
    );

    section(doc, RED, DARK, MID, "5. Kündigung");
    para(doc, MID,
      "Beide Parteien können die Vereinbarung jederzeit ohne Angabe von Gründen schriftlich per E-Mail " +
      "kündigen. Die Kündigung wird mit Zugang der Erklärung wirksam."
    );

    section(doc, RED, DARK, MID, "6. Datenschutz");
    para(doc, MID,
      "SagaTrail verarbeitet Nutzungsdaten ausschliesslich aggregiert und anonymisiert. " +
      "Personenbezogene Daten des Verbands (Kontaktangaben) werden ausschliesslich zur " +
      "Vertragsdurchführung genutzt und nicht an Dritte weitergegeben."
    );

    section(doc, RED, DARK, MID, "7. Anwendbares Recht");
    para(doc, MID,
      "Es gilt Schweizer Recht. Gerichtsstand ist Basel."
    );

    // ── Unterschriften ────────────────────────────────────────────────────────
    doc.moveDown(1.5);
    doc
      .moveTo(72, doc.y)
      .lineTo(72 + W, doc.y)
      .strokeColor("#dddddd")
      .lineWidth(1)
      .stroke();

    doc.moveDown(1);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor(DARK)
      .text("Unterschriften");

    doc.moveDown(1);

    // Zwei Spalten
    const colW = (W - 40) / 2;
    const leftX = 72;
    const rightX = 72 + colW + 40;
    const sigY = doc.y;

    // Linke Spalte — SagaTrail (vorunterschrieben)
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(MID)
      .text("Partei A — SagaTrail", leftX, sigY, { width: colW });

    doc.moveDown(0.4);
    const lineY1 = doc.y + 28;
    doc
      .moveTo(leftX, lineY1)
      .lineTo(leftX + colW, lineY1)
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .stroke();

    // Signatur-Text (stilisiert als «Unterschrift»)
    doc
      .fontSize(18)
      .font("Helvetica-Oblique")
      .fillColor(RED)
      .text("Rolf Koch", leftX, lineY1 - 22, { width: colW });

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(MID)
      .text("Rolf Koch, SagaTrail", leftX, lineY1 + 6, { width: colW })
      .text(`Basel, ${heute()}`, leftX, doc.y, { width: colW });

    // Rechte Spalte — Verband (leer zum Ausfüllen)
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(MID)
      .text(`Partei B — ${data.verbandName}`, rightX, sigY, { width: colW });

    const lineY2 = lineY1;
    doc
      .moveTo(rightX, lineY2)
      .lineTo(rightX + colW, lineY2)
      .strokeColor("#aaaaaa")
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor(MID)
      .text("Unterschrift, Name", rightX, lineY2 + 6, { width: colW })
      .text("Ort, Datum", rightX, doc.y + 2, { width: colW });

    // ── Footer ────────────────────────────────────────────────────────────────
    doc.moveDown(3);
    doc
      .fontSize(8)
      .fillColor("#aaaaaa")
      .text("SagaTrail · info@sagatrail.ch · sagatrail.ch", { align: "center" });

    doc.end();
  });
}

function section(
  doc: InstanceType<typeof PDFDocument>,
  red: string,
  dark: string,
  _mid: string,
  title: string,
) {
  doc.moveDown(0.8);
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(dark)
    .text(title);
  doc
    .moveTo(72, doc.y + 2)
    .lineTo(72 + 30, doc.y + 2)
    .strokeColor(red)
    .lineWidth(1.5)
    .stroke();
  doc.moveDown(0.5);
}

function para(doc: InstanceType<typeof PDFDocument>, mid: string, text: string) {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(mid)
    .text(text, { lineGap: 3 });
}

function bulletList(
  doc: InstanceType<typeof PDFDocument>,
  mid: string,
  items: string[],
) {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(mid)
    .list(items, { bulletRadius: 2, textIndent: 14, lineGap: 2 });
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
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "info@sagatrail.ch";
  const pdfBuf = await generateVertragPdf(data);

  const transporter = createTransporter();

  // 1) Mail an Kontaktperson mit Vertrag als Anhang
  await transporter.sendMail({
    from: `SagaTrail <${from}>`,
    to: data.email,
    replyTo: "info@sagatrail.ch",
    subject: `Pilotpartnerschaftsvereinbarung SagaTrail – ${data.verbandName}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">SagaTrail Pilotpartnerschaft</h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px">
          <p>Guten Tag ${data.kontaktName}</p>
          <p>Vielen Dank für Ihre Anfrage zur Pilotpartnerschaft mit SagaTrail.</p>
          <p>Im Anhang finden Sie die <strong>Pilotpartnerschaftsvereinbarung</strong> als PDF.
          Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie das unterzeichnete
          Exemplar per E-Mail oder Post zurück an:</p>
          <blockquote style="border-left:3px solid #CC0000;padding-left:16px;color:#555;margin:20px 0">
            Rolf Koch · SagaTrail<br>
            info@sagatrail.ch
          </blockquote>
          <p>Wir melden uns danach innerhalb von 2 Werktagen bei Ihnen, um den nächsten Schritt zu besprechen.</p>
          <p>Bei Fragen stehe ich Ihnen jederzeit zur Verfügung.</p>
          <p style="margin-top:32px">Freundliche Grüsse<br>
          <strong>Rolf Koch</strong><br>
          Gründer SagaTrail<br>
          <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `SagaTrail-Pilotvertrag-${data.verbandName.replace(/\s+/g, "_")}.pdf`,
        content: pdfBuf,
        contentType: "application/pdf",
      },
    ],
  });

  // 2) Interne Benachrichtigung an SagaTrail
  await transporter.sendMail({
    from: `SagaTrail System <${from}>`,
    to: "info@sagatrail.ch",
    subject: `[Neue Verband-Anfrage] ${data.verbandName}`,
    html: `
      <h2>Neue Tourismusverband-Anfrage</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 12px 4px 0;color:#888">Verband</td><td><strong>${data.verbandName}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">E-Mail</td><td>${data.email}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Kontakt</td><td>${data.kontaktName}${data.kontaktTelefon ? ` · ${data.kontaktTelefon}` : ""}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#888">Kantone</td><td>${kantoneLabel(data.kantone)}</td></tr>
      </table>
      <p>Vertrag wurde automatisch an ${data.email} gesendet.</p>
    `,
  });
}
