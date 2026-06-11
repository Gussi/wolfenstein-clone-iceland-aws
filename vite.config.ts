import { defineConfig } from 'vite';

// Vite configuration for the "Pots & Parliament" prototype.
// Static, fully client-side build. Assets are kept as files (not inlined).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    open: true,
  },
});
