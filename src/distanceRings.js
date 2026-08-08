// Distance rings: arcs drawn across a cell's coverage at round distances from the
// antenna, so the picture can be read as a measurement and not only as a shape.
//
// They exist because the uncertainty cone used to *look* like it had rings — the
// bands seamed against each other — and those rings were an artefact: they moved
// with zoom and device, they meant nothing in particular, and each cell's were at
// a different spacing because the band count is fixed while the radius is not. The
// cone no longer draws them (see towerFeature.js). This module draws real ones.
//
// Two settings, deliberately at different levels:
//
//   visibility  per cell — a flag on the tower marker. Ten cells with five
//               labelled rings each is a mess, and rings on the two cells the
//               report is about is not.
//   interval    per map — one value for the whole project. If cell A were ringed
//               every 250 m and cell B every 500 m, the one thing rings are for
//               (comparing cells) would be actively misleading. Two co-located
//               cells then produce coincident rings rather than interleaved ones,
//               which is also why the per-cell switch is the one you want.

import * as turf from '@turf/turf';

/** Selectable ring spacings, in kilometres. Round numbers only — the point is to
 *  be countable off the map, and "every 0.3 km" is not. */
export const RING_INTERVALS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5];

/** Used when there are no cells to derive a spacing from. */
export const DEFAULT_RING_INTERVAL = 0.25;

// Roughly how many rings the widest cell on the map should get. Enough to count,
// few enough to see through.
const TARGET_RINGS = 10;

// A runaway guard, not a design limit: nothing sensible reaches it, but a 20 km
// cell set to 50 m spacing would otherwise emit 400 arcs per redraw.
const MAX_RINGS_PER_CELL = 200;

/**
 * How strongly a ring is drawn. Well under full strength on purpose: at 1.0 a
 * dozen saturated arcs read as the subject of the picture, when the subject is
 * the coverage they are measuring. They have to be followable, not loud.
 *
 * Applies to the line only — the labels stay at full strength, since a label
 * that is hard to read is a label that is not doing anything.
 */
export const RING_STROKE_OPACITY = 0.45;

/**
 * Pick the spacing a project should start with.
 *
 * Driven by the *widest* cell rather than the typical one. The two failure modes
 * are not symmetric: a spacing too coarse for a small cell leaves that cell with
 * no rings, which is merely unhelpful and obvious, while a spacing too fine for a
 * large one buries the map under hundreds of arcs. Sizing to the widest cell can
 * only produce the first.
 *
 * @param {number[]} radii Coverage radii in km.
 * @returns {number} One of {@link RING_INTERVALS}.
 */
export function defaultRingInterval(radii) {
    const usable = (radii || []).map(Number).filter((r) => Number.isFinite(r) && r > 0);
    if (usable.length === 0) return DEFAULT_RING_INTERVAL;

    const wanted = Math.max(...usable) / TARGET_RINGS;
    return RING_INTERVALS.reduce((best, candidate) =>
        Math.abs(candidate - wanted) < Math.abs(best - wanted) ? candidate : best,
    );
}

/**
 * A ring's own label: metres below a kilometre, kilometres above it, and no
 * trailing zeroes either way.
 * @param {number} km
 * @returns {string}
 */
