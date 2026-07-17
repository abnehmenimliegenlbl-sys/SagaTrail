<?php
/**
 * overpass-proxy.php
 * Auf Infomaniak Webhosting hochladen (in den Ordner wo wp-config.php liegt).
 * Leitet Overpass-Anfragen vom Replit-API-Server weiter.
 */
set_time_limit(0); /* PHP-eigenes Limit deaktivieren; cURL-Timeout (s.u.) steuert die Wartezeit. */

$secret = '16673aafe24093bcdd0a01ddf29fb776250d2de850a94908';

$incoming = $_SERVER['HTTP_X_PROXY_TOKEN'] ?? '';
if ($incoming !== $secret) {
    http_response_code(403);
    header('Content-Type: text/plain');
    exit('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: text/plain');
    exit('Method Not Allowed');
}

$body = file_get_contents('php://input');
if (empty(trim($body))) {
    http_response_code(400);
    header('Content-Type: text/plain');
    exit('Bad Request: leerer Body');
}

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
