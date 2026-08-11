# Graph Report - cellmap-v2  (2026-08-11)

## Corpus Check
- 64 files · ~188,604 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 529 nodes · 1223 edges · 25 communities (18 shown, 7 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 115 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d306bde`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- bootstrap.js
- towerState.js
- distanceRings.js
- form.js
- towerFeature.js
- sidebar.js
- scripts
- devDependencies
- tokml.js
- papaparse.min.js
- project.test.js
- table.test.js
- table.js
- menu.test.js
- mapEvents.test.js
- iconPicker.test.js
- project.js
- accordion.js
- CLAUDE.md
- Third-Party Embeds (Google Analytics, PayPal Donate)
- README.md
- Module Entry Points (bootstrap.js, resizer.js)
- Phase 6 - CSS Grid + Responsive Breakpoints

## God Nodes (most connected - your core abstractions)
1. `createTable()` - 30 edges
2. `el()` - 29 edges
3. `deleteAll()` - 19 edges
4. `loadFeatures()` - 15 edges
5. `feature()` - 14 edges
6. `tag()` - 13 edges
7. `wireControls()` - 13 edges
8. `draw` - 13 edges
9. `map` - 13 edges
10. `addGeoJsonSource()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `.cellmap Project File Format` --semantically_similar_to--> `readKmz()`  [INFERRED] [semantically similar]
  CHANGELOG.md → src/io/kmz.js
- `Sector Options: Uncertainty Cone + Distance Rings Toggles` --references--> `buildRings()`  [INFERRED]
  index.html → src/distanceRings.js
- `Cell Tower (domain entity)` --references--> `buildTowerFeature()`  [INFERRED]
  README.md → src/towerFeature.js
- `Memoized el() DOM Lookup Helper` --implements--> `el()`  [INFERRED]
  CHANGELOG.md → src/ui/dom.js
- `Cell Network Identity Metadata Feature (CGI)` --implements--> `formatCgi()`  [INFERRED]
  CHANGELOG.md → src/cellIdentity.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Three Tower-Creation Paths That Must Sync properties.id** — src_ui_form_aggiungicella, src_io_csv_importcsv, src_io_geojson_importgeojson, src_towerstate_syncmarkeridproperty, modernization_properties_id_sync_bug [EXTRACTED 1.00]
- **The Three Side Collections Kept in Sync With Draw** — src_sectors, src_hiddenpois, src_overlays, src_draw_draw, src_towerstate, modernization_implicit_data_model [EXTRACTED 1.00]
- **Export/Import Format Family Sharing saveFile** — src_io_kml_exportkml, src_io_geojson_exportgeojson, src_io_project_saveproject, src_io_kmz_overlaytokmz, src_io_download_savefile [INFERRED 0.85]
- **Legacy UI Surface Superseded by the Menu + Tabs Redesign** — images_screenshot_legacy_ui, images_screenshot_italian_ui_strings, images_screenshot_row_action_icons, index_project_menu, index_sidebar_tabs [INFERRED 0.85]

## Communities (25 total, 7 thin omitted)

### Community 0 - "bootstrap.js"
Cohesion: 0.15
Nodes (26): Legacy Sidebar UI (flat button row, 'Elementi:' list), Project Menu (save/open/import/export), Phase 3 - Convert to ES Modules, CSV Tower Import Feature, KML Generation Feature, addCellLayer(), addMeasurementTools(), addOtherTools() (+18 more)

### Community 1 - "towerState.js"
Cohesion: 0.09
Nodes (34): Duplicating a Tower Silently Lost Its Coverage Sector, Hidden-POI List Desync on Delete All / Delete While Hidden, Implicit Undocumented Data Model (three-collection sync), Phase 4 - Formalize the State Model, properties.id Must Match Draw Feature id (show/hide filter), towerid String Linkage Between Draw and Sectors, draw, addHiddenPoi() (+26 more)

### Community 2 - "distanceRings.js"
Cohesion: 0.17
Nodes (18): Distance Rings Feature, Map Display Settings Panel (ring spacing/opacity/labels), buildRingCollection(), buildRings(), DEFAULT_RING_INTERVAL, DEFAULT_RING_STROKE_OPACITY, formatDistance(), getRingSettings() (+10 more)

### Community 3 - "form.js"
Cohesion: 0.14
Nodes (34): Mixed Italian/English UI Strings ('Ricerca', 'Elementi:'), Draw Measurement Label (4.8km line between points), Add/Edit Cell Dialog (#inputs), Dialog Focus Trap (Tab/Shift+Tab containment), styleimagemissing Hook for Icon Registration, escapeHtml(), registerMapEvents(), cache (+26 more)

### Community 4 - "towerFeature.js"
Cohesion: 0.09
Nodes (35): Cell Network Identity Metadata Feature (CGI), Graduated Uncertainty Cone Feature, Tower Row Columns: Name / Azimuth Range / Radius / Colour, Coverage Sector Rendering (overlapping translucent wedges), Cell Identity (CGI) Fieldset, Sector Options: Uncertainty Cone + Distance Rings Toggles, Blank Lat/Lon Passed isFinite('') and Made NaN Towers, Sector Domain Rules: Radius May Be 0, Angles May Be Negative (+27 more)

### Community 5 - "sidebar.js"
Cohesion: 0.11
Nodes (22): Sidebar Rework + CGI Filter Search, README Screenshot Predates the Current UI, Sidebar Accordion Tabs (Cells / POI / Overlays / Display), haystack(), initSidebar(), paintFilter(), paintHighlight(), paintSelection() (+14 more)

### Community 6 - "scripts"
Cohesion: 0.06
Nodes (31): Changelog Automation Bot (push to main), CI Pipeline (lint + test on every branch), Conventional Commits + Keep a Changelog Convention, Memoized el() DOM Lookup Helper, Residual Inline oninput on #ring-opacity, icons.json %26 Percent-Encoding Breaks Vite Static Serving, Decision: Incremental Refactor, Not Framework Rewrite, Inline onclick / type=module Incompatibility (+23 more)

### Community 7 - "devDependencies"
Cohesion: 0.06
Nodes (33): eslint, eslint-config-prettier, @eslint/js, globals, jsdom, jszip, dependencies, @turf/turf (+25 more)

### Community 8 - "tokml.js"
Cohesion: 0.13
Nodes (28): CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip), Mapbox CDN Unreachable in CI - Live Map Untestable, attr(), data(), description(), documentDescription(), documentName(), encode() (+20 more)

### Community 9 - "papaparse.min.js"
Cohesion: 0.38
Nodes (14): c(), e(), g(), h(), l(), m(), p(), q() (+6 more)

### Community 10 - "project.test.js"
Cohesion: 0.11
Nodes (10): add(), addOverlayFixture(), addSource(), BOUNDS_A, BOUNDS_B, delete(), imageBlob(), mocks (+2 more)

### Community 13 - "table.js"
Cohesion: 0.24
Nodes (21): Row Action Icons (locate / edit / delete as bare glyphs), Phase 5 - Deduplicate Rows and Feature Construction, Phase 7 - Accessibility Polish, Row-Edit Handler Injection Avoids table-form Circular Import, duplicatePoi(), actionIcon(), createOverlayRow(), createPOIRow() (+13 more)

### Community 14 - "menu.test.js"
Cohesion: 0.32
Nodes (10): closeMenu(), focusItem(), initMenu(), isOpen(), itemsOf(), openMenu(), byId(), menu() (+2 more)

### Community 15 - "mapEvents.test.js"
Cohesion: 0.15
Nodes (3): handlers, mocks, point

### Community 17 - "project.js"
Cohesion: 0.09
Nodes (29): .cellmap Project File Format, File System Access API for Exports (showSaveFilePicker), defaultRingInterval(), getHiddenPois(), addRasterOverlay(), DEFAULT_OVERLAY_OPACITY, escapeXml(), importKMZ() (+21 more)

### Community 18 - "accordion.js"
Cohesion: 0.36
Nodes (7): Checkbox-Hack Accordions Replaced by aria-expanded Buttons, Remaining: Checkbox-Hack Accordion A11y Follow-Up, initAccordions(), isExpanded(), panelOf(), setExpanded(), toggleAccordion()

## Ambiguous Edges - Review These
- `Remaining: Checkbox-Hack Accordion A11y Follow-Up` → `Checkbox-Hack Accordions Replaced by aria-expanded Buttons`  [AMBIGUOUS]
  MODERNIZATION.md · relation: conceptually_related_to

## Knowledge Gaps
- **67 isolated node(s):** `singleQuote`, `semi`, `printWidth`, `tabWidth`, `endOfLine` (+62 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Remaining: Checkbox-Hack Accordion A11y Follow-Up` and `Checkbox-Hack Accordions Replaced by aria-expanded Buttons`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `scripts` connect `scripts` to `devDependencies`?**
  _High betweenness centrality (0.137) - this node is a cross-community bridge._
- **Why does `CDN Script Tags (Mapbox, Draw, Geocoder, TomSelect, JSZip)` connect `tokml.js` to `papaparse.min.js`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `CI Pipeline (lint + test on every branch)` connect `scripts` to `tokml.js`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `createTable()` (e.g. with `Legacy Sidebar UI (flat button row, 'Elementi:' list)` and `Sidebar Accordion Tabs (Cells / POI / Overlays / Display)`) actually correct?**
  _`createTable()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `feature()` (e.g. with `registerMapEvents()` and `loadFeatures()`) actually correct?**
  _`feature()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `singleQuote`, `semi`, `printWidth` to the rest of the system?**
  _67 weakly-connected nodes found - possible documentation gaps or missing edges._