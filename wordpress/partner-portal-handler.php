<?php
/**
 * SAGATRAIL PARTNER-PORTAL HANDLER | WPCode PHP-Snippet
 * Typ: PHP Snippet | Ausführung: Run Everywhere
 *
 * Der API-Server erzeugt den Token und versendet den Magic-Link über den
 * zentral konfigurierten SMTP-Versand. WordPress bleibt hier nur der
 * AJAX-Proxy; dadurch hängt der Versand nicht mehr von wp_mail ab.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

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

add_action( 'wp_ajax_spp_request_token',        'sagatrail_portal_request_token' );
add_action( 'wp_ajax_nopriv_spp_request_token', 'sagatrail_portal_request_token' );

function sagatrail_portal_request_token() {
    $email = sanitize_email( wp_unslash( $_POST['email'] ?? '' ) );
    if ( ! is_email( $email ) ) {
        wp_send_json_error( 'Keine gültige E-Mail-Adresse.' );
    }

    $api_base = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : '';
    if ( ! $api_base ) {
        wp_send_json_error( 'API nicht konfiguriert.' );
    }

    $portal_url = isset( $_POST['portal_url'] )
        ? esc_url_raw( wp_unslash( $_POST['portal_url'] ) )
        : '';
    $request_body = array( 'email' => $email );
    if ( $portal_url ) {
        $request_body['portalUrl'] = $portal_url;
    }

    $response = wp_remote_post( $api_base . '/api/partner/portal/token', array(
        'headers'     => array( 'Content-Type' => 'application/json' ),
        'body'        => wp_json_encode( $request_body ),
        'timeout'     => 20,
        'data_format' => 'body',
    ) );

    if ( is_wp_error( $response ) ) {
        error_log( 'SagaTrail Portal: API-Fehler – ' . $response->get_error_message() );
        wp_send_json_error( 'Der Anmeldelink konnte nicht versendet werden. Bitte versuchen Sie es später erneut.' );
    }

    $status_code = wp_remote_retrieve_response_code( $response );
    $body = json_decode( wp_remote_retrieve_body( $response ), true );

    if ( $status_code < 200 || $status_code >= 300 || ! is_array( $body ) ) {
        error_log( 'SagaTrail Portal: Magic-Link konnte nicht versendet werden – HTTP ' . $status_code );
        wp_send_json_error( 'Der Anmeldelink konnte nicht versendet werden. Bitte versuchen Sie es später erneut.' );
    }

    // Nicht registrierte E-Mail-Adressen bleiben absichtlich undurchsichtig.
    wp_send_json_success();
}