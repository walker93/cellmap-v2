# CellMap v2 — Architecture Decision Record

This repository is a modernized rebuild of [CellMap](https://github.com/walker93/CellMap),
a static HTML+CSS+JS map editor for planning cell-tower coverage (built on Mapbox GL JS).

This document records **why** the app is built the way it is. It is deliberately not a
changelog: for what changed and when, see `CHANGELOG.md` and `git log`.

## Current shape

The app runs on ES modules bundled by Vite, with a Vitest safety net (290 tests) and
GitHub Actions CI. `index.html` stays at the repo root because it is Vite's entry point,
and `config.js` alongside it because it is loaded as a plain `<script>` that sets
`window.API_KEY` and is copied into `dist/` by `scripts/generate-config.js`. Everything
`index.html` loads lives under `src/`. Production is a `vite build` → static `dist/`,
deployed to Cloudflare Workers behind a reverse proxy at
`alexcortinovis.tech/cellmapdesigner`.

## Decision: incremental refactor, not a framework rewrite

After analysing the original app (~2,000 LOC, single Mapbox-centric page, no build
pipeline, no tests, solo maintainer), the chosen path was a **disciplined incremental
refactor of the vanilla JS** — plain ES modules + Vite + Vitest + ESLint/Prettier —
**not** a React/Vue/Tailwind-as-a-component-framework rewrite.

Why:

- **Mapbox GL/Draw is imperative regardless of framework.** `react-map-gl` still holds
  a `mapRef`/`drawRef` and calls imperative Mapbox methods under the hood, so a UI
  framework buys little here while costing an entire new toolchain, dependency tree, and
  hosting change for an app that was zero-build static files.
- **The real cost of a framework migration is standing up all the tooling from zero**,
  not rewriting the logic — and the logic mostly needed its duplication and implicit data
  model cleaned up, which is orthogonal to the UI framework.
- **A prior `type="module"` attempt in the original repo was reverted** because inline
  `onclick="..."` handlers require global functions; module scripts break them. That is a
  sequencing problem a targeted refactor fixes once, cheaply, with `addEventListener`.

A framework rewrite would only pay off with significant new UI surface (multi-page,
dashboards, accounts), a component-library-driven design system, onboarding a team, or as
a deliberate learning exercise — none of which apply to the app as it stands today.

## Why the earlier migration attempts stalled

1. **No test safety net** — nothing pinned down correct behaviour, so rewrites lost edge
   cases silently. Hence Phase 0: tests for the highest-risk logic (CSV import, KML
   export, KMZ georeferencing, draw/sector/hiddenPois sync) _before_ any refactor.
2. **An implicit, undocumented data model** — state was split across MapboxDraw's feature
   store, a parallel sector array (linked only by a manually matched `towerid` string),
   and a `hiddenPois` array, kept in sync by scattered `.filter()` calls. Formalizing it
   into `src/towerState.js` is what surfaced four real desync bugs.
3. **The proven inline-`onclick` / `type="module"` incompatibility** (see above).

## Domain rules that the code cannot tell you

These are the constraints a reader would otherwise get wrong, because they look like bugs:

- **Radius may be 0.** A tower with no sector is legitimate — typically when a KMZ overlay
  already supplies the coverage area. `validateTowerFields` checks radius ≥ 0, not > 0.
- **Angles may be negative.** Sectors are azimuth offsets: azimuth 0 with a 120° beam is
  start = -60, end = 60. Validated within -360..360.
- **Blank coordinates are not zero.** `isFinite('') === true`, so empty lat/lon inputs
  once produced towers at NaN coordinates; blankness is rejected explicitly.
- **`properties.id`, not the Draw feature id, is what the show/hide layer filter matches**
  (`['!=', ['get', 'id'], marker.id]`). Every path that creates a tower — form, duplicate,
  CSV import, GeoJSON import — must sync `properties.id` to the new feature id after
  `draw.add`, or show/hide toggles the wrong tower (or both).
- **Network identity codes are strings, not numbers.** MNC `"01"` is not the code `1`.
  The pressure point is CSV, where Papa Parse's `dynamicTyping` has already coerced `"01"`
  to `1` before the row reaches us.
- **Nothing derived is persisted.** Coverage sectors and distance rings are recomputed
  from the tower's own fields, so a saved file can never carry a sector that disagrees
  with its tower.
- **Any asset referenced only by a runtime string** — a `<script src>` in `index.html`,
  `map.loadImage('cell-tower.png')`, the `icons.json` fetch — **is invisible to Vite's
  bundler** and must live in `public/`. Otherwise `vite build` silently omits it from
  `dist/` and only `vite dev` (filesystem passthrough) appears to work.

## Verification

- Run `npm run test` after every change — it is the regression guard.
- The Mapbox CDN is unreachable from some dev/CI sandboxes, so live map interaction can't
  always be click-tested there; the module graph is verified to boot end to end and the
  extracted logic is unit-tested.
- Because every change stays statically deployable, also smoke-test manually against a
  real token: add/edit/delete a tower (confirm the sector is removed with it), hide/show a
  POI, draw a line (confirm the length label), import/export each file format, resize the
  panels. Sample inputs for the import flows are in `fixtures/`.
