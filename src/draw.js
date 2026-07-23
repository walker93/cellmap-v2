// The single MapboxDraw instance — the feature store for cell-tower markers,
// POIs, and the freehand measurement lines/polygons. Every module shares this one
// instance (imported as `draw`), mirroring how src/map.js shares the map.
//
// MapboxDraw is provided as a global by the CDN <script> in index.html (loaded
// before the module scripts). The control is constructed here and attached to the
// map later, via map.addControl(draw, ...) in bootstrap.js's addMeasurementTools.
//
// The big `styles` array is the app's custom Mapbox Draw theme, moved verbatim
// from the old inline `new MapboxDraw({...})` call.

export const draw = new MapboxDraw({
    styles: [
        // default themes provided by MB Draw
        {
            id: 'gl-draw-polygon-fill-inactive',
            type: 'fill',
            filter: [
                'all',
                ['==', 'active', 'false'],
                ['==', '$type', 'Polygon'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'fill-color': ['get', 'user_fill'], //'#3bb2d0',
                'fill-outline-color': ['get', 'user_fill'], //'#3bb2d0',
                'fill-opacity': ['get', 'user_opacity'], //0.1
            },
        },
        {
            id: 'gl-draw-polygon-fill-active',
            type: 'fill',
            filter: [
                'all',
                ['==', 'active', 'true'],
                ['==', '$type', 'Polygon'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'fill-color': '#fbb03b',
                'fill-outline-color': '#fbb03b',
                'fill-opacity': 0.1,
            },
        },
        {
            id: 'gl-draw-polygon-midpoint',
            type: 'circle',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['==', 'meta', 'midpoint'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'circle-radius': 3,
                'circle-color': '#fbb03b',
            },
        },
        {
            id: 'gl-draw-polygon-stroke-inactive',
            type: 'line',
            filter: [
                'all',
                ['==', 'active', 'false'],
                ['==', '$type', 'Polygon'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
            ],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': ['get', 'user_fill'], //'#3bb2d0',
                'line-width': 2,
            },
        },
        {
            id: 'gl-draw-polygon-stroke-active',
            type: 'line',
            filter: [
                'all',
                ['==', 'active', 'true'],
                ['==', '$type', 'Polygon'],
                ['!=', 'user_marker', 'cell'],
            ],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': '#fbb03b',
                'line-dasharray': [0.2, 2],
                'line-width': 2,
            },
        },
        {
            id: 'gl-draw-polygon-and-line-vertex-stroke-inactive',
            type: 'circle',
            filter: [
                'all',
                ['==', 'meta', 'vertex'],
                ['==', '$type', 'Point'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'circle-radius': 7,
                'circle-color': '#fff',
            },
        },
        {
            id: 'gl-draw-polygon-and-line-vertex-inactive',
            type: 'circle',
            filter: [
                'all',
                ['==', 'meta', 'vertex'],
                ['==', '$type', 'Point'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'circle-radius': 5,
                'circle-color': '#fbb03b',
            },
        },

        {
            id: 'gl-draw-polygon-fill-static',
            type: 'fill',
            filter: [
                'all',
                ['==', 'mode', 'static'],
                ['==', '$type', 'Polygon'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'fill-color': '#404040',
                'fill-outline-color': '#404040',
                'fill-opacity': 0.1,
            },
        },
        {
            id: 'gl-draw-polygon-stroke-static',
            type: 'line',
            filter: [
                'all',
                ['==', 'mode', 'static'],
                ['==', '$type', 'Polygon'],
                ['!=', 'user_marker', 'cell'],
            ],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': '#404040',
                'line-width': 2,
            },
        },
        {
            id: 'gl-draw-line-static',
            type: 'line',
            filter: [
                'all',
                ['==', 'mode', 'static'],
                ['==', '$type', 'LineString'],
                ['!=', 'user_marker', 'cell'],
            ],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': '#404040',
                'line-width': 2,
            },
        }, // end default themes provided by MB Draw
        {
            id: 'gl-draw-point-point-stroke-inactive', //INATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', 'active', 'false'],
                ['==', '$type', 'Point'],
                ['==', 'meta', 'feature'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 10,
                'circle-opacity': 1,
                'circle-color': '#000',
            },
        },
        {
            id: 'gl-draw-point-inactive', //INATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', 'active', 'false'],
                ['==', '$type', 'Point'],
                ['==', 'meta', 'feature'],
                ['!=', 'mode', 'static'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 8,
                'circle-color': ['get', 'user_fill'], //'#ffe63b'
            },
        },
        {
            id: 'gl-draw-point-center-inactive', //Centro Punto INATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['!=', 'meta', 'midpoint'],
                ['==', 'active', 'false'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 2,
                'circle-color': '#000000',
            },
        },
        {
            id: 'gl-draw-point-stroke-active', //bordo punto ATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['==', 'active', 'true'],
                ['!=', 'meta', 'midpoint'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 12, //default è 7
                'circle-color': '#000000', // Default'#fff'
            },
        },
        {
            id: 'gl-draw-point-active', //intermedio punto ATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['!=', 'meta', 'midpoint'],
                ['==', 'active', 'true'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 10, //default è 5
                'circle-color': ['get', 'user_fill'], //'#ffe63b' //'#fbb03b'
            },
        },
        {
            id: 'gl-draw-point-center-active', //Centro Punto ATTIVO
            type: 'circle',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['!=', 'meta', 'midpoint'],
                ['==', 'active', 'true'],
                ['!=', 'user_marker', 'cell'],
                ['!has', 'user_icon'],
            ],
            paint: {
                'circle-radius': 3,
                'circle-color': '#000000',
            },
        },
        {
            id: 'gl-draw-line-inactive', //LINEA INATTIVO
            type: 'line',
            filter: [
                'all',
                ['==', 'active', 'false'],
                ['==', '$type', 'LineString'],
                ['!=', 'mode', 'static'],
            ],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': ['get', 'user_fill'], //'#000000', //'#3bb2d0',
                'line-width': 2,
            },
        },
        {
            id: 'gl-draw-line-active', //LINEA ATTIVO
            type: 'line',
            filter: ['all', ['==', '$type', 'LineString'], ['==', 'active', 'true']],
            layout: {
                'line-cap': 'round',
                'line-join': 'round',
            },
            paint: {
                'line-color': '#fbb03b',
                'line-dasharray': [0.2, 2],
                'line-width': 2,
            },
        },
        {
            id: 'gl-draw-point-static',
            type: 'circle',
            filter: [
                'all',
                ['==', 'mode', 'static'],
                ['==', '$type', 'Point'],
                ['!=', 'user_marker', 'cell'],
            ],
            paint: {
                'circle-radius': 5,
                'circle-color': '#404040',
            },
        },
        {
            id: 'gl-draw-point-icon',
            type: 'symbol',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['==', 'meta', 'feature'],
                ['has', 'user_icon'],
            ],
            layout: {
                'icon-image': ['get', 'user_icon'],
                'icon-allow-overlap': true,
                'icon-size': 0.9,
                'text-allow-overlap': false,
                'text-ignore-placement': true,
                'icon-ignore-placement': true,
                'icon-anchor': 'bottom',
            },
        },
        {
            id: 'gl-draw-point-icon-active',
            type: 'symbol',
            filter: [
                'all',
                ['==', '$type', 'Point'],
                ['==', 'meta', 'feature'],
                ['has', 'user_icon'],
                ['==', 'active', 'true'],
            ],
            layout: {
                'icon-image': ['get', 'user_icon'],
                'icon-allow-overlap': true,
                'icon-size': 1.1,
                'text-allow-overlap': false,
                'icon-ignore-placement': true,
                'icon-anchor': 'bottom',
            },
        },
    ],
    userProperties: true,
});
