<?php
/**
 * SAGATRAIL PILOTPARTNERSCHAFTSVERTRAG  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ort: Run Everywhere
 *
 * Erzeugt den Pilotpartnerschaftsvertrag als PDF (via FPDF) und sendet
 * ihn per wp_mail() an den Verband sowie an info@sagatrail.ch.
 *
 * Benötigt FPDF (http://www.fpdf.org) — gleiche Einbindung wie partner-contract.php.
 * Unterschrift-PNG: wp-content/uploads/sagatrail/signature.png
 *
 * Wird von verband-handler.php via do_action('sagatrail_verband_anfrage_gespeichert') aufgerufen.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// Pfad-Hilfsfunktionen (wiederverwendet aus partner-contract.php falls vorhanden)
if ( ! function_exists( 'sagatrail_sig_pfad' ) ) {
    function sagatrail_sig_pfad() {
        if ( defined( 'SAGATRAIL_SIGNATURE_PATH' ) && file_exists( SAGATRAIL_SIGNATURE_PATH ) ) {
            return SAGATRAIL_SIGNATURE_PATH;
        }
        $upload = wp_upload_dir();
        $pfad   = trailingslashit( $upload['basedir'] ) . 'sagatrail/signature.png';
        return file_exists( $pfad ) ? $pfad : null;
    }
}

if ( ! function_exists( 'sagatrail_lade_fpdf' ) ) {
    function sagatrail_lade_fpdf() {
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
}

// ===================================================================
// HAUPTFUNKTION
// ===================================================================

function sagatrail_verband_vertrag_senden( $data, $row_id ) {
    $datum = date_i18n( 'd. F Y' );
    $ref   = 'ST-V' . str_pad( $row_id, 5, '0', STR_PAD_LEFT );

    $fpdf_ok = sagatrail_lade_fpdf();

    if ( $fpdf_ok ) {
        $pdf_inhalt = sagatrail_verband_pdf_erzeugen( $data, $datum, $ref );
        $ist_pdf    = true;
    } else {
        $pdf_inhalt = sagatrail_verband_html_vertrag( $data, $datum, $ref );
        $ist_pdf    = false;
    }

    $gesendet = sagatrail_verband_mail_senden( $data, $datum, $ref, $pdf_inhalt, $ist_pdf );

    // contract_sent-Flag in DB setzen
    global $wpdb;
    $wpdb->update(
        $wpdb->prefix . 'sagatrail_verband_anfragen',
        array( 'contract_sent' => $gesendet ? 1 : 0 ),
        array( 'id' => $row_id )
    );
}

// ===================================================================
// PDF ERZEUGEN (FPDF)
// ===================================================================

function sagatrail_verband_pdf_erzeugen( $data, $datum, $ref ) {
    $pdf = new FPDF( 'P', 'mm', 'A4' );
    $pdf->AddPage();
    $pdf->SetMargins( 20, 20, 20 );
    $pdf->SetAutoPageBreak( true, 20 );

    // ----- KOPF -----
    $pdf->SetFont( 'Helvetica', 'B', 20 );
    $pdf->SetTextColor( 204, 0, 0 );
    $pdf->Cell( 0, 10, 'SagaTrail', 0, 1, 'L' );

    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 120, 120, 120 );
    $pdf->Cell( 0, 5, 'A.i.L. by Koch  |  Mühlemattstrasse 11, 4104 Oberwil BL  |  info@sagatrail.ch', 0, 1, 'L' );
    $pdf->Ln( 2 );

    // Roter Trennstrich
    $pdf->SetDrawColor( 204, 0, 0 );
    $pdf->SetLineWidth( 0.8 );
    $pdf->Line( 20, $pdf->GetY(), 190, $pdf->GetY() );
    $pdf->Ln( 6 );

    // ----- TITEL -----
    $pdf->SetFont( 'Helvetica', 'B', 14 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 8, 'Pilotpartnerschaftsvereinbarung', 0, 1, 'L' );

    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 0, 5, 'Referenz: ' . $ref . '   |   Datum: ' . $datum, 0, 1, 'L' );
    $pdf->Ln( 5 );

    // ----- PARTEIEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 6, 'Vertragsparteien', 0, 1, 'L' );

    $zeilen = array(
        'Anbieter:',       'A.i.L. by Koch, Mühlemattstrasse 11, 4104 Oberwil BL',
        'UID:',            'CHE-286.962.827  |  info@sagatrail.ch',
        'Partner:',        $data['verband_name'],
        'Kontaktperson:',  $data['kontakt_name'] . ( $data['kontakt_telefon'] ? ', ' . $data['kontakt_telefon'] : '' ),
        'E-Mail:',         $data['email'],
        'Kantone:',        $data['kantone'],
    );
    $pdf->SetFont( 'Helvetica', '', 9 );
    for ( $i = 0; $i < count( $zeilen ); $i += 2 ) {
        $pdf->SetFont( 'Helvetica', 'B', 9 );
        $pdf->Cell( 35, 5.5, $zeilen[ $i ], 0, 0 );
        $pdf->SetFont( 'Helvetica', '', 9 );
        $pdf->MultiCell( 0, 5.5, $zeilen[ $i + 1 ], 0, 'L' );
    }
    $pdf->Ln( 4 );

    // ----- ABSCHNITTE -----
    $abschnitte = array(
        '1. Gegenstand und Laufzeit' => array(
            'p' => 'SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche Pilotpartnerschaft für die Dauer von 6 Monaten ab Unterzeichnung dieses Dokuments. Ziel ist die gemeinsame Förderung kulturell geprägter Wandererlebnisse durch die SagaTrail-App in der Destination des Verbands.',
        ),
        '2. Leistungen SagaTrail' => array(
            'bullets' => array(
                'Kostenlose Premium-Zugänge für Infostellen-Mitarbeitende des Verbands.',
                'Fertige digitale Marketing-Materialien (Texte, Bilder, QR-Codes, Social-Media-Vorlagen).',
                'Live-Nutzungsdashboard auf Kantonsebene: jederzeit einsehbar.',
                'Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.',
            ),
        ),
        '3. Pflichten des Verbands' => array(
            'bullets' => array(
                'Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start des Pilots.',
                'Platzierung eines QR-Codes oder Links auf der «Wandern»-Seite der Verbandswebsite.',
                'Vorstellung bei 3–5 lokalen Betrieben (Restaurants, Bergbahnen, Hotels).',
            ),
        ),
        '4. Konditionen' => array(
            'bullets' => array(
                'Die Pilotpartnerschaft ist für den Verband vollständig kostenlos.',
                'Keine laufenden Gebühren während der Pilotphase (6 Monate).',
                'Kündigung jederzeit schriftlich per E-Mail, wirksam mit Zugang der Erklärung.',
                'Nach 6 Monaten entscheiden beide Parteien gemeinsam über die Weiterführung.',
            ),
        ),
        '5. Datenschutz & Gerichtsstand' => array(
            'p' => 'SagaTrail verarbeitet Nutzungsdaten ausschliesslich aggregiert und anonymisiert (DSG/DSGVO-konform). Personenbezogene Daten des Verbands werden ausschliesslich zur Durchführung dieser Vereinbarung genutzt und nicht an Dritte weitergegeben. Es gilt Schweizer Recht. Gerichtsstand ist Basel.',
        ),
    );

    foreach ( $abschnitte as $titel => $inhalt ) {
        $pdf->SetFont( 'Helvetica', 'B', 10 );
        $pdf->SetTextColor( 26, 26, 26 );
        $pdf->Cell( 0, 6, $titel, 0, 1, 'L' );
        $pdf->SetFont( 'Helvetica', '', 9 );
        $pdf->SetTextColor( 80, 80, 80 );

        if ( isset( $inhalt['p'] ) ) {
            $pdf->MultiCell( 0, 5, $inhalt['p'], 0, 'L' );
        }
        if ( isset( $inhalt['bullets'] ) ) {
            foreach ( $inhalt['bullets'] as $b ) {
                $pdf->Cell( 6, 5, chr( 149 ), 0, 0 );
                $pdf->MultiCell( 0, 5, $b, 0, 'L' );
            }
        }
        $pdf->Ln( 3 );
    }

    // ----- UNTERSCHRIFTEN -----
    $pdf->SetFont( 'Helvetica', 'B', 10 );
    $pdf->SetTextColor( 26, 26, 26 );
    $pdf->Cell( 0, 6, 'Unterschriften', 0, 1, 'L' );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->Cell( 85, 5, 'A.i.L. by Koch  –  SagaTrail', 0, 0 );
    $pdf->Cell( 0,  5, $data['verband_name'], 0, 1 );
    $pdf->Ln( 3 );

    // Echte Unterschrift (linke Spalte)
    $sig_pfad = sagatrail_sig_pfad();
    $sig_y    = $pdf->GetY();
    if ( $sig_pfad ) {
        $pdf->Image( $sig_pfad, 20, $sig_y, 55 ); // 55 mm breit
        $pdf->SetY( $sig_y + 22 );
    } else {
        $pdf->Ln( 14 );
    }

    $pdf->SetDrawColor( 120, 120, 120 );
    $pdf->SetLineWidth( 0.3 );
    $line_y = $pdf->GetY();
    $pdf->Line( 20, $line_y, 100, $line_y );
    $pdf->Line( 110, $line_y, 190, $line_y );
    $pdf->Ln( 3 );

    $pdf->SetFont( 'Helvetica', 'B', 9 );
    $pdf->Cell( 85, 5, 'Rolf Koch, Inhaber', 0, 0 );
    $pdf->SetFont( 'Helvetica', '', 9 );
    $pdf->Cell( 0, 5, 'Ort, Datum, Unterschrift', 0, 1 );
    $pdf->SetFont( 'Helvetica', '', 8 );
    $pdf->SetTextColor( 100, 100, 100 );
    $pdf->Cell( 85, 4, $datum, 0, 1 );

    // ----- FUSSZEILE -----
    $pdf->SetY( -20 );
    $pdf->SetFont( 'Helvetica', 'I', 8 );
    $pdf->SetTextColor( 150, 150, 150 );
    $pdf->Cell( 0, 5,
        'A.i.L. by Koch – www.sagatrail.ch – info@sagatrail.ch  |  Referenz: ' . $ref,
        0, 0, 'C' );

    return $pdf->Output( 'S' );
}

// ===================================================================
// HTML-FALLBACK (ohne FPDF)
// ===================================================================

function sagatrail_verband_html_vertrag( $data, $datum, $ref ) {
    $sig_pfad = sagatrail_sig_pfad();
    $sig_tag  = '';
    if ( $sig_pfad ) {
        $sig_tag = '<img src="data:image/png;base64,' . base64_encode( file_get_contents( $sig_pfad ) ) .
                   '" style="max-width:180px;height:auto;display:block;margin-bottom:2px">';
    }

    $html  = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">';
    $html .= '<title>SagaTrail Pilotvertrag ' . esc_html( $ref ) . '</title>';
    $html .= '<style>body{font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;max-width:700px;margin:0 auto;padding:24px}';
    $html .= 'h1{color:#CC0000;font-size:22px;margin:0}h2{font-size:13px;margin-top:18px;border-bottom:1px solid #ddd;padding-bottom:3px}';
    $html .= 'ul{margin:5px 0;padding-left:18px}li{margin:2px 0}table td{padding:3px 10px 3px 0;vertical-align:top}';
    $html .= '.sig{border-top:1px solid #999;width:200px;margin-top:20px;padding-top:4px;display:inline-block}';
    $html .= '.footer{color:#aaa;font-size:10px;text-align:center;margin-top:40px;border-top:1px solid #eee;padding-top:8px}';
    $html .= '</style></head><body>';
    $html .= '<h1>SagaTrail</h1>';
    $html .= '<p style="color:#888;font-size:11px;margin:2px 0 6px">A.i.L. by Koch &nbsp;|&nbsp; info@sagatrail.ch</p>';
    $html .= '<hr style="border-color:#CC0000;border-width:2px;margin:8px 0 14px">';
    $html .= '<h2 style="border:none;font-size:17px">Pilotpartnerschaftsvereinbarung</h2>';
    $html .= '<p><strong>Referenz:</strong> ' . esc_html( $ref ) . ' &nbsp;|&nbsp; <strong>Datum:</strong> ' . esc_html( $datum ) . '</p>';

    $html .= '<h2>Vertragsparteien</h2><table>';
    $html .= '<tr><td><strong>Anbieter:</strong></td><td>A.i.L. by Koch, Mühlemattstrasse 11, 4104 Oberwil BL</td></tr>';
    $html .= '<tr><td><strong>UID:</strong></td><td>CHE-286.962.827 &nbsp;|&nbsp; info@sagatrail.ch</td></tr>';
    $html .= '<tr><td><strong>Partner:</strong></td><td>' . esc_html( $data['verband_name'] ) . '</td></tr>';
    $html .= '<tr><td><strong>Kontakt:</strong></td><td>' . esc_html( $data['kontakt_name'] );
    if ( $data['kontakt_telefon'] ) { $html .= ', ' . esc_html( $data['kontakt_telefon'] ); }
    $html .= '</td></tr>';
    $html .= '<tr><td><strong>E-Mail:</strong></td><td>' . esc_html( $data['email'] ) . '</td></tr>';
    $html .= '<tr><td><strong>Kantone:</strong></td><td>' . esc_html( $data['kantone'] ) . '</td></tr>';
    $html .= '</table>';

    $abschnitte = array(
        '1. Gegenstand und Laufzeit' =>
            '<p>SagaTrail und der oben genannte Tourismusverband vereinbaren eine unentgeltliche Pilotpartnerschaft für die Dauer von 6 Monaten ab Unterzeichnung.</p>',
        '2. Leistungen SagaTrail' =>
            '<ul><li>Kostenlose Premium-Zugänge für Mitarbeitende des Verbands.</li>' .
            '<li>Fertige Marketing-Materialien (Texte, Bilder, QR-Codes).</li>' .
            '<li>Live-Nutzungsdashboard auf Kantonsebene.</li>' .
            '<li>Übernahme der Ansprache lokaler Betriebe fürs Partnerprogramm.</li></ul>',
        '3. Pflichten des Verbands' =>
            '<ul><li>Erwähnung der Partnerschaft in Newsletter oder Social Media beim Start.</li>' .
            '<li>QR-Code oder Link auf der «Wandern»-Seite der Verbandswebsite.</li>' .
            '<li>Vorstellung bei 3–5 lokalen Betrieben.</li></ul>',
        '4. Konditionen' =>
            '<ul><li>Vollständig kostenlos für den Verband.</li>' .
            '<li>Kündigung jederzeit schriftlich per E-Mail.</li>' .
            '<li>Nach 6 Monaten gemeinsame Entscheidung über Weiterführung.</li></ul>',
        '5. Datenschutz &amp; Gerichtsstand' =>
            '<p>DSG/DSGVO-konform. Es gilt Schweizer Recht. Gerichtsstand ist Basel.</p>',
    );
    foreach ( $abschnitte as $titel => $inhalt ) {
        $html .= '<h2>' . $titel . '</h2>' . $inhalt;
    }

    $html .= '<h2>Unterschriften</h2>';
    $html .= '<table style="width:100%;margin-top:14px"><tr valign="bottom">';
    $html .= '<td style="width:45%">' . $sig_tag;
    $html .= '<div class="sig"><strong>Rolf Koch, Inhaber</strong><br><span style="color:#999;font-size:10px">' . esc_html( $datum ) . '</span></div></td>';
    $html .= '<td><div style="height:50px"></div><div class="sig">' . esc_html( $data['verband_name'] ) . '<br><span style="color:#999;font-size:10px">Ort, Datum, Unterschrift</span></div></td>';
    $html .= '</tr></table>';
    $html .= '<div class="footer">SagaTrail – www.sagatrail.ch – ' . esc_html( $ref ) . '</div>';
    $html .= '</body></html>';
    return $html;
}

// ===================================================================
// E-MAIL SENDEN (via wp_mail)
// ===================================================================

function sagatrail_verband_mail_senden( $data, $datum, $ref, $inhalt, $ist_pdf ) {
    $to      = sanitize_email( $data['email'] );
    $subject = mb_encode_mimeheader(
        'SagaTrail Pilotpartnerschaft ' . $ref . ' - Ihr Vertragsangebot',
        'UTF-8', 'B'
    );

    $text  = "Guten Tag " . $data['kontakt_name'] . ",\n\n";
    $text .= "vielen Dank für Ihre Anfrage zur Pilotpartnerschaft mit SagaTrail.\n";
    $text .= "Im Anhang finden Sie den Pilotpartnerschaftsvertrag als " . ( $ist_pdf ? 'PDF' : 'HTML-Dokument' ) . ".\n\n";
    $text .= "Referenz: " . $ref . "\n\n";
    $text .= "Bitte drucken Sie das Dokument aus, unterzeichnen es und senden Sie es\n";
    $text .= "per E-Mail zurück an info@sagatrail.ch.\n\n";
    $text .= "Wir melden uns innerhalb von 2 Werktagen.\n\n";
    $text .= "Freundliche Grüsse\nRolf Koch\nSagaTrail\ninfo@sagatrail.ch";

    $boundary  = 'ST_' . md5( uniqid( '', true ) );
    $ext       = $ist_pdf ? 'pdf' : 'html';
    $mime      = $ist_pdf ? 'application/pdf' : 'text/html';
    $dateiname = 'SagaTrail-Pilotvertrag-' . $ref . '.' . $ext;

    $headers  = 'From: SagaTrail <info@sagatrail.ch>' . "\r\n";
    $headers .= 'Cc: info@sagatrail.ch' . "\r\n";
    $headers .= 'Reply-To: info@sagatrail.ch' . "\r\n";
    $headers .= 'MIME-Version: 1.0' . "\r\n";
    $headers .= 'Content-Type: multipart/mixed; boundary="' . $boundary . '"' . "\r\n";

    $body  = '--' . $boundary . "\r\n";
    $body .= 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
    $body .= 'Content-Transfer-Encoding: 8bit' . "\r\n\r\n";
    $body .= $text . "\r\n";

    $body .= '--' . $boundary . "\r\n";
    $body .= 'Content-Type: ' . $mime . '; name="' . $dateiname . '"' . "\r\n";
    $body .= 'Content-Transfer-Encoding: base64' . "\r\n";
    $body .= 'Content-Disposition: attachment; filename="' . $dateiname . '"' . "\r\n\r\n";
    $body .= chunk_split( base64_encode( $inhalt ) ) . "\r\n";
    $body .= '--' . $boundary . '--';

    $gesendet = wp_mail( $to, $subject, $body, $headers );
    if ( ! $gesendet ) {
        error_log( 'SagaTrail Pilotvertrag-Mail fehlgeschlagen an: ' . $to );
    }
    return $gesendet;
}

add_action( 'sagatrail_verband_anfrage_gespeichert', function( $data, $row_id ) {
    sagatrail_verband_vertrag_senden( $data, $row_id );
}, 10, 2 );
