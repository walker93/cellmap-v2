import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// towerState.js imports map.js and draw.js, which construct a Mapbox map and a
// MapboxDraw control at module-eval time from CDN globals. Stub both with small
// in-memory fakes that behave like the real thing closely enough to exercise the
// sync rules: MapboxDraw clones on get/add (so mutating a `.get()` result can't
// alias the stored feature), and the map fake tracks per-layer filters so
// setTowerHidden's filter-array bookkeeping can be asserted on.
let towerState;
let getSectors, clearSectors, getSectorsByTowerId;
let getHiddenPois, clearHiddenPois;
let draw, map;

beforeAll(async () => {
    const filters = {};
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
                getFilter(layerId) {
                    return filters[layerId];
                },
                setFilter(layerId, filter) {
                    filters[layerId] = filter;
                },
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

    towerState = await import('./towerState.js');
    ({ getSectors, clearSectors, getSectorsByTowerId } = await import('./sectors.js'));
    ({ getHiddenPois, clearHiddenPois } = await import('./hiddenPois.js'));
    ({ draw } = await import('./draw.js'));
    ({ map } = await import('./map.js'));
});

beforeEach(() => {
    clearSectors();
    clearHiddenPois();
    draw.deleteAll();
    map.setFilter('markers', undefined);
    map.setFilter('sectors', undefined);
});

function towerMarker(overrides = {}) {
    return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [9.19, 45.46] },
        properties: {
            marker: 'cell',
            name: 'Tower A',
            Angle1: 0,
            Angle2: 90,
            Radius: 2,
            ...overrides,
        },
    };
}

function sectorFor(towerid) {
    return {
        type: 'Feature',
        properties: { marker: 'cell', name: 'Tower A', towerid },
        geometry: { type: 'Polygon', coordinates: [] },
    };
}

describe('addTower', () => {
    it('links the marker and sector, and keeps properties.id equal to the new draw id', () => {
        const id = towerState.addTower(towerMarker(), sectorFor(undefined));
        const stored = draw.get(id);
        expect(stored.properties.id).toBe(id);
        expect(getSectors().features).toHaveLength(1);
        expect(getSectors().features[0].properties.towerid).toBe(id);
    });

    it('reuses an existing id when editing a tower in place', () => {
        const id = towerState.addTower(towerMarker(), sectorFor(undefined));
        const updated = towerState.addTower(
            towerMarker({ name: 'Renamed' }),
            sectorFor(undefined),
            id,
        );
        expect(updated).toBe(id);
        expect(draw.get(id).properties.name).toBe('Renamed');
    });
});

describe('duplicateTower', () => {
    it('gives the duplicate its own id in both draw and properties.id — regression guard', () => {
        const originalId = towerState.addTower(towerMarker(), sectorFor(undefined));
        const newId = towerState.duplicateTower(originalId);

        expect(newId).not.toBe(originalId);
        const original = draw.get(originalId);
        const duplicate = draw.get(newId);
        // This is exactly the bug reported manually: before the fix, the duplicate's
        // properties.id stayed equal to the original's, so the show/hide filter (which
        // matches on properties.id) affected both towers when toggling either one.
        expect(original.properties.id).toBe(originalId);
        expect(duplicate.properties.id).toBe(newId);
        expect(duplicate.properties.id).not.toBe(original.properties.id);
    });

    it('duplicates the coverage sector relinked to the new tower id', () => {
        const originalId = towerState.addTower(towerMarker(), sectorFor(undefined));
        const newId = towerState.duplicateTower(originalId);

        expect(getSectors().features).toHaveLength(2);
        expect(getSectorsByTowerId(newId)).toHaveLength(1);
        expect(getSectorsByTowerId(originalId)).toHaveLength(1);
    });
});

describe('setTowerHidden', () => {
    it('hides only the targeted tower, not others sharing the layer', () => {
        const idA = towerState.addTower(towerMarker(), sectorFor(undefined));
        const idB = towerState.addTower(towerMarker(), sectorFor(undefined));

        towerState.setTowerHidden(idA, true);

        expect(draw.get(idA).properties.hidden).toBe(true);
        expect(draw.get(idB).properties.hidden).toBeUndefined();
        expect(map.getFilter('markers')).toEqual(['all', ['!=', ['get', 'id'], idA]]);
        expect(map.getFilter('sectors')).toEqual(['all', ['!=', ['get', 'towerid'], idA]]);
    });

    it('un-hides by removing its filter entry, leaving other exclusions intact', () => {
        const idA = towerState.addTower(towerMarker(), sectorFor(undefined));
        const idB = towerState.addTower(towerMarker(), sectorFor(undefined));
        towerState.setTowerHidden(idA, true);
        towerState.setTowerHidden(idB, true);

        towerState.setTowerHidden(idA, false);

        expect(map.getFilter('markers')).toEqual(['all', ['!=', ['get', 'id'], idB]]);
    });
});

describe('hidePoi / showPoi', () => {
    it('moves a POI out of draw and into the hidden list, and back', () => {
        const poi = {
            id: 'poi-1',
            properties: {},
            geometry: { type: 'Point', coordinates: [0, 0] },
        };
        draw.add(poi);

        towerState.hidePoi(poi);
        expect(draw.get('poi-1')).toBeUndefined();
        expect(getHiddenPois()).toHaveLength(1);

        towerState.showPoi(poi);
        expect(draw.get('poi-1')).not.toBeUndefined();
        expect(getHiddenPois()).toHaveLength(0);
    });
});

describe('duplicatePoi', () => {
    it('adds a copy under a new id', () => {
        const poi = {
            id: 'poi-1',
            properties: { name: 'A' },
            geometry: { type: 'Point', coordinates: [0, 0] },
        };
        draw.add(poi);

        const newId = towerState.duplicatePoi('poi-1');

        expect(newId).not.toBe('poi-1');
        expect(draw.getAll().features).toHaveLength(2);
    });
});

describe('removeFeature', () => {
    it('removes a tower, its sector, and any hidden-POI entry together', () => {
        const id = towerState.addTower(towerMarker(), sectorFor(undefined));

        towerState.removeFeature(id);

        expect(draw.get(id)).toBeUndefined();
        expect(getSectorsByTowerId(id)).toHaveLength(0);
    });

    it('drops a hidden POI from the hidden list when deleted', () => {
        const poi = {
            id: 'poi-1',
            properties: {},
            geometry: { type: 'Point', coordinates: [0, 0] },
        };
        draw.add(poi);
        towerState.hidePoi(poi);
        expect(getHiddenPois()).toHaveLength(1);

        towerState.removeFeature('poi-1');

        expect(getHiddenPois()).toHaveLength(0);
    });
});
