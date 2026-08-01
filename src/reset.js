import { map } from './map.js';
import { draw } from './draw.js';
import { addGeoJsonSource } from './mapSource.js';
import { clearSectors, getSectors } from './sectors.js';
import { clearHiddenPois } from './hiddenPois.js';
import { getOverlays, clearOverlays } from './overlays.js';
import { createTable } from './ui/table.js';

// Clear the whole map: draw features, coverage sectors, hidden POIs and KMZ
// overlays (including their map layers/sources). Used by the "Delete All" button
// and before importing a GeoJSON/CSV file.
export function deleteAll() {
    draw.deleteAll();
    clearSectors();
    clearHiddenPois();

    getOverlays().forEach(function (overlay) {
        map.removeLayer('overlay-layer-' + overlay.ID);
        map.removeSource('overlay-source-' + overlay.ID);
    });
    clearOverlays();

    addGeoJsonSource('aree', getSectors());
    addGeoJsonSource('settori', draw.getAll());
    createTable(draw.getAll());
}
