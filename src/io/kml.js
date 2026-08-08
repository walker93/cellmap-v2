import { draw } from '../draw.js';
import { getSectors } from '../sectors.js';
import { saveFile } from './download.js';

// `tokml` is a global provided by lib/tokml.js (a <script> in index.html).

// tokml writes every property into <ExtendedData> and calls `.toString()` on the
// value, so a key that is *present but undefined* throws instead of being skipped.
// Features pick those up routinely — a tower with no description, a tower with no
// network identity, a POI whose icon was cleared — which means "Generate KML" fails
// on perfectly ordinary maps. Round-tripping through JSON drops exactly those keys,
// and that is also the right rule to apply here: a value that would not survive
// being written to a file has no business being written to one.
function exportable(featureCollection) {
    return JSON.parse(JSON.stringify(featureCollection));
}

/** Convert a GeoJSON FeatureCollection to a KML string. */
export function generateKML(featureCollection) {
    return tokml(exportable(featureCollection), {
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
