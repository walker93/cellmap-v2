import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// form.js transitively imports map.js and draw.js (which construct Mapbox objects
// from CDN globals at module-eval time) and table.js. Stub the globals before
// importing so the graph loads under jsdom. draw.add returns a fixed id so
// aggiungiCella can link the sector to it.
let form;
let draw;
let getSectors, clearSectors;

beforeAll(async () => {
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return {
                on() {},
                addControl() {},
                addSource() {},
                addLayer() {},
                getSource() {
                    return { setData() {} };
                },
                getCanvas() {
                    return { style: {} };
                },
                getFilter: () => ['all'],
                setFilter() {},
                flyTo() {},
                fitBounds() {},
            };
        },
        LngLatBounds: function () {},
    });
    vi.stubGlobal('MapboxDraw', function () {
        return {
            add: () => ['t1'],
            get: (id) => ({ id, properties: {} }),
            getAll: () => ({ type: 'FeatureCollection', features: [] }),
            delete() {},
            deleteAll() {},
        };
    });
    form = await import('./form.js');
    ({ draw } = await import('../draw.js'));
    ({ getSectors, clearSectors } = await import('../sectors.js'));
});

function tomselectStub() {
    return { disable() {}, enable() {}, clear() {}, setValue() {} };
}

beforeEach(() => {
    clearSectors();
    document.body.innerHTML = `
        <div id="inputs" style="display:none">
            <input id="inp_name"><input id="inp_desc">
            <input id="inp_lat"><input id="inp_lon">
            <input id="inp_radius"><input id="angle1"><input id="angle2">
            <input id="inp_alpha"><input id="inp_fill">
            <input type="checkbox" id="inp_gradient">
            <div id="cell-identity">
                <input id="inp_mcc"><input id="inp_mnc">
                <input id="inp_lac"><input id="inp_cellid">
                <select id="inp_celltype">
                    <option value="" selected></option>
                    <option value="macro"></option>
                    <option value="femto"></option>
                </select>
            </div>
            <div class="line" id="icon-line"><select id="inp_icon"></select></div>
            <input type="hidden" id="feature-id">
            <button id="cancelbtn"></button>
            <button id="addbtn" style="display:inline-block"></button>
            <button id="savebtn" style="display:none"></button>
        </div>
        <div id="features"></div><div id="poi"></div><div id="overlays"></div>`;
    document.getElementById('inp_icon').tomselect = tomselectStub();
    // The form keeps its pending-save handler in module state; closing clears it,
    // so every case starts from "nothing is being edited" whatever ran before.
    form.closeForm();
});

afterEach(() => vi.restoreAllMocks());

function fillValidTower() {
    document.getElementById('inp_lat').value = '45.46';
    document.getElementById('inp_lon').value = '9.19';
    document.getElementById('inp_radius').value = '2';
    document.getElementById('angle1').value = '-60';
    document.getElementById('angle2').value = '60';
    document.getElementById('inp_name').value = 'Tower A';
    document.getElementById('inp_desc').value = '';
    document.getElementById('inp_fill').value = '#ff0000';
    document.getElementById('inp_alpha').value = '0.2';
}

