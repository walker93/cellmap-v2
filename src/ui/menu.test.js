import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initMenu, openMenu, closeMenu, isOpen } from './menu.js';

let teardown = () => {};

function render() {
    document.body.innerHTML = `
        <button id="before">before</button>
        <div id="project-bar">
            <button type="button" id="trigger" aria-haspopup="true" aria-expanded="false"
                aria-controls="menu">Project</button>
            <div id="menu" role="menu" aria-labelledby="trigger" hidden>
                <button type="button" role="menuitem" id="save">Save project</button>
                <button type="button" role="menuitem" id="open">Open project</button>
                <div role="separator"></div>
                <button type="button" role="menuitem" id="wipe">Delete all</button>
            </div>
        </div>
        <button id="outside">elsewhere</button>`;
    teardown = initMenu(byId('trigger'), byId('menu'));
}

const byId = (id) => document.getElementById(id);
const trigger = () => byId('trigger');
const menu = () => byId('menu');
const key = (target, k) =>
    target.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }),
    );

describe('menu', () => {
    beforeEach(render);
    afterEach(() => {
        teardown();
        vi.restoreAllMocks();
    });

    it('starts closed, with the panel hidden', () => {
        expect(isOpen(trigger())).toBe(false);
        expect(menu().hidden).toBe(true);
    });

    it('opens on click and puts focus on the first item', () => {
        trigger().click();
        expect(trigger().getAttribute('aria-expanded')).toBe('true');
        expect(menu().hidden).toBe(false);
        expect(document.activeElement).toBe(byId('save'));
    });

    it('closes again on a second click, returning focus to the trigger', () => {
        trigger().click();
        trigger().click();
        expect(isOpen(trigger())).toBe(false);
        expect(document.activeElement).toBe(trigger());
    });

    it('opens on ArrowDown at the first item and on ArrowUp at the last', () => {
        key(trigger(), 'ArrowDown');
        expect(document.activeElement).toBe(byId('save'));

        closeMenu(trigger(), menu());
        key(trigger(), 'ArrowUp');
        expect(document.activeElement).toBe(byId('wipe'));
    });

    it('moves through the items with the arrow keys, wrapping at both ends', () => {
        trigger().click(); // focus: save
        key(menu(), 'ArrowDown');
        expect(document.activeElement).toBe(byId('open'));
        // the separator is not an item and must not take a turn
        key(menu(), 'ArrowDown');
        expect(document.activeElement).toBe(byId('wipe'));
        key(menu(), 'ArrowDown');
        expect(document.activeElement).toBe(byId('save'));
        key(menu(), 'ArrowUp');
        expect(document.activeElement).toBe(byId('wipe'));
    });

    it('jumps to the ends with Home and End', () => {
        trigger().click();
        key(menu(), 'End');
        expect(document.activeElement).toBe(byId('wipe'));
        key(menu(), 'Home');
        expect(document.activeElement).toBe(byId('save'));
    });

    it('closes on Escape and gives focus back to the trigger', () => {
        trigger().click();
        key(menu(), 'Escape');
        expect(isOpen(trigger())).toBe(false);
        expect(document.activeElement).toBe(trigger());
    });

    it('closes on Tab without stealing the focus move', () => {
        trigger().click();
        const event = new window.KeyboardEvent('keydown', {
            key: 'Tab',
            bubbles: true,
            cancelable: true,
        });
        menu().dispatchEvent(event);
        expect(isOpen(trigger())).toBe(false);
        expect(event.defaultPrevented).toBe(false);
    });

    it('keeps only one item tabbable, so Tab leaves the menu', () => {
        trigger().click();
        key(menu(), 'ArrowDown');
        const tabbable = ['save', 'open', 'wipe'].filter((id) => byId(id).tabIndex === 0);
        expect(tabbable).toEqual(['open']);
    });

    it('closes when a command is chosen, before the command runs', () => {
        const order = [];
        byId('save').addEventListener('click', () => {
            // a command that opens a dialog should not find the menu still over it
            order.push(isOpen(trigger()) ? 'menu-open' : 'menu-closed');
        });
        trigger().click();
        byId('save').click();

        expect(order).toEqual(['menu-closed']);
        expect(menu().hidden).toBe(true);
        expect(document.activeElement).toBe(trigger());
    });

    it('closes on a click outside, leaving focus where the user went', () => {
        trigger().click();
        byId('outside').dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
        expect(isOpen(trigger())).toBe(false);
        expect(document.activeElement).not.toBe(trigger());
    });

    it('ignores a pointerdown inside the menu', () => {
        trigger().click();
        byId('open').dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
        expect(isOpen(trigger())).toBe(true);
    });

    it('stops listening on the document once torn down', () => {
        openMenu(trigger(), menu());
        teardown();
        byId('outside').dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true }));
        expect(isOpen(trigger())).toBe(true);
    });

    it('does nothing when the markup is missing', () => {
        expect(() => initMenu(null, null)()).not.toThrow();
    });
});
