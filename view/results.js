const CSV_URL = "../results/experiments.csv";

const stateRank = {
  OPTIMUM: 5,
  SAT: 4,
  TIMEOUT: 3,
  UNKNOWN: 2,
  UNSAT: 1,
  ERROR: 0,
};

const datasetLabels = {
  "data/fap_small.json": "Small",
  "data/fap_medium.json": "Medium",
  "data/fap.json": "Original",
  fap_small: "Small",
  fap_medium: "Medium",
  fap: "Original",
  small: "Small",
  medium: "Medium",
  original: "Original",
};

const modeLabels = {
  feasible: "Faisable",
  optimized: "Optimisé",
};

const nodes = {
  runs: document.querySelector("#metric-runs"),
  datasets: document.querySelector("#metric-datasets"),
  modes: document.querySelector("#metric-modes"),
  status: document.querySelector("#metric-status"),
  caption: document.querySelector("#results-caption"),
  source: document.querySelector("#data-source"),
  banner: document.querySelector("#state-banner"),
  body: document.querySelector("#results-body"),
  input: document.querySelector("#csv-input"),
  search: document.querySelector("#search-input"),
  modeFilter: document.querySelector("#mode-filter"),
  statusFilter: document.querySelector("#status-filter"),
  filterCount: document.querySelector("#filter-count"),
};

let allRows = [];

const datasetOrder = {
  Small: 1,
  Medium: 2,
  Original: 3,
};

const modeOrder = {
  Faisable: 1,
  Optimisé: 2,
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const [headers, ...dataRows] = rows;
  if (!headers) return [];

  return dataRows.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  );
}

function normalizeDataset(value) {
  const clean = value.replaceAll("\\", "/").trim();
  const filename = clean.split("/").pop()?.replace(".json", "") ?? clean;
  return datasetLabels[clean] ?? datasetLabels[filename] ?? clean;
}

