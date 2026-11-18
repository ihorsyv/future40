# Future 40 catalogue data

`companies.json` is the public data source used by the catalogue. It contains the eight official rosters in a compact cohort structure, which the site expands into 320 company cards.

## Verification policy

- Every roster entry has one official STATION F source establishing Future 40 cohort membership.
- Product, founder, funding, investor, country and current-status fields are shown only when supported by a linked source.
- Empty fields render as **Unverified** in the website. They never imply a negative claim.
- `status` reflects evidence available on 18 November 2026; it is not an official STATION F classification unless the cited source says so.

## Schema

```json
{
  "name": "Company name",
  "year": 2026,
  "sector": "Climate",
  "description": "Verified short description",
  "website": "https://example.com",
  "founders": "Verified founders",
  "funding": "Verified funding and/or investors",
  "country": "Verified HQ country",
  "status": "Active | Acquired | Closed | Unverified",
  "sources": [{"label": "Future 40 2026", "url": "https://…"}]
}
```
