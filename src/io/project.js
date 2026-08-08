// The .cellmap project format: everything on the map in one file.
//
// The GeoJSON export stays what it always was — an interoperable dump of the draw
// store, no overlays, no hidden features. That makes it a poor "save my work"
// format: reopening one loses every KMZ overlay and every hidden POI. A project
// file is the other half of that pair, and is deliberately ours alone.
//
// A .cellmap is a plain zip:
//
//   manifest.json      what the map state is, and what the KMZ files can't say
//   features.geojson   the draw store *plus* the hidden POIs, as one collection
//   overlays/0.kmz     one archive per overlay, in sidebar order
//   overlays/1.kmz
//
// Two rules keep it honest. Nothing derived is stored: coverage sectors are
// recomputed from each tower's own fields on open (see loadFeatures), so a file
// can never carry a sector that disagrees with its tower. And each overlay is a
// real, self-describing KMZ — the georeferencing lives in its own <LatLonBox>,
// not in the manifest, so there's exactly one source of truth for where an
// overlay sits, and the entries can be opened on their own in Google Earth.
//
// `JSZip` is a global from the CDN <script> in index.html.
import { draw } from '../draw.js';
import { getHiddenPois } from '../hiddenPois.js';
import { getOverlays } from '../overlays.js';
import { loadFeatures } from '../towerState.js';
import { deleteAll } from '../reset.js';
import { createTable } from '../ui/table.js';
import { saveFile } from './download.js';
import { importKmzFile, overlayToKmz, DEFAULT_OVERLAY_OPACITY } from './kmz.js';
import { defaultRingInterval, getRingSettings, setRingSettings } from '../distanceRings.js';
import { syncDisplaySettings } from '../ui/displaySettings.js';

/** Marker written into every manifest, so a random zip isn't mistaken for a project. */
export const PROJECT_FORMAT = 'cellmap-project';
/** The format this build writes, and the highest it knows how to read. */
export const PROJECT_FORMAT_VERSION = 1;
export const PROJECT_MIME = 'application/x-cellmap+zip';
export const PROJECT_EXTENSION = '.cellmap';

const MANIFEST_ENTRY = 'manifest.json';
const FEATURES_ENTRY = 'features.geojson';
const OVERLAY_DIR = 'overlays';

/**
 * Everything that has to survive a save/open cycle, as one FeatureCollection.
 * Hidden POIs sit outside the draw store, so they are folded back in here — they
 * carry `properties.hidden`, which is how loadFeatures knows to pull them out again.
 * @returns {object} A GeoJSON FeatureCollection.
 */
export function projectFeatures() {
    const all = draw.getAll();
    return {
        type: 'FeatureCollection',
        features: [...all.features, ...getHiddenPois()],
    };
}

/**
 * Describe the overlays for the manifest: their order, their display name, and the
 * two bits of presentation state a KMZ has no way to record.
 * @param {object[]} overlays Entries from the overlay list, in sidebar order.
 * @param {string} savedAt ISO timestamp.
 */
export function buildManifest(overlays, savedAt, display = getRingSettings()) {
    return {
        format: PROJECT_FORMAT,
        formatVersion: PROJECT_FORMAT_VERSION,
        savedAt,
        // Ring spacing is a property of the map, not of any cell, so it has no
        // feature to ride along on and has to be recorded here. The rings
        // themselves are not stored: like sectors, they are recomputed on open.
        display: { ringInterval: display.interval, ringLabels: Boolean(display.labels) },
        overlays: overlays.map((overlay, index) => ({
            entry: `${OVERLAY_DIR}/${index}.kmz`,
            file: overlay.file,
            opacity: typeof overlay.opacity === 'number' ? overlay.opacity : DEFAULT_OVERLAY_OPACITY,
            hidden: Boolean(overlay.hidden),
        })),
    };
}

function normalizeOverlayEntry(entry) {
    if (!entry || typeof entry.entry !== 'string') return null;
    const opacity = Number(entry.opacity);
    return {
        entry: entry.entry,
        file: typeof entry.file === 'string' && entry.file ? entry.file : entry.entry,
        opacity:
            Number.isFinite(opacity) && opacity >= 0 && opacity <= 1
                ? opacity
                : DEFAULT_OVERLAY_OPACITY,
        hidden: Boolean(entry.hidden),
    };
}

/**
 * Validate a parsed manifest and fill in what an older or sloppier writer left out.
 * @param {object} raw The parsed manifest.json.
 * @returns {{formatVersion: number, savedAt: string|null, overlays: object[]}}
 * @throws {Error} with a message meant for the user if the file isn't readable here.
 */
