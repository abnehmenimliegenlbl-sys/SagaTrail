<?php
/**
 * SAGATRAIL TOURISMUSVERBAND-ANFRAGEN  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ort: Run Everywhere
 *
 * 1. Tabelle wp_sagatrail_verband_anfragen anlegen (einmalig)
 * 2. AJAX-Handler für das Formular (speichert in WordPress-DB)
 * 3. Vertrag als PDF per E-Mail senden (via wp_mail + FPDF)
 * 4. Nonce + ajaxUrl per wp_localize_script an JS übergeben
 *
 * Benötigt verband-contract.php im gleichen WPCode-Setup (oder als eigenes Snippet).
 * Unterschrift-PNG: wp-content/uploads/sagatrail/signature.png
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ===================================================================
// 1. TABELLE ANLEGEN
// ===================================================================

function sagatrail_verband_create_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'sagatrail_verband_anfragen';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        verband_name    VARCHAR(200)    NOT NULL,
        email           VARCHAR(200)    NOT NULL,
        kontakt_name    VARCHAR(200)    NOT NULL,
        kontakt_telefon VARCHAR(50),
        kantone         TEXT            NOT NULL,
        status          ENUM('neu','in_bearbeitung','aktiv','abgelehnt') NOT NULL DEFAULT 'neu',
        contract_sent   TINYINT(1)      NOT NULL DEFAULT 0,
        notizen         TEXT,
        api_id          VARCHAR(100),
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_status (status),
        KEY idx_email  (email(80))
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}

if ( get_option( 'sagatrail_verband_db_version' ) !== '1.0' ) {
    sagatrail_verband_create_table();
    update_option( 'sagatrail_verband_db_version', '1.0' );
}

// ===================================================================
// 2. JS-DATEN EINBETTEN (Nonce + ajaxUrl)
// ===================================================================

add_action( 'wp_footer', function() {
    if ( ! is_page( array( 'tourismus-verbaende', 'tourismusverband', 'verband', 'verband-partner', 'pilotpartnerschaft' ) ) ) {
        return;
    }
    $api_base = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : '';
    ?>
    <script>
    window.stVerbandData = {
        ajaxUrl: <?php echo json_encode( admin_url( 'admin-ajax.php' ) ); ?>,
        nonce:   <?php echo json_encode( wp_create_nonce( 'st_verband_anfrage' ) ); ?>,
        apiBase: <?php echo json_encode( $api_base ); ?>
    };
    </script>
    <?php
}, 5 );

// ===================================================================
// 3. AJAX-HANDLER
// ===================================================================

add_action( 'wp_ajax_st_verband_anfrage',        'sagatrail_handle_verband_anfrage' );
add_action( 'wp_ajax_nopriv_st_verband_anfrage', 'sagatrail_handle_verband_anfrage' );

function sagatrail_handle_verband_anfrage() {

    if ( ! check_ajax_referer( 'st_verband_anfrage', 'nonce', false ) ) {
        wp_send_json_error( 'Ungültiger Sicherheitstoken. Bitte Seite neu laden.' );
    }

    // --- Felder bereinigen ---
    $verband_name    = sanitize_text_field( wp_unslash( $_POST['verbandName']    ?? '' ) );
    $email           = sanitize_email( wp_unslash( $_POST['email']              ?? '' ) );
    $kontakt_name    = sanitize_text_field( wp_unslash( $_POST['kontaktName']    ?? '' ) );
    $kontakt_telefon = sanitize_text_field( wp_unslash( $_POST['kontaktTelefon'] ?? '' ) );
    $kantone_raw     = wp_unslash( $_POST['kantone'] ?? '' );

    // Kantone: kann "alle" (String) oder JSON-Array sein
    if ( $kantone_raw === 'alle' ) {
        $kantone_str = 'alle';
    } else {
        $arr = json_decode( $kantone_raw, true );
        if ( ! is_array( $arr ) || empty( $arr ) ) {
            wp_send_json_error( 'Bitte mindestens einen Kanton auswählen.' );
        }
        $allowed = array(
            'Aargau','Appenzell Ausserrhoden','Appenzell Innerrhoden',
            'Basel-Landschaft','Basel-Stadt','Bern','Freiburg','Genf',
            'Glarus','Graubünden','Jura','Luzern','Neuenburg','Nidwalden',
            'Obwalden','Schaffhausen','Schwyz','Solothurn','St. Gallen',
            'Tessin','Thurgau','Uri','Waadt','Wallis','Zug','Zürich',
        );
        $arr = array_filter( $arr, fn( $k ) => in_array( $k, $allowed, true ) );
        $kantone_str = implode( ', ', array_map( 'sanitize_text_field', $arr ) );
    }

    // Pflichtfelder
    if ( empty( $verband_name ) || empty( $email ) || empty( $kontakt_name ) || empty( $kantone_str ) ) {
        wp_send_json_error( 'Pflichtfelder fehlen.' );
    }
    if ( ! is_email( $email ) ) {
        wp_send_json_error( 'Ungültige E-Mail-Adresse.' );
    }

    // --- In WordPress-DB speichern ---
    global $wpdb;
    $table = $wpdb->prefix . 'sagatrail_verband_anfragen';

    $inserted = $wpdb->insert( $table, array(
        'verband_name'    => $verband_name,
        'email'           => $email,
        'kontakt_name'    => $kontakt_name,
        'kontakt_telefon' => $kontakt_telefon ?: null,
        'kantone'         => $kantone_str,
        'status'          => 'neu',
    ) );

    if ( $inserted === false ) {
        error_log( 'SagaTrail Verband-Anfrage DB-Fehler: ' . $wpdb->last_error );
        wp_send_json_error( 'Datenbankfehler. Bitte versuchen Sie es erneut.' );
    }

    $row_id = $wpdb->insert_id;

    // --- Vertrag per PDF senden ---
    $data = array(
        'verband_name'    => $verband_name,
        'email'           => $email,
        'kontakt_name'    => $kontakt_name,
        'kontakt_telefon' => $kontakt_telefon,
        'kantone'         => $kantone_str,
    );

    do_action( 'sagatrail_verband_anfrage_gespeichert', $data, $row_id );

    // --- Optional: Forward an SagaTrail-API ---
    $api_id = sagatrail_verband_forward_to_api( $data );
    if ( $api_id ) {
        $wpdb->update( $table, array( 'api_id' => $api_id ), array( 'id' => $row_id ) );
    }

    wp_send_json_success( array( 'id' => $row_id, 'message' => 'Anfrage gespeichert.' ) );
}

// ===================================================================
// 4. API-FORWARD (fire-and-forget, für SagaTrail-interne DB)
// ===================================================================

function sagatrail_verband_forward_to_api( $data ) {
    if ( ! defined( 'SAGATRAIL_API_BASE' ) || empty( SAGATRAIL_API_BASE ) ) {
        return null;
    }

    $payload = array(
        'verbandName'    => $data['verband_name'],
        'email'          => $data['email'],
        'kontaktName'    => $data['kontakt_name'],
        'kontaktTelefon' => $data['kontakt_telefon'] ?: null,
        'kantone'        => $data['kantone'],
    );

    $response = wp_remote_post(
        rtrim( SAGATRAIL_API_BASE, '/' ) . '/verband/anfrage',
        array(
            'timeout'  => 8,
            'headers'  => array( 'Content-Type' => 'application/json' ),
            'body'     => wp_json_encode( $payload ),
            'blocking' => true,
        )
    );

    if ( is_wp_error( $response ) ) {
        error_log( 'SagaTrail Verband API-Fehler: ' . $response->get_error_message() );
        return null;
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    return isset( $body['id'] ) ? sanitize_text_field( $body['id'] ) : null;
}

// ===================================================================
// 5. HOOK: verband-contract.php ruft sagatrail_verband_vertrag_senden auf
// ===================================================================

add_action( 'sagatrail_verband_anfrage_gespeichert', function( $data, $row_id ) {
    if ( function_exists( 'sagatrail_verband_vertrag_senden' ) ) {
        sagatrail_verband_vertrag_senden( $data, $row_id );
    } else {
        // Fallback: nur Admin-Benachrichtigung
        $subject = '[SagaTrail] Neue Verband-Anfrage #' . $row_id . ': ' . $data['verband_name'];
        $body  = "Neue Tourismusverband-Anfrage:\n\n";
        $body .= "Verband:  " . $data['verband_name'] . "\n";
        $body .= "E-Mail:   " . $data['email'] . "\n";
        $body .= "Kontakt:  " . $data['kontakt_name'] . "\n";
        $body .= "Telefon:  " . ( $data['kontakt_telefon'] ?: '–' ) . "\n";
        $body .= "Kantone:  " . $data['kantone'] . "\n";
        wp_mail( 'info@sagatrail.ch', $subject, $body );
    }
}, 10, 2 );

// ===================================================================
// 6. ADMIN-ÜBERSICHT (wp-admin > SagaTrail > Verband-Anfragen)
// ===================================================================

add_action( 'admin_menu', function() {
    // Nur anlegen wenn noch kein Menü existiert
    global $menu;
    $exists = false;
    foreach ( (array) $menu as $item ) {
        if ( isset( $item[2] ) && $item[2] === 'sagatrail-partner-anfragen' ) {
            $exists = true; break;
        }
    }
    if ( ! $exists ) {
        add_menu_page(
            'SagaTrail', 'SagaTrail', 'manage_options',
            'sagatrail-partner-anfragen',
            '__return_empty_string',
            'dashicons-location-alt', 58
        );
    }
    add_submenu_page(
        'sagatrail-partner-anfragen',
        'Verband-Anfragen', 'Verband-Anfragen', 'manage_options',
        'sagatrail-verband-anfragen',
        'sagatrail_verband_admin_page'
    );
} );

function sagatrail_verband_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Keine Berechtigung.' ); }

    global $wpdb;
    $table = $wpdb->prefix . 'sagatrail_verband_anfragen';

    // Status-Update
    if ( isset( $_POST['st_action'], $_POST['st_nonce'], $_POST['st_id'] )
         && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['st_nonce'] ) ), 'st_verband_admin' )
         && current_user_can( 'manage_options' ) ) {

        $allowed = array( 'neu', 'in_bearbeitung', 'aktiv', 'abgelehnt' );
        $new_status = sanitize_text_field( wp_unslash( $_POST['st_action'] ) );
        $id = absint( $_POST['st_id'] );
        if ( in_array( $new_status, $allowed, true ) && $id > 0 ) {
            $wpdb->update( $table, array( 'status' => $new_status ), array( 'id' => $id ) );
        }
    }

    $rows = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 100" );
    $status_labels = array(
        'neu'            => '🔵 Neu',
        'in_bearbeitung' => '🟡 In Bearbeitung',
        'aktiv'          => '🟢 Aktiv',
        'abgelehnt'      => '🔴 Abgelehnt',
    );
    ?>
    <div class="wrap">
    <h1>SagaTrail Verband-Anfragen</h1>
    <?php if ( empty( $rows ) ) : ?>
        <p>Noch keine Anfragen.</p>
    <?php else : ?>
    <table class="wp-list-table widefat fixed striped">
    <thead><tr>
        <th style="width:40px">#</th>
        <th>Verband</th><th>E-Mail</th><th>Kontakt</th>
        <th>Kantone</th><th>Vertrag</th><th>Status</th><th>Datum</th><th>Aktion</th>
    </tr></thead>
    <tbody>
    <?php foreach ( $rows as $row ) : ?>
    <tr>
        <td><?php echo absint( $row->id ); ?></td>
        <td><strong><?php echo esc_html( $row->verband_name ); ?></strong></td>
        <td><a href="mailto:<?php echo esc_attr( $row->email ); ?>"><?php echo esc_html( $row->email ); ?></a></td>
        <td><?php echo esc_html( $row->kontakt_name );
             if ( $row->kontakt_telefon ) echo '<br><small>' . esc_html( $row->kontakt_telefon ) . '</small>'; ?></td>
        <td style="font-size:11px"><?php echo esc_html( $row->kantone ); ?></td>
        <td><?php echo $row->contract_sent ? '✅ Gesendet' : '—'; ?></td>
        <td><?php echo isset( $status_labels[ $row->status ] ) ? esc_html( $status_labels[ $row->status ] ) : esc_html( $row->status ); ?></td>
        <td><small><?php echo esc_html( date_i18n( 'd.m.Y H:i', strtotime( $row->created_at ) ) ); ?></small></td>
        <td>
            <form method="post" style="display:inline">
                <?php wp_nonce_field( 'st_verband_admin', 'st_nonce' ); ?>
                <input type="hidden" name="st_id" value="<?php echo absint( $row->id ); ?>">
                <select name="st_action" style="font-size:12px">
                    <?php foreach ( $status_labels as $slug => $label ) : ?>
                        <option value="<?php echo esc_attr( $slug ); ?>" <?php selected( $row->status, $slug ); ?>>
                            <?php echo esc_html( $label ); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
                <button type="submit" class="button button-small">Setzen</button>
            </form>
        </td>
    </tr>
    <?php endforeach; ?>
    </tbody>
    </table>
    <?php endif; ?>
    </div>
    <?php
}
