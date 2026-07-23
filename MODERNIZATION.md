# CellMap v2 — Modernization Roadmap

This repository is a modernized rebuild of [CellMap](https://github.com/walker93/CellMap),
a static HTML+CSS+JS map editor for planning cell-tower coverage (built on Mapbox GL JS).

## Current status

The app now runs entirely on **ES modules bundled by Vite**, with a **Vitest** safety net
(69 tests) and GitHub Actions CI. Work so far, on branch
`claude/webapp-legacy-modernization-plan-chxyij`:

**Done**
- Seeded from CellMap with the **leaked Mapbox token scrubbed from git history** and the
  deprecated `old/` backup removed.
- Tooling: **Vite + Vitest + ESLint (flat) + Prettier + CI**; `config.js` now sets
  `window.API_KEY`. Production is a `vite build` → static `dist/`.
- **Phase 1** — all ~10 inline `onclick` handlers replaced with `addEventListener`.
- **Phase 2/3** — `index.html` loads the app as `type="module"`; extracted `src/map.js`,
  `src/draw.js`, `src/towerFeature.js`, `src/sectors.js`, `src/hiddenPois.js`,
  `src/overlays.js`; `turf` moved from a CDN `<script>` to an npm import.
- **Phase 4** — all shared state is now module-owned: the three side collections
  (sectors, hiddenPois, overlays) behind explicit unit-tested APIs, and the **MapboxDraw
  feature store** extracted into `src/draw.js` as the single shared `draw` instance. No
  mutable top-level state globals remain in `bootstrap.js`.
- **Phase 3 (io — complete)** — all io lives under `src/io/`: `download.js` (`saveFile`),
  `geojson.js` (`exportGeoJSON` + `importGeoJSON`), `kml.js` (`generateKML`/`exportKML`),
  `csv.js` (`importCSV`), and `kmz.js` (`parseLatLonBox` + `importKMZ`), with `deleteAll`
  extracted into `src/reset.js` as the shared "clear the map" action the importers use.
  Exports use the **File System Access API** (`showSaveFilePicker`) — a native "Save as"
  dialog with an editable name and a file-type filter — instead of hardcoded names + the
  `<a download>` click trick; browsers without the API fall back to a name prompt + anchor
  download.
- **Phase 3 / 5 (ui/table)** — the render layer is extracted: `src/mapSource.js`
  (`addGeoJsonSource`) and `src/ui/table.js` (`createTable` + the three row builders,
  which are **deduplicated** via a shared `actionIcon` helper). The row "edit" action is
  injected from `bootstrap.js` via `setRowEditHandler` to avoid a table↔form circular
  import.
- **Phase 3 (ui/form)** — the add/edit form is extracted into `src/ui/form.js`
  (`aggiungiCella`, `loadForm`, `modificaCella`/`modificaPoi`, `openForm`/`closeForm`,
  validation + feature building). It registers its own row-edit handler with `ui/table.js`,
  and exposes `openForm`/`closeForm`/`aggiungiCella`/`submitEditForm` for the toolbar
  wiring; the "Salva" dispatch (`pendingSaveHandler`) is now module-internal.
- **Phase 3 (ui/iconPicker)** — the `#inp_icon` icon control is extracted into
  `src/ui/iconPicker.js` (`loadIcons`): fetch `icons.json`, rebuild the category-grouped
  `<select>`, wrap it in TomSelect, and register a picked icon as a Mapbox image. Unit
  tested (fetch/TomSelect mocked) **and** verified in a real browser against the vendored
  TomSelect and the real `icons.json` — 844 icons across 13 category optgroups load into
  the control with no errors.
- **Phase 5** — the form / CSV / GeoJSON-import feature-construction paths are deduplicated
  into `src/towerFeature.js`, and the three `create*Row` functions in `src/ui/table.js`
  share a `createRow(labelElements, actions)` scaffold plus common `visibilityToggleButton`/
  `duplicateButton`/`editButton`/`deleteButton` builders (the tower and POI rows call these
  with `towerState.js` functions as arguments — `setTowerHidden`/`duplicateTower` vs
  `hidePoi`+`showPoi`/`duplicatePoi` — instead of repeating near-identical button-building
  code); the overlay row keeps its own hide/show and delete (different data shape, no
  duplicate/edit, doesn't refresh the table), so it uses `createRow` but not the other four
  helpers.
- **Phase 6 (responsive CSS)** — the page and main area now use **CSS Grid**: `body` is a
  `header / main / footer` row grid, and `main` is a `map | resizer | controls` column grid
  driven by a `--sidebar-width` custom property. The drag-resizer updates that property
  (grid-native) and re-measures the map, and also resizes the map on window resize. Added a
  `viewport` meta and `@media` breakpoints (768px / 480px) that stack the map over the
  controls and hide the resizer on narrow screens; the add/edit popup is now centred and
  size-capped. Verified in headless Chromium at desktop and mobile viewports (grid tracks,
  resizer drag, breakpoint stacking, popup centring) with screenshots.
- **Phase 7 (accessibility)** — the row action controls, the biggest gap, are now real
  focusable `<button aria-label>`s (Locate / Show-Hide / Duplicate / Edit / Delete) with a
  visible keyboard focus ring, instead of non-focusable `<i>` icons; decorative icons are
  `aria-hidden`. The toolbar is a labelled `role="toolbar"`; the add/edit popup is a
  `role="dialog"`/`aria-modal` that moves focus to its first field on open, closes on
  Escape, and restores focus on close; the accordion panels are `role="region"`s labelled
  by their headers, with visible focus on the (previously invisible) toggle. Logo `alt` and
  a map region label added.
- **Quick wins** — dead code removed (`showError`/`hideError`/`setupClustering`); input
  validation completed.

With this, **Phase 3 is complete**: `bootstrap.js` is down from ~1,586 lines to a ~290-line
bootstrap (map/layer setup, the Mapbox event handlers, and `wireControls`), and everything
else lives in 16 focused `src/` modules.

**Real bugs found and fixed while formalizing state**
1. Duplicating a tower silently lost its coverage sector (referenced an undefined
   `feature_id` and pushed the raw filter array).
2. "Delete All" didn't clear the hidden-POI list, so hidden POIs reappeared.
3. Deleting a POI while it was hidden left it stuck in the hidden list.
4. Blank latitude/longitude passed validation (`isFinite('')===true`) and created towers
   at NaN coordinates.
5. Table rows used an undeclared `col` variable; once `bootstrap.js` became a strict-mode
   ES module (Phase 3), building any row threw `ReferenceError: col is not defined` — so the
   sidebar was broken after modularization. Fixed by declaring it during the ui/table
   extraction, with a Vitest regression guard that builds rows and asserts no throw.
6. Duplicating a tower hid/showed the wrong cell(s): `aggiungiCella` (`src/ui/form.js`)
   keeps `properties.id` equal to the new draw feature id, because the show/hide handler's
   Mapbox layer filter (`['!=', ['get', 'id'], marker.id]`) matches on `properties.id`, not
   the real feature id. The tower "Duplicate" handler in `src/ui/table.js` copied
   `properties.id` verbatim from the original, so the duplicate's `properties.id` stayed
   equal to the original's — toggling show/hide on the original hid both towers (they
   shared the same `properties.id`), while toggling the duplicate hid neither. Fixed by
   re-fetching the new feature after `draw.add` and syncing `properties.id` to its new id,
   same as `aggiungiCella` does; covered by a Vitest regression test in
   `src/ui/table.test.js`.
7. The same `properties.id` sync was missing from the CSV and GeoJSON importers
   (`src/io/csv.js`, `src/io/geojson.js`) — only `aggiungiCella` did it, so towers created
   via those two import paths could never be hidden/shown at all (the layer filter matches
   an id that was never set). Fixed as part of the Phase 4 refactor below, which centralises
   the sync in one place all three creation paths call.

- **Phase 4 (state module)** — the coordinating operations that keep `draw`/sectors/
  hiddenPois in sync (`addTower`, `duplicateTower`, `setTowerHidden`, `duplicatePoi`,
  `hidePoi`/`showPoi`, `removeFeature`, plus `linkTowerSector` for the GeoJSON bulk-import
  case) are lifted out of the DOM row handlers into `src/towerState.js`, unit-tested
  directly (`src/towerState.test.js`) against a MapboxDraw fake that clones on get/add like
  the real control does. `src/ui/table.js`, `src/ui/form.js`, `src/io/csv.js`, and
  `src/io/geojson.js` now call these instead of driving `draw`/sectors/hiddenPois by hand —
  which is what surfaced bug #7 above, exactly the kind of drift this phase closes off.
- **Dialog focus-trap** — the add/edit dialog's Escape/focus-in/restore handling (Phase 7)
  now also traps Tab/Shift+Tab inside `#inputs` while it's open: `getFocusableElements`
  (`src/ui/form.js`) reads the dialog's own visible, non-disabled focusable elements, and
  `trapFocus` wraps Tab on the last one back to the first (and Shift+Tab on the first back
  to the last) instead of letting focus escape to the map/sidebar underneath. This matters
  for any keyboard user tabbing through the form, not just screen-reader users — requested
  after review. Covered by 3 new Vitest cases in `src/ui/form.test.js`.
- **`src/mapEvents.js` extracted** — the `map.on(...)` handlers (measurement labels on
  `draw.render`, sidebar refresh on `draw.create/delete/update`, the marker click popup,
  the contextmenu lat/lon fill-in, and the hover cursor) moved out of `bootstrap.js` into
  `registerMapEvents()`, called once at the same point in the bootstrap. Pure code motion,
  no behaviour change — except that moving into `src/` put the code under the stricter
  (non-legacy) ESLint tier, which turned up a real `no-redeclare` (three `var label`
  declarations sharing one function scope across the Point/LineString/Polygon switch
  cases); fixed by block-scoping each case with `const`. `bootstrap.js` is now ~180 lines
  (setup + `wireControls`).
- **Renamed `new_script.js` → `bootstrap.js`** — the name was a leftover from the original
  repo's `script.js`/`new_script.js` pair and no longer described the file once it was down
  to layer/control setup + `wireControls`; `bootstrap.js` matches the term this doc already
  used for it. Updated everywhere: `index.html`'s `<script type="module">` tag,
  `eslint.config.js`'s legacy-tier file list, `vite.config.js`'s comment, and the
  cross-references in `src/draw.js`, `src/mapEvents.js`, `src/mapSource.js`, and
  `src/ui/table.js`.

**Remaining**
- **A11y follow-up (optional)** — converting the checkbox-hack accordion (`index.html`'s
  `#cb1`/`#cb2`/`#cb3`) to a `button aria-expanded` disclosure, if the checkbox semantics
  (which already work with keyboard via Space/Enter) prove awkward with screen readers in
  practice.

**Verification note:** the Mapbox CDN is unreachable from the dev/CI sandbox, so live map
interaction can't be click-tested here — the module graph is verified to boot end to end
and the extracted logic is unit-tested. When building locally with a real token, manually
smoke-test the fixed flows: duplicating a tower keeps its sector; "Delete All" and deleting
a hidden POI clear it from the table; blank coordinates are rejected; radius 0 and negative
angles are accepted.

## Decision: incremental refactor, not a framework rewrite

After analysing the original app (~2,000 LOC, single Mapbox-centric page, no build
pipeline, no tests, solo maintainer), the chosen path is a **disciplined incremental
refactor of the vanilla JS** — plain ES modules + Vite + Vitest + ESLint/Prettier —
**not** a React/Vue/Tailwind-as-a-component-framework rewrite.

Why:

- **Mapbox GL/Draw is imperative regardless of framework.** `react-map-gl` still holds
  a `mapRef`/`drawRef` and calls imperative Mapbox methods under the hood, so a UI
  framework buys little here while costing an entire new toolchain, dependency tree, and
  hosting change for an app that is currently zero-build static files.
- **The real cost of a framework migration is standing up all the tooling from zero**,
  not rewriting the logic — and the logic mostly needs its duplication and implicit data
  model cleaned up, which is orthogonal to the UI framework.
- **A prior `type="module"` attempt in the original repo was reverted** because inline
  `onclick="..."` handlers require global functions; module scripts break them. That is a
  sequencing problem a targeted refactor fixes once, cheaply, with `addEventListener`.

A framework rewrite would only pay off with significant new UI surface (multi-page,
dashboards, accounts), a component-library-driven design system, onboarding a team, or as
a deliberate learning exercise — none of which apply to the app as it stands today.

## Why previous migration attempts produced poor/incomplete results

1. **No test safety net** — nothing pinned down correct behaviour, so rewrites lost edge
   cases silently.
2. **An implicit, undocumented data model** — state is split across MapboxDraw's feature
   store, a parallel `geojson` sector array (linked only by a manually matched `towerid`
   string), and a `hiddenPois` array, kept in sync by scattered `.filter()` calls. Easy to
   get subtly wrong when reimplementing from scratch.
3. **The proven inline-`onclick` / `type="module"` incompatibility** (see above).

## Phased plan

Each phase leaves the app in a working, statically-deployable state.

- **Phase 0 — Safety net first.** Vitest + tests for the highest-risk logic (CSV import,
  KML export, KMZ georeferencing, draw/geojson/hiddenPois sync) *before* any refactor.
  _(started: tooling in place, first pure module + tests landed under `src/`.)_
- **Phase 1 — Decouple from inline `onclick`.** Replace the ~10 inline handlers in
  `index.html` (and the dynamic `setAttribute('onclick', …)`) with `addEventListener`.
  Prerequisite for any module work.
- **Phase 2 — Build tooling (Vite) with zero behaviour change.** `package.json`, Vite,
  ESLint, Prettier; move CDN libs to npm deps where sensible. _(done for the project
  skeleton; app entry still served as-is until Phase 3.)_
- **Phase 3 — Convert to ES modules** along natural seams: `map`, `state`, `towers`,
  `pois`, `overlays`, `io/{csv,geojson,kml,kmz}`, `ui/{table,form}`.
  _(**done**: `index.html` loads the app as `type="module"`; all seams are extracted into
  16 `src/` modules — `map`, `draw`, `mapSource`, `reset`, the state modules, `towerFeature`,
  `io/{download,geojson,kml,kmz,csv}`, and `ui/{table,form,iconPicker}`; `turf` moved to an
  npm import. `bootstrap.js` is now a ~290-line bootstrap.)_
- **Phase 4 — Formalize the state model** into one module with an explicit API
  (`addTower`, `removeTower`, `hidePoi`, `showPoi`, `getVisibleFeatures`) that encapsulates
  the draw/geojson/hiddenPois sync rules in one place.
  _(**done**: all shared state is module-owned. The three side collections are explicit,
  unit-tested modules replacing the scattered global mutations — `src/sectors.js`
  (coverage sectors, linked by `towerid`), `src/hiddenPois.js` (POIs pulled out of draw
  when hidden), and `src/overlays.js` (KMZ raster overlays); the MapboxDraw feature store
  is the single shared `draw` instance in `src/draw.js`; and the coordinating operations
  on top of them — `addTower`, `duplicateTower`, `setTowerHidden`, `duplicatePoi`,
  `hidePoi`/`showPoi`, `removeFeature`, `linkTowerSector` — live in `src/towerState.js`,
  called from `ui/table.js`, `ui/form.js`, `io/csv.js`, and `io/geojson.js` instead of each
  handler driving `draw`/sectors/hiddenPois by hand. Formalizing the collections and then
  the coordinating operations exposed and fixed four real desync bugs: duplicating a tower
  silently lost its coverage sector; "Delete All" didn't clear the hidden-POI list;
  deleting a hidden POI left it lingering in that list; and duplicating a tower left its
  `properties.id` pointing at the original, so the show/hide layer filter (which matches
  on `properties.id`) hid both towers together — the CSV/GeoJSON importers had the same
  gap and could never hide/show their towers at all. `getVisibleFeatures` was not needed:
  visibility is a per-feature/layer-filter concern the callers already read off `draw`.)_
- **Phase 5 — Deduplicate** the three near-identical `create*Row` functions and the
  feature-construction paths.
  _(**done**: the form, CSV, and GeoJSON import paths all call the shared
  `src/towerFeature.js`; `createTowerRow`/`createPOIRow`/`createOverlayRow` in
  `src/ui/table.js` now share a `createRow` row/col scaffold, and the tower/POI rows
  additionally share their Hide-Show/Duplicate/Edit/Delete button builders,
  parametrized by which `src/towerState.js` function to call.)_
- **Phase 6 — CSS modernization** on the existing custom-properties foundation; add
  responsive `@media` queries (currently none). Tailwind optional as a pure utility layer.
  _(**done**: main layout moved from flex to **CSS Grid** (`header/main/footer` +
  `map | resizer | controls` via a `--sidebar-width` custom property); grid-native
  drag-resizer; `viewport` meta + 768px/480px breakpoints that stack the layout and hide
  the resizer on mobile; centred, size-capped popup form.)_
- **Phase 7 — Accessibility polish**: `aria-*`/`role` on accordions, form, and tables;
  real `<dialog>` semantics for the add/edit form.
  _(**done**: row actions are focusable `<button aria-label>`s with a visible focus ring;
  decorative icons `aria-hidden`; `role="toolbar"`; dialog role + focus-in/Escape/restore
  **+ a full Tab/Shift+Tab focus-trap**; accordion `role="region"`s; logo `alt` + map label.
  Converting the checkbox-hack accordion to a `button aria-expanded` disclosure left as an
  optional follow-up.)_

## Quick wins (independent of the above)

- ~~Remove dead `showError`/`hideError` (reference a non-existent `#error-display`).~~ done
- ~~Remove the unwired `setupClustering`.~~ done
- Cache repeated `document.getElementById` lookups (~66 calls).
- ~~Complete the input-validation TODO (only lat/lon finiteness is checked today).~~ done —
  `validateTowerFields` (in `src/towerFeature.js`) checks lat/lon ranges and rejects
  blank coordinates (the old `isFinite('')===true` let empty inputs through and produced
  NaN towers). Per the domain: radius may be **0** (a tower with no sector, e.g. when a
  KMZ overlay already provides the coverage area) and angles may be **negative** (sectors
  are azimuth offsets — azimuth 0 with a 120° beam is start=-60, end=60), so radius is
  validated as ≥ 0 and angles within -360..360; the form's number inputs use matching
  `min` values.

## Verification

- Run `npm run test` after every phase — it is the regression guard.
- Because every phase stays statically deployable, also smoke-test manually per phase:
  add/edit/delete a tower (confirm the sector is removed with it), hide/show a POI, draw a
  line (confirm the length label), import/export each file format, resize the panels.
