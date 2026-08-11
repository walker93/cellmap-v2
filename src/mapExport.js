// Repair for the PNG/JPEG export, which used to come out with no coverage sectors,
// no distance rings and no ring labels on it — only the basemap and the markers.
//
// @watergis/mapbox-gl-export renders by building a second, hidden map from
// `map.getStyle()`, and it passes the style through a serialiser of its own:
//
//     stringify(o) { const seen = []; return JSON.stringify(o, function (k, v) {
//         if (typeof v === 'object' && v) { if (seen.indexOf(v) !== -1) return; seen.push(v) }
//         return v }) }
//
// That is meant to survive circular references, but it drops *every repeated object
// reference*, not just the ones that close a cycle — and a GeoJSON tree is full of
// repeats that are perfectly legal:
//
//   - turf.sector closes its ring on the very array it opened with, so the last
//     vertex of every coverage polygon came back as `null`;
//   - a ring label is anchored on the same coordinate array as the first vertex of
//     its arc, so the label lost its `coordinates` key outright;
//   - MapboxDraw keeps one feature object in both its cold and its hot source, so a
//     feature being edited can go missing from whichever it is serialised into second.
//
// One invalid feature is enough to fail the whole source, which is why a single
// shared array took the entire cone, its rings and its labels out of the picture.
//
// The style returned by getStyle() is a plain spec with no cycles in it — Mapbox
// serialises it with a bare JSON.stringify itself — so the guard buys nothing here
// and costs the export its content. Replace it with the plain thing.
export function installExportSerializerFix(namespace) {
    const generator = namespace?.MapGenerator?.prototype;
    if (typeof generator?.stringify !== 'function') {
        // Renamed or fixed upstream: say so rather than fail quietly, because the
        // symptom is an export that looks fine until you notice what is missing.
        console.warn(
            'mapbox-gl-export: MapGenerator.prototype.stringify not found — the export ' +
                'serialiser fix was not applied. Check a PNG export still shows the sectors.',
        );
        return false;
    }

    generator.stringify = (style) => JSON.stringify(style);
    return true;
}