describe('openForm / closeForm', () => {
    it('openForm(null) shows the panel in "add" mode', () => {
        form.openForm(null);
        expect(document.getElementById('inputs').style.display).toBe('block');
        expect(document.getElementById('addbtn').style.display).toBe('inline-block');
        expect(document.getElementById('savebtn').style.display).toBe('none');
    });

    it('openForm(marker) shows the panel in "save/edit" mode', () => {
        form.openForm({ properties: {}, geometry: { type: 'Point', coordinates: [0, 0] } });
        expect(document.getElementById('inputs').style.display).toBe('block');
        expect(document.getElementById('savebtn').style.display).toBe('inline-block');
        expect(document.getElementById('addbtn').style.display).toBe('none');
    });

    it('closeForm hides the panel', () => {
        form.openForm(null);
        form.closeForm();
        expect(document.getElementById('inputs').style.display).toBe('none');
    });

    it('moves focus into the dialog (first field) when opened', () => {
        form.openForm(null);
        expect(document.activeElement).toBe(document.getElementById('inp_name'));
    });

    it('closes on the Escape key', () => {
        form.openForm(null);
        document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape' }));
        expect(document.getElementById('inputs').style.display).toBe('none');
    });

    it('restores focus to the opener when closed', () => {
        const opener = document.createElement('button');
        document.body.appendChild(opener);
        opener.focus();
        form.openForm(null);
        form.closeForm();
        expect(document.activeElement).toBe(opener);
    });

    it('traps Tab: wraps from the last focusable element back to the first', () => {
        form.openForm(null);
        document.getElementById('addbtn').focus(); // last focusable in "add" mode
        const event = new window.KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(event);
        expect(document.activeElement).toBe(document.getElementById('inp_name'));
        expect(event.defaultPrevented).toBe(true);
    });

    it('traps Shift+Tab: wraps from the first focusable element back to the last', () => {
        form.openForm(null);
        document.getElementById('inp_name').focus(); // first focusable
        const event = new window.KeyboardEvent('keydown', {
            key: 'Tab',
            shiftKey: true,
            cancelable: true,
        });
        document.dispatchEvent(event);
        expect(document.activeElement).toBe(document.getElementById('addbtn'));
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves a Tab in the middle of the dialog to the browser default', () => {
        form.openForm(null);
        document.getElementById('inp_lat').focus();
        const event = new window.KeyboardEvent('keydown', { key: 'Tab', cancelable: true });
        document.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(false);
    });
});

describe('aggiungiCella', () => {
    it('adds a tower + its sector and closes the form on valid input', () => {
        form.openForm(null);
        fillValidTower();
        form.aggiungiCella();
        expect(getSectors().features).toHaveLength(1);
        expect(getSectors().features[0].properties.towerid).toBe('t1');
        expect(document.getElementById('inputs').style.display).toBe('none');
    });

    it('rejects blank coordinates without adding anything', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        form.openForm(null);
        fillValidTower();
        document.getElementById('inp_lat').value = ''; // invalid
        form.aggiungiCella();
        expect(alertSpy).toHaveBeenCalled();
        expect(getSectors().features).toHaveLength(0);
    });
});

// The entry point shared by the sidebar pencil and by mapEvents when a POI has
// just been drawn on the map.
describe('editFeature', () => {
    const poi = () => ({
        id: 'poi-1',
        properties: {
            name: 'Bar',
            description: "all'angolo",
            fill: '#00ff00',
            opacity: 0.5,
            icon: 'usr_bar',
        },
        geometry: { type: 'Point', coordinates: [9.19, 45.46] },
    });

    const cell = () => ({
        id: 't1',
        properties: { marker: 'cell', Angle1: -60, Angle2: 60, Radius: 2, fill: '#ff0000' },
        geometry: { type: 'Point', coordinates: [9.19, 45.46] },
    });

    it('opens a POI in edit mode with the icon picker shown', () => {
        form.editFeature(poi());
        expect(document.getElementById('inputs').style.display).toBe('block');
        expect(document.getElementById('savebtn').style.display).toBe('inline-block');
        expect(document.getElementById('addbtn').style.display).toBe('none');
        expect(document.getElementById('icon-line').hidden).toBe(false);
        // a POI has no network identity
        expect(document.getElementById('cell-identity').hidden).toBe(true);
        // sector geometry is meaningless for a POI
        expect(document.getElementById('inp_radius').disabled).toBe(true);
        expect(document.getElementById('angle1').disabled).toBe(true);
        expect(document.getElementById('angle2').disabled).toBe(true);
    });

    it('fills the fields from the feature', () => {
        form.editFeature(poi());
        expect(document.getElementById('inp_name').value).toBe('Bar');
        expect(document.getElementById('inp_desc').value).toBe("all'angolo");
        expect(document.getElementById('inp_lon').value).toBe('9.19');
        expect(document.getElementById('inp_lat').value).toBe('45.46');
        expect(document.getElementById('inp_fill').value).toBe('#00ff00');
        expect(document.getElementById('inp_alpha').value).toBe('0.5');
        expect(document.getElementById('feature-id').value).toBe('poi-1');
    });

    it('keeps the sector fields for a cell and hides the icon picker', () => {
        form.editFeature(cell());
        expect(document.getElementById('inp_radius').disabled).toBe(false);
        expect(document.getElementById('angle1').value).toBe('-60');
        expect(document.getElementById('angle2').value).toBe('60');
        expect(document.getElementById('inp_radius').value).toBe('2');
        expect(document.getElementById('icon-line').hidden).toBe(true);
        expect(document.getElementById('cell-identity').hidden).toBe(false);
    });

    it('disables the coordinates for a non-Point geometry', () => {
        form.editFeature({
            id: 'l1',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: [
                    [9, 45],
                    [9.1, 45.1],
                ],
            },
        });
        expect(document.getElementById('inp_lat').disabled).toBe(true);
        expect(document.getElementById('inp_lon').disabled).toBe(true);
    });
});

