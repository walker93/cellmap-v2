import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// The point of a project file is that what comes out equals what went in, so this
// suite writes a real archive and reads it back with the real JSZip rather than a
// stub — a hand-written zip double would only prove the double works. The app
// loads JSZip 3.6 from a CDN and the dev dependency here is 3.10; the archive
// format is the same, and this is only ever a test-time substitution.
import JSZip from 'jszip';

// saveProject/openProject own the file picker and the save dialog; the archive
// itself is the part worth pinning down, so the download layer is mocked out and
// the tests drive buildProjectArchive/loadProjectArchive directly.
const mocks = vi.hoisted(() => ({ saveFile: vi.fn(async () => true) }));
vi.mock('./download.js', () => ({ saveFile: mocks.saveFile }));

let project, drawStore, mapState;
let getOverlays, clearOverlays, getHiddenPois, clearHiddenPois, getSectors, clearSectors;
let addRasterOverlay, DEFAULT_RING_STROKE_OPACITY;

beforeAll(async () => {
    vi.stubGlobal('JSZip', JSZip);
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return {
                on() {},
                addControl() {},
                addSource(id) {
                    mapState.sources.add(id);
                },
                removeSource(id) {
                    mapState.sources.delete(id);
                },
                addLayer(layer) {
                    if (mapState.layers.has(layer.id)) {
                        throw new Error(`Layer ${layer.id} already exists`);
                    }
                    mapState.layers.set(layer.id, layer);
                },
                removeLayer(id) {
                    mapState.layers.delete(id);
                },
                getLayer: (id) => mapState.layers.get(id),
                setLayoutProperty(id, name, value) {
                    mapState.layers.get(id).layout = { [name]: value };
                },
                getSource: () => ({ setData() {} }),
                getCanvas: () => ({ style: {} }),
                getFilter: (id) => mapState.filters.get(id) || ['all'],
                setFilter: (id, filter) => mapState.filters.set(id, filter),
                fitBounds() {},
                flyTo() {},
            };
        },
        LngLatBounds: function () {},
    });
    vi.stubGlobal('MapboxDraw', function () {
        let counter = 0;
        return {
            add(featureOrCollection) {
                const features =
                    featureOrCollection.type === 'FeatureCollection'
                        ? featureOrCollection.features
                        : [featureOrCollection];
                return features.map((feature) => {
                    const id = feature.id || `generated-${++counter}`;
                    drawStore.set(id, JSON.parse(JSON.stringify({ ...feature, id })));
                    return id;
                });
            },
            get: (id) => {
                const found = drawStore.get(id);
                return found ? JSON.parse(JSON.stringify(found)) : undefined;
            },
            getAll: () => ({
                type: 'FeatureCollection',
                features: JSON.parse(JSON.stringify([...drawStore.values()])),
            }),
            delete(id) {
                drawStore.delete(id);
            },
            deleteAll() {
                drawStore.clear();
            },
        };
    });
    // jsdom has no object-URL support; the overlay code only ever passes the
    // result back to Mapbox, which is stubbed here anyway.
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:overlay', revokeObjectURL() {} });

    project = await import('./project.js');
    ({ addRasterOverlay } = await import('./kmz.js'));
    ({ getOverlays, clearOverlays } = await import('../overlays.js'));
    ({ getHiddenPois, clearHiddenPois } = await import('../hiddenPois.js'));
    ({ getSectors, clearSectors } = await import('../sectors.js'));
    ({ DEFAULT_RING_STROKE_OPACITY } = await import('../distanceRings.js'));
});

beforeEach(() => {
    drawStore = new Map();
    mapState = { sources: new Set(), layers: new Map(), filters: new Map() };
    clearOverlays();
    clearHiddenPois();
    clearSectors();
    // createTable and the "Map display" controls both get repopulated on open, so
    // the elements they write into have to exist the way they do in index.html.
    document.body.innerHTML =
        '<div id="features"></div><div id="poi"></div><div id="overlays"></div>' +
        '<select id="ring-interval"></select><input type="checkbox" id="ring-labels">' +
        '<input type="range" id="ring-opacity" min="0" max="1" step="0.01"><output id="opacity-value"></output>';
});

const tower = (id, extra = {}) => ({
    id,
    type: 'Feature',
    properties: {
        marker: 'cell',
        id,
        name: `Tower ${id}`,
        Radius: 2,
        Angle1: -60,
        Angle2: 60,
        fill: '#ff0000',
        opacity: 0.2,
        ...extra,
    },
    geometry: { type: 'Point', coordinates: [9.19, 45.46] },
});

