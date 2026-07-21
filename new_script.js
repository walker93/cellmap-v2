import { map } from './src/map.js';
import * as turf from '@turf/turf';
import {
    buildTowerFeature,
    buildCoverageSector,
    csvRowToTowerFields,
    towerFieldsFromFeature,
    validateTowerFields,
} from './src/towerFeature.js';
import {
    getSectors,
    addSector,
    getSectorsByTowerId,
    removeSectorsByTowerId,
    clearSectors,
} from './src/sectors.js';
import {
    getHiddenPois,
    addHiddenPoi,
    takeHiddenPoi,
    removeHiddenPoi,
    clearHiddenPois,
} from './src/hiddenPois.js';
import { getOverlays, addOverlay, removeOverlay, clearOverlays } from './src/overlays.js';
import { draw } from './src/draw.js';
import { exportGeoJSON } from './src/io/geojson.js';
import { exportKML } from './src/io/kml.js';
import { parseLatLonBox } from './src/io/kmz.js';
import { addGeoJsonSource } from './src/mapSource.js';
import { createTable, setRowEditHandler } from './src/ui/table.js';

// The table's row "edit" button opens the add/edit form (form code lives here),
// injected so ui/table.js doesn't need to import back into this entry module.
setRowEditHandler(function (marker) {
    loadForm(marker);
    openForm(marker);
});

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
    loadicons();
}
// The "Salva" button edits either a cell or a POI depending on which feature is
// loaded into the form; loadForm() points this at modificaCella or modificaPoi.
var pendingSaveHandler = null;

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

// funzione che aggiunge una cella e il settore alla mappa
// se viene passata una cella esistente viene aggiornata
function aggiungiCella(existingCell) {

    if (!validateCellInput()) {
        return;
    }
    var cella_feat = createFeatureFromInput();
    var tower = cella_feat[0];
    // Se esiste una cella, aggiorno le proprietà
    if (existingCell) tower.id = existingCell.id; // Mantengo l'id della cella esistente


    var tower_id = draw.add(tower);
    // Aggiungi l'id del marker nelle proprietà (così ["id"] funzionerà correttamente)
    {
        let t = draw.get(tower_id[0]);
        t.properties.id = tower_id[0];
        draw.add(t);
    }

    // Creare area torre
    var area_polygon = cella_feat[1];
    area_polygon.properties.towerid = tower_id[0];
    addSector(area_polygon);

    //Aggiorno mappa
    addGeoJsonSource('aree', getSectors());
    addGeoJsonSource('settori', draw.getAll());

    createTable(draw.getAll());
    closeForm();
}

function validateCellInput() {
    const result = validateTowerFields({
        lat: document.getElementById('inp_lat').value,
        lon: document.getElementById('inp_lon').value,
        radius: document.getElementById('inp_radius').value,
        angle1: document.getElementById('angle1').value,
        angle2: document.getElementById('angle2').value,
    });
    if (!result.valid) {
        alert(result.errors.join('\n'));
    }
    return result.valid;
}

function createFeatureFromInput() {
    const lat = parseFloat(document.getElementById('inp_lat').value);
    const lon = parseFloat(document.getElementById('inp_lon').value);
    var angolo1 = document.getElementById('angle1');
    var angolo2 = document.getElementById('angle2');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var radius = document.getElementById('inp_radius');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');

    const { marker, sector } = buildTowerFeature({
        lon,
        lat,
        radius: radius.value,
        angle1: angolo1.value,
        angle2: angolo2.value,
        name: name.value,
        description: desc.value,
        fill: fillcolor.value,
        opacity: alpha.value,
    });
    resetForm();

    return [marker, sector];
}

function resetForm() {
    document.getElementById('inp_lat').value = "";
    document.getElementById('inp_lon').value = "";
    document.getElementById('angle1').value = "0";
    document.getElementById('angle2').value = "360";
    document.getElementById('inp_name').value = "";
    document.getElementById('inp_desc').value = "";
    document.getElementById('inp_radius').value = "3";
    document.getElementById('inp_fill').value = "#FF0000";
    document.getElementById('inp_alpha').value = "0.2";
    document.getElementById('feature-id').value = "";
    document.getElementById('inp_icon').tomselect.clear();
}

