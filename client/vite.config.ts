import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// En desarrollo, las llamadas a /api se reenvían al servidor (puerto 3000).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: true } },
  },
  // bwip-js (códigos de barras) pesa ~1 MB, pero se descarga sólo al mostrar una etiqueta
  build: { chunkSizeWarningLimit: 1000 },
});
