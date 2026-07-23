import { draw } from '../draw.js';
import { getSectors, removeSectorsByTowerId } from '../sectors.js';
import { addGeoJsonSource } from '../mapSource.js';
import { createTable, setRowEditHandler } from './table.js';
import { buildTowerFeature, validateTowerFields } from '../towerFeature.js';
import { addTower } from '../towerState.js';

// The add/edit form: reading the inputs, building/updating a tower or POI, and
// showing/hiding the panel. The "Salva" button edits either a cell or a POI
// depending on which feature was loaded; loadForm points this at modificaCella or
// modificaPoi, and submitEditForm (wired to the button) runs it.
let pendingSaveHandler = null;

// funzione che aggiunge una cella e il settore alla mappa
// se viene passata una cella esistente viene aggiornata
export function aggiungiCella(existingCell) {
    if (!validateCellInput()) {
        return;
    }
    var cella_feat = createFeatureFromInput();
    var tower = cella_feat[0];
    var area_polygon = cella_feat[1];

    // Se esiste una cella, aggiorno le proprietà mantenendone l'id
    addTower(tower, area_polygon, existingCell ? existingCell.id : undefined);

    createTable(draw.getAll());
    closeForm();
}

function validateCellInput() {
    const result = validateTowerFields({
        lat: document.getElementById('inp_lat').value,
        lon: document.getElementById('inp_lon').value,
        radius: document.getElementById('inp_radius').value,
        angle1: document.getElementById('angle1').value,
        angle2: document.getElementById('angle2').value,
    });
    if (!result.valid) {
        alert(result.errors.join('\n'));
    }
    return result.valid;
}

function createFeatureFromInput() {
    const lat = parseFloat(document.getElementById('inp_lat').value);
    const lon = parseFloat(document.getElementById('inp_lon').value);
    var angolo1 = document.getElementById('angle1');
    var angolo2 = document.getElementById('angle2');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var radius = document.getElementById('inp_radius');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');

    const { marker, sector } = buildTowerFeature({
        lon,
        lat,
        radius: radius.value,
        angle1: angolo1.value,
        angle2: angolo2.value,
        name: name.value,
        description: desc.value,
        fill: fillcolor.value,
        opacity: alpha.value,
    });
    resetForm();

    return [marker, sector];
}

function resetForm() {
    document.getElementById('inp_lat').value = '';
    document.getElementById('inp_lon').value = '';
    document.getElementById('angle1').value = '0';
    document.getElementById('angle2').value = '360';
    document.getElementById('inp_name').value = '';
    document.getElementById('inp_desc').value = '';
    document.getElementById('inp_radius').value = '3';
    document.getElementById('inp_fill').value = '#FF0000';
    document.getElementById('inp_alpha').value = '0.2';
    document.getElementById('feature-id').value = '';
    document.getElementById('inp_icon').tomselect.clear();
}

function loadForm(feature) {
    var lat = document.getElementById('inp_lat');
    var lon = document.getElementById('inp_lon');
    var angolo1 = document.getElementById('angle1');
    var angolo2 = document.getElementById('angle2');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var radius = document.getElementById('inp_radius');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');
    var feat_id = document.getElementById('feature-id');
    var icn = document.getElementById('inp_icon');

    if (feature.properties.marker && feature.properties.marker == 'cell') {
        //if cell feature load all previus fields
        angolo1.value = feature.properties.Angle1;
        angolo2.value = feature.properties.Angle2;
        radius.value = feature.properties.Radius;
        radius.disabled = false;
        angolo1.disabled = false;
        angolo2.disabled = false;
        icn.tomselect.disable(); // disable icon input for cell features
        pendingSaveHandler = modificaCella;
    } else {
        //if marker is a PoI feature disable sector related fields
        radius.disabled = true;
        angolo1.disabled = true;
        angolo2.disabled = true;
        icn.tomselect.enable();
        pendingSaveHandler = modificaPoi;
    }
    //enable or disable coords field according to geometry type
    if (feature.geometry.type === 'Point') {
        lon.value = feature.geometry.coordinates[0];
        lat.value = feature.geometry.coordinates[1];
        lon.disabled = false;
        lat.disabled = false;
    } else {
        lon.disabled = true;
        lat.disabled = true;
    }
    //load all the other features
    name.value = feature.properties.name || '';
    desc.value = feature.properties.description || '';
    fillcolor.value = feature.properties.fill || '';
    alpha.value = feature.properties.opacity || '0.2';
    icn.tomselect.setValue(feature.properties.icon || '');
    feat_id.value = feature.id;
}

