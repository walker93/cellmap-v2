import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

// form.js transitively imports map.js and draw.js (which construct Mapbox objects
// from CDN globals at module-eval time) and table.js. Stub the globals before
// importing so the graph loads under jsdom. draw.add returns a fixed id so
// aggiungiCella can link the sector to it.
let form;
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
            <select id="inp_icon"></select>
            <input type="hidden" id="feature-id">
            <button id="cancelbtn"></button>
            <button id="addbtn" style="display:inline-block"></button>
            <button id="savebtn" style="display:none"></button>
        </div>
        <div id="features"></div><div id="poi"></div><div id="overlays"></div>`;
    document.getElementById('inp_icon').tomselect = tomselectStub();
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

describe('submitEditForm', () => {
    it('is a no-op when no feature is being edited', () => {
        expect(() => form.submitEditForm()).not.toThrow();
    });
});
