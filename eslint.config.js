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
      globals: { ...globals.browser },
    },
  },
  {
    // Legacy globals-based scripts: linted loosely until they are converted
    // to ES modules in the modularization phase.
    files: ['new_script.js', 'resizer.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        mapboxgl: 'readonly',
        MapboxDraw: 'readonly',
        MapboxGeocoder: 'readonly',
        turf: 'readonly',
        Papa: 'readonly',
        JSZip: 'readonly',
        numeral: 'readonly',
        math: 'readonly',
        tokml: 'readonly',
        TomSelect: 'readonly',
        API_KEY: 'readonly',
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
