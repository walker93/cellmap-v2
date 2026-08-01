import { map } from './src/map.js';

// Drag-to-resize between the map and the controls sidebar. The layout is a CSS
// grid (`main` = "map resizer controls"), so instead of setting an element's
// width we update the `--sidebar-width` custom property that sizes the controls
// column; the map takes the remaining 1fr and is told to re-measure.
document.addEventListener('DOMContentLoaded', function () {
    const resizer = document.getElementById('dragMe');
    if (!resizer) return;
    const main = resizer.parentNode;

    const MIN_SIDEBAR = 320;
    const MIN_MAP = 200;

    const mouseMoveHandler = function (e) {
        const rect = main.getBoundingClientRect();
        // the sidebar spans from the pointer to the right edge of <main>
        let sidebar = rect.right - e.clientX;
        sidebar = Math.max(MIN_SIDEBAR, Math.min(rect.width - MIN_MAP, sidebar));
        main.style.setProperty('--sidebar-width', sidebar + 'px');
        map.resize();
    };

    const mouseUpHandler = function () {
        resizer.style.removeProperty('cursor');
        document.body.style.removeProperty('cursor');
        main.style.removeProperty('user-select');
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
    };

    const mouseDownHandler = function () {
        resizer.style.cursor = 'col-resize';
        document.body.style.cursor = 'col-resize';
        // prevent text selection while dragging
        main.style.userSelect = 'none';
        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    };

    resizer.addEventListener('mousedown', mouseDownHandler);

    // Keep the map sized to its container as the viewport/layout changes
    // (window resize, device rotation, crossing a responsive breakpoint).
    window.addEventListener('resize', function () {
        map.resize();
    });
});
