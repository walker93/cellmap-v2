import * as turf from '@turf/turf';
import { map } from '../map.js';
import { draw } from '../draw.js';
import { getHiddenPois } from '../hiddenPois.js';
import { getOverlays, removeOverlay } from '../overlays.js';
import {
    duplicateTower,
    duplicatePoi,
    hidePoi,
    showPoi,
    removeFeature,
    setTowerHidden,
} from '../towerState.js';
import { el } from './dom.js';

// `numeral`, `math` and `mapboxgl` are CDN globals from index.html.

// The "edit" row action opens the add/edit form, which lives with the form code
// in bootstrap.js. To avoid a table<->form circular import, bootstrap.js
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

// Shared shell for a sidebar row: some label elements, then a btn-col of actions.
// Every row type (tower, POI, overlay) is built from this — the label elements and
// action buttons differ per type, but the row/col scaffolding was identical.
function createRow(labelElements, actions) {
    const row = document.createElement('div');
    row.className = 'table-element';
    for (const label of labelElements) {
        row.appendChild(label);
    }

    const col = document.createElement('span');
    col.className = 'btn-col';
    for (const action of actions) {
        col.appendChild(action);
    }
    row.appendChild(col);

    return row;
}

// The Hide/Show, Duplicate, Edit and Delete actions are identical between tower and
// POI rows apart from which towerState function they call — only `toggle`/`duplicateFn`
// vary, so those two row builders share one implementation of each button below.

function visibilityToggleButton(marker, toggle) {
    const visClass = marker.properties.hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';
    return actionIcon(visClass, marker.properties.hidden ? 'Show' : 'Hide', function () {
        const hidden = toggle(marker);
        setVisibilityButton(this, hidden, 'Show', 'Hide');
        createTable(draw.getAll());
    });
}

function duplicateButton(marker, duplicateFn) {
    return actionIcon('fa-sharp fa-solid fa-copy', 'Duplicate', function () {
        duplicateFn(marker.id);
        createTable(draw.getAll());
    });
}

function editButton(marker) {
    return actionIcon('fa-sharp fa-solid fa-pen', 'Edit', function () {
        if (editHandler) editHandler(marker);
    });
}

function deleteButton(marker) {
    return actionIcon('fa-sharp fa-solid fa-xmark', 'Delete', function () {
        removeFeature(marker.id);
        createTable(draw.getAll());
    });
}

// Toggle helpers for visibilityToggleButton: each performs the actual show/hide side
// effect and returns the feature's new `hidden` state.

function poiToggle(marker) {
    if (marker.properties.hidden) {
        showPoi(marker);
    } else {
        hidePoi(marker);
    }
    return marker.properties.hidden;
}

function towerToggle(marker) {
    const hidden = !marker.properties.hidden;
    setTowerHidden(marker.id, hidden);
    return hidden;
}

/** Rebuild the tower / POI / overlay sidebar tables from the current features. */
export function createTable(tableData) {
    const towerTable = el('features');
    const poiTable = el('poi');
    const overlayTable = el('overlays');
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
    const spanName = document.createElement('span');
    spanName.innerText = overlay.file;

    const overlayVisClass = overlay.hidden
        ? 'fa-sharp fa-solid fa-eye-slash'
        : 'fa-sharp fa-solid fa-eye';

    return createRow(
        [spanName],
        [
            actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate overlay', function () {
                const bounds = [overlay.west, overlay.south, overlay.east, overlay.north];
                map.fitBounds(bounds, { padding: 100, maxZoom: 13 });
            }),
            actionIcon(
                overlayVisClass,
                overlay.hidden ? 'Show overlay' : 'Hide overlay',
                function () {
                    const layerId = 'overlay-layer-' + overlay.ID;
                    overlay.hidden = !overlay.hidden;
                    map.setLayoutProperty(
                        layerId,
                        'visibility',
                        overlay.hidden ? 'none' : 'visible',
                    );
                    setVisibilityButton(this, overlay.hidden, 'Show overlay', 'Hide overlay');
                },
            ),
            actionIcon('fa-sharp fa-solid fa-xmark', 'Delete overlay', function () {
                if (removeOverlay(overlay)) {
                    createTable(draw.getAll());
                    map.removeLayer('overlay-layer-' + overlay.ID);
                    map.removeSource('overlay-source-' + overlay.ID);
                }
            }),
        ],
    );
}

function createPOIRow(marker) {
    // type label
    const spanType = document.createElement('span');
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

    // colour swatch
    const square = document.createElement('div');
    square.className = 'square-color';
    square.style.backgroundColor = marker.properties.fill;

    return createRow(
        [spanType, spanName, square],
        [
            actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate', function () {
                const bounds = new mapboxgl.LngLatBounds(turf.bbox(marker));
                map.fitBounds(bounds, { padding: 100, maxZoom: 13 });
            }),
            visibilityToggleButton(marker, poiToggle),
            duplicateButton(marker, duplicatePoi),
            editButton(marker),
            deleteButton(marker),
        ],
    );
}

// What to call a tower in the sidebar. A CSV of cells from an operator often has
// no name column at all but always has the Cell ID, and a list of rows all
// reading "Unnamed" is unusable — so the identity stands in for the name when
// there isn't one.
function towerLabel(properties) {
    if (properties.name) return properties.name;
    if (properties.cellId) return 'Cell ' + properties.cellId;
    return 'Unnamed';
}

function createTowerRow(marker) {
    const spanName = document.createElement('span');
    spanName.className = 'col-name';
    spanName.setAttribute('data-id', marker.id);
    spanName.innerText = towerLabel(marker.properties);

    const spanAngle = document.createElement('span');
    spanAngle.className = 'col-azimuth';
    spanAngle.innerText =
        marker.properties.Angle1.toString() + ' - ' + marker.properties.Angle2.toString() + '°';

    const spanRadius = document.createElement('span');
    spanRadius.className = 'col-radius';
    spanRadius.innerText = marker.properties.Radius.toString() + 'km';

    const square = document.createElement('div');
    square.className = 'square-color col-color';
    square.style.backgroundColor = marker.properties.fill;

    const row = createRow(
        [spanName, spanAngle, spanRadius, square],
        [
            actionIcon('fa-sharp fa-solid fa-location-dot', 'Locate', function () {
                map.flyTo({ center: marker.geometry.coordinates, zoom: 11 });
            }),
            visibilityToggleButton(marker, towerToggle),
            duplicateButton(marker, duplicateTower),
            editButton(marker),
            deleteButton(marker),
        ],
    );
    row.classList.add('table-element--tower');
    return row;
}
