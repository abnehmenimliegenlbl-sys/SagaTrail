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

// ── Mehrsprachige Vertragstexte (Verband) ─────────────────────────────────────

interface VerbandTexte {
  lang:                 string;
  filename:             string;
  title:                string;
  zwischen:             string;
  und:                  string;
  referenz:             string;
  kantoneHeader:        string;
  pilotpaket:           string;
  pos:                  string;
  beschreibungCol:      string;
  preisCol:             string;
  pilotRowDesc:         string;
  pilotRowPreis:        string;
  s1Title:              string;
  s1Body:               string;
  s2Title:              string;
  s2Bullets:            string[];
  s3Title:              string;
  s3Bullets:            string[];
  s4Title:              string;
  s4Bullets:            string[];
  s5Title:              string;
  s5Body:               string;
  s6Title:              string;
  s6Body:               string;
  signerName:           string;
  ortDatumUnterschrift: string;
  emailSubject:         (verband: string) => string;
  emailGreeting:        (name: string) => string;
  emailBody:            string;
  emailReturn:          string;
  emailNext:            string;
  emailSignOff:         string;
  emailAgb:             string;
  welcomeSubject:       string;
  welcomeHeadline:      string;
  welcomeIntro:         (verband: string) => string;
  welcomePortalHead:    string;
  welcomePortalText:    string;
  welcomePortalBtn:     string;
  welcomeAppHead:       string;
  welcomeAppText:       string;
  welcomeAppHint:       string;
  welcomeClosing:       string;
}

const VBAND_DE: VerbandTexte = {
  lang: "DE", filename: "Pilotvertrag-DE",
  title: "Pilotpartnerschaftsvereinbarung",
  zwischen: "zwischen", und: "und",
  referenz: "Referenz", kantoneHeader: "Kantone",
  pilotpaket: "Pilotpaket",
  pos: "Pos", beschreibungCol: "Beschreibung", preisCol: "Preis",
  pilotRowDesc: "Pilotpartnerschaft (6 Monate)", pilotRowPreis: "kostenlos",
  s1Title: "1. Gegenstand und Laufzeit",
  s1Body: "SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche Pilotpartnerschaft für die Dauer von 6 Monaten ab Unterzeichnung dieses Dokuments. Ziel ist die gemeinsame Förderung kulturell geprägter Wandererlebnisse durch die SagaTrail-App in der Destination des Verbands.",
  s2Title: "2. Leistungen SagaTrail",
  s2Bullets: [
    "Kostenlose Premium-Zugänge für Infostellen-Mitarbeitende des Verbands.",
    "Fertige digitale Marketing-Materialien (Texte, Bilder, QR-Codes, Social-Media-Vorlagen).",
    "Live-Nutzungsdashboard auf Kantonsebene: jederzeit einsehbar.",
    "Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.",
  ],
  s3Title: "3. Pflichten des Verbands",
  s3Bullets: [
    "Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start des Pilots.",
    "Platzierung eines QR-Codes oder Links auf der «Wandern»-Seite der Verbandswebsite.",
    "Vorstellung bei 3–5 lokalen Betrieben (Restaurants, Bergbahnen, Hotels), die als SagaTrail-Partner in Frage kommen.",
  ],
  s4Title: "4. Konditionen",
  s4Bullets: [
    "Die Pilotpartnerschaft und darüberhinausgehende Partnerschaften sind für den Verband vollständig kostenlos.",
    "Keine laufenden Gebühren während der Pilotphase oder darüber hinaus.",
    "Kündigung jederzeit schriftlich per E-Mail an info@sagatrail.ch, wirksam mit Zugang der Erklärung.",
    "Nach 6 Monaten entscheiden beide Parteien gemeinsam über Weiterführung.",
  ],
  s5Title: "5. Datenschutz & Gerichtsstand",
  s5Body: "SagaTrail verarbeitet Nutzungsdaten ausschliesslich aggregiert und anonymisiert (DSG/DSGVO-konform). Personenbezogene Daten des Verbands werden ausschliesslich zur Durchführung dieser Vereinbarung genutzt und nicht an Dritte weitergegeben. Es gilt Schweizer Recht. Gerichtsstand ist Oberwil BL.",
  s6Title: "6. Allgemeine Geschäftsbedingungen",
  s6Body: "Es gelten die Allgemeinen Geschäftsbedingungen von SagaTrail: www.sagatrail.ch/agb",
  signerName: "Rolf Koch, Inhaber", ortDatumUnterschrift: "Ort, Datum, Unterschrift",
  emailSubject: (v) => `Pilotpartnerschaftsvereinbarung SagaTrail – ${v}`,
  emailGreeting: (n) => `Guten Tag ${n}`,
  emailBody: "Vielen Dank für Ihre Anfrage zur Pilotpartnerschaft mit SagaTrail.\n\nIm Anhang finden Sie die Pilotpartnerschaftsvereinbarung als PDF.",
  emailReturn: "Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie das unterzeichnete Exemplar per E-Mail zurück an: info@sagatrail.ch",
  emailNext: "Wir melden uns danach innerhalb von 2 Werktagen, um den nächsten Schritt zu besprechen.",
  emailSignOff: "Freundliche Grüsse\nRolf Koch\nGründer SagaTrail",
  emailAgb: "AGB: www.sagatrail.ch/agb",
  welcomeSubject: "Willkommen bei SagaTrail – Ihr Verbandsportal ist bereit",
  welcomeHeadline: "Ihr SagaTrail-Account ist bereit",
  welcomeIntro: (v) => `Wir haben Ihren Verbandsportal-Account für <strong>${v}</strong> eingerichtet. Sie haben Zugang zu zwei Bereichen:`,
  welcomePortalHead: "1 · Verbandsportal (Nutzungsdaten & Datenpflege)",
  welcomePortalText: "Melden Sie sich mit Ihrer E-Mail-Adresse an — Sie erhalten jeweils einen direkten Zugangs-Link:",
  welcomePortalBtn: "Zum Verbandsportal →",
  welcomeAppHead: "2 · SagaTrail-App (Premium-Zugang)",
  welcomeAppText: "Sie haben einen Premium-Account für die SagaTrail-App erhalten, um die App aus Nutzersicht kennenlernen zu können.",
  welcomeAppHint: "Wir empfehlen, das Passwort nach dem ersten Login zu ändern.",
  welcomeClosing: "Bei Fragen stehen wir jederzeit zur Verfügung.",
};

