import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// React frontend. In dev, /api and /uploads are proxied to the Express server.
// In production, `npm run build` outputs to client/dist, which Express serves.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5177',
      '/uploads': 'http://localhost:5177',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
