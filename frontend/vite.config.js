import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://assignment-01-t2a0.onrender.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});