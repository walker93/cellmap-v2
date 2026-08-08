import * as turf from '@turf/turf';
import { normalizeCellIdentity, validateCellIdentity } from './cellIdentity.js';

/**
 * The simplestyle outline properties for a sector polygon.
 *
 * These have to be written even when the outline is meant to be invisible.
 * `tokml` styles a polygon from the simplestyle keys, and when *no* `stroke*`
 * key is present at all it falls back to an opaque grey line 2px wide
 * (`ff555555`) rather than to no line — so a graduated cone, which sets only
 * `fill`/`fill-opacity`, used to open in Google Earth as a stack of grey-edged
 * rings. Saying "no outline" explicitly is the only way to get no outline.
 *
 * The Mapbox `sectors` layer reads `fill`/`fill-opacity` only, so none of this
 * changes what the app itself draws.
 *
 * @param {string} color Hex colour (tokml needs a string here, or it falls back).
 * @param {number} opacity 0..1; 0 means genuinely invisible.
 * @param {number} width Line width in px.
 */
function outline(color, opacity, width) {
    return { stroke: color, 'stroke-opacity': opacity, 'stroke-width': width };
}

/**
 * Build the coverage-sector polygon for a cell tower with turf.sector().
 *
 * This is the single source of truth for the sector geometry + properties.
 * The legacy code builds this exact structure in THREE places with the same
 * property mapping:
 *   1. the add/edit form   (`createFeatureFromInput` / `aggiungiCella`),
 *   2. the CSV importer    (`openfile`), and
 *   3. the GeoJSON importer (`importjson`, which rebuilds only the sector
 *      because the point markers already exist in the imported file).
 * All three will be migrated to call this function so the shape can never drift.
 *
 * @param {object} fields
 * @param {number} fields.lon        Longitude (decimal degrees).
 * @param {number} fields.lat        Latitude (decimal degrees).
 * @param {number} fields.radius     Coverage radius (kilometres, turf default unit).
 * @param {number} fields.angle1     Sector start bearing (degrees).
 * @param {number} fields.angle2     Sector end bearing (degrees).
 * @param {string} [fields.name]     Display name.
 * @param {string} [fields.description] Description text.
 * @param {string} [fields.fill]     Fill colour (hex).
 * @param {number} [fields.opacity]  Fill opacity 0..1.
 * @param {string} [fields.towerid]  Draw feature id to link the sector back to its
 *                                   marker. Added to the properties only when provided
 *                                   (the form/CSV paths attach it after `draw.add`).
 * @returns {object} A GeoJSON Polygon feature.
 */
export function buildCoverageSector(fields) {
    const { lon, lat, radius, angle1, angle2, name, description, fill, towerid } = fields;
    const opacity = parseFloat(fields.opacity);

    const properties = {
        name,
        description,
        fill,
        'fill-opacity': opacity,
        // A single sector gets a thin outline in its own colour. At 0.2 fill
        // opacity the shape is very pale in Google Earth, and the hard edge is
        // real information: it is where the estimated coverage stops.
        ...outline(fill, 1, 1),
        marker: 'cell',
    };
    if (towerid !== undefined) {
        properties.towerid = towerid;
    }

    return turf.sector([lon, lat], radius, angle1, angle2, { properties });
}

// How many bands a graduated cone is drawn with. Enough that the steps stop being
// visible — at the default 0.2 opacity each step is 0.0125 — without making the
// GeoJSON/KML export (the only place the bands are written out; .cellmap rebuilds
// them from the tower's fields) heavier than it needs to be.
export const GRADIENT_BANDS = 16;

function angleMod360(angle) {
    return ((angle % 360) + 360) % 360;
}

// turf.sector's own rule for "this is really a full circle": the two bearings are
// the same angle. Worth matching exactly, since a band has to be a ring with a
// hole in that case rather than a slice with two radial edges.
function isFullSweep(angle1, angle2) {
    return angleMod360(angle1) === angleMod360(angle2);
}

function outerRing(polygon) {
    return polygon.geometry.coordinates[0];
}

/**
 * The rings of one band: the area between two radii over the same bearings.
 * @returns {number[][][]} GeoJSON Polygon coordinates.
 */