function loadForm(feature) {
    var lat = document.getElementById('inp_lat');
    var lon = document.getElementById('inp_lon');
    var angolo1 = document.getElementById('angle1');
    var angolo2 = document.getElementById('angle2');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var radius = document.getElementById('inp_radius');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');
    var feat_id = document.getElementById('feature-id');
    var icn = document.getElementById('inp_icon');

    if (feature.properties.marker && feature.properties.marker == "cell") {
        //if cell feature load all previus fields
        angolo1.value = feature.properties.Angle1;
        angolo2.value = feature.properties.Angle2;
        radius.value = feature.properties.Radius;
        radius.disabled = false;
        angolo1.disabled = false;
        angolo2.disabled = false;
        icn.tomselect.disable(); // disable icon input for cell features
        pendingSaveHandler = modificaCella;
    } else {
        //if marker is a PoI feature disable sector related fields
        radius.disabled = true;
        angolo1.disabled = true;
        angolo2.disabled = true;
        icn.tomselect.enable();
        pendingSaveHandler = modificaPoi;
    }
    //enable or disable coords field according to geometry type
    if (feature.geometry.type === "Point") {
        lon.value = feature.geometry.coordinates[0];
        lat.value = feature.geometry.coordinates[1];
        lon.disabled = false
        lat.disabled = false
    } else {
        lon.disabled = true
        lat.disabled = true
    }
    //load all the other features
    name.value = feature.properties.name || "";
    desc.value = feature.properties.description || "";
    fillcolor.value = feature.properties.fill || "";
    alpha.value = feature.properties.opacity || "0.2";
    icn.tomselect.setValue(feature.properties.icon || "");
    feat_id.value = feature.id;
}

function modificaPoi() {
    var feature_id = document.getElementById('feature-id').value;
    var feature = draw.get(feature_id);
    var lat = document.getElementById('inp_lat');
    var lon = document.getElementById('inp_lon');
    var name = document.getElementById('inp_name');
    var desc = document.getElementById('inp_desc');
    var fillcolor = document.getElementById('inp_fill');
    var alpha = document.getElementById('inp_alpha');
    feature.properties.name = name.value;
    feature.properties.description = desc.value;
    feature.properties.fill = fillcolor.value;
    feature.properties.opacity = parseFloat(alpha.value);
    if (feature.geometry.type === "Point") {
        feature.geometry.coordinates[0] = parseFloat(lon.value);
        feature.geometry.coordinates[1] = parseFloat(lat.value);
    }
    if (!(feature.properties.marker && feature.properties.marker == "cell")) {
        var icon_select = document.getElementById('inp_icon');
        var category = icon_select.options[icon_select.selectedIndex].parentNode;
        feature.properties.icon = icon_select.value || undefined; // Set icon or remove if empty
        feature.properties.icon_category = category.label || undefined; // Set icon category or remove if empty
    }
    draw.add(feature);
    //reset and close form
    closeForm();
    resetForm();
    createTable(draw.getAll());
    addGeoJsonSource('settori', draw.getAll());
}

function modificaCella() {
    var feature_id = document.getElementById('feature-id').value;

    //Delete old tower and sector
    //draw.delete(feature_id);
    removeSectorsByTowerId(feature_id);

    //invoke aggiungicella() for creation of new tower and sector with updated values
    aggiungiCella(draw.get(feature_id));
    createTable(draw.getAll());
    addGeoJsonSource('settori', draw.getAll());
    addGeoJsonSource('aree', getSectors());

    //reset and close form
    closeForm();
    resetForm();
}

function deleteAll() {
    draw.deleteAll();
    clearSectors();
    clearHiddenPois();

    getOverlays().forEach(function (overlay) {
        map.removeLayer("overlay-layer-" + overlay.ID);
        map.removeSource("overlay-source-" + overlay.ID);
    });
    clearOverlays();
    addGeoJsonSource('aree', getSectors());
    addGeoJsonSource('settori', draw.getAll());
    createTable(draw.getAll());
}

