// The list of KMZ raster overlays currently on the map. Each entry is the overlay
// metadata ({ file, ID, imageURL, imageBlob, north, east, west, south, hidden });
// the matching Mapbox source/layer ("overlay-source-<ID>" / "overlay-layer-<ID>")
// are managed by the caller, which owns the map instance.
//
// Extracted from the loose `overlays` global (Phase 4) so the collection has one
// explicit, unit-tested owner alongside src/sectors.js and src/hiddenPois.js.

const overlays = [];

/** The live array of overlay metadata (stable reference). */
export function getOverlays() {
    return overlays;
}

/** Add an overlay's metadata. */
export function addOverlay(overlay) {
    overlays.push(overlay);
    return overlay;
}

/**
 * Remove an overlay entry by identity.
 * @param {object} overlay The exact object previously added.
 * @returns {boolean} true if it was present and removed.
 */
export function removeOverlay(overlay) {
    const index = overlays.indexOf(overlay);
    if (index === -1) return false;
    overlays.splice(index, 1);
    return true;
}

/** Forget all overlays (used by "Delete All"). */
export function clearOverlays() {
    overlays.length = 0;
}