function modificaPoi() {
    var feature_id = document.getElementById('feature-id').value;
    var feature = draw.get(feature_id);
    var lat = document.getElementById('inp_lat');
    var lon = document.getElementById('inp_lon');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');
    feature.properties.name = name.value;
    feature.properties.description = desc.value;
    feature.properties.fill = fillcolor.value;
    feature.properties.opacity = parseFloat(alpha.value);
    if (feature.geometry.type === 'Point') {
        feature.geometry.coordinates[0] = parseFloat(lon.value);
        feature.geometry.coordinates[1] = parseFloat(lat.value);
    }
    if (!(feature.properties.marker && feature.properties.marker == 'cell')) {
        var icon_select = document.getElementById('inp_icon');
        var category = icon_select.options[icon_select.selectedIndex].parentNode;
        feature.properties.icon = icon_select.value || undefined; // Set icon or remove if empty
        feature.properties.icon_category = category.label || undefined; // Set category or remove if empty
    }
    draw.add(feature);
    //reset and close form
    closeForm();
    resetForm();
    createTable(draw.getAll());
    addGeoJsonSource('settori', draw.getAll());
}

function modificaCella() {
    var feature_id = document.getElementById('feature-id').value;

    //Delete old sector (the tower itself is re-added by aggiungiCella below)
    removeSectorsByTowerId(feature_id);

    //invoke aggiungiCella() for creation of new tower and sector with updated values
    aggiungiCella(draw.get(feature_id));
    createTable(draw.getAll());
    addGeoJsonSource('settori', draw.getAll());
    addGeoJsonSource('aree', getSectors());

    //reset and close form
    closeForm();
    resetForm();
}

// Remembers what had focus before the dialog opened, so it can be restored on close.
let lastFocused = null;

// Every element inside the dialog that Tab can reach: standard focusable tags, minus
// the hidden `#feature-id` input, anything currently disabled, hidden via inline
// `display: none` (the add/save button pair toggles this way), or opted out with
// `tabindex="-1"`.
function getFocusableElements() {
    const container = document.getElementById('inputs');
    const candidates = container.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]',
    );
    return Array.from(candidates).filter(
        (el) => !el.disabled && el.style.display !== 'none' && el.tabIndex !== -1,
    );
}

// Keep Tab/Shift+Tab cycling within the dialog's own fields instead of escaping to
// the map/sidebar behind it while the dialog is open (a real "modal" needs this —
// aria-modal alone doesn't stop the browser from tabbing past the dialog).
function trapFocus(e) {
    const focusable = getFocusableElements();
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
    }
}

function onDialogKeydown(e) {
    if (e.key === 'Escape') {
        closeForm();
    } else if (e.key === 'Tab') {
        trapFocus(e);
    }
}

export function openForm(marker) {
    lastFocused = document.activeElement;
    if (marker != null) {
        //change button to save instead of add
        document.getElementById('savebtn').style.display = 'inline-block';
        document.getElementById('addbtn').style.display = 'none';
    } else {
        //change button to add instead of save
        document.getElementById('savebtn').style.display = 'none';
        document.getElementById('addbtn').style.display = 'inline-block';
        document.getElementById('inp_icon').tomselect.disable();
    }
    document.getElementById('inputs').style.display = 'block';
    // dialog a11y: allow Escape to close, and move focus into the dialog
    document.addEventListener('keydown', onDialogKeydown);
    document.getElementById('inp_name').focus();
}

export function closeForm() {
    document.getElementById('inputs').style.display = 'none';
    document.getElementById('savebtn').style.display = 'none';
    document.getElementById('addbtn').style.display = 'inline-block';
    document.removeEventListener('keydown', onDialogKeydown);
    // restore focus to whatever opened the dialog
    if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
    }
    lastFocused = null;
}

/** Run the pending edit handler (wired to the form's "Salva" button). */
export function submitEditForm() {
    if (pendingSaveHandler) pendingSaveHandler();
}

// A row's "edit" (pencil) button loads that feature into the form and opens it.
setRowEditHandler(function (marker) {
    loadForm(marker);
    openForm(marker);
});
