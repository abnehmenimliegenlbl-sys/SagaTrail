<?php
/**
 * SagaTrail Partner-Leads Mailer
 * ================================
 * Dieses Snippet muss in WPCode als «Always Run» gespeichert werden.
 *
 * Es stellt zwei WP-AJAX-Aktionen bereit:
 *   1. sagatrail_get_leads   – gibt Leads aus sagatrail_partner_leads zurück (JSON)
 *   2. sagatrail_leads_meta  – Distinct-Werte für Filter-Dropdowns
 *
 * Tabelle sagatrail_partner_leads (bereits vorhanden, KEIN wp_-Prefix):
 *   id, name, email, kanton, sprache, route, typ, adresse, telefon, website, created_at
 *
 * Authentifizierung: HTTP-Body-Parameter hook_secret muss mit SAGATRAIL_HOOK_SECRET übereinstimmen.
 */

// Fixer Tabellenname – kein $wpdb->prefix, da die Tabelle ohne WP-Prefix existiert.
define( 'SAGATRAIL_LEADS_TABLE', 'sagatrail_partner_leads' );

// ── Hilfsfunktion: Secret prüfen ─────────────────────────────────────────────
function sagatrail_leads_check_secret() {
    $expected = defined( 'SAGATRAIL_HOOK_SECRET' ) ? SAGATRAIL_HOOK_SECRET : '';
    $given    = isset( $_POST['hook_secret'] ) ? sanitize_text_field( $_POST['hook_secret'] ) : '';
    if ( ! $expected || ! hash_equals( $expected, $given ) ) {
        wp_send_json_error( 'Unauthorized', 403 );
        exit;
    }
}

// ── AJAX: Leads laden ─────────────────────────────────────────────────────────
add_action( 'wp_ajax_nopriv_sagatrail_get_leads', 'sagatrail_ajax_get_leads' );
add_action( 'wp_ajax_sagatrail_get_leads',        'sagatrail_ajax_get_leads' );

function sagatrail_ajax_get_leads() {
    sagatrail_leads_check_secret();

    global $wpdb;
    $table = SAGATRAIL_LEADS_TABLE;

    $where  = [];
    $params = [];

    $typ     = isset( $_POST['typ'] )     ? sanitize_text_field( $_POST['typ'] )     : '';
    $kanton  = isset( $_POST['kanton'] )  ? sanitize_text_field( $_POST['kanton'] )  : '';
    $sprache = isset( $_POST['sprache'] ) ? sanitize_text_field( $_POST['sprache'] ) : '';

    if ( $typ )     { $where[] = 'typ = %s';     $params[] = $typ; }
    if ( $kanton )  { $where[] = 'kanton = %s';  $params[] = $kanton; }
    if ( $sprache ) { $where[] = 'sprache = %s'; $params[] = $sprache; }

    // Nur Einträge mit E-Mail-Adresse
    $where[] = "email != ''";

    $sql = "SELECT id, name, email, kanton, sprache, route, typ, adresse, telefon, website
            FROM {$table}";
    if ( $where ) {
        $sql .= ' WHERE ' . implode( ' AND ', $where );
    }
    $sql .= ' ORDER BY kanton, name LIMIT 5000';

    if ( $params ) {
        $rows = $wpdb->get_results( $wpdb->prepare( $sql, $params ) );
    } else {
        $rows = $wpdb->get_results( $sql );
    }

    // Felder als korrekte Typen zurückgeben
    $data = array_map( function( $r ) {
        return [
            'name'    => (string) $r->name,
            'email'   => (string) $r->email,
            'kanton'  => (string) $r->kanton,
            'sprache' => (string) $r->sprache,
            'route'   => (string) $r->route,
            'typ'     => (string) $r->typ,
            'adresse' => (string) $r->adresse,
            'telefon' => (string) $r->telefon,
            'website' => (string) $r->website,
        ];
    }, $rows ?: [] );

    wp_send_json_success( $data );
}

// ── AJAX: Filter-Metadaten (Typen, Kantone, Sprachen für Dropdowns) ───────────
add_action( 'wp_ajax_nopriv_sagatrail_leads_meta', 'sagatrail_ajax_leads_meta' );
add_action( 'wp_ajax_sagatrail_leads_meta',        'sagatrail_ajax_leads_meta' );

function sagatrail_ajax_leads_meta() {
    sagatrail_leads_check_secret();

    global $wpdb;
    $table = SAGATRAIL_LEADS_TABLE;

    $typen    = $wpdb->get_col( "SELECT DISTINCT typ     FROM {$table} WHERE typ    != '' ORDER BY typ" );
    $kantone  = $wpdb->get_col( "SELECT DISTINCT kanton  FROM {$table} WHERE kanton != '' ORDER BY kanton" );
    $sprachen = $wpdb->get_col( "SELECT DISTINCT sprache FROM {$table} WHERE sprache!= '' ORDER BY sprache" );
    $total    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE email != ''" );

    wp_send_json_success( compact( 'typen', 'kantone', 'sprachen', 'total' ) );
}

