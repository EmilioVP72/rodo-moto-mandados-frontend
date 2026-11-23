import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'rodo-offline-shell',
      apply: 'build',
      writeBundle(options, bundle) {
        const dir = options.dir!;
        const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).sort();
        const worker = readFileSync(path.join(import.meta.dirname, 'public/sw.js'), 'utf8');
        const version = createHash('sha256').update(worker).update(assets.join(','))
          .update(readFileSync(path.join(dir, 'index.html'))).digest('hex').slice(0, 16);
        const compiled = worker.replace('rodo-pwa-cache-dev', 'rodo-pwa-cache-' + version)
          .replace('/* build-assets */', assets.map(name => JSON.stringify('/' + name)).join(','));
        writeFileSync(path.join(dir, 'sw.js'), compiled);
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
        '/uploads': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:4000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          presentacion: path.resolve(import.meta.dirname, 'presentacion_inversionista_rodo.html'),
        },
      },
    },
  };
});
