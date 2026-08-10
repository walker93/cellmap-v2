import { describe, it, expect, beforeEach } from 'vitest';
import {
    getSectors,
    addSector,
    getSectorsByTowerId,
    removeSectorsByTowerId,
    clearSectors,
} from './sectors.js';

// The module holds a single shared collection, so reset it before each test.
beforeEach(() => clearSectors());

function sector(towerid, name = 'x') {
    return {
        type: 'Feature',
        properties: { towerid, name },
        geometry: { type: 'Polygon', coordinates: [] },
    };
}

describe('sectors collection', () => {
    it('starts empty and exposes a stable FeatureCollection reference', () => {
        const ref = getSectors();
        expect(ref.type).toBe('FeatureCollection');
        expect(ref.features).toEqual([]);
        addSector(sector('a'));
        // same object reference, mutated in place — safe to hand to Mapbox setData once.
        expect(getSectors()).toBe(ref);
        expect(getSectors().features).toHaveLength(1);
    });

    it('adds sectors', () => {
        addSector(sector('a'));
        addSector(sector('b'));
        expect(getSectors().features.map((f) => f.properties.towerid)).toEqual(['a', 'b']);
    });

    it('finds sectors by tower id', () => {
        addSector(sector('a'));
        addSector(sector('b'));
        const found = getSectorsByTowerId('b');
        expect(found).toHaveLength(1);
        expect(found[0].properties.towerid).toBe('b');
        expect(getSectorsByTowerId('missing')).toEqual([]);
    });

    it('removes only the sectors of a given tower id', () => {
        addSector(sector('a'));
        addSector(sector('b'));
        addSector(sector('a'));
        removeSectorsByTowerId('a');
        expect(getSectors().features.map((f) => f.properties.towerid)).toEqual(['b']);
    });

    it('removing a non-existent tower id is a no-op', () => {
        addSector(sector('a'));
        removeSectorsByTowerId('zzz');
        expect(getSectors().features).toHaveLength(1);
    });

    it('clears all sectors', () => {
        addSector(sector('a'));
        addSector(sector('b'));
        clearSectors();
        expect(getSectors().features).toEqual([]);
    });

    it('supports the duplicate-tower flow: clone a sector and relink it to a new id', () => {
        addSector(sector('orig'));
        const original = getSectorsByTowerId('orig')[0];
        const copy = JSON.parse(JSON.stringify(original));
        copy.properties.towerid = 'new';
        addSector(copy);
        expect(getSectors().features).toHaveLength(2);
        expect(getSectorsByTowerId('new')).toHaveLength(1);
        // the clone is independent of the original
        expect(getSectorsByTowerId('new')[0]).not.toBe(original);
    });
});
