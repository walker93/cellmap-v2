// The "Map display" sidebar section: settings that apply to the whole map rather
// than to one feature.
//
// It is its own section, and not a couple of controls tacked onto an existing one,
// because ring spacing is the first of a category rather than a one-off — the
// layer switcher and the timeline are the same kind of thing, and they should land
// in here rather than each inventing a home. It sits last because it is consulted
// rarely, and its header carries no "add" action because there is no collection
// underneath it to add to.
//
// The Project menu was the other candidate and is the wrong one: that is a menu of
// commands, things that produce or consume a file, and it is where "Delete all"
// lives. Persistent state behind a select and a checkbox does not belong in a menu
// you open, pick from, and close.

import { map } from '../map.js';
import {
    RING_INTERVALS,
    formatDistance,
    getRingSettings,
    setRingSettings,
} from '../distanceRings.js';
import { refreshRingsSource } from '../towerState.js';
import { el } from './dom.js';

export const RING_LABEL_LAYER = 'ring-labels';

function applyLabelVisibility(visible) {
    if (map.getLayer(RING_LABEL_LAYER)) {
        map.setLayoutProperty(RING_LABEL_LAYER, 'visibility', visible ? 'visible' : 'none');
    }
}

/** Push the current settings into the controls — used at startup and after a
 *  project is opened, which is the other way these values can change. */
export function syncDisplaySettings() {
    const { interval, labels } = getRingSettings();
    const select = el('ring-interval');
    if (select.options.length === 0) {
        for (const km of RING_INTERVALS) {
            select.add(new Option(formatDistance(km), String(km)));
        }
    }
    select.value = String(interval);
    el('ring-labels').checked = labels;
    applyLabelVisibility(labels);
}

/** Wire the section's controls. Safe to call once, at bootstrap. */
export function initDisplaySettings() {
    syncDisplaySettings();

    el('ring-interval').addEventListener('change', function () {
        setRingSettings({ interval: Number(this.value) });
        // Every ring on the map is spaced by this, so they all get rebuilt.
        refreshRingsSource();
    });

    el('ring-labels').addEventListener('change', function () {
        applyLabelVisibility(setRingSettings({ labels: this.checked }).labels);
    });
}
