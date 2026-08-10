import { describe, it, expect, beforeEach, vi } from 'vitest';

// sidebar.js reaches the map only through the shared `map` instance, so mocking
// map.js keeps the Mapbox CDN global out of this suite and lets the tests read
// back the layer and the filter the module sets.
const mapStub = vi.hoisted(() => {
    const layers = new Map();
    return {
        layers,
        getLayer: vi.fn((id) => layers.get(id)),
        addLayer: vi.fn((layer, before) => {
            layers.set(layer.id, { ...layer, before });
        }),
        setFilter: vi.fn((id, filter) => {
            const layer = layers.get(id);
            if (layer) layer.filter = filter;
        }),
    };
});
vi.mock('../map.js', () => ({ map: mapStub }));

const HIGHLIGHT_LAYER = 'sector-highlight';
// The sentinel sidebar.js filters on to match no sector at all.
const NO_MATCH = String.fromCharCode(0);

// createTowerRow() (table.js) writes the name with `innerText`, which jsdom does
// not implement — assigning it leaves the element's text empty, and the filter
// reads `.col-name` text. Building the fixture as markup puts the name where the
// module actually looks for it, the way a real browser would.
function towerRow(id, name, filterKey = '') {
    const key = filterKey ? ` data-filter="${filterKey}"` : '';
    return `
        <div class="table-element table-element--tower" data-id="${id}"${key} role="option" tabindex="0">
            <span class="col-name" data-id="${id}">${name}</span>
            <span class="btn-col">
                <button type="button" class="icon-btn" aria-label="Delete"></button>
            </span>
        </div>`;
}

const plainRows = (count) =>
    Array.from({ length: count }, () => '<div class="table-element"></div>').join('');

function render({ towers = [], poi = 0, overlays = 0 } = {}) {
    document.body.innerHTML = `
        <span class="tab__count" id="count-cells"></span>
        <span class="tab__count" id="count-poi"></span>
        <span class="tab__count" id="count-overlays"></span>
        <input type="search" id="filter-cells" aria-label="Filter cell towers">
        <div id="features" role="listbox">${towers.map((tower) => towerRow(...tower)).join('')}</div>
        <div id="poi">${plainRows(poi)}</div>
        <div id="overlays">${plainRows(overlays)}</div>`;
}

const TOWERS = [
    ['tower-1', 'Milano Centro'],
    ['tower-2', 'Milano Nord'],
    ['tower-3', 'Bergamo'],
];

let sidebar;

/** Render the sidebar markup and wire the (freshly imported) module to it. */
async function mount(config = { towers: TOWERS }) {
    render(config);
    sidebar = await import('./sidebar.js');
    sidebar.initSidebar();
    return sidebar;
}

// What createTable() does: wipe the rows and build them again, then refresh.
function rebuild(towers) {
    document.getElementById('features').innerHTML = towers
        .map((tower) => towerRow(...tower))
        .join('');
    sidebar.refreshSidebar();
}

const rows = () => [...document.querySelectorAll('#features .table-element--tower')];
const row = (id) => document.querySelector(`#features [data-id="${id}"].table-element--tower`);
const selectedIds = () =>
    rows()
        .filter((r) => r.getAttribute('aria-selected') === 'true')
        .map((r) => r.dataset.id);
const visibleNames = () =>
    rows()
        .filter((r) => !r.hidden)
        .map((r) => r.querySelector('.col-name').textContent);
const badge = (id) => document.getElementById(id).textContent;

function press(target, key) {
    const event = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
}

