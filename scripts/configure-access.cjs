const { randomBytes, pbkdf2 } = require('crypto');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');

async function createAccessConfig(pin) {
  if (!/^\d{4}$/.test(pin)) throw new Error('Use exactly four digits.');
  const salt = randomBytes(32);
  const iterations = 600000;
  const verifier = await promisify(pbkdf2)(pin, salt, iterations, 32, 'sha256');
  return { version: 1, salt: salt.toString('hex'), verifier: verifier.toString('hex'), iterations, sessionSecret: randomBytes(32).toString('hex') };
}

function readHiddenPin() {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal. Never pass the PIN as a command argument.');
  process.stdout.write('Enter the four-digit access code (input hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let input = '';
    const finish = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };
    const onData = buffer => {
      for (const char of buffer.toString()) {
        if (char === '\u0003') { finish(); reject(new Error('Cancelled.')); return; }
        if (char === '\r' || char === '\n') { finish(); resolve(input); input = ''; return; }
        if (char === '\u007f' || char === '\b') input = input.slice(0, -1);
        else if (/\d/.test(char) && input.length < 4) input += char;
      }
    };
    process.stdin.on('data', onData);
  });
}

if (require.main === module) {
  (async () => {
    const config = await createAccessConfig(await readHiddenPin());
    const directory = path.resolve(__dirname, '../.private');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = path.join(directory, 'access.json.tmp');
    await fs.writeFile(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
    await fs.rename(temporary, path.join(directory, 'access.json'));
    process.stdout.write('Private verifier configured. Existing remembered access is now invalid. The code itself was not saved.\n');
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}

module.exports = { createAccessConfig };
