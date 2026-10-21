const { createProxyMiddleware } = require('http-proxy-middleware');
const setupProxy = require('./setupProxy');

jest.mock('http-proxy-middleware', () => ({
  createProxyMiddleware: jest.fn(() => function proxyMiddleware() {}),
}));

beforeEach(() => {
  createProxyMiddleware.mockImplementation(() => function proxyMiddleware() {});
});

function configure() {
  const app = { use: jest.fn() };
  setupProxy(app);
  return { app, options: createProxyMiddleware.mock.calls[0][0] };
}

test('CRA registers the existing API route and rewrites it to the OpenAI v1 endpoint', () => {
  const { app, options } = configure();
  expect(app.use).toHaveBeenCalledWith('/api/openai', expect.any(Function));
  expect(options.target).toBe('https://api.openai.com');
  expect('/api/openai/chat/completions'.replace(/^\/api\/openai/, options.pathRewrite['^/api/openai'])).toBe('/v1/chat/completions');
  expect(options.changeOrigin).toBe(true);
});

test('proxy strips unrelated browser headers while retaining Authorization', () => {
  const { options } = configure();
  const request = { removeHeader: jest.fn() };
  options.onProxyReq(request);
  expect(request.removeHeader.mock.calls.map(([header]) => header)).toEqual(['cookie', 'origin', 'referer']);
});

test('upstream connection failures return a JSON 502 without leaking request details', () => {
  const { options } = configure();
  const response = { headersSent: false, writeHead: jest.fn(), end: jest.fn() };
  options.onError(new Error('upstream unavailable'), {}, response);
  expect(response.writeHead).toHaveBeenCalledWith(502, { 'Content-Type': 'application/json' });
  expect(JSON.parse(response.end.mock.calls[0][0]).error.message).toContain('OpenAI is unreachable');
  response.headersSent = true;
  response.end.mockClear();
  options.onError(new Error('upstream unavailable'), {}, response);
  expect(response.end).not.toHaveBeenCalled();
});
