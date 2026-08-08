// Mapbox/MapboxDraw event handlers: measurement labels on draw.render, sidebar
// refresh on draw create/delete/update, the tower/POI click popup, the contextmenu
// lat/lon fill-in, and the marker hover cursor. Split out of bootstrap.js so the
// bootstrap file is just layer/control setup plus button wiring.
import * as turf from '@turf/turf';
import { map } from './map.js';
import { draw } from './draw.js';
import { createTable } from './ui/table.js';
import { editFeature } from './ui/form.js';
import { el } from './ui/dom.js';
import { cellIdentityLines } from './cellIdentity.js';

// `numeral` and `mapboxgl` are CDN globals from index.html.

// The popup is built as an HTML string, and every value in it comes from a
// name/description someone typed or, worse, from an imported CSV or GeoJSON —
// an ampersand or an angle bracket in there would otherwise reshape the markup.
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function registerMapEvents() {
    // on draw.render update the measurments
    map.on('draw.render', function () {
        var labelFeatures = [];

        var all = draw.getAll();
        if (all && all.features) {
            all.features.forEach(function (feature) {
                switch (turf.getType(feature)) {
                    case 'Point': {
                        // label Points

                        //Remove this check if you want cells to show coordinates
                        if (feature.properties.marker != 'cell') {
                            if (feature.geometry.coordinates.length > 1) {
                                const label =
                                    feature.properties.name ||
                                    feature.geometry.coordinates[1].toFixed(6) +
                                        ',\n ' +
                                        feature.geometry.coordinates[0].toFixed(6);
                                const offset = feature.properties.icon ? 3 : 1.3;
                                labelFeatures.push(
                                    turf.point(feature.geometry.coordinates, {
                                        type: 'point',
                                        label: label,
                                        size: feature.properties.name ? 16 : 12,
                                        offset: offset,
                                    }),
                                );
                            }
                        }
                        break;
                    }
                    case 'LineString': {
                        // label Lines
                        if (feature.geometry.coordinates.length > 1) {
                            const length = turf.length(feature);
                            const label =
                                feature.properties.name ||
                                numeral(length * 1000).format('0,0.0a') + 'm';
                            const midpoint = turf.along(feature, length / 2);
                            midpoint.properties = {
                                type: 'line',
                                label: label,
                                size: 16,
                                offset: 0.5,
                            };
                            labelFeatures.push(midpoint);
                        }
                        break;
                    }
                    case 'Polygon': {
                        // label Polygons
                        if (
                            feature.geometry.coordinates.length > 0 &&
                            feature.geometry.coordinates[0].length > 3
                        ) {
                            const area = math.unit(turf.area(feature), 'm^2');
                            const label =
                                feature.properties.name ||
                                area.format({ notation: 'fixed', precision: 2 }); //numeral(area).format('0,0.0a') + 'm²';
                            const centroid = turf.centroid(feature);
                            centroid.properties = {
                                type: 'fill',
                                label: label,
                                size: 16,
                                offset: 0,
                            };
                            labelFeatures.push(centroid);
                        }
                        break;
                    }
                }
            });
        }
        map.getSource('_measurements').setData({
            type: 'FeatureCollection',
            features: labelFeatures,
        });
    });

    map.on('draw.create', function (e) {
        var feature = draw.get(e.features[0].id);
        feature.properties.fill = '#ff0000';
        feature.properties.opacity = 0.2;
        draw.add(feature);
        createTable(draw.getAll());

        // A point drawn on the map is a POI, and a POI without an icon is only
        // half-made: it used to take three separate steps (place it, find its row
        // in the sidebar, open it with the pencil) to pick one. Chain the form onto
        // the placement instead — click-to-place is kept, the form just opens on
        // top of it. Re-read the feature through draw.get so the form sees the
        // defaults applied just above.
        //
        // Points only: draw.create also fires for the measurement lines and
        // polygons, and a modal after every one of those would be in the way (they
        // even finish on a double click). Those keep the sidebar pencil. Cells are
        // unaffected — addTower calls draw.add directly, which emits no draw.create.
        if (feature.geometry.type === 'Point') {
            editFeature(draw.get(feature.id));
        }
    });

    map.on('draw.delete', function () {
        createTable(draw.getAll());
    });

    map.on('draw.update', function () {
        createTable(draw.getAll());
    });

    map.on('contextmenu', (e) => {
        if (el('inputs').style.display == 'block') {
            var lat = el('inp_lat');
            var lon = el('inp_lon');
            lat.value = e.lngLat.lat;
            lon.value = e.lngLat.lng;
        }
    });

    map.on('click', ['markers'], function (e) {
        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        // The `markers` layer is filtered to marker == 'cell', so whatever was
        // clicked is a tower.
        const name = feature.properties.name || 'Unnamed cell';
        const description = feature.properties.description || 'No description';

        // Where the network identity earns its keep: the codes are recorded on
        // the tower, and this is where they are read back — click the antenna,
        // get the CGI you have to quote in the report.
        const identity = cellIdentityLines(feature.properties)
            .map((line) => `<br><small>${escapeHtml(line.label)}: ${escapeHtml(line.value)}</small>`)
            .join('');

        new mapboxgl.Popup({ offset: [0, -25] })
            .setLngLat(coordinates)
            .setHTML(
                `<strong>${escapeHtml(name)}</strong><br>${escapeHtml(description)}${identity}`,
            )
            .addTo(map);
    });

    // Cambia il cursore quando passi sopra un marker
    map.on('mouseenter', 'markers', function () {
        map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'markers', function () {
        map.getCanvas().style.cursor = '';
    });
}
