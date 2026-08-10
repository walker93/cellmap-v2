import { describe, it, expect } from 'vitest';
import * as turf from '@turf/turf';
import {
    buildCoverageSector,
    buildCoverageSectors,
    buildTowerFeature,
    csvRowToTowerFields,
    towerFieldsFromFeature,
    validateTowerFields,
    GRADIENT_BANDS,
} from './towerFeature.js';

const baseFields = {
    lon: 9.19,
    lat: 45.46,
    radius: 2,
    angle1: 0,
    angle2: 90,
    name: 'Tower A',
    description: 'city centre',
    fill: '#ff0000',
    opacity: 0.5,
};

describe('buildCoverageSector', () => {
    it('creates a closed Polygon ring', () => {
        const sector = buildCoverageSector(baseFields);
        expect(sector.geometry.type).toBe('Polygon');
        const ring = sector.geometry.coordinates[0];
        expect(ring.length).toBeGreaterThan(3);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
    });

    it('maps opacity onto the fill-opacity paint property and hardcodes marker=cell', () => {
        const sector = buildCoverageSector(baseFields);
        expect(sector.properties['fill-opacity']).toBe(0.5);
        expect(sector.properties.fill).toBe('#ff0000');
        expect(sector.properties.marker).toBe('cell');
    });

    // Not decoration: tokml outlines a polygon in opaque grey whenever no stroke
    // property is present at all, so "no outline" has to be said out loud.
    it('outlines the sector in its own colour', () => {
        const sector = buildCoverageSector(baseFields);
        expect(sector.properties.stroke).toBe('#ff0000');
        expect(sector.properties['stroke-opacity']).toBe(1);
        expect(sector.properties['stroke-width']).toBe(1);
    });

    it('omits towerid when not provided (form/CSV attach it after draw.add)', () => {
        const sector = buildCoverageSector(baseFields);
        expect(sector.properties).not.toHaveProperty('towerid');
    });

    it('includes towerid when provided (GeoJSON import path)', () => {
        const sector = buildCoverageSector({ ...baseFields, towerid: 'abc-123' });
        expect(sector.properties.towerid).toBe('abc-123');
    });
});

describe('buildTowerFeature', () => {
    it('creates a Point marker at the given coordinates', () => {
        const { marker } = buildTowerFeature(baseFields);
        expect(marker.geometry.type).toBe('Point');
        expect(marker.geometry.coordinates).toEqual([9.19, 45.46]);
    });

    it('carries the tower attributes onto the marker properties', () => {
        const { marker } = buildTowerFeature(baseFields);
        expect(marker.properties).toMatchObject({
            name: 'Tower A',
            description: 'city centre',
            fill: '#ff0000',
            marker: 'cell',
            meta: 'feature',
            Angle1: 0,
            Angle2: 90,
            Radius: 2,
            opacity: 0.5,
        });
    });

    it('produces the same sector as buildCoverageSector', () => {
        const { sectors } = buildTowerFeature(baseFields);
        expect(sectors).toHaveLength(1);
        expect(sectors[0].properties).toEqual(buildCoverageSector(baseFields).properties);
    });

    it('coerces a string opacity to a number', () => {
        const { marker, sectors } = buildTowerFeature({ ...baseFields, opacity: '0.25' });
        expect(marker.properties.opacity).toBe(0.25);
        expect(sectors[0].properties['fill-opacity']).toBe(0.25);
    });

    it('records the network identity on the marker', () => {
        const { marker } = buildTowerFeature({
            ...baseFields,
            cellId: '21437',
            lac: '4501',
            mcc: '222',
            mnc: '01',
            cellType: 'macro',
        });
        expect(marker.properties).toMatchObject({
            cellId: '21437',
            lac: '4501',
            mcc: '222',
            mnc: '01',
            cellType: 'macro',
        });
    });

    // The identity describes the cell, not its coverage estimate, and the
    // polygons are thrown away and rebuilt on every import.
    it('keeps the identity off the coverage polygons', () => {
        const { sectors } = buildTowerFeature({ ...baseFields, cellId: '21437' });
        expect(sectors[0].properties).not.toHaveProperty('cellId');
    });

    it('writes no identity keys at all when none were given', () => {
        const { marker } = buildTowerFeature(baseFields);
        expect(JSON.parse(JSON.stringify(marker.properties))).not.toHaveProperty('cellId');
    });
});

