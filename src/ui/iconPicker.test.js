import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

let loadIcons;
let map;

const ICONS = {
    usr_alien: { value: 'usr_alien', text: 'alien', category: 'Events', url: 'images/icons/Events/usr_alien.png' },
    usr_ball: { value: 'usr_ball', text: 'ball', category: 'Events', url: 'images/icons/Events/usr_ball.png' },
    usr_car: { value: 'usr_car', text: 'car', category: 'Transport', url: 'images/icons/Transport/usr_car.png' },
};

// Capture the last TomSelect the module builds so tests can drive its change event.
let lastSelect;
class TomSelectStub {
    constructor(el, config) {
        this.config = config;
        this.options = {};
        const valueField = config.valueField || 'value';
        (config.options || []).forEach((o) => {
            this.options[o[valueField]] = o;
        });
        this._handlers = {};
        el.tomselect = this;
        lastSelect = this;
    }
    on(evt, cb) {
        this._handlers[evt] = cb;
    }
    destroy() {}
}

beforeAll(async () => {
    vi.stubGlobal('mapboxgl', {
        accessToken: '',
        Map: function () {
            return {
                on() {},
                addControl() {},
                addSource() {},
                addLayer() {},
                getCanvas() {
                    return { style: {} };
                },
                hasImage: () => false,
                loadImage: (url, cb) => cb(null, { width: 1, height: 1 }),
                addImage() {},
            };
        },
    });
    vi.stubGlobal('MapboxDraw', function () {
        return { getAll: () => ({ type: 'FeatureCollection', features: [] }) };
    });
    ({ loadIcons } = await import('./iconPicker.js'));
    ({ map } = await import('../map.js'));
});

beforeEach(() => {
    document.body.innerHTML = '<select id="inp_icon"></select>';
    vi.stubGlobal('TomSelect', TomSelectStub);
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({ json: () => Promise.resolve(ICONS) })
    );
    lastSelect = undefined;
});

afterEach(() => vi.restoreAllMocks());

describe('loadIcons', () => {
    it('fetches icons.json and rebuilds the native select grouped by category', async () => {
        await loadIcons();
        const iconInput = document.getElementById('inp_icon');
        expect(fetch).toHaveBeenCalledWith('images/icons/icons.json');
        // two categories -> two optgroups; three icons -> three grouped options
        expect(iconInput.querySelectorAll('optgroup')).toHaveLength(2);
        expect(iconInput.querySelectorAll('optgroup option')).toHaveLength(3);
        expect(iconInput.disabled).toBe(false);
    });

    it('initialises TomSelect with the icon options and category optgroups', async () => {
        await loadIcons();
        expect(lastSelect).toBeDefined();
        expect(lastSelect.config.valueField).toBe('value');
        expect(lastSelect.config.optgroupField).toBe('category');
        expect(lastSelect.config.options).toHaveLength(3);
        expect(lastSelect.config.optgroups.map((g) => g.value).sort()).toEqual([
            'Events',
            'Transport',
        ]);
        expect(document.getElementById('inp_icon').tomselect).toBe(lastSelect);
    });

    it('registers the picked icon as a Mapbox image on change', async () => {
        const addImage = vi.spyOn(map, 'addImage');
        await loadIcons();
        // simulate the user selecting an icon
        lastSelect._handlers.change.call(lastSelect, 'usr_car');
        expect(addImage).toHaveBeenCalledWith('usr_car', expect.anything());
    });

    it('does not re-register an image the map already has', async () => {
        vi.spyOn(map, 'hasImage').mockReturnValue(true);
        const addImage = vi.spyOn(map, 'addImage');
        await loadIcons();
        lastSelect._handlers.change.call(lastSelect, 'usr_car');
        expect(addImage).not.toHaveBeenCalled();
    });

    it('destroys an existing TomSelect before rebuilding', async () => {
        await loadIcons();
        const first = document.getElementById('inp_icon').tomselect;
        const destroy = vi.spyOn(first, 'destroy');
        await loadIcons();
        expect(destroy).toHaveBeenCalled();
    });
});
