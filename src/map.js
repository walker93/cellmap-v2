// The single Mapbox GL map instance, shared across modules.
//
// `mapboxgl` is provided as a global by the CDN <script> in index.html (loaded
// before the module scripts run). `window.API_KEY` comes from config.js, which
// is git-ignored — see config.js.example for the expected shape.
mapboxgl.accessToken = window.API_KEY;

export const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/ingmv/clr7zg5g1001k01r50orldets',
    center: [11.7, 44],
    zoom: 6,
    projection: 'globe',
});

map.on('error', (error) => console.error('Mapbox error:', error));
