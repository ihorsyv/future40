const elements = {
  rows: document.querySelector("#map-rows"),
  total: document.querySelector("#company-count"),
  snapshot: document.querySelector("#snapshot-date"),
};

const escape = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char]);
const formatDate = iso => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.valueOf()) ? iso : date.toISOString().slice(0, 10);
};

const STATUS_VALUES = ["Active", "Acquired", "Closed", "Rebranded", "Dormant"];
const STATUS_ORDER = ["Acquired", "Closed", "Rebranded", "Dormant", "Active", "Unverified"];

function statusCategory(companyFacts) {
  const statusFact = companyFacts.find(fact => fact.field === "status");
  if (!statusFact) return null;
  const head = String(statusFact.value).split(":")[0].trim();
  return STATUS_VALUES.includes(head) ? head : null;
}

function domainOf(url) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (error) {
    return null;
  }
}

function logoTemplate(name, domain) {
  const initial = escape(name.replace(/^\W+/, "").charAt(0).toUpperCase() || "?");
  if (!domain) {
    return `<span class="map-cell-logo"><span class="map-cell-fallback" style="display:flex">${initial}</span></span>`;
  }
  return `<span class="map-cell-logo">
      <img src="https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(domain)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <span class="map-cell-fallback">${initial}</span>
    </span>`;
}

function cellTemplate(name, year, status, index, domain) {
  const interactive = status !== "Unverified";
  const tag = interactive ? "button" : "div";
  const attrs = interactive ? `type="button" data-name="${escape(name)}" data-year="${year}"` : `aria-disabled="true"`;
  return `<${tag} class="map-cell status-${status.toLowerCase()}" ${attrs} title="${escape(name)} — ${status === "Unverified" ? "Status not verified" : status}">
    <span class="map-cell-index">${String(index).padStart(2, "0")}</span>
    ${logoTemplate(name, domain)}
    <span class="map-cell-name">${escape(name)}</span>
  </${tag}>`;
}

function rowTemplate(year, grouped, domains) {
  const cells = STATUS_ORDER.flatMap(status =>
    grouped[status].map(({ name, index }) => cellTemplate(name, year, status, index, domains[name]))
  ).join("");
  return `<div class="map-row">
    <div class="map-year">${year}</div>
    <div class="map-cells">${cells}</div>
  </div>`;
}

async function start() {
  const [companiesRes, factsRes, enrichmentRes, logosRes] = await Promise.all([
    fetch("data/companies.json"), fetch("data/facts.json"), fetch("data/enrichment.json"), fetch("data/logos.json"),
  ]);
  const [data, factsData, enrichment, logosData] = await Promise.all([companiesRes.json(), factsRes.json(), enrichmentRes.json(), logosRes.json()]);
  const facts = factsData.facts || {};
  const logos = logosData.domains || {};

  let totalCompanies = 0;

  elements.rows.innerHTML = data.cohorts
    .slice()
    .sort((a, b) => b.year - a.year)
    .map(cohort => {
      const grouped = { Acquired: [], Closed: [], Rebranded: [], Dormant: [], Active: [], Unverified: [] };
      const domains = {};
      cohort.names.forEach((name, i) => {
        totalCompanies += 1;
        const companyFacts = facts[`${cohort.year}|${name}`] || [];
        const status = statusCategory(companyFacts) || "Unverified";
        const website = enrichment.profiles?.[cohort.year]?.[name]?.websiteAtSelection;
        domains[name] = domainOf(website) || logos[`${cohort.year}|${name}`] || null;
        grouped[status].push({ name, index: i + 1 });
      });
      return rowTemplate(cohort.year, grouped, domains);
    })
    .join("");

  elements.total.textContent = `${totalCompanies} documented companies`;
  elements.snapshot.textContent = `Research snapshot: ${formatDate(data.researchCutoff)}`;

  elements.rows.querySelectorAll(".map-cell[data-name]").forEach(cell => {
    cell.addEventListener("click", () => {
      const params = new URLSearchParams({ company: cell.dataset.name, year: cell.dataset.year });
      window.location.href = `index.html?${params.toString()}`;
    });
  });
}

start().catch(error => {
  console.error(error);
  elements.rows.innerHTML = `<p class="empty">The catalogue data could not be loaded. Please try again later.</p>`;
});
