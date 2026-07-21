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