// The optional network identity of a cell: recorded on the tower marker, read
// back into the dialog, and never silently carried over to the next tower.
describe('cell identity', () => {
    const identified = () => ({
        id: 't1',
        properties: {
            marker: 'cell',
            Angle1: -60,
            Angle2: 60,
            Radius: 2,
            fill: '#ff0000',
            cellId: '21437',
            lac: '4501',
            mcc: '222',
            mnc: '01',
            cellType: 'macro',
        },
        geometry: { type: 'Point', coordinates: [9.19, 45.46] },
    });

    function fillIdentity() {
        document.getElementById('inp_mcc').value = '222';
        document.getElementById('inp_mnc').value = '01';
        document.getElementById('inp_lac').value = '4501';
        document.getElementById('inp_cellid').value = '21437';
        document.getElementById('inp_celltype').value = 'macro';
    }

    it('writes the identity onto the tower it creates', () => {
        const added = vi.spyOn(draw, 'add');
        form.openForm(null);
        fillValidTower();
        fillIdentity();
        form.aggiungiCella();
        expect(added.mock.calls[0][0].properties).toMatchObject({
            cellId: '21437',
            lac: '4501',
            mcc: '222',
            mnc: '01',
            cellType: 'macro',
        });
    });

    it('reads the identity back into the dialog when editing that tower', () => {
        form.editFeature(identified());
        expect(document.getElementById('inp_mcc').value).toBe('222');
        expect(document.getElementById('inp_mnc').value).toBe('01');
        expect(document.getElementById('inp_lac').value).toBe('4501');
        expect(document.getElementById('inp_cellid').value).toBe('21437');
        expect(document.getElementById('inp_celltype').value).toBe('macro');
    });

    it('blanks the fields for a tower that has no identity', () => {
        form.editFeature(identified());
        form.editFeature({ ...identified(), properties: { marker: 'cell', Radius: 2 } });
        expect(document.getElementById('inp_cellid').value).toBe('');
        expect(document.getElementById('inp_celltype').value).toBe('');
    });

    // A CGI names one cell. The rest of the dialog stays sticky between towers on
    // purpose; this must not, or "Add cell" twice in a row would produce two
    // towers claiming the same identity.
    it('does not carry an identity over to the next new cell', () => {
        form.editFeature(identified());
        form.closeForm();
        form.openForm(null);
        expect(document.getElementById('inp_cellid').value).toBe('');
        expect(document.getElementById('inp_mcc').value).toBe('');
    });

    it('refuses to add a tower whose identity is malformed', () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        form.openForm(null);
        fillValidTower();
        fillIdentity();
        document.getElementById('inp_mnc').value = ''; // half a PLMN
        form.aggiungiCella();
        expect(alertSpy).toHaveBeenCalled();
        expect(getSectors().features).toHaveLength(0);
    });
});

describe('submitEditForm', () => {
    it('is a no-op when no feature is being edited', () => {
        expect(() => form.submitEditForm()).not.toThrow();
    });
});
