import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@ionic/react': fileURLToPath(new URL('./src/components/ui.jsx', import.meta.url)),
      '@ionic/react-router': fileURLToPath(new URL('./src/components/router.jsx', import.meta.url)),
      'ionicons/icons': fileURLToPath(new URL('./src/components/icons.jsx', import.meta.url)),
      'ionicons': fileURLToPath(new URL('./src/components/icons.jsx', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
});