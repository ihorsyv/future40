# Future 40 catalogue

An independent, source-led static catalogue of the 320 startups selected for STATION F's Future 40, 2019 through 2026. Live at https://future40.netlify.app.

## What is verified

- Every one of the 320 names is tied to the one official annual STATION F roster page that named it (`site/data/companies.json`).
- `scripts/enrich-from-stationf.mjs` re-fetches those same eight pages and extracts the product description and company website STATION F published at the time of selection, for every company it can find — currently 320/320 descriptions and 227/320 confirmed websites (`site/data/enrichment.json`). Every extracted field carries a link back to its source page and a verification date.
- Founders, funding, investors, geography and current-status facts are only shown when a specific, named primary source confirms that exact field for that exact company (`site/data/facts.json`).
- Current status (Active / Acquired / Closed) is never inferred from a working site, an old STATION F mention, or the absence of news — only from the company's own site/press release, the acquirer's official announcement, an official closure registry/statement, or an investor/STATION F press release that directly confirms it. A company without such a source shows a neutral "Status not verified" pill instead of a guess. Every status pill records its source and the date it was last checked (`verifiedAt`) — it reflects that check date, not a permanent fact, and may need re-verifying later.
- The site's sector grouping is an editorial classification computed from the product description, labelled as such, never attributed to STATION F.
- Missing fields are simply left off a company's card. The interface does not use an "Unverified" placeholder for them.

## What is not claimed

The annual roster pages establish cohort membership and, for most companies, a point-in-time product description. They do not establish current operating status, a complete founder list, investor list, funding history, or geography for any company, and the catalogue does not infer or guess these.

## Repository layout

- `site/` — the static site (`index.html`, `assets/app.js`, `assets/style.css`) and its data (`site/data/`, documented in `site/data/README.md`).
- `scripts/enrich-from-stationf.mjs` — re-extracts product descriptions and websites from the eight official STATION F roster pages.
- `netlify.toml` — publishes `site/` as-is.

## Update and deploy

The Netlify project is linked to this repository's `main` branch with auto-publishing on, so a push is the deploy:

```bash
# Re-pull descriptions/websites from the live STATION F pages (safe to re-run any time)
node scripts/enrich-from-stationf.mjs

# Commit and push — Netlify builds and publishes main automatically
git add -A && git commit -m "…" && git push
```

A manual deploy (`netlify deploy --dir site --prod`) still works if ever needed, but isn't the normal path anymore.

## What's next

The 2023 and 2026 roster pages use a slightly different markup than the other six years (name and description split across two consecutive HTML blocks, or inside `<li>` instead of `<p>`); the enrichment script now handles all four layouts it has encountered so far, but a future STATION F redesign could silently drop coverage again — `node scripts/enrich-from-stationf.mjs` prints an N/40 count per year, so a drop is easy to notice.

The real open task is `site/data/facts.json`: carefully adding founders, funding, investors, geography and status for individual companies, one primary source at a time, following the rules in `site/data/README.md`. This is deliberately slow and manual — it is the only way to keep the "no unverified claims" guarantee that is the point of this catalogue. Status research started with the 2025 and 2026 cohorts; most companies in those cohorts have no `status` entry yet, simply because no qualifying primary source could be found — that absence is the intended, honest default, not a gap to be filled by guessing.