function bandRings(center, innerRadius, outerRadius, angle1, angle2) {
    if (innerRadius <= 0) {
        // innermost band: no hole to cut, so this is just a sector
        return turf.sector(center, outerRadius, angle1, angle2).geometry.coordinates;
    }
    if (isFullSweep(angle1, angle2)) {
        return [
            outerRing(turf.circle(center, outerRadius)),
            outerRing(turf.circle(center, innerRadius)).slice().reverse(),
        ];
    }
    // A slice of an annulus: out along the far arc, back along the near one.
    const outer = turf.lineArc(center, outerRadius, angle1, angle2).geometry.coordinates;
    const inner = turf.lineArc(center, innerRadius, angle1, angle2).geometry.coordinates;
    return [[...outer, ...inner.slice().reverse(), outer[0]]];
}

/**
 * Build the coverage area for a tower as one or more polygons.
 *
 * A plain sector says "the phone was in here, and we are equally sure about every
 * point of it", which is not what a coverage estimate means: confidence falls off
 * with distance from the antenna. With `fields.gradient` the same wedge is drawn
 * as {@link GRADIENT_BANDS} concentric bands whose opacity fades outwards, so the
 * picture reads as a probability ramp rather than a hard edge.
 *
 * Bands rather than an actual gradient because Mapbox GL cannot gradient-fill a
 * polygon — `fill-opacity` is per feature. Nested bands are also what makes this
 * survive everything else the app does: each band is an ordinary polygon, so the
 * KML export, the sector/tower link and the .cellmap round trip need no special
 * case. The bands do not overlap, so what you see is each band's own opacity and
 * not an accumulation of them.
 *
 * A tower with radius 0 gets no polygon at all. validateTowerFields has always
 * allowed that — it is how you place a tower whose coverage comes from a KMZ
 * overlay instead — but turf.sector rejects a 0 radius outright ("radius is
 * required", since it tests for falsy), so the documented case used to throw on
 * the way from the form to the map.
 *
 * @param {object} fields Same fields as {@link buildCoverageSector}, plus
 *   `gradient` (boolean).
 * @returns {object[]} No polygon, one, or GRADIENT_BANDS of them.
 */
export function buildCoverageSectors(fields) {
    const radius = Number(fields.radius);
    if (!Number.isFinite(radius) || radius <= 0) return [];
    if (!fields.gradient) return [buildCoverageSector(fields)];

    const { lon, lat, angle1, angle2 } = fields;
    const opacity = parseFloat(fields.opacity);
    const center = [lon, lat];

    const sectors = [];
    for (let band = 0; band < GRADIENT_BANDS; band++) {
        const properties = {
            name: fields.name,
            description: fields.description,
            fill: fields.fill,
            // full strength at the antenna, fading to a fraction of it at the rim
            'fill-opacity': opacity * (1 - band / GRADIENT_BANDS),
            // No outline on the bands: they are one shape cut into slices, and
            // drawing every cut is exactly the artefact to avoid.
            ...outline(fields.fill, 0, 0),
            marker: 'cell',
            band,
        };
        if (fields.towerid !== undefined) properties.towerid = fields.towerid;

        sectors.push(
            turf.polygon(
                bandRings(
                    center,
                    (radius * band) / GRADIENT_BANDS,
                    (radius * (band + 1)) / GRADIENT_BANDS,
                    angle1,
                    angle2,
                ),
                properties,
            ),
        );
    }
    return sectors;
}

/**
 * Build the pair of GeoJSON features that represent a single cell tower:
 *   1. a Point marker at the tower location, and
 *   2. its coverage sector (see {@link buildCoverageSector}).
 *
 * Used by the paths that create a NEW tower from scratch — the add/edit form and
 * the CSV importer. The GeoJSON importer instead keeps the marker from the file
 * and only calls {@link buildCoverageSector}.
 *
 * @param {object} fields Same fields as {@link buildCoverageSector}.
 * @returns {{ marker: object, sectors: object[] }} The point and its coverage
 *   polygons — one, or one per band when the tower is drawn as a graduated cone.
 */
export function buildTowerFeature(fields) {
    const { lon, lat, radius, angle1, angle2, name, description, fill } = fields;
    const opacity = parseFloat(fields.opacity);

    // buildCoverageSectors below is the one that decides how many polygons this
    // tower gets (none, one, or one per band).
    const marker = turf.point([lon, lat], {
        name,
        description,
        fill,
        marker: 'cell',
        meta: 'feature',
        Angle1: angle1,
        Angle2: angle2,
        Radius: radius,
        opacity,
        // On the marker, not on the polygons: the sectors are derived and get
        // rebuilt from the marker's fields on every import, so this is where the
        // choice has to live for it to survive a save/open cycle.
        gradient: Boolean(fields.gradient),
        // Same reasoning for the network identity — it describes the cell, not
        // its coverage estimate. Spread last so an absent field stays `undefined`
        // and drops out of the exported JSON rather than being written as "".
        ...normalizeCellIdentity(fields),
    });

    return { marker, sectors: buildCoverageSectors(fields) };
}