describe('buildCoverageSectors', () => {
    const areaOf = (feature) => turf.area(feature);

    it('is a single plain sector unless the gradient is asked for', () => {
        const sectors = buildCoverageSectors(baseFields);
        expect(sectors).toHaveLength(1);
        expect(sectors[0].geometry).toEqual(buildCoverageSector(baseFields).geometry);
    });

    // The bands are stacked, not tiled, so a band's own fill-opacity is what it
    // contributes and not what you see. What you see in ring k is every band from
    // k outwards composited together.
    const seenInRing = (bands, k) =>
        1 - bands.slice(k).reduce((through, b) => through * (1 - b.properties['fill-opacity']), 1);

    it('draws the ramp in GRADIENT_BANDS steps', () => {
        const sectors = buildCoverageSectors({ ...baseFields, gradient: true });
        expect(sectors).toHaveLength(GRADIENT_BANDS);

        const opacities = sectors.map((s) => s.properties['fill-opacity']);
        for (let i = 1; i < opacities.length; i++) {
            expect(opacities[i]).toBeLessThan(opacities[i - 1]);
        }
        expect(opacities[opacities.length - 1]).toBeGreaterThan(0);
    });

    // The one that matters: switching from abutting annuli to nested sectors was a
    // change of rendering, not of meaning, and the picture has to come out at the
    // same opacity it did before — full strength at the antenna, linearly down
    // towards the rim.
    it('composites to the same ramp the bands used to be painted at directly', () => {
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        for (let k = 0; k < GRADIENT_BANDS; k++) {
            expect(seenInRing(bands, k)).toBeCloseTo(0.5 * (1 - k / GRADIENT_BANDS), 10);
        }
    });

    it('composites the same whatever order the bands are drawn in', () => {
        // every band is the same colour, so 1 - Π(1 - aᵢ) is symmetric — neither
        // Mapbox's fill layer nor Google Earth promises us a draw order
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        expect(seenInRing([...bands].reverse(), 0)).toBeCloseTo(seenInRing(bands, 0), 10);
    });

    it('carries the same identity properties as a plain sector', () => {
        const sectors = buildCoverageSectors({ ...baseFields, gradient: true, towerid: 't1' });
        for (const sector of sectors) {
            expect(sector.properties).toMatchObject({
                name: 'Tower A',
                fill: '#ff0000',
                marker: 'cell',
                towerid: 't1',
            });
        }
    });

    // The bands are one shape cut into slices; drawing every cut is the artefact
    // to avoid. Stated explicitly because tokml's fallback for "no stroke given"
    // is a grey outline, not the absence of one.
    it('gives the bands no visible outline', () => {
        for (const band of buildCoverageSectors({ ...baseFields, gradient: true })) {
            expect(band.properties['stroke-opacity']).toBe(0);
            expect(band.properties['stroke-width']).toBe(0);
        }
    });

    // Nested, not tiled: the outermost band *is* the plain sector and the others
    // sit inside it. This is what removes the shared edges that antialiasing turned
    // into a visible hairline on every band boundary.
    it('nests the bands, the widest being the plain sector itself', () => {
        const plain = buildCoverageSector(baseFields);
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        expect(bands[bands.length - 1].geometry).toEqual(plain.geometry);
    });

    it('grows outwards: every band contains the one before it', () => {
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        const areas = bands.map(areaOf);
        for (let i = 1; i < areas.length; i++) {
            expect(areas[i]).toBeGreaterThan(areas[i - 1]);
        }
        // ...and the widest still stops at the tower's radius
        const center = turf.point([baseFields.lon, baseFields.lat]);
        const rim = turf
            .explode(bands[bands.length - 1])
            .features.map((p) => turf.distance(center, p, { units: 'kilometers' }));
        expect(Math.max(...rim)).toBeLessThanOrEqual(baseFields.radius + 1e-9);
    });

    it('makes each band a single unbroken ring', () => {
        for (const band of buildCoverageSectors({ ...baseFields, gradient: true })) {
            expect(band.geometry.type).toBe('Polygon');
            // no holes to cut any more — that was the annulus construction
            expect(band.geometry.coordinates).toHaveLength(1);
            const ring = band.geometry.coordinates[0];
            expect(ring.length).toBeGreaterThan(3);
            expect(ring[0]).toEqual(ring[ring.length - 1]);
        }
    });

    it('handles a full circle with no special case', () => {
        const full = { ...baseFields, angle1: 0, angle2: 360, gradient: true };
        const bands = buildCoverageSectors(full);
        expect(bands).toHaveLength(GRADIENT_BANDS);
        for (const band of bands) {
            expect(band.geometry.coordinates).toHaveLength(1);
        }
        expect(bands[bands.length - 1].geometry).toEqual(
            buildCoverageSector({ ...baseFields, angle1: 0, angle2: 360 }).geometry,
        );
    });

    // validateTowerFields allows radius 0 — a tower placed where the coverage comes
    // from a KMZ overlay instead — but turf.sector treats 0 as "no radius given"
    // and throws, so this used to blow up between the form and the map.
    it('gives a radius-0 tower no coverage polygon instead of throwing', () => {
        expect(buildCoverageSectors({ ...baseFields, radius: 0 })).toEqual([]);
        expect(buildCoverageSectors({ ...baseFields, radius: 0, gradient: true })).toEqual([]);
        expect(buildCoverageSectors({ ...baseFields, radius: '' })).toEqual([]);
    });
});

