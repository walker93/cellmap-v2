import * as turf from '@turf/turf';

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
        marker: 'cell',
    };
    if (towerid !== undefined) {
        properties.towerid = towerid;
    }

    return turf.sector([lon, lat], radius, angle1, angle2, { properties });
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
 * @returns {{ marker: object, sector: object }} The point and sector features.
 */
export function buildTowerFeature(fields) {
    const { lon, lat, radius, angle1, angle2, name, description, fill } = fields;
    const opacity = parseFloat(fields.opacity);

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
    });

    const sector = buildCoverageSector(fields);

    return { marker, sector };
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
 * @param {object} fields { lat, lon, radius, angle1, angle2 } (strings or numbers).
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
        towerid: feature.id,
    };
}
