import js from '@eslint/js';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettier,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                // CDN libraries exposed as globals by <script> tags in index.html and
                // referenced from modules (e.g. src/map.js uses mapboxgl, src/draw.js uses
                // MapboxDraw, src/bootstrap.js uses the two map controls).
                mapboxgl: 'readonly',
                MapboxDraw: 'readonly',
                MapboxGeocoder: 'readonly',
                MapboxExportControl: 'readonly',
                tokml: 'readonly',
                numeral: 'readonly',
                math: 'readonly',
                TomSelect: 'readonly',
                Papa: 'readonly',
                JSZip: 'readonly',
            },
        },
    },
    {
        // scripts/ runs under Node (npm run build), not the browser.
        files: ['scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.node,
            },
        },
    },
    {
        // public/lib/ holds the vendored third-party scripts, not our source;
        // public/images is static data (icons.json + PNGs), not lintable JS anyway.
        ignores: ['dist/**', 'public/**', 'old/**', 'node_modules/**'],
    },
];
