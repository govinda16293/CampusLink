import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Calls to /api are proxied to the Express server in development, so the browser only ever
    // talks to one origin and we avoid CORS entirely while developing. In production the two
    // are deployed separately and VITE_API_URL points at the real API.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