/**
 * Normalise one parsed CSV row (Papa Parse with `header: true, dynamicTyping: true`)
 * into the field object expected by {@link buildTowerFeature}. Keeps CSV column
 * naming in one place.
 *
 * @param {object} row Raw CSV row keyed by column header.
 * @returns {object} Fields for buildTowerFeature.
 */
export function csvRowToTowerFields(row) {
    return {
        lon: row.lon,
        lat: row.lat,
        radius: row.radius,
        angle1: row.angle1,
        angle2: row.angle2,
        name: row.name,
        description: row.desc,
        fill: row.fill,
        opacity: row.opacity,
        // optional column; a file without it just gets plain sectors
        gradient: Boolean(row.gradient),
        // optional identity columns; a file without them gets a tower with no
        // network metadata, which is what every CSV produced so far contains
        cellId: row.cellid,
        lac: row.lac,
        mcc: row.mcc,
        mnc: row.mnc,
        cellType: row.celltype,
    };
}

/**
 * Derive the sector fields from an imported GeoJSON cell-marker feature. The
 * marker stores radius/angles capitalised (`Radius`, `Angle1`, `Angle2`); this
 * maps them back to the lower-case field names and links the sector to the
 * feature via `towerid: feature.id`, matching the legacy `importjson` behaviour.
 *
 * @param {object} feature A GeoJSON Point feature with `properties.marker === 'cell'`.
 * @returns {object} Fields for {@link buildCoverageSector}.
 */
// Treat empty/blank input as "not a number" instead of coercing it to 0. The
// legacy check used isFinite(value) directly, but isFinite('') is true (=== 0),
// so an empty latitude/longitude passed validation and then produced a tower at
// NaN coordinates via parseFloat(''). Number('') is also 0, so guard the blanks.
function toNumber(value) {
    if (value === '' || value === null || value === undefined) return NaN;
    return Number(value);
}

/**
 * Validate the numeric fields for a cell tower before building it. Pure and
 * DOM-free so it can be unit-tested; the form handler reads the inputs and passes
 * them here. Completes the old `// TODO: check other fields` in validateCellInput.
 *
 * Domain rules:
 *  - radius may be 0 — that adds a tower with no coverage sector, e.g. when the
 *    coverage area is already provided by a KMZ overlay.
 *  - angles may be negative — sectors are expressed as azimuth offsets, so an
 *    antenna pointing at azimuth 0 with a 120° beam is start=-60, end=60.
 *
 * The network identity fields are optional and validated by cellIdentity.js;
 * they are folded in here so the form has one call to make and one list of
 * messages to show.
 *
 * @param {object} fields { lat, lon, radius, angle1, angle2 } (strings or
 *   numbers), plus the optional { cellId, lac, mcc, mnc, cellType }.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTowerFields(fields) {
    const errors = [];
    const lat = toNumber(fields.lat);
    const lon = toNumber(fields.lon);
    const radius = toNumber(fields.radius);
    const angle1 = toNumber(fields.angle1);
    const angle2 = toNumber(fields.angle2);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        errors.push('Latitude must be a number between -90 and 90.');
    }
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
        errors.push('Longitude must be a number between -180 and 180.');
    }
    if (!Number.isFinite(radius) || radius < 0) {
        errors.push('Radius must be 0 or a positive number.');
    }
    if (!Number.isFinite(angle1) || angle1 < -360 || angle1 > 360) {
        errors.push('Start angle must be between -360 and 360.');
    }
    if (!Number.isFinite(angle2) || angle2 < -360 || angle2 > 360) {
        errors.push('End angle must be between -360 and 360.');
    }

    errors.push(...validateCellIdentity(fields));

    return { valid: errors.length === 0, errors };
}

export function towerFieldsFromFeature(feature) {
    const [lon, lat] = feature.geometry.coordinates;
    const p = feature.properties;
    return {
        lon,
        lat,
        radius: p.Radius,
        angle1: p.Angle1,
        angle2: p.Angle2,
        name: p.name,
        description: p.description,
        fill: p.fill,
        opacity: p.opacity,
        gradient: Boolean(p.gradient),
        towerid: feature.id,
    };
}
