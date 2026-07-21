import { draw } from '../draw.js';
import { getSectors } from '../sectors.js';
import { saveFile } from './download.js';

// `tokml` is a global provided by lib/tokml.js (a <script> in index.html).

/** Convert a GeoJSON FeatureCollection to a KML string. */
export function generateKML(featureCollection) {
    return tokml(featureCollection, {
        name: 'name',
        description: 'description',
        simplestyle: true,
    });
}

/** Export both the draw features and their coverage sectors as a .kml file. */
export function exportKML() {
    const merged = {
        type: 'FeatureCollection',
        features: draw.getAll().features.concat(getSectors().features),
    };
    return saveFile('map.kml', generateKML(merged), 'application/vnd.google-earth.kml+xml', {
        description: 'KML',
        extensions: ['.kml'],
    });
}
