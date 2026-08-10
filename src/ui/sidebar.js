// src/ui/sidebar.js
//
// Selezione di riga, filtro e conteggi per la colonna dei controlli.
//
// Vincolo che ha dettato la forma di questo modulo: createTable() in table.js
// azzera innerHTML di #features, #poi e #overlays e ricostruisce tutto da capo,
// e viene richiamata da una decina di punti (ogni edit, delete, duplica,
// toggle di visibilità, import...). Qualunque stato tenuto nel DOM — quale riga
// è selezionata, quali righe il filtro ha nascosto — verrebbe distrutto a ogni
// modifica. Perciò lo stato vive qui in variabili di modulo, e createTable()
// chiama refreshSidebar() alla fine per riproiettarlo sul DOM appena creato.

import { map } from '../map.js';

const HIGHLIGHT_LAYER = 'sector-highlight';
// Nessun towerid reale è la stringa vuota, quindi questo filtro non seleziona
// nulla: è il modo di "spegnere" il layer senza rimuoverlo e riaggiungerlo.
const NO_MATCH = '\u0000';

let selectedTowerId = null;
let filterQuery = '';

/* -------------------------------------------------------------------------- */
/* Selezione                                                                   */
/* -------------------------------------------------------------------------- */

/** L'id del tower attualmente selezionato, o null. */
export function getSelectedTowerId() {
    return selectedTowerId;
}

/**
 * Seleziona un tower (o deseleziona, con null). Aggiorna sia le righe che
 * l'evidenziazione sulla mappa.
 * @param {string|null} id
 */
export function selectTower(id) {
    selectedTowerId = id || null;
    paintSelection();
    paintHighlight();
}

function paintSelection() {
    document.querySelectorAll('#features .table-element--tower').forEach((row) => {
        row.setAttribute('aria-selected', row.dataset.id === selectedTowerId ? 'true' : 'false');
    });
}

// I settori in `aree` portano già properties.towerid (vedi sectors.js), quindi
// l'evidenziazione è un filtro su quel campo: nessuna struttura dati nuova.
function paintHighlight() {
    if (!map.getLayer(HIGHLIGHT_LAYER)) return;
    map.setFilter(HIGHLIGHT_LAYER, ['==', ['get', 'towerid'], selectedTowerId || NO_MATCH]);
}

/**
 * Aggiunge il layer di evidenziazione. Da chiamare in setupMapLayers() di
 * bootstrap.js, dopo addCellLayer(), perché si inserisce sotto 'markers'.
 */
export function addHighlightLayer() {
    if (map.getLayer(HIGHLIGHT_LAYER)) return;
    map.addLayer(
        {
            id: HIGHLIGHT_LAYER,
            type: 'line',
            source: 'aree',
            filter: ['==', ['get', 'towerid'], NO_MATCH],
            paint: {
                'line-color': '#001219',
                'line-width': 1,
                // alone chiaro: il contorno resta leggibile sia su un settore
                // scuro sia sull'ortofoto
                'line-opacity': 0.6,
            },
        },
        'markers',
    );
}

/* -------------------------------------------------------------------------- */
/* Filtro                                                                      */
/* -------------------------------------------------------------------------- */

// Cosa si cerca in una riga: il nome che si vede, più l'identità di rete che la
// riga porta in data-filter (vedi filterKey() in table.js). Il nome è come la
// cella è chiamata qui, il CGI è come è chiamata nei tabulati dell'operatore, e
// chi filtra digita l'uno o l'altro senza pensarci.
function haystack(row) {
    const name = row.querySelector('.col-name');
    const text = name ? name.textContent : '';
    return `${text} ${row.dataset.filter || ''}`.toLowerCase();
}

function paintFilter() {
    const rows = document.querySelectorAll('#features .table-element--tower');
    let visible = 0;
    rows.forEach((row) => {
        const hit = !filterQuery || haystack(row).includes(filterQuery);
        row.hidden = !hit;
        if (hit) visible += 1;
    });
    return { visible, total: rows.length };
}

/* -------------------------------------------------------------------------- */
/* Conteggi                                                                    */
/* -------------------------------------------------------------------------- */

function setCount(id, value) {
    const badge = document.getElementById(id);
    if (badge) badge.textContent = String(value);
}

/* -------------------------------------------------------------------------- */
/* Refresh                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Riproietta selezione, filtro e conteggi sul DOM. Va chiamata in fondo a
 * createTable(), che è l'unico punto in cui le liste vengono ricostruite.
 */
export function refreshSidebar() {
    // Se la cella selezionata è stata cancellata, la selezione decade.
    if (
        selectedTowerId &&
        !document.querySelector(`#features [data-id="${CSS.escape(selectedTowerId)}"]`)
    ) {
        selectedTowerId = null;
        paintHighlight();
    }
    paintSelection();
    const { visible, total } = paintFilter();
    // Sotto filtro il badge mostra "visibili/totali": un conteggio che cambia
    // mentre si digita, senza dire perché, si legge come se le celle fossero
    // sparite davvero.
    setCount('count-cells', filterQuery ? `${visible}/${total}` : total);
    setCount('count-poi', document.querySelectorAll('#poi .table-element').length);
    setCount('count-overlays', document.querySelectorAll('#overlays .table-element').length);
}

/**
 * Aggancia gli handler. Da chiamare una volta sola, in fondo a bootstrap.js.
 * Gli ascoltatori stanno sui contenitori, non sulle righe, così sopravvivono
 * alla ricostruzione delle righe stesse.
 */
export function initSidebar() {
    const list = document.getElementById('features');
    if (list) {
        list.addEventListener('click', (event) => {
            // I pulsanti azione hanno già il loro comportamento.
            if (event.target.closest('.icon-btn')) return;
            const row = event.target.closest('.table-element--tower');
            if (!row) return;
            selectTower(row.dataset.id === selectedTowerId ? null : row.dataset.id);
        });

        // Le righe sono focusabili (tabindex="0" in createTowerRow): Invio e
        // Spazio devono fare quello che fa il clic.
        list.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const row = event.target.closest('.table-element--tower');
            if (!row) return;
            event.preventDefault();
            selectTower(row.dataset.id === selectedTowerId ? null : row.dataset.id);
        });
    }

    const filter = document.getElementById('filter-cells');
    if (filter) {
        filter.addEventListener('input', (event) => {
            filterQuery = event.target.value.trim().toLowerCase();
            refreshSidebar();
        });
    }
    refreshSidebar();
}
