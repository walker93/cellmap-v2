// Mapbox/MapboxDraw event handlers: measurement labels on draw.render, sidebar
// refresh on draw create/delete/update, the tower/POI click popup, the contextmenu
// lat/lon fill-in, and the marker hover cursor. Split out of bootstrap.js so the
// bootstrap file is just layer/control setup plus button wiring; there's no shared
// logic or state here worth testing in isolation, so this is a straight code move,
// not a behavioural change.
import * as turf from '@turf/turf';
import { map } from './map.js';
import { draw } from './draw.js';
import { createTable } from './ui/table.js';
import { el } from './ui/dom.js';

// `numeral` and `mapboxgl` are CDN globals from index.html.

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
        const name = feature.properties.name || 'PoI';
        const description = feature.properties.description || 'Nessuna descrizione';

        new mapboxgl.Popup({ offset: [0, -25] })
            .setLngLat(coordinates)
            .setHTML(`<strong>${name}</strong><br>${description}`)
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
