// The coverage-sector FeatureCollection — the "aree" map layer — and the rules
// that keep it in sync with the tower markers stored in MapboxDraw. Each sector
// is linked to its tower marker through a `towerid` property.
//
// Previously this collection lived in a loose `geojson` global and was mutated by
// hand with `geojson.features.push(...)` / `.filter(...)` calls scattered across
// a dozen functions — the kind of implicit, easy-to-desync state that produced
// "the sector didn't get removed/duplicated" bugs. Centralising the operations
// here is the first step of formalizing the state model (Phase 4).

const collection = {
    type: 'FeatureCollection',
    features: [],
};

/**
 * The live FeatureCollection object. Its reference is stable, so it can be handed
 * straight to Mapbox `setData`; only its `.features` array changes over time.
 */
export function getSectors() {
    return collection;
}

/**
 * Append a coverage-sector polygon to the collection.
 * @param {object} sector A GeoJSON Polygon feature (typically with a `towerid`).
 * @returns {object} The same sector, for chaining.
 */
export function addSector(sector) {
    collection.features.push(sector);
    return sector;
}

/**
 * Every sector linked to the given tower id.
 * @param {string} towerid
 * @returns {object[]}
 */
export function getSectorsByTowerId(towerid) {
    return collection.features.filter((f) => f.properties.towerid === towerid);
}

/**
 * Remove every sector linked to the given tower id. Used when a tower is deleted
 * or re-created (edit), so its old coverage area never lingers on the map.
 * @param {string} towerid
 */
export function removeSectorsByTowerId(towerid) {
    collection.features = collection.features.filter((f) => f.properties.towerid !== towerid);
}

/** Remove all sectors (used by "Delete All" and before a fresh import). */
export function clearSectors() {
    collection.features = [];
}
