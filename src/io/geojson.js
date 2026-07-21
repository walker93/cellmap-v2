import { draw } from '../draw.js';
import { downloadFile } from './download.js';

// Export the current draw features as a .geojson download. Sectors live in a
// separate layer and are intentionally not included here (matching the legacy
// behaviour — GeoJSON export is the draw store; KML export merges both).
export function exportGeoJSON() {
    const data = JSON.stringify(draw.getAll());
    downloadFile('map.geojson', data, 'application/geo+json');
}
