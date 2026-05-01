import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    cors: true,
    hmr: {
      host: '192.168.1.105',
    },
  },
  plugins: [
    laravel({
      input: ['resources/css/admin.css', 'resources/js/app.jsx'],
      refresh: true,
    }),
    react(),
  ],
});
