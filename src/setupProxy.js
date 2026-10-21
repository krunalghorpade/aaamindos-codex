const { createProxyMiddleware } = require('http-proxy-middleware');
const startAccessServer = require('../server/dev-access.cjs');

// CRA loads this CommonJS module in development only. Never embed an API key here.
module.exports = function setupProxy(app) {
  // Register synchronously so CRA's HTML fallback can never swallow an access request.
  const access = startAccessServer().then(target => createProxyMiddleware({
    target,
    logLevel: 'silent',
    proxyTimeout: 15000,
    onError(_error, _req, res) {
      res.status(503).json({ error: 'The access service is unavailable.' });
    },
  })).catch(() => null);
  app.use('/api/access.php', async (req, res, next) => {
    const proxy = await access;
    if (!proxy) { res.status(503).json({ error: 'The access service requires PHP. Check the local server setup.' }); return; }
    proxy(req, res, next);
  });
  app.use(
    '/api/openai',
    createProxyMiddleware({
      target: 'https://api.openai.com',
      changeOrigin: true,
      pathRewrite: { '^/api/openai': '/v1' },
      logLevel: 'silent',
      proxyTimeout: 65000,
      timeout: 65000,
      onProxyReq(proxyReq) {
        proxyReq.removeHeader('cookie');
        proxyReq.removeHeader('origin');
        proxyReq.removeHeader('referer');
      },
      onError(_error, _req, res) {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'OpenAI is unreachable. Your map has not changed.' } }));
        }
      },
    })
  );
};
