import { readFile, writeFile } from 'node:fs/promises';

const dataPath = new URL('../site/data/companies.json', import.meta.url);
const outputPath = new URL('../site/data/enrichment.json', import.meta.url);

const decode = value => value
  .replace(/&amp;/g, '&').replace(/&#x27;|&apos;/g, "'").replace(/&quot;/g, '"')
  .replace(/&nbsp;/g, ' ').replace(/&eacute;/g, 'é').replace(/&rsquo;/g, '’')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));

const plainText = html => decode(html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

const normalize = value => plainText(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// STATION F has used at least four different markup layouts across years:
//  - <p><strong>Name:</strong> desc</p>                               (2019-2022)
//  - <p><a href="..."><strong>Name</strong></a>: desc</p>             (2024-2025)
//  - <p><a href="..."><strong>Name</strong></a></p><p><em>desc</em></p>  (2023: name and
//    description are split across two consecutive paragraphs)
//  - <li><a href="...">Name</a>: desc</li>                           (2026: list items, not <p>)
// extractProfile tries the same-block pattern first and falls back to the
// name-only-block-followed-by-description-block pattern.
const blocks = html => [...html.matchAll(/<(p|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)].map(match => match[2]);

const linkFor = (block, normalizedName) => [...block.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
  .find(match => normalize(match[2]) === normalizedName)?.[1] || null;

function extractProfile(name, sections) {
  const normalizedName = normalize(name);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const text = plainText(section);
    const normalizedText = normalize(text);

    if (normalizedText === normalizedName) {
      // Name-only block (2023 layout): the description lives in the next block.
      const next = sections[i + 1];
      if (!next) continue;
      const description = plainText(next).trim();
      if (description.length > 2) {
        const link = linkFor(section, normalizedName) || linkFor(next, normalizedName);
        return { descriptionAtSelection: description, websiteAtSelection: link };
      }
      continue;
    }

    if (normalizedText.startsWith(`${normalizedName} `)) {
      const start = text.toLowerCase().indexOf(name.toLowerCase());
      const description = (start >= 0 ? text.slice(start + name.length) : text)
        .replace(/^\s*[:\-–—]\s*/, '').trim();
      if (description.length > 2) {
        const link = linkFor(section, normalizedName);
        return { descriptionAtSelection: description, websiteAtSelection: link };
      }
    }
  }
  return null;
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const profiles = {};
const verifiedAt = new Date().toISOString();

for (const cohort of data.cohorts) {
  const response = await fetch(cohort.sourceUrl, { headers: { 'User-Agent': 'Future40Research/1.0' } });
  if (!response.ok) throw new Error(`Could not load ${cohort.sourceUrl}: ${response.status}`);
  const sections = blocks(await response.text());
  const source = { url: cohort.sourceUrl, label: `Official STATION F Future 40 ${cohort.year} roster`, verifiedAt };
  const entries = Object.fromEntries(cohort.names.map(name => {
    const profile = extractProfile(name, sections);
    return profile ? [name, { ...profile, source }] : [name, null];
  }).filter(([, profile]) => profile));
  profiles[cohort.year] = entries;
  console.log(`${cohort.year}: ${Object.keys(entries).length}/${cohort.names.length} profiles extracted`);
}

await writeFile(outputPath, `${JSON.stringify({ generatedAt: verifiedAt, profiles }, null, 2)}\n`);
