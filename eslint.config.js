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
        // MapboxDraw).
        mapboxgl: 'readonly',
        MapboxDraw: 'readonly',
        tokml: 'readonly',
        numeral: 'readonly',
        math: 'readonly',
      },
    },
  },
  {
    // The app entry (now an ES module) and the resizer. Still references several
    // CDN libraries through their <script> globals; linted loosely until the
    // remaining seams (state, io, ui) are extracted into src/ modules.
    files: ['new_script.js', 'resizer.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        mapboxgl: 'readonly',
        MapboxDraw: 'readonly',
        MapboxGeocoder: 'readonly',
        Papa: 'readonly',
        JSZip: 'readonly',
        numeral: 'readonly',
        math: 'readonly',
        tokml: 'readonly',
        TomSelect: 'readonly',
      },
    },
    rules: {
      // Legacy code is linted loosely (warnings only) until each file is
      // converted to an ES module; these flag real cleanups for later phases
      // without blocking CI in the meantime.
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'no-redeclare': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'lib/**', 'old/**', 'node_modules/**'],
  },
];