const poi = (id, extra = {}) => ({
    id,
    type: 'Feature',
    properties: { name: `POI ${id}`, icon: 'usr_bar', fill: '#00ff00', opacity: 0.5, ...extra },
    geometry: { type: 'Point', coordinates: [9.2, 45.5] },
});

// A KMZ needs a real image entry; a few bytes are enough since nothing decodes it.
const imageBlob = () => new Blob([new Uint8Array([137, 80, 78, 71])], { type: 'image/png' });

function addOverlayFixture(name, bounds, options = {}) {
    return addRasterOverlay({ file: name, imageBlob: imageBlob(), bounds, ...options });
}

const BOUNDS_A = { north: 45.6, south: 45.4, east: 9.3, west: 9.1 };
const BOUNDS_B = { north: 46.6, south: 46.4, east: 10.3, west: 10.1 };

describe('manifest', () => {
    it('records overlay order, name and display state', () => {
        const manifest = project.buildManifest(
            [
                { file: 'a.kmz', opacity: 0.3, hidden: false },
                { file: 'b.kmz', opacity: 0.8, hidden: true },
            ],
            '2026-08-07T12:00:00.000Z',
        );
        expect(manifest.format).toBe(project.PROJECT_FORMAT);
        expect(manifest.formatVersion).toBe(project.PROJECT_FORMAT_VERSION);
        expect(manifest.savedAt).toBe('2026-08-07T12:00:00.000Z');
        expect(manifest.overlays).toEqual([
            { entry: 'overlays/0.kmz', file: 'a.kmz', opacity: 0.3, hidden: false },
            { entry: 'overlays/1.kmz', file: 'b.kmz', opacity: 0.8, hidden: true },
        ]);
    });

    it('rejects a zip that is not one of ours', () => {
        expect(() => project.readManifest({ format: 'something-else', formatVersion: 1 })).toThrow(
            /not a Cell Map Designer project/,
        );
        expect(() => project.readManifest(null)).toThrow(/not a Cell Map Designer project/);
    });

    it('refuses a format from the future instead of half-reading it', () => {
        expect(() =>
            project.readManifest({
                format: project.PROJECT_FORMAT,
                formatVersion: project.PROJECT_FORMAT_VERSION + 1,
            }),
        ).toThrow(/Update the app/);
    });

    it('rejects a missing or nonsensical version', () => {
        expect(() => project.readManifest({ format: project.PROJECT_FORMAT })).toThrow(
            /readable format version/,
        );
        expect(() =>
            project.readManifest({ format: project.PROJECT_FORMAT, formatVersion: 0 }),
        ).toThrow(/readable format version/);
    });

    it('fills in overlay defaults and drops entries with no file to read', () => {
        const manifest = project.readManifest({
            format: project.PROJECT_FORMAT,
            formatVersion: 1,
            overlays: [
                { entry: 'overlays/0.kmz' },
                { entry: 'overlays/1.kmz', opacity: 42 },
                { file: 'orphan.kmz' },
            ],
        });
        expect(manifest.overlays).toHaveLength(2);
        expect(manifest.overlays[0]).toEqual({
            entry: 'overlays/0.kmz',
            file: 'overlays/0.kmz',
            opacity: 0.3,
            hidden: false,
        });
        // out-of-range opacity falls back rather than being written to the map
        expect(manifest.overlays[1].opacity).toBe(0.3);
    });

    // Ring spacing applies to the whole map, so unlike every per-cell setting it
    // has no feature to ride along on and has to be written here.
    it('records the map-wide ring settings', () => {
        const manifest = project.buildManifest([], '2026-08-08T00:00:00.000Z', {
            interval: 0.5,
            labels: true,
            opacity: 0.8,
        });
        expect(manifest.display).toEqual({ ringInterval: 0.5, ringLabels: true, ringOpacity: 0.8 });
    });

    // Adding an optional key is why this needed no format-version bump.
    it('reads a project written before the display settings existed', () => {
        const manifest = project.readManifest({
            format: project.PROJECT_FORMAT,
            formatVersion: 1,
        });
        expect(manifest.display).toEqual({
            interval: null,
            labels: false,
            opacity: DEFAULT_RING_STROKE_OPACITY,
        });
    });

    it('ignores a ring spacing the map could not honour', () => {
        for (const bad of [0, -1, 'wide', null]) {
            const manifest = project.readManifest({
                format: project.PROJECT_FORMAT,
                formatVersion: 1,
                display: { ringInterval: bad },
            });
            expect(manifest.display.interval).toBeNull();
        }
    });
});

