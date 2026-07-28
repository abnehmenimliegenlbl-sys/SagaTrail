<?php
/**
 * overpass-proxy.php
 * Auf Infomaniak Webhosting hochladen (in den Ordner wo wp-config.php liegt).
 * Leitet Overpass-Anfragen vom Replit-API-Server weiter.
 */
/* PHP-eigenes Limit deaktivieren, falls erlaubt (auf Infomaniak gesperrt);
   das cURL-Timeout (s.u.) steuert die Wartezeit. */
if (function_exists('set_time_limit')) {
    @set_time_limit(0);
}

/* Token NICHT hardcoden: beim Deployment auf dem Hosting entweder als
   Umgebungsvariable OVERPASS_PROXY_TOKEN setzen oder eine (nicht
   versionierte) Datei overpass-proxy-token.php mit
   `<?php return '...';` daneben legen. */
$secret = getenv('OVERPASS_PROXY_TOKEN') ?: '';
if ($secret === '' && is_readable(__DIR__ . '/overpass-proxy-token.php')) {
    $secret = (string) require __DIR__ . '/overpass-proxy-token.php';
}
if ($secret === '') {
    http_response_code(500);
    header('Content-Type: text/plain');
    exit('Proxy token not configured');
}

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
