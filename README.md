# lantern-hunt-site

Public website for Lantern Hunt: mission, how the app works, impact methodology, partnerships, support, and the privacy policy.

## Editing

Page content lives in `src/`. Shared header, footer, and metadata live in `tools/build.py`.

```
python3 tools/build.py
```

This regenerates the HTML pages in the repo root, plus `sitemap.xml` and `robots.txt`. Commit both `src/` and the generated pages; GitHub Pages serves the root.

- Headline statistics: `data/stats.json`. Edit the figures and `as_of` date there, then rebuild. They appear on the Home and Impact pages. They are entered by hand; nothing updates them automatically.
- Partnership email: `PARTNERS_EMAIL` in `tools/build.py` (see LAUNCH.md before changing)
- Styles: `assets/css/site.css`
- Images: `assets/img/` (credits are on `credits.html`)
- Fonts: Archivo and IBM Plex Mono, self-hosted, SIL Open Font License (`assets/fonts/`)

The Support and Privacy pages carry the September 24, 2026 text unchanged. Edit their wording only deliberately.

## Updating statistics and the map from a Supabase export

The claims export contains private data. Keep it outside this repository (CSV files are git-ignored).

```
cd tools/map && npm install && cd ../..
python3 tools/map/aggregate.py /path/to/claims_rows.csv   # writes data/stats.json and data/map-activity.json (aggregates only)
node tools/map/render.mjs                                  # writes the map partials in src/partials/
python3 tools/build.py
```

Counting rules and privacy thresholds are documented at the top of `tools/map/aggregate.py`.

See `LAUNCH.md` for the custom-domain steps.
