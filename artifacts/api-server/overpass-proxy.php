<?php
/**
 * overpass-proxy.php
 * Auf Infomaniak Webhosting hochladen (z.B. /www/overpass-proxy.php).
 * Leitet Overpass-Anfragen vom Replit-API-Server weiter — Infomaniaks IP
 * ist nicht geblockt, Replits IP schon.
 *
 * Schutz: X-Proxy-Token Header muss mit OVERPASS_PROXY_TOKEN übereinstimmen.
 * Token in .htaccess als SetEnv setzen ODER direkt hier als Klartext (sicherer: .htaccess).
 */

$secret = getenv('OVERPASS_PROXY_TOKEN');
if ($secret === false || $secret === '') {
    // Fallback: Token direkt hier eintragen falls .htaccess-SetEnv nicht geht
    $secret = 'HIER_TOKEN_EINTRAGEN';
}

// Token prüfen
$incoming = $_SERVER['HTTP_X_PROXY_TOKEN'] ?? '';
if ($incoming !== $secret) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('Forbidden');
}

// Nur POST erlaubt
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: text/plain');
    exit('Method Not Allowed');
}

// Body lesen (Format: data=<urlencoded overpass query>)
$body = file_get_contents('php://input');
if (empty(trim($body))) {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('Bad Request: leerer Body');
}

// Anfrage an Overpass weiterleiten
$ch = curl_init('https://overpass-api.de/api/interpreter');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $body,
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/x-www-form-urlencoded',
        'User-Agent: SagaTrail/1.0 (sagatrail.ch; via Infomaniak proxy)',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_FOLLOWLOCATION => false,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(502);
    header('Content-Type: text/plain');
    exit('Proxy-Fehler: ' . $curlError);
}

http_response_code($httpCode);
header('Content-Type: application/json; charset=utf-8');
header('X-Proxy: infomaniak');
echo $response;
