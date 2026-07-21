import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

let deleteAll, map;
let sectors, hidden, overlays;

beforeAll(async () => {
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return {
                on() {},
                addControl() {},
                addSource() {},
                addLayer() {},
                getSource: () => ({ setData() {} }),
                getCanvas: () => ({ style: {} }),
                removeLayer() {},
                removeSource() {},
            };
        },
    });
    vi.stubGlobal('MapboxDraw', function () {
        return { deleteAll() {}, getAll: () => ({ type: 'FeatureCollection', features: [] }) };
    });
    ({ deleteAll } = await import('./reset.js'));
    ({ map } = await import('./map.js'));
    sectors = await import('./sectors.js');
    hidden = await import('./hiddenPois.js');
    overlays = await import('./overlays.js');
});

beforeEach(() => {
    document.body.innerHTML =
        '<div id="features"></div><div id="poi"></div><div id="overlays"></div>';
    sectors.clearSectors();
    hidden.clearHiddenPois();
    overlays.clearOverlays();
});

describe('deleteAll', () => {
    it('clears sectors, hidden POIs and overlays', () => {
        sectors.addSector({ type: 'Feature', properties: { towerid: 't1' }, geometry: { type: 'Polygon', coordinates: [] } });
        hidden.addHiddenPoi({ id: 'p1', properties: {} });
        overlays.addOverlay({ ID: 5, file: 'o.kmz' });

        deleteAll();

        expect(sectors.getSectors().features).toHaveLength(0);
        expect(hidden.getHiddenPois()).toHaveLength(0);
        expect(overlays.getOverlays()).toHaveLength(0);
    });

    it("removes each overlay's map layer and source", () => {
        const removeLayer = vi.spyOn(map, 'removeLayer');
        const removeSource = vi.spyOn(map, 'removeSource');
        overlays.addOverlay({ ID: 42, file: 'o.kmz' });

        deleteAll();

        expect(removeLayer).toHaveBeenCalledWith('overlay-layer-42');
        expect(removeSource).toHaveBeenCalledWith('overlay-source-42');
        removeLayer.mockRestore();
        removeSource.mockRestore();
    });
});
