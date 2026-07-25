<?php
/**
 * SAGATRAIL PARTNERSCHAFTSVERTRAG  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ort: Run Everywhere
 *
 * Erzeugt nach einer Partner-Anfrage einen Partnerschaftsvertrag als PDF
 * und sendet ihn per E-Mail an den Interessenten und an info@sagatrail.ch.
 *
 * Benötigt FPDF (http://www.fpdf.org):
 *  Option A – Theme-Ordner: /wp-content/themes/THEME/fpdf/fpdf.php
 *  Option B – Composer:     composer require setasign/fpdf
 *
 * Diese Funktion wird via WordPress-Action aufgerufen:
 *   do_action('sagatrail_partner_anfrage_gespeichert', $data, $row_id);
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ===================================================================
// HILFSFUNKTIONEN
// ===================================================================

/** UTF-8 → Windows-1252 für FPDF-Standardfonts */
function st_enc( $str ) {
    return iconv( 'UTF-8', 'windows-1252//TRANSLIT', (string) $str );
}

function sagatrail_partner_icon_pfad() {
    if ( defined( 'SAGATRAIL_ICON_PATH' ) && file_exists( SAGATRAIL_ICON_PATH ) ) {
        return SAGATRAIL_ICON_PATH;
    }
    $upload = wp_upload_dir();
    $pfad   = trailingslashit( $upload['basedir'] ) . 'sagatrail/sagatrail-icon.png';
    return file_exists( $pfad ) ? $pfad : false;
}

function sagatrail_partner_sig_pfad() {
    if ( defined( 'SAGATRAIL_SIGNATURE_PATH' ) && file_exists( SAGATRAIL_SIGNATURE_PATH ) ) {
        return SAGATRAIL_SIGNATURE_PATH;
    }
    $upload = wp_upload_dir();
    $pfad   = trailingslashit( $upload['basedir'] ) . 'sagatrail/signature.png';
    return file_exists( $pfad ) ? $pfad : null;
}

function sagatrail_partner_lade_fpdf() {
    if ( defined( 'SAGATRAIL_FPDF_PATH' ) && file_exists( SAGATRAIL_FPDF_PATH ) ) {
        require_once SAGATRAIL_FPDF_PATH;
        return class_exists( 'FPDF' );
    }
    $autoload = ABSPATH . 'vendor/autoload.php';
    if ( file_exists( $autoload ) ) {
        require_once $autoload;
        if ( class_exists( 'FPDF' ) || class_exists( 'Fpdf\\Fpdf' ) ) { return true; }
    }
    foreach ( array(
        get_template_directory() . '/fpdf/fpdf.php',
        get_template_directory() . '/vendor/fpdf/fpdf.php',
        WP_CONTENT_DIR . '/fpdf/fpdf.php',
    ) as $p ) {
        if ( file_exists( $p ) ) { require_once $p; return class_exists( 'FPDF' ); }
    }
    return false;
}

// ===================================================================
// LEISTUNGEN JE PAKET  (nur was wir tatsächlich liefern)
// ===================================================================

function sagatrail_paket_leistungen_v2( $paket_name ) {
    $basis = array(
        'Eintrag auf der SagaTrail-Wanderkarte (iOS & Android)',
        'Auffindbar für Wanderinnen und Wanderer auf Schweizer Sagenwegen in der Nähe (Suchradius ca. 2 km)',
        'Profil mit Name, Kategorie, Adresse und Öffnungszeiten',
        'Exklusives Angebot / Rabatt für SagaTrail-Nutzerinnen und -Nutzer',
        'Einrichtung innerhalb von 5 Werktagen nach Zahlungseingang – wir übernehmen den kompletten Setup',
    );
    if ( $paket_name === 'Standard' ) {
        $basis[] = 'Beschreibungstext (bis 250 Zeichen) im App-Profil';
        $basis[] = 'Monatliche Übersicht der Profilaufrufe und Angebot-Tipps per E-Mail';
    }
    if ( $paket_name === 'Premium' ) {
        $basis[] = 'Beschreibungstext (bis 500 Zeichen) im App-Profil';
        $basis[] = 'Monatlicher Statistikbericht: Profilaufrufe und Angebot-Tipps per E-Mail';
        $basis[] = 'KI-gestützte Narrationserwaehnung: Sobald Wandernde sich auf weniger als 500 m nähern, webt der digitale Erzähler Ihren Betrieb und Ihr Angebot organisch in die laufende Sagenerzählung ein';
    }
    return $basis;
}

