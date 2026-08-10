import { createReadStream } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Safari looks for /favicon.ico at the ORIGIN ROOT, not at the app's base path.
// This site is served under /bertram-website/, so in dev that request 404s and
// Safari falls back to its generated letter monogram — no matter what the
// <link rel="icon"> tags say. Serving the three icons at the root as well costs
// nothing and makes local Safari behave like production.
function rootIcons() {
  const ICONS = {
    '/favicon.ico': ['public/favicon.ico', 'image/x-icon'],
    '/favicon.svg': ['public/favicon.svg', 'image/svg+xml'],
    '/apple-touch-icon.png': ['public/apple-touch-icon.png', 'image/png'],
  };
  return {
    name: 'root-icons-in-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const hit = ICONS[(req.url || '').split('?')[0]];
        if (!hit) return next();
        res.setHeader('Content-Type', hit[1]);
        res.setHeader('Cache-Control', 'no-cache');
        return createReadStream(new URL(hit[0], import.meta.url)).pipe(res);
      });
    },
  };
}

// Served from https://bertram-qian.github.io/bertram-website/, so every emitted
// URL needs the repo prefix. `trim.html` lives in public/ and is copied
// byte-for-byte rather than processed: it is a live Firebase app whose inline
// module hangs ~22 functions off `window` for its inline onclick handlers, and
// bundling that is a risk with no upside.
export default defineConfig({
  base: '/bertram-website/',
  plugins: [react(), rootIcons()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
});
