import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
const proxy = {
  '/api/openai': {
    target: 'https://api.openai.com', changeOrigin: true,
    rewrite: path => path.replace(/^\/api\/openai/, '/v1'),
    configure(proxy) {
      proxy.on('proxyReq', req => { req.removeHeader('cookie'); req.removeHeader('origin'); req.removeHeader('referer'); });
      proxy.on('error', (_error, _req, res) => { if (!res.headersSent) { res.writeHead(502, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: { message: 'OpenAI is unreachable. Your map has not changed.' } })); } });
    },
  },
};
export default defineConfig({ plugins: [react()], build: { rollupOptions: { output: { manualChunks: { vendor: ['react', 'react-dom', '@xyflow/react', '@dagrejs/dagre'] } } } }, server: { port: 5173, strictPort: true, proxy }, preview: { port: 4173, proxy } });