// ===================================================================
// KONDITIONEN JE ABRECHNUNGSMODELL
// ===================================================================

function sagatrail_konditionen_v2( $paket_name, $preis_str, $is_monatlich ) {
    if ( $is_monatlich ) {
        return array(
            'Monatliche Gebühr: ' . $preis_str,
            'Vertragslaufzeit: monatlich, keine Mindestlaufzeit',
            'Kündigung: schriftlich per E-Mail an info@sagatrail.ch, jederzeit zum Ende des laufenden Kalendermonats; der Eintrag wird am Monatsletzten deaktiviert',
            'Rechnungsstellung: monatlich im Voraus nach Freischaltung',
            'Zahlungsfrist: 10 Tage nach Rechnungseingang',
            'Keine Einrichtungsgebühr',
            'Bei Zahlungsverzug behält sich SagaTrail das Recht vor, den Eintrag vorübergehend zu deaktivieren',
            'Pflichten des Partners: Bereitstellung korrekter und aktueller Betriebsinformationen; Einhaltung des kommunizierten Nutzerangebots; Meldung von Änderungen (Betriebsschluss, Angebotsänderung) innerhalb von 14 Tagen per E-Mail an info@sagatrail.ch',
            'Gerichtsstand: Oberwil BL; es gilt ausschliesslich Schweizer Recht',
        );
    }
    return array(
        'Jahresgebühr: ' . $preis_str,
        'Vertragslaufzeit: 12 Monate ab Freischaltung; verlängert sich automatisch um weitere 12 Monate',
        'Kündigung: schriftlich per E-Mail an info@sagatrail.ch, mindestens 30 Tage vor Vertragsende; ohne rechtzeitige Kündigung verlängert sich der Vertrag automatisch um ein weiteres Jahr',
        'Rechnungsstellung: jährlich im Voraus nach Freischaltung',
        'Zahlungsfrist: 10 Tage nach Rechnungseingang',
        'Keine Einrichtungsgebühr',
        'Bei Zahlungsverzug behält sich SagaTrail das Recht vor, den Eintrag vorübergehend zu deaktivieren',
        'Pflichten des Partners: Bereitstellung korrekter und aktueller Betriebsinformationen; Einhaltung des kommunizierten Nutzerangebots; Meldung von Änderungen (Betriebsschluss, Angebotsänderung) innerhalb von 14 Tagen per E-Mail an info@sagatrail.ch',
        'Gerichtsstand: Oberwil BL; es gilt ausschliesslich Schweizer Recht',
    );
}

// ===================================================================
// HAUPTFUNKTION
// ===================================================================

function sagatrail_partner_vertrag_senden( $data, $row_id ) {

    $paket_namen = array(
        'basic'    => 'Basic',
        'standard' => 'Standard',
        'premium'  => 'Premium',
    );

    $paket              = isset( $data['paket'] ) ? $data['paket'] : 'standard';
    $abr                = isset( $data['abrechnungsperiode'] ) ? $data['abrechnungsperiode'] : '';
    $is_monatlich       = ( $paket === 'basic' && $abr === 'monatlich' );
    $paket_name         = isset( $paket_namen[ $paket ] ) ? $paket_namen[ $paket ] : ucfirst( $paket );

    // Konditionen-Text & Positionszeile
    if ( $is_monatlich ) {
        $preis_str = 'CHF 14.99 pro Monat';
        $preis_pos = 'CHF 14,99';
    } elseif ( $paket === 'basic' ) {
        $preis_str = 'CHF 99.00 pro Jahr';
        $preis_pos = 'CHF 99,00';
    } elseif ( $paket === 'standard' ) {
        $preis_str = 'CHF 199.00 pro Jahr';
        $preis_pos = 'CHF 199,00';
    } else {
        $preis_str = 'CHF 499.00 pro Jahr';
        $preis_pos = 'CHF 499,00';
    }

    $datum_kurz = date( 'd.m.Y' );
    $datum_lang = date_i18n( 'd. F Y' );
    $ref        = 'ST-' . str_pad( $row_id, 5, '0', STR_PAD_LEFT );

    if ( ! sagatrail_partner_lade_fpdf() ) {
        error_log( 'SagaTrail: FPDF nicht gefunden – Partnervertrag ' . $ref . ' nicht erzeugt.' );
        return;
    }

    $pdf_inhalt = sagatrail_pdf_erzeugen_v2( $data, $paket_name, $preis_str, $preis_pos, $datum_kurz, $datum_lang, $ref, $is_monatlich );
    sagatrail_vertrag_mail_senden_v2( $data, $paket_name, $preis_str, $datum_lang, $ref, $pdf_inhalt );
}

