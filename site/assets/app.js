const elements = {
  search: document.querySelector("#search"),
  year: document.querySelector("#year"),
  category: document.querySelector("#category"),
  coverage: document.querySelector("#coverage"),
  factsFilter: document.querySelector("#facts-filter"),
  statusFilter: document.querySelector("#status-filter"),
  sort: document.querySelector("#sort"),
  cards: document.querySelector("#cards"),
  count: document.querySelector("#result-count"),
  total: document.querySelector("#company-count"),
  snapshot: document.querySelector("#snapshot-date"),
  analytics: document.querySelector("#analytics-grid"),
  modal: document.querySelector("#profile-modal"),
  modalBody: document.querySelector("#modal-body"),
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
const formatDate = iso => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : date.toISOString().slice(0, 10);
};

const FACT_LABELS = { founders: "Founders", funding: "Funding", investors: "Investors", geography: "Geography", status: "Current status" };
const STATUS_VALUES = ["Active", "Acquired", "Closed"];

function statusCategory(statusFact) {
  if (!statusFact) return null;
  const head = String(statusFact.value).split(":")[0].trim();
  return STATUS_VALUES.includes(head) ? head : null;
}

function classify(description) {
  if (!description) return null;
  const value = description.toLowerCase();
  if (/climate|carbon|energy|emission|recycl|sustainable|material/.test(value)) return "Climate & industrial";
  if (/health|medical|drug|patient|biotech|therapy|dental|diagnos/.test(value)) return "Health & biotech";
  if (/bank|payment|finance|cash|credit|insurance|wallet|bitcoin|crypto/.test(value)) return "Fintech";
  if (/legal|contract|gdpr|compliance|due diligence/.test(value)) return "Legal & compliance";
  if (/security|cyber|secure|identity|fraud/.test(value)) return "Cybersecurity";
  if (/recruit|talent|hiring|employee|hr\b/.test(value)) return "HR tech";
  if (/robot|mobility|vehicle|fleet|drone|subsea/.test(value)) return "Robotics & mobility";
  if (/\bai\b|machine learning|llm|generative|agent|data platform|automation|software|saas|platform/.test(value)) return "AI, data & software";
  return "Other technology";
}

function sourceLink(source, label) {
  if (!source?.url) return "";
  return `<a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(label || source.label || "Source")} ↗</a>`;
}

function buildCompanies(data, enrichment, factsData) {
  const facts = factsData?.facts || {};
  return data.cohorts.flatMap(cohort => cohort.names.map(name => {
    const profile = enrichment.profiles?.[cohort.year]?.[name] || null;
    const description = profile?.descriptionAtSelection || "";
    const website = profile?.websiteAtSelection || null;
    const profileSource = profile?.source || null;
    const rosterSource = { url: cohort.sourceUrl, label: `Official STATION F Future 40 ${cohort.year} roster` };
    const companyFacts = (facts[`${cohort.year}|${name}`] || []).filter(fact => FACT_LABELS[fact.field]);

    let coverage = "roster-only";
    if (description && website) coverage = "profile-website";
    else if (description) coverage = "profile-only";

    const completeness = (description ? 1 : 0) + (website ? 1 : 0) + companyFacts.length;
    const statusFact = companyFacts.find(fact => fact.field === "status") || null;
    const status = statusCategory(statusFact);

    return {
      name, year: cohort.year, cohortPublishedAt: cohort.publishedAt, rosterSource,
      description, website, profileSource, coverage, category: classify(description),
      facts: companyFacts, completeness, hasFacts: companyFacts.length > 0,
      statusFact, status,
    };
  }));
}

