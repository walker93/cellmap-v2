import { map } from '../map.js';
import { draw } from '../draw.js';
import { addOverlay } from '../overlays.js';
import { createTable } from '../ui/table.js';

// `JSZip` is a global from the CDN <script> in index.html.

// Georeferencing for imported KMZ raster overlays: read the <LatLonBox> bounds
// from the KMZ's inner KML. Kept as a pure, testable function because getting
// these bounds wrong silently misplaces the overlay on the map.

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

// Import a .kmz raster overlay: unzip it, read the inner KML's <LatLonBox> bounds,
// and add the image to the map georeferenced to those bounds.
export function importKMZ() {
    const inp_file = document.createElement('input');
    inp_file.setAttribute('type', 'file');
    inp_file.setAttribute('accept', '.kmz');
    inp_file.click();
    inp_file.addEventListener('change', async function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        const file = inp_file.files[0];
        JSZip.loadAsync(file)
            .then((zip) => {
                let kmlContentPromise, imageBlobPromise;
                // find the inner KML and image
                zip.forEach((relativePath, zipEntry) => {
                    if (relativePath.endsWith('.kml')) {
                        kmlContentPromise = zipEntry.async('string');
                    } else if (relativePath.endsWith('.png')) {
                        imageBlobPromise = zipEntry.async('blob');
                    }
                });
                if (!kmlContentPromise || !imageBlobPromise) {
                    alert('Invalid KMZ file: inner KML or image missing.');
                    return Promise.reject('KML o immagine mancante');
                }
                return Promise.all([kmlContentPromise, imageBlobPromise]);
            })
            .then(([kmlContent, imageBlob]) => {
                const { north, south, east, west } = parseLatLonBox(kmlContent);

                const imageUrl = URL.createObjectURL(imageBlob);
                const overlayID = Date.now();

                map.addSource('overlay-source-' + overlayID, {
                    type: 'image',
                    url: imageUrl,
                    coordinates: [
                        [west, north], // NW
                        [east, north], // NE
                        [east, south], // SE
                        [west, south], // SW
                    ],
                });
                map.addLayer({
                    id: 'overlay-layer-' + overlayID,
                    type: 'raster',
                    source: 'overlay-source-' + overlayID,
                    paint: { 'raster-fade-duration': 0, 'raster-opacity': 0.3 },
                });
                addOverlay({
                    file: file.name,
                    ID: overlayID,
                    imageURL: imageUrl,
                    imageBlob: imageBlob,
                    north,
                    east,
                    west,
                    south,
                });
                createTable(draw.getAll());
            })
            .catch((error) => {
                console.error("Errore nell'elaborazione del file KMZ:", error);
                alert('Si è verificato un errore durante l\'elaborazione del file KMZ.');
            });
    });
}