// ── AJAX: Organisationen laden ────────────────────────────────────────────────
add_action( 'wp_ajax_nopriv_sagatrail_get_organisationen', 'sagatrail_ajax_get_organisationen' );
add_action( 'wp_ajax_sagatrail_get_organisationen',        'sagatrail_ajax_get_organisationen' );

function sagatrail_ajax_get_organisationen() {
    sagatrail_leads_check_secret();

    global $wpdb;
    $table = 'organisationen';

    $where  = [ "email IS NOT NULL AND email != ''" ];
    $params = [];

    $kategorie = isset( $_POST['kategorie'] ) ? sanitize_text_field( $_POST['kategorie'] ) : '';
    $typ       = isset( $_POST['typ'] )       ? sanitize_text_field( $_POST['typ'] )       : '';
    $kanton    = isset( $_POST['kanton'] )    ? sanitize_text_field( $_POST['kanton'] )    : '';
    $sprache   = isset( $_POST['sprache'] )   ? strtoupper( sanitize_text_field( $_POST['sprache'] ) ) : '';

    if ( $kategorie ) { $where[] = 'kategorie = %s'; $params[] = $kategorie; }
    if ( $typ )       { $where[] = 'typ = %s';       $params[] = $typ; }
    // kantone ist kommagetrennt (z.B. "BE,ZH") – FIND_IN_SET prüft ob Kürzel enthalten
    if ( $kanton )    { $where[] = 'FIND_IN_SET(%s, REPLACE(kantone, " ", "")) > 0'; $params[] = $kanton; }
    if ( $sprache )   { $where[] = 'UPPER(sprache) = %s'; $params[] = $sprache; }

    $sql = "SELECT organisation, email, kantone, sprache, anschreiben_satz, ansprechperson, kategorie, typ
            FROM {$table} WHERE " . implode( ' AND ', $where ) . " ORDER BY organisation LIMIT 5000";

    $rows = $params
        ? $wpdb->get_results( $wpdb->prepare( $sql, $params ) )
        : $wpdb->get_results( $sql );

    $data = array_map( function( $r ) {
        // %NAME% = Ansprechperson falls vorhanden, sonst Organisationsname
        $name = ( ! empty( $r->ansprechperson ) ) ? (string) $r->ansprechperson : (string) $r->organisation;
        return [
            'name'    => $name,
            'email'   => (string) $r->email,
            'kanton'  => (string) $r->kantone,   // kommagetrennt z.B. "BE,ZH"
            'sprache' => (string) ( $r->sprache ?? 'DE' ),
            'route'   => '',
            'typ'     => (string) $r->typ,
            'satz'    => (string) ( $r->anschreiben_satz ?? '' ),
            // Zusatzfelder für Tabellenansicht
            '_org'      => (string) $r->organisation,
            '_kategorie' => (string) $r->kategorie,
        ];
    }, $rows ?: [] );

    wp_send_json_success( $data );
}

// ── AJAX: Organisationen-Meta (für Dropdowns) ─────────────────────────────────
add_action( 'wp_ajax_nopriv_sagatrail_orgs_meta', 'sagatrail_ajax_orgs_meta' );
add_action( 'wp_ajax_sagatrail_orgs_meta',        'sagatrail_ajax_orgs_meta' );

function sagatrail_ajax_orgs_meta() {
    sagatrail_leads_check_secret();

    global $wpdb;
    $table = 'organisationen';

    $kategorien = $wpdb->get_col( "SELECT DISTINCT kategorie FROM {$table} WHERE kategorie != '' ORDER BY kategorie" );
    $typen      = $wpdb->get_col( "SELECT DISTINCT typ       FROM {$table} WHERE typ       != '' ORDER BY typ" );
    // Kantone: Spalte ist kommagetrennt → explodieren, deduplizieren, sortieren
    $raw_kt     = $wpdb->get_col( "SELECT DISTINCT kantone   FROM {$table} WHERE kantone IS NOT NULL AND kantone != ''" );
    $kt_set     = [];
    foreach ( $raw_kt as $cell ) {
        foreach ( explode( ',', $cell ) as $k ) {
            $k = trim( $k );
            if ( $k ) $kt_set[ $k ] = true;
        }
    }
    ksort( $kt_set );
    $kantone = array_keys( $kt_set );
    $total    = (int) $wpdb->get_var( "SELECT COUNT(*) FROM {$table} WHERE email IS NOT NULL AND email != ''" );
    $sprachen = $wpdb->get_col( "SELECT DISTINCT UPPER(sprache) FROM {$table} WHERE sprache IS NOT NULL AND sprache != '' ORDER BY 1" );

    wp_send_json_success( compact( 'kategorien', 'typen', 'kantone', 'sprachen', 'total' ) );
}