function cardTemplate(company) {
  const coverageLabel = { "profile-website": "Description + website", "profile-only": "Description only", "roster-only": "Roster listing only" }[company.coverage];
  const statusLabel = company.status || "Status not verified";
  const statusClass = company.status ? `status-${company.status.toLowerCase()}` : "status-unverified";
  return `<article class="card" data-name="${escape(company.name)}" data-year="${company.year}" tabindex="0" role="button" aria-haspopup="dialog">
    <div class="card-top"><span class="year">Future 40 · ${company.year}</span><span class="badge">${escape(coverageLabel)}</span></div>
    <div class="status-pill ${statusClass}">${escape(statusLabel)}</div>
    <h3>${escape(company.name)}</h3>
    <p>${company.description ? escape(company.description) : "Membership in this cohort is confirmed by STATION F; no product description was extracted from the annual roster for this company."}</p>
    ${company.category ? `<div class="chip">${escape(company.category)} <small>· editorial, not official</small></div>` : ""}
    ${company.hasFacts ? `<div class="facts-preview">${company.facts.length} sourced fact${company.facts.length > 1 ? "s" : ""} beyond the product profile</div>` : ""}
    <div class="card-cta">View full profile →</div>
  </article>`;
}

function modalTemplate(company) {
  const statusLabel = company.status || "Status not verified";
  const statusClass = company.status ? `status-${company.status.toLowerCase()}` : "status-unverified";
  const statusRow = company.statusFact
    ? `<div class="modal-source-row"><b>Status source</b> ${sourceLink(company.statusFact.source, company.statusFact.source?.label)} <small>verified ${formatDate(company.statusFact.verifiedAt)}</small></div>`
    : `<div class="modal-source-row"><b>Status source</b> <small>No primary source has confirmed a current status for this company yet.</small></div>`;
  return `
    <div class="modal-top"><span class="year">Future 40 · ${company.year}</span></div>
    <div class="status-pill ${statusClass}">${escape(statusLabel)}</div>
    <h2 id="modal-title">${escape(company.name)}</h2>
    ${company.description ? `<p class="modal-desc">${escape(company.description)}<br /><small>Description as published at the time of selection (${escape(company.cohortPublishedAt)}).</small></p>` : `<p class="modal-desc"><small>No product description was extracted for this company; only roster membership is confirmed.</small></p>`}
    <div class="modal-sources">
      ${statusRow}
      <div class="modal-source-row"><b>STATION F roster</b> ${sourceLink(company.rosterSource, `Future 40 ${company.year} announcement`)}</div>
      ${company.website ? `<div class="modal-source-row"><b>Company site (at selection)</b> <a href="${escape(company.website)}" target="_blank" rel="noreferrer">${escape(company.website)} ↗</a></div>` : ""}
      ${company.profileSource ? `<div class="modal-source-row"><b>Description verified</b> ${formatDate(company.profileSource.verifiedAt)}</div>` : ""}
    </div>
    ${company.facts.length ? `<div class="modal-facts"><h3>Additional confirmed facts</h3>${company.facts.map(fact => `<div class="fact-row"><b>${escape(FACT_LABELS[fact.field])}:</b> ${escape(fact.value)} ${sourceLink(fact.source, fact.source?.label)} <small>verified ${formatDate(fact.verifiedAt)}</small></div>`).join("")}</div>` : `<p class="modal-empty">No founder, funding, investor, geography or current-status fact has a confirmed primary source yet for this company. This catalogue leaves those fields off rather than guessing.</p>`}
    ${company.category ? `<p class="modal-footnote">Editorial category: ${escape(company.category)} — assigned by this catalogue from the product description, not an official STATION F classification.</p>` : ""}
  `;
}

function openModal(company) {
  elements.modalBody.innerHTML = modalTemplate(company);
  elements.modal.hidden = false;
  document.body.style.overflow = "hidden";
  elements.modal.querySelector(".modal-close")?.focus();
}
function closeModal() {
  elements.modal.hidden = true;
  document.body.style.overflow = "";
}

