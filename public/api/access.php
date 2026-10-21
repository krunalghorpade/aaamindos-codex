<?php
// PHP 7.4+. The verifier and signing key must live outside the public document root.
function mindos_config() {
    $root = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: '';
    $file = getenv('MIND_OS_ACCESS_CONFIG') ?: dirname($root) . '/aaa-mind-os-private/access.json';
    $real = realpath($file);
    if (!$real || ($root && strpos($real, $root . DIRECTORY_SEPARATOR) === 0)) {
        throw new RuntimeException('Private access configuration is unavailable.');
    }
    $config = json_decode(file_get_contents($real), true);
    if (!is_array($config) || ($config['version'] ?? null) !== 1 ||
        !preg_match('/^[a-f0-9]{64}$/D', $config['salt'] ?? '') ||
        !preg_match('/^[a-f0-9]{64}$/D', $config['verifier'] ?? '') ||
        !preg_match('/^[a-f0-9]{64}$/D', $config['sessionSecret'] ?? '') ||
        !is_int($config['iterations'] ?? null) || $config['iterations'] < 600000 || $config['iterations'] > 2000000) {
        throw new RuntimeException('Invalid access configuration.');
    }
    $config['directory'] = dirname($real);
    return $config;
}

function mindos_token($config) {
    $payload = 'v1.' . time() . '.' . bin2hex(random_bytes(32));
    return $payload . '.' . hash_hmac('sha256', $payload, hex2bin($config['sessionSecret']));
}

function mindos_authorized($token, $config) {
    if (!is_string($token) || !preg_match('/^v1\.([0-9]{10})\.([a-f0-9]{64})\.([a-f0-9]{64})$/D', $token, $parts)) return false;
    $age = time() - (int)$parts[1];
    if ($age < 0 || $age > 34560000) return false;
    $payload = 'v1.' . $parts[1] . '.' . $parts[2];
    return hash_equals(hash_hmac('sha256', $payload, hex2bin($config['sessionSecret'])), $parts[3]);
}

function mindos_verify($pin, $config) {
    if (!is_string($pin) || !preg_match('/^[0-9]{4}$/D', $pin)) return false;
    $candidate = hash_pbkdf2('sha256', $pin, hex2bin($config['salt']), $config['iterations'], 64, false);
    return hash_equals($config['verifier'], $candidate);
}

function mindos_attempt($pin, $config, $address) {
    $directory = $config['directory'] . '/attempts';
    if (!is_dir($directory) && !@mkdir($directory, 0700, true) && !is_dir($directory)) throw new RuntimeException('Access checks unavailable.');
    $identity = hash_hmac('sha256', $address, hex2bin($config['sessionSecret']));
    $file = fopen($directory . '/' . $identity . '.json', 'c+');
    if (!$file || !flock($file, LOCK_EX)) throw new RuntimeException('Access checks unavailable.');
    try {
        $state = json_decode(stream_get_contents($file), true);
        $now = time();
        if (!is_array($state) || ($state['until'] ?? 0) <= $now) $state = ['failures' => 0, 'until' => $now + 900];
        if ($state['failures'] >= 5) return ['authenticated' => false, 'retryAfter' => max(1, $state['until'] - $now)];
        $accepted = mindos_verify($pin, $config);
        $state['failures'] = $accepted ? 0 : $state['failures'] + 1;
        rewind($file);
        ftruncate($file, 0);
        if (fwrite($file, json_encode($state)) === false) throw new RuntimeException('Access checks unavailable.');
        fflush($file);
        return ['authenticated' => $accepted, 'retryAfter' => $state['failures'] >= 5 ? max(1, $state['until'] - $now) : 0];
    } finally {
        flock($file, LOCK_UN);
        fclose($file);
    }
}

function mindos_cookie($value, $secure) {
    $path = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME']))), '/') . '/';
    setcookie('mindos_access', $value, [
        'expires' => $value === '' ? time() - 3600 : time() + 34560000,
        'path' => $path,
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
}

function mindos_reply($status, $data) {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

// CLI inclusion is used by tests; the PHP web server has a different SAPI.
if (PHP_SAPI === 'cli') return;

ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, private');
header('X-Content-Type-Options: nosniff');

try {
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $hostname = parse_url('http://' . $host, PHP_URL_HOST);
    if (!$secure && !in_array($hostname, ['localhost', '127.0.0.1', '[::1]'], true)) {
        mindos_reply(503, ['error' => 'Open this workspace over HTTPS to unlock it.']);
    }
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== ($secure ? 'https://' : 'http://') . $host) mindos_reply(403, ['error' => 'This request is not allowed.']);
    if ($method === 'DELETE') {
        mindos_cookie('', $secure);
        mindos_reply(200, ['authenticated' => false]);
    }
    $config = mindos_config();
    if ($method === 'GET') {
        $accepted = mindos_authorized($_COOKIE['mindos_access'] ?? '', $config);
        if ($accepted) mindos_cookie(mindos_token($config), $secure);
        mindos_reply(200, ['authenticated' => $accepted]);
    }
    if ($method !== 'POST') { header('Allow: GET, POST, DELETE'); mindos_reply(405, ['error' => 'Method not allowed.']); }
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) mindos_reply(415, ['error' => 'A JSON request is required.']);
    $body = file_get_contents('php://input', false, null, 0, 513);
    if (strlen($body) > 512) mindos_reply(413, ['error' => 'Request too large.']);
    $input = json_decode($body, true);
    $result = mindos_attempt(is_array($input) ? ($input['pin'] ?? null) : null, $config, $_SERVER['REMOTE_ADDR'] ?? 'unknown');
    if ($result['retryAfter']) {
        header('Retry-After: ' . $result['retryAfter']);
        mindos_reply(429, ['error' => 'Too many attempts. Please wait before trying again.', 'retryAfter' => $result['retryAfter']]);
    }
    if (!$result['authenticated']) mindos_reply(401, ['error' => 'Access denied. Check your code and try again.']);
    mindos_cookie(mindos_token($config), $secure);
    mindos_reply(200, ['authenticated' => true]);
} catch (Throwable $error) {
    mindos_reply(503, ['error' => 'The access service is unavailable. Please contact the workspace owner.']);
}
