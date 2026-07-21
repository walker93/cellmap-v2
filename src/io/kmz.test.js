import { describe, it, expect } from 'vitest';
import { parseLatLonBox } from './kmz.js';

const kml = (box) => `<?xml version="1.0"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <GroundOverlay>
    <name>overlay</name>
    ${box}
  </GroundOverlay>
</kml>`;

describe('parseLatLonBox', () => {
    it('reads the four edges as numbers', () => {
        const text = kml(`<LatLonBox>
            <north>45.5</north><south>45.0</south><east>9.3</east><west>9.1</west>
        </LatLonBox>`);
        expect(parseLatLonBox(text)).toEqual({ north: 45.5, south: 45.0, east: 9.3, west: 9.1 });
    });

    it('handles negative coordinates', () => {
        const text = kml(`<LatLonBox>
            <north>-10</north><south>-20</south><east>-30</east><west>-40</west>
        </LatLonBox>`);
        expect(parseLatLonBox(text)).toEqual({ north: -10, south: -20, east: -30, west: -40 });
    });

    it('throws a clear error when there is no LatLonBox', () => {
        expect(() => parseLatLonBox(kml(''))).toThrow(/no <LatLonBox>/);
    });

    it('throws when an edge is missing', () => {
        const text = kml(`<LatLonBox><north>1</north><south>2</south><east>3</east></LatLonBox>`);
        expect(() => parseLatLonBox(text)).toThrow(/<west>/);
    });

    it('throws when an edge is not a number', () => {
        const text = kml(`<LatLonBox>
            <north>x</north><south>2</south><east>3</east><west>4</west>
        </LatLonBox>`);
        expect(() => parseLatLonBox(text)).toThrow(/<north>/);
    });
});
