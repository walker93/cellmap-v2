// Trigger a browser download of in-memory data as a file. Pure DOM helper with no
// app dependencies, shared by the GeoJSON and KML exporters.
export function downloadFile(filename, data, mimeType) {
    const blob = new Blob([data], { type: mimeType });
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    } else {
        const elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem);
        elem.click();
        document.body.removeChild(elem);
    }
}
