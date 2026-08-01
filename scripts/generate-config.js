// Produces dist/config.js after `vite build`. config.js is git-ignored (it holds
// the Mapbox access token), so it never ends up in the build output on its own —
// Vite only copies files from public/, and this one deliberately isn't there.
//
// Two sources, in order:
//   1. A local config.js at the repo root (the normal local-dev setup — see
//      config.js.example) is copied through as-is.
//   2. Otherwise, the MAPBOX_ACCESS_TOKEN environment variable is used to
//      generate one. This is the path CI/Cloudflare builds take: the repo
//      checkout has no config.js, so set MAPBOX_ACCESS_TOKEN as a build
//      secret in the Cloudflare dashboard instead.
// If neither is available the build fails loudly rather than shipping a site
// with no Mapbox token (a blank, non-functional map).
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const localConfig = resolve(root, 'config.js');
const distConfig = resolve(root, 'dist', 'config.js');

if (existsSync(localConfig)) {
    copyFileSync(localConfig, distConfig);
    console.log('generate-config: copied local config.js into dist/');
} else if (process.env.MAPBOX_ACCESS_TOKEN) {
    writeFileSync(
        distConfig,
        `window.API_KEY = ${JSON.stringify(process.env.MAPBOX_ACCESS_TOKEN)};\n`,
    );
    console.log('generate-config: generated dist/config.js from MAPBOX_ACCESS_TOKEN');
} else {
    console.error(
        'generate-config: no local config.js and MAPBOX_ACCESS_TOKEN is not set — ' +
            'the built site would have no Mapbox token. See config.js.example, or set ' +
            'MAPBOX_ACCESS_TOKEN as a build secret (e.g. in the Cloudflare dashboard).',
    );
    process.exitCode = 1;
}
