# Graph Report - .  (2026-08-11)

## Corpus Check
- Graphed: 66 files · ~190,504 words (59 code, 6 docs, 1 image).
- Scoped down from 999 detected files: 933 marker-icon/favicon PNGs under `public/images/icons/` and `favicon/` were excluded as flat assets with no extractable relationships. Only `images/screenshot.png` was kept from the image set.
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 646 nodes · 1588 edges · 21 communities (16 shown, 5 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 117 edges (avg confidence: 0.83)
- Token cost: 18,448 input · 16,361 output

## Community Hubs (Navigation)
- TomSelect Vendored Library
- Draw/State Sync Core
- Rings, Export and Project IO
- App Bootstrap and Form UI
- Cell Identity and Sector Geometry
- Sidebar and Accordion UI
- Tooling, CI and Refactor Rationale
- NPM Dependency Manifest
- tokml KML Serializer
- PapaParse and Config Generation
- Project Archive Test Harness
- Table Test Harness
- Project Menu Module
- Map Events Test Harness
- Icon Picker Test Harness
- KMZ Test Harness
- TomSelect Internal Collection
- Third-Party Embeds

## God Nodes (most connected - your core abstractions)
1. `ce` - 94 edges
2. `createTable()` - 30 edges
3. `el()` - 29 edges
4. `vitest` - 20 edges
5. `deleteAll()` - 19 edges
6. `loadFeatures()` - 15 edges
7. `t` - 14 edges
8. `feature()` - 14 edges
9. `wireControls()` - 13 edges
10. `tag()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `.cellmap Project File Format` --semantically_similar_to--> `readKmz()`  [INFERRED] [semantically similar]
  CHANGELOG.md → src/io/kmz.js
- `Cell Tower (domain entity)` --references--> `buildTowerFeature()`  [INFERRED]
  README.md → src/towerFeature.js
- `Memoized el() DOM Lookup Helper` --implements--> `el()`  [INFERRED]
  CHANGELOG.md → src/ui/dom.js
- `Distance Rings Feature` --implements--> `addRingLayers()`  [INFERRED]
  CHANGELOG.md → bootstrap.js
- `Cell Network Identity Metadata Feature (CGI)` --implements--> `formatCgi()`  [INFERRED]
  CHANGELOG.md → src/cellIdentity.js

## Import Cycles
- 1-file cycle: `eslint.config.js -> eslint.config.js`
- 1-file cycle: `public/lib/tokml.js -> public/lib/tokml.js`
- 1-file cycle: `scripts/generate-config.js -> scripts/generate-config.js`
- 1-file cycle: `src/cellIdentity.test.js -> src/cellIdentity.test.js`
- 1-file cycle: `src/distanceRings.js -> src/distanceRings.js`
- 1-file cycle: `src/io/project.test.js -> src/io/project.test.js`
- 1-file cycle: `vite.config.js -> vite.config.js`

## Hyperedges (group relationships)
- **Three Tower-Creation Paths That Must Sync properties.id** — src_ui_form_aggiungicella, src_io_csv_importcsv, src_io_geojson_importgeojson, src_towerstate_syncmarkeridproperty, modernization_properties_id_sync_bug [EXTRACTED 1.00]
- **The Three Side Collections Kept in Sync With Draw** — src_sectors, src_hiddenpois, src_overlays, src_draw_draw, src_towerstate, modernization_implicit_data_model [EXTRACTED 1.00]
- **Export/Import Format Family Sharing saveFile** — src_io_kml_exportkml, src_io_geojson_exportgeojson, src_io_project_saveproject, src_io_kmz_overlaytokmz, src_io_download_savefile [INFERRED 0.85]
- **Legacy UI Surface Superseded by the Menu + Tabs Redesign** — images_screenshot_legacy_ui, images_screenshot_italian_ui_strings, images_screenshot_row_action_icons, index_project_menu, index_sidebar_tabs [INFERRED 0.85]

## Communities (21 total, 5 thin omitted)

### Community 0 - "TomSelect Vendored Library"
Cohesion: 0.06
Nodes (4): ce, e(), le(), t

### Community 1 - "Draw/State Sync Core"
Cohesion: 0.07
Nodes (69): Legacy Sidebar UI (flat button row, 'Elementi:' list), Row Action Icons (locate / edit / delete as bare glyphs), Duplicating a Tower Silently Lost Its Coverage Sector, Hidden-POI List Desync on Delete All / Delete While Hidden, Implicit Undocumented Data Model (three-collection sync), Phase 3 - Convert to ES Modules, Phase 4 - Formalize the State Model, Phase 5 - Deduplicate Rows and Feature Construction (+61 more)

### Community 2 - "Rings, Export and Project IO"
Cohesion: 0.07
Nodes (50): .cellmap Project File Format, Map Display Settings Panel (ring spacing/opacity/labels), Project Menu (save/open/import/export), Sector Options: Uncertainty Cone + Distance Rings Toggles, File System Access API for Exports (showSaveFilePicker), KML Generation Feature, buildRingCollection(), buildRings() (+42 more)

### Community 3 - "App Bootstrap and Form UI"
Cohesion: 0.10
Nodes (46): addCellLayer(), addMeasurementTools(), addOtherTools(), addRingLayers(), setupMapLayers(), wireControls(), Mixed Italian/English UI Strings ('Ricerca', 'Elementi:'), Draw Measurement Label (4.8km line between points) (+38 more)

### Community 4 - "Cell Identity and Sector Geometry"
Cohesion: 0.10
Nodes (32): Cell Network Identity Metadata Feature (CGI), Distance Rings Feature, Graduated Uncertainty Cone Feature, Tower Row Columns: Name / Azimuth Range / Radius / Colour, Coverage Sector Rendering (overlapping translucent wedges), Cell Identity (CGI) Fieldset, Blank Lat/Lon Passed isFinite('') and Made NaN Towers, Sector Domain Rules: Radius May Be 0, Angles May Be Negative (+24 more)

### Community 5 - "Sidebar and Accordion UI"
Cohesion: 0.09
Nodes (29): Checkbox-Hack Accordions Replaced by aria-expanded Buttons, Sidebar Rework + CGI Filter Search, README Screenshot Predates the Current UI, Sidebar Accordion Tabs (Cells / POI / Overlays / Display), Remaining: Checkbox-Hack Accordion A11y Follow-Up, initAccordions(), isExpanded(), panelOf() (+21 more)

### Community 6 - "Tooling, CI and Refactor Rationale"
Cohesion: 0.05
Nodes (36): Changelog Automation Bot (push to main), CI Pipeline (lint + test on every branch), Conventional Commits + Keep a Changelog Convention, Memoized el() DOM Lookup Helper, Residual Inline oninput on #ring-opacity, icons.json %26 Percent-Encoding Breaks Vite Static Serving, Decision: Incremental Refactor, Not Framework Rewrite, Inline onclick / type=module Incompatibility (+28 more)

### Community 7 - "NPM Dependency Manifest"
Cohesion: 0.06
Nodes (35): eslint, eslint-config-prettier, @eslint/js, globals, jsdom, jszip, dependencies, papaparse (+27 more)

### Community 8 - "tokml KML Serializer"
Cohesion: 0.19
Nodes (23): attr(), data(), description(), documentDescription(), documentName(), encode(), extendeddata(), feature() (+15 more)

### Community 9 - "PapaParse and Config Generation"
Cohesion: 0.19
Nodes (21): CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip), c(), e(), g(), h(), l(), m(), p() (+13 more)

### Community 10 - "Project Archive Test Harness"
Cohesion: 0.10
Nodes (11): jszip, add(), addOverlayFixture(), addSource(), BOUNDS_A, BOUNDS_B, delete(), imageBlob() (+3 more)

### Community 14 - "Project Menu Module"
Cohesion: 0.32
Nodes (10): closeMenu(), focusItem(), initMenu(), isOpen(), itemsOf(), openMenu(), byId(), menu() (+2 more)

### Community 15 - "Map Events Test Harness"
Cohesion: 0.15
Nodes (3): handlers, mocks, point

## Ambiguous Edges - Review These
- `tom-select.complete.min.js` → `CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip)`  [AMBIGUOUS]
  index.html · relation: conceptually_related_to
- `Remaining: Checkbox-Hack Accordion A11y Follow-Up` → `Checkbox-Hack Accordions Replaced by aria-expanded Buttons`  [AMBIGUOUS]
  MODERNIZATION.md · relation: conceptually_related_to

## Knowledge Gaps
- **73 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `tabWidth`, `endOfLine` (+68 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `tom-select.complete.min.js` and `CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Remaining: Checkbox-Hack Accordion A11y Follow-Up` and `Checkbox-Hack Accordions Replaced by aria-expanded Buttons`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip)` connect `PapaParse and Config Generation` to `TomSelect Vendored Library`, `tokml KML Serializer`, `Tooling, CI and Refactor Rationale`?**
  _High betweenness centrality (0.362) - this node is a cross-community bridge._
- **Why does `Mapbox Access Token via config.js` connect `PapaParse and Config Generation` to `Draw/State Sync Core`?**
  _High betweenness centrality (0.184) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createTable()` (e.g. with `Legacy Sidebar UI (flat button row, 'Elementi:' list)` and `Sidebar Accordion Tabs (Cells / POI / Overlays / Display)`) actually correct?**
  _`createTable()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _73 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `TomSelect Vendored Library` be split into smaller, more focused modules?**
  _Cohesion score 0.05678010932816082 - nodes in this community are weakly interconnected._