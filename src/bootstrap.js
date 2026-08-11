import { map } from './map.js';
import { getSectors } from './sectors.js';
import { draw } from './draw.js';
import { exportGeoJSON, importGeoJSON } from './io/geojson.js';
import { exportKML } from './io/kml.js';
import { importCSV } from './io/csv.js';
import { importKMZ } from './io/kmz.js';
import { saveProject, openProject } from './io/project.js';
import { addGeoJsonSource } from './mapSource.js';
import { installExportSerializerFix } from './mapExport.js';
import { openForm, closeForm, aggiungiCella, submitEditForm, initForm } from './ui/form.js';
import { loadIcons } from './ui/iconPicker.js';
import { confirmAndDeleteAll } from './reset.js';
import { registerMapEvents } from './mapEvents.js';
import { initAccordions } from './ui/accordion.js';
import { initMenu } from './ui/menu.js';
import { initDisplaySettings } from './ui/displaySettings.js';
import { initSidebar, addHighlightLayer } from './ui/sidebar.js';

map.on('load', setupMapLayers);

function setupMapLayers() {
    const geojson = {
        type: 'FeatureCollection',
        features: [],
    };
    addGeoJsonSource('settori', geojson);
    addGeoJsonSource('aree', getSectors());
    addGeoJsonSource('anelli', geojson);
    addCellLayer();
    addHighlightLayer();
    addRingLayers();
    addOtherTools();
    addMeasurementTools();
    loadIcons();
    // After the layers exist: it applies the stored ring-label visibility to one.
    initDisplaySettings();
}

function addCellLayer() {
    map.loadImage('cell-tower.png', (error, image) => {
        if (error) throw error;
        map.addImage('tower', image, { sdf: true });
    });
    map.addLayer({
        id: 'sectors',
        type: 'fill',
        source: 'aree',
        paint: {
            'fill-color': ['get', 'fill'],
            'fill-opacity': ['get', 'fill-opacity'],
        },
    });

    map.addLayer({
        id: 'markers',
        type: 'symbol',
        source: 'settori',
        layout: {
            'icon-image': 'tower',
            'icon-size': 0.7,
            'text-field': ['get', 'name'],
            'text-variable-anchor': ['bottom', 'top', 'left', 'right'],
            'text-justify': 'auto',
            'text-radial-offset': 1.5,
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
        },
        paint: {
            'icon-color': ['get', 'fill'],
        },
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'marker'], 'cell']],
    });
}

// Distance rings: real line features at round distances, as opposed to the band
// boundaries that used to show through the uncertainty cone by accident. Both
// layers go in below `markers`, so the lines sit over the sector fill but never
// over an antenna.
function addRingLayers() {
    map.addLayer(
        {
            id: 'rings',
            type: 'line',
            source: 'anelli',
            filter: ['==', ['get', 'kind'], 'ring'],
            paint: {
                'line-color': ['get', 'stroke'],
                'line-width': ['get', 'stroke-width'],
                'line-opacity': ['get', 'stroke-opacity'],
            },
        },
        'markers',
    );

    map.addLayer(
        {
            id: 'ring-labels',
            type: 'symbol',
            source: 'anelli',
            // One anchor point per ring, built in distanceRings.js. Labelling the arc
            // itself with symbol-placement "line"/"line-center" gives a label per tile
            // the line is split across, so the wide rings came out labelled twice.
            filter: ['==', ['get', 'kind'], 'ring-label'],
            // Off until the checkbox in "Map display" says otherwise.
            layout: {
                visibility: 'none',
                'text-field': ['get', 'label'],
                'text-size': 11,
                // upright rather than turned along the arc: easier to read, and the
                // anchors line up on one radius so they read as a column
                'text-rotation-alignment': 'viewport',
                'text-allow-overlap': false,
            },
            paint: {
                'text-color': ['get', 'stroke'],
                'text-halo-color': 'hsl(0, 0%, 100%)',
                'text-halo-width': 1.5,
            },
            // Under the tower markers, so that when a ring label and a cell name want
            // the same spot the cell name is the one that gets it: Mapbox resolves
            // symbol collisions from the top layer down.
        },
        'markers',
    );
}

function addOtherTools() {
    map.addControl(
        new MapboxGeocoder({
            accessToken: mapboxgl.accessToken,
            mapboxgl: mapboxgl,
        }),
    );
    map.addControl(new mapboxgl.NavigationControl({ position: 'top-left' }));

    // @watergis/mapbox-gl-export v4 bundles everything under one namespaced
    // global (window.MapboxExportControl.*) instead of separate flat globals.
    const {
        MapboxExportControl: ExportControl,
        Size,
        PageOrientation,
        Format,
        DPI,
    } = MapboxExportControl;
    // Without this the exported image comes out with no sectors, rings or ring
    // labels on it — see mapExport.js for what the control does to the style.
    installExportSerializerFix(MapboxExportControl);
    map.addControl(
        new ExportControl({
            PageSize: Size.A4,
            PageOrientation: PageOrientation.Landscape,
            Format: Format.PNG,
            DPI: DPI[200],
            Crosshair: true,
            PrintableArea: true,
        }),
        'top-right',
    );
}

function addMeasurementTools() {
    map.addControl(draw, 'top-left');

    // measurements source
    map.addSource('_measurements', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: [],
        },
    });

    // measurements layer
    map.addLayer({
        id: '_measurements',
        source: '_measurements',
        type: 'symbol',
        paint: {
            'text-color': '#000000',
            'text-halo-color': 'hsl(0, 0%, 100%)',
            'text-halo-width': 2,
        },
        layout: {
            'text-field': '{label}',
            'text-size': ['get', 'size'],
            'text-variable-anchor': ['bottom', 'top', 'left', 'right'],
            'text-justify': 'auto',
            'text-radial-offset': ['get', 'offset'],
            'text-allow-overlap': false,
            'text-ignore-placement': false,
            //"text-rotation-alignment": 'map',
            //"symbol-placement": "point",
        },
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
        // "Progetto" menu: one-shot, file-level commands.
        saveproject: saveProject,
        openproject: openProject,
        importjson: importGeoJSON,
        savejson: exportGeoJSON,
        import: importCSV,
        savekml: exportKML,
        deleteall: confirmAndDeleteAll,
        // Section headers: each action sits on the list it adds to.
        addcell: function () {
            openForm(null);
        },
        addoverlay: importKMZ,
        cancelbtn: closeForm,
        addbtn: function () {
            aggiungiCella();
        },
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
initAccordions();
initSidebar();
initForm();
initMenu(document.getElementById('project-menu-btn'), document.getElementById('project-menu'));