function importjson() {
    var inp_file = document.createElement("input");
    inp_file.setAttribute("type", "file");
    inp_file.setAttribute("accept", ".geojson");
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function fileReadCompleted() {
            // when the reader is done, the content is in reader.result.
            deleteAll();
            //Parsing Geojson
            var read_json = JSON.parse(reader.result);
            draw.add(read_json);
            for (const feat of read_json.features) {
                if (feat.properties.marker == "cell") { //se di tipo cella, aggiungo il relativo settore
                    var area_polygon = buildCoverageSector(towerFieldsFromFeature(feat));
                    addSector(area_polygon);
                }
            }

            addGeoJsonSource('aree', getSectors());
            addGeoJsonSource('settori', draw.getAll());
            createTable(draw.getAll());
        };
        reader.readAsText(this.files[0]);
    });
}

function openForm(marker) {
    if (marker != null) {
        //change button to save instead of add
        document.getElementById("savebtn").style.display = "inline-block";
        document.getElementById("addbtn").style.display = "none";
    } else {
        //change button to add instead of save
        document.getElementById("savebtn").style.display = "none";
        document.getElementById("addbtn").style.display = "inline-block";
        document.getElementById('inp_icon').tomselect.disable();
    }
    document.getElementById("inputs").style.display = "block";

}

function closeForm() {
    document.getElementById("inputs").style.display = "none";
    document.getElementById("savebtn").style.display = "none";
    document.getElementById("addbtn").style.display = "inline-block";
}


function processKMZ() {

    var inp_file = document.createElement("input");
    inp_file.setAttribute("type", "file");
    inp_file.setAttribute("accept", ".kmz");
    inp_file.click();
    inp_file.addEventListener('change', async function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        const file = inp_file.files[0];
        JSZip.loadAsync(file)
            .then(zip => {
                let kmlContentPromise, imageBlobPromise;

                // Cerca il file KML e l'immagine nel KMZ
                zip.forEach((relativePath, zipEntry) => {
                    if (relativePath.endsWith(".kml")) {
                        kmlContentPromise = zipEntry.async("string");
                    } else if (relativePath.endsWith(".png")) {
                        imageBlobPromise = zipEntry.async("blob");
                    }
                });

                // Verifica che esistano sia il file KML sia l'immagine
                if (!kmlContentPromise || !imageBlobPromise) {
                    alert("Invalid KMZ file: inner KML or image missing.");
                    return Promise.reject("KML o immagine mancante");
                }

                // Risolvi le promesse per ottenere i contenuti del KML e l'immagine
                return Promise.all([kmlContentPromise, imageBlobPromise]);
            })
            .then(([kmlContent, imageBlob]) => {
                // Estrai le coordinate di georeferenziazione dal KML
                const { north, south, east, west } = parseLatLonBox(kmlContent);

                // Crea un URL temporaneo per l'immagine
                const imageUrl = URL.createObjectURL(imageBlob);
                const overlayID = Date.now();

                // Aggiungi l'immagine come sorgente e sovrapponila alla mappa
                map.addSource('overlay-source-' + overlayID, {
                    'type': 'image',
                    'url': imageUrl,
                    'coordinates': [
                        [west, north], // NO
                        [east, north], // NE
                        [east, south], // SE
                        [west, south]  // SO
                    ]
                });

                map.addLayer({
                    id: 'overlay-layer-' + overlayID,
                    'type': 'raster',
                    'source': 'overlay-source-' + overlayID,
                    'paint': {
                        'raster-fade-duration': 0,
                        'raster-opacity': 0.3
                    }
                });
                addOverlay({
                    'file': file.name,
                    'ID': overlayID,
                    'imageURL': imageUrl,
                    'imageBlob': imageBlob,
                    'north': north,
                    'east': east,
                    'west': west,
                    'south': south
                });
                createTable(draw.getAll());
            })
            .catch(error => {
                console.error("Errore nell'elaborazione del file KMZ:", error);
                alert("Si è verificato un errore durante l'elaborazione del file KMZ.");
            });

    });
}


