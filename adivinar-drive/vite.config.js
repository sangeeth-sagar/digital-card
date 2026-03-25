import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.ngrok-free.app'],
    proxy: {
      '/n8n': {
        target:       'http://173.212.241.174:5678',
        changeOrigin: true,
        rewrite:      (path) => path.replace(/^\/n8n/, ''),
      },
      '/api/upload-drive': {
        target:       'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});