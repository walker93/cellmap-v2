// The sidebar's "Progetto" dropdown — the ARIA menu-button pattern.
//
// The sidebar used to open with a flat row of seven one-shot commands (add cell,
// import CSV, export GeoJSON, …). Those are commands, not modes: they open a
// dialog or produce a file and are done. Grouping the file-level ones under one
// labelled trigger gets them out of the way of the thing the sidebar is actually
// for — the lists underneath — while the per-list actions moved into the list
// headers, next to what they act on.
//
// A trigger with aria-haspopup/aria-expanded plus role="menu"/role="menuitem" is
// what makes this announce as a menu rather than as loose buttons, and the
// keyboard contract that comes with it (arrows to move, Escape to leave, focus
// back on the trigger) is the part users of a screen reader or keyboard rely on.
// Focus roves: exactly one item is tabbable at a time, so Tab leaves the menu
// instead of walking through it.

const ITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

function itemsOf(menu) {
    return Array.from(menu.querySelectorAll(ITEM_SELECTOR));
}

function focusItem(menu, index) {
    const items = itemsOf(menu);
    if (items.length === 0) return null;
    // wrap around either end
    const target = items[((index % items.length) + items.length) % items.length];
    items.forEach((item) => {
        item.tabIndex = item === target ? 0 : -1;
    });
    target.focus();
    return target;
}

/** Whether the menu behind `trigger` is open. */
export function isOpen(trigger) {
    return trigger.getAttribute('aria-expanded') === 'true';
}

/**
 * Open the menu.
 * @param {HTMLElement} trigger The menu button.
 * @param {HTMLElement} menu The role="menu" container.
 * @param {'first'|'last'|'none'} [focus] Which item to put focus on.
 */
export function openMenu(trigger, menu, focus = 'first') {
    trigger.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
    if (focus === 'first') focusItem(menu, 0);
    else if (focus === 'last') focusItem(menu, itemsOf(menu).length - 1);
}

/**
 * Close the menu.
 * @param {HTMLElement} trigger The menu button.
 * @param {HTMLElement} menu The role="menu" container.
 * @param {{restoreFocus?: boolean}} [options] Whether to move focus back to the
 *   trigger — right when the user left the menu deliberately, wrong when they
 *   clicked somewhere else entirely.
 */
export function closeMenu(trigger, menu, { restoreFocus = false } = {}) {
    trigger.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
    if (restoreFocus) trigger.focus();
}

/**
 * Wire a trigger/menu pair. Idempotent, and returns a teardown function.
 * @param {HTMLElement} trigger The menu button.
 * @param {HTMLElement} menu The role="menu" container.
 * @returns {() => void} Removes the document-level listener again.
 */
export function initMenu(trigger, menu) {
    if (!trigger || !menu) return () => {};

    itemsOf(menu).forEach((item) => {
        item.tabIndex = -1;
    });
    closeMenu(trigger, menu);

    trigger.addEventListener('click', () => {
        if (isOpen(trigger)) closeMenu(trigger, menu, { restoreFocus: true });
        else openMenu(trigger, menu);
    });

    // Enter/Space already reach the click handler above; only the arrows need
    // handling here, and they also say where focus should land.
    trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu(trigger, menu, e.key === 'ArrowDown' ? 'first' : 'last');
        }
    });

    menu.addEventListener('keydown', (e) => {
        const items = itemsOf(menu);
        const current = items.indexOf(document.activeElement);
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusItem(menu, current + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusItem(menu, current - 1);
                break;
            case 'Home':
                e.preventDefault();
                focusItem(menu, 0);
                break;
            case 'End':
                e.preventDefault();
                focusItem(menu, items.length - 1);
                break;
            case 'Escape':
                e.preventDefault();
                closeMenu(trigger, menu, { restoreFocus: true });
                break;
            case 'Tab':
                // Let the browser move focus onward, but don't leave the menu open
                // behind it.
                closeMenu(trigger, menu);
                break;
            default:
                break;
        }
    });

    // Capture, so the menu is already gone by the time the command runs: several
    // of these open a dialog or a native file picker, and a menu still hanging
    // over the sidebar behind it looks like the click missed.
    menu.addEventListener(
        'click',
        (e) => {
            if (e.target.closest(ITEM_SELECTOR)) {
                closeMenu(trigger, menu, { restoreFocus: true });
            }
        },
        true,
    );

    const onDocumentPointerDown = (e) => {
        if (!isOpen(trigger)) return;
        if (menu.contains(e.target) || trigger.contains(e.target)) return;
        // Clicked elsewhere — the user is going somewhere else, so leave focus
        // wherever they are taking it.
        closeMenu(trigger, menu);
    };
    document.addEventListener('pointerdown', onDocumentPointerDown);

    return () => document.removeEventListener('pointerdown', onDocumentPointerDown);
}
