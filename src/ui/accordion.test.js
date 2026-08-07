import { describe, it, expect, beforeEach } from 'vitest';
import { initAccordions, isExpanded, setExpanded, toggleAccordion } from './accordion.js';

// Mirrors the three sidebar sections in index.html: the first open, the rest closed.
function renderSidebar() {
    document.body.innerHTML = `
        <div id="elements">
            <div class="tab">
                <div class="tab__header">
                    <button type="button" id="tab1-label" class="tab__label" aria-expanded="true"
                        aria-controls="tab1-content">Cell Towers</button>
                    <button type="button" id="addcell" class="tab__action">Aggiungi cella</button>
                </div>
                <div class="tab__content" id="tab1-content" role="region" aria-labelledby="tab1-label">
                    <button id="row-action">edit</button>
                </div>
            </div>
            <div class="tab">
                <div class="tab__header">
                    <button type="button" id="tab2-label" class="tab__label" aria-expanded="false"
                        aria-controls="tab2-content">Points of interest</button>
                </div>
                <div class="tab__content" id="tab2-content" role="region" aria-labelledby="tab2-label"></div>
            </div>
            <div class="tab">
                <div class="tab__header">
                    <button type="button" id="tab3-label" class="tab__label" aria-expanded="false"
                        aria-controls="tab3-content">Overlays</button>
                    <button type="button" id="addoverlay" class="tab__action">Aggiungi overlay</button>
                </div>
                <div class="tab__content" id="tab3-content" role="region" aria-labelledby="tab3-label"></div>
            </div>
        </div>`;
}

const byId = (id) => document.getElementById(id);

describe('accordion', () => {
    beforeEach(() => {
        renderSidebar();
    });

    it('wires every header button once', () => {
        expect(initAccordions().map((el) => el.id)).toEqual(['tab1-label', 'tab2-label', 'tab3-label']);
        // Called again after a re-render: nothing is double-wired.
        expect(initAccordions()).toEqual([]);
    });

    it('does not stack duplicate click handlers when re-initialised', () => {
        initAccordions();
        initAccordions();
        byId('tab1-label').click();
        // A second handler would flip it straight back to open.
        expect(isExpanded(byId('tab1-label'))).toBe(false);
    });

    it('toggles aria-expanded on click', () => {
        initAccordions();
        const toggle = byId('tab2-label');
        toggle.click();
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        toggle.click();
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('keeps the sections independent', () => {
        initAccordions();
        byId('tab2-label').click();
        expect(isExpanded(byId('tab1-label'))).toBe(true);
        expect(isExpanded(byId('tab2-label'))).toBe(true);
        expect(isExpanded(byId('tab3-label'))).toBe(false);
    });

    it('marks collapsed panels inert and clears it when they open', () => {
        initAccordions();
        // A collapsed panel is only visually hidden (max-height: 0), so without
        // inert its rows would stay tabbable and visible to a screen reader.
        expect(byId('tab1-content').inert).toBe(false);
        expect(byId('tab2-content').inert).toBe(true);

        byId('tab2-label').click();
        expect(byId('tab2-content').inert).toBe(false);
        byId('tab2-label').click();
        expect(byId('tab2-content').inert).toBe(true);
    });

    it('setExpanded is idempotent and reports the applied state', () => {
        const toggle = byId('tab3-label');
        expect(setExpanded(toggle, true)).toBe(true);
        expect(setExpanded(toggle, true)).toBe(true);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(byId('tab3-content').inert).toBe(false);
    });

    it('toggleAccordion returns the new state', () => {
        const toggle = byId('tab1-label');
        expect(toggleAccordion(toggle)).toBe(false);
        expect(toggleAccordion(toggle)).toBe(true);
    });

    it('survives a toggle whose panel is missing', () => {
        document.body.innerHTML = `<button class="tab__label" aria-expanded="false"
            aria-controls="nope">Orphan</button>`;
        initAccordions();
        const toggle = document.querySelector('.tab__label');
        expect(() => toggle.click()).not.toThrow();
        expect(isExpanded(toggle)).toBe(true);
    });

    it('ignores elements without aria-controls', () => {
        document.body.innerHTML = `<button class="tab__label">No panel</button>`;
        expect(initAccordions()).toEqual([]);
    });
});
