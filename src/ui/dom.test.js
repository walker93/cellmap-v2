import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { el, clearElementCache } from './dom.js';

describe('el', () => {
    beforeEach(() => {
        clearElementCache();
        document.body.innerHTML = '<input id="inp_lat"><div id="features"></div>';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns the element', () => {
        expect(el('inp_lat')).toBe(document.getElementById('inp_lat'));
    });

    it('hits the document only once per id', () => {
        el('inp_lat');
        const spy = vi.spyOn(document, 'getElementById');
        expect(el('inp_lat')).toBe(document.querySelector('#inp_lat'));
        el('inp_lat');
        el('inp_lat');
        expect(spy).not.toHaveBeenCalled();
    });

    it('caches each id separately', () => {
        expect(el('inp_lat').id).toBe('inp_lat');
        expect(el('features').id).toBe('features');
    });

    it('re-resolves after the cached node leaves the document', () => {
        const first = el('inp_lat');
        // A re-render replaces the node behind the same id — the stale one must not
        // be handed out again (this is what tests and any future subtree swap do).
        document.body.innerHTML = '<input id="inp_lat">';
        const second = el('inp_lat');
        expect(second).not.toBe(first);
        expect(second).toBe(document.getElementById('inp_lat'));
    });

    it('returns null for an unknown id, and finds it once it appears', () => {
        expect(el('nope')).toBeNull();
        document.body.insertAdjacentHTML('beforeend', '<div id="nope"></div>');
        expect(el('nope')).toBe(document.getElementById('nope'));
    });

    it('does not cache a miss', () => {
        el('nope');
        const spy = vi.spyOn(document, 'getElementById');
        el('nope');
        expect(spy).toHaveBeenCalledWith('nope');
    });

    it('clearElementCache forces a fresh lookup', () => {
        el('inp_lat');
        clearElementCache();
        const spy = vi.spyOn(document, 'getElementById');
        el('inp_lat');
        expect(spy).toHaveBeenCalledWith('inp_lat');
    });
});
