mapboxgl.accessToken = API_KEY;
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ingmv/clr7zg5g1001k01r50orldets',
    center: [11.7, 44],
    zoom: 6,
    projection: 'globe'
});
var geojson = {
    'type': 'FeatureCollection',
    'features': []
}
map.on('load', setupMapLayers);
map.on('error', (error) => console.error('Mapbox error:', error));

function setupMapLayers() {
    const geojson = {
        'type': 'FeatureCollection',
        'features': []
    };

    addGeoJsonSource('settori', geojson);
    addGeoJsonSource('aree', geojson);
    addCellLayer();
    addOtherTools();
    addMeasurementTools();
}
var draw;
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
            "icon-color": ["get", "fill"]
        },
        filter: ['all', ["==", ["geometry-type"], "Point"],
            ['==', ['get', "marker"], 'cell']
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
    draw = new MapboxDraw({
        styles: [
            // default themes provided by MB Draw
            {
                'id': 'gl-draw-polygon-fill-inactive',
                'type': 'fill',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'Polygon'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'fill-color': '#3bb2d0',
                    'fill-outline-color': '#3bb2d0',
                    'fill-opacity': 0.1
                }
            },
            {
                'id': 'gl-draw-polygon-fill-active',
                'type': 'fill',
                'filter': ['all', ['==', 'active', 'true'],
                    ['==', '$type', 'Polygon'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'fill-color': '#fbb03b',
                    'fill-outline-color': '#fbb03b',
                    'fill-opacity': 0.1
                }
            },
            {
                'id': 'gl-draw-polygon-midpoint',
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['==', 'meta', 'midpoint'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 3,
                    'circle-color': '#fbb03b'
                }
            },
            {
                'id': 'gl-draw-polygon-stroke-inactive',
                'type': 'line',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'Polygon'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#3bb2d0',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-polygon-stroke-active',
                'type': 'line',
                'filter': ['all', ['==', 'active', 'true'],
                    ['==', '$type', 'Polygon'],
                    ['!=', "user_marker", 'cell']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#fbb03b',
                    'line-dasharray': [0.2, 2],
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'vertex'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 7,
                    'circle-color': '#fff'
                }
            },
            {
                'id': 'gl-draw-polygon-and-line-vertex-inactive',
                'type': 'circle',
                'filter': ['all', ['==', 'meta', 'vertex'],
                    ['==', '$type', 'Point'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#fbb03b'
                }
            },

            {
                'id': 'gl-draw-polygon-fill-static',
                'type': 'fill',
                'filter': ['all', ['==', 'mode', 'static'],
                    ['==', '$type', 'Polygon'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'fill-color': '#404040',
                    'fill-outline-color': '#404040',
                    'fill-opacity': 0.1
                }
            },
            {
                'id': 'gl-draw-polygon-stroke-static',
                'type': 'line',
                'filter': ['all', ['==', 'mode', 'static'],
                    ['==', '$type', 'Polygon'],
                    ['!=', "user_marker", 'cell']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#404040',
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-line-static',
                'type': 'line',
                'filter': ['all', ['==', 'mode', 'static'],
                    ['==', '$type', 'LineString'],
                    ['!=', "user_marker", 'cell']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#404040',
                    'line-width': 2
                }
            },         // end default themes provided by MB Draw
            {
                'id': 'gl-draw-point-point-stroke-inactive', //INATTIVO
                'type': 'circle',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'feature'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 10,
                    'circle-opacity': 1,
                    'circle-color': '#000'
                }
            },
            {
                'id': 'gl-draw-point-inactive', //INATTIVO
                'type': 'circle',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'Point'],
                    ['==', 'meta', 'feature'],
                    ['!=', 'mode', 'static'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 8,
                    'circle-color': '#ffe63b'
                }
            },
            {
                'id': 'gl-draw-point-center-inactive', //Centro Punto INATTIVO
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['!=', 'meta', 'midpoint'],
                    ['==', 'active', 'false'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 2,
                    'circle-color': '#000000'
                }
            },
            {
                'id': 'gl-draw-point-stroke-active', //bordo punto ATTIVO
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['==', 'active', 'true'],
                    ['!=', 'meta', 'midpoint'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 12, //default è 7
                    'circle-color': '#000000' // Default'#fff'
                }
            },
            {
                'id': 'gl-draw-point-active', //intermedio punto ATTIVO
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['!=', 'meta', 'midpoint'],
                    ['==', 'active', 'true'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 10, //default è 5
                    'circle-color': '#ffe63b' //'#fbb03b'
                }
            },
            {
                'id': 'gl-draw-point-center-active', //Centro Punto ATTIVO
                'type': 'circle',
                'filter': ['all', ['==', '$type', 'Point'],
                    ['!=', 'meta', 'midpoint'],
                    ['==', 'active', 'true'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 3,
                    'circle-color': '#000000'
                }
            },
            {
                'id': 'gl-draw-line-inactive', //LINEA INATTIVO
                'type': 'line',
                'filter': ['all', ['==', 'active', 'false'],
                    ['==', '$type', 'LineString'],
                    ['!=', 'mode', 'static']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round',
                },
                'paint': {
                    'line-color': '#000000', //'#3bb2d0',
                    'line-width': 2,
                }
            },
            {
                'id': 'gl-draw-line-active', //LINEA ATTIVO
                'type': 'line',
                'filter': ['all', ['==', '$type', 'LineString'],
                    ['==', 'active', 'true']
                ],
                'layout': {
                    'line-cap': 'round',
                    'line-join': 'round'
                },
                'paint': {
                    'line-color': '#000000', //'#fbb03b',
                    'line-dasharray': [0.2, 2],
                    'line-width': 2
                }
            },
            {
                'id': 'gl-draw-point-static',
                'type': 'circle',
                'filter': ['all', ['==', 'mode', 'static'],
                    ['==', '$type', 'Point'],
                    ['!=', "user_marker", 'cell']
                ],
                'paint': {
                    'circle-radius': 5,
                    'circle-color': '#404040'
                }
            }
        ],
        userProperties: true
    });

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

function addGeoJsonSource(sourceId, geojsonData) {
    if (!map.getSource(sourceId)) {
        // Only add the source if it doesn't already exist
        map.addSource(sourceId, {
            type: 'geojson',
            data: geojsonData
        });
    } else {
        // If the source already exists, update its data
        map.getSource(sourceId).setData(geojsonData);
    }
}


function aggiungiCella() {
    if (!validateCellInput()) {
        alert('Please correct the inputs.');
        return;
    }

    //Creo Torre
    const cella_feat = createFeatureFromInput();
    const tower = cella_feat[0];
    var tower_id = draw.add(tower);

    //Creare area torre
    var area_polygon = cella_feat[1];
    area_polygon.properties.towerid = tower_id[0];
    geojson.features.push(area_polygon);

    //Aggiorno mappa
    addGeoJsonSource('aree', geojson);
    addGeoJsonSource('settori', draw.getAll());

    createTable(draw.getAll());
    closeForm();
}

function validateCellInput() {
    const lat = document.getElementById('inp_lat').value;
    const lon = document.getElementById('inp_lon').value;

    // TODO: check other fields for valid not empty data
    return isFinite(lat) && isFinite(lon);
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

    const features = [
        turf.point([lon, lat], {
            name: name.value,
            description: desc.value,
            "fill": fillcolor.value,
            "marker": "cell",
            'meta': 'feature',
            'Angle1': angolo1.value,
            'Angle2': angolo2.value,
            'Radius': radius.value,
            'opacity': parseFloat(alpha.value)
        }),
        turf.sector(
            [lon, lat],
            radius.value, //radius
            angolo1.value,
            angolo2.value,
            {
                properties: {
                    name: name.value,
                    description: desc.value,
                    "fill": fillcolor.value,
                    "fill-opacity": parseFloat(alpha.value),
                    "marker": "cell"
                }
            })
    ]
    resetForm();

    return features;
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
}

function loadForm(feature) {
    document.getElementById('inp_lon').value = feature.geometry.coordinates[0];
    document.getElementById('inp_lat').value = feature.geometry.coordinates[1];
    document.getElementById('angle1').value = feature.properties.Angle1;
    document.getElementById('angle2').value = feature.properties.Angle2;
    document.getElementById('inp_name').value = feature.properties.name;
    document.getElementById('inp_desc').value = feature.properties.description;
    document.getElementById('inp_radius').value = feature.properties.Radius;
    document.getElementById('inp_fill').value = feature.properties.fill;
    document.getElementById('inp_alpha').value = feature.properties.opacity;
    document.getElementById('feature-id').value = feature.id;
}

function modificaCella() {
    var feature_id = document.getElementById('feature-id').value;

    //Delete old tower and sector
    draw.delete(feature_id);
    geojson.features = geojson.features.filter(function (e) { return e.properties.towerid !== feature_id });

    //invoke aggiungicella() for creation of new tower and sector with updated values
    aggiungiCella();
    createTable(draw.getAll());
    addGeoJsonSource('settori', draw.getAll());
    addGeoJsonSource('aree', geojson);

    //reset and close form
    closeForm();
    resetForm();
}

function createTable(tableData) {
    var table = document.getElementById('features');
    table.innerHTML = "";
    for (const marker of tableData.features) {
        if (marker.properties.marker == "cell") {
            const row = createRow(marker);
            table.appendChild(row);
        }
    }
}

function createRow(marker) {
    const row = document.createElement('tr');
    //Name Column
    var col = document.createElement('td');
    var span_name = document.createElement('span');
    span_name.setAttribute("data-id", marker.id);
    span_name.innerText = marker.properties.name;
    if (marker.properties.name == "") {
        span_name.innerText = "Unnamed";
    }

    col.appendChild(span_name);
    row.appendChild(col);

    //Angle Column
    col = document.createElement('td');
    span_name = document.createElement('span');
    var testo = marker.properties.Angle1.toString() + " - " + marker.properties.Angle2.toString() + "°";
    span_name.innerText = testo;
    col.appendChild(span_name);
    row.appendChild(col);

    //Radius Column
    col = document.createElement('td');
    span_name = document.createElement('span');
    span_name.innerText = marker.properties.Radius.toString() + "km";
    col.appendChild(span_name);
    row.appendChild(col);

    //color column
    col = document.createElement('td');
    var square = document.createElement('div');
    square.className = "square-color"
    square.style.backgroundColor = marker.properties.fill;
    col.appendChild(square);
    row.appendChild(col);

    //button column
    col = document.createElement('td');
    col.className = "btn-col";
    //locate column
    var icon = document.createElement('i');
    icon.className = "fa-sharp fa-solid fa-location-dot"
    icon.addEventListener("click", function () {
        //center on map feature
        map.flyTo({
            center: marker.geometry.coordinates,
            zoom: 11
        });
    });
    col.appendChild(icon);

    //duplicate
    icon = document.createElement('i');
    icon.className = "fa-sharp fa-solid fa-copy"
    icon.addEventListener("click", function () {
        //duplicate cell
        var copy_cell = draw.get(marker.id);
        copy_cell.id = "";
        var new_id = draw.add(copy_cell);

        createTable(draw.getAll());
        addGeoJsonSource('settori', draw.getAll());
        var copy_sector = geojson.features.filter(function (e) { return e.properties.towerid === feature_id });
        copy_sector.properties.towerid = new_id[0];
        geojson.features.push(copy_sector);
        addGeoJsonSource('aree', geojson);

    });
    col.appendChild(icon);
   
    //edit
    icon = document.createElement('i');
    icon.className = "fa-sharp fa-solid fa-pen"
    icon.addEventListener("click", function () {
        //EDIT AND UPDATE FEATURE
        loadForm(marker);
        openForm(marker);
    });
    col.appendChild(icon);

    //delete icon
    icon = document.createElement('i');
    icon.className = "fa-sharp fa-solid fa-xmark"
    icon.addEventListener("click", function () {
        draw.delete(marker.id);
        createTable(draw.getAll());
        addGeoJsonSource('settori', draw.getAll());
        geojson.features = geojson.features.filter(function (e) { return e.properties.towerid !== marker.id });
        addGeoJsonSource('aree', geojson);
    });
    col.appendChild(icon);
    row.appendChild(col);

    return row;
}

function deleteAll() {
    draw.deleteAll();
    geojson.features = [];
    addGeoJsonSource('aree', geojson);
    addGeoJsonSource('settori', draw.getAll());
    createTable(draw.getAll());
}

function scaricageojson() {
    var data = JSON.stringify(draw.getAll());
    downloadFile("map.geojson", data, 'application/geo+json');
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
                    var area_polygon = turf.sector(
                        feat.geometry.coordinates,
                        feat.properties.Radius, //radius
                        feat.properties.Angle1,
                        feat.properties.Angle2,
                        {
                            properties: {
                                name: feat.properties.name,
                                description: feat.properties.description,
                                "fill": feat.properties.fill,
                                "fill-opacity": parseFloat(feat.properties.opacity),
                                "marker": feat.properties.marker,
                                towerid: feat.id
                            }
                        });
                        geojson.features.push(area_polygon);
                }
            }

            addGeoJsonSource('aree', geojson);
            addGeoJsonSource('settori', draw.getAll());
            createTable(draw.getAll());
        };
        reader.readAsText(this.files[0]);
    });
}

