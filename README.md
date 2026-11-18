# Future 40 catalogue

An independent, source-led static catalogue of the startups selected for STATION F Future 40 from 2019 through 2026.

## What is verified

- Every one of the 320 names is tied to its official annual STATION F roster.
- `scripts/enrich-from-stationf.mjs` extracts the selection-time product description and roster-linked website from those official pages.
- The interface labels its sector grouping as an editorial classification derived from that description.

## What is not claimed

The annual roster pages do not establish a current operating status, complete founder list, investor list, funding history or geography for every company. The catalogue does not infer them.

## Update and deploy

```bash
node scripts/enrich-from-stationf.mjs
netlify deploy --dir site --prod
```

The public site is deployed at https://future40.netlify.app.
