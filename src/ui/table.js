import * as turf from '@turf/turf';
import { map } from '../map.js';
import { draw } from '../draw.js';
import { addGeoJsonSource } from '../mapSource.js';
import { getHiddenPois, addHiddenPoi, takeHiddenPoi, removeHiddenPoi } from '../hiddenPois.js';
import { getOverlays, removeOverlay } from '../overlays.js';
import {
    getSectors,
    addSector,
    getSectorsByTowerId,
    removeSectorsByTowerId,
} from '../sectors.js';

// `numeral`, `math` and `mapboxgl` are CDN globals from index.html.

// The "edit" row action opens the add/edit form, which lives with the form code
// in new_script.js. To avoid a table<->form circular import, new_script.js
// registers the handler here instead of table.js importing the form directly.
let editHandler = null;

/** Register what the row "edit" (pencil) button should do. */
export function setRowEditHandler(fn) {
    editHandler = fn;
}

// Create an accessible icon action button: a real <button> (focusable,
// keyboard-activatable, announced by screen readers) with an aria-label; the
// Font Awesome <i> inside is decorative (aria-hidden). Regular function so a
// handler's `this` is the button element.
function actionIcon(className, label, handler) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.setAttribute('aria-label', label);
    button.title = label;
    const icon = document.createElement('i');
    icon.className = className;
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    button.addEventListener('click', handler);
    return button;
}

// Update a visibility toggle button (its icon + accessible label) after it flips.
function setVisibilityButton(button, hidden, showLabel, hideLabel) {
    button.querySelector('i').className = hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';
    const label = hidden ? showLabel : hideLabel;
    button.setAttribute('aria-label', label);
    button.title = label;
}

/** Rebuild the tower / POI / overlay sidebar tables from the current features. */
export function createTable(tableData) {
    const towerTable = document.getElementById('features');
    const poiTable = document.getElementById('poi');
    const overlayTable = document.getElementById('overlays');
    towerTable.innerHTML = '';
    poiTable.innerHTML = '';
    overlayTable.innerHTML = '';

    tableData.features = tableData.features.concat(getHiddenPois()).sort((a, b) => {
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });
    for (const marker of tableData.features) {
        if (marker.properties.marker && marker.properties.marker === 'cell') {
            towerTable.appendChild(createTowerRow(marker));
        } else {
            poiTable.appendChild(createPOIRow(marker));
        }
    }
    for (const overlay of getOverlays()) {
        overlayTable.appendChild(createOverlayRow(overlay));
    }
}

function createOverlayRow(overlay) {
    const row = document.createElement('div');
    row.className = 'table-element';

    const spanName = document.createElement('span');
    spanName.innerText = overlay.file;
    row.appendChild(spanName);

    const col = document.createElement('span');
    col.className = 'btn-col';

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate overlay', function () {
            const bounds = [overlay.west, overlay.south, overlay.east, overlay.north];
            map.fitBounds(bounds, { padding: 100, maxZoom: 13 });
        })
    );

    const overlayVisClass = overlay.hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';
    col.appendChild(
        actionIcon(overlayVisClass, overlay.hidden ? 'Show overlay' : 'Hide overlay', function () {
            const layerId = 'overlay-layer-' + overlay.ID;
            overlay.hidden = !overlay.hidden;
            map.setLayoutProperty(layerId, 'visibility', overlay.hidden ? 'none' : 'visible');
            setVisibilityButton(this, overlay.hidden, 'Show overlay', 'Hide overlay');
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-xmark', 'Delete overlay', function () {
            if (removeOverlay(overlay)) {
                createTable(draw.getAll());
                map.removeLayer('overlay-layer-' + overlay.ID);
                map.removeSource('overlay-source-' + overlay.ID);
            }
        })
    );

    row.appendChild(col);
    return row;
}

function createPOIRow(marker) {
    const row = document.createElement('div');
    row.className = 'table-element';

    // type label
    let spanType = document.createElement('span');
    spanType.setAttribute('data-id', marker.id);
    let testo = '';
    switch (marker.geometry.type) {
        case 'Point':
            testo = 'PoI';
            break;
        case 'LineString':
            testo = 'Measure';
            break;
        case 'Polygon':
            testo = 'Area';
            break;
        default:
            break;
    }
    spanType.innerText = testo;
    row.appendChild(spanType);

    // name (falls back to coordinates / length / area when unnamed)
    const spanName = document.createElement('span');
    spanName.innerText = marker.properties.name;
    if (marker.properties.name === undefined || marker.properties.name === '') {
        let label = '';
        switch (marker.geometry.type) {
            case 'Point':
                label =
                    marker.geometry.coordinates[1].toFixed(6) +
                    ';' +
                    marker.geometry.coordinates[0].toFixed(6);
                break;
            case 'LineString': {
                const length = turf.length(marker);
                label = numeral(length * 1000).format('0,0.0a') + 'm';
                break;
            }
            case 'Polygon': {
                const area = math.unit(turf.area(marker), 'm^2');
                label = area.format({ notation: 'fixed', precision: 2 });
                break;
            }
            default:
                break;
        }
        spanName.innerText = label;
    }
    row.appendChild(spanName);

    // colour swatch
    const square = document.createElement('div');
    square.className = 'square-color';
    square.style.backgroundColor = marker.properties.fill;
    row.appendChild(square);

    const col = document.createElement('span');
    col.className = 'btn-col';

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate', function () {
            const bounds = new mapboxgl.LngLatBounds(turf.bbox(marker));
            map.fitBounds(bounds, { padding: 100, maxZoom: 13 });
        })
    );

    const poiVisClass = marker.properties.hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';
    col.appendChild(
        actionIcon(poiVisClass, marker.properties.hidden ? 'Show' : 'Hide', function () {
            if (marker.properties.hidden) {
                marker.properties.hidden = false;
                const restored = takeHiddenPoi(marker.id);
                if (restored) {
                    draw.add(restored);
                }
            } else {
                marker.properties.hidden = true;
                addHiddenPoi(marker);
                draw.delete(marker.id);
            }
            setVisibilityButton(this, marker.properties.hidden, 'Show', 'Hide');
            createTable(draw.getAll());
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-copy', 'Duplicate', function () {
            const copyPoi = draw.get(marker.id);
            copyPoi.id = '';
            draw.add(copyPoi);
            createTable(draw.getAll());
            addGeoJsonSource('settori', draw.getAll());
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-pen', 'Edit', function () {
            if (editHandler) editHandler(marker);
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-xmark', 'Delete', function () {
            draw.delete(marker.id);
            // a hidden POI lives in the hidden list, not in draw, so also drop it there
            removeHiddenPoi(marker.id);
            createTable(draw.getAll());
            addGeoJsonSource('settori', draw.getAll());
            removeSectorsByTowerId(marker.id);
            addGeoJsonSource('aree', getSectors());
        })
    );

    row.appendChild(col);
    return row;
}

