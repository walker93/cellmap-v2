import { draw } from '../draw.js';
import { getSectors, removeSectorsByTowerId } from '../sectors.js';
import { addGeoJsonSource } from '../mapSource.js';
import { createTable, setRowEditHandler } from './table.js';
import { buildTowerFeature, validateTowerFields } from '../towerFeature.js';
import { addTower } from '../towerState.js';
import { el } from './dom.js';

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
    var area_polygons = cella_feat[1];

    // Se esiste una cella, aggiorno le proprietà mantenendone l'id
    addTower(tower, area_polygons, existingCell ? existingCell.id : undefined);

    createTable(draw.getAll());
    closeForm();
}

// The optional network identity of a cell, read straight off the dialog. Shared
// by the validation and the build step so the two can never disagree on which
// inputs make up the identity.
function readIdentityInput() {
    return {
        mcc: el('inp_mcc').value,
        mnc: el('inp_mnc').value,
        lac: el('inp_lac').value,
        cellId: el('inp_cellid').value,
        cellType: el('inp_celltype').value,
    };
}

function validateCellInput() {
    const result = validateTowerFields({
        lat: el('inp_lat').value,
        lon: el('inp_lon').value,
        radius: el('inp_radius').value,
        angle1: el('angle1').value,
        angle2: el('angle2').value,
        ...readIdentityInput(),
    });
    if (!result.valid) {
        alert(result.errors.join('\n'));
    }
    return result.valid;
}

function createFeatureFromInput() {
    const lat = parseFloat(el('inp_lat').value);
    const lon = parseFloat(el('inp_lon').value);
    var angolo1 = el('angle1');
    var angolo2 = el('angle2');
    var name = el('inp_name');
    var desc = el('inp_desc');
    var radius = el('inp_radius');
    var fillcolor = el('inp_fill');
    var alpha = el('inp_alpha');

    const { marker, sectors } = buildTowerFeature({
        lon,
        lat,
        radius: radius.value,
        angle1: angolo1.value,
        angle2: angolo2.value,
        name: name.value,
        description: desc.value,
        fill: fillcolor.value,
        opacity: alpha.value,
        gradient: el('inp_gradient').checked,
        rings: el('inp_rings').checked,
        ...readIdentityInput(),
    });
    resetForm();

    return [marker, sectors];
}

function resetForm() {
    el('inp_lat').value = '';
    el('inp_lon').value = '';
    el('angle1').value = '0';
    el('angle2').value = '360';
    el('inp_name').value = '';
    el('inp_desc').value = '';
    el('inp_radius').value = '3';
    el('inp_fill').value = '#FF0000';
    el('inp_alpha').value = '0.2';
    el('inp_gradient').checked = false;
    el('inp_rings').checked = false;
    clearIdentity();
    el('feature-id').value = '';
    el('inp_icon').tomselect.clear();
}

// The dialog serves both feature types, and the two have disjoint extra fields:
// a cell has a network identity, a POI has an icon. Hide the set that does not
// apply rather than showing it disabled — four dead inputs on every POI is a lot
// of dialog to scroll past, and `hidden` (unlike a disabled input) also takes the
// fields out of the tab order.
function showCellFields(isCell) {
    el('cell-identity').hidden = !isCell;
    el('icon-line').hidden = isCell;
}

function clearIdentity() {
    el('inp_mcc').value = '';
    el('inp_mnc').value = '';
    el('inp_lac').value = '';
    el('inp_cellid').value = '';
    el('inp_celltype').value = '';
}

function loadIdentity(properties) {
    el('inp_mcc').value = properties.mcc || '';
    el('inp_mnc').value = properties.mnc || '';
    el('inp_lac').value = properties.lac || '';
    el('inp_cellid').value = properties.cellId || '';
    el('inp_celltype').value = properties.cellType || '';
}

