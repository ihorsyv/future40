const unknown = "Unverified";
const elements = {
  search: document.querySelector("#search"), year: document.querySelector("#year"),
  sector: document.querySelector("#sector"), status: document.querySelector("#status"), sort: document.querySelector("#sort"),
  cards: document.querySelector("#cards"), count: document.querySelector("#result-count"),
  total: document.querySelector("#company-count"), summary: document.querySelector("#summary-grid")
};

const text = value => value?.trim() || unknown;
const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"})[char]);
const links = company => [
  company.website && `<a href="${escape(company.website)}" target="_blank" rel="noreferrer">Company site ↗</a>`,
  ...(company.sources || []).map(source => `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.label || "Source")} ↗</a>`)
].filter(Boolean).join("");
const options = (select, values) => values.forEach(value => select.insertAdjacentHTML("beforeend", `<option value="${escape(value)}">${escape(value)}</option>`));
const classify = description => {
  const value = description.toLowerCase();
  if (!description) return "Unclassified";
  if (/climate|carbon|energy|emission|recycl|sustainable|material/.test(value)) return "Climate & industrial";
  if (/health|medical|drug|patient|biotech|therapy|dental/.test(value)) return "Health & biotech";
  if (/bank|payment|finance|cash|credit|insurance|wallet/.test(value)) return "Fintech";
  if (/legal|contract|gdpr|compliance/.test(value)) return "Legal & compliance";
  if (/security|cyber|secure|identity/.test(value)) return "Cybersecurity";
  if (/recruit|talent|hiring|employee|hr /.test(value)) return "HR tech";
  if (/robot|mobility|vehicle|fleet|drone/.test(value)) return "Robotics & mobility";
  if (/ai|machine learning|llm|data|automation|software|platform/.test(value)) return "AI, data & software";
  return "Technology";
};

function render(companies) {
  const search = elements.search.value.toLowerCase();
  const filtered = companies.filter(company => {
    const corpus = [company.name, company.description, company.founders, company.sector, company.country].filter(Boolean).join(" ").toLowerCase();
    return (!search || corpus.includes(search)) && (!elements.year.value || String(company.year) === elements.year.value) && (!elements.sector.value || company.sector === elements.sector.value) && (!elements.status.value || company.status === elements.status.value);
  }).sort((left, right) => {
    if (elements.sort.value === "name") return left.name.localeCompare(right.name);
    if (elements.sort.value === "evidence") return Number(right.hasProfile) - Number(left.hasProfile) || right.year - left.year;
    return elements.sort.value === "year-asc" ? left.year - right.year : right.year - left.year;
  });
  elements.count.textContent = `${filtered.length} ${filtered.length === 1 ? "company" : "companies"}`;
  elements.cards.innerHTML = filtered.length ? filtered.map(company => `<article class="card"><div class="card-top"><span class="year">Future 40 · ${company.year}</span><span class="badge">${escape(company.status)}</span></div><h3>${escape(company.name)}</h3><p>${escape(company.description || "Membership is confirmed by STATION F; a public product profile was not extracted from the annual roster.")}</p><div class="facts"><div><b>Editorial sector:</b> ${escape(company.sector)}</div>${company.founders ? `<div><b>Founders:</b> ${escape(company.founders)}</div>` : ""}${company.country ? `<div><b>Geography:</b> ${escape(company.country)}</div>` : ""}${company.funding ? `<div><b>Funding:</b> ${escape(company.funding)}</div>` : ""}</div><div class="links">${links(company)}</div></article>`).join("") : `<p class="empty">No companies match these filters.</p>`;
}

function summarize(companies, cohorts) {
  elements.summary.innerHTML = cohorts.map(cohort => {
    const set = companies.filter(company => company.year === cohort.year);
    return `<div class="cohort"><b>${cohort.year}</b><small>${set.length} companies · <a href="${escape(cohort.sourceUrl)}" target="_blank" rel="noreferrer">official roster ↗</a></small></div>`;
  }).join("");
}

async function start() {
  const [response, enrichmentResponse] = await Promise.all([fetch("data/companies.json"), fetch("data/enrichment.json")]);
  const [data, enrichment] = await Promise.all([response.json(), enrichmentResponse.json()]);
  const companies = data.cohorts.flatMap(cohort => cohort.names.map(name => ({
    ...(() => {
      const profile = enrichment.profiles?.[cohort.year]?.[name];
      const description = profile?.descriptionAtSelection || "";
      const sector = classify(description);
      return { name, year: cohort.year, sector, description, founders: "", funding: "", country: "", hasProfile: Boolean(profile), status: profile ? "Product profile from STATION F" : "Roster membership confirmed", website: profile?.websiteAtSelection, sources: [{label: `Official STATION F Future 40 ${cohort.year} roster (${cohort.publishedAt})`, url: cohort.sourceUrl}] };
    })()
  })));
  const years = [...new Set(companies.map(company => company.year))].sort();
  options(elements.year, years);
  options(elements.sector, [...new Set(companies.map(company => company.sector).filter(Boolean))].sort());
  options(elements.status, [...new Set(companies.map(company => company.status).filter(Boolean))].sort());
  elements.total.textContent = `${companies.length} documented companies`;
  summarize(companies, data.cohorts);
  Object.values(elements).slice(0, 5).forEach(element => element.addEventListener("input", () => render(companies)));
  render(companies);
}
start().catch(() => { elements.cards.innerHTML = `<p class="empty">The catalogue data could not be loaded. Please try again later.</p>`; });
