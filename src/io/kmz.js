import { map } from '../map.js';
import { draw } from '../draw.js';
import { addOverlay } from '../overlays.js';
import { createTable } from '../ui/table.js';

// `JSZip` is a global from the CDN <script> in index.html.

// Georeferencing for imported KMZ raster overlays: read the <LatLonBox> bounds
// from the KMZ's inner KML. Kept as a pure, testable function because getting
// these bounds wrong silently misplaces the overlay on the map.

/** Raster opacity an overlay gets unless a saved project says otherwise. */
export const DEFAULT_OVERLAY_OPACITY = 0.3;

// Overlay ids were Date.now() alone. That is unique enough for a human clicking
// "Add Overlay", but opening a project adds every overlay in one tight loop, and
// two overlays landing in the same millisecond would produce the same layer id —
// which makes map.addLayer throw. Keep the timestamp (ids stay meaningful) but
// never hand out the same one twice.
let lastOverlayId = 0;
function nextOverlayId() {
    const now = Date.now();
    lastOverlayId = now > lastOverlayId ? now : lastOverlayId + 1;
    return lastOverlayId;
}

/**
 * Parse the <LatLonBox> edges (in decimal degrees) from a KML document string.
 *
 * @param {string} kmlText The inner KML extracted from a .kmz archive.
 * @returns {{ north: number, south: number, east: number, west: number }}
 * @throws {Error} if there is no <LatLonBox> or an edge is missing/not a number.
 */
export function parseLatLonBox(kmlText) {
    const doc = new DOMParser().parseFromString(kmlText, 'application/xml');
    const box = doc.querySelector('LatLonBox');
    if (!box) {
        throw new Error('KMZ inner KML has no <LatLonBox>');
    }
    const edge = (name) => {
        const el = box.querySelector(name);
        const value = el ? parseFloat(el.textContent) : NaN;
        if (!Number.isFinite(value)) {
            throw new Error(`<LatLonBox> is missing a valid <${name}>`);
        }
        return value;
    };
    return { north: edge('north'), south: edge('south'), east: edge('east'), west: edge('west') };
}

/**
 * Unzip a .kmz and pull out the inner KML text and the overlay image.
 * @param {Blob} blob The .kmz archive (a picked file, or one read out of a project).
 * @returns {Promise<{ kmlText: string, imageBlob: Blob }>}
 */
export async function readKmz(blob) {
    const zip = await JSZip.loadAsync(blob);
    let kmlPromise, imagePromise;
    zip.forEach((relativePath, entry) => {
        if (relativePath.endsWith('.kml')) {
            kmlPromise = entry.async('string');
        } else if (relativePath.endsWith('.png')) {
            imagePromise = entry.async('blob');
        }
    });
    if (!kmlPromise || !imagePromise) {
        throw new Error('Invalid KMZ file: inner KML or image missing.');
    }
    const [kmlText, imageBlob] = await Promise.all([kmlPromise, imagePromise]);
    return { kmlText, imageBlob };
}

/**
 * Put a georeferenced raster on the map and register it in the overlay list.
 *
 * Split out of importKMZ so that opening a project takes the same path as picking
 * a file: same source/layer naming, same overlay record, same defaults.
 *
 * @param {object} overlay
 * @param {string} overlay.file Display name shown in the sidebar.
 * @param {Blob} overlay.imageBlob The overlay image.
 * @param {{north: number, south: number, east: number, west: number}} overlay.bounds
 * @param {number} [overlay.opacity] Raster opacity (defaults to DEFAULT_OVERLAY_OPACITY).
 * @param {boolean} [overlay.hidden] Start hidden (a project can save it that way).
 * @returns {object} The overlay record added to the overlay list.
 */
export function addRasterOverlay({
    file,
    imageBlob,
    bounds,
    opacity = DEFAULT_OVERLAY_OPACITY,
    hidden = false,
}) {
    const { north, south, east, west } = bounds;
    const imageURL = URL.createObjectURL(imageBlob);
    const ID = nextOverlayId();

    map.addSource('overlay-source-' + ID, {
        type: 'image',
        url: imageURL,
        coordinates: [
            [west, north], // NW
            [east, north], // NE
            [east, south], // SE
            [west, south], // SW
        ],
    });
    map.addLayer({
        id: 'overlay-layer-' + ID,
        type: 'raster',
        source: 'overlay-source-' + ID,
        paint: { 'raster-fade-duration': 0, 'raster-opacity': opacity },
        layout: { visibility: hidden ? 'none' : 'visible' },
    });

    return addOverlay({
        file,
        ID,
        imageURL,
        imageBlob,
        north,
        east,
        west,
        south,
        opacity,
        hidden,
    });
}

/**
 * Read one .kmz and add it to the map as a raster overlay.
 * @param {Blob|File} file The archive.
 * @param {{name?: string, opacity?: number, hidden?: boolean}} [options] Display
 *   state to restore; `name` is required when `file` is a plain Blob.
 * @returns {Promise<object>} The overlay record.
 */
export async function importKmzFile(file, options = {}) {
    const { kmlText, imageBlob } = await readKmz(file);
    return addRasterOverlay({
        file: options.name || file.name,
        imageBlob,
        bounds: parseLatLonBox(kmlText),
        opacity: options.opacity,
        hidden: options.hidden,
    });
}

function escapeXml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

const IMAGE_ENTRY = 'overlay.png';

/**
 * Rebuild a .kmz for an overlay already on the map. The original archive isn't
 * kept around (only the extracted image and bounds are), so this writes a fresh
 * GroundOverlay KML next to the image — which keeps every overlay inside a saved
 * project a valid, self-describing KMZ that readKmz (or Google Earth) can open.
 * @param {object} overlay An entry from the overlay list.
 * @returns {Promise<Blob>}
 */
export async function overlayToKmz(overlay) {
    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <GroundOverlay>
    <name>${escapeXml(overlay.file)}</name>
    <Icon><href>${IMAGE_ENTRY}</href></Icon>
    <LatLonBox>
      <north>${overlay.north}</north>
      <south>${overlay.south}</south>
      <east>${overlay.east}</east>
      <west>${overlay.west}</west>
    </LatLonBox>
  </GroundOverlay>
</kml>`;
    const zip = new JSZip();
    zip.file('doc.kml', kml);
    zip.file(IMAGE_ENTRY, overlay.imageBlob);
    return zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.google-earth.kmz' });
}

// Import a .kmz raster overlay picked by the user.
export function importKMZ() {
    const inp_file = document.createElement('input');
    inp_file.setAttribute('type', 'file');
    inp_file.setAttribute('accept', '.kmz');
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        importKmzFile(this.files[0])
            .then(() => createTable(draw.getAll()))
            .catch((error) => {
                console.error("Errore nell'elaborazione del file KMZ:", error);
                alert("Si è verificato un errore durante l'elaborazione del file KMZ.");
            });
    });
}