describe('csvRowToTowerFields', () => {
    it('maps CSV column names (desc -> description) to tower fields', () => {
        const row = {
            lon: 9.19,
            lat: 45.46,
            radius: 2,
            angle1: 0,
            angle2: 90,
            name: 'From CSV',
            desc: 'imported',
            fill: '#00ff00',
            opacity: 0.8,
        };
        expect(csvRowToTowerFields(row)).toEqual({
            lon: 9.19,
            lat: 45.46,
            radius: 2,
            angle1: 0,
            angle2: 90,
            name: 'From CSV',
            description: 'imported',
            fill: '#00ff00',
            opacity: 0.8,
            gradient: false,
            rings: false,
        });
    });

    it('maps the optional identity columns onto the identity fields', () => {
        const fields = csvRowToTowerFields({
            ...baseFields,
            desc: '',
            cellid: 21437,
            lac: 4501,
            mcc: 222,
            mnc: 1,
            celltype: 'macro',
        });
        expect(fields).toMatchObject({
            cellId: 21437,
            lac: 4501,
            mcc: 222,
            mnc: 1,
            cellType: 'macro',
        });
        // dynamicTyping ate the leading zero of "01"; the marker gets it back
        expect(buildTowerFeature(fields).marker.properties.mnc).toBe('01');
    });

    it('builds the same feature shape from the form and CSV paths', () => {
        const row = {
            lon: 9.19,
            lat: 45.46,
            radius: 2,
            angle1: 0,
            angle2: 90,
            name: 'Tower A',
            desc: 'city centre',
            fill: '#ff0000',
            opacity: 0.5,
        };
        const fromCsv = buildTowerFeature(csvRowToTowerFields(row));
        const fromForm = buildTowerFeature(baseFields);
        expect(fromCsv.marker.properties).toEqual(fromForm.marker.properties);
        expect(fromCsv.sectors[0].properties).toEqual(fromForm.sectors[0].properties);
    });
});

