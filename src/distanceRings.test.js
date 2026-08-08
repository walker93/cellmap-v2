import { describe, it, expect, beforeEach } from 'vitest';
import * as turf from '@turf/turf';
import {
    DEFAULT_RING_INTERVAL,
    RING_INTERVALS,
    buildRingCollection,
    buildRings,
    defaultRingInterval,
    formatDistance,
    getRingSettings,
    resetRingSettings,
    setRingSettings,
} from './distanceRings.js';

const centre = [9.19, 45.46];

const tower = (id, properties = {}) => ({
    id,
    type: 'Feature',
    geometry: { type: 'Point', coordinates: centre },
    properties: {
        marker: 'cell',
        Radius: 3,
        Angle1: 0,
        Angle2: 90,
        fill: '#ff0000',
        rings: true,
        ...properties,
    },
});

const distanceOf = (ring) =>
    turf.distance(turf.point(centre), turf.point(ring.geometry.coordinates[0]), {
        units: 'kilometers',
    });

describe('defaultRingInterval', () => {
    it('sizes the spacing so the widest cell gets roughly ten rings', () => {
        expect(defaultRingInterval([3])).toBe(0.25);
        expect(defaultRingInterval([1])).toBe(0.1);
        expect(defaultRingInterval([20])).toBe(2);
    });

    // Not the median: the two failure modes are not symmetric. Too coarse for a
    // small cell only costs that cell its rings; too fine for a large one buries
    // the map. Sizing to the widest can only produce the first.
    it('follows the widest cell, not the typical one', () => {
        expect(defaultRingInterval([1, 1, 1, 20])).toBe(defaultRingInterval([20]));
    });

    it('always lands on one of the offered spacings', () => {
        for (const radius of [0.2, 0.7, 2, 4.5, 9, 60]) {
            expect(RING_INTERVALS).toContain(defaultRingInterval([radius]));
        }
    });

    it('falls back when there is nothing to measure', () => {
        expect(defaultRingInterval([])).toBe(DEFAULT_RING_INTERVAL);
        expect(defaultRingInterval([0, -1, NaN, 'x'])).toBe(DEFAULT_RING_INTERVAL);
    });
});

describe('formatDistance', () => {
    it('reads in metres below a kilometre and kilometres above it', () => {
        expect(formatDistance(0.05)).toBe('50 m');
        expect(formatDistance(0.25)).toBe('250 m');
        expect(formatDistance(1)).toBe('1 km');
        expect(formatDistance(1.5)).toBe('1.5 km');
        expect(formatDistance(2)).toBe('2 km');
    });
});

describe('buildRings', () => {
    it('puts a ring at every multiple of the spacing inside the cell', () => {
        const rings = buildRings(tower('t1'), 1);
        expect(rings).toHaveLength(2);
        expect(rings.map(distanceOf)[0]).toBeCloseTo(1, 3);
        expect(rings.map(distanceOf)[1]).toBeCloseTo(2, 3);
    });

    // The rim is the sector's own outline; a ring there would be a second line in
    // the same place.
    it('stops short of the rim', () => {
        const rings = buildRings(tower('t1', { Radius: 3 }), 1.5);
        expect(rings).toHaveLength(1);
        expect(distanceOf(rings[0])).toBeCloseTo(1.5, 3);
    });

    it('follows the cell’s own sweep rather than closing a circle', () => {
        const [ring] = buildRings(tower('t1', { Angle1: 0, Angle2: 90 }), 1);
        expect(ring.geometry.type).toBe('LineString');
        const bearings = ring.geometry.coordinates.map((c) =>
            turf.bearing(turf.point(centre), turf.point(c)),
        );
        expect(Math.min(...bearings)).toBeGreaterThanOrEqual(-0.001);
        expect(Math.max(...bearings)).toBeLessThanOrEqual(90.001);
    });

    it('takes its colour from the cell and links back to it', () => {
        const [ring] = buildRings(tower('t1', { fill: '#00ff00' }), 1);
        expect(ring.properties.stroke).toBe('#00ff00');
        expect(ring.properties.towerid).toBe('t1');
        expect(ring.properties.label).toBe('1 km');
    });

    it('draws nothing for a cell with no coverage, or with no spacing', () => {
        expect(buildRings(tower('t1', { Radius: 0 }), 1)).toEqual([]);
        expect(buildRings(tower('t1'), 0)).toEqual([]);
        expect(buildRings(tower('t1'), NaN)).toEqual([]);
    });

    it('does not run away when the spacing is far finer than the cell', () => {
        expect(buildRings(tower('t1', { Radius: 100 }), 0.05).length).toBeLessThanOrEqual(200);
    });
});

describe('buildRingCollection', () => {
    it('includes only the cells that asked for rings', () => {
        const features = buildRingCollection(
            [tower('on'), tower('off', { rings: false })],
            1,
        ).features;
        expect(new Set(features.map((f) => f.properties.towerid))).toEqual(new Set(['on']));
    });

    // Hiding is done here by leaving the tower out, rather than through the layer
    // filters setTowerHidden uses for the markers and sectors — the rings are
    // rebuilt from scratch anyway, so there is nothing to filter.
    it('leaves out a hidden cell', () => {
        expect(buildRingCollection([tower('t1', { hidden: true })], 1).features).toEqual([]);
    });

    it('ignores POIs and measurement geometry', () => {
        const poi = {
            id: 'p1',
            geometry: { type: 'Point', coordinates: centre },
            properties: { rings: true },
        };
        const line = {
            id: 'l1',
            geometry: { type: 'LineString', coordinates: [centre, [9.2, 45.5]] },
            properties: { marker: 'cell', rings: true, Radius: 3, Angle1: 0, Angle2: 90 },
        };
        expect(buildRingCollection([poi, line], 1).features).toEqual([]);
    });

    it('gives two co-located cells coincident rings, which is the point', () => {
        const a = tower('a', { Radius: 1 });
        const b = tower('b', { Radius: 3 });
        const rings = buildRingCollection([a, b], 0.25).features;
        const forA = rings.filter((r) => r.properties.towerid === 'a').map(distanceOf);
        const forB = rings.filter((r) => r.properties.towerid === 'b').map(distanceOf);
        // same spacing for both, so a ring on one lines up with a ring on the other
        for (const d of forA) {
            expect(forB.some((other) => Math.abs(other - d) < 1e-6)).toBe(true);
        }
    });
});

describe('ring settings', () => {
    beforeEach(() => resetRingSettings());

    it('starts at the default', () => {
        expect(getRingSettings()).toEqual({ interval: DEFAULT_RING_INTERVAL, labels: false });
    });

    it('applies a new spacing and label choice', () => {
        expect(setRingSettings({ interval: 1, labels: true })).toEqual({
            interval: 1,
            labels: true,
        });
    });

    it('ignores a spacing a hand-edited project file could not honour', () => {
        setRingSettings({ interval: 1 });
        for (const bad of [0, -1, NaN, 'x', null, undefined]) {
            setRingSettings({ interval: bad });
            expect(getRingSettings().interval).toBe(1);
        }
    });

    it('leaves what it was not asked to change alone', () => {
        setRingSettings({ interval: 2, labels: true });
        setRingSettings({ interval: 0.5 });
        expect(getRingSettings()).toEqual({ interval: 0.5, labels: true });
    });
});
