// The identity a mobile network gives a cell, as optional metadata on a tower:
// which network it belongs to (MCC + MNC), which area of that network (LAC on
// GSM/UMTS, TAC on LTE/NR), and which cell inside the area (Cell ID). Plus how
// large a cell it is, which is the one field here that is not an identifier.
//
// Nothing looks these codes up — they are transcribed from an operator's records
// and only stored, displayed and exported. Keeping the parsing, the validation
// and the display formatting in one DOM-free module is what lets the same rules
// serve the form, the CSV importer and the map popup without being written three
// times, and is what the planned Cell ID lookup will build on.
//
// The four codes are kept as *strings*, not numbers. An MNC of "01" is not the
// same code as "1" (the PLMN is 222-01), and operator exports are full of
// zero-padded values, so the text is the datum.

/** Cell size classes, smallest coverage last. */
export const CELL_TYPES = ['macro', 'micro', 'pico', 'femto'];

const DIGITS = /^\d+$/;

/** E-UTRAN Cell Identifier: 28 bits. Wider than the 16-bit GSM CI, so it is the
 *  bound that accepts every generation. */
const MAX_CELL_ID = 268435455;
/** LAC and TAC are both 16-bit. */
const MAX_AREA_CODE = 65535;

function text(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

// Papa Parse's `dynamicTyping` turns an MNC of "01" into the number 1, and the
// leading zero is gone before the row ever reaches us. Both country and network
// codes have a fixed width, so pad them back instead of losing the distinction
// on a CSV round trip.
function padCode(value, width) {
    return DIGITS.test(value) && value.length < width ? value.padStart(width, '0') : value;
}

/**
 * Read the identity fields out of anything that carries them — a form, a CSV
 * row, a feature's properties — as trimmed strings, with a missing field left
 * `undefined` so it drops out of the JSON instead of being written as `""`.
 *
 * @param {object} [fields] { cellId, lac, mcc, mnc, cellType }.
 * @returns {{cellId?: string, lac?: string, mcc?: string, mnc?: string, cellType?: string}}
 */
export function normalizeCellIdentity(fields = {}) {
    return {
        cellId: text(fields.cellId) || undefined,
        lac: text(fields.lac) || undefined,
        mcc: padCode(text(fields.mcc), 3) || undefined,
        mnc: padCode(text(fields.mnc), 2) || undefined,
        cellType: text(fields.cellType).toLowerCase() || undefined,
    };
}

function isInRange(value, max) {
    return DIGITS.test(value) && Number(value) <= max;
}

/**
 * Check the identity fields. Every one of them is optional — a tower with no
 * identity at all is valid, which is what the app produced until now — so this
 * only has something to say about a field that was actually filled in.
 *
 * @param {object} [fields] Same shape as {@link normalizeCellIdentity}.
 * @returns {string[]} User-facing messages, empty when there is nothing wrong.
 */
export function validateCellIdentity(fields = {}) {
    const errors = [];
    const { cellId, lac, mcc, mnc, cellType } = normalizeCellIdentity(fields);

    if (cellId !== undefined && !isInRange(cellId, MAX_CELL_ID)) {
        errors.push(`Cell ID must be a whole number between 0 and ${MAX_CELL_ID}.`);
    }
    if (lac !== undefined && !isInRange(lac, MAX_AREA_CODE)) {
        errors.push(`LAC/TAC must be a whole number between 0 and ${MAX_AREA_CODE}.`);
    }
    if (mcc !== undefined && !(DIGITS.test(mcc) && mcc.length === 3)) {
        errors.push('MCC must be 3 digits.');
    }
    if (mnc !== undefined && !(DIGITS.test(mnc) && (mnc.length === 2 || mnc.length === 3))) {
        errors.push('MNC must be 2 or 3 digits.');
    }
    // Neither code identifies a network on its own: the operator is the pair.
    if ((mcc === undefined) !== (mnc === undefined)) {
        errors.push('MCC and MNC belong together: fill in both, or neither.');
    }
    if (cellType !== undefined && !CELL_TYPES.includes(cellType)) {
        errors.push(`Cell type must be one of: ${CELL_TYPES.join(', ')}.`);
    }

    return errors;
}

/**
 * The Cell Global Identity, `MCC-MNC-LAC-CID` — the way a cell is named in an
 * operator's records and quoted in a report. Only defined when all four codes
 * are there; a CGI missing a part is not a CGI.
 *
 * @param {object} [fields] Same shape as {@link normalizeCellIdentity}.
 * @returns {string|null}
 */
export function formatCgi(fields = {}) {
    const { cellId, lac, mcc, mnc } = normalizeCellIdentity(fields);
    if (!mcc || !mnc || !lac || !cellId) return null;
    return `${mcc}-${mnc}-${lac}-${cellId}`;
}

/**
 * The identity as labelled lines, ready to show next to a tower. Collapses to
 * the single CGI line when the identity is complete, and falls back to naming
 * the parts that are present when it is not.
 *
 * @param {object} [fields] Same shape as {@link normalizeCellIdentity}.
 * @returns {{label: string, value: string}[]} Empty when nothing was recorded.
 */
export function cellIdentityLines(fields = {}) {
    const { cellId, lac, mcc, mnc, cellType } = normalizeCellIdentity(fields);
    const lines = [];

    const cgi = formatCgi(fields);
    if (cgi) {
        lines.push({ label: 'CGI', value: cgi });
    } else {
        if (mcc && mnc) lines.push({ label: 'PLMN', value: `${mcc}-${mnc}` });
        if (lac) lines.push({ label: 'LAC/TAC', value: lac });
        if (cellId) lines.push({ label: 'Cell ID', value: cellId });
    }
    if (cellType) {
        lines.push({ label: 'Type', value: cellType[0].toUpperCase() + cellType.slice(1) });
    }

    return lines;
}
