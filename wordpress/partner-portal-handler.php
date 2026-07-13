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
    if ( ! is_page( array( 'partner-portal', 'partnerprofil', 'mein-partner-profil' ) ) ) {
        return;
    }
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

    if ( ! check_ajax_referer( 'spp_portal', 'nonce', false ) ) {
        wp_send_json_error( 'Ungültiger Sicherheitstoken.' );
    }

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
    $portal_page = defined( 'SAGATRAIL_PORTAL_PAGE' )
        ? rtrim( SAGATRAIL_PORTAL_PAGE, '/' )
        : get_permalink( get_page_by_path( 'partner-portal' ) );
    $link = $portal_page . '?token=' . rawurlencode( $body['token'] );
    $name = $body['partnerName'] ?? 'Partner';

    // E-Mail senden
    $subject  = 'Ihr SagaTrail Partner-Portal Login';
    $ablauf   = isset( $body['expiresAt'] )
        ? wp_date( 'd.m.Y H:i', strtotime( $body['expiresAt'] ) )
        : '';
    $text     = "Guten Tag {$name},\n\n";
    $text    .= "hier ist Ihr persönlicher Anmeldelink für das SagaTrail Partner-Portal:\n\n";
    $text    .= $link . "\n\n";
    $text    .= ( $ablauf ? "Der Link ist gültig bis: {$ablauf} Uhr\n\n" : '' );
    $text    .= "Im Portal können Sie Ihre Klickstatistiken einsehen und Beschreibung,\n";
    $text    .= "Angebot sowie Foto-URL jederzeit selbst aktualisieren.\n\n";
    $text    .= "Bei Fragen steht Ihnen unser Team gerne zur Verfügung:\n";
    $text    .= "info@sagatrail.ch | www.sagatrail.ch\n\n";
    $text    .= "Freundliche Grüsse\nDas SagaTrail-Team";

    $headers  = 'From: SagaTrail <info@sagatrail.ch>' . "\r\n";
    $headers .= 'Reply-To: info@sagatrail.ch' . "\r\n";

    wp_mail( $email, $subject, $text, $headers );

    wp_send_json_success();
}