const VBAND_FR: VerbandTexte = {
  lang: "FR", filename: "Contrat-Pilote-FR",
  title: "Convention de partenariat pilote",
  zwischen: "entre", und: "et",
  referenz: "Référence", kantoneHeader: "Cantons",
  pilotpaket: "Forfait pilote",
  pos: "Pos", beschreibungCol: "Description", preisCol: "Prix",
  pilotRowDesc: "Partenariat pilote (6 mois)", pilotRowPreis: "gratuit",
  s1Title: "1. Objet et durée",
  s1Body: "SagaTrail et l'association touristique mentionnée ci-dessus conviennent d'un partenariat pilote gratuit pour une durée de 6 mois à compter de la signature du présent document. L'objectif est la promotion commune d'expériences de randonnée culturelles via l'application SagaTrail dans la destination de l'association.",
  s2Title: "2. Prestations SagaTrail",
  s2Bullets: [
    "Accès Premium gratuits pour les collaborateurs des offices d'information de l'association.",
    "Matériel de marketing numérique prêt à l'emploi (textes, images, QR codes, modèles pour réseaux sociaux).",
    "Tableau de bord de l'utilisation en direct au niveau cantonal, consultable à tout moment.",
    "Prise en charge de la démarche auprès des établissements locaux pour le programme partenaire.",
  ],
  s3Title: "3. Obligations de l'association",
  s3Bullets: [
    "Mention du partenariat dans la newsletter ou les réseaux sociaux au lancement du pilote.",
    "Placement d'un QR code ou d'un lien sur la page «Randonnée» du site web de l'association.",
    "Introduction auprès de 3–5 établissements locaux (restaurants, remontées mécaniques, hôtels) pouvant devenir partenaires SagaTrail.",
  ],
  s4Title: "4. Conditions",
  s4Bullets: [
    "Le partenariat pilote est entièrement gratuit pour l'association.",
    "Aucun frais courant pendant la phase pilote.",
    "Résiliation à tout moment par e-mail à info@sagatrail.ch, avec effet à réception.",
    "Après 6 mois, les deux parties décident ensemble de la continuation.",
  ],
  s5Title: "5. Protection des données & for juridique",
  s5Body: "SagaTrail traite les données d'utilisation exclusivement de manière agrégée et anonymisée (conforme LPD/RGPD). Les données personnelles de l'association sont utilisées exclusivement pour l'exécution du présent accord et ne sont pas transmises à des tiers. Le droit suisse est applicable. Le for est à Oberwil BL.",
  s6Title: "6. Conditions générales",
  s6Body: "Les conditions générales de SagaTrail sont applicables : www.sagatrail.ch/agb",
  signerName: "Rolf Koch, fondateur", ortDatumUnterschrift: "Lieu, date, signature",
  emailSubject: (v) => `Convention de partenariat pilote SagaTrail – ${v}`,
  emailGreeting: (n) => `Bonjour ${n}`,
  emailBody: "Merci de votre demande de partenariat pilote avec SagaTrail.\n\nVous trouverez ci-joint la convention de partenariat pilote en PDF.",
  emailReturn: "Veuillez imprimer le document, le signer et retourner l'exemplaire signé par e-mail à : info@sagatrail.ch",
  emailNext: "Nous vous contacterons dans les 2 jours ouvrables pour discuter des prochaines étapes.",
  emailSignOff: "Cordiales salutations\nRolf Koch\nFondateur SagaTrail",
  emailAgb: "CGV : www.sagatrail.ch/agb",
  welcomeSubject: "Bienvenue chez SagaTrail – Votre portail d'association est prêt",
  welcomeHeadline: "Votre compte SagaTrail est prêt",
  welcomeIntro: (v) => `Votre compte portail d'association pour <strong>${v}</strong> a été configuré. Vous avez accès à deux espaces :`,
  welcomePortalHead: "1 · Portail d'association (données d'utilisation & gestion)",
  welcomePortalText: "Connectez-vous avec votre adresse e-mail — vous recevrez à chaque fois un lien d'accès direct :",
  welcomePortalBtn: "Vers le portail d'association →",
  welcomeAppHead: "2 · Application SagaTrail (accès Premium)",
  welcomeAppText: "Vous avez reçu un compte Premium pour l'application SagaTrail afin de découvrir l'app du point de vue des utilisateurs.",
  welcomeAppHint: "Nous vous recommandons de changer le mot de passe après la première connexion.",
  welcomeClosing: "Pour toute question, nous sommes à votre disposition.",
};

