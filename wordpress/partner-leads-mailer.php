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
