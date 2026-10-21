const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createAccessConfig } = require('../../../scripts/configure-access.cjs');

let config;
let directory;
const fixtureCode = '0264';
const endpoint = path.resolve(__dirname, '../../../public/api/access.php');
function php(expression) {
  return JSON.parse(execFileSync(process.env.MIND_OS_PHP_BIN || 'php', ['-r', `require $argv[1]; $c = json_decode(stream_get_contents(STDIN), true); ${expression}`, endpoint], {
    input: JSON.stringify(config), encoding: 'utf8',
  }));
}

beforeAll(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mindos-access-test-'));
  config = { ...await createAccessConfig(fixtureCode), directory };
});
afterAll(() => fs.rmSync(directory, { recursive: true, force: true }));

test('configuration stores a salted verifier and PHP accepts only the matching four-digit code', () => {
  expect(config).not.toHaveProperty('pin');
  expect(php(`echo json_encode([mindos_verify('${fixtureCode}', $c), mindos_verify('2460', $c), mindos_verify('', $c), mindos_verify(264, $c)]);`)).toEqual([true, false, false, false]);
});

test('remembered access rejects absent, forged, expired, and rotated credentials', () => {
  expect(php(`
    $token = mindos_token($c);
    $changed = $c; $changed['sessionSecret'] = str_repeat('a', 64);
    $old = 'v1.' . (time() - 34560001) . '.' . str_repeat('b', 64);
    $old .= '.' . hash_hmac('sha256', $old, hex2bin($c['sessionSecret']));
    echo json_encode([mindos_authorized($token, $c), mindos_authorized('', $c), mindos_authorized('true', $c), mindos_authorized($token . 'x', $c), mindos_authorized($old, $c), mindos_authorized($token, $changed)]);
  `)).toEqual([true, false, false, false, false, false]);
});

test('five wrong attempts persist a cooldown even across requests and a correct code cannot bypass it', () => {
  for (let index = 0; index < 5; index++) {
    const result = php("echo json_encode(mindos_attempt('2460', $c, 'rate-limit-fixture'));");
    expect(result.authenticated).toBe(false);
    expect(result.retryAfter > 0).toBe(index === 4);
  }
  const blocked = php(`echo json_encode(mindos_attempt('${fixtureCode}', $c, 'rate-limit-fixture'));`);
  expect(blocked.authenticated).toBe(false);
  expect(blocked.retryAfter).toBeGreaterThan(0);
  const accepted = php(`echo json_encode(mindos_attempt('${fixtureCode}', $c, 'another-fixture'));`);
  expect(accepted).toEqual({ authenticated: true, retryAfter: 0 });
}, 15000);
