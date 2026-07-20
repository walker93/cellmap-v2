import { describe, it, expect, beforeEach } from 'vitest';
import { getOverlays, addOverlay, removeOverlay, clearOverlays } from './overlays.js';

beforeEach(() => clearOverlays());

const overlay = (id, file = 'map.kmz') => ({ ID: id, file });

describe('overlays', () => {
    it('starts empty with a stable array reference', () => {
        const ref = getOverlays();
        expect(ref).toEqual([]);
        addOverlay(overlay(1));
        expect(getOverlays()).toBe(ref);
        expect(getOverlays()).toHaveLength(1);
    });

    it('adds overlays in order', () => {
        addOverlay(overlay(1));
        addOverlay(overlay(2));
        expect(getOverlays().map((o) => o.ID)).toEqual([1, 2]);
    });

    it('removes an overlay by identity and reports success', () => {
        const a = overlay(1);
        const b = overlay(2);
        addOverlay(a);
        addOverlay(b);
        expect(removeOverlay(a)).toBe(true);
        expect(getOverlays().map((o) => o.ID)).toEqual([2]);
    });

    it('returns false when removing an overlay that is not present', () => {
        addOverlay(overlay(1));
        expect(removeOverlay(overlay(99))).toBe(false);
        expect(getOverlays()).toHaveLength(1);
    });

    it('clears all overlays', () => {
        addOverlay(overlay(1));
        addOverlay(overlay(2));
        clearOverlays();
        expect(getOverlays()).toEqual([]);
    });
});
