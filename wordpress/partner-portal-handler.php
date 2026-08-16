<?php
/**
 * SAGATRAIL PARTNER-PORTAL HANDLER  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ausführung: Run Everywhere
 *
 * Behandelt das AJAX-Login-Request des Partner-Portals:
 *  1. Ruft POST /partner/portal/token bei der SagaTrail-API auf
 *  2. Sendet den Magic-Link per E-Mail (wp_mail) an den Partner
 *
 * Konfiguration in wp-config.php:
 *   define('SAGATRAIL_API_BASE', 'https://api.sagatrail.ch');
 *   define('SAGATRAIL_PORTAL_PAGE', 'https://www.sagatrail.ch/partner-portal');
 *
 * Das JavaScript auf der Portal-Seite liest window.stPartnerData.apiBase
 * und window.stPartnerData.portalNonce – diese werden im wp_footer eingebettet.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ===================================================================
// 1. JS-DATEN INS FOOTER EINBETTEN
// ===================================================================

add_action( 'wp_footer', function () {
    $api_base    = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : '';
    $portal_page = defined( 'SAGATRAIL_PORTAL_PAGE' ) ? SAGATRAIL_PORTAL_PAGE : get_permalink();
    ?>
    <script>
    window.stPartnerData = window.stPartnerData || {};
    window.stPartnerData.apiBase     = <?php echo json_encode( $api_base ); ?>;
    window.stPartnerData.ajaxUrl     = <?php echo json_encode( admin_url( 'admin-ajax.php' ) ); ?>;
    window.stPartnerData.portalNonce = <?php echo json_encode( wp_create_nonce( 'spp_portal' ) ); ?>;
    window.stPartnerData.portalPage  = <?php echo json_encode( $portal_page ); ?>;
    </script>
    <?php
}, 5 );

// ===================================================================
// 2. AJAX HANDLER: Token anfordern + Magic-Link per Mail senden
// ===================================================================

add_action( 'wp_ajax_spp_request_token',        'sagatrail_portal_request_token' );
add_action( 'wp_ajax_nopriv_spp_request_token', 'sagatrail_portal_request_token' );

function sagatrail_portal_request_token() {

    // Nonce-Prüfung optional (Public-Endpunkt, SagaTrail-API macht eigene Auth)
    // check_ajax_referer( 'spp_portal', 'nonce', false );

    $email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
    if ( ! is_email( $email ) ) {
        wp_send_json_error( 'Keine gültige E-Mail-Adresse.' );
    }

    $api_base = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : '';
    if ( ! $api_base ) {
        wp_send_json_error( 'API nicht konfiguriert.' );
    }

    // Token bei der SagaTrail-API anfordern
    $response = wp_remote_post( $api_base . '/api/partner/portal/token', array(
        'headers'     => array( 'Content-Type' => 'application/json' ),
        'body'        => wp_json_encode( array( 'email' => $email ) ),
        'timeout'     => 10,
        'data_format' => 'body',
    ) );

    if ( is_wp_error( $response ) ) {
        error_log( 'SagaTrail Portal: API-Fehler – ' . $response->get_error_message() );
        wp_send_json_success(); // Generische Antwort, kein Leak
        return;
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );

    // Kein Partner mit dieser E-Mail → generische Antwort (kein User-Enumeration)
    if ( empty( $body['token'] ) ) {
        wp_send_json_success();
        return;
    }

    // Magic-Link zusammensetzen
    // Magic-Link: Verbände → /api/verband/portal, Partner → WP-Portalseite
    $typ = $body['type'] ?? 'partner';
    if ( $typ === 'verband' ) {
        $api_base_link = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : 'https://api.sagatrail.ch';
        $link = $api_base_link . '/api/verband/portal?token=' . rawurlencode( $body['token'] );
    } else {
        /* portal_url aus dem JS-Request priorisieren (Mehrsprachigkeit) */
        $submitted_portal = isset( $_POST['portal_url'] ) ? esc_url_raw( wp_unslash( $_POST['portal_url'] ) ) : '';
        if ( $submitted_portal && strpos( $submitted_portal, 'sagatrail.ch' ) !== false ) {
            $portal_page = rtrim( $submitted_portal, '/' );
        } elseif ( defined( 'SAGATRAIL_PORTAL_PAGE' ) ) {
            $portal_page = rtrim( SAGATRAIL_PORTAL_PAGE, '/' );
        } else {
            $portal_page = get_permalink( get_page_by_path( 'portal' ) ) ?: 'https://sagatrail.ch/portal';
            $portal_page = rtrim( $portal_page, '/' );
        }
        $link = $portal_page . '?token=' . rawurlencode( $body['token'] );
    }
    // partnerName für Partner, name für Verbände
    $name = $body['partnerName'] ?? $body['name'] ?? 'Partner';

    // ── Sprache aus portal_url ──────────────────────────────────────
    $lang = 'de';
    if ( ! empty( $submitted_portal ) ) {
        if ( strpos( $submitted_portal, '/fr/' ) !== false ) $lang = 'fr';
        elseif ( strpos( $submitted_portal, '/en/' ) !== false ) $lang = 'en';
        elseif ( strpos( $submitted_portal, '/it/' ) !== false ) $lang = 'it';
    }

    $portal_label_map = [
        'de' => [ 'partner' => 'Partner-Portal',   'verband' => 'Verbandsportal' ],
        'fr' => [ 'partner' => 'portail partenaire','verband' => 'portail association' ],
        'en' => [ 'partner' => 'Partner Portal',    'verband' => 'Association Portal' ],
        'it' => [ 'partner' => 'portale partner',   'verband' => 'portale associazione' ],
    ];
    $portal_label = $portal_label_map[ $lang ][ $typ ] ?? 'Partner-Portal';

    $subjects = [
        'de' => 'Ihr SagaTrail Partner-Portal Login',
        'fr' => 'Votre lien de connexion SagaTrail',
        'en' => 'Your SagaTrail Partner Portal Login',
        'it' => 'Il tuo link di accesso SagaTrail',
    ];
    $subject = mb_encode_mimeheader( $subjects[ $lang ], 'UTF-8', 'B' );

    $ablauf_raw = isset( $body['expiresAt'] ) ? strtotime( $body['expiresAt'] ) : 0;
    $ablauf_fmt = $ablauf_raw ? wp_date( 'd.m.Y H:i', $ablauf_raw ) : '';

    // ── HTML-E-Mail ──────────────────────────────────────────────────
    $greeting = [
        'de' => "Guten Tag {$name}",
        'fr' => "Bonjour {$name}",
        'en' => "Hello {$name}",
        'it' => "Buongiorno {$name}",
    ][ $lang ];

    $intro = [
        'de' => "Hier ist Ihr persönlicher Anmeldelink für das SagaTrail {$portal_label}:",
        'fr' => "Voici votre lien de connexion personnel pour le {$portal_label} SagaTrail :",
        'en' => "Here is your personal login link for the SagaTrail {$portal_label}:",
        'it' => "Ecco il suo link di accesso personale per il {$portal_label} SagaTrail:",
    ][ $lang ];

    $btn_label = [
        'de' => 'Zum Portal',
        'fr' => 'Accéder au portail',
        'en' => 'Open portal',
        'it' => 'Apri il portale',
    ][ $lang ];

    $expires_line = '';
    if ( $ablauf_fmt ) {
        $expires_line = [
            'de' => "Der Link ist gültig bis <strong>{$ablauf_fmt} Uhr</strong>.",
            'fr' => "Le lien est valable jusqu'au <strong>{$ablauf_fmt}</strong>.",
            'en' => "The link is valid until <strong>{$ablauf_fmt}</strong>.",
            'it' => "Il link è valido fino alle <strong>{$ablauf_fmt}</strong>.",
        ][ $lang ];
    }

    $body_text = [
        'de' => 'Im Portal können Sie Klickstatistiken einsehen sowie Beschreibung, Angebot und Foto jederzeit selbst aktualisieren.',
        'fr' => 'Dans le portail, vous pouvez consulter vos statistiques et mettre à jour description, offre et photo à tout moment.',
        'en' => 'In the portal you can view click statistics and update your description, offer and photo at any time.',
        'it' => 'Nel portale può consultare le statistiche di clic e aggiornare descrizione, offerta e foto in qualsiasi momento.',
    ][ $lang ];

    $closing = [
        'de' => 'Freundliche Grüsse<br>Das SagaTrail-Team',
        'fr' => 'Cordialement,<br>L\'équipe SagaTrail',
        'en' => 'Kind regards,<br>The SagaTrail Team',
        'it' => 'Cordiali saluti,<br>Il team SagaTrail',
    ][ $lang ];

    $questions = [
        'de' => 'Fragen? Schreiben Sie uns:',
        'fr' => 'Des questions ? Écrivez-nous :',
        'en' => 'Questions? Write to us:',
        'it' => 'Domande? Scriveteci:',
    ][ $lang ];

    $link_esc = esc_url( $link );

    $html = <<<HTML