function render(companies) {
  const search = elements.search.value.toLowerCase();
  const filtered = companies.filter(company => {
    const corpus = [company.name, company.description, company.category, ...company.facts.map(fact => fact.value)].filter(Boolean).join(" ").toLowerCase();
    if (search && !corpus.includes(search)) return false;
    if (elements.year.value && String(company.year) !== elements.year.value) return false;
    if (elements.category.value && company.category !== elements.category.value) return false;
    if (elements.coverage.value && company.coverage !== elements.coverage.value) return false;
    if (elements.factsFilter.value === "yes" && !company.hasFacts) return false;
    if (elements.factsFilter.value === "no" && company.hasFacts) return false;
    if (elements.statusFilter.value === "unverified" && company.status) return false;
    if (elements.statusFilter.value && elements.statusFilter.value !== "unverified" && company.status !== elements.statusFilter.value) return false;
    return true;
  }).sort((left, right) => {
    const verifiedRank = (right.status ? 1 : 0) - (left.status ? 1 : 0);
    if (verifiedRank !== 0) return verifiedRank;
    if (elements.sort.value === "name") return left.name.localeCompare(right.name);
    if (elements.sort.value === "completeness") return right.completeness - left.completeness || right.year - left.year;
    return elements.sort.value === "year-asc" ? left.year - right.year : right.year - left.year;
  });

  elements.count.textContent = `${filtered.length} ${filtered.length === 1 ? "company" : "companies"}`;
  elements.cards.innerHTML = filtered.length ? filtered.map(cardTemplate).join("") : `<p class="empty">No companies match these filters.</p>`;

  elements.cards.querySelectorAll(".card").forEach(card => {
    const company = filtered.find(candidate => candidate.name === card.dataset.name && String(candidate.year) === card.dataset.year);
    const open = () => company && openModal(company);
    card.addEventListener("click", open);
    card.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); open(); } });
  });
}

function renderAnalytics(companies, cohorts) {
  elements.analytics.innerHTML = cohorts.map(cohort => {
    const set = companies.filter(company => company.year === cohort.year);
    const withDescription = set.filter(company => company.description).length;
    const withWebsite = set.filter(company => company.website).length;
    return `<div class="cohort">
      <b>${cohort.year}</b>
      <small>${set.length} companies</small>
      <small>${withDescription}/${set.length} with a sourced description</small>
      <small>${withWebsite}/${set.length} with a confirmed website</small>
      <small><a href="${escape(cohort.sourceUrl)}" target="_blank" rel="noreferrer">Official roster ↗</a></small>
    </div>`;
  }).join("");
}

async function start() {
  const [companiesRes, enrichmentRes, factsRes] = await Promise.all([
    fetch("data/companies.json"), fetch("data/enrichment.json"), fetch("data/facts.json"),
  ]);
  const [data, enrichment, factsData] = await Promise.all([companiesRes.json(), enrichmentRes.json(), factsRes.json()]);

  const companies = buildCompanies(data, enrichment, factsData);
  const years = [...new Set(companies.map(company => company.year))].sort((a, b) => b - a);
  const categories = [...new Set(companies.map(company => company.category).filter(Boolean))].sort();

  years.forEach(year => elements.year.insertAdjacentHTML("beforeend", `<option value="${year}">${year}</option>`));
  categories.forEach(category => elements.category.insertAdjacentHTML("beforeend", `<option value="${escape(category)}">${escape(category)}</option>`));

  elements.total.textContent = `${companies.length} documented companies`;
  elements.snapshot.textContent = `Research snapshot: ${formatDate(data.researchCutoff)}`;
  renderAnalytics(companies, data.cohorts);

  [elements.search, elements.year, elements.category, elements.coverage, elements.factsFilter, elements.statusFilter, elements.sort]
    .forEach(element => element.addEventListener("input", () => render(companies)));

  elements.modal.querySelectorAll("[data-close]").forEach(node => node.addEventListener("click", closeModal));
  document.addEventListener("keydown", event => { if (event.key === "Escape" && !elements.modal.hidden) closeModal(); });

  render(companies);
}

start().catch(error => {
  console.error(error);
  elements.cards.innerHTML = `<p class="empty">The catalogue data could not be loaded. Please try again later.</p>`;
});
