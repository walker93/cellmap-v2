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

/**
 * "Delete All" as the menu offers it: ask first, and only when there is something
 * to lose. It used to be a button in a row of seven, one click from wiping an
 * afternoon's work with no undo behind it (roadmap point 8) and no way back.
 * @returns {boolean} true if the map was cleared.
 */
export function confirmAndDeleteAll() {
    const empty = draw.getAll().features.length === 0 && getOverlays().length === 0;
    if (!empty && !window.confirm('Eliminare tutto il contenuto della mappa? Non è annullabile.')) {
        return false;
    }
    deleteAll();
    return true;
}
