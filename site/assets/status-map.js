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

function cellTemplate(name, year, status) {
  return `<button type="button" class="map-cell status-${status.toLowerCase()}" data-name="${escape(name)}" data-year="${year}" title="${escape(name)} — ${status}">
    <span>${escape(name)}</span>
  </button>`;
}

function rowTemplate(year, grouped, unverifiedCount) {
  const cells = STATUS_ORDER.flatMap(status => grouped[status].map(name => cellTemplate(name, year, status))).join("");
  const unverifiedTile = unverifiedCount > 0
    ? `<div class="map-cell map-unverified">+${unverifiedCount}<br />unverified</div>`
    : "";
  return `<div class="map-row">
    <div class="map-year">${year}</div>
    <div class="map-cells">${cells}${unverifiedTile}</div>
  </div>`;
}

async function start() {
  const [companiesRes, factsRes] = await Promise.all([fetch("data/companies.json"), fetch("data/facts.json")]);
  const [data, factsData] = await Promise.all([companiesRes.json(), factsRes.json()]);
  const facts = factsData.facts || {};

  const years = data.cohorts.map(cohort => cohort.year).sort((a, b) => a - b);
  let totalCompanies = 0;

  elements.rows.innerHTML = data.cohorts
    .slice()
    .sort((a, b) => a.year - b.year)
    .map(cohort => {
      const grouped = { Acquired: [], Closed: [], Rebranded: [], Dormant: [], Active: [] };
      let unverifiedCount = 0;
      cohort.names.forEach(name => {
        totalCompanies += 1;
        const companyFacts = facts[`${cohort.year}|${name}`] || [];
        const status = statusCategory(companyFacts);
        if (status) grouped[status].push(name);
        else unverifiedCount += 1;
      });
      return rowTemplate(cohort.year, grouped, unverifiedCount);
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