export function formatDistance(km) {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${Number(km.toFixed(2))} km`;
}

/**
 * Where a ring's label goes: one explicit anchor point, at the middle of the arc.
 *
 * Not `symbol-placement: 'line-center'`, which is the obvious way to label an arc
 * and which labelled the big rings twice. Mapbox splits a GeoJSON feature at tile
 * boundaries and places a line label once per *piece*, so a ring wide enough to
 * cross one came out labelled at both ends of the split. A point can only ever be
 * labelled once, however the source is carved up.
 *
 * The middle of the arc is also where line-center would have put it — on the
 * bisector of the cell's sweep, or due south of a full circle — so every ring on
 * a tower lines its label up on the same radius, which reads as a column rather
 * than as scatter.
 */
function labelAnchor(arc, label, marker) {
    const coordinates = arc.geometry.coordinates;
    return turf.point(coordinates[Math.floor(coordinates.length / 2)], {
        kind: 'ring-label',
        towerid: marker.id,
        label,
        stroke: marker.properties.fill,
    });
}

/**
 * The rings for one tower: an arc across its coverage at every multiple of the
 * interval that falls inside it, each with the anchor point its label sits on.
 *
 * The rim itself (d === R) is left out — that edge is the sector's own outline,
 * and drawing a ring on top of it would just be a second line in the same place.
 *
 * @param {object} marker A cell-tower Point feature from the draw store.
 * @param {number} interval Spacing in km.
 * @returns {object[]} Innermost first, each arc followed by its label anchor.
 *   Tell them apart with `properties.kind` ('ring' / 'ring-label').
 */
export function buildRings(marker, interval) {
    const spacing = Number(interval);
    const radius = Number(marker.properties.Radius);
    if (!Number.isFinite(spacing) || spacing <= 0) return [];
    if (!Number.isFinite(radius) || radius <= 0) return [];

    const center = marker.geometry.coordinates;
    const angle1 = Number(marker.properties.Angle1);
    const angle2 = Number(marker.properties.Angle2);

    const rings = [];
    for (let n = 1; n * spacing < radius && n <= MAX_RINGS_PER_CELL; n++) {
        const distance = n * spacing;
        const label = formatDistance(distance);
        const arc = turf.lineArc(center, distance, angle1, angle2);
        // Assigned rather than passed in: unlike turf.sector, lineArc ignores
        // `options.properties` altogether and only copies them off the centre
        // when the centre is a Feature.
        arc.properties = {
            kind: 'ring',
            towerid: marker.id,
            marker: 'cell',
            label,
            // tokml takes the Placemark name from here, which is how the ring is
            // labelled in Google Earth — it has no equivalent of a label placed
            // along a line
            name: label,
            // simplestyle, so the KML export styles these instead of falling back
            // to its default grey (see io/kml.js)
            stroke: marker.properties.fill,
            'stroke-opacity': RING_STROKE_OPACITY,
            'stroke-width': 1,
        };
        rings.push(arc, labelAnchor(arc, label, marker));
    }
    return rings;
}

/**
 * Every ring currently on the map, as one collection ready for `setData`.
 *
 * Rings are wholly derived from (tower, interval), so they are rebuilt from
 * scratch whenever anything changes rather than kept in sync like sectors are.
 * That is also why hiding is handled here by simply leaving a tower out, instead
 * of through the layer filters `setTowerHidden` uses for the markers and sectors.
 *
 * @param {object[]} markers The draw store's features (non-towers are ignored).
 * @param {number} interval Spacing in km.
 * @returns {object} A GeoJSON FeatureCollection.
 */
export function buildRingCollection(markers, interval) {
    const features = [];
    for (const marker of markers || []) {
        const p = marker.properties || {};
        if (p.marker !== 'cell' || !p.rings || p.hidden) continue;
        if (!marker.geometry || marker.geometry.type !== 'Point') continue;
        features.push(...buildRings(marker, interval));
    }
    return { type: 'FeatureCollection', features };
}

// The map-wide half of the settings. Kept here rather than in towerState because
// it is a property of the project's presentation, not of any tower — and it is
// what gets written to the .cellmap manifest.
const settings = {
    interval: DEFAULT_RING_INTERVAL,
    labels: false,
};

/** The current map-wide ring settings. */
export function getRingSettings() {
    return { ...settings };
}

/**
 * Update the map-wide ring settings. Unknown or malformed values are ignored
 * rather than applied, so a hand-edited project file cannot leave the map with a
 * spacing of 0 or NaN.
 * @param {{interval?: number, labels?: boolean}} next
 * @returns {{interval: number, labels: boolean}} The settings now in force.
 */
export function setRingSettings(next = {}) {
    const interval = Number(next.interval);
    if (Number.isFinite(interval) && interval > 0) settings.interval = interval;
    if (next.labels !== undefined) settings.labels = Boolean(next.labels);
    return getRingSettings();
}

/** Back to the defaults — used by "Delete all" and before opening a project. */
export function resetRingSettings() {
    settings.interval = DEFAULT_RING_INTERVAL;
    settings.labels = false;
}
