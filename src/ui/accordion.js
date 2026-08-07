// Sidebar disclosure sections ("Cell Towers" / "Points of interest" / "Overlays").
//
// These used to be the CSS "checkbox hack": a visually hidden
// <input type="checkbox"> whose :checked state a sibling selector translated into
// an open panel. It rendered correctly but told assistive tech the wrong story —
// the header announced itself as a checkbox, and the panel's open/closed state was
// never exposed at all, since CSS state has no accessibility mapping.
//
// Each header is now a real <button aria-expanded>, which gets the button role,
// Enter/Space activation and a live expanded/collapsed announcement for free. The
// CSS keys off aria-expanded, so the attribute this module flips is the single
// source of truth for both the visual and the accessible state — they cannot
// drift apart. Sections stay independent: opening one never closes another.

/** The panel a toggle controls, resolved through its aria-controls id. */
function panelOf(toggle) {
    const id = toggle.getAttribute('aria-controls');
    if (!id) return null;
    return (toggle.ownerDocument || document).getElementById(id);
}

/** Whether the section driven by `toggle` is currently open. */
export function isExpanded(toggle) {
    return toggle.getAttribute('aria-expanded') === 'true';
}

/**
 * Open or close one section.
 * @param {HTMLElement} toggle The section's header button.
 * @param {boolean} expanded Target state.
 * @returns {boolean} The state that was applied.
 */
export function setExpanded(toggle, expanded) {
    const open = Boolean(expanded);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    const panel = panelOf(toggle);
    // The panel collapses via max-height (so the 0.35s transition still works),
    // not display:none — which means a "closed" panel keeps its box in the layout
    // and its rows would stay tabbable and readable to a screen reader. `inert`
    // takes the collapsed subtree out of both the tab order and the a11y tree.
    if (panel) panel.inert = !open;
    return open;
}

/**
 * Flip one section.
 * @param {HTMLElement} toggle The section's header button.
 * @returns {boolean} The new state.
 */
export function toggleAccordion(toggle) {
    return setExpanded(toggle, !isExpanded(toggle));
}

/**
 * Wire every disclosure button under `root`. Idempotent — an already-wired button
 * is skipped, so this is safe to call again after part of the sidebar re-renders.
 * @param {ParentNode} [root] Where to look for `.tab__label[aria-controls]`.
 * @returns {HTMLElement[]} The buttons wired by this call.
 */
export function initAccordions(root = document) {
    const wired = [];
    root.querySelectorAll('.tab__label[aria-controls]').forEach((toggle) => {
        if (toggle.dataset.accordionWired === 'true') return;
        toggle.dataset.accordionWired = 'true';
        // Apply the markup's initial aria-expanded so the panel's inert state
        // starts out consistent with it, instead of only on the first click.
        setExpanded(toggle, isExpanded(toggle));
        toggle.addEventListener('click', () => toggleAccordion(toggle));
        wired.push(toggle);
    });
    return wired;
}
