const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

// A loopback PHP worker lets development use exactly the same access checks as cPanel.
module.exports = function startAccessServer() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = listener.address().port;
      listener.close(() => {
        const child = spawn(process.env.MIND_OS_PHP_BIN || 'php', ['-S', `127.0.0.1:${port}`, '-t', path.resolve(__dirname, '../public')], {
          env: { ...process.env, MIND_OS_ACCESS_CONFIG: process.env.MIND_OS_ACCESS_CONFIG || path.resolve(__dirname, '../.private/access.json') },
          stdio: ['ignore', 'ignore', 'pipe'],
        });
        let ready = false;
        const timeout = setTimeout(() => { child.kill(); reject(new Error('Access service did not start.')); }, 5000);
        const fail = () => { clearTimeout(timeout); if (!ready) reject(new Error('PHP is required for the local access service.')); };
        child.once('error', fail);
        child.once('exit', fail);
        child.stderr.on('data', data => {
          if (!ready && data.toString().includes('Development Server')) {
            ready = true;
            clearTimeout(timeout);
            resolve(`http://127.0.0.1:${port}`);
          }
        });
        process.once('exit', () => child.kill());
      });
    });
  });
};
