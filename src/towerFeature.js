import * as turf from '@turf/turf';

/**
 * Build the pair of GeoJSON features that represent a single cell tower:
 *   1. a Point marker at the tower location, and
 *   2. a Polygon "coverage sector" drawn with turf.sector().
 *
 * This is the single source of truth for tower-feature construction. The legacy
 * code builds this exact structure in two separate places — the add/edit form
 * (`createFeatureFromInput`) and the CSV importer (`openfile`) — with identical
 * property mapping. Both call sites will be migrated to use this function so the
 * shape can never drift between the two paths again.
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

    const sector = turf.sector(
        [lon, lat],
        radius,
        angle1,
        angle2,
        {
            properties: {
                name,
                description,
                fill,
                'fill-opacity': opacity,
                marker: 'cell',
            },
        }
    );

    return { marker, sector };
}

/**
 * Normalise one parsed CSV row (as produced by Papa Parse with
 * `header: true, dynamicTyping: true`) into the field object expected by
 * {@link buildTowerFeature}. Kept separate so CSV column naming lives in one
 * place and can be unit-tested without a browser or a live map.
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