const VBAND_IT: VerbandTexte = {
  lang: "IT", filename: "Contratto-Pilota-IT",
  title: "Accordo di partnership pilota",
  zwischen: "tra", und: "e",
  referenz: "Riferimento", kantoneHeader: "Cantoni",
  pilotpaket: "Pacchetto pilota",
  pos: "Pos", beschreibungCol: "Descrizione", preisCol: "Prezzo",
  pilotRowDesc: "Partnership pilota (6 mesi)", pilotRowPreis: "gratuito",
  s1Title: "1. Oggetto e durata",
  s1Body: "SagaTrail e l'associazione turistica sopra menzionata concordano una partnership pilota gratuita per una durata di 6 mesi dalla firma del presente documento. L'obiettivo è la promozione congiunta di esperienze escursionistiche culturali tramite l'app SagaTrail nella destinazione dell'associazione.",
  s2Title: "2. Servizi SagaTrail",
  s2Bullets: [
    "Accessi Premium gratuiti per il personale dei centri informazioni dell'associazione.",
    "Materiale di marketing digitale pronto all'uso (testi, immagini, QR code, modelli per social media).",
    "Dashboard di utilizzo in tempo reale a livello cantonale, consultabile in qualsiasi momento.",
    "Gestione della comunicazione con le strutture locali per il programma partner.",
  ],
  s3Title: "3. Obblighi dell'associazione",
  s3Bullets: [
    "Menzione della partnership nella newsletter o sui social media al lancio del progetto pilota.",
    "Inserimento di un QR code o link sulla pagina «Escursionismo» del sito web dell'associazione.",
    "Presentazione a 3–5 strutture locali (ristoranti, impianti di risalita, hotel) che potrebbero diventare partner SagaTrail.",
  ],
  s4Title: "4. Condizioni",
  s4Bullets: [
    "La partnership pilota è completamente gratuita per l'associazione.",
    "Nessun costo ricorrente durante la fase pilota.",
    "Disdetta in qualsiasi momento per iscritto via e-mail a info@sagatrail.ch, efficace a ricezione.",
    "Dopo 6 mesi, entrambe le parti decidono insieme sulla continuazione.",
  ],
  s5Title: "5. Protezione dei dati & foro",
  s5Body: "SagaTrail elabora i dati di utilizzo esclusivamente in forma aggregata e anonimizzata (conforme LPD/GDPR). I dati personali dell'associazione sono utilizzati esclusivamente per l'esecuzione del presente accordo e non vengono trasmessi a terzi. Si applica il diritto svizzero. Il foro è Oberwil BL.",
  s6Title: "6. Condizioni generali",
  s6Body: "Si applicano le condizioni generali di SagaTrail: www.sagatrail.ch/agb",
  signerName: "Rolf Koch, fondatore", ortDatumUnterschrift: "Luogo, data, firma",
  emailSubject: (v) => `Accordo di partnership pilota SagaTrail – ${v}`,
  emailGreeting: (n) => `Buongiorno ${n}`,
  emailBody: "Grazie per la Sua richiesta di partnership pilota con SagaTrail.\n\nIn allegato trova l'accordo di partnership pilota in PDF.",
  emailReturn: "La preghiamo di stampare il documento, firmarlo e inviare l'esemplare firmato per e-mail a: info@sagatrail.ch",
  emailNext: "La contatteremo entro 2 giorni lavorativi per discutere i prossimi passi.",
  emailSignOff: "Cordiali saluti\nRolf Koch\nFondatore SagaTrail",
  emailAgb: "CGV: www.sagatrail.ch/agb",
  welcomeSubject: "Benvenuti in SagaTrail – Il vostro portale associativo è pronto",
  welcomeHeadline: "Il vostro account SagaTrail è pronto",
  welcomeIntro: (v) => `Il vostro account portale associativo per <strong>${v}</strong> è stato configurato. Avete accesso a due aree:`,
  welcomePortalHead: "1 · Portale associativo (dati di utilizzo & gestione dati)",
  welcomePortalText: "Effettuate il login con il vostro indirizzo e-mail — riceverete ogni volta un link di accesso diretto:",
  welcomePortalBtn: "Al portale associativo →",
  welcomeAppHead: "2 · App SagaTrail (accesso Premium)",
  welcomeAppText: "Avete ricevuto un account Premium per l'app SagaTrail per scoprire l'app dal punto di vista degli utenti.",
  welcomeAppHint: "Vi consigliamo di cambiare la password dopo il primo accesso.",
  welcomeClosing: "Per qualsiasi domanda siamo a vostra disposizione.",
};

