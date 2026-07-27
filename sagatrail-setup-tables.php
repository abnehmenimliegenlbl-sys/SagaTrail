<?php
/**
 * SagaTrail – Datenbank-Setup
 *
 * Legt alle drei SagaTrail-Tabellen an (CREATE TABLE IF NOT EXISTS).
 * Sicher mehrfach ausführbar – bestehende Daten bleiben erhalten.
 *
 * AUSFÜHREN:
 *   Im Browser aufrufen: https://sagatrail.ch/sagatrail-setup-tables.php?token=sagatrail_harvest_2026
 *   Danach Datei vom Server löschen.
 */

define('SETUP_TOKEN', 'sagatrail_harvest_2026');

$incoming = $_SERVER['PHP_AUTH_PW'] ?? $_GET['token'] ?? '';
if ($incoming !== SETUP_TOKEN) {
    http_response_code(403);
    exit('Forbidden');
}

if (!defined('ABSPATH')) {
    require_once __DIR__ . '/wp-load.php';
}

header('Content-Type: text/plain; charset=utf-8');
global $wpdb;
$charset = $wpdb->get_charset_collate();

// ============================================================
// 1. sagatrail_routen
//    Quellrouten für den OSM-Harvest.
//    Wird manuell oder per Import befüllt (kein Auto-Insert).
// ============================================================
$wpdb->query("CREATE TABLE IF NOT EXISTS sagatrail_routen (
    id          VARCHAR(100) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    kanton      VARCHAR(100) NOT NULL,
    lat         DOUBLE       NOT NULL,
    lng         DOUBLE       NOT NULL,
    erstellt_am DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) {$charset};");
echo "sagatrail_routen: " . ($wpdb->last_error ?: 'OK') . "\n";

// ============================================================
// 2. sagatrail_osm_progress
//    Fortschritts-Tracking – welche Route wurde schon abgefragt.
// ============================================================
$wpdb->query("CREATE TABLE IF NOT EXISTS sagatrail_osm_progress (
    route_id     VARCHAR(100) NOT NULL,
    anzahl_leads INT          NOT NULL DEFAULT 0,
    abgefragt_am DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (route_id)
) {$charset};");
echo "sagatrail_osm_progress: " . ($wpdb->last_error ?: 'OK') . "\n";

// ============================================================
// 3. sagatrail_partner_leads
//    Gefundene POIs (potenzielle Partner) pro Route.
//    osm_id hat UNIQUE-Index → INSERT IGNORE verhindert Duplikate.
// ============================================================
$wpdb->query("CREATE TABLE IF NOT EXISTS sagatrail_partner_leads (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    route_id    VARCHAR(100) NOT NULL,
    route_name  VARCHAR(255) NOT NULL,
    kanton      VARCHAR(100) NOT NULL,
    osm_id      VARCHAR(50)  NOT NULL,
    typ         VARCHAR(100)          DEFAULT NULL,   -- Feintyp: Restaurant, Café, Hotel …
    kategorie   VARCHAR(50)           DEFAULT NULL,   -- Oberbegriff: F+B, Herberge, oder = typ
    name        VARCHAR(255) NOT NULL,
    adresse     VARCHAR(255)          DEFAULT NULL,
    telefon     VARCHAR(50)           DEFAULT NULL,
    website     VARCHAR(500)          DEFAULT NULL,
    email       VARCHAR(255)          DEFAULT NULL,
    lat         DOUBLE                DEFAULT NULL,
    lng         DOUBLE                DEFAULT NULL,
    tier        VARCHAR(20)           DEFAULT NULL,   -- 'Top' wenn E-Mail vorhanden
    erstellt_am DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY  (id),
    UNIQUE  KEY  uk_osm_id (osm_id)
) {$charset};");
echo "sagatrail_partner_leads: " . ($wpdb->last_error ?: 'OK') . "\n";

echo "\nFertig. Diese Datei jetzt vom Server löschen.\n";