function openfile() {
    /* csv example 
    lat,lon,name,desc,fill,marker,angle1,angle2,radius,opacity
    45.1256,9.2365,"torre","descrizione","#ff0000","cell",0,360,3,0.2
    
    */

    var inp_file = document.createElement("input");
    inp_file.setAttribute("type", "file");
    inp_file.setAttribute("accept", ".csv");
    inp_file.click();
    inp_file.addEventListener('change', function filechange() {
        if (this.files.length === 0) {
            console.log('No file selected.');
            return;
        }
        Papa.parse(inp_file.files[0], {
            header: true,
            dynamicTyping: true,
            complete: function (results) {
                deleteAll();
                var data = results.data;
                for (const cell of data) {
                    const built = buildTowerFeature(csvRowToTowerFields(cell));
                    const cella_feat = [built.marker, built.sector];
                    const tower = cella_feat[0];
                    var tower_id = draw.add(tower);

                    //Creare area torre
                    var area_polygon = cella_feat[1];
                    area_polygon.properties.towerid = tower_id[0];
                    addSector(area_polygon);

                    //Aggiorno mappa
                    addGeoJsonSource('aree', getSectors());
                    addGeoJsonSource('settori', draw.getAll());

                    createTable(draw.getAll());
                }
            }
        });
    });

}

//fecth icon folder and add each image as a mapbox image - add option to select icon for PoI
function loadicons() {
    var iconInput = document.getElementById('inp_icon');
    iconInput.innerHTML = '<option value="" selected>Choose an icon</option>';
    iconInput.disabled = true;
    fetch('images/icons/icons.json')
        .then(response => response.json())
        .then(data => {
            // data: { "usr_xxx": { value, text, category, url }, ... }
            var options = Object.values(data);
            // Carica tutte le icone in mapbox e raggruppa per categoria in un solo ciclo
            var optgroups = {};
            options.forEach(opt => {
                if (!optgroups[opt.category]) optgroups[opt.category] = [];
                optgroups[opt.category].push(opt);
            });
            // Ricostruisci la select (per fallback)
            iconInput.innerHTML = '<option value="" selected>Choose an icon</option>';
            Object.keys(optgroups).forEach(cat => {
                var optgroup = document.createElement('optgroup');
                optgroup.label = cat;
                optgroups[cat].forEach(opt => {
                    var option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    optgroup.appendChild(option);
                });
                iconInput.appendChild(optgroup);
            });
            iconInput.disabled = false;
            // Inizializza TomSelect
            if (iconInput.tomselect) {
                iconInput.tomselect.destroy();
            }
            var select = new TomSelect(iconInput, {
                maxItems: 1,
                maxOptions: null,
                valueField: 'value',
                labelField: 'text',
                searchField: ['text'],
                options: options,
                optgroups: Object.keys(optgroups).map(cat => ({ value: cat, label: cat })),
                optgroupField: 'category',
                optgroupLabelField: 'label',
                optgroupValueField: 'value',
                render: {
                    option: function (data, escape) {
                        return `<div style="display:flex;align-items:center;gap:8px;">
                            <img src='${escape(data.url)}' loading="lazy" style='width:24px;height:24px;object-fit:contain;margin-right:6px;'>
                            <span>${escape(data.text)}</span>
                        </div>`;
                    },
                    item: function (data, escape) {
                        return `<div style="display:flex;align-items:center;gap:8px;">
                            <img src='${escape(data.url)}' loading="lazy" style='width:20px;height:20px;object-fit:contain;margin-right:4px;'>
                            <span>${escape(data.text)}</span>
                        </div>`;
                    },
                    optgroup_header: function (data, escape) {
                        return `<div style="font-weight:bold;padding:4px 0;text-align:center;background: var(--background-color);">${escape(data.label)}</div>`;
                    }
                },
                placeholder: 'Choose an icon',
                allowEmptyOption: true
            });
            select.on('change', function (value) {
                const data = this.options[value];
                if (value && data) {
                    loadToMapbox(value, data);
                }
            });
        });
}
// Funzione helper per evitare ripetizioni
function loadToMapbox(value, data) {
    if (data.url && !map.hasImage(value)) {
        map.loadImage(data.url, function (error, image) {
            if (!error) {
                map.addImage(value, image);
                console.log(`Icona ${value} caricata in Mapbox`);
            }
        });
    }
}
/* MAP EVENTS */