<!DOCTYPE html>
<html lang="{$lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f3f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f1;padding:32px 16px">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">

      <!-- Header -->
      <tr>
        <td style="background:#CC0000;padding:28px 36px 24px">
          <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:.3px">SagaTrail</div>
          <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:3px">sagatrail.ch</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 36px 8px">
          <p style="margin:0 0 6px;font-size:18px;font-weight:700;color:#1a1a1a">{$greeting}</p>
          <p style="margin:18px 0 24px;font-size:15px;color:#444;line-height:1.6">{$intro}</p>

          <!-- CTA Button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px">
            <tr>
              <td style="background:#CC0000;border-radius:10px">
                <a href="{$link_esc}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:.2px">{$btn_label} →</a>
              </td>
            </tr>
          </table>

          <!-- Expires -->
HTML;

    if ( $expires_line ) {
        $html .= <<<HTML
          <p style="margin:0 0 20px;font-size:13px;color:#888;background:#f7f6f4;border-radius:8px;padding:10px 14px">{$expires_line}</p>
HTML;
    }

    $html .= <<<HTML
          <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.65">{$body_text}</p>
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:0 36px"><hr style="border:none;border-top:1px solid #eeece9;margin:0"></td></tr>

      <!-- Footer -->
      <tr>
        <td style="padding:24px 36px 32px">
          <p style="margin:0 0 10px;font-size:14px;color:#444;line-height:1.6">{$closing}</p>
          <p style="margin:16px 0 0;font-size:12px;color:#aaa">{$questions} <a href="mailto:info@sagatrail.ch" style="color:#CC0000;text-decoration:none">info@sagatrail.ch</a></p>
          <p style="margin:6px 0 0;font-size:11px;color:#ccc">
            <a href="{$link_esc}" style="color:#ccc;word-break:break-all">{$link_esc}</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>
HTML;

    $headers  = 'From: SagaTrail <info@sagatrail.ch>' . "\r\n";
    $headers .= 'Reply-To: info@sagatrail.ch' . "\r\n";
    $headers .= 'Content-Type: text/html; charset=UTF-8' . "\r\n";

    wp_mail( $email, $subject, $html, $headers );

    wp_send_json_success();
}