// ===================================================================
// PDF ERZEUGEN — Briefdesign gemäss Vorlage
// ===================================================================

function sagatrail_pdf_erzeugen_v2( $data, $paket_name, $preis_str, $preis_pos, $datum_kurz, $datum_lang, $ref, $is_monatlich ) {

    $pdf = new FPDF( 'P', 'mm', 'A4' );
    $pdf->AddPage();
    $pdf->SetMargins( 22, 22, 22 );
    $pdf->SetAutoPageBreak( true, 24 );
    $pdf->SetY( 22 );

    $W = 166; // nutzbare Breite (210 – 44)
    $L = 22;  // linker Rand

    // ----- LOGO + FIRMENNAME -----
    $icon_pfad = sagatrail_partner_icon_pfad();
    $logo_h    = 14; // mm
    if ( $icon_pfad ) {
        $pdf->Image( $icon_pfad, $L, $pdf->GetY(), 0, $logo_h );
        $pdf->SetXY( $L + 18, $pdf->GetY() + 1 );
    }
    $pdf->SetFont( 'Helvetica', 'B', 22 );
    $pdf->SetTextColor( 204, 0, 0 );
    $pdf->Cell( 0, 10, st_enc( 'SagaTrail' ), 0, 1, 'L' );

    if ( $icon_pfad ) { $pdf->SetX( $L + 18 ); }
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 130, 130, 130 );
    $pdf->Cell( 0, 5, st_enc( 'www.sagatrail.ch  ·  info@sagatrail.ch' ), 0, 1, 'L' );

    // Abstand bis zur roten Linie
    $pdf->Ln( max( 2, ( $icon_pfad ? 22 + $logo_h : 0 ) - $pdf->GetY() + 2 ) );

    // Rote Trennlinie
    $pdf->SetDrawColor( 204, 0, 0 );
    $pdf->SetLineWidth( 0.8 );
    $line_y = $pdf->GetY();
    $pdf->Line( $L, $line_y, $L + $W, $line_y );
    $pdf->Ln( 8 );

    // ----- TITEL -----
    $pdf->SetFont( 'Helvetica', 'B', 15 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 8, st_enc( 'Partnerschaftsvertrag' ), 0, 1, 'L' );
    $pdf->Ln( 5 );

    // ----- VERTRAGSPARTEIEN -----
    // "zwischen" + Datum rechtsbündig in gleicher Zeile
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( $W - 55, 5, st_enc( 'zwischen' ), 0, 0, 'L' );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 55, 5, st_enc( 'Oberwil, den ' . $datum_kurz ), 0, 1, 'R' );
    $pdf->Ln( 2 );

    // SagaTrail-Adresse
    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 5, st_enc( 'A.i.L. by Koch' ), 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    foreach ( array( 'Rolf Koch', 'Mühlemattstrasse 11', 'CH-4104 Oberwil BL', 'CHE-286.962.827' ) as $zeile ) {
        $pdf->Cell( 0, 4.5, st_enc( $zeile ), 0, 1, 'L' );
    }
    $pdf->Ln( 4 );

    // "und"
    $pdf->SetFont( 'Helvetica', 'I', 9 );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 0, 5, st_enc( 'und' ), 0, 1, 'L' );
    $pdf->Ln( 2 );

    // Partner-Adresse
    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 5, st_enc( $data['betriebs_name'] ?? '' ), 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    if ( ! empty( $data['kontakt_name'] ) ) {
        $pdf->Cell( 0, 4.5, st_enc( $data['kontakt_name'] ), 0, 1, 'L' );
    }
    if ( ! empty( $data['adresse'] ) ) {
        $pdf->Cell( 0, 4.5, st_enc( $data['adresse'] ), 0, 1, 'L' );
    }
    $plz_ort_kanton = trim(
        ( $data['plz'] ?? '' ) . ' ' .
        ( $data['ort'] ?? '' ) . ' ' .
        strtoupper( $data['canton'] ?? '' )
    );
    if ( $plz_ort_kanton ) {
        $pdf->Cell( 0, 4.5, st_enc( 'CH-' . $plz_ort_kanton ), 0, 1, 'L' );
    }

    $pdf->Ln( 3 );
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 160, 160, 160 );
    $pdf->Cell( 0, 4, st_enc( 'Referenz: ' . $ref ), 0, 1, 'L' );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Ln( 7 );

    // ----- POSITIONSTABELLE -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, st_enc( 'Partnerpaket' ), 0, 1, 'L' );
    $pdf->Ln( 2 );

    $col_pos   = 14;
    $col_preis = 42;
    $col_desc  = $W - $col_pos - $col_preis;

    // Obere dünne Linie
    $pdf->SetDrawColor( 160, 160, 160 );
    $pdf->SetLineWidth( 0.25 );
    $pdf->Line( $L, $pdf->GetY(), $L + $W, $pdf->GetY() );
    $pdf->Ln( 1.5 );

    // Spaltenüberschriften
    $pdf->SetFont( 'Helvetica', 'B', 8 );
    $pdf->SetTextColor( 120, 120, 120 );
    $label_preis = $is_monatlich ? 'Preis p. Mt.' : 'Preis p.a.';
    $pdf->Cell( $col_pos,  5, st_enc( 'Pos' ),          0, 0, 'L' );
    $pdf->Cell( $col_desc, 5, st_enc( 'Beschreibung' ), 0, 0, 'L' );
    $pdf->Cell( $col_preis,5, st_enc( $label_preis ),   0, 1, 'R' );

    // Dicke Trennlinie unter Header
    $pdf->SetDrawColor( 50, 50, 50 );
    $pdf->SetLineWidth( 0.5 );
    $pdf->Line( $L, $pdf->GetY(), $L + $W, $pdf->GetY() );
    $pdf->Ln( 3 );

    // Zeile
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( $col_pos,  7, st_enc( '01' ), 0, 0, 'L' );
    $pdf->Cell( $col_desc, 7, st_enc( $paket_name . ' Paket' ), 0, 0, 'L' );
    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->Cell( $col_preis,7, st_enc( $preis_pos ), 0, 1, 'R' );

    // Untere dicke Linie
    $pdf->SetDrawColor( 50, 50, 50 );
    $pdf->SetLineWidth( 0.5 );
    $pdf->Line( $L, $pdf->GetY(), $L + $W, $pdf->GetY() );
    $pdf->Ln( 9 );

    // ----- LEISTUNGSBESCHREIBUNG -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 6, st_enc( 'Leistungsbeschreibung:' ), 0, 1, 'L' );
    $pdf->Ln( 1 );

    $pdf->SetFont( 'Helvetica', '', 9 );
    foreach ( sagatrail_paket_leistungen_v2( $paket_name ) as $li ) {
        $pdf->SetX( $L );
        $pdf->Cell( 5, 5, chr( 149 ), 0, 0 );
        $pdf->MultiCell( $W - 5, 5, st_enc( $li ), 0, 'L' );
    }
    $pdf->Ln( 5 );

    // ----- KONDITIONEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, st_enc( 'Konditionen:' ), 0, 1, 'L' );
    $pdf->Ln( 1 );

    $pdf->SetFont( 'Helvetica', '', 9 );
    foreach ( sagatrail_konditionen_v2( $paket_name, $preis_str, $is_monatlich ) as $k ) {
        $pdf->SetX( $L );
        $pdf->Cell( 5, 5, chr( 149 ), 0, 0 );
        $pdf->MultiCell( $W - 5, 5, st_enc( $k ), 0, 'L' );
    }
    $pdf->Ln( 10 );

    // ----- UNTERSCHRIFTEN -----
    // Prüfen ob noch genug Platz auf der Seite (mind. 50 mm für Sig-Block)
    if ( $pdf->GetY() > 247 ) {
        $pdf->AddPage();
        $pdf->Ln( 10 );
    }

    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->SetTextColor( 26, 26, 26 );
    $col_sig = ( $W - 10 ) / 2; // je ~78 mm, 10 mm Mitte
    $pdf->Cell( $col_sig, 5, st_enc( 'A.i.L. by Koch  –  SagaTrail' ), 0, 0, 'L' );
    $pdf->Cell( 10, 5, '', 0, 0 );
    $pdf->Cell( $col_sig, 5, st_enc( $data['betriebs_name'] ?? '' ), 0, 1, 'L' );
    $pdf->Ln( 3 );

    // Signatur-Bild SagaTrail (links)
    $sig_pfad = sagatrail_partner_sig_pfad();
    $sig_y    = $pdf->GetY();
    if ( $sig_pfad ) {
        $pdf->Image( $sig_pfad, $L, $sig_y, 55 );
        $pdf->SetY( $sig_y + 20 );
    } else {
        $pdf->Ln( 18 );
    }

    // Signaturlinie links + rechts
    $pdf->SetDrawColor( 130, 130, 130 );
    $pdf->SetLineWidth( 0.3 );
    $sig_line_y = $pdf->GetY();
    $pdf->Line( $L,            $sig_line_y, $L + $col_sig,              $sig_line_y );
    $pdf->Line( $L + $col_sig + 10, $sig_line_y, $L + $W,               $sig_line_y );
    $pdf->Ln( 3 );

    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->Cell( $col_sig, 5, st_enc( 'Rolf Koch, Inhaber' ), 0, 0, 'L' );
    $pdf->Cell( 10, 5, '', 0, 0 );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->Cell( $col_sig, 5, st_enc( 'Ort, Datum, Unterschrift' ), 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 130, 130, 130 );
    $pdf->Cell( $col_sig, 4, st_enc( $datum_lang ), 0, 1, 'L' );

    // ----- FUSSZEILE -----
    $pdf->SetY( -18 );
    $pdf->SetDrawColor( 204, 0, 0 );
    $pdf->SetLineWidth( 0.4 );
    $pdf->Line( $L, $pdf->GetY(), $L + $W, $pdf->GetY() );
    $pdf->Ln( 3 );
    $pdf->SetFont( 'Helvetica', 'I', 8 );
    $pdf->SetTextColor( 160, 160, 160 );
    $pdf->Cell( 0, 5, st_enc( 'A.i.L. by Koch  ·  www.sagatrail.ch  ·  info@sagatrail.ch  |  Referenz: ' . $ref ), 0, 0, 'C' );

    return $pdf->Output( 'S' );
}

