import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveFile } from './download.js';

afterEach(() => {
    delete window.showSaveFilePicker;
    // jsdom has no URL object-URL helpers; remove any we added.
    delete window.URL.createObjectURL;
    delete window.URL.revokeObjectURL;
    vi.restoreAllMocks();
});

describe('saveFile — File System Access API path', () => {
    function mockPicker() {
        const writable = { write: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined) };
        const handle = { createWritable: vi.fn().mockResolvedValue(writable) };
        window.showSaveFilePicker = vi.fn().mockResolvedValue(handle);
        return { writable };
    }

    it('opens the save dialog with the suggested name and file type, then writes', async () => {
        const { writable } = mockPicker();
        const ok = await saveFile('map.geojson', '{"a":1}', 'application/geo+json', {
            description: 'GeoJSON',
            extensions: ['.geojson'],
        });
        expect(ok).toBe(true);
        expect(window.showSaveFilePicker).toHaveBeenCalledWith({
            suggestedName: 'map.geojson',
            types: [{ description: 'GeoJSON', accept: { 'application/geo+json': ['.geojson'] } }],
        });
        expect(writable.write).toHaveBeenCalledOnce();
        expect(writable.write.mock.calls[0][0]).toBeInstanceOf(Blob);
        expect(writable.close).toHaveBeenCalledOnce();
    });

    it('returns false (no throw) when the user cancels the dialog', async () => {
        window.showSaveFilePicker = vi.fn().mockRejectedValue(
            Object.assign(new Error('cancelled'), { name: 'AbortError' })
        );
        await expect(saveFile('map.kml', 'x', 'text/plain')).resolves.toBe(false);
    });

    it('propagates a genuine write error', async () => {
        window.showSaveFilePicker = vi.fn().mockRejectedValue(new Error('disk full'));
        await expect(saveFile('map.kml', 'x', 'text/plain')).rejects.toThrow('disk full');
    });
});

describe('saveFile — fallback (no File System Access API)', () => {
    it('returns false without downloading when the name prompt is cancelled', async () => {
        // no window.showSaveFilePicker defined
        vi.spyOn(window, 'prompt').mockReturnValue(null);
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:x');
        const ok = await saveFile('map.geojson', 'x', 'application/geo+json');
        expect(ok).toBe(false);
        expect(window.URL.createObjectURL).not.toHaveBeenCalled();
    });

    it('downloads with the prompted name when accepted', async () => {
        vi.spyOn(window, 'prompt').mockReturnValue('my-map.geojson');
        window.URL.createObjectURL = vi.fn().mockReturnValue('blob:x');
        window.URL.revokeObjectURL = vi.fn();
        let downloadName;
        vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
            downloadName = this.getAttribute('download');
        });
        const ok = await saveFile('map.geojson', 'x', 'application/geo+json');
        expect(ok).toBe(true);
        expect(window.prompt).toHaveBeenCalledWith('Save file as:', 'map.geojson');
        expect(window.URL.createObjectURL).toHaveBeenCalledOnce();
        expect(downloadName).toBe('my-map.geojson');
    });
});
