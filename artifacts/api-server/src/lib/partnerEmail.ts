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
  betriebsName:       string;
  kontaktName:        string;
  kontaktEmail:       string;
  kontaktTelefon?:    string | null;
  kategorie:          string;
  canton:             string;
  adresse?:           string | null;
  plz?:               string | null;
  ort?:               string | null;
  paket:              "basic" | "standard" | "premium";
  abrechnungsperiode?: "jaehrlich" | "monatlich";
  laufzeitStart?:     Date | null;
  laufzeitEnde?:      Date | null;
  /** Individueller Preis überschreibt den Paket-Standardpreis im PDF */
  preisChfOverride?:  number | null;
}

// ── Paket-Details ─────────────────────────────────────────────────────────────
const PAKET_INFO: Record<string, { label: string; preisJahr: string; preisMonat: string; beschreibung: string }> = {
  basic: {
    label:        "Basic",
    preisJahr:    "CHF 99 / Jahr",
    preisMonat:   "CHF 14.99 / Monat (1. Monat kostenlos)",
    beschreibung: "Eintrag auf der Karte, 1 Foto, Basisangaben",
  },
  standard: {
    label:        "Standard",
    preisJahr:    "CHF 199 / Jahr",
    preisMonat:   "CHF 19.90 / Monat",
    beschreibung: "Erweiterter Eintrag, 5 Fotos, Angebot & Öffnungszeiten",
  },
  premium: {
    label:        "Premium",
    preisJahr:    "CHF 499 / Jahr",
    preisMonat:   "CHF 499 / Jahr",
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

// ── Mehrsprachige Vertragstexte ───────────────────────────────────────────────

interface VertragTexte {
  lang:                 string;
  filename:             string;
  title:                string;
  zwischen:             string;
  und:                  string;
  referenz:             string;
  kategorieHeader:      string;
  vereinbartePaket:     string;
  pos:                  string;
  beschreibungCol:      string;
  preisCol:             string;
  paketPrefix:          string;
  katLabel:             (k: string) => string;
  s1Title:              string;
  s1Intro:              (betrieb: string) => string;
  laufzeitMitDaten:     (start: string, end: string) => string;
  laufzeitMitStart:     (start: string) => string;
  laufzeitOhne:         string;
  s2Title:              string;
  s2Bullets:            (paket: string) => string[];
  s3Title:              string;
  s3Bullets:            string[];
  s4Title:              string;
  s4Bullets:            (preis: string, monatlich: boolean) => string[];
  s5Title:              string;
  s5Body:               string;
  s6Title:              string;
  s6Body:               string;
  signerName:           string;
  ortDatumUnterschrift: string;
  emailSubject:         (betrieb: string) => string;
  emailGreeting:        (name: string) => string;
  emailBody:            (betrieb: string, paket: string, preis: string) => string;
  emailReturn:          string;
  emailNext:            string;
  emailSignOff:         string;
  emailAgb:             string;
}

const TEXTE_DE: VertragTexte = {
  lang: "DE", filename: "Partnervertrag-DE",
  title: "Partnerschaftsvereinbarung",
  zwischen: "zwischen", und: "und",
  referenz: "Referenz", kategorieHeader: "Kategorie",
  vereinbartePaket: "Vereinbartes Paket",
  pos: "Pos", beschreibungCol: "Beschreibung", preisCol: "Preis", paketPrefix: "Paket",
  katLabel,
  s1Title: "1. Gegenstand und Laufzeit",
  s1Intro: (b) => `SagaTrail und ${b} vereinbaren eine Partnerschaft für den Betrieb auf der SagaTrail-Wanderapplikation.`,
  laufzeitMitDaten: (s, e) => `Die Partnerschaft läuft vom ${s} bis ${e} und verlängert sich automatisch um ein weiteres Jahr, sofern sie nicht 30 Tage vor Ablauf schriftlich gekündigt wird.`,
  laufzeitMitStart: (s) => `Die Partnerschaft beginnt am ${s} und läuft unbefristet, kündbar mit einer Frist von 30 Tagen auf Monatsende.`,
  laufzeitOhne: "Die Partnerschaft beginnt nach beidseitiger Unterzeichnung und läuft unbefristet, kündbar mit einer Frist von 30 Tagen auf Monatsende.",
  s2Title: "2. Leistungen SagaTrail",
  s2Bullets: (p) => [
    `Eintrag des Betriebs im Paket «${p}» auf der SagaTrail-Karte.`,
    "Sichtbarkeit für Wanderinnen und Wanderer entlang der Sagenrouten.",
    "Jederzeit aktualisierbare Betriebsangaben über das Partner-Portal.",
    "Abrechnung per Rechnung oder Kreditkarte.",
  ],
  s3Title: "3. Pflichten des Partners",
  s3Bullets: [
    "Bereitstellung korrekter Angaben zum Betrieb (Öffnungszeiten, Angebot, Fotos).",
    "Zeitgerechte Zahlung des vereinbarten Betrags.",
    "Kein Missbrauch des Partner-Portals oder der SagaTrail-Infrastruktur.",
  ],
  s4Title: "4. Konditionen & Zahlung",
  s4Bullets: (preis, m) => [
    `${m ? "Monatlicher" : "Jährlicher"} Betrag: ${preis} (zzgl. gesetzlicher MwSt. falls anwendbar).`,
    `Abrechnung ${m ? "monatlich" : "jährlich"} im Voraus.`,
    "Kündigung jederzeit schriftlich per E-Mail an info@sagatrail.ch, wirksam auf Ende des Folgemonats.",
    "SagaTrail behält sich vor, den Eintrag bei Zahlungsrückstand zu deaktivieren.",
  ],
  s5Title: "5. Datenschutz & Gerichtsstand",
  s5Body: "SagaTrail verarbeitet Betriebsdaten ausschliesslich zur Darstellung in der App (DSG/DSGVO-konform). Personenbezogene Daten werden nicht an Dritte weitergegeben. Es gilt Schweizer Recht. Gerichtsstand ist Oberwil BL.",
  s6Title: "6. Allgemeine Geschäftsbedingungen",
  s6Body: "Es gelten die Allgemeinen Geschäftsbedingungen von SagaTrail: www.sagatrail.ch/agb",
  signerName: "Rolf Koch, Inhaber", ortDatumUnterschrift: "Ort, Datum, Unterschrift",
  emailSubject: (b) => `Partnerschaftsvereinbarung SagaTrail – ${b}`,
  emailGreeting: (n) => `Guten Tag ${n}`,
  emailBody: (b, p, pr) => `Vielen Dank für Ihr Interesse an einer Partnerschaft mit SagaTrail.\n\nIm Anhang finden Sie die Partnerschaftsvereinbarung für ${b} (Paket ${p}, ${pr}) als PDF.`,
  emailReturn: "Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie das unterzeichnete Exemplar per E-Mail zurück an: info@sagatrail.ch",
  emailNext: "Wir melden uns danach innerhalb von 2 Werktagen, um den nächsten Schritt zu besprechen und Ihren Eintrag freizuschalten.",
  emailSignOff: "Freundliche Grüsse\nRolf Koch\nGründer SagaTrail",
  emailAgb: "AGB: www.sagatrail.ch/agb",
};

const TEXTE_FR: VertragTexte = {
  lang: "FR", filename: "Contrat-Partenariat-FR",
  title: "Convention de partenariat",
  zwischen: "entre", und: "et",
  referenz: "Référence", kategorieHeader: "Catégorie",
  vereinbartePaket: "Forfait convenu",
  pos: "Pos", beschreibungCol: "Description", preisCol: "Prix", paketPrefix: "Forfait",
  katLabel: (k) => (({ restaurant: "Restaurant / Gastronomie", cafe: "Café / Boulangerie", souvenir: "Souvenirs / Cadeaux", uebernachtung: "Hébergement / Hôtel", sonstiges: "Autre" } as Record<string,string>)[k] ?? k),
  s1Title: "1. Objet et durée",
  s1Intro: (b) => `SagaTrail et ${b} conviennent d'un partenariat pour l'établissement sur l'application de randonnée SagaTrail.`,
  laufzeitMitDaten: (s, e) => `Le partenariat court du ${s} au ${e} et se reconduit automatiquement d'une année supplémentaire, sauf résiliation par écrit 30 jours avant l'échéance.`,
  laufzeitMitStart: (s) => `Le partenariat débute le ${s} et est d'une durée indéterminée, résiliable avec un préavis de 30 jours à la fin du mois.`,
  laufzeitOhne: "Le partenariat débute après la signature des deux parties et est d'une durée indéterminée, résiliable avec un préavis de 30 jours à la fin du mois.",
  s2Title: "2. Prestations SagaTrail",
  s2Bullets: (p) => [
    `Inscription de l'établissement en forfait «${p}» sur la carte SagaTrail.`,
    "Visibilité auprès des randonneurs le long des itinéraires de légendes.",
    "Données de l'établissement modifiables à tout moment via le portail partenaire.",
    "Facturation par facture ou carte de crédit.",
  ],
  s3Title: "3. Obligations du partenaire",
  s3Bullets: [
    "Fourniture d'informations exactes sur l'établissement (horaires, offre, photos).",
    "Paiement dans les délais du montant convenu.",
    "Pas d'utilisation abusive du portail partenaire ou de l'infrastructure SagaTrail.",
  ],
  s4Title: "4. Conditions & paiement",
  s4Bullets: (preis, m) => [
    `Montant ${m ? "mensuel" : "annuel"} : ${preis} (TVA légale en sus si applicable).`,
    `Facturation ${m ? "mensuelle" : "annuelle"} à l'avance.`,
    "Résiliation à tout moment par e-mail à info@sagatrail.ch, effective à la fin du mois suivant.",
    "SagaTrail se réserve le droit de désactiver l'inscription en cas de retard de paiement.",
  ],
  s5Title: "5. Protection des données & for juridique",
  s5Body: "SagaTrail traite les données de l'établissement exclusivement pour l'affichage dans l'application (conforme LPD/RGPD). Les données personnelles ne sont pas transmises à des tiers. Le droit suisse est applicable. Le for est à Oberwil BL.",
  s6Title: "6. Conditions générales",
  s6Body: "Les conditions générales de SagaTrail sont applicables : www.sagatrail.ch/agb",
  signerName: "Rolf Koch, fondateur", ortDatumUnterschrift: "Lieu, date, signature",
  emailSubject: (b) => `Convention de partenariat SagaTrail – ${b}`,
  emailGreeting: (n) => `Bonjour ${n}`,
  emailBody: (b, p, pr) => `Merci de votre intérêt pour un partenariat avec SagaTrail.\n\nVous trouverez ci-joint la convention de partenariat pour ${b} (forfait ${p}, ${pr}) en PDF.`,
  emailReturn: "Veuillez imprimer le document, le signer et retourner l'exemplaire signé par e-mail à : info@sagatrail.ch",
  emailNext: "Nous vous contacterons dans les 2 jours ouvrables pour discuter des prochaines étapes et activer votre inscription.",
  emailSignOff: "Cordiales salutations\nRolf Koch\nFondateur SagaTrail",
  emailAgb: "CGV : www.sagatrail.ch/agb",
};

const TEXTE_IT: VertragTexte = {
  lang: "IT", filename: "Contratto-Partnership-IT",
  title: "Accordo di partnership",
  zwischen: "tra", und: "e",
  referenz: "Riferimento", kategorieHeader: "Categoria",
  vereinbartePaket: "Pacchetto concordato",
  pos: "Pos", beschreibungCol: "Descrizione", preisCol: "Prezzo", paketPrefix: "Pacchetto",
  katLabel: (k) => (({ restaurant: "Ristorante / Gastronomia", cafe: "Caffè / Panetteria", souvenir: "Souvenir / Regali", uebernachtung: "Alloggio / Hotel", sonstiges: "Altro" } as Record<string,string>)[k] ?? k),
  s1Title: "1. Oggetto e durata",
  s1Intro: (b) => `SagaTrail e ${b} concordano una partnership per l'esercizio sull'applicazione escursionistica SagaTrail.`,
  laufzeitMitDaten: (s, e) => `Il partenariato decorre dal ${s} al ${e} e si rinnova automaticamente di un anno, salvo disdetta scritta 30 giorni prima della scadenza.`,
  laufzeitMitStart: (s) => `Il partenariato inizia il ${s} e ha durata indeterminata, disdettabile con preavviso di 30 giorni a fine mese.`,
  laufzeitOhne: "Il partenariato inizia dopo la firma di entrambe le parti e ha durata indeterminata, disdettabile con preavviso di 30 giorni a fine mese.",
  s2Title: "2. Servizi SagaTrail",
  s2Bullets: (p) => [
    `Iscrizione dell'esercizio nel pacchetto «${p}» sulla mappa SagaTrail.`,
    "Visibilità per gli escursionisti lungo i percorsi delle saghe.",
    "Dati dell'esercizio aggiornabili in qualsiasi momento tramite il portale partner.",
    "Fatturazione tramite fattura o carta di credito.",
  ],
  s3Title: "3. Obblighi del partner",
  s3Bullets: [
    "Fornitura di informazioni corrette sull'esercizio (orari, offerta, foto).",
    "Pagamento puntuale dell'importo concordato.",
    "Nessun utilizzo improprio del portale partner o dell'infrastruttura SagaTrail.",
  ],
  s4Title: "4. Condizioni & pagamento",
  s4Bullets: (preis, m) => [
    `Importo ${m ? "mensile" : "annuale"}: ${preis} (IVA legale esclusa se applicabile).`,
    `Fatturazione ${m ? "mensile" : "annuale"} anticipata.`,
    "Disdetta in qualsiasi momento per e-mail a info@sagatrail.ch, efficace a fine mese seguente.",
    "SagaTrail si riserva il diritto di disattivare l'iscrizione in caso di ritardo di pagamento.",
  ],
  s5Title: "5. Protezione dei dati & foro",
  s5Body: "SagaTrail elabora i dati dell'esercizio esclusivamente per la visualizzazione nell'app (conforme LPD/GDPR). I dati personali non vengono trasmessi a terzi. Si applica il diritto svizzero. Il foro è Oberwil BL.",
  s6Title: "6. Condizioni generali",
  s6Body: "Si applicano le condizioni generali di SagaTrail: www.sagatrail.ch/agb",
  signerName: "Rolf Koch, fondatore", ortDatumUnterschrift: "Luogo, data, firma",
  emailSubject: (b) => `Accordo di partnership SagaTrail – ${b}`,
  emailGreeting: (n) => `Buongiorno ${n}`,
  emailBody: (b, p, pr) => `Grazie per il Suo interesse per una partnership con SagaTrail.\n\nIn allegato trova l'accordo di partnership per ${b} (pacchetto ${p}, ${pr}) in PDF.`,
  emailReturn: "La preghiamo di stampare il documento, firmarlo e inviare l'esemplare firmato per e-mail a: info@sagatrail.ch",
  emailNext: "La contatteremo entro 2 giorni lavorativi per discutere i prossimi passi e attivare la Sua inserzione.",
  emailSignOff: "Cordiali saluti\nRolf Koch\nFondatore SagaTrail",
  emailAgb: "CGV: www.sagatrail.ch/agb",
};

const ALLE_PARTNER_TEXTE = [TEXTE_DE, TEXTE_FR, TEXTE_IT] as const;

// ── PDF-Vertrag (pdfkit, A4) ──────────────────────────────────────────────────
export async function generatePartnerVertragPdf(
  data: PartnerAnfrageEmailData,
  texte: VertragTexte,
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

    const ref          = refNummer();
    const datum        = heute();
    const datumKurz    = heuteKurz();
    const paketInfo    = PAKET_INFO[data.paket] ?? PAKET_INFO.standard;
    const monatlich    = data.abrechnungsperiode === "monatlich";
    const preis        = data.preisChfOverride != null
      ? `CHF ${data.preisChfOverride} / Jahr`
      : (monatlich ? paketInfo.preisMonat : paketInfo.preisJahr);
    const laufzeitStartStr = data.laufzeitStart
      ? data.laufzeitStart.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
      : null;
    const laufzeitEndeStr = data.laufzeitEnde
      ? data.laufzeitEnde.toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })
      : null;

    // ── KOPF ─────────────────────────────────────────────────────────────────
    doc.fontSize(22).font("Helvetica-Bold").fillColor(RED).text("SagaTrail", L, 56);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text("www.sagatrail.ch  ·  info@sagatrail.ch", L, doc.y + 2);
    const lineY = doc.y + 6;
    doc.moveTo(L, lineY).lineTo(R, lineY).strokeColor(RED).lineWidth(1.5).stroke();

    // ── TITEL ────────────────────────────────────────────────────────────────
    doc.fontSize(15).font("Helvetica-Bold").fillColor(DARK).text(texte.title, L, lineY + 14);
    doc.moveDown(0.7);

    // ── PARTEIEN ─────────────────────────────────────────────────────────────
    const zwY = doc.y;
    doc.fontSize(9).font("Helvetica").fillColor(DARK).text(texte.zwischen, L, zwY);
    doc.fontSize(9).font("Helvetica").fillColor(LIGHT).text(`Oberwil, ${datumKurz}`, L, zwY, { width: W, align: "right" });
    doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text("A.i.L. by Koch", L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    for (const zeile of ["Rolf Koch", "Mühlemattstrasse 11", "CH-4104 Oberwil BL", "CHE-286.962.827"]) {
      doc.text(zeile, L);
    }
    doc.moveDown(0.5);
    doc.fontSize(9).font("Helvetica-Oblique").fillColor(MID).text(texte.und, L);
    doc.moveDown(0.4);
    doc.fontSize(9).font("Helvetica-Bold").fillColor(DARK).text(data.betriebsName, L);
    doc.fontSize(9).font("Helvetica").fillColor(DARK);
    doc.text(data.kontaktName + (data.kontaktTelefon ? `,  ${data.kontaktTelefon}` : ""), L);
    doc.text(data.kontaktEmail, L);
    const adresseTeile = [data.adresse, data.plz && data.ort ? `${data.plz} ${data.ort}` : data.ort].filter(Boolean);
    if (adresseTeile.length) {
      doc.text(adresseTeile.join(", ") + ` (${data.canton})`, L);
    } else {
      doc.text(`Kanton ${data.canton}`, L);
    }
    doc.text(`${texte.kategorieHeader}: ${texte.katLabel(data.kategorie)}`, L);
    doc.moveDown(0.4);
    doc.fontSize(8).font("Helvetica").fillColor(LIGHT).text(`${texte.referenz}: ${ref}`, L);
    doc.moveDown(1.2);

    // ── POSITIONSTABELLE ─────────────────────────────────────────────────────
    doc.fontSize(10).font("Helvetica-Bold").fillColor(DARK).text(texte.vereinbartePaket, L);
    doc.moveDown(0.5);
    const colPos = 40, colPreis = 140, colDesc = W - colPos - colPreis;
    const tableTop = doc.y;
    doc.moveTo(L, tableTop).lineTo(R, tableTop).strokeColor("#aaaaaa").lineWidth(0.5).stroke();
    doc.moveDown(0.3);
    const headerY = doc.y;
    doc.fontSize(8).font("Helvetica-Bold").fillColor(MID)
       .text(texte.pos,           L,                   headerY, { width: colPos,   lineBreak: false });
    doc.text(texte.beschreibungCol, L + colPos,         headerY, { width: colDesc,  lineBreak: false });
    doc.text(texte.preisCol,      L + colPos + colDesc, headerY, { width: colPreis, align: "right" });
    doc.moveDown(0.15);
    const thickY = doc.y + 2;
    doc.moveTo(L, thickY).lineTo(R, thickY).strokeColor("#323232").lineWidth(0.8).stroke();
    doc.moveDown(0.5);
    const rowY = doc.y;
    doc.fontSize(9).font("Helvetica").fillColor(DARK)
       .text("01", L, rowY, { width: colPos, lineBreak: false });
    doc.text(`${texte.paketPrefix} ${paketInfo.label} – ${paketInfo.beschreibung}`, L + colPos, rowY, { width: colDesc, lineBreak: false });
    doc.font("Helvetica-Bold").text(preis, L + colPos + colDesc, rowY, { width: colPreis, align: "right" });
    doc.moveDown(0.5);
    const bottomY = doc.y + 2;
    doc.moveTo(L, bottomY).lineTo(R, bottomY).strokeColor("#323232").lineWidth(0.8).stroke();
    doc.moveDown(1.5);

    // ── SECTIONS 1–6 ─────────────────────────────────────────────────────────
    const laufzeitText = laufzeitStartStr && laufzeitEndeStr
      ? texte.laufzeitMitDaten(laufzeitStartStr, laufzeitEndeStr)
      : laufzeitStartStr
      ? texte.laufzeitMitStart(laufzeitStartStr)
      : texte.laufzeitOhne;

    sectionHead(doc, texte.s1Title, L, DARK);
    para(doc, MID, W, `${texte.s1Intro(data.betriebsName)} ${laufzeitText}`);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s2Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s2Bullets(paketInfo.label));
    doc.moveDown(0.8);

    sectionHead(doc, texte.s3Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s3Bullets);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s4Title, L, DARK);
    bulletList(doc, MID, L, W, texte.s4Bullets(preis, monatlich));
    doc.moveDown(0.8);

    sectionHead(doc, texte.s5Title, L, DARK);
    para(doc, MID, W, texte.s5Body);
    doc.moveDown(0.8);

    sectionHead(doc, texte.s6Title, L, DARK);
    para(doc, MID, W, texte.s6Body);
    doc.moveDown(1.2);

    // ── UNTERSCHRIFTEN ────────────────────────────────────────────────────────
    if (doc.y + 130 > doc.page.height - 56) { doc.addPage(); doc.y = 56; }
    const colW = (W - 28) / 2, leftX = L, rightX = L + colW + 28;
    const sigTop = doc.y;
    doc.fontSize(8).font("Helvetica").fillColor(MID).text("A.i.L. by Koch  –  SagaTrail", leftX, sigTop, { width: colW });
    doc.text(data.betriebsName, rightX, sigTop, { width: colW });
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

    // ── FUSSZEILE ─────────────────────────────────────────────────────────────
    const footY = doc.page.height - 36;
    doc.moveTo(L, footY - 6).lineTo(R, footY - 6).strokeColor(RED).lineWidth(0.6).stroke();
    doc.fontSize(7.5).font("Helvetica-Oblique").fillColor(LIGHT)
       .text(`A.i.L. by Koch  ·  www.sagatrail.ch  ·  info@sagatrail.ch  |  ${texte.referenz}: ${ref}`, L, footY, { align: "center", width: W });

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

