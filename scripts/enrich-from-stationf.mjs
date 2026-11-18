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

const paragraphs = html => [...html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gi)].map(match => match[1]);

function extractProfile(name, sections) {
  const normalizedName = normalize(name);
  const section = sections.find(candidate => {
    const text = normalize(candidate);
    return text.startsWith(normalizedName) || text.includes(` ${normalizedName} `);
  });
  if (!section) return null;

  const text = plainText(section);
  const start = text.toLowerCase().indexOf(name.toLowerCase());
  const description = (start >= 0 ? text.slice(start + name.length) : text)
    .replace(/^\s*[:\-–—]\s*/, '').trim();
  const link = [...section.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .find(match => normalize(match[2]) === normalizedName)?.[1];
  return description.length > 18 ? { descriptionAtSelection: description, websiteAtSelection: link || null } : null;
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const profiles = {};

for (const cohort of data.cohorts) {
  const response = await fetch(cohort.sourceUrl, { headers: { 'User-Agent': 'Future40Research/1.0' } });
  if (!response.ok) throw new Error(`Could not load ${cohort.sourceUrl}: ${response.status}`);
  const sections = paragraphs(await response.text());
  const entries = Object.fromEntries(cohort.names.map(name => [name, extractProfile(name, sections)]).filter(([, profile]) => profile));
  profiles[cohort.year] = entries;
  console.log(`${cohort.year}: ${Object.keys(entries).length}/${cohort.names.length} profiles extracted`);
}

await writeFile(outputPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), profiles }, null, 2)}\n`);
