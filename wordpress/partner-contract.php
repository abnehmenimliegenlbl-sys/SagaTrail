<?php
/**
 * SAGATRAIL PARTNERSCHAFTSVERTRAG  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ort: Run Everywhere
 *
 * Erzeugt nach einer Partner-Anfrage einen Partnerschaftsvertrag als PDF
 * und sendet ihn per E-Mail an den Interessenten und an info@sagatrail.ch.
 *
 * Benötigt FPDF (http://www.fpdf.org):
 *  Option A — Im WordPress-Theme-Ordner: /wp-content/themes/THEME/fpdf/fpdf.php
 *  Option B — Als Composer-Paket: composer require setasign/fpdf
 *             dann require_once ABSPATH . 'vendor/autoload.php';
 *
 * Diese Funktion wird von partner-handler.php aufgerufen:
 *   sagatrail_partner_vertrag_senden($daten_array, $row_id)
 *
 * Konfiguration:
 *   define('SAGATRAIL_FPDF_PATH', '/pfad/zu/fpdf/fpdf.php');
 *   Ohne Konfiguration: Versuch mit Standard-Pfad, dann HTML-Fallback.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ===================================================================
// UNTERSCHRIFT – Pfad-Auflösung
// ===================================================================
// Legen Sie signature.png (aus diesem ZIP) in einen dieser Ordner:
//   wp-content/uploads/sagatrail/signature.png  (Standard, empfohlen)
//   oder: define('SAGATRAIL_SIGNATURE_PATH', '/absoluter/pfad/signature.png');

function sagatrail_icon_pfad() {
    if ( defined( 'SAGATRAIL_ICON_PATH' ) && file_exists( SAGATRAIL_ICON_PATH ) ) {
        return SAGATRAIL_ICON_PATH;
    }
    $upload = wp_upload_dir();
    $pfad   = trailingslashit( $upload['basedir'] ) . 'sagatrail/sagatrail-icon.png';
    return file_exists( $pfad ) ? $pfad : false;
}

function sagatrail_sig_pfad() {
    if ( defined( 'SAGATRAIL_SIGNATURE_PATH' ) && file_exists( SAGATRAIL_SIGNATURE_PATH ) ) {
        return SAGATRAIL_SIGNATURE_PATH;
    }
    $upload = wp_upload_dir();
    $pfad   = trailingslashit( $upload['basedir'] ) . 'sagatrail/signature.png';
    return file_exists( $pfad ) ? $pfad : null;
}

// ===================================================================
// FPDF laden
// ===================================================================

function sagatrail_lade_fpdf() {
    // 1. Expliziter Pfad in wp-config.php
    if ( defined( 'SAGATRAIL_FPDF_PATH' ) && file_exists( SAGATRAIL_FPDF_PATH ) ) {
        require_once SAGATRAIL_FPDF_PATH;
        return class_exists( 'FPDF' );
    }
    // 2. Autoloader (Composer)
    $autoload = ABSPATH . 'vendor/autoload.php';
    if ( file_exists( $autoload ) ) {
        require_once $autoload;
        if ( class_exists( 'FPDF' ) || class_exists( 'Fpdf\\Fpdf' ) ) { return true; }
    }
    // 3. Standard-Pfade im Theme-Ordner
    $kandidaten = array(
        get_template_directory() . '/fpdf/fpdf.php',
        get_template_directory() . '/vendor/fpdf/fpdf.php',
        WP_CONTENT_DIR . '/fpdf/fpdf.php',
    );
    foreach ( $kandidaten as $p ) {
        if ( file_exists( $p ) ) { require_once $p; return class_exists( 'FPDF' ); }
    }
    return false;
}

// ===================================================================
// HAUPTFUNKTION: Vertrag als PDF erzeugen und per Mail senden
// ===================================================================

function sagatrail_partner_vertrag_senden( $data, $row_id ) {

    $paket_namen = array(
        'basic'    => 'Basic',
        'standard' => 'Standard',
        'premium'  => 'Premium',
    );
    $paket_preise = array(
        'basic'    => 'CHF 99.– / Jahr (od. CHF 9.90 / Monat, keine Einrichtungsgebühr)',
        'standard' => 'CHF 199.– / Jahr (od. CHF 19.90 / Monat, keine Einrichtungsgebühr)',
        'premium'  => 'CHF 499.– / Jahr (keine Einrichtungsgebühr)',
    );

    $paket       = isset( $data['paket'] ) ? $data['paket'] : 'standard';
    $paket_name  = isset( $paket_namen[ $paket ] )  ? $paket_namen[ $paket ]  : ucfirst( $paket );
    $paket_preis = isset( $paket_preise[ $paket ] ) ? $paket_preise[ $paket ] : '';
    $datum       = date_i18n( 'd. F Y' );
    $ref         = 'ST-' . str_pad( $row_id, 5, '0', STR_PAD_LEFT );

    // --- FPDF verfügbar? ---
    $fpdf_ok = sagatrail_lade_fpdf();

    if ( $fpdf_ok ) {
        $pdf_inhalt = sagatrail_pdf_erzeugen( $data, $paket_name, $paket_preis, $datum, $ref );
    } else {
        // Fallback: HTML-formatierter Vertragstext als Anhang
        $pdf_inhalt = sagatrail_html_vertrag( $data, $paket_name, $paket_preis, $datum, $ref );
    }

    sagatrail_vertrag_mail_senden( $data, $paket_name, $paket_preis, $datum, $ref, $pdf_inhalt, $fpdf_ok );
}

// ===================================================================
// PDF ERZEUGEN (FPDF)
// ===================================================================

function sagatrail_pdf_erzeugen( $data, $paket_name, $paket_preis, $datum, $ref ) {

    $pdf = new FPDF( 'P', 'mm', 'A4' );
    $pdf->AddPage();
    $pdf->SetMargins( 20, 20, 20 );
    $pdf->SetAutoPageBreak( true, 20 );

    // ----- KOPF -----
    $icon_pfad = sagatrail_icon_pfad();
    $icon_h = 16; // mm Höhe
    $y_start = $pdf->GetY();
    if ( $icon_pfad ) {
        $pdf->Image( $icon_pfad, 20, $y_start, 0, $icon_h ); // Breite auto
        $pdf->SetXY( 40, $y_start + 1 );
    }
    $pdf->SetFont( 'Helvetica', 'B', 20 );
    $pdf->SetTextColor( 204, 0, 0 );
    $pdf->Cell( 0, 10, 'SagaTrail', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 120, 120, 120 );
    if ( $icon_pfad ) { $pdf->SetX( 40 ); }
    $pdf->Cell( 0, 5, 'A.i.L. by Koch  |  Mühlemattstrasse 11, 4104 Oberwil BL  |  info@sagatrail.ch', 0, 1, 'L' );
    $pdf->Ln( max( 2, $y_start + $icon_h - $pdf->GetY() + 2 ) );

    // Trennlinie rot
    $pdf->SetDrawColor( 204, 0, 0 );
    $pdf->SetLineWidth( 0.8 );
    $pdf->Line( 20, $pdf->GetY(), 190, $pdf->GetY() );
    $pdf->Ln( 6 );

    // ----- TITEL -----
    $pdf->SetFont( 'Helvetica', 'B', 14 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 8, 'Partnerschaftsvereinbarung', 0, 1, 'L' );

    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 0, 5, 'Referenz: ' . $ref . '   |   Datum: ' . $datum, 0, 1, 'L' );
    $pdf->Ln( 6 );

    // ----- PARTEIEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 6, 'Vertragsparteien', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );

    $zeilen = array(
        'Anbieter:',       'A.i.L. by Koch, Mühlemattstrasse 11, 4104 Oberwil BL',
        'UID:',            'CHE-286.962.827  |  info@sagatrail.ch',
        'Partner:',        $data['betriebs_name'] . ', ' . $data['ort'],
        'Kontaktperson:',  $data['kontakt_name'] . ', ' . $data['kontakt_email'],
    );
    for ( $i = 0; $i < count( $zeilen ); $i += 2 ) {
        $pdf->SetFont( 'Helvetica', 'B', 9 );
        $pdf->Cell( 35, 5.5, $zeilen[ $i ], 0, 0 );
        $pdf->SetFont( 'Helvetica', '', 9 );
        $pdf->Cell( 0, 5.5, $zeilen[ $i + 1 ], 0, 1 );
    }
    $pdf->Ln( 5 );

    // ----- LEISTUNGEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, 'Leistungen (Paket ' . $paket_name . ')', 0, 1, 'L' );

    $leistungen = sagatrail_paket_leistungen( $paket_name );
    $pdf->SetFont( 'Helvetica', '', 9 );
    foreach ( $leistungen as $li ) {
        $pdf->Cell( 6, 5, chr( 149 ), 0, 0 );
        $pdf->MultiCell( 0, 5, $li, 0, 'L' );
    }
    $pdf->Ln( 3 );

    // ----- KONDITIONEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, 'Konditionen', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );

    $konditionen = array(
        'Jahresgebühr: ' . $paket_preis,
        'Vertragslaufzeit: 12 Monate, automatische Verlängerung um weitere 12 Monate.',
        'Kündigung: schriftlich (E-Mail) 60 Tage vor Ablauf der Vertragslaufzeit.',
        'Rechnungsstellung: jährlich im Voraus nach Freischaltung des Partner-Eintrags.',
        'Zahlungsfrist: 30 Tage nach Rechnungseingang.',
        'Alle Preise verstehen sich exkl. Mehrwertsteuer (Schweizer MWST 8,1 %).',
    );
    foreach ( $konditionen as $k ) {
        $pdf->Cell( 6, 5, chr( 149 ), 0, 0 );
        $pdf->MultiCell( 0, 5, $k, 0, 'L' );
    }
    $pdf->Ln( 3 );

    // ----- PFLICHTEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, 'Pflichten des Partners', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pflichten = array(
        'Bereitstellung korrekter und aktueller Betriebsinformationen.',
        'Einhaltung des kommunizierten SagaTrail-Nutzerangebots.',
        'Meldung von Änderungen (Betriebsschluss, neues Angebot) innert 14 Tagen.',
    );
    foreach ( $pflichten as $p ) {
        $pdf->Cell( 6, 5, chr( 149 ), 0, 0 );
        $pdf->MultiCell( 0, 5, $p, 0, 'L' );
    }
    $pdf->Ln( 3 );

    // ----- DATENSCHUTZ -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, 'Datenschutz & Gerichtsstand', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->MultiCell( 0, 5,
        'Die erhobenen Daten werden ausschliesslich zur Durchführung dieser Vereinbarung verwendet (DSG/DSGVO-konform). ' .
        'Es gilt Schweizer Recht. Gerichtsstand ist der Sitz von SagaTrail.', 0, 'L' );
    $pdf->Ln( 5 );

    // ----- UNTERSCHRIFTEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->Cell( 0, 6, 'Unterschriften', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->Cell( 85, 5, 'A.i.L. by Koch  –  SagaTrail', 0, 0 );
    $pdf->Cell( 0,  5, $data['betriebs_name'], 0, 1 );
    $pdf->Ln( 3 );

    // Unterschrift SagaTrail (linke Spalte)
    $sig_pfad = sagatrail_sig_pfad();
    if ( $sig_pfad ) {
        $pdf->Image( $sig_pfad, 20, $pdf->GetY(), 55 ); // 55 mm breit, Seitenverhältnis auto
        $pdf->Ln( 22 );
    } else {
        $pdf->Ln( 14 );
    }

    $pdf->SetDrawColor( 120, 120, 120 );
    $pdf->SetLineWidth( 0.3 );
    $pdf->Line( 20, $pdf->GetY(), 100, $pdf->GetY() );
    $pdf->Line( 110, $pdf->GetY(), 190, $pdf->GetY() );
    $pdf->Ln( 3 );
    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->Cell( 85, 5, 'Rolf Koch, Inhaber', 0, 0 );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->Cell( 0,  5, 'Ort, Datum, Unterschrift', 0, 1 );
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 85, 4, $datum, 0, 1 );

    // ----- FUSSZEILE -----
    $pdf->SetY( -20 );
    $pdf->SetFont( 'Helvetica', 'I', 8 );
    $pdf->SetTextColor( 150, 150, 150 );
    $pdf->Cell( 0, 5, 'A.i.L. by Koch – www.sagatrail.ch – info@sagatrail.ch  |  Referenz: ' . $ref, 0, 0, 'C' );

    return $pdf->Output( 'S' ); // Binärstring zurückgeben
}

// ===================================================================
// PAKET-LEISTUNGEN
// ===================================================================

function sagatrail_paket_leistungen( $paket_name ) {
    $basis = array(
        'Eintrag auf der SagaTrail-Wanderkarte (iOS & Android)',
        'Sichtbarkeit für Wanderinnen und Wanderer auf allen Schweizer Sagenwegen',
        'Name, Kategorie und Adresse im App-Profil',
        'Exklusives Angebot für SagaTrail-Nutzerinnen und -Nutzer',
    );
    if ( $paket_name === 'Standard' || $paket_name === 'Premium' ) {
        $basis[] = 'Beschreibungstext (bis 250 Zeichen) im App-Profil';
        $basis[] = 'Klick-Statistiken (monatliche Übersicht per E-Mail)';
    }
    if ( $paket_name === 'Premium' ) {
        $basis[4] = 'Beschreibungstext (bis 500 Zeichen) im App-Profil';
        $basis[]  = 'Detaillierter Statistik-Report (Views + Angebot-Tipps)';
        $basis[]  = 'Narrations-Erwähnung beim Vorbeiwandern (automatisch via GPS)';
    }
    return $basis;
}

// ===================================================================
// HTML-FALLBACK (wenn FPDF nicht installiert)
// ===================================================================

function sagatrail_html_vertrag( $data, $paket_name, $paket_preis, $datum, $ref ) {
    $leistungen = sagatrail_paket_leistungen( $paket_name );
    $li_html = implode( '', array_map( function( $l ) {
        return '<li>' . esc_html( $l ) . '</li>';
    }, $leistungen ) );

    $html  = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">';
    $html .= '<title>SagaTrail Partnerschaftsvertrag ' . esc_html( $ref ) . '</title>';
    $html .= '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;max-width:700px;margin:0 auto;padding:24px}';
    $html .= 'h1{color:#CC0000;font-size:22px;margin:0;line-height:1}h2{font-size:14px;margin-top:20px;border-bottom:1px solid #ddd;padding-bottom:4px}';
    $html .= 'ul{margin:6px 0;padding-left:20px}li{margin:3px 0}.sig{border-top:1px solid #999;width:200px;margin-top:24px;padding-top:4px;display:inline-block}';
    $html .= '.footer{color:#999;font-size:10px;text-align:center;margin-top:40px;border-top:1px solid #eee;padding-top:10px}';
    $html .= '.st-head{display:flex;align-items:center;gap:14px;margin-bottom:6px}';
    $html .= '.st-head img{width:52px;height:52px;border-radius:12px;flex-shrink:0}</style></head><body>';
    $icon_pfad_h = sagatrail_icon_pfad();
    $icon_tag = '';
    if ( $icon_pfad_h ) {
        $b64 = base64_encode( file_get_contents( $icon_pfad_h ) );
        $icon_tag = '<img src="data:image/png;base64,' . $b64 . '" alt="SagaTrail">';
    }
    $html .= '<div class="st-head">' . $icon_tag . '<div><h1>SagaTrail</h1><p style="color:#666;font-size:11px;margin:2px 0 0">A.i.L. by Koch &nbsp;|&nbsp; info@sagatrail.ch &nbsp;|&nbsp; www.sagatrail.ch</p></div></div>';
    $html .= '<hr style="border-color:#CC0000;border-width:2px;margin:10px 0 16px">';
    $html .= '<h2 style="border:none;font-size:18px">Partnerschaftsvereinbarung</h2>';
    $html .= '<p><strong>Referenz:</strong> ' . esc_html( $ref ) . ' &nbsp;|&nbsp; <strong>Datum:</strong> ' . esc_html( $datum ) . '</p>';
    $html .= '<h2>Vertragsparteien</h2>';
    $html .= '<table><tr><td><strong>Anbieter:</strong></td><td>A.i.L. by Koch, Mühlemattstrasse 11, 4104 Oberwil BL</td></tr><tr><td><strong>UID:</strong></td><td>CHE-286.962.827 &nbsp;|&nbsp; info@sagatrail.ch</td></tr>';
    $html .= '<tr><td><strong>Partner:</strong></td><td>' . esc_html( $data['betriebs_name'] ) . ', ' . esc_html( $data['ort'] ) . '</td></tr>';
    $html .= '<tr><td><strong>Kontakt:</strong></td><td>' . esc_html( $data['kontakt_name'] ) . ', ' . esc_html( $data['kontakt_email'] ) . '</td></tr></table>';
    $html .= '<h2>Leistungen (Paket ' . esc_html( $paket_name ) . ')</h2><ul>' . $li_html . '</ul>';
    $html .= '<h2>Konditionen</h2><ul>';
    $html .= '<li><strong>Jahresgebühr:</strong> ' . esc_html( $paket_preis ) . '</li>';
    $html .= '<li>Vertragslaufzeit: 12 Monate, automatische Verlängerung.</li>';
    $html .= '<li>Kündigung schriftlich 60 Tage vor Ablauf.</li>';
    $html .= '<li>Rechnungsstellung jährlich im Voraus. Zahlungsfrist 30 Tage.</li>';
    $html .= '<li>Preise exkl. Schweizer MWST (8,1 %).</li></ul>';
    $html .= '<h2>Unterschriften</h2>';
    $html .= '<table style="width:100%;margin-top:16px"><tr valign="bottom">';

    // Linke Spalte: SagaTrail-Unterschrift mit Bild
    $html .= '<td style="width:45%">';
    $sig_pfad = sagatrail_sig_pfad();
    if ( $sig_pfad ) {
        $sig_b64 = base64_encode( file_get_contents( $sig_pfad ) );
        $html .= '<img src="data:image/png;base64,' . $sig_b64 . '" style="max-width:180px;height:auto;display:block;margin-bottom:2px">';
    } else {
        $html .= '<div style="height:50px"></div>';
    }
    $html .= '<div class="sig"><strong>Rolf Koch, Inhaber</strong><br><span style="color:#999;font-size:10px">' . esc_html( $datum ) . '</span></div>';
    $html .= '</td>';

    // Rechte Spalte: Partner-Unterschrift (leer zum Ausfüllen)
    $html .= '<td><div style="height:50px"></div><div class="sig">' . esc_html( $data['betriebs_name'] ) . '<br><span style="color:#999;font-size:10px">Ort, Datum, Unterschrift</span></div></td>';
    $html .= '</tr></table>';
    $html .= '<div class="footer">SagaTrail – www.sagatrail.ch – ' . esc_html( $ref ) . '</div>';
    $html .= '</body></html>';
    return $html;
}

// ===================================================================
// E-MAIL VERSENDEN
// ===================================================================

function sagatrail_vertrag_mail_senden( $data, $paket_name, $paket_preis, $datum, $ref, $inhalt, $ist_pdf ) {

    $to      = sanitize_email( $data['kontakt_email'] );
    $cc      = 'info@sagatrail.ch';
    $subject = 'SagaTrail Partnerschaft ' . $ref . ' – Ihr Vertragsangebot';

    $text_body  = "Guten Tag " . $data['kontakt_name'] . ",\n\n";
    $text_body .= "vielen Dank für Ihr Interesse an einer Partnerschaft mit SagaTrail.\n";
    $text_body .= "Im Anhang finden Sie das Partnerschaftsangebot für Ihren Betrieb.\n\n";
    $text_body .= "Paket:        " . $paket_name . "\n";
    $text_body .= "Jahresgebühr: " . $paket_preis . "\n";
    $text_body .= "Referenz:     " . $ref . "\n\n";
    $text_body .= "Bitte unterschreiben Sie das Dokument und senden Sie es per E-Mail zurück.\n";
    $text_body .= "Unser Team meldet sich innert 2 Werktagen, um die nächsten Schritte zu besprechen.\n\n";
    $text_body .= "Freundliche Grüsse\n";
    $text_body .= "Das SagaTrail-Team\n";
    $text_body .= "info@sagatrail.ch | www.sagatrail.ch";

    // MIME-Aufbau mit Anhang
    $boundary = 'ST_' . md5( uniqid( '', true ) );

    $headers  = 'From: SagaTrail <info@sagatrail.ch>' . "\r\n";
    $headers .= 'Cc: ' . $cc . "\r\n";
    $headers .= 'Reply-To: info@sagatrail.ch' . "\r\n";
    $headers .= 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-Type: multipart/mixed; boundary="' . $boundary . '"' . "\r\n";

    $body  = '--' . $boundary . "\r\n";
    $body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
    $body .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
    $body .= $text_body . "\r\n";

    if ( $ist_pdf ) {
        $encoded   = base64_encode( $inhalt );
        $dateiname = 'SagaTrail-Partnerschaft-' . $ref . '.pdf';
        $mime_type = 'application/pdf';
    } else {
        $encoded   = base64_encode( $inhalt );
        $dateiname = 'SagaTrail-Partnerschaft-' . $ref . '.html';
        $mime_type = 'text/html';
    }

    $body .= '--' . $boundary . "\r\n";
    $body .= 'Content-Type: ' . $mime_type . '; name="' . $dateiname . '"' . "\r\n";
    $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
    $body .= 'Content-Disposition: attachment; filename="' . $dateiname . '"' . "\r\n\r\n";
    $body .= chunk_split( $encoded ) . "\r\n";
    $body .= '--' . $boundary . '--';

    $gesendet = wp_mail( $to, $subject, $body, $headers );

    if ( ! $gesendet ) {
        error_log( 'SagaTrail Vertrags-Mail konnte nicht gesendet werden an: ' . $to );
    }
    return $gesendet;
}

// ===================================================================
// HOOK: nach dem Speichern einer Anfrage den Vertrag senden
// (add_action in partner-handler.php nach dem $wpdb->insert aufrufen)
// Oder direkt hier als Filter einhängen:
// ===================================================================

add_action( 'sagatrail_partner_anfrage_gespeichert', function( $data, $row_id ) {
    sagatrail_partner_vertrag_senden( $data, $row_id );
}, 10, 2 );
