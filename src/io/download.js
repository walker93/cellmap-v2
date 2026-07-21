// Save in-memory data to a file the user chooses.
//
// Where the browser supports the File System Access API (Chromium-based), this
// opens the native "Save as" dialog so the user can edit the file name and pick
// the location, then streams the data to the chosen file. Browsers without it
// (Firefox, Safari) fall back to the classic anchor-download trick, prompting for
// a name so the file name still isn't fixed.

/**
 * @param {string} suggestedName default file name shown in the dialog / prompt.
 * @param {string|Blob} data the file contents.
 * @param {string} mimeType e.g. 'application/geo+json'.
 * @param {{ description?: string, extensions?: string[] }} [accept] file-type filter
 *   for the save dialog (extensions like ['.geojson']).
 * @returns {Promise<boolean>} true if the file was written, false if the user cancelled.
 */
export async function saveFile(suggestedName, data, mimeType, accept = {}) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });

    if (typeof window.showSaveFilePicker === 'function') {
        let handle;
        try {
            handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: accept.description || 'File',
                        accept: { [mimeType]: accept.extensions || [] },
                    },
                ],
            });
        } catch (err) {
            // The user dismissing the picker rejects with AbortError — not a failure.
            if (err && err.name === 'AbortError') return false;
            throw err;
        }
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
    }

    // Fallback for browsers without the File System Access API: ask for a name,
    // then trigger a normal download.
    const name = window.prompt('Save file as:', suggestedName);
    if (name === null) return false; // cancelled
    const url = window.URL.createObjectURL(blob);
    const elem = window.document.createElement('a');
    elem.href = url;
    elem.download = name || suggestedName;
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
    window.URL.revokeObjectURL(url);
    return true;
}
