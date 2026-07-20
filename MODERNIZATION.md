# CellMap v2 — Modernization Roadmap

This repository is a modernized rebuild of [CellMap](https://github.com/walker93/CellMap),
a static HTML+CSS+JS map editor for planning cell-tower coverage (built on Mapbox GL JS).

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
  extracted `src/map.js` (the shared map instance) and moved `turf` from a CDN
  `<script>` to an npm import; the three feature-construction paths now call the
  shared `src/towerFeature.js`. Remaining seams — state, io/\*, ui/\* — are the next
  slice.)_
- **Phase 4 — Formalize the state model** into one module with an explicit API
  (`addTower`, `removeTower`, `hidePoi`, `showPoi`, `getVisibleFeatures`) that encapsulates
  the draw/geojson/hiddenPois sync rules in one place.
  _(started: the coverage-sector collection is now `src/sectors.js` with an explicit,
  unit-tested API — `getSectors`/`addSector`/`getSectorsByTowerId`/
  `removeSectorsByTowerId`/`clearSectors` — replacing the scattered `geojson.features`
  push/filter calls. This already exposed and fixed a real desync bug: duplicating a
  tower silently lost its coverage sector. The MapboxDraw store and the `hiddenPois`/
  `overlays` arrays are the next to formalize.)_
- **Phase 5 — Deduplicate** the three near-identical `create*Row` functions and the
  feature-construction paths. _(feature construction done: the form, CSV, and GeoJSON
  import paths all call the shared `src/towerFeature.js`; the three `create*Row`
  functions remain to be merged.)_
- **Phase 6 — CSS modernization** on the existing custom-properties foundation; add
  responsive `@media` queries (currently none). Tailwind optional as a pure utility layer.
- **Phase 7 — Accessibility polish**: `aria-*`/`role` on accordions, form, and tables;
  real `<dialog>` semantics for the add/edit form.

## Quick wins (independent of the above)

- Remove dead `showError`/`hideError` (reference a non-existent `#error-display`).
- Remove the unwired `setupClustering`.
- Cache repeated `document.getElementById` lookups (~66 calls).
- Complete the input-validation TODO (only lat/lon finiteness is checked today).

## Verification

- Run `npm run test` after every phase — it is the regression guard.
- Because every phase stays statically deployable, also smoke-test manually per phase:
  add/edit/delete a tower (confirm the sector is removed with it), hide/show a POI, draw a
  line (confirm the length label), import/export each file format, resize the panels.
