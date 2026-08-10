/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// The legacy app is still served from the repo root (index.html + bootstrap.js).
// Vite works with that zero-config; this file only adds the test runner setup and
// a place to grow the build configuration as the app is migrated to ES modules.
export default defineConfig({
    root: '.',
    // The deployed Worker (cellmap-v2.walker1993.workers.dev) is never visited
    // directly — a separate redirect Worker on alexcortinovis.tech proxies
    // /cellmapdesigner/* to it. Without an explicit base, Vite emits root-
    // absolute asset URLs (/assets/...), which resolve against the *browser's*
    // page origin (alexcortinovis.tech), not the proxied subpath — so they miss
    // the redirect worker's `startsWith('/cellmapdesigner/')` check entirely and
    // fall through to the unrelated site at that domain. Prefixing base makes
    // every emitted asset URL start with /cellmapdesigner/, which the redirect
    // worker does match and correctly rewrites to this Worker's own root.
    base: '/cellmapdesigner/',
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
