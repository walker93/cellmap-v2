import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// table.js transitively imports map.js and draw.js, which construct a Mapbox map
// and a MapboxDraw control at module-eval time from CDN globals. Stub those before
// importing so the module graph loads under jsdom.
let createTable, setRowEditHandler;

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
                getFilter() {
                    return ['all'];
                },
                setFilter() {},
                flyTo() {},
                fitBounds() {},
            };
        },
        LngLatBounds: function () {},
    });
    vi.stubGlobal('MapboxDraw', function () {
        return {
            getAll: () => ({ type: 'FeatureCollection', features: [] }),
            add() {},
            get() {},
            delete() {},
            deleteAll() {},
        };
    });
    const mod = await import('./table.js');
    createTable = mod.createTable;
    setRowEditHandler = mod.setRowEditHandler;
});

beforeEach(() => {
    document.body.innerHTML =
        '<div id="features"></div><div id="poi"></div><div id="overlays"></div>';
});

const tower = {
    id: 'tower-1',
    geometry: { type: 'Point', coordinates: [9.19, 45.46] },
    properties: { marker: 'cell', name: 'Tower A', Angle1: 0, Angle2: 90, Radius: 2, fill: '#ff0000' },
};
const poi = {
    id: 'poi-1',
    geometry: { type: 'Point', coordinates: [9.2, 45.5] },
    properties: { name: 'A POI', fill: '#00ff00' },
};

describe('createTable', () => {
    it('builds rows without throwing — regression guard for the undeclared `col` bug', () => {
        // Under strict-mode modules, the old `col = ...` (never declared) threw
        // ReferenceError while building a row. This must not happen.
        expect(() =>
            createTable({ type: 'FeatureCollection', features: [tower, poi] })
        ).not.toThrow();
    });

    it('routes cell features to the tower table and others to the POI table', () => {
        createTable({ type: 'FeatureCollection', features: [tower, poi] });
        expect(document.querySelectorAll('#features .table-element')).toHaveLength(1);
        expect(document.querySelectorAll('#poi .table-element')).toHaveLength(1);
    });

    it('gives each row a button column with action icons', () => {
        createTable({ type: 'FeatureCollection', features: [tower] });
        const row = document.querySelector('#features .table-element');
        const btnCol = row.querySelector('.btn-col');
        expect(btnCol).not.toBeNull();
        // locate, hide/show, duplicate, edit, delete
        expect(btnCol.querySelectorAll('i').length).toBe(5);
    });

    it('clears and rebuilds on each call (no duplicate rows)', () => {
        createTable({ type: 'FeatureCollection', features: [tower] });
        createTable({ type: 'FeatureCollection', features: [tower] });
        expect(document.querySelectorAll('#features .table-element')).toHaveLength(1);
    });

    it('wires the edit button to the injected edit handler', () => {
        const onEdit = vi.fn();
        setRowEditHandler(onEdit);
        createTable({ type: 'FeatureCollection', features: [tower] });
        const icons = document.querySelectorAll('#features .btn-col i');
        // edit is the pen icon (4th: locate, hide, duplicate, edit)
        const pen = [...icons].find((i) => i.className.includes('fa-pen'));
        pen.dispatchEvent(new window.Event('click'));
        expect(onEdit).toHaveBeenCalledWith(tower);
    });
});
