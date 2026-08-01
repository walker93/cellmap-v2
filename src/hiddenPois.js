// The set of Points of Interest that are currently hidden. A hidden POI is pulled
// out of the MapboxDraw store (so it disappears from the map) but kept here so it
// still shows in the sidebar table and can be restored later.
//
// This used to be a loose `hiddenPois` global mutated with findIndex/splice/push
// at each call site. Centralising it here (Phase 4) keeps the "in draw XOR in the
// hidden list" invariant in one place and makes the lifecycle testable — which is
// what surfaced the "Delete All / delete didn't clear the hidden list" desyncs.

const hidden = [];

/** The live array of hidden POI features (stable reference). */
export function getHiddenPois() {
    return hidden;
}

/** Mark a POI feature as hidden (caller is responsible for removing it from draw). */
export function addHiddenPoi(feature) {
    hidden.push(feature);
    return feature;
}

/**
 * Remove and return the hidden POI with the given id, or null if it isn't hidden.
 * Used when showing a POI again (the caller adds the returned feature back to draw).
 * @param {string} id
 * @returns {object|null}
 */
export function takeHiddenPoi(id) {
    const index = hidden.findIndex((f) => f.id === id);
    if (index === -1) return null;
    return hidden.splice(index, 1)[0];
}

/** Drop a POI from the hidden list without returning it (used when it's deleted). */
export function removeHiddenPoi(id) {
    const index = hidden.findIndex((f) => f.id === id);
    if (index > -1) hidden.splice(index, 1);
}

/** Forget all hidden POIs (used by "Delete All" and before a fresh import). */
export function clearHiddenPois() {
    hidden.length = 0;
}
