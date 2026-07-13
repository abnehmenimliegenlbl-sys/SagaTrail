<?php
/**
 * SAGATRAIL PARTNER-ANFRAGEN  |  WPCode PHP-Snippet
 * Typ: PHP Snippet  |  Ort: Run Everywhere (oder Site-Wide Header)
 *
 * Aufgaben:
 *  1. Tabelle wp_sagatrail_partner_anfragen beim ersten Laden anlegen
 *  2. AJAX-Handler für das Formular (speichert in WordPress-DB)
 *  3. Nonce + ajaxUrl + apiBase per wp_localize_script an JS übergeben
 *
 * Konfiguration:
 *  - SAGATRAIL_API_BASE: URL der SagaTrail-API (ohne trailing Slash)
 *    Beispiel: define('SAGATRAIL_API_BASE', 'https://api.sagatrail.ch');
 *    Wenn leer/nicht definiert, wird kein API-Call gemacht (WP-DB genügt).
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

// ===================================================================
// 1. TABELLE ANLEGEN (einmalig bei Plugin-/Snippet-Aktivierung)
// ===================================================================

function sagatrail_partner_create_table() {
    global $wpdb;
    $table   = $wpdb->prefix . 'sagatrail_partner_anfragen';
    $charset = $wpdb->get_charset_collate();

    $sql = "CREATE TABLE IF NOT EXISTS {$table} (
        id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        betriebs_name  VARCHAR(200)    NOT NULL,
        kategorie      VARCHAR(50)     NOT NULL,
        canton         VARCHAR(30)     NOT NULL,
        beschreibung   TEXT,
        angebot        VARCHAR(500),
        website        VARCHAR(300),
        adresse        VARCHAR(200),
        plz            VARCHAR(10),
        ort            VARCHAR(100),
        kontakt_name   VARCHAR(200)    NOT NULL,
        kontakt_email  VARCHAR(200)    NOT NULL,
        kontakt_telefon VARCHAR(50),
        paket          ENUM('basic','standard','premium') NOT NULL DEFAULT 'standard',
        status         ENUM('neu','in_bearbeitung','abgelehnt','aktiv') NOT NULL DEFAULT 'neu',
        notizen        TEXT,
        api_id         VARCHAR(100),
        created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_status (status),
        KEY idx_canton (canton),
        KEY idx_email  (kontakt_email(80))
    ) {$charset};";

    require_once ABSPATH . 'wp-admin/includes/upgrade.php';
    dbDelta( $sql );
}

// Bei erstem Aufruf anlegen (idempotent dank IF NOT EXISTS + dbDelta)
if ( get_option( 'sagatrail_partner_db_version' ) !== '1.1' ) {
    sagatrail_partner_create_table();
    update_option( 'sagatrail_partner_db_version', '1.1' );
}

// ===================================================================
// 2. JAVASCRIPT-DATEN EINBETTEN (Nonce + URLs)
// ===================================================================

add_action( 'wp_footer', function() {
    // Nur auf der Partner-Seite laden (URL-Slug anpassen falls nötig)
    if ( ! is_page( array( 'partner', 'partner-werden', 'partnerprogramm' ) ) ) {
        return;
    }
    $api_base = defined( 'SAGATRAIL_API_BASE' ) ? rtrim( SAGATRAIL_API_BASE, '/' ) : '';
    ?>
    <script>
    window.stPartnerData = {
        ajaxUrl: <?php echo json_encode( admin_url( 'admin-ajax.php' ) ); ?>,
        nonce:   <?php echo json_encode( wp_create_nonce( 'st_partner_anfrage' ) ); ?>,
        apiBase: <?php echo json_encode( $api_base ); ?>
    };
    </script>
    <?php
}, 5 ); // priority 5: vor dem HTML-Snippet

// ===================================================================
// 3. AJAX-HANDLER  (eingeloggt + nicht eingeloggt)
// ===================================================================

add_action( 'wp_ajax_st_partner_anfrage',        'sagatrail_handle_partner_anfrage' );
add_action( 'wp_ajax_nopriv_st_partner_anfrage', 'sagatrail_handle_partner_anfrage' );

function sagatrail_handle_partner_anfrage() {

    // --- Nonce prüfen ---
    if ( ! check_ajax_referer( 'st_partner_anfrage', 'nonce', false ) ) {
        wp_send_json_error( 'Ungültige Sicherheitstoken. Bitte Seite neu laden.' );
    }

    // --- Felder bereinigen ---
    $fields = array(
        'betriebsName'   => 'betriebs_name',
        'kategorie'      => 'kategorie',
        'canton'         => 'canton',
        'beschreibung'   => 'beschreibung',
        'angebot'        => 'angebot',
        'website'        => 'website',
        'adresse'        => 'adresse',
        'plz'            => 'plz',
        'ort'            => 'ort',
        'kontaktName'    => 'kontakt_name',
        'kontaktEmail'   => 'kontakt_email',
        'kontaktTelefon' => 'kontakt_telefon',
        'paket'          => 'paket',
    );

    $data = array();
    foreach ( $fields as $post_key => $db_col ) {
        $val = isset( $_POST[ $post_key ] ) ? sanitize_text_field( wp_unslash( $_POST[ $post_key ] ) ) : '';
        $data[ $db_col ] = $val;
    }

    // Textarea-Felder mit Zeilenumbrüchen
    foreach ( array( 'beschreibung' ) as $k ) {
        if ( isset( $_POST[ $k ] ) ) {
            $data[ $k ] = sanitize_textarea_field( wp_unslash( $_POST[ $k ] ) );
        }
    }

    // URL-Feld validieren
    if ( ! empty( $data['website'] ) ) {
        $data['website'] = esc_url_raw( $data['website'] );
        if ( ! filter_var( $data['website'], FILTER_VALIDATE_URL ) ) {
            $data['website'] = '';
        }
    }

    // E-Mail validieren
    $email = sanitize_email( $data['kontakt_email'] );
    if ( empty( $email ) ) {
        wp_send_json_error( 'Bitte eine gültige E-Mail-Adresse angeben.' );
    }
    $data['kontakt_email'] = $email;

    // Pflichtfelder prüfen
    foreach ( array( 'betriebs_name', 'kategorie', 'canton', 'ort', 'kontakt_name', 'kontakt_email' ) as $req ) {
        if ( empty( $data[ $req ] ) ) {
            wp_send_json_error( 'Pflichtfeld fehlt: ' . $req );
        }
    }

    // Kategorie-Whitelist
    $allowed_kat = array( 'restaurant', 'cafe', 'souvenir', 'uebernachtung', 'sonstiges' );
    if ( ! in_array( $data['kategorie'], $allowed_kat, true ) ) {
        wp_send_json_error( 'Ungültige Kategorie.' );
    }

    // Paket-Whitelist
    $allowed_paket = array( 'basic', 'standard', 'premium' );
    if ( empty( $data['paket'] ) || ! in_array( $data['paket'], $allowed_paket, true ) ) {
        $data['paket'] = 'standard';
    }

    // --- In WordPress-DB speichern ---
    global $wpdb;
    $table = $wpdb->prefix . 'sagatrail_partner_anfragen';

    $inserted = $wpdb->insert( $table, $data );

    if ( $inserted === false ) {
        error_log( 'SagaTrail Partner-Anfrage DB-Fehler: ' . $wpdb->last_error );
        wp_send_json_error( 'Datenbankfehler. Bitte versuchen Sie es erneut.' );
    }

    $row_id = $wpdb->insert_id;

    // --- Optional: E-Mail-Benachrichtigung an Admin ---
    sagatrail_partner_notify_admin( $data, $row_id );

    // --- Optional: Weiterleitung an SagaTrail-API ---
    $api_id = sagatrail_partner_forward_to_api( $data );
    if ( $api_id ) {
        $wpdb->update( $table, array( 'api_id' => $api_id ), array( 'id' => $row_id ) );
    }

    wp_send_json_success( array(
        'id'      => $row_id,
        'message' => 'Anfrage erfolgreich gespeichert.',
    ) );
}

// ===================================================================
// 4. ADMIN-E-MAIL VERSENDEN
// ===================================================================

function sagatrail_partner_notify_admin( $data, $row_id ) {
    $to      = get_option( 'admin_email' );
    $to_cc   = 'info@sagatrail.ch';
    $subject = '[SagaTrail] Neue Partner-Anfrage #' . $row_id . ': ' . $data['betriebs_name'];

    $body  = "Neue Partnerschaftsanfrage eingegangen:\n\n";
    $body .= "ID:            #" . $row_id . "\n";
    $body .= "Betrieb:       " . $data['betriebs_name'] . "\n";
    $body .= "Kategorie:     " . $data['kategorie'] . "\n";
    $body .= "Kanton:        " . $data['canton'] . "\n";
    $body .= "Ort:           " . $data['ort'] . " " . $data['plz'] . "\n";
    $body .= "Adresse:       " . ( $data['adresse'] ?: '–' ) . "\n";
    $body .= "Website:       " . ( $data['website'] ?: '–' ) . "\n";
    $body .= "Paket:         " . strtoupper( $data['paket'] ) . "\n\n";
    $body .= "Kontaktperson: " . $data['kontakt_name'] . "\n";
    $body .= "E-Mail:        " . $data['kontakt_email'] . "\n";
    $body .= "Telefon:       " . ( $data['kontakt_telefon'] ?: '–' ) . "\n\n";
    $body .= "Beschreibung:\n" . ( $data['beschreibung'] ?: '–' ) . "\n\n";
    $body .= "Angebot:\n" . ( $data['angebot'] ?: '–' ) . "\n\n";
    $body .= "---\n";
    $body .= "WordPress-Admin: " . admin_url( 'admin.php?page=sagatrail-partner-anfragen' ) . "\n";

    $headers = array(
        'Content-Type: text/plain; charset=UTF-8',
        'From: SagaTrail Website <' . get_option( 'admin_email' ) . '>',
        'Cc: ' . $to_cc,
        'Reply-To: ' . $data['kontakt_email'],
    );

    wp_mail( $to, $subject, $body, $headers );
}

// ===================================================================
// 5. WEITERLEITUNG AN SAGATRAIL-API (fire-and-forget, server-side)
// ===================================================================

function sagatrail_partner_forward_to_api( $data ) {
    if ( ! defined( 'SAGATRAIL_API_BASE' ) || empty( SAGATRAIL_API_BASE ) ) {
        return null;
    }

    $payload = array(
        'betriebsName'   => $data['betriebs_name'],
        'kategorie'      => $data['kategorie'],
        'canton'         => $data['canton'],
        'beschreibung'   => $data['beschreibung'] ?: null,
        'angebot'        => $data['angebot'] ?: null,
        'website'        => $data['website'] ?: null,
        'adresse'        => $data['adresse'] ?: null,
        'plz'            => $data['plz'] ?: null,
        'ort'            => $data['ort'],
        'kontaktName'    => $data['kontakt_name'],
        'kontaktEmail'   => $data['kontakt_email'],
        'kontaktTelefon' => $data['kontakt_telefon'] ?: null,
        'paket'          => $data['paket'],
    );

    $response = wp_remote_post(
        rtrim( SAGATRAIL_API_BASE, '/' ) . '/partner/anfrage',
        array(
            'timeout'     => 8,
            'redirection' => 0,
            'headers'     => array( 'Content-Type' => 'application/json' ),
            'body'        => wp_json_encode( $payload ),
            'blocking'    => true,
        )
    );

    if ( is_wp_error( $response ) ) {
        error_log( 'SagaTrail API-Fehler: ' . $response->get_error_message() );
        return null;
    }

    $status = wp_remote_retrieve_response_code( $response );
    if ( $status !== 201 ) {
        error_log( 'SagaTrail API HTTP ' . $status . ': ' . wp_remote_retrieve_body( $response ) );
        return null;
    }

    $body = json_decode( wp_remote_retrieve_body( $response ), true );
    return isset( $body['id'] ) ? sanitize_text_field( $body['id'] ) : null;
}

// ===================================================================
// 6. EINFACHE ADMIN-ÜBERSICHT (wp-admin > SagaTrail > Partner-Anfragen)
// ===================================================================

add_action( 'admin_menu', function() {
    add_menu_page(
        'SagaTrail Partner',
        'SagaTrail',
        'manage_options',
        'sagatrail-partner-anfragen',
        'sagatrail_partner_admin_page',
        'dashicons-location-alt',
        58
    );
} );

function sagatrail_partner_admin_page() {
    if ( ! current_user_can( 'manage_options' ) ) { wp_die( 'Keine Berechtigung.' ); }

    global $wpdb;
    $table = $wpdb->prefix . 'sagatrail_partner_anfragen';

    // Status-Update
    if ( isset( $_POST['st_action'], $_POST['st_nonce'], $_POST['st_id'] )
         && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['st_nonce'] ) ), 'st_admin_action' )
         && current_user_can( 'manage_options' ) ) {

        $allowed_status = array( 'neu', 'in_bearbeitung', 'abgelehnt', 'aktiv' );
        $new_status = sanitize_text_field( wp_unslash( $_POST['st_action'] ) );
        $id = absint( $_POST['st_id'] );
        if ( in_array( $new_status, $allowed_status, true ) && $id > 0 ) {
            $wpdb->update( $table, array( 'status' => $new_status ), array( 'id' => $id ) );
        }
    }

    // Notiz speichern
    if ( isset( $_POST['st_notiz'], $_POST['st_notiz_nonce'], $_POST['st_id'] )
         && wp_verify_nonce( sanitize_text_field( wp_unslash( $_POST['st_notiz_nonce'] ) ), 'st_admin_action' )
         && current_user_can( 'manage_options' ) ) {
        $id    = absint( $_POST['st_id'] );
        $notiz = sanitize_textarea_field( wp_unslash( $_POST['st_notiz'] ) );
        if ( $id > 0 ) {
            $wpdb->update( $table, array( 'notizen' => $notiz ), array( 'id' => $id ) );
        }
    }

    // Filter
    $filter_status = isset( $_GET['st_status'] ) ? sanitize_text_field( wp_unslash( $_GET['st_status'] ) ) : 'neu';
    $where = $filter_status !== 'alle' ? $wpdb->prepare( 'WHERE status = %s', $filter_status ) : '';
    $rows  = $wpdb->get_results( "SELECT * FROM {$table} {$where} ORDER BY created_at DESC LIMIT 100" );

    $status_labels = array(
        'neu'           => '🔵 Neu',
        'in_bearbeitung'=> '🟡 In Bearbeitung',
        'abgelehnt'     => '🔴 Abgelehnt',
        'aktiv'         => '🟢 Aktiv',
    );
    $all_statuses = array_keys( $status_labels );
    ?>
    <div class="wrap">
    <h1>SagaTrail Partner-Anfragen</h1>

    <ul class="subsubsub">
        <?php foreach ( array_merge( array( 'alle' => '📋 Alle' ), $status_labels ) as $slug => $label ) : ?>
            <li>
                <a href="<?php echo esc_url( admin_url( 'admin.php?page=sagatrail-partner-anfragen&st_status=' . $slug ) ); ?>"
                   <?php if ( $filter_status === $slug ) echo 'style="font-weight:bold;"'; ?>>
                    <?php echo esc_html( $label ); ?>
                </a> |
            </li>
        <?php endforeach; ?>
    </ul>
    <br class="clear">

    <?php if ( empty( $rows ) ) : ?>
        <p>Keine Anfragen vorhanden.</p>
    <?php else : ?>
    <table class="wp-list-table widefat fixed striped">
    <thead>
        <tr>
            <th style="width:40px">#</th>
            <th>Betrieb</th>
            <th>Kat.</th>
            <th>Kanton</th>
            <th>Paket</th>
            <th>Kontakt</th>
            <th>Status</th>
            <th>Datum</th>
            <th>Aktionen</th>
        </tr>
    </thead>
    <tbody>
    <?php foreach ( $rows as $row ) : ?>
        <tr>
            <td><?php echo absint( $row->id ); ?></td>
            <td>
                <strong><?php echo esc_html( $row->betriebs_name ); ?></strong><br>
                <?php if ( $row->ort ) echo '<small>' . esc_html( $row->ort ) . '</small>'; ?>
            </td>
            <td><?php echo esc_html( $row->kategorie ); ?></td>
            <td><?php echo esc_html( $row->canton ); ?></td>
            <td><?php echo esc_html( strtoupper( $row->paket ) ); ?></td>
            <td>
                <?php echo esc_html( $row->kontakt_name ); ?><br>
                <a href="mailto:<?php echo esc_attr( $row->kontakt_email ); ?>"><?php echo esc_html( $row->kontakt_email ); ?></a><br>
                <?php if ( $row->kontakt_telefon ) echo '<small>' . esc_html( $row->kontakt_telefon ) . '</small>'; ?>
            </td>
            <td><?php echo isset( $status_labels[ $row->status ] ) ? esc_html( $status_labels[ $row->status ] ) : esc_html( $row->status ); ?></td>
            <td><small><?php echo esc_html( date_i18n( 'd.m.Y H:i', strtotime( $row->created_at ) ) ); ?></small></td>
            <td>
                <form method="post" style="display:inline;">
                    <?php wp_nonce_field( 'st_admin_action', 'st_nonce' ); ?>
                    <input type="hidden" name="st_id" value="<?php echo absint( $row->id ); ?>">
                    <select name="st_action" style="font-size:12px;">
                        <?php foreach ( $status_labels as $slug => $label ) : ?>
                            <option value="<?php echo esc_attr( $slug ); ?>"
                                <?php selected( $row->status, $slug ); ?>>
                                <?php echo esc_html( $label ); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <button type="submit" class="button button-small">Setzen</button>
                </form>
                <details style="margin-top:4px;">
                    <summary style="cursor:pointer;font-size:12px;">Details / Notiz</summary>
                    <div style="padding:8px 0;font-size:12px;">
                        <?php if ( $row->angebot )      echo '<b>Angebot:</b> ' . esc_html( $row->angebot ) . '<br>'; ?>
                        <?php if ( $row->website )      echo '<b>Website:</b> <a href="' . esc_url( $row->website ) . '" target="_blank">' . esc_html( $row->website ) . '</a><br>'; ?>
                        <?php if ( $row->beschreibung ) echo '<b>Beschreibung:</b> ' . esc_html( $row->beschreibung ) . '<br>'; ?>
                        <?php if ( $row->api_id )       echo '<b>API-ID:</b> ' . esc_html( $row->api_id ) . '<br>'; ?>
                        <form method="post" style="margin-top:6px;">
                            <?php wp_nonce_field( 'st_admin_action', 'st_notiz_nonce' ); ?>
                            <input type="hidden" name="st_id" value="<?php echo absint( $row->id ); ?>">
                            <textarea name="st_notiz" rows="2" style="width:100%;font-size:12px;"><?php echo esc_textarea( $row->notizen ); ?></textarea><br>
                            <button type="submit" class="button button-small">Notiz speichern</button>
                        </form>
                    </div>
                </details>
            </td>
        </tr>
    <?php endforeach; ?>
    </tbody>
    </table>
    <?php endif; ?>
    </div>
    <?php
}