function loadForm(feature) {
    var lat = el('inp_lat');
    var lon = el('inp_lon');
    var angolo1 = el('angle1');
    var angolo2 = el('angle2');
    var name = el('inp_name');
    var desc = el('inp_desc');
    var radius = el('inp_radius');
    var fillcolor = el('inp_fill');
    var alpha = el('inp_alpha');
    var feat_id = el('feature-id');
    var icn = el('inp_icon');
    var gradient = el('inp_gradient');
    var rings = el('inp_rings');

    if (feature.properties.marker && feature.properties.marker == 'cell') {
        //if cell feature load all previus fields
        angolo1.value = feature.properties.Angle1;
        angolo2.value = feature.properties.Angle2;
        radius.value = feature.properties.Radius;
        gradient.checked = Boolean(feature.properties.gradient);
        rings.checked = Boolean(feature.properties.rings);
        radius.disabled = false;
        angolo1.disabled = false;
        angolo2.disabled = false;
        gradient.disabled = false;
        rings.disabled = false;
        showCellFields(true);
        loadIdentity(feature.properties);
        pendingSaveHandler = modificaCella;
    } else {
        //if marker is a PoI feature disable sector related fields
        radius.disabled = true;
        angolo1.disabled = true;
        angolo2.disabled = true;
        gradient.disabled = true;
        rings.disabled = true;
        showCellFields(false);
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
    var feature_id = el('feature-id').value;
    var feature = draw.get(feature_id);
    var lat = el('inp_lat');
    var lon = el('inp_lon');
    var name = el('inp_name');
    var desc = el('inp_desc');
    var fillcolor = el('inp_fill');
    var alpha = el('inp_alpha');
    feature.properties.name = name.value;
    feature.properties.description = desc.value;
    feature.properties.fill = fillcolor.value;
    feature.properties.opacity = parseFloat(alpha.value);
    if (feature.geometry.type === 'Point') {
        feature.geometry.coordinates[0] = parseFloat(lon.value);
        feature.geometry.coordinates[1] = parseFloat(lat.value);
    }
    if (!(feature.properties.marker && feature.properties.marker == 'cell')) {
        var icon_select = el('inp_icon');
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
    var feature_id = el('feature-id').value;

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

// A field is out of reach when it, or anything it sits inside, is hidden. The
// dialog hides things at both levels: the add/save buttons toggle their own
// inline `display`, while the icon row and the identity block are hidden as
// whole groups — so checking only the field itself would leave the fields of a
// hidden group in the list, and Tab would land focus on nothing.
function isHidden(node, container) {
    for (let n = node; n && n !== container; n = n.parentElement) {
        if (n.hidden || n.style.display === 'none') return true;
    }
    return false;
}

// Every element inside the dialog that Tab can reach: standard focusable tags, minus
// the hidden `#feature-id` input, anything currently disabled or hidden (see above),
// or opted out with `tabindex="-1"`.
function getFocusableElements() {
    const container = el('inputs');
    const candidates = container.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]',
    );
    return Array.from(candidates).filter(
        (node) => !node.disabled && !isHidden(node, container) && node.tabIndex !== -1,
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
        el('savebtn').style.display = 'inline-block';
        el('addbtn').style.display = 'none';
    } else {
        //change button to add instead of save
        el('savebtn').style.display = 'none';
        el('addbtn').style.display = 'inline-block';
        // "Add cell" only ever creates a cell, so it gets the cell field set.
        showCellFields(true);
        // The rest of the dialog deliberately keeps its last values, which makes
        // entering a row of similar cells quick. An identity must not be sticky
        // the same way: a CGI names one cell, and silently copying the previous
        // one onto the next tower would be a wrong answer, not a shortcut.
        clearIdentity();
    }
    el('inputs').style.display = 'block';
    // dialog a11y: allow Escape to close, and move focus into the dialog
    document.addEventListener('keydown', onDialogKeydown);
    el('inp_name').focus();
}

export function closeForm() {
    // Closing ends the edit: drop the handler so a later submit can't fire against
    // the feature that was being edited two dialogs ago.
    pendingSaveHandler = null;
    el('inputs').style.display = 'none';
    el('savebtn').style.display = 'none';
    el('addbtn').style.display = 'inline-block';
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

/**
 * Load an existing feature into the form and open it in edit mode. loadForm picks
 * the field set (cell vs POI) and the save handler from the feature itself, so
 * both entry points — the row pencil and a POI just drawn on the map — go through
 * exactly the same path.
 * @param {object} marker A feature from the Draw store.
 */
export function editFeature(marker) {
    loadForm(marker);
    openForm(marker);
}

// A row's "edit" (pencil) button loads that feature into the form and opens it.
setRowEditHandler(editFeature);
