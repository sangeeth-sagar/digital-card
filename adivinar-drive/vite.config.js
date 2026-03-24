import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // 1. Add this line to allow ngrok connections
    allowedHosts: ['.ngrok-free.app'],
    
    // 2. Keep your existing proxy exactly as it is!
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});