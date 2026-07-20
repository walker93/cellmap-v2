import { describe, it, expect } from 'vitest';
import {
    buildCoverageSector,
    buildTowerFeature,
    csvRowToTowerFields,
    towerFieldsFromFeature,
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
        const { sector } = buildTowerFeature(baseFields);
        expect(sector.properties).toEqual(buildCoverageSector(baseFields).properties);
    });

    it('coerces a string opacity to a number', () => {
        const { marker, sector } = buildTowerFeature({ ...baseFields, opacity: '0.25' });
        expect(marker.properties.opacity).toBe(0.25);
        expect(sector.properties['fill-opacity']).toBe(0.25);
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
        expect(fromCsv.sector.properties).toEqual(fromForm.sector.properties);
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
