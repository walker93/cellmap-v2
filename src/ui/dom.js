// One place that resolves the app's long-lived elements, memoized by id.
//
// The controls declared in index.html — the dialog and its inputs, the three
// sidebar table bodies — are created once by the parser and never replaced, yet
// the code re-ran document.getElementById on every single read: resetForm() alone
// did eleven, and a save re-resolved the same nine inputs three times over. Each
// lookup is cheap; what they cost is legibility, and they hide how few distinct
// elements the app actually talks to.
//
// The cache is self-healing rather than a snapshot taken at startup: an entry is
// dropped and re-resolved whenever the node it holds is no longer in the document.
// That keeps this correct if a subtree is ever swapped out wholesale, and lets
// tests re-render the DOM between cases without a stale node leaking forward.

const cache = new Map();

/**
 * The element with the given id, memoized after the first successful lookup.
 * @param {string} id
 * @returns {HTMLElement|null} null when no such element exists, as with getElementById.
 */
export function el(id) {
    const cached = cache.get(id);
    if (cached && cached.isConnected) return cached;
    const found = document.getElementById(id);
    if (found) {
        cache.set(id, found);
    } else {
        cache.delete(id);
    }
    return found;
}

/**
 * Forget every memoized element. Not needed for detached nodes (those are noticed
 * automatically); it exists for tests and for a full teardown of the document.
 */
export function clearElementCache() {
    cache.clear();
}