describe('projectFeatures', () => {
    it('includes hidden POIs, which the draw store does not hold', async () => {
        const { hidePoi } = await import('../towerState.js');
        drawStore.set('p1', poi('p1'));
        drawStore.set('p2', poi('p2'));
        hidePoi(drawStore.get('p2'));

        const collection = project.projectFeatures();
        expect(collection.features.map((f) => f.id).sort()).toEqual(['p1', 'p2']);
        expect(collection.features.find((f) => f.id === 'p2').properties.hidden).toBe(true);
    });
});

describe('archive round trip', () => {
    it('restores towers, their sectors, POIs and hidden state', async () => {
        const { hidePoi, setTowerHidden } = await import('../towerState.js');
        drawStore.set('t1', tower('t1'));
        drawStore.set('t2', tower('t2'));
        drawStore.set('p1', poi('p1'));
        drawStore.set('p2', poi('p2'));
        setTowerHidden('t2', true);
        hidePoi(drawStore.get('p2'));

        const blob = await project.buildProjectArchive('2026-08-07T12:00:00.000Z');
        drawStore = new Map(); // simulate a fresh session
        clearHiddenPois();
        clearSectors();

        await project.loadProjectArchive(blob);

        expect([...drawStore.keys()].sort()).toEqual(['p1', 't1', 't2']);
        expect(getHiddenPois().map((f) => f.id)).toEqual(['p2']);
        // sectors are derived, never stored: one is rebuilt per tower on open
        expect(
            getSectors()
                .features.map((s) => s.properties.towerid)
                .sort(),
        ).toEqual(['t1', 't2']);
        expect(drawStore.get('t1').properties.name).toBe('Tower t1');
        // the hidden tower stays in the store and is filtered out at layer level
        expect(mapState.filters.get('markers')).toEqual(['all', ['!=', ['get', 'id'], 't2']]);
    });

    it('restores the ring settings and the per-cell ring flag', async () => {
        const { setRingSettings, getRingSettings, resetRingSettings } =
            await import('../distanceRings.js');
        drawStore.set('t1', tower('t1', { rings: true }));
        drawStore.set('t2', tower('t2'));
        setRingSettings({ interval: 0.5, labels: true, opacity: 0.8 });

        const blob = await project.buildProjectArchive();
        drawStore = new Map();
        clearSectors();
        resetRingSettings();

        await project.loadProjectArchive(blob);

        expect(getRingSettings()).toEqual({ interval: 0.5, labels: true, opacity: 0.8 });
        // the slider's readout is only wired to its own oninput, so opening a
        // project has to set it explicitly or it keeps showing the old number
        expect(document.getElementById('opacity-value').value).toBe('0.80');
        expect(drawStore.get('t1').properties.rings).toBe(true);
        expect(drawStore.get('t2').properties.rings).toBeFalsy();
        // the rings themselves are derived, like the sectors: recomputed, not stored
        const zip = await JSZip.loadAsync(blob);
        const stored = JSON.parse(await zip.file('features.geojson').async('string'));
        expect(stored.features.every((f) => f.geometry.type === 'Point')).toBe(true);
    });

    // A project saved before this feature has no spacing of its own, so rather
    // than a default that may suit none of its cells it gets one measured off them.
    it('derives a ring spacing for a project that predates the setting', async () => {
        const { getRingSettings, resetRingSettings } = await import('../distanceRings.js');
        drawStore.set('t1', tower('t1', { Radius: 20 }));
        const blob = await project.buildProjectArchive();

        const zip = await JSZip.loadAsync(blob);
        const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
        delete manifest.display;
        zip.file('manifest.json', JSON.stringify(manifest));
        const legacy = await zip.generateAsync({ type: 'blob' });

        drawStore = new Map();
        clearSectors();
        resetRingSettings();
        await project.loadProjectArchive(legacy);

        expect(getRingSettings().interval).toBe(2);
    });

    it('restores overlays with their order, name, opacity and visibility', async () => {
        addOverlayFixture('planimetria.kmz', BOUNDS_A);
        addOverlayFixture('catasto.kmz', BOUNDS_B, { opacity: 0.8, hidden: true });

        const blob = await project.buildProjectArchive();
        drawStore = new Map();
        mapState = { sources: new Set(), layers: new Map(), filters: new Map() };
        clearOverlays();

        await project.loadProjectArchive(blob);

        const restored = getOverlays();
        expect(restored.map((o) => o.file)).toEqual(['planimetria.kmz', 'catasto.kmz']);
        expect(restored[0]).toMatchObject({ ...BOUNDS_A, opacity: 0.3, hidden: false });
        expect(restored[1]).toMatchObject({ ...BOUNDS_B, opacity: 0.8, hidden: true });

        const layers = [...mapState.layers.values()];
        expect(layers).toHaveLength(2);
        expect(layers[1].paint['raster-opacity']).toBe(0.8);
        expect(layers[1].layout.visibility).toBe('none');
        // ids must not collide, however fast the overlays are added back
        expect(new Set(restored.map((o) => o.ID)).size).toBe(2);
    });

    it('writes an archive with the documented layout', async () => {
        drawStore.set('t1', tower('t1'));
        addOverlayFixture('planimetria.kmz', BOUNDS_A);

        const zip = await JSZip.loadAsync(await project.buildProjectArchive());
        // 'overlays/' is the directory entry JSZip writes for the nested path.
        expect(Object.keys(zip.files).sort()).toEqual([
            'features.geojson',
            'manifest.json',
            'overlays/',
            'overlays/0.kmz',
        ]);
    });

    it('leaves every overlay entry a KMZ that can be opened on its own', async () => {
        addOverlayFixture('planimetria.kmz', BOUNDS_A);
        const { readKmz, parseLatLonBox } = await import('./kmz.js');

        const zip = await JSZip.loadAsync(await project.buildProjectArchive());
        const { kmlText } = await readKmz(await zip.file('overlays/0.kmz').async('blob'));
        expect(parseLatLonBox(kmlText)).toEqual(BOUNDS_A);
    });

    it('escapes overlay names that would otherwise break the KML', async () => {
        addOverlayFixture('rilievo <A&B>.kmz', BOUNDS_A);
        const { readKmz } = await import('./kmz.js');

        const zip = await JSZip.loadAsync(await project.buildProjectArchive());
        const { kmlText } = await readKmz(await zip.file('overlays/0.kmz').async('blob'));
        expect(kmlText).toContain('rilievo &lt;A&amp;B&gt;.kmz');
        expect(
            new DOMParser()
                .parseFromString(kmlText, 'application/xml')
                .querySelector('parsererror'),
        ).toBeNull();
    });

    it('opens an empty project', async () => {
        const blob = await project.buildProjectArchive();
        drawStore.set('leftover', poi('leftover'));

        await project.loadProjectArchive(blob);
        expect(drawStore.size).toBe(0);
        expect(getOverlays()).toHaveLength(0);
    });

    it('refuses a zip without a manifest, leaving the map alone', async () => {
        drawStore.set('t1', tower('t1'));
        const zip = new JSZip();
        zip.file('features.geojson', '{"type":"FeatureCollection","features":[]}');

        await expect(
            project.loadProjectArchive(await zip.generateAsync({ type: 'blob' })),
        ).rejects.toThrow(/no manifest.json/);
        expect(drawStore.has('t1')).toBe(true);
    });

    it('skips an overlay the manifest promises but the archive does not contain', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const zip = new JSZip();
        zip.file('features.geojson', '{"type":"FeatureCollection","features":[]}');
        zip.file(
            'manifest.json',
            JSON.stringify({
                format: project.PROJECT_FORMAT,
                formatVersion: 1,
                overlays: [{ entry: 'overlays/0.kmz', file: 'ghost.kmz' }],
            }),
        );

        await project.loadProjectArchive(await zip.generateAsync({ type: 'blob' }));
        expect(getOverlays()).toHaveLength(0);
        expect(warn).toHaveBeenCalled();
        warn.mockRestore();
    });
});

describe('saveProject', () => {
    it('hands the archive to the save dialog with a .cellmap name', async () => {
        mocks.saveFile.mockClear();
        drawStore.set('t1', tower('t1'));

        await expect(project.saveProject()).resolves.toBe(true);

        const [name, blob, mime] = mocks.saveFile.mock.calls[0];
        expect(name).toBe('project.cellmap');
        expect(mime).toBe(project.PROJECT_MIME);
        // what was handed over is a readable archive, not just any blob
        const zip = await JSZip.loadAsync(blob);
        expect(zip.file('manifest.json')).toBeTruthy();
    });
});
