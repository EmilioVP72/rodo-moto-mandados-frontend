import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
