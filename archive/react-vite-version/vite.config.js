import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Only index.html is the app. Without this, Vite also scans the old
  // pages in archive/ and wireframes/ when the dev server starts.
  optimizeDeps: {
    entries: ['index.html'],
  },
});