const ALLE_VBAND_TEXTE = [VBAND_DE, VBAND_FR, VBAND_IT] as const;

// ── PDF-Vertrag (pdfkit, A4) ──────────────────────────────────────────────────
export async function generateVertragPdf(data: VerbandAnfrageData, texte: VerbandTexte): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: "A4", autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end",  () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const RED = "#CC0000", DARK = "#1a1a1a", MID = "#646464", LIGHT = "#969696";
    const L = 56, R = doc.page.width - 56, W = R - L;
    const ref = refNummer(), datum = heute(), datumKurz = heuteKurz();

    // ── KOPF
    doc.fontSize(22).font("Helvetica-Bold").fillColor(RED).text("SagaTrail", L, 56);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text("www.sagatrail.ch  ·  info@sagatrail.ch", L, doc.y + 2);
    const lineY = doc.y + 6;
    doc.moveTo(L, lineY).lineTo(R, lineY).strokeColor(RED).lineWidth(1.5).stroke();

    // ── TITEL
    doc.fontSize(15).font("Helvetica-Bold").fillColor(DARK).text(texte.title, L, lineY + 14);
    doc.moveDown(0.7);

    // ── PARTEIEN
    const zwY = doc.y;
    doc.fontSize(9).font("Helvetica").fillColor(DARK).text(texte.zwischen, L, zwY);
    doc.fontSize(9).font("Helvetica").fillColor(LIGHT).text(`Oberwil, ${datumKurz}`, L, zwY, { width: W, align: "right" });
    doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text("A.i.L. by Koch", L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    for (const z of ["Rolf Koch", "Mühlemattstrasse 11", "CH-4104 Oberwil BL", "CHE-286.962.827"]) doc.text(z, L);
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(MID).text(texte.und, L);
    doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text(data.verbandName, L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    doc.text(data.kontaktName + (data.kontaktTelefon ? `,  ${data.kontaktTelefon}` : ""), L);
    doc.text(data.email, L);
    doc.text(`${texte.kantoneHeader}: ${kantoneLabel(data.kantone)}`, L);
    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text(`${texte.referenz}: ${ref}`, L);
    doc.moveDown(1.2);

    // ── POSITIONSTABELLE
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text(texte.pilotpaket, L);
    doc.moveDown(0.5);
    const colPos = 40, colPreis = 120, colDesc = W - colPos - colPreis;
    const tableTop = doc.y;
    doc.moveTo(L, tableTop).lineTo(R, tableTop).strokeColor("#aaaaaa").lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    const headerY = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").fillColor(MID)
       .text(texte.pos,            L,                   headerY, { width: colPos,   lineBreak: false });
    doc.text(texte.beschreibungCol, L + colPos,          headerY, { width: colDesc,  lineBreak: false });
    doc.text(texte.preisCol,        L + colPos + colDesc, headerY, { width: colPreis, align: "right" });
    doc.moveDown(0.15);
    const thickY = doc.y + 2;
    doc.moveTo(L, thickY).lineTo(R, thickY).strokeColor("#323232").lineWidth(0.8).stroke();
    doc.moveDown(0.5);
    const rowY = doc.y;
    doc.fontSize(9).font("Helvetica").fillColor(DARK)
       .text("01", L, rowY, { width: colPos, lineBreak: false });
    doc.text(texte.pilotRowDesc, L + colPos, rowY, { width: colDesc, lineBreak: false });
    doc.font("Helvetica-Bold").text(texte.pilotRowPreis, L + colPos + colDesc, rowY, { width: colPreis, align: "right" });
    doc.moveDown(0.5);
    const bottomY = doc.y + 2;
    doc.moveTo(L, bottomY).lineTo(R, bottomY).strokeColor("#323232").lineWidth(0.8).stroke();
    doc.moveDown(1.5);

    // ── SECTIONS 1–6
    sectionHead(doc, texte.s1Title, L, DARK);
    para(doc, MID, W, texte.s1Body);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s2Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s2Bullets);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s3Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s3Bullets);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s4Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s4Bullets);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s5Title, L, DARK);
    para(doc, MID, W, texte.s5Body);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s6Title, L, DARK);
    para(doc, MID, W, texte.s6Body);
    doc.moveDown(1.2);

    // ── UNTERSCHRIFTEN
    if (doc.y + 130 > doc.page.height - 56) { doc.addPage(); doc.y = 56; }
    const colW = (W - 28) / 2, leftX = L, rightX = L + colW + 28;
    const sigTop = doc.y;
    doc.fontSize(8).font("Helvetica").fillColor(MID).text("A.i.L. by Koch  –  SagaTrail", leftX, sigTop, { width: colW });
    doc.text(data.verbandName, rightX, sigTop, { width: colW });
    doc.moveDown(0.4);
    let afterSigY = doc.y + 10;
    if (SIG_BUF) { doc.image(SIG_BUF, leftX, afterSigY, { width: 90 }); afterSigY += 58; }
    else { afterSigY += 44; }
    doc.moveTo(leftX, afterSigY).lineTo(leftX + colW, afterSigY).strokeColor("#aaaaaa").lineWidth(0.5).stroke();
    doc.moveTo(rightX, afterSigY).lineTo(rightX + colW, afterSigY).strokeColor("#aaaaaa").lineWidth(0.5).stroke();
    const afterLineY = afterSigY + 5;
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text(texte.signerName, leftX, afterLineY, { width: colW });
    doc.fontSize(8).font("Helvetica").fillColor(MID).text(texte.ortDatumUnterschrift, rightX, afterLineY, { width: colW });
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text(datum, leftX, doc.y + 1, { width: colW });

    // ── FUSSZEILE
    const footY = doc.page.height - 36;
    doc.moveTo(L, footY - 6).lineTo(R, footY - 6).strokeColor(RED).lineWidth(0.6).stroke();
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(LIGHT)
       .text(`A.i.L. by Koch  ·  www.sagatrail.ch  ·  info@sagatrail.ch  |  ${texte.referenz}: ${ref}`, L, footY, { align: "center", width: W });

    doc.end();
  });
}

