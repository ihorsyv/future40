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
const STATUS_ORDER = ["Acquired", "Closed", "Rebranded", "Dormant", "Active"];

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
  return `<button type="button" class="map-cell status-${status.toLowerCase()}" data-name="${escape(name)}" data-year="${year}" title="${escape(name)} — ${status}">
    <span class="map-cell-index">${String(index).padStart(2, "0")}</span>
    ${logoTemplate(name, domain)}
    <span class="map-cell-name">${escape(name)}</span>
  </button>`;
}

function rowTemplate(year, grouped, unverifiedCount, domains) {
  const cells = STATUS_ORDER.flatMap(status =>
    grouped[status].map(({ name, index }) => cellTemplate(name, year, status, index, domains[name]))
  ).join("");
  const unverifiedTile = unverifiedCount > 0
    ? `<div class="map-cell map-unverified">+${unverifiedCount}<br />unverified</div>`
    : "";
  return `<div class="map-row">
    <div class="map-year">${year}</div>
    <div class="map-cells">${cells}${unverifiedTile}</div>
  </div>`;
}

async function start() {
  const [companiesRes, factsRes, enrichmentRes] = await Promise.all([
    fetch("data/companies.json"), fetch("data/facts.json"), fetch("data/enrichment.json"),
  ]);
  const [data, factsData, enrichment] = await Promise.all([companiesRes.json(), factsRes.json(), enrichmentRes.json()]);
  const facts = factsData.facts || {};

  let totalCompanies = 0;

  elements.rows.innerHTML = data.cohorts
    .slice()
    .sort((a, b) => a.year - b.year)
    .map(cohort => {
      const grouped = { Acquired: [], Closed: [], Rebranded: [], Dormant: [], Active: [] };
      const domains = {};
      let unverifiedCount = 0;
      cohort.names.forEach((name, i) => {
        totalCompanies += 1;
        const companyFacts = facts[`${cohort.year}|${name}`] || [];
        const status = statusCategory(companyFacts);
        const website = enrichment.profiles?.[cohort.year]?.[name]?.websiteAtSelection;
        domains[name] = domainOf(website);
        if (status) grouped[status].push({ name, index: i + 1 });
        else unverifiedCount += 1;
      });
      return rowTemplate(cohort.year, grouped, unverifiedCount, domains);
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
