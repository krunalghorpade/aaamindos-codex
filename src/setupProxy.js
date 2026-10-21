const { createProxyMiddleware } = require('http-proxy-middleware');

// CRA loads this CommonJS module in development only. Never embed an API key here.
module.exports = function setupProxy(app) {
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
