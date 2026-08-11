import { describe, it, expect, vi } from 'vitest';
import { installExportSerializerFix } from './mapExport.js';
import { buildCoverageSectors } from './towerFeature.js';
import { buildRings } from './distanceRings.js';

// The serialiser @watergis/mapbox-gl-export runs the style through before handing it
// to the hidden map it renders from. Copied verbatim from the shipped bundle so the
// tests below fail for the same reason the export did.
function bundledStringify(value) {
    let seen = [];
    const json = JSON.stringify(value, function (key, v) {
        if (typeof v === 'object' && v) {
            if (seen.indexOf(v) !== -1) return;
            seen.push(v);
        }
        return v;
    });
    seen = null;
    return json;
}

const marker = {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [10.5, 43.5] },
    properties: { Radius: 3, Angle1: 200, Angle2: 320, fill: '#ff0000' },
};
const towerFields = {
    lon: 10.5,
    lat: 43.5,
    radius: 3,
    angle1: 200,
    angle2: 320,
    fill: '#ff0000',
    opacity: 0.4,
};

const namespaceWithBug = () => ({ MapGenerator: { prototype: { stringify: bundledStringify } } });
const roundTrip = (namespace, data) => JSON.parse(namespace.MapGenerator.prototype.stringify(data));

describe('installExportSerializerFix', () => {
    // What the export used to do to a coverage cone: turf.sector closes the ring on
    // the same array it started it with, and the second sighting of that array was
    // dropped — leaving a null where the closing vertex belongs, in every band.
    it('stops the closing vertex of every sector being dropped', () => {
        const bands = buildCoverageSectors({ ...towerFields, gradient: true });
        const collection = { type: 'FeatureCollection', features: bands };

        const before = roundTrip(namespaceWithBug(), collection);
        expect(JSON.stringify(before)).toContain('null');

        const namespace = namespaceWithBug();
        expect(installExportSerializerFix(namespace)).toBe(true);
        const after = roundTrip(namespace, collection);

        expect(after.features).toHaveLength(bands.length);
        for (const band of after.features) {
            const ring = band.geometry.coordinates[0];
            expect(ring.every((position) => Array.isArray(position))).toBe(true);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
        }
    });

    // Worse than a null: a ring label is anchored on the same coordinate array as the
    // first vertex of its own arc, so the whole `coordinates` key went missing and the
    // feature stopped being a Point at all.
    it('keeps the ring labels a Point instead of an empty geometry', () => {
        const collection = { type: 'FeatureCollection', features: buildRings(marker, 0.5, 0.35) };
        const labelsOf = (data) => data.features.filter((f) => f.properties.kind === 'ring-label');

        expect(labelsOf(roundTrip(namespaceWithBug(), collection))[0].geometry.coordinates).toBe(
            undefined,
        );

        const namespace = namespaceWithBug();
        installExportSerializerFix(namespace);
        const labels = labelsOf(roundTrip(namespace, collection));

        expect(labels.length).toBeGreaterThan(0);
        for (const label of labels) {
            expect(label.geometry.coordinates).toHaveLength(2);
        }
    });

    // The fix reaches into someone else's bundle, so the day it stops finding what it
    // patches it has to say so: the symptom is an export that looks right until you
    // notice half the picture is missing.
    it('warns instead of throwing when the bundle no longer looks the same', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

        expect(installExportSerializerFix(undefined)).toBe(false);
        expect(installExportSerializerFix({})).toBe(false);
        expect(installExportSerializerFix({ MapGenerator: { prototype: {} } })).toBe(false);
        expect(warn).toHaveBeenCalledTimes(3);

        warn.mockRestore();
    });
});
