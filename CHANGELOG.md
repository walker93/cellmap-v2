# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) and to [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

## Unreleased changes

### Feature
- :lipstick: Rework the sidebar: fill the height that is there, make the cell list scannable [`172117f`](https://github.com/walker93/cellmap-v2/commit/172117f)
- make ring opacity a map setting, and draw the cone in 32 steps [`2654897`](https://github.com/walker93/cellmap-v2/commit/2654897)
- draw distance rings across a cell's coverage at round distances [`e218188`](https://github.com/walker93/cellmap-v2/commit/e218188)
- record a cell's network identity (Cell ID / LAC / MCC-MNC / type) [`130a532`](https://github.com/walker93/cellmap-v2/commit/130a532)

### Bug Fixes
- one label per distance ring, and a quieter line [`cee0a47`](https://github.com/walker93/cellmap-v2/commit/cee0a47)
- draw the uncertainty cone as nested sectors so the bands stop seaming [`5d5f047`](https://github.com/walker93/cellmap-v2/commit/5d5f047)
- stop the KML export outlining every sector, and crashing on unset fields [`581c222`](https://github.com/walker93/cellmap-v2/commit/581c222)

### Documentation
- :robot: changelog file generated [`c8726e2`](https://github.com/walker93/cellmap-v2/commit/c8726e2)

### Other
- Merge branch 'main' of https://github.com/walker93/cellmap-v2 [`ddc25c6`](https://github.com/walker93/cellmap-v2/commit/ddc25c6)
- Merge branch 'feat/ring-opacity-control' [`4c8494b`](https://github.com/walker93/cellmap-v2/commit/4c8494b)
- Merge branch 'fix/distance-ring-legibility' [`c5dd796`](https://github.com/walker93/cellmap-v2/commit/c5dd796)
- Merge branch 'feat/distance-rings' [`02366dc`](https://github.com/walker93/cellmap-v2/commit/02366dc)
- Merge branch 'fix/cone-rendering' [`7b63de0`](https://github.com/walker93/cellmap-v2/commit/7b63de0)
- Merge branch 'feat/cell-identity-metadata' [`643ec90`](https://github.com/walker93/cellmap-v2/commit/643ec90)

## 1.2 (2026-08-08)

### Feature
- draw a cell's coverage as a graduated uncertainty cone [`3f9b9b2`](https://github.com/walker93/cellmap-v2/commit/3f9b9b2)
- replace the sidebar button row with a "Progetto" menu and per-section actions [`177919d`](https://github.com/walker93/cellmap-v2/commit/177919d)
- save and open the whole map as a .cellmap project file [`2c9016c`](https://github.com/walker93/cellmap-v2/commit/2c9016c)
- open the edit form right after a POI is drawn on the map [`9733105`](https://github.com/walker93/cellmap-v2/commit/9733105)
- replace the checkbox-hack accordions with aria-expanded disclosure buttons [`3fe0421`](https://github.com/walker93/cellmap-v2/commit/3fe0421)

### Bug Fixes
- :lipstick: Improved form css and style [`9b09fe3`](https://github.com/walker93/cellmap-v2/commit/9b09fe3)

### Performance Improvements
- resolve the app's static elements once through a memoized el() helper [`af619ff`](https://github.com/walker93/cellmap-v2/commit/af619ff)

### Documentation
- :robot: changelog file generated [`fa2fcba`](https://github.com/walker93/cellmap-v2/commit/fa2fcba)
- :robot: changelog file generated [`dc97cec`](https://github.com/walker93/cellmap-v2/commit/dc97cec)
- :robot: changelog file generated [`a187acd`](https://github.com/walker93/cellmap-v2/commit/a187acd)
- :robot: changelog file generated [`f74ec5f`](https://github.com/walker93/cellmap-v2/commit/f74ec5f)
- :robot: changelog file generated [`9c54197`](https://github.com/walker93/cellmap-v2/commit/9c54197)
- :robot: changelog file generated [`003d03c`](https://github.com/walker93/cellmap-v2/commit/003d03c)
- :robot: changelog file generated [`4403d51`](https://github.com/walker93/cellmap-v2/commit/4403d51)
- :robot: changelog file generated [`62a5205`](https://github.com/walker93/cellmap-v2/commit/62a5205)

### Chore
- put the whole UI in English [`c57a013`](https://github.com/walker93/cellmap-v2/commit/c57a013)

### Other
- Merge origin/main (changelog bot commit) [`288a030`](https://github.com/walker93/cellmap-v2/commit/288a030)
- Merge branch 'feat/graduated-uncertainty-cone' [`485a192`](https://github.com/walker93/cellmap-v2/commit/485a192)
- Merge origin/main (changelog bot commit) [`d832d36`](https://github.com/walker93/cellmap-v2/commit/d832d36)
- Merge branch 'chore/english-ui-strings' [`d0f9b78`](https://github.com/walker93/cellmap-v2/commit/d0f9b78)
- Merge origin/main (changelog bot commit) [`abe7f8e`](https://github.com/walker93/cellmap-v2/commit/abe7f8e)
- Merge branch 'feat/project-menu-ui' [`74d4a6d`](https://github.com/walker93/cellmap-v2/commit/74d4a6d)
- Merge origin/main (changelog bot commit) [`9985fc2`](https://github.com/walker93/cellmap-v2/commit/9985fc2)
- Merge branch 'feat/cellmap-project-format' [`12802d3`](https://github.com/walker93/cellmap-v2/commit/12802d3)
- Merge origin/main (changelog bot commit) [`4f07c5b`](https://github.com/walker93/cellmap-v2/commit/4f07c5b)
- Merge branch 'feat/poi-form-on-create' [`b468e76`](https://github.com/walker93/cellmap-v2/commit/b468e76)
- Merge branch 'feat/cache-element-lookups' [`3a76d61`](https://github.com/walker93/cellmap-v2/commit/3a76d61)
- Merge branch 'feat/accordion-disclosure-buttons' [`5c8758d`](https://github.com/walker93/cellmap-v2/commit/5c8758d)

## 1.1 (2026-08-01)

### Feature
- :chart_with_upwards_trend: Aggiunto Google Analytics [`4b1f8c9`](https://github.com/walker93/cellmap-v2/commit/4b1f8c9)
- :lipstick: Add header row in tower table and migration from flex to grid for rows [`9716c36`](https://github.com/walker93/cellmap-v2/commit/9716c36)
- wire aggiungiCella through towerState.addTower; add a full Tab focus-trap to the add/edit dialog [`a449d88`](https://github.com/walker93/cellmap-v2/commit/a449d88)
- accessibility pass (Phase 7) [`4cc72f7`](https://github.com/walker93/cellmap-v2/commit/4cc72f7)
- responsive layout with CSS Grid (Phase 6) [`121748e`](https://github.com/walker93/cellmap-v2/commit/121748e)
- use the File System Access API save dialog for exports [`da7c2f4`](https://github.com/walker93/cellmap-v2/commit/da7c2f4)
- :sparkles: Adds marker popup and hover effects [`8ca07d6`](https://github.com/walker93/cellmap-v2/commit/8ca07d6)
- :sparkles: Added TomSelect library for icon selection [`3656315`](https://github.com/walker93/cellmap-v2/commit/3656315)
- :sparkles: Added PoI Icon support [`7fd6ed9`](https://github.com/walker93/cellmap-v2/commit/7fd6ed9)
- :sparkles: Improve hidden marker toggling [`4468956`](https://github.com/walker93/cellmap-v2/commit/4468956)
- :construction: Adding show/hide behaviour to cell towers [`97129c4`](https://github.com/walker93/cellmap-v2/commit/97129c4)
- :sparkles: Added section of manage of overlays [`756008f`](https://github.com/walker93/cellmap-v2/commit/756008f)
- :lipstick: Added functionality to resize the sidebar [`3da33f8`](https://github.com/walker93/cellmap-v2/commit/3da33f8)
- :sparkles: Added function to import KMZ overlays [`1773dd7`](https://github.com/walker93/cellmap-v2/commit/1773dd7)
- :sparkles: Added CSV import of cell towers [`89d893e`](https://github.com/walker93/cellmap-v2/commit/89d893e)

### Bug Fixes
- set Vite base to /cellmapdesigner/ for the reverse-proxy deployment [`59f4873`](https://github.com/walker93/cellmap-v2/commit/59f4873)
- move cell-tower.png into public/ so the tower icon survives the build [`89ef70b`](https://github.com/walker93/cellmap-v2/commit/89ef70b)
- make the production build actually deployable; add Cloudflare Workers config [`cee82cc`](https://github.com/walker93/cellmap-v2/commit/cee82cc)
- prevent duplicate map.addImage when features share an icon [`15f04fa`](https://github.com/walker93/cellmap-v2/commit/15f04fa)
- null-safe paint/layout expressions for freshly-drawn features [`5fdd28a`](https://github.com/walker93/cellmap-v2/commit/5fdd28a)
- render icon picker dropdown into <body> to stop double scrollbar [`c42893b`](https://github.com/walker93/cellmap-v2/commit/c42893b)
- :lipstick: Fix for tableelement overflow [`7738752`](https://github.com/walker93/cellmap-v2/commit/7738752)
- register icon images on demand via styleimagemissing; fix broken thumbnails for categories with "&" [`cf13ade`](https://github.com/walker93/cellmap-v2/commit/cf13ade)
- allow radius 0 and negative angles; document final session status [`4e0f25b`](https://github.com/walker93/cellmap-v2/commit/4e0f25b)
- :bug: Removed fetch from directories and added image loading from JSON [`62f7539`](https://github.com/walker93/cellmap-v2/commit/62f7539)
- :pencil2: changed fetch from root to relative subfolder [`5bf2d11`](https://github.com/walker93/cellmap-v2/commit/5bf2d11)
- :bug: Fixed show/hide feature on cells, added same functionality to overlays [`8d70c84`](https://github.com/walker93/cellmap-v2/commit/8d70c84)
- :bug: Fix table not populated after overlay adding [`57bc4d8`](https://github.com/walker93/cellmap-v2/commit/57bc4d8)
- :bug: DeleteAll button now deletes overlays, added ability to import multiple overlays [`14b7309`](https://github.com/walker93/cellmap-v2/commit/14b7309)

### Performance Improvements
- :zap: Introduced lazyload on PoI icons for reduced network calls [`8522670`](https://github.com/walker93/cellmap-v2/commit/8522670)

### Documentation
- update roadmap for Phase 4/5, the dialog focus-trap, mapEvents extraction, and the bootstrap.js rename [`3e16ec9`](https://github.com/walker93/cellmap-v2/commit/3e16ec9)
- :robot: changelog file generated [`ee74fb6`](https://github.com/walker93/cellmap-v2/commit/ee74fb6)
- :robot: changelog file generated [`da3505f`](https://github.com/walker93/cellmap-v2/commit/da3505f)
- :robot: changelog file generated [`ab276b1`](https://github.com/walker93/cellmap-v2/commit/ab276b1)
- :robot: changelog file generated [`24d3dd5`](https://github.com/walker93/cellmap-v2/commit/24d3dd5)
- :robot: changelog file generated [`acbe814`](https://github.com/walker93/cellmap-v2/commit/acbe814)

### Chore
- declare MapboxExportControl as a known CDN global for eslint [`098ae6d`](https://github.com/walker93/cellmap-v2/commit/098ae6d)
- upgrade mapbox-gl-js, draw, geocoder, and export plugin [`3a65741`](https://github.com/walker93/cellmap-v2/commit/3a65741)
- scaffold modern tooling and test safety net (Phase 0/2) [`aa33b7e`](https://github.com/walker93/cellmap-v2/commit/aa33b7e)

### Style
- :lipstick: Added full set of icons [`b603d5e`](https://github.com/walker93/cellmap-v2/commit/b603d5e)
- :art: Format webmanifest [`6144fca`](https://github.com/walker93/cellmap-v2/commit/6144fca)
- :lipstick: Responsive layout [`9a8be06`](https://github.com/walker93/cellmap-v2/commit/9a8be06)
- :lipstick: Added logo in the header [`660c942`](https://github.com/walker93/cellmap-v2/commit/660c942)

### Refactor
- extract src/mapEvents.js from the bootstrap file; rename new_script.js -> bootstrap.js [`6eadb41`](https://github.com/walker93/cellmap-v2/commit/6eadb41)
- lift tower/POI create-duplicate-hide-delete sync into src/towerState.js (Phase 4); dedupe row builders (Phase 5) [`d7ed4d0`](https://github.com/walker93/cellmap-v2/commit/d7ed4d0)
- extract the io import orchestrators — Phase 3 complete [`ad3e55f`](https://github.com/walker93/cellmap-v2/commit/ad3e55f)
- extract the icon picker into src/ui/iconPicker.js + verify it [`2538634`](https://github.com/walker93/cellmap-v2/commit/2538634)
- extract the add/edit form into src/ui/form.js (Phase 3) [`c97d490`](https://github.com/walker93/cellmap-v2/commit/c97d490)
- extract the render layer into src/ui/table.js + src/mapSource.js [`9bac8a7`](https://github.com/walker93/cellmap-v2/commit/9bac8a7)
- extract the io export/download seam into src/io/ (Phase 3) [`3f0a1bb`](https://github.com/walker93/cellmap-v2/commit/3f0a1bb)
- extract the MapboxDraw feature store into src/draw.js (Phase 4) [`53b56f9`](https://github.com/walker93/cellmap-v2/commit/53b56f9)
- quick wins — remove dead code and strengthen input validation [`6f0bea3`](https://github.com/walker93/cellmap-v2/commit/6f0bea3)
- extract KMZ-overlay state into src/overlays.js (Phase 4) [`f445e4e`](https://github.com/walker93/cellmap-v2/commit/f445e4e)
- extract hidden-POI state into src/hiddenPois.js (Phase 4) [`aef92be`](https://github.com/walker93/cellmap-v2/commit/aef92be)
- extract the coverage-sector state into src/sectors.js (Phase 4) [`3f9abbc`](https://github.com/walker93/cellmap-v2/commit/3f9abbc)
- convert the app to ES modules — first slice (Phase 3) [`ca81bb6`](https://github.com/walker93/cellmap-v2/commit/ca81bb6)
- replace inline onclick handlers with addEventListener (Phase 1) [`1efae68`](https://github.com/walker93/cellmap-v2/commit/1efae68)
- cover the GeoJSON import path in the shared tower-feature module [`07e0334`](https://github.com/walker93/cellmap-v2/commit/07e0334)
- :rocket: fixed module attribute [`d8a32fc`](https://github.com/walker93/cellmap-v2/commit/d8a32fc)
- :rocket: using modules [`54f893a`](https://github.com/walker93/cellmap-v2/commit/54f893a)
- :hammer: Added CSV parser, and moved libraries to separate folder [`333bc34`](https://github.com/walker93/cellmap-v2/commit/333bc34)

### Other
- Merge branch 'claude/webapp-legacy-modernization-plan-chxyij' [`f8a4b46`](https://github.com/walker93/cellmap-v2/commit/f8a4b46)
- Merge branch 'main' of https://github.com/walker93/CellMap [`93d4a4d`](https://github.com/walker93/cellmap-v2/commit/93d4a4d)
- Merge branch 'main' of https://github.com/walker93/CellMap into main [`81e6b7e`](https://github.com/walker93/cellmap-v2/commit/81e6b7e)
- revert: :ambulance: revert from using modules [`0352b9d`](https://github.com/walker93/cellmap-v2/commit/0352b9d)
- Merge branch 'main' of https://github.com/walker93/CellMap into main [`8393522`](https://github.com/walker93/cellmap-v2/commit/8393522)
- Create changelog.yml [`16814f1`](https://github.com/walker93/cellmap-v2/commit/16814f1)
- commit for push [`e8575be`](https://github.com/walker93/cellmap-v2/commit/e8575be)
- Added Logo and Favicon [`9b46d08`](https://github.com/walker93/cellmap-v2/commit/9b46d08)
- Added edit PoI feature [`d424a3a`](https://github.com/walker93/cellmap-v2/commit/d424a3a)
- fixed poi table area calculation [`b3f4ff5`](https://github.com/walker93/cellmap-v2/commit/b3f4ff5)
- Polygon Area Calculation [`645e007`](https://github.com/walker93/cellmap-v2/commit/645e007)
- POI Table Improvments [`a95d7d6`](https://github.com/walker93/cellmap-v2/commit/a95d7d6)
- Inizio sviluppo tabella poi [`e56511c`](https://github.com/walker93/cellmap-v2/commit/e56511c)
- Fixed import added KML download [`dcfb906`](https://github.com/walker93/cellmap-v2/commit/dcfb906)
- fixed form buttons [`9699dde`](https://github.com/walker93/cellmap-v2/commit/9699dde)
- Updated Readme [`297956e`](https://github.com/walker93/cellmap-v2/commit/297956e)
- test commit [`c43ce35`](https://github.com/walker93/cellmap-v2/commit/c43ce35)
- Initial Commit [`5df9ecb`](https://github.com/walker93/cellmap-v2/commit/5df9ecb)

