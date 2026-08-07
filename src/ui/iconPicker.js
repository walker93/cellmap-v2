import { map } from '../map.js';
import { el } from './dom.js';

// `TomSelect` is a global from lib/tom-select.complete.min.js (a <script> in
// index.html).

// Populated once icons.json resolves (see loadIcons below); lets the
// styleimagemissing handler resolve an icon id to its image URL without a
// second fetch.
let iconsByValue = null;

// Register an icon as a Mapbox image so it can be used as a marker symbol.
function loadIconToMap(value, url) {
    if (url && !map.hasImage(value)) {
        map.loadImage(url, function (error, image) {
            // Re-check: styleimagemissing fires once per feature that references
            // this icon, so several loadImage calls for the same `value` can be
            // in flight at once (e.g. importing a GeoJSON with many features
            // sharing an icon). loadImage's callbacks still run one at a time,
            // so this re-check is what actually closes the race — the first
            // callback to land wins and every later one for the same value skips.
            if (!error && !map.hasImage(value)) {
                map.addImage(value, image);
            }
        });
    }
}

// Icons are normally registered lazily when picked in the form (the TomSelect
// `change` handler below calls loadIconToMap). But a tower/POI created outside
// that interaction — imported from GeoJSON/CSV/KMZ, or already on the map from a
// previous session — can carry a saved `properties.icon` whose image was never
// registered, so the marker symbol layer asks Mapbox for an image it doesn't
// have and silently fails to draw it (only "fixed" once the user happens to
// open that feature's icon picker, which fires `change`). `styleimagemissing` is
// Mapbox's documented hook for exactly this case: resolve the id against the
// same icons.json data and register it on demand, covering every creation path.
map.on('styleimagemissing', function (e) {
    const data = iconsByValue && iconsByValue[e.id];
    if (data) {
        loadIconToMap(e.id, data.url);
    }
});

/**
 * Populate the #inp_icon control from images/icons/icons.json: rebuild the native
 * <select> (grouped by category, as a fallback) and wrap it in a TomSelect that
 * renders each icon's thumbnail. Returns the fetch promise so callers/tests can
 * await it.
 *
 * @returns {Promise<object>} resolves with the TomSelect instance.
 */
export function loadIcons() {
    const iconInput = el('inp_icon');
    iconInput.innerHTML = '<option value="" selected>Choose an icon</option>';
    iconInput.disabled = true;

    return fetch('images/icons/icons.json')
        .then((response) => response.json())
        .then((data) => {
            // data: { "usr_xxx": { value, text, category, url }, ... }
            iconsByValue = data;
            const options = Object.values(data);

            // group by category
            const optgroups = {};
            options.forEach((opt) => {
                if (!optgroups[opt.category]) optgroups[opt.category] = [];
                optgroups[opt.category].push(opt);
            });

            // rebuild the native <select> (fallback for no-JS / TomSelect failure)
            iconInput.innerHTML = '<option value="" selected>Choose an icon</option>';
            Object.keys(optgroups).forEach((cat) => {
                const optgroup = document.createElement('optgroup');
                optgroup.label = cat;
                optgroups[cat].forEach((opt) => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.text;
                    optgroup.appendChild(option);
                });
                iconInput.appendChild(optgroup);
            });
            iconInput.disabled = false;

            if (iconInput.tomselect) {
                iconInput.tomselect.destroy();
            }
            const select = new TomSelect(iconInput, {
                maxItems: 1,
                maxOptions: null,
                // #inputs (the dialog) has its own overflow-y:auto; rendering the
                // dropdown inline would grow #inputs's scrollable content and stack
                // a second scrollbar on top of the dropdown's own list scrollbar.
                // Rendering into <body> keeps the dropdown a floating overlay instead.
                dropdownParent: 'body',
                valueField: 'value',
                labelField: 'text',
                searchField: ['text'],
                options: options,
                optgroups: Object.keys(optgroups).map((cat) => ({ value: cat, label: cat })),
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
                    },
                },
                placeholder: 'Choose an icon',
                allowEmptyOption: true,
            });
            select.on('change', function (value) {
                const optionData = this.options[value];
                if (value && optionData) {
                    loadIconToMap(value, optionData.url);
                }
            });
            return select;
        });
}
