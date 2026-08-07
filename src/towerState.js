// Coordinating operations on top of the draw/sectors/hiddenPois modules.
//
// Phase 4 formalized sectors/hiddenPois/draw as separate, unit-tested collections,
// but the sync rules between them still lived scattered across the DOM row-action
// handlers in ui/table.js and ui/form.js (add a tower AND its sector AND link them;
// remove a tower AND its sector AND its hidden-POI entry; duplicate a tower AND its
// sector, relinked to the new id; etc). That duplication is exactly how the
// "duplicate a tower" bug happened: the sync step that keeps a tower's
// `properties.id` equal to its own draw feature id (so the show/hide layer filter,
// which matches on `properties.id`, targets the right feature) was written once in
// aggiungiCella and then not repeated when the duplicate handler was added. This
// module is the single place that combination of steps is written down.
import { map } from './map.js';
import { draw } from './draw.js';
import { addGeoJsonSource } from './mapSource.js';
import { addSector, getSectors, getSectorsByTowerId, removeSectorsByTowerId } from './sectors.js';
import { addHiddenPoi, takeHiddenPoi, removeHiddenPoi } from './hiddenPois.js';
import { buildCoverageSector, towerFieldsFromFeature } from './towerFeature.js';

function refreshMarkersSource() {
    addGeoJsonSource('settori', draw.getAll());
}

function refreshSectorsSource() {
    addGeoJsonSource('aree', getSectors());
}

// The show/hide layer filter (see setTowerHidden) matches on `properties.id`, not
// the real draw feature id, so every tower needs the two kept equal from creation.
function syncMarkerIdProperty(id) {
    const stored = draw.get(id);
    stored.properties.id = id;
    draw.add(stored);
}

/**
 * Add a tower marker and its coverage sector, linked together and with
 * `properties.id` synced to the new draw feature id. Pass `existingId` to update an
 * existing marker in place (the edit flow) instead of creating a new one; the caller
 * is responsible for removing the old sector first (see `modificaCella`).
 * @param {object} marker A Point feature (see towerFeature.js `buildTowerFeature`).
 * @param {object} sector Its coverage-sector Polygon feature.
 * @param {string} [existingId] Draw feature id to update instead of creating new.
 * @returns {string} The tower's draw feature id.
 */
export function addTower(marker, sector, existingId) {
    if (existingId) marker.id = existingId;
    const [id] = draw.add(marker);
    syncMarkerIdProperty(id);

    sector.properties.towerid = id;
    addSector(sector);

    refreshMarkersSource();
    refreshSectorsSource();
    return id;
}

/**
 * Link an already-added tower marker to a fresh coverage sector, keeping
 * `properties.id` synced to the marker's own draw id. Used by the GeoJSON importer,
 * which bulk-adds every feature in one `draw.add(FeatureCollection)` call (preserving
 * the file's own ids) and then needs to (re)build each cell tower's sector — and its
 * id sync, in case the source file predates that invariant — individually.
 * @param {string} id The tower marker's draw feature id.
 * @param {object} sector Its coverage-sector Polygon feature.
 */
export function linkTowerSector(id, sector) {
    syncMarkerIdProperty(id);
    sector.properties.towerid = id;
    addSector(sector);
}

function isCell(feature) {
    return Boolean(feature.properties && feature.properties.marker === 'cell');
}

/**
 * Load a FeatureCollection into the map state: features into the draw store, a
 * freshly rebuilt coverage sector for every cell tower, and the hidden ones put
 * back the way they were saved.
 *
 * Sectors are never stored in a file — they're derived from the tower's fields —
 * so they're recomputed here rather than read. Hidden state is restored through
 * the two different mechanisms the app uses for it: a hidden POI lives *outside*
 * the draw store (see hiddenPois.js), while a hidden tower stays in it and is
 * filtered out at the layer level.
 *
 * Shared by the GeoJSON importer and the project opener; both call deleteAll()
 * first, since this adds to the current state rather than replacing it.
 *
 * @param {object} featureCollection A GeoJSON FeatureCollection.
 */