export function readManifest(raw) {
    if (!raw || raw.format !== PROJECT_FORMAT) {
        throw new Error('This file is not a Cell Map Designer project.');
    }
    const version = Number(raw.formatVersion);
    if (!Number.isInteger(version) || version < 1) {
        throw new Error('This project has no readable format version.');
    }
    if (version > PROJECT_FORMAT_VERSION) {
        throw new Error(
            `This project was saved in format ${version}; this version of Cell Map Designer ` +
                `reads up to ${PROJECT_FORMAT_VERSION}. Update the app to open it.`,
        );
    }
    return {
        formatVersion: version,
        savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : null,
        display: normalizeDisplay(raw.display),
        overlays: Array.isArray(raw.overlays)
            ? raw.overlays.map(normalizeOverlayEntry).filter(Boolean)
            : [],
    };
}

// A project written before the "Map display" settings existed simply has no
// `display` key, and gets a spacing derived from its own cells instead. Adding an
// optional key is why this needed no format-version bump: an older build ignores
// what it doesn't know, and a newer one has an answer for what isn't there.
function normalizeDisplay(raw) {
    const interval = Number(raw && raw.ringInterval);
    return {
        interval: Number.isFinite(interval) && interval > 0 ? interval : null,
        labels: Boolean(raw && raw.ringLabels),
    };
}

/**
 * Build the project archive from the current map state.
 * @param {string} [savedAt] ISO timestamp to stamp into the manifest.
 * @returns {Promise<Blob>}
 */
export async function buildProjectArchive(savedAt = new Date().toISOString()) {
    const overlays = getOverlays();
    const zip = new JSZip();
    zip.file(FEATURES_ENTRY, JSON.stringify(projectFeatures()));

    const manifest = buildManifest(overlays, savedAt);
    for (let i = 0; i < overlays.length; i++) {
        zip.file(manifest.overlays[i].entry, await overlayToKmz(overlays[i]));
    }
    // Written last so it always describes what actually ended up in the archive.
    zip.file(MANIFEST_ENTRY, JSON.stringify(manifest, null, 2));

    return zip.generateAsync({ type: 'blob', mimeType: PROJECT_MIME });
}

/**
 * Replace the current map with the contents of a project archive.
 * @param {Blob} blob A .cellmap file.
 * @returns {Promise<object>} The manifest that was applied.
 */
export async function loadProjectArchive(blob) {
    const zip = await JSZip.loadAsync(blob);

    const manifestEntry = zip.file(MANIFEST_ENTRY);
    if (!manifestEntry) {
        throw new Error('This file is not a Cell Map Designer project (no manifest.json).');
    }
    const manifest = readManifest(JSON.parse(await manifestEntry.async('string')));

    const featuresEntry = zip.file(FEATURES_ENTRY);
    const featureCollection = featuresEntry
        ? JSON.parse(await featuresEntry.async('string'))
        : { type: 'FeatureCollection', features: [] };

    // Everything below this line replaces the map, so nothing that can fail on
    // malformed input (the manifest, the feature JSON) is left to run after it.
    deleteAll();

    // Before loadFeatures, which draws the rings: a project that predates these
    // settings has no spacing of its own, so one is derived from the cells it
    // does have rather than leaving it at a default that may suit none of them.
    setRingSettings({
        interval:
            manifest.display.interval ||
            defaultRingInterval(
                featureCollection.features
                    .filter((f) => f.properties && f.properties.marker === 'cell')
                    .map((f) => f.properties.Radius),
            ),
        labels: manifest.display.labels,
    });

    loadFeatures(featureCollection);

    for (const entry of manifest.overlays) {
        const file = zip.file(entry.entry);
        if (!file) {
            console.warn(`project: manifest lists ${entry.entry}, which is not in the archive`);
            continue;
        }
        await importKmzFile(await file.async('blob'), {
            name: entry.file,
            opacity: entry.opacity,
            hidden: entry.hidden,
        });
    }

    createTable(draw.getAll());
    syncDisplaySettings();
    return manifest;
}

/** Save the whole map — features, hidden ones, overlays — as a .cellmap file. */
export async function saveProject() {
    try {
        const blob = await buildProjectArchive();
        return await saveFile('project' + PROJECT_EXTENSION, blob, PROJECT_MIME, {
            description: 'Cell Map Designer project',
            extensions: [PROJECT_EXTENSION],
        });
    } catch (error) {
        console.error('Could not save the project:', error);
        alert('The project could not be saved.');
        return false;
    }
}

/** Pick a .cellmap file and load it over the current map. */
export function openProject() {
    // Opening replaces everything. The GeoJSON/CSV importers have always done that
    // silently, but a project is what someone reaches for *after* an afternoon's
    // work, so it's worth one question.
    const hasWork = draw.getAll().features.length > 0 || getOverlays().length > 0;
    if (hasWork && !window.confirm('Opening a project replaces the current map. Continue?')) {
        return;
    }
    const inp_file = document.createElement('input');
    inp_file.setAttribute('type', 'file');
    inp_file.setAttribute('accept', PROJECT_EXTENSION);
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        loadProjectArchive(this.files[0]).catch((error) => {
            console.error('Could not open the project:', error);
            alert(error && error.message ? error.message : 'The project could not be opened.');
        });
    });
}