// ── Hauptfunktion: 3 PDFs generieren + 2 Mails versenden ─────────────────────
export async function sendPartnerVertrag(data: PartnerAnfrageEmailData): Promise<void> {
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const transporter  = createTransporter();
  const paketInfo    = PAKET_INFO[data.paket] ?? PAKET_INFO.standard;
  const preis        = data.abrechnungsperiode === "monatlich" ? paketInfo.preisMonat : paketInfo.preisJahr;
  const safeName     = data.betriebsName.replace(/\s+/g, "_");

  // 3 PDFs parallel generieren
  const [pdfDE, pdfFR, pdfIT] = await Promise.all(
    ALLE_PARTNER_TEXTE.map(t => generatePartnerVertragPdf(data, t)),
  );

  const attachments = [
    { filename: `SagaTrail-${TEXTE_DE.filename}-${safeName}.pdf`, content: pdfDE, contentType: "application/pdf" as const },
    { filename: `SagaTrail-${TEXTE_FR.filename}-${safeName}.pdf`, content: pdfFR, contentType: "application/pdf" as const },
    { filename: `SagaTrail-${TEXTE_IT.filename}-${safeName}.pdf`, content: pdfIT, contentType: "application/pdf" as const },
  ];

  const subject = `Partnerschaftsvereinbarung / Convention de partenariat / Accordo di partnership – ${data.betriebsName}`;

  // Dreisprachiger E-Mail-Body
  const langBlocks = ALLE_PARTNER_TEXTE.map(t => ({
    label:    t.lang,
    greeting: t.emailGreeting(data.kontaktName),
    body:     t.emailBody(data.betriebsName, paketInfo.label, preis),
    ret:      t.emailReturn,
    next:     t.emailNext,
    signoff:  t.emailSignOff,
    agb:      t.emailAgb,
  }));

  const htmlBlocks = langBlocks.map((b, i) => `
    <div>
      <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:1px;color:#aaa">${b.label}</p>
      <p style="margin:0 0 8px">${b.greeting},</p>
      <p style="margin:0 0 8px;white-space:pre-line">${b.body}</p>
      <blockquote style="border-left:3px solid #CC0000;padding-left:12px;color:#555;margin:12px 0;font-size:13px">${b.ret}</blockquote>
      <p style="margin:0 0 8px">${b.next}</p>
      <p style="margin:0;white-space:pre-line;font-size:13px">${b.signoff}</p>
      <p style="font-size:11px;color:#aaa;margin-top:6px">${b.agb}</p>
    </div>
    ${i < langBlocks.length - 1 ? '<hr style="border:none;border-top:1px solid #eee;margin:20px 0">' : ""}
  `).join("");

  const textBody = langBlocks.map(b =>
    `--- ${b.label} ---\n\n${b.greeting},\n\n${b.body}\n\n${b.ret}\n\n${b.next}\n\n${b.signoff}\n${b.agb}`
  ).join("\n\n");

  // 1) Mail an den Betrieb
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.kontaktEmail },
    from:     `SagaTrail <${envelopeFrom}>`,
    to:       data.kontaktEmail,
    replyTo:  "info@sagatrail.ch",
    subject,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:600px;margin:0 auto">
        <div style="background:#CC0000;padding:28px 32px;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;margin:0;font-size:18px;letter-spacing:-.2px">
            SagaTrail Partnerschaft / Partenariat / Partnership
          </h1>
        </div>
        <div style="padding:32px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 12px 12px;background:#fff">
          ${htmlBlocks}
        </div>
      </div>
    `,
    text: textBody,
    attachments,
  });

  // 2) Interne Kopie
  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: "info@sagatrail.ch" },
    from:     `SagaTrail System <${envelopeFrom}>`,
    to:       "info@sagatrail.ch",
    subject:  `[Partnervertrag gesendet] ${data.betriebsName}`,
    html: `
      <h2 style="font-family:sans-serif">Partnervertrag versendet (DE / FR / IT)</h2>
      <table style="font-family:monospace;font-size:13px;border-collapse:collapse">
        <tr><td style="padding:4px 16px 4px 0;color:#888">Betrieb</td><td><strong>${data.betriebsName}</strong></td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Paket</td><td>${paketInfo.label} (${preis})</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kontakt</td><td>${data.kontaktName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">E-Mail</td><td>${data.kontaktEmail}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kanton</td><td>${data.canton}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;color:#888">Kategorie</td><td>${katLabel(data.kategorie)}</td></tr>
      </table>
    `,
    attachments,
  });
}

// ─── Eingangsbestätigung für neue Anfragen ────────────────────────────────────

export interface AnfrageEingangData {
  betriebsName:   string;
  kontaktName:    string;
  kontaktEmail:   string;
  paket:          string;
  typ:            "anfrage" | "bestellung";
}

export async function sendAnfrageBestaetigung(data: AnfrageEingangData): Promise<void> {
  const envelopeFrom = process.env.SMTP_FROM ?? "info@sagatrail.ch";
  const transporter  = createTransporter();
  const istBestellung = data.typ === "bestellung";

  const subject = istBestellung
    ? `Ihre SagaTrail-Bestellung ist eingegangen – ${data.betriebsName}`
    : `Ihre SagaTrail-Partnerschaftsanfrage ist eingegangen`;

  const introText = istBestellung
    ? `Vielen Dank für Ihre Bestellung! Wir senden Ihnen in Kürze den Partnervertrag per E-Mail zu. Sobald dieser unterzeichnet zurückkommt, richten wir Ihren Zugang zum Partner-Portal ein.`
    : `Vielen Dank für Ihre Anfrage! Wir haben sie erhalten und melden uns in den nächsten Werktagen bei Ihnen, um gemeinsam das passende Paket zu besprechen.`;

  const nextSteps = istBestellung
    ? [
        "Wir prüfen Ihre Bestellung und senden Ihnen den Partnervertrag per E-Mail.",
        "Nach Eingang des unterzeichneten Vertrags erhalten Sie den Zugang zum Partner-Portal.",
        "Im Portal können Sie Ihr Profil pflegen, Öffnungszeiten hinterlegen und Statistiken einsehen.",
      ]
    : [
        "Unser Team prüft Ihre Anfrage und meldet sich persönlich bei Ihnen.",
        "Wir besprechen gemeinsam, welches Paket am besten zu Ihrem Betrieb passt.",
        "Sie erhalten den Partnervertrag und nach Unterzeichnung sofort Ihren Portal-Zugang.",
      ];

  // Preisliste (nur für Anfragen relevant, da noch kein Paket fix)
  const preislisteText = [
    "Unsere Pakete im Überblick (1. Monat kostenlos, im Testzeitraum jederzeit kündbar):",
    "",
    "  BASIC — CHF 99 / Jahr  oder  CHF 14.99 / Monat",
    "  Ihr Betrieb erscheint als farbiger Marker auf der interaktiven Wanderkarte.",
    "  Wanderer können direkt in der App auf Ihren Eintrag tippen und sehen Name,",
    "  Kategorie sowie Ihre Kontaktangaben.",
    "",
    "  STANDARD — CHF 199 / Jahr",
    "  Alles aus Basic, plus ein vollständiges Profil: Titelbild, ausführliche",
    "  Beschreibung, Ihr aktuelles Angebot (z. B. Tagesmenü, Spezialität) sowie",
    "  Öffnungszeiten mit automatischer «Jetzt geöffnet / geschlossen»-Anzeige.",
    "  Ideal für Restaurants, Cafés und Unterkünfte.",
    "",
    "  PREMIUM — CHF 499 / Jahr",
    "  Alles aus Standard, plus die automatische Audio-Ansage: Sobald Wanderer",
    "  Ihren Betrieb auf der Route passieren, spielt die App eine personalisierte",
    "  Erzählung ab und macht auf Sie aufmerksam — ganz ohne dass die Wanderer",
    "  selbst aktiv werden müssen. Der stärkste Kanal für spontane Besuche.",
  ].join("\n");

  const preislisteHtml = `
    <div style="margin:28px 0">
      <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#555;text-transform:uppercase;letter-spacing:.5px">Unsere Pakete im Überblick</p>
      <p style="margin:0 0 20px;font-size:13px;color:#CC0000;font-weight:600">&#127381; 1. Monat kostenlos &mdash; im Testzeitraum jederzeit kündbar</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <tr>
          <td style="padding:14px 16px;border:1px solid #eee;border-radius:8px;vertical-align:top;background:#fafafa" colspan="2">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <strong style="font-size:16px">Basic</strong>
              <span style="color:#CC0000;font-weight:700">CHF 99 / Jahr <span style="font-size:11px;font-weight:400;color:#888">oder 14.99 / Mt.</span></span>
            </div>
            <p style="margin:0;color:#444;line-height:1.6">
              Ihr Betrieb erscheint als farbiger Marker auf der interaktiven Wanderkarte.
              Wanderer tippen auf Ihren Eintrag und sehen Name, Kategorie und Kontakt direkt in der App.
            </p>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:6px 0"></td></tr>
        <tr>
          <td style="padding:14px 16px;border:1px solid #eee;border-radius:8px;vertical-align:top;background:#fafafa" colspan="2">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <strong style="font-size:16px">Standard</strong>
              <span style="color:#CC0000;font-weight:700">CHF 199 / Jahr</span>
            </div>
            <p style="margin:0;color:#444;line-height:1.6">
              Alles aus Basic &ndash; plus ein vollständiges Profil mit Titelbild, ausführlicher Beschreibung,
              aktuellem Angebot (z.&nbsp;B. Tagesmenü, Spezialität) und Öffnungszeiten mit automatischer
              <em>«Jetzt geöffnet / geschlossen»</em>-Anzeige. Ideal für Restaurants, Cafés und Unterkünfte.
            </p>
          </td>
        </tr>
        <tr><td colspan="2" style="padding:6px 0"></td></tr>
        <tr>
          <td style="padding:14px 16px;border:2px solid #CC0000;border-radius:8px;vertical-align:top;background:#fff8f8" colspan="2">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
              <strong style="font-size:16px">Premium &#11088;</strong>
              <span style="color:#CC0000;font-weight:700">CHF 499 / Jahr</span>
            </div>
            <p style="margin:0;color:#444;line-height:1.6">
              Alles aus Standard &ndash; plus die <strong>automatische Audio-Ansage</strong>:
              Sobald Wanderer Ihren Betrieb auf der Route passieren, spielt die App eine personalisierte
              Erzählung ab, die auf Sie aufmerksam macht &ndash; ganz ohne dass die Wanderer selbst
              aktiv werden müssen. Der stärkste Kanal für spontane Besuche.
            </p>
          </td>
        </tr>
      </table>
    </div>`;

  const paketInfo = PAKET_INFO[data.paket] ?? PAKET_INFO["standard"]!;

  await transporter.sendMail({
    envelope: { from: envelopeFrom, to: data.kontaktEmail },
    from:    `SagaTrail <${envelopeFrom}>`,
    to:      data.kontaktEmail,
    subject,
    text: [
      `Guten Tag ${data.kontaktName},`,
      "",
      introText,
      "",
      "Nächste Schritte:",
      ...nextSteps.map((s, i) => `${i + 1}. ${s}`),
      "",
      ...(istBestellung
        ? [`Ausgewähltes Paket: ${paketInfo.label} (${paketInfo.preisJahr})`]
        : [preislisteText]
      ),
      "",
      "Bei Fragen stehen wir jederzeit zur Verfügung.",
      "",
      "Herzliche Grüsse",
      "Das SagaTrail-Team",
      "info@sagatrail.ch | www.sagatrail.ch",
    ].join("\n"),
    html: `
      <div style="font-family:-apple-system,system-ui,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
        <div style="font-size:22px;font-weight:800;color:#CC0000;margin-bottom:24px;letter-spacing:.3px">SagaTrail</div>
        <p>Guten Tag <strong>${data.kontaktName}</strong>,</p>
        <p>${introText}</p>

        <div style="background:#f8f8f8;border-radius:10px;padding:20px 24px;margin:24px 0">
          <p style="margin:0 0 12px;font-weight:700;font-size:14px;color:#555;text-transform:uppercase;letter-spacing:.5px">Nächste Schritte</p>
          <ol style="margin:0;padding-left:20px;line-height:1.8">
            ${nextSteps.map(s => `<li>${s}</li>`).join("")}
          </ol>
        </div>

        ${istBestellung
          ? `<table style="font-size:13px;border-collapse:collapse;width:100%;margin-bottom:24px">
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:8px 0;color:#888;width:130px">Betrieb</td>
                <td style="padding:8px 0"><strong>${data.betriebsName}</strong></td>
              </tr>
              <tr style="border-bottom:1px solid #eee">
                <td style="padding:8px 0;color:#888">Paket</td>
                <td style="padding:8px 0">${paketInfo.label} &mdash; ${paketInfo.preisJahr}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#888">Kontakt</td>
                <td style="padding:8px 0">${data.kontaktName} &middot; ${data.kontaktEmail}</td>
              </tr>
             </table>`
          : preislisteHtml
        }

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#aaa">Fragen? <a href="mailto:info@sagatrail.ch" style="color:#CC0000">info@sagatrail.ch</a> &middot; <a href="https://www.sagatrail.ch" style="color:#CC0000">sagatrail.ch</a></p>
      </div>
    `,
  });
}
