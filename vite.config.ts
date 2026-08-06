import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'kml-proxy-middleware',
        configureServer(server) {
          server.middlewares.use('/api/fetch-kml', async (req, res) => {
            try {
              const reqUrl = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
              const targetUrl = reqUrl.searchParams.get('url');
              if (!targetUrl) {
                res.statusCode = 400;
                res.end('Missing url parameter');
                return;
              }

              const response = await fetch(targetUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }
              });

              if (!response.ok) {
                res.statusCode = response.status;
                res.end(`Failed to fetch from target: ${response.statusText}`);
                return;
              }

              const xmlText = await response.text();
              res.setHeader('Content-Type', 'application/xml; charset=utf-8');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(xmlText);
            } catch (err: any) {
              res.statusCode = 500;
              res.end(err?.message || 'Server error proxying KML');
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
