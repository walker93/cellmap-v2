import { describe, it, expect, beforeEach } from 'vitest';
import {
    getHiddenPois,
    addHiddenPoi,
    takeHiddenPoi,
    removeHiddenPoi,
    clearHiddenPois,
} from './hiddenPois.js';

beforeEach(() => clearHiddenPois());

const poi = (id, name = 'p') => ({ id, properties: { name, hidden: true } });

describe('hiddenPois', () => {
    it('starts empty with a stable array reference', () => {
        const ref = getHiddenPois();
        expect(ref).toEqual([]);
        addHiddenPoi(poi('a'));
        expect(getHiddenPois()).toBe(ref);
        expect(getHiddenPois()).toHaveLength(1);
    });

    it('hide then show round-trips the same feature and empties the list', () => {
        const feature = poi('a');
        addHiddenPoi(feature);
        const restored = takeHiddenPoi('a');
        expect(restored).toBe(feature);
        expect(getHiddenPois()).toEqual([]);
    });

    it('takeHiddenPoi returns null for an id that is not hidden', () => {
        addHiddenPoi(poi('a'));
        expect(takeHiddenPoi('missing')).toBeNull();
        expect(getHiddenPois()).toHaveLength(1);
    });

    it('takeHiddenPoi only removes the matching feature', () => {
        addHiddenPoi(poi('a'));
        addHiddenPoi(poi('b'));
        takeHiddenPoi('a');
        expect(getHiddenPois().map((f) => f.id)).toEqual(['b']);
    });

    it('removeHiddenPoi drops a hidden POI (delete of a hidden POI)', () => {
        addHiddenPoi(poi('a'));
        addHiddenPoi(poi('b'));
        removeHiddenPoi('a');
        expect(getHiddenPois().map((f) => f.id)).toEqual(['b']);
        // removing something absent is a no-op
        removeHiddenPoi('zzz');
        expect(getHiddenPois()).toHaveLength(1);
    });

    it('clearHiddenPois empties the list (Delete All / import)', () => {
        addHiddenPoi(poi('a'));
        addHiddenPoi(poi('b'));
        clearHiddenPois();
        expect(getHiddenPois()).toEqual([]);
    });
});
