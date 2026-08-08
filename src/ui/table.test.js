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
        const store = new Map();
        let counter = 0;
        return {
            getAll: () => ({ type: 'FeatureCollection', features: [...store.values()] }),
            add(feature) {
                const id = feature.id || `generated-${++counter}`;
                // Real MapboxDraw stores its own normalized copy, not the object
                // reference passed in — clone so mutating a `.get()` result can't
                // alias the stored feature (matches real Draw semantics).
                store.set(id, JSON.parse(JSON.stringify({ ...feature, id })));
                return [id];
            },
            get(id) {
                const feature = store.get(id);
                return feature ? JSON.parse(JSON.stringify(feature)) : undefined;
            },
            delete(id) {
                store.delete(id);
            },
            deleteAll() {
                store.clear();
            },
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
    properties: {
        marker: 'cell',
        name: 'Tower A',
        Angle1: 0,
        Angle2: 90,
        Radius: 2,
        fill: '#ff0000',
    },
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
            createTable({ type: 'FeatureCollection', features: [tower, poi] }),
        ).not.toThrow();
    });

    it('routes cell features to the tower table and others to the POI table', () => {
        createTable({ type: 'FeatureCollection', features: [tower, poi] });
        expect(document.querySelectorAll('#features .table-element')).toHaveLength(1);
        expect(document.querySelectorAll('#poi .table-element')).toHaveLength(1);
    });

    it('gives each row a11y action buttons (real <button> with aria-label, decorative icon)', () => {
        createTable({ type: 'FeatureCollection', features: [tower] });
        const btnCol = document.querySelector('#features .table-element .btn-col');
        expect(btnCol).not.toBeNull();
        // locate, hide/show, duplicate, edit, delete
        const buttons = btnCol.querySelectorAll('button.icon-btn');
        expect(buttons).toHaveLength(5);
        for (const b of buttons) {
            expect(b.getAttribute('aria-label')).toBeTruthy();
            expect(b.querySelector('i').getAttribute('aria-hidden')).toBe('true');
        }
        const labels = [...buttons].map((b) => b.getAttribute('aria-label'));
        expect(labels).toEqual(['Locate', 'Hide', 'Duplicate', 'Edit', 'Delete']);
    });

    // An operator's cell list often has no name column, and a sidebar of rows all
    // reading "Unnamed" is unusable — the Cell ID is what tells them apart.
    it('names an unnamed tower after its Cell ID when it has one', () => {
        const unnamed = { ...tower, properties: { ...tower.properties, name: '', cellId: '21437' } };
        createTable({ type: 'FeatureCollection', features: [unnamed] });
        expect(document.querySelector('#features .col-name').innerText).toBe('Cell 21437');
    });

    it('falls back to "Unnamed" when there is neither a name nor a Cell ID', () => {
        const unnamed = { ...tower, properties: { ...tower.properties, name: undefined } };
        createTable({ type: 'FeatureCollection', features: [unnamed] });
        expect(document.querySelector('#features .col-name').innerText).toBe('Unnamed');
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
        const editBtn = [...document.querySelectorAll('#features .btn-col button')].find(
            (b) => b.getAttribute('aria-label') === 'Edit',
        );
        editBtn.click();
        expect(onEdit).toHaveBeenCalledWith(tower);
    });

    it('keeps properties.id in sync with the new draw id when duplicating a tower', async () => {
        const { draw } = await import('../draw.js');
        // Mimic aggiungiCella (src/ui/form.js): properties.id is kept equal to the
        // draw feature id right after creation.
        const id1 = draw.add({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [9.19, 45.46] },
            properties: {
                marker: 'cell',
                name: 'A',
                Angle1: 0,
                Angle2: 90,
                Radius: 2,
                fill: '#ff0000',
            },
        })[0];
        const t1 = draw.get(id1);
        t1.properties.id = id1;
        draw.add(t1);

        createTable(draw.getAll());
        const dupBtn = [...document.querySelectorAll('#features .btn-col button')].find(
            (b) => b.getAttribute('aria-label') === 'Duplicate',
        );
        dupBtn.click();

        const all = draw.getAll().features;
        expect(all).toHaveLength(2);
        // Regression guard: previously the duplicate kept the ORIGINAL's
        // properties.id, so the show/hide filter (which matches on properties.id)
        // hid both towers when toggling either one.
        for (const feature of all) {
            expect(feature.properties.id).toBe(feature.id);
        }
        expect(all[0].properties.id).not.toBe(all[1].properties.id);
    });
});
