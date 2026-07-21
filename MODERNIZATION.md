# CellMap v2 — Modernization Roadmap

This repository is a modernized rebuild of [CellMap](https://github.com/walker93/CellMap),
a static HTML+CSS+JS map editor for planning cell-tower coverage (built on Mapbox GL JS).

## Current status

The app now runs entirely on **ES modules bundled by Vite**, with a **Vitest** safety net
(53 tests) and GitHub Actions CI. Work so far, on branch
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
  mutable top-level state globals remain in `new_script.js`.
- **Phase 3 (io, partial)** — the export/download side is extracted into `src/io/`:
  `download.js` (`saveFile`), `geojson.js` (`exportGeoJSON`), `kml.js`
  (`generateKML`/`exportKML`), and `kmz.js` (`parseLatLonBox`, a pure, unit-tested
  georeferencing parser). Exports now use the **File System Access API**
  (`showSaveFilePicker`) — a native "Save as" dialog with an editable name and a file-type
  filter — instead of hardcoded names + the `<a download>` click trick; browsers without
  the API fall back to a name prompt + anchor download. The import orchestrators stay in
  `new_script.js` for now because they depend on the render layer (see Remaining).
- **Phase 3 / 5 (ui/table)** — the render layer is extracted: `src/mapSource.js`
  (`addGeoJsonSource`) and `src/ui/table.js` (`createTable` + the three row builders,
  which are **deduplicated** via a shared `actionIcon` helper). The row "edit" action is
  injected from `new_script.js` via `setRowEditHandler` to avoid a table↔form circular
  import.
- **Phase 5 (partial)** — the form / CSV / GeoJSON-import feature-construction paths are
  deduplicated into `src/towerFeature.js`.
- **Quick wins** — dead code removed (`showError`/`hideError`/`setupClustering`); input
  validation completed.

**Real bugs found and fixed while formalizing state**
1. Duplicating a tower silently lost its coverage sector (referenced an undefined
   `feature_id` and pushed the raw filter array).
2. "Delete All" didn't clear the hidden-POI list, so hidden POIs reappeared.
3. Deleting a POI while it was hidden left it stuck in the hidden list.
4. Blank latitude/longitude passed validation (`isFinite('')===true`) and created towers
   at NaN coordinates.
5. Table rows used an undeclared `col` variable; once `new_script.js` became a strict-mode
   ES module (Phase 3), building any row threw `ReferenceError: col is not defined` — so the
   sidebar was broken after modularization. Fixed by declaring it during the ui/table
   extraction, with a Vitest regression guard that builds rows and asserts no throw.

**Remaining**
- **Phase 4 (optional refinement)** — the `draw` store is now a shared module, but call
  sites still use `draw.add/get/delete` directly. Higher-level coordinating operations
  (`addTower`/`removeTower`/`hidePoi`/`showPoi` that also keep sectors/hiddenPois in sync)
  could be lifted out of the DOM handlers into a state module on top of `src/draw.js`.
- **Phase 3** — the remaining io **import** orchestrators (`importjson`, `openfile` CSV,
  `processKMZ`) and the `ui/form` seam. The render helpers they needed (`createTable`,
  `addGeoJsonSource`) are now modules, so importjson/openfile can move to `src/io/` once
  the form (`aggiungiCella`/`loadForm`/…) is extracted into `src/ui/form.js` — that is the
  natural next slice.
- **Phase 6** — responsive CSS. **Phase 7** — accessibility.

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
  _(started: `index.html` now loads `new_script.js`/`resizer.js` as `type="module"`;
  extracted `src/map.js` (shared map instance) and `src/draw.js` (shared MapboxDraw
  instance) and moved `turf` from a CDN `<script>` to an npm import; the three
  feature-construction paths now call the shared `src/towerFeature.js`; and the io
  export side is now under `src/io/` (`download`, `geojson`, `kml`, `kmz`). Remaining
  seams — the io **import** orchestrators and `ui/{table,form}`, both tied to the render
  helpers — are the next slice.)_
- **Phase 4 — Formalize the state model** into one module with an explicit API
  (`addTower`, `removeTower`, `hidePoi`, `showPoi`, `getVisibleFeatures`) that encapsulates
  the draw/geojson/hiddenPois sync rules in one place.
  _(largely done: all shared state is module-owned. The three side collections are
  explicit, unit-tested modules replacing the scattered global mutations — `src/sectors.js`
  (coverage sectors, linked by `towerid`), `src/hiddenPois.js` (POIs pulled out of draw
  when hidden), and `src/overlays.js` (KMZ raster overlays); and the MapboxDraw feature
  store is now the single shared `draw` instance in `src/draw.js`. Formalizing the
  collections exposed and fixed three real desync bugs: duplicating a tower silently lost
  its coverage sector; "Delete All" didn't clear the hidden-POI list; and deleting a hidden
  POI left it lingering in that list. Optional next step: lift `addTower`/`removeTower`/
  `hidePoi`/`showPoi` coordinating logic out of the DOM handlers onto `src/draw.js`.)_
- **Phase 5 — Deduplicate** the three near-identical `create*Row` functions and the
  feature-construction paths. _(feature construction done: the form, CSV, and GeoJSON
  import paths all call the shared `src/towerFeature.js`; the three `create*Row`
  functions remain to be merged.)_
- **Phase 6 — CSS modernization** on the existing custom-properties foundation; add
  responsive `@media` queries (currently none). Tailwind optional as a pure utility layer.
- **Phase 7 — Accessibility polish**: `aria-*`/`role` on accordions, form, and tables;
  real `<dialog>` semantics for the add/edit form.

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
