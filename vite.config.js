/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The legacy app is still served from the repo root (index.html + bootstrap.js).
// Vite works with that zero-config; this file only adds the test runner setup and
// a place to grow the build configuration as the app is migrated to ES modules.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    // Most extracted logic is pure; jsdom is available for the pieces that
    // touch the DOM (table/form rendering) as they get extracted into src/.
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.js'],
    globals: true,
  },
});
