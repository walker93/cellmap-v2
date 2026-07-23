import { map } from './src/map.js';
import { getSectors } from './src/sectors.js';
import { draw } from './src/draw.js';
import { exportGeoJSON, importGeoJSON } from './src/io/geojson.js';
import { exportKML } from './src/io/kml.js';
import { importCSV } from './src/io/csv.js';
import { importKMZ } from './src/io/kmz.js';
import { addGeoJsonSource } from './src/mapSource.js';
import { openForm, closeForm, aggiungiCella, submitEditForm } from './src/ui/form.js';
import { loadIcons } from './src/ui/iconPicker.js';
import { deleteAll } from './src/reset.js';
import { registerMapEvents } from './src/mapEvents.js';

map.on('load', setupMapLayers);

function setupMapLayers() {
    const geojson = {
        'type': 'FeatureCollection',
        'features': []
    };
    addGeoJsonSource('settori', geojson);
    addGeoJsonSource('aree', getSectors());
    addCellLayer();
    addOtherTools();
    addMeasurementTools();
    loadIcons();
}

function addCellLayer() {
    map.loadImage("cell-tower.png", (error, image) => {
        if (error) throw error;
        map.addImage('tower', image, { sdf: true });
    });
    map.addLayer({
        id: 'sectors',
        type: 'fill',
        source: 'aree',
        paint: {
            "fill-color": ["get", "fill"],
            "fill-opacity": ["get", "fill-opacity"]
        }
    });

    map.addLayer({
        id: 'markers',
        type: 'symbol',
        source: 'settori',
        layout: {
            "icon-image": 'tower',
            "icon-size": 0.7,
            "text-field": ["get", "name"],
            "text-variable-anchor": ["bottom", "top", "left", "right"],
            "text-justify": "auto",
            "text-radial-offset": 1.5,
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
        },
        paint: {
            "icon-color": ["get", "fill"],
        },
        filter: ['all', ["==", ["geometry-type"], "Point"],
            ['==', ['get', "marker"], 'cell'],
        ]

    });
}

function addOtherTools() {
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl
        })
    );
    map.addControl(
        new mapboxgl.NavigationControl({ position: 'top-left' })
    );
    // Control implemented as ES6 class
    class IControl {
        onAdd(map) {
            this._map = map;
            this._container = document.createElement('div');
            this._container.className = 'mapboxgl-ctrl';
            this._container.textContent = 'Icontrol';
            return this._container;
        }

        onRemove() {
            this._container.parentNode.removeChild(this._container);
            this._map = undefined;
        }
    }

    map.addControl(new MapboxExportControl({
        PageSize: Size.A4,
        PageOrientation: PageOrientation.Landscape,
        Format: Format.PNG,
        DPI: DPI[200],
        Crosshair: true,
        PrintableArea: true,
    }), 'top-right');


}

function addMeasurementTools() {
    map.addControl(draw, 'top-left');

    // measurements source
    map.addSource('_measurements', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // measurements layer
    map.addLayer({
        id: '_measurements',
        source: '_measurements',
        type: 'symbol',
        paint: {
            'text-color': '#000000',
            'text-halo-color': 'hsl(0, 0%, 100%)',
            'text-halo-width': 2
        },
        layout: {
            'text-field': '{label}',
            'text-size': ['get', 'size'],
            "text-variable-anchor": ["bottom", "top", "left", "right"],
            "text-justify": "auto",
            "text-radial-offset": ['get', 'offset'],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            //"text-rotation-alignment": 'map',
            //"symbol-placement": "point",
        }
    });
}

registerMapEvents();

// ---------------------------------------------------------------------------
// Control wiring
//
// Buttons used to call global functions through inline onclick="..." attributes
// in index.html. That coupling forced every handler to live on window and broke
// the app the one time it was switched to type="module" (see git history of the
// original repo). Wiring the handlers here with addEventListener removes that
// coupling, so bootstrap.js can later be converted to an ES module without the
// buttons going dead. bootstrap.js is loaded at the end of <body>, so the DOM
// is already parsed and every referenced function is defined by this point.
// ---------------------------------------------------------------------------
function wireControls() {
    var handlers = {
        add: function () { openForm(null); },
        import: importCSV,
        savejson: exportGeoJSON,
        importjson: importGeoJSON,
        savekml: exportKML,
        addoverlay: importKMZ,
        deleteall: deleteAll,
        cancelbtn: closeForm,
        addbtn: function () { aggiungiCella(); },
        savebtn: submitEditForm,
    };
    Object.keys(handlers).forEach(function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', handlers[id]);
        } else {
            console.warn('wireControls: missing element #' + id);
        }
    });
}

wireControls();