// ── Hilfsfunktionen PDF ────────────────────────────────────────────────────────

function sectionHead(doc: InstanceType<typeof PDFDocument>, title: string, l: number, dark: string) {
  doc.fontSize(10).font("Helvetica-Bold").fillColor(dark).text(title, l);
  doc.moveDown(0.35);
}

function para(doc: InstanceType<typeof PDFDocument>, mid: string, width: number, text: string) {
  doc.fontSize(9).font("Helvetica").fillColor(mid).text(text, { lineGap: 2, width });
}

function bulletList(doc: InstanceType<typeof PDFDocument>, mid: string, l: number, width: number, items: string[]) {
  doc.fontSize(9).font("Helvetica").fillColor(mid)
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
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const transporter = createTransporter();

  const subject = ALLE_VBAND_TEXTE.map(t => t.welcomeSubject).join(" / ");

  const langBlocks = ALLE_VBAND_TEXTE.map((t, i) => `
    <div>
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:#aaa">${t.lang}</p>
      <p style="margin:0 0 8px">Guten Tag / Bonjour / Buongiorno <strong>${data.kontaktName}</strong></p>
      <p style="margin:0 0 16px">${t.welcomeIntro(data.verbandName)}</p>

      <h3 style="color:#CC0000;margin:0 0 6px;font-size:14px">${t.welcomePortalHead}</h3>
      <p style="margin:0 0 10px;font-size:13px">${t.welcomePortalText}</p>
      <a href="${data.portalUrl}" style="display:inline-block;background:#CC0000;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;margin-bottom:16px">${t.welcomePortalBtn}</a>

      <h3 style="color:#CC0000;margin:16px 0 6px;font-size:14px">${t.welcomeAppHead}</h3>
      <p style="margin:0 0 10px;font-size:13px">${t.welcomeAppText}</p>
      <table style="border-collapse:collapse;font-size:13px;background:#f7f6f4;border-radius:8px;width:100%;margin-bottom:8px">
        <tr>
          <td style="padding:9px 14px;font-weight:700;width:90px;color:#555;white-space:nowrap">E-Mail</td>
          <td style="padding:9px 14px">${data.email}</td>
        </tr>
        <tr style="border-top:1px solid #e5e5e5">
          <td style="padding:9px 14px;font-weight:700;color:#555">Passwort</td>
          <td style="padding:9px 14px;font-family:monospace;font-size:14px;letter-spacing:.5px"><strong>${data.passwort}</strong></td>
        </tr>
      </table>
      <p style="font-size:11px;color:#888;margin:0 0 12px">${t.welcomeAppHint}</p>
      <p style="font-size:13px;margin:0">${t.welcomeClosing}</p>
    </div>
    ${i < ALLE_VBAND_TEXTE.length - 1 ? '<hr style="border:none;border-top:1px solid #eee;margin:20px 0">' : ""}
  `).join("");

  // 1) Mail an den Verband
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.email },
    from:    `SagaTrail <${envelopeFrom}>`,
    to:      data.email,
    replyTo: "info@sagatrail.ch",
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:18px;letter-spacing:-.2px">SagaTrail</h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;background:#fff">
          ${langBlocks}
          <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0"/>
          <p style="font-size:12px;color:#aaa;margin:0">
            <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a>
          </p>
        </div>
      </div>
    `,
  });

  // 2) Interne Kopie
  await transporter.sendMail({
    from:    `SagaTrail System <${envelopeFrom}>`,
    to:      "info@sagatrail.ch",
    subject: `[Verband angelegt] ${data.verbandName} – ${data.email}`,
    html: `
      <h2 style="font-family:sans-serif">Verband-Account angelegt</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Verband</td><td><strong>${data.verbandName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td><td>${data.kontaktName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td><td>${data.email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Passwort</td><td>${data.passwort}</td></tr>
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
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const transporter  = createTransporter();
  const safeName     = data.verbandName.replace(/\s+/g, "_");

  // 3 PDFs parallel generieren
  const [pdfDE, pdfFR, pdfIT] = await Promise.all(
    ALLE_VBAND_TEXTE.map(t => generateVertragPdf(data, t)),
  );

  const attachments = [
    { filename: `SagaTrail-${VBAND_DE.filename}-${safeName}.pdf`, content: pdfDE, contentType: "application/pdf" as const },
    { filename: `SagaTrail-${VBAND_FR.filename}-${safeName}.pdf`, content: pdfFR, contentType: "application/pdf" as const },
    { filename: `SagaTrail-${VBAND_IT.filename}-${safeName}.pdf`, content: pdfIT, contentType: "application/pdf" as const },
  ];

  const subject = `Pilotpartnerschaftsvereinbarung / Convention de partenariat pilote / Accordo di partnership pilota – ${data.verbandName}`;

  const langBlocks = ALLE_VBAND_TEXTE.map((t, i) => `
    <div>
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:#aaa">${t.lang}</p>
      <p style="margin:0 0 8px">${t.emailGreeting(data.kontaktName)},</p>
      <p style="margin:0 0 8px;white-space:pre-line">${t.emailBody}</p>
      <blockquote style="border-left:3px solid #CC0000;padding-left:12px;color:#555;margin:12px 0;font-size:13px">${t.emailReturn}</blockquote>
      <p style="margin:0 0 8px">${t.emailNext}</p>
      <p style="margin:0;white-space:pre-line;font-size:13px">${t.emailSignOff}</p>
      <p style="font-size:11px;color:#aaa;margin-top:6px">${t.emailAgb}</p>
    </div>
    ${i < ALLE_VBAND_TEXTE.length - 1 ? '<hr style="border:none;border-top:1px solid #eee;margin:20px 0">' : ""}
  `).join("");

  const textBody = ALLE_VBAND_TEXTE.map(t =>
    `--- ${t.lang} ---\n\n${t.emailGreeting(data.kontaktName)},\n\n${t.emailBody}\n\n${t.emailReturn}\n\n${t.emailNext}\n\n${t.emailSignOff}\n${t.emailAgb}`
  ).join("\n\n");

  // 1) Mail an den Verband
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.email },
    from:    `SagaTrail <${envelopeFrom}>`,
    to:      data.email,
    replyTo: "info@sagatrail.ch",
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:18px;letter-spacing:-.2px">
            SagaTrail Pilotpartnerschaft / Partenariat pilote / Partnership pilota
          </h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;background:#fff">
          ${langBlocks}
        </div>
      </div>
    `,
    text: textBody,
    attachments,
  });

  // 2) Interne Kopie
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: "info@sagatrail.ch" },
    from:    `SagaTrail System <${envelopeFrom}>`,
    to:      "info@sagatrail.ch",
    subject: `[Neue Verband-Anfrage] ${data.verbandName}`,
    html: `
      <h2 style="font-family:sans-serif">Neue Tourismusverband-Anfrage (Vertrag DE/FR/IT gesendet)</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Verband</td><td><strong>${data.verbandName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td><td>${data.email}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td><td>${data.kontaktName}${data.kontaktTelefon ? " · " + data.kontaktTelefon : ""}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kantone</td><td>${kantoneLabel(data.kantone)}</td></tr>
      </table>
    `,
    attachments,
  });
}
