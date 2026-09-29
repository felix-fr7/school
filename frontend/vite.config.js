import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Student screens live outside frontend/, so point their package imports
      // back to the dependency set already installed by the frontend app.
      '@ionic/react': fileURLToPath(new URL('./node_modules/@ionic/react', import.meta.url)),
      'react-router-dom': fileURLToPath(new URL('./node_modules/react-router-dom', import.meta.url)),
      'ionicons': fileURLToPath(new URL('./node_modules/ionicons', import.meta.url)),
      'react-dom': fileURLToPath(new URL('./node_modules/react-dom', import.meta.url)),
      'react': fileURLToPath(new URL('./node_modules/react', import.meta.url)),
      'axios': fileURLToPath(new URL('./node_modules/axios', import.meta.url)),
      '@ionic/react-router': fileURLToPath(new URL('./node_modules/@ionic/react-router', import.meta.url)),
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