export function loadFeatures(featureCollection) {
    const features = (featureCollection && featureCollection.features) || [];
    const inDrawStore = [];
    for (const feature of features) {
        if (feature.properties && feature.properties.hidden && !isCell(feature)) {
            addHiddenPoi(feature);
        } else {
            inDrawStore.push(feature);
        }
    }

    draw.add({ type: 'FeatureCollection', features: inDrawStore });
    for (const feature of inDrawStore) {
        if (!isCell(feature)) continue;
        linkTowerSector(feature.id, buildCoverageSector(towerFieldsFromFeature(feature)));
        if (feature.properties.hidden) setTowerHidden(feature.id, true);
    }

    refreshMarkersSource();
    refreshSectorsSource();
}

/**
 * Duplicate a tower and its coverage sector (if any), relinked to the new marker id.
 * @param {string} id The tower to duplicate.
 * @returns {string} The new tower's draw feature id.
 */
export function duplicateTower(id) {
    const copy = draw.get(id);
    copy.id = '';
    const [newId] = draw.add(copy);
    syncMarkerIdProperty(newId);

    const originalSector = getSectorsByTowerId(id)[0];
    if (originalSector) {
        const copySector = JSON.parse(JSON.stringify(originalSector));
        copySector.properties.towerid = newId;
        addSector(copySector);
    }

    refreshMarkersSource();
    refreshSectorsSource();
    return newId;
}

/**
 * Flip a tower's visibility. Towers stay in the draw store while hidden — visibility
 * is driven by Mapbox layer filters on `markers` and `sectors` (keyed by feature id /
 * towerid) so that hiding one tower can never affect another that happens to share
 * draw internals.
 * @param {string} id
 * @param {boolean} hidden
 */
export function setTowerHidden(id, hidden) {
    const feat = draw.get(id);
    feat.properties.hidden = hidden;
    draw.add(feat);

    for (const [layerId, prop] of [
        ['markers', 'id'],
        ['sectors', 'towerid'],
    ]) {
        let filter = map.getFilter(layerId) || ['all'];
        if (!Array.isArray(filter)) filter = ['all'];
        filter = filter.filter(
            (f) =>
                !(
                    Array.isArray(f) &&
                    f[0] === '!=' &&
                    JSON.stringify(f[1]) === JSON.stringify(['get', prop]) &&
                    f[2] === id
                ),
        );
        if (hidden) {
            if (filter.length === 1 && filter[0] === 'all') {
                filter = ['all', ['!=', ['get', prop], id]];
            } else {
                filter.push(['!=', ['get', prop], id]);
            }
        }
        map.setFilter(layerId, filter);
    }
}

/** Hide a POI: pull it out of the draw store into the hidden-POI list (it still
 * shows in the sidebar table and can be restored with `showPoi`). */
export function hidePoi(marker) {
    marker.properties.hidden = true;
    addHiddenPoi(marker);
    draw.delete(marker.id);
    refreshMarkersSource();
}

/** Restore a previously hidden POI back onto the map. */
export function showPoi(marker) {
    marker.properties.hidden = false;
    const restored = takeHiddenPoi(marker.id);
    if (restored) draw.add(restored);
    refreshMarkersSource();
}

/**
 * Duplicate a POI (icon marker or measurement line/polygon).
 * @param {string} id
 * @returns {string} The new feature's draw id.
 */
export function duplicatePoi(id) {
    const copy = draw.get(id);
    copy.id = '';
    const [newId] = draw.add(copy);
    refreshMarkersSource();
    return newId;
}

/**
 * Remove a tower or POI: drop it from the draw store, the hidden-POI list (in case
 * it was hidden), and any coverage sector linked to it. The three collections are
 * always cleaned up together — a tower may have a sector, a POI may be in the
 * hidden list — so one shared function handles both row types.
 * @param {string} id
 */
export function removeFeature(id) {
    draw.delete(id);
    removeHiddenPoi(id);
    removeSectorsByTowerId(id);
    refreshMarkersSource();
    refreshSectorsSource();
}