function type(value) {
    const input = document.getElementById('filter-cells');
    input.value = value;
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

beforeEach(() => {
    // The selection and the filter query live in module variables precisely so
    // they survive createTable() — a fresh module per test is what resets them.
    vi.resetModules();
    mapStub.layers.clear();
    vi.clearAllMocks();
    // jsdom exposes no `window.CSS` at all, so CSS.escape — which refreshSidebar
    // uses to look the selected row back up — is missing here but present in
    // every browser the app runs in. Minimal stand-in for identifiers.
    vi.stubGlobal('CSS', {
        escape: (value) => String(value).replace(/[^\w-]/g, (char) => '\\' + char),
    });
});

describe('sidebar selection', () => {
    it('starts with nothing selected', async () => {
        await mount();
        expect(sidebar.getSelectedTowerId()).toBeNull();
        expect(selectedIds()).toEqual([]);
        expect(rows().every((r) => r.getAttribute('aria-selected') === 'false')).toBe(true);
    });

    it('selects the clicked row, and only that one', async () => {
        await mount();
        row('tower-2').click();
        expect(sidebar.getSelectedTowerId()).toBe('tower-2');
        expect(selectedIds()).toEqual(['tower-2']);
    });

    it('moves the selection when another row is clicked', async () => {
        await mount();
        row('tower-2').click();
        row('tower-3').click();
        expect(selectedIds()).toEqual(['tower-3']);
    });

    it('clicking the selected row again clears the selection', async () => {
        await mount();
        row('tower-1').click();
        row('tower-1').click();
        expect(sidebar.getSelectedTowerId()).toBeNull();
        expect(selectedIds()).toEqual([]);
    });

    // The row actions (locate, hide, duplicate, edit, delete) already do
    // something on click; selecting the row as well would be a second effect the
    // user did not ask for.
    it('leaves the selection alone when a row action button is clicked', async () => {
        await mount();
        row('tower-1').click();
        row('tower-2').querySelector('.icon-btn').click();
        expect(sidebar.getSelectedTowerId()).toBe('tower-1');
        expect(selectedIds()).toEqual(['tower-1']);
    });

    it('ignores clicks that land outside a row', async () => {
        await mount();
        document.getElementById('features').click();
        expect(sidebar.getSelectedTowerId()).toBeNull();
    });

    it.each(['Enter', ' '])('toggles the focused row with %j, swallowing the key', async (key) => {
        await mount();
        const target = row('tower-2');

        const down = press(target, key);
        expect(sidebar.getSelectedTowerId()).toBe('tower-2');
        // Space would scroll the list and Enter can trigger a default action:
        // the row handled the key, so it must not also do its browser default.
        expect(down.defaultPrevented).toBe(true);

        press(target, key);
        expect(sidebar.getSelectedTowerId()).toBeNull();
    });

    it('lets other keys through untouched', async () => {
        await mount();
        const event = press(row('tower-2'), 'a');
        expect(sidebar.getSelectedTowerId()).toBeNull();
        expect(event.defaultPrevented).toBe(false);
    });

    // The reason this module exists: createTable() throws the rows away and
    // builds new ones on every edit, delete, duplicate, visibility toggle and
    // import, so a selection kept on the DOM would not survive any of them.
    it('keeps the selection across a list rebuild', async () => {
        await mount();
        row('tower-2').click();

        rebuild(TOWERS);

        expect(sidebar.getSelectedTowerId()).toBe('tower-2');
        expect(selectedIds()).toEqual(['tower-2']);
    });

    it('drops the selection when the selected tower is gone after a rebuild', async () => {
        await mount();
        row('tower-2').click();

        rebuild([TOWERS[0], TOWERS[2]]);

        expect(sidebar.getSelectedTowerId()).toBeNull();
        expect(selectedIds()).toEqual([]);
    });

    it('accepts a programmatic selection, and null to clear it', async () => {
        await mount();
        sidebar.selectTower('tower-3');
        expect(selectedIds()).toEqual(['tower-3']);
        sidebar.selectTower(null);
        expect(sidebar.getSelectedTowerId()).toBeNull();
        expect(selectedIds()).toEqual([]);
    });
});

describe('sidebar map highlight', () => {
    it('adds an outline layer over the sectors, matching nothing until a selection', async () => {
        await mount();
        sidebar.addHighlightLayer();

        const [layer, before] = mapStub.addLayer.mock.calls[0];
        expect(layer.id).toBe(HIGHLIGHT_LAYER);
        expect(layer.type).toBe('line');
        expect(layer.source).toBe('aree');
        expect(layer.filter).toEqual(['==', ['get', 'towerid'], NO_MATCH]);
        // Under the markers, or the outline would draw over the pins.
        expect(before).toBe('markers');
    });

    it('does not add the highlight layer twice', async () => {
        await mount();
        sidebar.addHighlightLayer();
        sidebar.addHighlightLayer();
        expect(mapStub.addLayer).toHaveBeenCalledTimes(1);
    });

    it('filters the highlight to the selected tower, and back to nothing', async () => {
        await mount();
        sidebar.addHighlightLayer();

        row('tower-2').click();
        expect(mapStub.setFilter).toHaveBeenLastCalledWith(HIGHLIGHT_LAYER, [
            '==',
            ['get', 'towerid'],
            'tower-2',
        ]);

        row('tower-2').click();
        expect(mapStub.setFilter).toHaveBeenLastCalledWith(HIGHLIGHT_LAYER, [
            '==',
            ['get', 'towerid'],
            NO_MATCH,
        ]);
    });

    it('clears the highlight when the selected tower disappears', async () => {
        await mount();
        sidebar.addHighlightLayer();
        row('tower-2').click();

        rebuild([TOWERS[0]]);

        expect(mapStub.setFilter).toHaveBeenLastCalledWith(HIGHLIGHT_LAYER, [
            '==',
            ['get', 'towerid'],
            NO_MATCH,
        ]);
    });

    // Rows can be clicked before the style has finished loading, i.e. before
    // setupMapLayers() has run.
    it('selects without touching the map when the highlight layer is not there yet', async () => {
        await mount();
        expect(() => row('tower-1').click()).not.toThrow();
        expect(sidebar.getSelectedTowerId()).toBe('tower-1');
        expect(mapStub.setFilter).not.toHaveBeenCalled();
    });
});

describe('sidebar filter', () => {
    it('hides the rows whose name does not match', async () => {
        await mount();
        type('milano');
        expect(visibleNames()).toEqual(['Milano Centro', 'Milano Nord']);
    });

    it('matches case-insensitively and ignores surrounding spaces', async () => {
        await mount();
        type('  BERGAMO  ');
        expect(visibleNames()).toEqual(['Bergamo']);
    });

    it('matches anywhere in the name, not just at the start', async () => {
        await mount();
        type('nord');
        expect(visibleNames()).toEqual(['Milano Nord']);
    });

    it('hides everything when nothing matches', async () => {
        await mount();
        type('roma');
        expect(visibleNames()).toEqual([]);
    });

    it('shows every row again once the filter is cleared', async () => {
        await mount();
        type('bergamo');
        type('');
        expect(visibleNames()).toEqual(['Milano Centro', 'Milano Nord', 'Bergamo']);
        expect(rows().every((r) => !r.hidden)).toBe(true);
    });

    // The identity travels on the row in data-filter (filterKey() in table.js),
    // because a cell is quoted by its CGI in an operator's records and that is
    // what gets typed in here — none of those codes are on screen.
    describe('on the network identity carried by the row', () => {
        // A named cell: its codes appear nowhere in the visible text.
        const IDENTIFIED = [
            ['tower-1', 'Milano Centro', '222-01-4501-21437'],
            ['tower-2', 'Milano Nord', '222-88-4502-21438'],
            ['tower-3', 'Bergamo'],
        ];

        it('matches the whole CGI', async () => {
            await mount({ towers: IDENTIFIED });
            type('222-01-4501-21437');
            expect(visibleNames()).toEqual(['Milano Centro']);
        });

        it('matches a Cell ID even when the cell has a name of its own', async () => {
            await mount({ towers: IDENTIFIED });
            type('21438');
            expect(visibleNames()).toEqual(['Milano Nord']);
        });

        it('matches the LAC and the PLMN, which are parts of the same CGI', async () => {
            await mount({ towers: IDENTIFIED });
            type('4501');
            expect(visibleNames()).toEqual(['Milano Centro']);
            type('222-');
            expect(visibleNames()).toEqual(['Milano Centro', 'Milano Nord']);
        });

        it('still matches the name of a cell that carries an identity', async () => {
            await mount({ towers: IDENTIFIED });
            type('milano');
            expect(visibleNames()).toEqual(['Milano Centro', 'Milano Nord']);
        });

        it('leaves rows without an identity searchable by name only', async () => {
            await mount({ towers: IDENTIFIED });
            type('bergamo');
            expect(visibleNames()).toEqual(['Bergamo']);
            type('4501');
            expect(visibleNames()).toEqual(['Milano Centro']);
        });

        // An incomplete identity is not a CGI, but the codes that are there are
        // still what the user has to go on.
        it('matches a partial identity', async () => {
            await mount({ towers: [['tower-1', 'Senza CGI', '4501 21437']] });
            type('21437');
            expect(visibleNames()).toEqual(['Senza CGI']);
        });
    });

    // Same rebuild problem as the selection: the new rows come back visible, and
    // the filter has to be applied to them again.
    it('keeps filtering across a list rebuild', async () => {
        await mount();
        type('milano');

        rebuild([...TOWERS, ['tower-4', 'Milano Sud']]);

        expect(visibleNames()).toEqual(['Milano Centro', 'Milano Nord', 'Milano Sud']);
    });
});

describe('sidebar counts', () => {
    it('counts the cells, the POIs and the overlays', async () => {
        await mount({ towers: TOWERS, poi: 2, overlays: 1 });
        expect(badge('count-cells')).toBe('3');
        expect(badge('count-poi')).toBe('2');
        expect(badge('count-overlays')).toBe('1');
    });

    it('counts nothing as 0', async () => {
        await mount({ towers: [] });
        expect(badge('count-cells')).toBe('0');
        expect(badge('count-poi')).toBe('0');
        expect(badge('count-overlays')).toBe('0');
    });

    // A count that silently drops while you type reads as if the cells were
    // deleted, so under a filter the badge says how many of how many.
    it('shows visible/total while a filter is active', async () => {
        await mount();
        type('milano');
        expect(badge('count-cells')).toBe('2/3');
    });

    it('goes back to the plain total when the filter is cleared', async () => {
        await mount();
        type('milano');
        type('');
        expect(badge('count-cells')).toBe('3');
    });

    it('follows a rebuild', async () => {
        await mount();
        rebuild([TOWERS[0]]);
        expect(badge('count-cells')).toBe('1');
    });
});

describe('sidebar wiring', () => {
    // initSidebar() runs from bootstrap.js against the real page, but the module
    // is also imported by table.js — nothing should blow up on partial markup.
    it('does not throw when the sidebar markup is absent', async () => {
        document.body.innerHTML = '';
        const mod = await import('./sidebar.js');
        expect(() => mod.initSidebar()).not.toThrow();
        expect(() => mod.refreshSidebar()).not.toThrow();
    });

    it('does not throw when the count badges are missing', async () => {
        document.body.innerHTML = `<div id="features">${towerRow('tower-1', 'A')}</div>`;
        const mod = await import('./sidebar.js');
        expect(() => mod.initSidebar()).not.toThrow();
    });
});
