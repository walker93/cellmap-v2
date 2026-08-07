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
});

describe('buildCoverageSectors', () => {
    const areaOf = (feature) => turf.area(feature);

    it('is a single plain sector unless the gradient is asked for', () => {
        const sectors = buildCoverageSectors(baseFields);
        expect(sectors).toHaveLength(1);
        expect(sectors[0].geometry).toEqual(buildCoverageSector(baseFields).geometry);
    });

    it('splits the wedge into bands that fade outwards', () => {
        const sectors = buildCoverageSectors({ ...baseFields, gradient: true });
        expect(sectors).toHaveLength(GRADIENT_BANDS);

        const opacities = sectors.map((s) => s.properties['fill-opacity']);
        // full strength at the antenna, monotonically down to the rim
        expect(opacities[0]).toBeCloseTo(0.5, 10);
        for (let i = 1; i < opacities.length; i++) {
            expect(opacities[i]).toBeLessThan(opacities[i - 1]);
        }
        expect(opacities[opacities.length - 1]).toBeGreaterThan(0);
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

    it('covers the same ground as the plain sector, once', () => {
        const plain = buildCoverageSector(baseFields);
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        const banded = bands.reduce((sum, band) => sum + areaOf(band), 0);
        // Bands tile the wedge instead of stacking on it: their areas add up to the
        // whole, which is what keeps each one's opacity the one you actually see.
        expect(banded / areaOf(plain)).toBeCloseTo(1, 2);
    });

    it('grows outwards: every band is further from the tower than the last', () => {
        const center = turf.point([baseFields.lon, baseFields.lat]);
        const bands = buildCoverageSectors({ ...baseFields, gradient: true });
        const distances = bands.map((band) =>
            turf.distance(center, turf.centroid(band), { units: 'kilometers' }),
        );
        for (let i = 1; i < distances.length; i++) {
            expect(distances[i]).toBeGreaterThan(distances[i - 1]);
        }
        // and none of them reaches past the tower's radius
        expect(Math.max(...distances)).toBeLessThan(baseFields.radius);
    });

    it('makes each band a valid closed ring', () => {
        for (const band of buildCoverageSectors({ ...baseFields, gradient: true })) {
            expect(band.geometry.type).toBe('Polygon');
            for (const ring of band.geometry.coordinates) {
                expect(ring.length).toBeGreaterThan(3);
                expect(ring[0]).toEqual(ring[ring.length - 1]);
            }
        }
    });

    it('handles a full circle, where a band is a ring with a hole', () => {
        const bands = buildCoverageSectors({ ...baseFields, angle1: 0, angle2: 360, gradient: true });
        expect(bands).toHaveLength(GRADIENT_BANDS);
        // the innermost is a disc; every other one has the previous radius cut out
        expect(bands[0].geometry.coordinates).toHaveLength(1);
        expect(bands[1].geometry.coordinates).toHaveLength(2);

        const plain = buildCoverageSector({ ...baseFields, angle1: 0, angle2: 360 });
        const banded = bands.reduce((sum, band) => sum + areaOf(band), 0);
        expect(banded / areaOf(plain)).toBeCloseTo(1, 2);
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
        });
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
        expect(validateTowerFields({ lat: '45.46', lon: '9.19', radius: '2', angle1: '0', angle2: '90' }).valid).toBe(true);
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