// ===================================================================
// E-MAIL VERSENDEN
// ===================================================================

function sagatrail_vertrag_mail_senden_v2( $data, $paket_name, $preis_str, $datum_lang, $ref, $pdf_inhalt ) {

    $to      = sanitize_email( $data['kontakt_email'] );
    $name    = $data['kontakt_name'] ?? 'Interessentin / Interessent';
    $betrieb = $data['betriebs_name'] ?? '';

    $subject = mb_encode_mimeheader(
        'SagaTrail Partnerschaftsvertrag ' . $ref . ' – ' . $betrieb,
        'UTF-8', 'B'
    );

    $body  = "Guten Tag " . $name . ",\n\n";
    $body .= "vielen Dank für Ihr Interesse an einer Partnerschaft mit SagaTrail.\n";
    $body .= "Im Anhang finden Sie den Partnerschaftsvertrag als PDF.\n\n";
    $body .= "Paket:     " . $paket_name . "\n";
    $body .= "Gebühr:    " . $preis_str  . "\n";
    $body .= "Referenz:  " . $ref        . "\n\n";
    $body .= "Bitte drucken Sie das Dokument aus, unterschreiben Sie es und\n";
    $body .= "senden Sie es uns per E-Mail zurück an info@sagatrail.ch.\n\n";
    $body .= "Wir richten Ihren Eintrag innerhalb von 5 Werktagen nach\n";
    $body .= "Zahlungseingang ein und melden uns, sobald Sie live sind.\n\n";
    $body .= "Bei Fragen stehen wir Ihnen jederzeit zur Verfügung.\n\n";
    $body .= "Freundliche Grüsse\n";
    $body .= "Das SagaTrail-Team\n";
    $body .= "info@sagatrail.ch  |  www.sagatrail.ch";

    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: SagaTrail <info@sagatrail.ch>',
        'Cc: info@sagatrail.ch',
        'Reply-To: info@sagatrail.ch',
    );

    $pdf_file = get_temp_dir() . 'sagatrail-partner-' . sanitize_file_name( $ref ) . '.pdf';
    file_put_contents( $pdf_file, $pdf_inhalt );

    $gesendet = wp_mail( $to, $subject, $body, $headers, array( $pdf_file ) );

    @unlink( $pdf_file );

    if ( ! $gesendet ) {
        error_log( 'SagaTrail Vertrags-Mail nicht gesendet an: ' . $to );
    }
    return $gesendet;
}

// ===================================================================
// HOOK: nach Partner-Anfrage aufrufen
// ===================================================================

add_action( 'sagatrail_partner_anfrage_gespeichert', function( $data, $row_id ) {
    sagatrail_partner_vertrag_senden( $data, $row_id );
}, 10, 2 );
