import { describe, it, expect } from 'vitest';
import {
    CELL_TYPES,
    cellIdentityLines,
    formatCgi,
    normalizeCellIdentity,
    validateCellIdentity,
} from './cellIdentity.js';

const full = { cellId: '21437', lac: '4501', mcc: '222', mnc: '01', cellType: 'macro' };

describe('normalizeCellIdentity', () => {
    it('keeps the codes as trimmed strings', () => {
        expect(normalizeCellIdentity({ cellId: ' 21437 ', lac: '4501' })).toMatchObject({
            cellId: '21437',
            lac: '4501',
        });
    });

    it('leaves a missing or blank field undefined, so it drops out of the JSON', () => {
        const identity = normalizeCellIdentity({ cellId: '', lac: '   ' });
        expect(identity.cellId).toBeUndefined();
        expect(identity.lac).toBeUndefined();
        expect(identity.mcc).toBeUndefined();
        expect(JSON.stringify(identity)).toBe('{}');
    });

    // Papa Parse's dynamicTyping hands us numbers, and "01" arrives as 1.
    it('pads a numeric MCC to 3 digits and MNC to 2', () => {
        expect(normalizeCellIdentity({ mcc: 22, mnc: 1 })).toMatchObject({
            mcc: '022',
            mnc: '01',
        });
    });

    it('leaves a 3-digit MNC alone', () => {
        expect(normalizeCellIdentity({ mnc: '260' }).mnc).toBe('260');
    });

    it('lower-cases the cell type', () => {
        expect(normalizeCellIdentity({ cellType: 'Macro' }).cellType).toBe('macro');
    });
});

describe('validateCellIdentity', () => {
    it('accepts a tower with no identity at all', () => {
        expect(validateCellIdentity({})).toEqual([]);
        expect(validateCellIdentity()).toEqual([]);
    });

    it('accepts a complete, well-formed identity', () => {
        expect(validateCellIdentity(full)).toEqual([]);
    });

    it('rejects a non-numeric Cell ID', () => {
        expect(validateCellIdentity({ cellId: '21A37' })).toHaveLength(1);
    });

    it('rejects a Cell ID past the 28-bit ECI range', () => {
        expect(validateCellIdentity({ cellId: '268435455' })).toEqual([]);
        expect(validateCellIdentity({ cellId: '268435456' })).toHaveLength(1);
    });

    it('rejects a LAC/TAC past 16 bits', () => {
        expect(validateCellIdentity({ lac: '65535' })).toEqual([]);
        expect(validateCellIdentity({ lac: '65536' })).toHaveLength(1);
    });

    it('requires an MCC of exactly 3 digits', () => {
        expect(validateCellIdentity({ mcc: '2222', mnc: '01' })).toHaveLength(1);
    });

    it('requires an MNC of 2 or 3 digits', () => {
        expect(validateCellIdentity({ mcc: '222', mnc: '0110' })).toHaveLength(1);
    });

    it('rejects half a network code, since the operator is the pair', () => {
        expect(validateCellIdentity({ mcc: '222' })).toHaveLength(1);
        expect(validateCellIdentity({ mnc: '01' })).toHaveLength(1);
    });

    it('rejects an unknown cell type', () => {
        expect(validateCellIdentity({ cellType: 'nano' })).toHaveLength(1);
        for (const type of CELL_TYPES) {
            expect(validateCellIdentity({ cellType: type })).toEqual([]);
        }
    });
});

describe('formatCgi', () => {
    it('joins the four codes in operator order', () => {
        expect(formatCgi(full)).toBe('222-01-4501-21437');
    });

    it('is null when any part is missing — a partial CGI is not a CGI', () => {
        expect(formatCgi({ ...full, lac: undefined })).toBeNull();
        expect(formatCgi({ ...full, mnc: '' })).toBeNull();
        expect(formatCgi({})).toBeNull();
    });
});

describe('cellIdentityLines', () => {
    it('is empty for a tower with no identity', () => {
        expect(cellIdentityLines({})).toEqual([]);
    });

    it('collapses a complete identity to the single CGI line', () => {
        expect(cellIdentityLines(full)).toEqual([
            { label: 'CGI', value: '222-01-4501-21437' },
            { label: 'Type', value: 'Macro' },
        ]);
    });

    it('names the parts that are there when the identity is partial', () => {
        expect(cellIdentityLines({ mcc: '222', mnc: '01', cellId: '21437' })).toEqual([
            { label: 'PLMN', value: '222-01' },
            { label: 'Cell ID', value: '21437' },
        ]);
    });

    it('reports a cell type on its own', () => {
        expect(cellIdentityLines({ cellType: 'femto' })).toEqual([
            { label: 'Type', value: 'Femto' },
        ]);
    });
});
