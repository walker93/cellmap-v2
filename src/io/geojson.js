import { draw } from '../draw.js';
import { saveFile } from './download.js';
import { addGeoJsonSource } from '../mapSource.js';
import { getSectors } from '../sectors.js';
import { buildCoverageSector, towerFieldsFromFeature } from '../towerFeature.js';
import { createTable } from '../ui/table.js';
import { deleteAll } from '../reset.js';
import { linkTowerSector } from '../towerState.js';

// Export the current draw features as a .geojson file. Sectors live in a separate
// layer and are intentionally not included here (matching the legacy behaviour —
// GeoJSON export is the draw store; KML export merges both).
export function exportGeoJSON() {
    const data = JSON.stringify(draw.getAll());
    return saveFile('map.geojson', data, 'application/geo+json', {
        description: 'GeoJSON',
        extensions: ['.geojson'],
    });
}

// Import a .geojson file: replace the current map with its features and rebuild the
// coverage sector for every cell tower.
export function importGeoJSON() {
    const inp_file = document.createElement('input');
    inp_file.setAttribute('type', 'file');
    inp_file.setAttribute('accept', '.geojson');
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        const reader = new FileReader();
        reader.onload = function fileReadCompleted() {
            deleteAll();
            const read_json = JSON.parse(reader.result);
            draw.add(read_json);
            for (const feat of read_json.features) {
                if (feat.properties.marker == 'cell') {
                    linkTowerSector(feat.id, buildCoverageSector(towerFieldsFromFeature(feat)));
                }
            }
            addGeoJsonSource('aree', getSectors());
            addGeoJsonSource('settori', draw.getAll());
            createTable(draw.getAll());
        };
        reader.readAsText(this.files[0]);
    });
}
