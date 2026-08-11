# Manual smoke-test fixtures

Sample inputs for the import flows that `MODERNIZATION.md` asks you to smoke-test by
hand ("import/export each file format"). Nothing in `src/` or the Vitest suite reads
these — they exist so the import paths can be driven through a real browser against a
real Mapbox token.

| File                | Flow                        | Notes                                                                                                                                                                                                                                                   |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `es_csv.csv`        | Project ▸ Import CSV        | One tower row carrying every column the importer reads: `lat,lon,name,desc,fill,marker,angle1,angle2,radius,opacity`. Useful for checking that an imported tower can be hidden/shown — the `properties.id` sync that used to be missing from this path. |
| `RM024U_0027R3.png` | Project ▸ Add overlay (KMZ) | Raster added alongside the KMZ overlay import. Wrap it in a KMZ with a `LatLonBox` to exercise `parseLatLonBox` / `importKMZ`.                                                                                                                          |

These are deliberately kept out of `public/`: they must not ship in the production
bundle.
