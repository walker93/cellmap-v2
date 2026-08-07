import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// The map/draw handlers are mostly glue, but draw.create now decides whether to
// open the edit form, and that decision is worth pinning down: only a drawn Point
// is a POI, while lines and polygons are measurement geometry.
const mocks = vi.hoisted(() => ({
    editFeature: vi.fn(),
    createTable: vi.fn(),
}));

vi.mock('./ui/form.js', () => ({ editFeature: mocks.editFeature }));
vi.mock('./ui/table.js', () => ({
    createTable: mocks.createTable,
    setRowEditHandler: vi.fn(),
}));

// Handlers registered by registerMapEvents, keyed by event name.
const handlers = new Map();
let drawStore;

beforeAll(async () => {
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return {
                // map.on is called both as (event, fn) and as (event, layers, fn).
                on(event, ...rest) {
                    handlers.set(event, rest[rest.length - 1]);
                },
                addControl() {},
                addSource() {},
                addLayer() {},
                getSource: () => ({ setData() {} }),
                getCanvas: () => ({ style: {} }),
            };
        },
        Popup: function () {
            return { setLngLat: () => ({ setHTML: () => ({ addTo() {} }) }) };
        },
    });
    vi.stubGlobal('MapboxDraw', function () {
        return {
            add(feature) {
                drawStore.set(feature.id, JSON.parse(JSON.stringify(feature)));
                return [feature.id];
            },
            get: (id) => {
                const found = drawStore.get(id);
                return found ? JSON.parse(JSON.stringify(found)) : undefined;
            },
            getAll: () => ({ type: 'FeatureCollection', features: [...drawStore.values()] }),
        };
    });
    const { registerMapEvents } = await import('./mapEvents.js');
    registerMapEvents();
});

function place(id, geometry) {
    drawStore.set(id, { id, type: 'Feature', properties: {}, geometry });
    handlers.get('draw.create')({ features: [{ id }] });
}

const point = { type: 'Point', coordinates: [9, 45] };

describe('draw.create', () => {
    beforeEach(() => {
        drawStore = new Map();
        mocks.editFeature.mockClear();
        mocks.createTable.mockClear();
    });

    it('applies the fill/opacity defaults and refreshes the sidebar', () => {
        place('p1', point);
        expect(drawStore.get('p1').properties).toMatchObject({ fill: '#ff0000', opacity: 0.2 });
        expect(mocks.createTable).toHaveBeenCalledTimes(1);
    });

    it('opens the form on a drawn point', () => {
        place('p1', point);
        expect(mocks.editFeature).toHaveBeenCalledTimes(1);
    });

    it('passes the stored feature, defaults included, to the form', () => {
        place('p1', point);
        const [feature] = mocks.editFeature.mock.calls[0];
        expect(feature.id).toBe('p1');
        // The form reads properties.fill for the colour input, so it has to be
        // handed the feature as re-read from the store, not the pre-default one.
        expect(feature.properties.fill).toBe('#ff0000');
        expect(feature.properties.opacity).toBe(0.2);
    });

    it('leaves lines and polygons to the sidebar pencil', () => {
        place('l1', { type: 'LineString', coordinates: [[9, 45], [9.1, 45.1]] });
        place('a1', {
            type: 'Polygon',
            coordinates: [[[9, 45], [9.1, 45], [9.1, 45.1], [9, 45]]],
        });
        expect(mocks.editFeature).not.toHaveBeenCalled();
        // ...but they still get the defaults and a sidebar refresh.
        expect(drawStore.get('l1').properties.fill).toBe('#ff0000');
        expect(mocks.createTable).toHaveBeenCalledTimes(2);
    });
});
