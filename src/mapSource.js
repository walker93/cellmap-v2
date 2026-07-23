import { map } from './map.js';

// Add or update a GeoJSON source on the map. Used to push the current draw
// features ("settori") and coverage sectors ("aree") to their layers. Extracted
// so both bootstrap.js and the ui/table module can share one implementation.
export function addGeoJsonSource(sourceId, data) {
    const source = map.getSource(sourceId);
    if (!source) {
        map.addSource(sourceId, { type: 'geojson', data });
    } else {
        source.setData(data);
    }
}