function normalizeMode(value) {
  const clean = value.trim();
  return modeLabels[clean] ?? clean;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusClass(status) {
  if (status === "OPTIMUM" || status === "SAT") return "ok";
  if (status === "TIMEOUT" || status === "UNKNOWN") return "warn";
  if (status === "ERROR" || status === "UNSAT") return "error";
  return "unknown";
}

function bestStatus(rows) {
  return rows
    .map((row) => row.status || "UNKNOWN")
    .sort((a, b) => (stateRank[b] ?? -1) - (stateRank[a] ?? -1))[0] ?? "-";
}

function renderBanner(rows) {
  const statuses = new Set(rows.map((row) => row.status));
  const allErrors = rows.length > 0 && [...statuses].every((status) => status === "ERROR");
  const hasSolution = rows.some((row) => row.status === "SAT" || row.status === "OPTIMUM");
  const hasTimeout = rows.some((row) => row.status === "TIMEOUT" || row.status === "UNKNOWN");

  nodes.banner.className = "state-banner";

  if (allErrors) {
    nodes.banner.classList.add("error");
    nodes.banner.textContent =
      "Toutes les exécutions sont en ERROR. Le tableau se mettra à jour après une nouvelle campagne valide.";
  } else if (hasSolution) {
    nodes.banner.classList.add("ok");
    nodes.banner.textContent =
      "Des solutions ont été trouvées. Les valeurs nbFreqDiff et maxFreq proviennent du CSV chargé.";
  } else if (hasTimeout) {
    nodes.banner.classList.add("warn");
    nodes.banner.textContent =
      "Certaines exécutions sont incomplètes ou en timeout. Les meilleurs résultats disponibles sont affichés.";
  } else {
    nodes.banner.textContent = "Résultats chargés depuis le CSV.";
  }
}

function normalizeRows(rows) {
  return rows
    .filter((row) => row.dataset && row.mode)
    .map((row) => ({
      dataset: normalizeDataset(row.dataset),
      mode: normalizeMode(row.mode),
      timeLimit: row.time_limit,
      status: row.status || "UNKNOWN",
      nbFreqDiff: row.nbFreqDiff || "-",
      maxFreq: row.maxFreq || "-",
      elapsed: row.elapsed_s ? `${row.elapsed_s} s` : "-",
    }))
    .sort((a, b) => {
      const datasetDelta = (datasetOrder[a.dataset] ?? 99) - (datasetOrder[b.dataset] ?? 99);
      if (datasetDelta !== 0) return datasetDelta;

      const modeDelta = (modeOrder[a.mode] ?? 99) - (modeOrder[b.mode] ?? 99);
      if (modeDelta !== 0) return modeDelta;

      return Number(a.timeLimit) - Number(b.timeLimit);
    });
}

function filteredRows() {
  const search = nodes.search.value.trim().toLowerCase();
  const mode = nodes.modeFilter.value;
  const status = nodes.statusFilter.value;

  return allRows.filter((row) => {
    const matchesMode = !mode || row.mode === mode;
    const matchesStatus = !status || row.status === status;
    const haystack = `${row.dataset} ${row.mode} ${row.status} ${row.timeLimit}`.toLowerCase();
    const matchesSearch = !search || haystack.includes(search);

    return matchesMode && matchesStatus && matchesSearch;
  });
}

function updateMetrics(rows) {
  const datasetCount = new Set(rows.map((row) => row.dataset)).size;
  const modeCount = new Set(rows.map((row) => row.mode)).size;

  nodes.runs.textContent = rows.length.toString();
  nodes.datasets.textContent = datasetCount.toString();
  nodes.modes.textContent = modeCount.toString();
  nodes.status.textContent = bestStatus(rows);
  nodes.caption.textContent =
    rows.length > 0
      ? `${rows.length} exécutions sur ${datasetCount} instances`
      : "Aucune ligne exploitable dans le CSV";
}

function renderTable(rows) {
  nodes.filterCount.textContent =
    rows.length === allRows.length ? `${rows.length} lignes` : `${rows.length} / ${allRows.length}`;

  if (rows.length === 0) {
    nodes.body.innerHTML = `
      <tr class="empty-row">
        <td colspan="7">Aucun résultat à afficher.</td>
      </tr>
    `;
  } else {
    nodes.body.innerHTML = rows
      .map(
        (row) => `
        <tr>
          <td class="dataset">${escapeHtml(row.dataset)}</td>
          <td class="mode">${escapeHtml(row.mode)}</td>
          <td class="number">${escapeHtml(row.timeLimit)} s</td>
          <td><span class="status ${statusClass(row.status)}">${escapeHtml(row.status)}</span></td>
          <td class="number">${escapeHtml(row.nbFreqDiff)}</td>
          <td class="number">${escapeHtml(row.maxFreq)}</td>
          <td class="number">${escapeHtml(row.elapsed)}</td>
        </tr>
      `,
      )
      .join("");
  }
}

function renderFiltered() {
  const rows = filteredRows();
  renderTable(rows);
}

function render(rows) {
  allRows = normalizeRows(rows);

  updateMetrics(allRows);
  renderTable(allRows);
  renderBanner(allRows);
}

function resetFilters() {
  nodes.search.value = "";
  nodes.modeFilter.value = "";
  nodes.statusFilter.value = "";
}

async function loadDefaultCsv() {
  try {
    const response = await fetch(CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    nodes.source.textContent = "results/experiments.csv";
    resetFilters();
    render(parseCsv(await response.text()));
  } catch {
    allRows = [];
    nodes.caption.textContent = "Import manuel requis";
    nodes.source.textContent = "Non chargé";
    nodes.filterCount.textContent = "-";
    nodes.banner.className = "state-banner warn";
    nodes.banner.textContent =
      "CSV non chargé automatiquement. Importe results/experiments.csv pour afficher les résultats.";
  }
}

nodes.input.addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  nodes.source.textContent = file.name;
  resetFilters();
  render(parseCsv(await file.text()));
});

nodes.search.addEventListener("input", renderFiltered);
nodes.modeFilter.addEventListener("change", renderFiltered);
nodes.statusFilter.addEventListener("change", renderFiltered);

loadDefaultCsv();