// on draw.render update the measurments
map.on('draw.render', function (e) {
    var labelFeatures = [];

    var all = draw.getAll();
    if (all && all.features) {
        all.features.forEach(function (feature) {
            switch (turf.getType(feature)) {
                case 'Point':
                    // label Points

                    //Remove this check if you want cells to show coordinates
                    if (feature.properties.marker != 'cell') {
                        if (feature.geometry.coordinates.length > 1) {
                            var label = feature.properties.name || feature.geometry.coordinates[1].toFixed(6) + ',\n ' + feature.geometry.coordinates[0].toFixed(6);
                            var offset = feature.properties.icon ? 3 : 1.3;
                            labelFeatures.push(turf.point(feature.geometry.coordinates, {
                                type: 'point',
                                label: label,
                                size: feature.properties.name ? 16 : 12,
                                offset: offset,
                            }));
                        }
                    }
                    break;
                case 'LineString':
                    // label Lines
                    if (feature.geometry.coordinates.length > 1) {
                        var length = turf.length(feature);
                        var label = feature.properties.name || numeral(length * 1000).format('0,0.0a') + 'm';
                        var midpoint = turf.along(feature, length / 2);
                        midpoint.properties = {
                            type: 'line',
                            label: label,
                            size: 16,
                            offset: 0.5,
                        };
                        labelFeatures.push(midpoint);
                    }
                    break;
                case 'Polygon':
                    // label Polygons
                    if (feature.geometry.coordinates.length > 0 && feature.geometry.coordinates[0].length > 3) {
                        var area = math.unit(turf.area(feature), "m^2");
                        var label = feature.properties.name || area.format({ notation: 'fixed', precision: 2 });  //numeral(area).format('0,0.0a') + 'm²';
                        var centroid = turf.centroid(feature);
                        centroid.properties = {
                            type: 'fill',
                            label: label,
                            size: 16
                        };
                        labelFeatures.push(centroid);
                    }
                    break;
            }
        });
    }
    map.getSource('_measurements').setData({
        type: 'FeatureCollection',
        features: labelFeatures
    });
});

map.on('draw.create', function (e) {
    var feature = draw.get(e.features[0].id);
    feature.properties.fill = "#ff0000";
    feature.properties.opacity = 0.2;
    draw.add(feature);
    createTable(draw.getAll());
});

map.on('draw.delete', function (e) {
    createTable(draw.getAll());
});

map.on('draw.update', function (e) {
    createTable(draw.getAll());
});

map.on('contextmenu', (e) => {
    if (document.getElementById("inputs").style.display == "block") {
        var lat = document.getElementById('inp_lat');
        var lon = document.getElementById('inp_lon');
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

// ---------------------------------------------------------------------------
// Control wiring
//
// Buttons used to call global functions through inline onclick="..." attributes
// in index.html. That coupling forced every handler to live on window and broke
// the app the one time it was switched to type="module" (see git history of the
// original repo). Wiring the handlers here with addEventListener removes that
// coupling, so new_script.js can later be converted to an ES module without the
// buttons going dead. new_script.js is loaded at the end of <body>, so the DOM
// is already parsed and every referenced function is defined by this point.
// ---------------------------------------------------------------------------
function wireControls() {
    var handlers = {
        add: function () { openForm(null); },
        import: openfile,
        savejson: exportGeoJSON,
        importjson: importjson,
        savekml: exportKML,
        addoverlay: processKMZ,
        deleteall: deleteAll,
        cancelbtn: closeForm,
        addbtn: function () { aggiungiCella(); },
        savebtn: function () { if (pendingSaveHandler) pendingSaveHandler(); },
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