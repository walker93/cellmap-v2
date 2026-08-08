import { describe, it, expect, beforeAll, vi } from 'vitest';
import { buildCoverageSector, buildCoverageSectors, buildTowerFeature } from '../towerFeature.js';
import { buildRings } from '../distanceRings.js';

// kml.js transitively imports draw.js, which builds a MapboxDraw control from a
// CDN global at module-eval time; and `tokml` is itself a CDN global in the app.
// Load the real library here rather than stubbing it — the whole point of these
// cases is what that specific library does with our properties.
let generateKML;

beforeAll(async () => {
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return { on() {}, addControl() {}, addSource() {}, addLayer() {} };
        },
    });
    vi.stubGlobal('MapboxDraw', function () {
        return { getAll: () => ({ type: 'FeatureCollection', features: [] }) };
    });
    // The bundle is UMD: in the browser it assigns window.tokml, but under Vite
    // it finds a CommonJS `module` and hands the function back as the export
    // instead. Take it from wherever it landed and put it where kml.js looks.
    const bundle = await import('../../public/lib/tokml.js');
    vi.stubGlobal('tokml', globalThis.tokml || bundle.default || bundle);
    ({ generateKML } = await import('./kml.js'));
});

const fields = {
    lon: 9.19,
    lat: 45.46,
    radius: 2,
    angle1: 0,
    angle2: 90,
    name: 'Tower A',
    fill: '#ff0000',
    opacity: 0.5,
};

function kmlOf(features) {
    return generateKML({ type: 'FeatureCollection', features });
}

// A property that is present with an undefined value makes tokml throw while
// building <ExtendedData>. Towers get those all the time: `description` when the
// field was left blank, and one per network-identity code that wasn't filled in.
// So this is not an edge case — it is what "Generate KML" hits on an ordinary map.
describe('generateKML with unset properties', () => {
    it('exports a tower that has no description and no identity', () => {
        const { marker, sectors } = buildTowerFeature({ ...fields, gradient: true });
        expect(marker.properties.description).toBeUndefined();
        expect(() => kmlOf([marker, ...sectors])).not.toThrow();
    });

    it('leaves the unset properties out of the ExtendedData rather than emptying them', () => {
        const kml = kmlOf([buildCoverageSector(fields)]);
        expect(kml).toContain('<Data name="fill">');
        expect(kml).not.toContain('name="description"');
    });
});

// tokml styles a polygon from the simplestyle keys, but its LineStyle fallback is
// an opaque grey 2px line, not "no line" — so a shape that declares only its fill
// comes out outlined. Every case here is about that fallback never being reached.
describe('generateKML outlines', () => {
    it('never falls back to the default grey outline', () => {
        expect(kmlOf([buildCoverageSector(fields)])).not.toContain('ff555555');
        expect(kmlOf(buildCoverageSectors({ ...fields, gradient: true }))).not.toContain(
            'ff555555',
        );
    });

    it('outlines a single sector in its own colour', () => {
        // KML colours are aabbggrr, so #ff0000 at full opacity is ff0000ff
        expect(kmlOf([buildCoverageSector(fields)])).toContain(
            '<LineStyle><color>ff0000ff</color><width>1</width></LineStyle>',
        );
    });

    it('makes the graduated bands fully transparent at the edges', () => {
        const kml = kmlOf(buildCoverageSectors({ ...fields, gradient: true }));
        // alpha 00 => invisible whatever the colour, and a zero width on top
        expect(kml).toContain('<color>000000ff</color><width>0</width>');
        expect(kml).not.toContain('<width>2</width>');
    });

    // Distance rings are the one thing on the map that is *meant* to be a line, and
    // they are in the export because the KML is the copy that ends up in a report.
    it('styles a distance ring in the cell’s colour', () => {
        const [ring] = buildRings(
            {
                id: 't1',
                geometry: { type: 'Point', coordinates: [9.19, 45.46] },
                properties: { Radius: 3, Angle1: 0, Angle2: 90, fill: '#ff0000' },
            },
            1,
        );
        const kml = kmlOf([ring]);
        expect(kml).toContain('<LineStyle><color>ff0000ff</color><width>1</width></LineStyle>');
        expect(kml).toContain('<LineString>');
        expect(kml).not.toContain('ff555555');
    });

    it('still carries the fill through', () => {
        // 0.5 opacity => 7f
        expect(kmlOf([buildCoverageSector(fields)])).toContain(
            '<PolyStyle><color>7f0000ff</color></PolyStyle>',
        );
    });
});