function createTowerRow(marker) {
    const row = document.createElement('div');
    row.className = 'table-element';

    const spanName = document.createElement('span');
    spanName.setAttribute('data-id', marker.id);
    spanName.innerText = marker.properties.name === '' ? 'Unnamed' : marker.properties.name;
    row.appendChild(spanName);

    const spanAngle = document.createElement('span');
    spanAngle.innerText =
        marker.properties.Angle1.toString() + ' - ' + marker.properties.Angle2.toString() + '°';
    row.appendChild(spanAngle);

    const spanRadius = document.createElement('span');
    spanRadius.innerText = marker.properties.Radius.toString() + 'km';
    row.appendChild(spanRadius);

    const square = document.createElement('div');
    square.className = 'square-color';
    square.style.backgroundColor = marker.properties.fill;
    row.appendChild(square);

    const col = document.createElement('span');
    col.className = 'btn-col';

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate', function () {
            map.flyTo({ center: marker.geometry.coordinates, zoom: 11 });
        })
    );

    const towerVisClass = marker.properties.hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';
    col.appendChild(
        actionIcon(towerVisClass, marker.properties.hidden ? 'Show' : 'Hide', function () {
            // Towers are hidden via Mapbox layer filters (markers + their sectors),
            // keyed by feature id / towerid.
            let hiddenFilterMarkers = map.getFilter('markers') || ['all'];
            let hiddenFilterSectors = map.getFilter('sectors') || ['all'];
            if (!Array.isArray(hiddenFilterMarkers)) hiddenFilterMarkers = ['all'];
            if (!Array.isArray(hiddenFilterSectors)) hiddenFilterSectors = ['all'];

            const feat = draw.get(marker.id);
            if (feat.properties.hidden) {
                feat.properties.hidden = false;
                hiddenFilterMarkers = hiddenFilterMarkers.filter(
                    (f) =>
                        !(
                            Array.isArray(f) &&
                            f[0] === '!=' &&
                            JSON.stringify(f[1]) === JSON.stringify(['get', 'id']) &&
                            f[2] === marker.id
                        )
                );
                hiddenFilterSectors = hiddenFilterSectors.filter(
                    (f) =>
                        !(
                            Array.isArray(f) &&
                            f[0] === '!=' &&
                            JSON.stringify(f[1]) === JSON.stringify(['get', 'towerid']) &&
                            f[2] === marker.id
                        )
                );
            } else {
                feat.properties.hidden = true;
                if (hiddenFilterMarkers.length === 1 && hiddenFilterMarkers[0] === 'all') {
                    hiddenFilterMarkers = ['all', ['!=', ['get', 'id'], marker.id]];
                } else {
                    hiddenFilterMarkers.push(['!=', ['get', 'id'], marker.id]);
                }
                if (hiddenFilterSectors.length === 1 && hiddenFilterSectors[0] === 'all') {
                    hiddenFilterSectors = ['all', ['!=', ['get', 'towerid'], marker.id]];
                } else {
                    hiddenFilterSectors.push(['!=', ['get', 'towerid'], marker.id]);
                }
            }
            setVisibilityButton(this, feat.properties.hidden, 'Show', 'Hide');

            map.setFilter('markers', hiddenFilterMarkers);
            map.setFilter('sectors', hiddenFilterSectors);
            draw.add(feat);
            createTable(draw.getAll());
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-copy', 'Duplicate', function () {
            const copyCell = draw.get(marker.id);
            copyCell.id = '';
            const newId = draw.add(copyCell);
            createTable(draw.getAll());
            addGeoJsonSource('settori', draw.getAll());
            // Duplicate the tower's coverage sector too, relinked to the new marker id.
            const originalSector = getSectorsByTowerId(marker.id)[0];
            if (originalSector) {
                const copySector = JSON.parse(JSON.stringify(originalSector));
                copySector.properties.towerid = newId[0];
                addSector(copySector);
            }
            addGeoJsonSource('aree', getSectors());
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-pen', 'Edit', function () {
            if (editHandler) editHandler(marker);
        })
    );

    col.appendChild(
        actionIcon('fa-sharp fa-solid fa-xmark', 'Delete', function () {
            draw.delete(marker.id);
            removeHiddenPoi(marker.id);
            createTable(draw.getAll());
            addGeoJsonSource('settori', draw.getAll());
            removeSectorsByTowerId(marker.id);
            addGeoJsonSource('aree', getSectors());
        })
    );

    row.appendChild(col);
    return row;
}
