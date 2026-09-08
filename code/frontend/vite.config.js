import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Listen on every interface. Vite's default binds IPv6 loopback ([::1]) only, which makes
    // http://127.0.0.1:5173 fail outright and leaves http://localhost:5173 at the mercy of how
    // the machine happens to order DNS results. Binding everything also lets us open the app on
    // a phone over the campus network, which we need for the responsive pass.
    host: true,
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