describe('validateTowerFields', () => {
    const valid = { lat: 45.46, lon: 9.19, radius: 2, angle1: 0, angle2: 90 };

    it('accepts valid numeric fields (as numbers or strings)', () => {
        expect(validateTowerFields(valid).valid).toBe(true);
        expect(
            validateTowerFields({
                lat: '45.46',
                lon: '9.19',
                radius: '2',
                angle1: '0',
                angle2: '90',
            }).valid,
        ).toBe(true);
    });

    it('rejects an empty latitude/longitude (the isFinite("") === true bug)', () => {
        const r = validateTowerFields({ ...valid, lat: '', lon: '' });
        expect(r.valid).toBe(false);
        expect(r.errors).toHaveLength(2);
    });

    it('rejects out-of-range coordinates', () => {
        expect(validateTowerFields({ ...valid, lat: 91 }).valid).toBe(false);
        expect(validateTowerFields({ ...valid, lon: -200 }).valid).toBe(false);
    });

    it('allows radius 0 (tower with no sector, e.g. coverage from an overlay)', () => {
        expect(validateTowerFields({ ...valid, radius: 0 }).valid).toBe(true);
        expect(validateTowerFields({ ...valid, radius: '0' }).valid).toBe(true);
    });

    it('rejects a negative radius', () => {
        expect(validateTowerFields({ ...valid, radius: -1 }).valid).toBe(false);
    });

    it('allows negative angles (azimuth offsets, e.g. start=-60 end=60)', () => {
        expect(validateTowerFields({ ...valid, angle1: -60, angle2: 60 }).valid).toBe(true);
    });

    it('rejects angles outside -360..360', () => {
        expect(validateTowerFields({ ...valid, angle1: -400 }).valid).toBe(false);
        expect(validateTowerFields({ ...valid, angle2: 400 }).valid).toBe(false);
    });

    it('collects one error message per invalid field', () => {
        const r = validateTowerFields({ lat: '', lon: '', radius: -1, angle1: -400, angle2: 400 });
        expect(r.valid).toBe(false);
        expect(r.errors).toHaveLength(5);
    });

    // The identity rules live in cellIdentity.js and are tested there; what
    // matters here is that the form's single validation call sees them.
    it('reports an invalid network identity alongside the geometry errors', () => {
        expect(validateTowerFields({ ...valid, cellId: '21A37' }).valid).toBe(false);
        const r = validateTowerFields({ ...valid, lat: '', mcc: '222' });
        expect(r.errors).toHaveLength(2);
    });

    it('stays valid for a tower with no identity, which is every tower so far', () => {
        expect(validateTowerFields(valid).valid).toBe(true);
    });
});

describe('towerFieldsFromFeature (GeoJSON import path)', () => {
    // A cell marker as it would appear inside an imported .geojson file: radius and
    // angles are stored capitalised on the marker's properties.
    const importedMarker = {
        id: 'draw-feature-id-9',
        geometry: { type: 'Point', coordinates: [9.19, 45.46] },
        properties: {
            name: 'Tower A',
            description: 'city centre',
            fill: '#ff0000',
            marker: 'cell',
            Angle1: 0,
            Angle2: 90,
            Radius: 2,
            opacity: 0.5,
        },
    };

    it('remaps capitalised marker props and links the sector via towerid = feature.id', () => {
        const fields = towerFieldsFromFeature(importedMarker);
        expect(fields).toEqual({
            lon: 9.19,
            lat: 45.46,
            radius: 2,
            angle1: 0,
            angle2: 90,
            name: 'Tower A',
            description: 'city centre',
            fill: '#ff0000',
            opacity: 0.5,
            gradient: false,
            towerid: 'draw-feature-id-9',
        });
    });

    it('reconstructs a sector matching the original form-built one (plus towerid)', () => {
        const importedSector = buildCoverageSector(towerFieldsFromFeature(importedMarker));
        const formSector = buildCoverageSector(baseFields);
        // Geometry and shared properties match; the imported one additionally links back.
        expect(importedSector.geometry).toEqual(formSector.geometry);
        expect(importedSector.properties).toMatchObject(formSector.properties);
        expect(importedSector.properties.towerid).toBe('draw-feature-id-9');
    });
});