function scaricaKML() {
    //TODO: EDIT to download all rendered features
    var merged = {
        'type': 'FeatureCollection',
        'features': draw.getAll().features.concat(geojson.features)
    };
    
    const kmlData = generateKML(merged);
    downloadFile('map.kml', kmlData, 'text/kml');
}

function generateKML(geojsonData) {
    return tokml(geojsonData, { name: 'name', description: 'description', simplestyle: true });
}

function downloadFile(filename, data, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}

function showError(message) {
    const errorContainer = document.getElementById('error-display');
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
}

function hideError() {
    const errorContainer = document.getElementById('error-display');
    errorContainer.style.display = 'none';
}

function setupClustering(map) {
    map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'settori',
        filter: ['has', 'point_count'],
        paint: {
            'circle-color': {
                property: 'point_count',
                type: 'interval',
                stops: [[0, '#51bbd6'], [100, '#f1f075'], [750, '#f28cb1']]
            },
            'circle-radius': {
                property: 'point_count',
                type: 'interval',
                stops: [[0, 20], [100, 30], [750, 40]]
            }
        }
    });
}

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
                            labelFeatures.push(turf.point(feature.geometry.coordinates, {
                                type: 'point',
                                label: feature.geometry.coordinates[1].toFixed(6) + ',\n ' + feature.geometry.coordinates[0].toFixed(6),
                                size: 12,
                                offset: 1.3,
                            }));
                        }
                    }
                    break;
                case 'LineString':
                    // label Lines
                    if (feature.geometry.coordinates.length > 1) {
                        var length = turf.length(feature);
                        var label = numeral(length * 1000).format('0,0.0a') + 'm';
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
                        var area = turf.area(feature);
                        var label = numeral(area).format('0,0.0a') + 'm²';
                        labelFeatures.push(turf.centroid(feature, {
                            type: 'area',
                            label: label
                        }));
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

map.on('contextmenu', (e) => {
    if (document.getElementById("inputs").style.display == "block") {
        var lat = document.getElementById('inp_lat');
        var lon = document.getElementById('inp_lon');
        lat.value = e.lngLat.lat;
        lon.value = e.lngLat.lng;
    }
});

function openForm(marker) {
    if (marker != null) {
        document.getElementById("editcell").style.display = "inline-block";
        document.getElementById("addcell").style.display = "none";
    }
    document.getElementById("inputs").style.display = "block";
}

function closeForm() {
    document.getElementById("inputs").style.display = "none";
    document.getElementById("editcell").style.display = "none";
    document.getElementById("addcell").style.display = "inline-block";
}
