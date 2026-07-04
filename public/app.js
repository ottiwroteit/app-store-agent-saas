const app = document.querySelector("#app");

const icons = {
  grid: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  ads: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16l3-5 3 2 4-7"/></svg>`,
  aso: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/><path d="M8 11h6"/><path d="M11 8v6"/></svg>`,
  rescue: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>`,
  store: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>`,
  report: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 3h10l4 4v14H5z"/><path d="M15 3v5h5"/><path d="M8 17h8"/><path d="M8 13h8"/></svg>`,
  key: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="8" cy="15" r="4"/><path d="M11 12l8-8"/><path d="M16 7l2 2"/><path d="M14 9l2 2"/></svg>`,
  refresh: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 12a8 8 0 0 1-14.7 4.4"/><path d="M4 12A8 8 0 0 1 18.7 7.6"/><path d="M18 3v5h-5"/><path d="M6 21v-5h5"/></svg>`,
  apple: `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M15.4 5.6c.8-.9 1.2-2 1.1-3.1-1.1.1-2.3.8-3 1.7-.7.8-1.3 1.9-1.1 3 1.1.1 2.2-.6 3-1.6Z"/><path d="M19.2 17.2c-.5 1.1-.8 1.6-1.5 2.6-1 1.4-2.4 3.1-4.1 3.1-1.5 0-1.9-1-4-1-2 0-2.5 1-4 1-1.7 0-3-1.6-4-3-2.8-4.2-3.1-9.2-1.4-11.8 1.2-1.9 3.1-3 4.9-3 1.9 0 3.1 1 4.6 1 1.5 0 2.4-1 4.6-1 1.7 0 3.5.9 4.7 2.5-4.1 2.2-3.4 8.1.2 9.6Z" transform="scale(.82) translate(2 1)"/></svg>`
};

let state = {
  tab: "dashboard",
  overview: null,
  rankRescue: null,
  asoSaas: null,
  config: null,
  diagnostics: null,
  keyCandidates: null,
  appleAdsKeypair: null,
  sync: null,
  syncHistory: [],
  dateRange: defaultDateRange(),
  rankRescueForm: {
    appUrl: "https://apps.apple.com/us/app/legend-run-82-0/id6779005725",
    country: "US",
    baselineRank: "60",
    keywords: "82-0, 82 and 0, basketball simulator, basketball manager, basketball gm, sports game"
  },
  asoSaasForm: {
    appUrl: "https://apps.apple.com/us/app/plantedu/id6780004544",
    country: "US",
    keywords: "plant education, plant identifier, plant care, plant app, plant learning, botany, garden planner"
  },
  asoSignupForm: {
    email: "",
    company: "",
    phone: "",
    plan: "Growth"
  },
  asoSignupResult: null,
  assumptions: loadAssumptions(),
  completedOptimizations: loadCompletedOptimizations(),
  adsCampaignFilter: "all",
  saveMessage: ""
};

const rankRescuePresets = [
  {
    name: "Legend Run: 82-0",
    appUrl: "https://apps.apple.com/us/app/legend-run-82-0/id6779005725",
    country: "US",
    baselineRank: "60",
    keywords: "82-0, 82 and 0, basketball simulator, basketball manager, basketball gm, sports game"
  },
  {
    name: "Legend Run: 16-0",
    appUrl: "https://apps.apple.com/us/app/legend-run-16-0/id6781080886",
    country: "US",
    baselineRank: "60",
    keywords: "16-0, 16 and 0, football game, football run, undefeated football, sports game"
  },
  {
    name: "Legend Run: 162-0",
    appUrl: "https://apps.apple.com/us/app/legend-run-162-0/id6782313559",
    country: "US",
    baselineRank: "60",
    keywords: "162-0, 162 and 0, baseball game, baseball simulator, baseball manager, baseball gm, baseball lineup, baseball strategy"
  },
  {
    name: "Perfect Album",
    appUrl: "https://apps.apple.com/us/app/legend-run-the-perfect-album/id6782729206",
    country: "US",
    baselineRank: "60",
    keywords: "perfect album, music game, album ranking, album collection, music trivia, music challenge"
  },
  {
    name: "PlantEdu",
    appUrl: "https://apps.apple.com/us/app/plantedu/id6780004544",
    country: "US",
    baselineRank: "60",
    keywords: "plant education, plant identifier, plant care, plant app, plant learning, botany, garden planner"
  },
  {
    name: "BARE",
    appUrl: "https://apps.apple.com/us/app/id6761767663",
    country: "US",
    baselineRank: "60",
    keywords: "food scanner, ingredient scanner, ultra processed food scanner, nutrition scanner, clean food"
  },
  {
    name: "Blueprint AI",
    appUrl: "https://apps.apple.com/us/app/id6760570091",
    country: "US",
    baselineRank: "60",
    keywords: "blueprint estimate app, construction estimate, roofing estimate, contractor quote, house design"
  },
  {
    name: "Cup Companion",
    appUrl: "https://apps.apple.com/us/app/id6770161145",
    country: "US",
    baselineRank: "60",
    keywords: "world cup app, world cup 2026, football 2026, miami world cup, wk voetbal 2026"
  }
];

renderShell();
loadOverview();

function renderShell() {
  app.innerHTML = `
    <div class="app-shell">
      <aside class="rail">
        <div class="brand">
          <div class="brand-mark">${icons.apple}</div>
          <div>
            <h1>Apple Growth Console</h1>
            <p>Ads + App Store Connect</p>
          </div>
        </div>
        <nav class="nav">
          ${navButton("dashboard", icons.grid, "Dashboard")}
          ${navButton("ads", icons.ads, "Apple Ads")}
          ${navButton("aso", icons.aso, "ASO")}
          ${navButton("rank", icons.rescue, "Rank Rescue")}
          ${navButton("saas", icons.report, "Keyword Finder")}
          ${navButton("store", icons.store, "App Store Connect")}
          ${navButton("reports", icons.report, "Reports")}
          ${navButton("credentials", icons.key, "Credentials")}
        </nav>
        <div class="rail-footer">
          <strong>Growth mode</strong>
          <span>Credentials, sync logs, and raw endpoint details live on the Credentials tab so sales and campaign views stay decision-focused.</span>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <div class="topbar-title">
            <h2 id="view-title">Dashboard</h2>
            <p id="view-subtitle">Unified acquisition, spend, and store performance.</p>
          </div>
          <div class="actions">
            <div class="date-controls" aria-label="Report date range">
              <label><span>Start</span><input id="start-date" name="startDate" type="date" value="${state.dateRange.startDate}"></label>
              <label><span>End</span><input id="end-date" name="endDate" type="date" value="${state.dateRange.endDate}"></label>
              <button class="button secondary" id="apply-dates-button" type="button">Apply</button>
            </div>
            <span class="status-pill"><i class="dot" id="status-dot"></i><span id="connection-label">Checking credentials</span></span>
            <button class="button secondary" id="probe-button">Probe APIs</button>
            <button class="button secondary" id="sync-button">Run Sync</button>
            <button class="button" id="refresh-button">${icons.refresh} Refresh</button>
          </div>
        </header>
        <section id="view"></section>
      </main>
      <aside class="side" id="side-panel"></aside>
    </div>
  `;

  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      render();
    });
  });
  document.querySelector("#refresh-button").addEventListener("click", loadOverview);
  document.querySelector("#probe-button").addEventListener("click", probeApis);
  document.querySelector("#sync-button").addEventListener("click", runSync);
  document.querySelector("#apply-dates-button").addEventListener("click", applyDateControls);
  document.querySelectorAll(".date-controls input").forEach((input) => {
    input.addEventListener("change", () => {
      state.dateRange[input.name] = input.value;
    });
  });
}

function navButton(id, icon, label) {
  return `<button data-tab="${id}" class="${state.tab === id ? "active" : ""}">${icon}<span>${label}</span></button>`;
}

function defaultDateRange() {
  const today = isoDate(new Date());
  return { startDate: today, endDate: today };
}

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateQuery() {
  const params = new URLSearchParams();
  params.set("startDate", state.dateRange.startDate);
  params.set("endDate", state.dateRange.endDate);
  return params.toString();
}

function asoSaasQuery() {
  const params = new URLSearchParams(dateQuery());
  params.set("appUrl", state.asoSaasForm.appUrl);
  params.set("country", state.asoSaasForm.country || "US");
  params.set("keywords", state.asoSaasForm.keywords || "");
  return params.toString();
}

function rankRescueQuery() {
  const params = new URLSearchParams(dateQuery());
  params.set("appUrl", state.rankRescueForm.appUrl || "");
  params.set("country", state.rankRescueForm.country || "US");
  params.set("baselineRank", state.rankRescueForm.baselineRank || "60");
  params.set("keywords", state.rankRescueForm.keywords || "");
  return params.toString();
}

function normalizeRankRescueForm(values = {}) {
  return {
    appUrl: String(values.appUrl || state.rankRescueForm.appUrl || "").trim(),
    country: String(values.country || "US").trim().slice(0, 2).toUpperCase() || "US",
    baselineRank: String(values.baselineRank || "60").trim() || "60",
    keywords: String(values.keywords || "").trim()
  };
}

function applyDateControls() {
  state.dateRange = {
    startDate: document.querySelector("#start-date")?.value || state.dateRange.startDate,
    endDate: document.querySelector("#end-date")?.value || state.dateRange.endDate
  };
  loadOverview();
}

async function loadOverview() {
  setConnection("Loading data", false);
  const [overview, rankRescue, asoSaas, config, diagnostics, keyCandidates, syncHistory] = await Promise.all([
    fetchJson(`/api/overview?${dateQuery()}`),
    fetchJson(`/api/rank-rescue?${rankRescueQuery()}`),
    fetchJson(`/api/aso-saas?${asoSaasQuery()}`),
    fetchJson("/api/config"),
    fetchJson("/api/diagnostics"),
    fetchJson("/api/key-candidates"),
    fetchJson("/api/sync/history")
  ]);
  state.overview = overview;
  state.rankRescue = rankRescue;
  state.asoSaas = asoSaas;
  state.config = config;
  state.diagnostics = diagnostics;
  state.keyCandidates = keyCandidates;
  state.syncHistory = syncHistory?.runs || overview?.syncHistory || [];
  render();
}

async function loadAsoSaas() {
  setConnection("Loading ASO SaaS", false);
  state.asoSaas = await fetchJson(`/api/aso-saas?${asoSaasQuery()}`);
  render();
}

async function loadRankRescue() {
  setConnection("Loading Rank Rescue", false);
  state.rankRescue = await fetchJson(`/api/rank-rescue?${rankRescueQuery()}`);
  render();
}

async function probeApis() {
  const [apps, campaigns] = await Promise.all([
    fetchJson("/api/app-store-connect/apps"),
    fetchJson("/api/apple-ads/campaigns")
  ]);
  const log = [];
  log.push(apiProbeLog("App Store Connect", apps));
  log.push(apiProbeLog("Apple Ads", campaigns));
  state.overview = {
    ...state.overview,
    syncLog: [...log, ...(state.overview?.syncLog || [])]
  };
  state.tab = "credentials";
  render();
}

async function runSync() {
  setConnection("Running sync", false);
  const payload = await fetchJson(`/api/sync?${dateQuery()}`);
  state.sync = payload;
  state.syncHistory = [syncHistoryEntry(payload), ...state.syncHistory].slice(0, 25);
  if (payload?.syncLog) {
    state.overview = {
      ...state.overview,
      syncLog: [...payload.syncLog, ...(state.overview?.syncLog || [])]
    };
  }
  state.tab = "dashboard";
  render();
}

function syncHistoryEntry(payload) {
  return {
    mode: payload.mode,
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    summary: payload.summary,
    results: payload.results || []
  };
}

function apiProbeLog(source, payload) {
  if (payload?.ok) return { source, message: `Live endpoint responded with ${payload.status}`, level: "ok" };
  if (payload?.mode === "missing-credentials") return { source, message: `Not called because credentials are incomplete`, level: "warn" };
  return { source, message: payload?.error || `Endpoint returned ${payload?.status || "unknown status"}`, level: "warn" };
}

async function probeReports() {
  const [sales, adsReport] = await Promise.all([
    fetchJson(`/api/app-store-connect/sales-report?reportDate=${encodeURIComponent(state.dateRange.endDate)}`),
    fetchJson(`/api/apple-ads/reports/campaigns?${dateQuery()}`)
  ]);
  const log = [
    reportProbeLog("ASC Sales Report", sales),
    reportProbeLog("Apple Ads Campaign Report", adsReport),
    ...(state.overview?.syncLog || [])
  ];
  state.overview = { ...state.overview, syncLog: log };
  state.tab = "reports";
  render();
}

function reportProbeLog(source, payload) {
  if (payload?.ok) {
    const detail = Number.isFinite(payload.rowCount) ? `${payload.rowCount} rows` : `status ${payload.status}`;
    return { source, message: `Live report responded with ${detail}`, level: "ok" };
  }
  if (payload?.mode === "missing-credentials") {
    const missing = payload.missing?.length ? ` Missing: ${payload.missing.join(", ")}` : "";
    return { source, message: `Not called because credentials are incomplete.${missing}`, level: "warn" };
  }
  return { source, message: payload?.error || `Report endpoint returned ${payload?.status || "unknown status"}`, level: "warn" };
}

async function fetchJson(path, options) {
  try {
    const response = await fetch(path, options);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

function render() {
  renderShellState();
  const data = state.overview;
  if (!data) return;
  const view = document.querySelector("#view");
  if (state.tab === "dashboard") view.innerHTML = dashboard(data);
  if (state.tab === "ads") view.innerHTML = adsView(data);
  if (state.tab === "aso") view.innerHTML = asoView(data);
  if (state.tab === "rank") view.innerHTML = rankRescueView(state.rankRescue);
  if (state.tab === "saas") view.innerHTML = asoSaasView(state.asoSaas);
  if (state.tab === "store") view.innerHTML = storeView(data);
  if (state.tab === "reports") view.innerHTML = reportsView(data);
  if (state.tab === "credentials") view.innerHTML = credentialsView(data.credentials);
  document.querySelector("#side-panel").innerHTML = sidePanel(data);
  bindViewActions();
}

function renderShellState() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === state.tab);
  });
  const titles = {
    dashboard: ["Dashboard", "Unified acquisition, spend, and store performance."],
    ads: ["Apple Ads", "Campaign pacing, tap efficiency, and install cost."],
    aso: ["ASO", "Organic keyword rank, competitor density, and metadata opportunities."],
    rank: ["Rank Rescue", "Switch apps, diagnose rank drops, and connect paid demand to ASO actions."],
    saas: ["Keyword Discovery", "Find App Store keywords for metadata and new Apple Ads campaigns."],
    store: ["App Store Connect", "App metadata, sales readiness, and reporting inputs."],
    reports: ["Reports", "Daily exports and reconciled growth notes."],
    credentials: ["Credentials", "Live API readiness for Apple services."]
  };
  const [title, subtitle] = titles[state.tab];
  document.querySelector("#view-title").textContent = title;
  document.querySelector("#view-subtitle").textContent = subtitle;
  const showBackendActions = state.tab === "credentials";
  document.querySelector("#probe-button").classList.toggle("is-hidden", !showBackendActions);
  document.querySelector("#sync-button").classList.toggle("is-hidden", !showBackendActions);
}

function dashboard(data) {
  return `
    <div class="kpi-grid">
      ${dailyProfitKpis(data).map((item) => `<article class="kpi"><span>${item.label}</span><strong>${item.value}</strong><em>${item.delta}</em></article>`).join("")}
    </div>
    <div class="stack">
      ${spendTruthPanel(data)}
      ${unitEconomicsPanel(data)}
      <div class="grid">
        ${campaignPerformancePanel(data)}
      <div class="stack">
        ${growthBriefPanel(data)}
        ${nextActionsPanel(data)}
      </div>
      </div>
      ${campaignTable(data.campaigns)}
    </div>
  `;
}

function spendTruthPanel(data) {
  const economics = unitEconomics(data);
  const campaigns = (data.campaigns || []).map((campaign) => ({
    ...campaign,
    spendValue: parseMoney(campaign.spend),
    cpaValue: parseMoney(campaign.cpa),
    installsValue: parseNumber(campaign.installs),
    tapsValue: parseNumber(campaign.taps),
    appProfit: appProfitForCampaign(data, campaign)
  })).sort((a, b) => b.spendValue - a.spendValue);
  const leaks = spendLeaks(data).slice(0, 8);
  const activeLeaks = leaks.filter((leak) => !leak.contained);
  const containedLeaks = leaks.filter((leak) => leak.contained);
  const totalSpend = economics.spend;
  const severity = activeLeaks.length ? "critical" : totalSpend >= 100 || economics.profit < 0 ? "warning" : "controlled";
  return `
    <section class="panel spend-truth-panel ${severity}">
      <div class="panel-header">
        <h3>Spend Truth</h3>
        <span>${state.dateRange.startDate === state.dateRange.endDate ? state.dateRange.endDate : `${state.dateRange.startDate} to ${state.dateRange.endDate}`} · live Apple Ads</span>
      </div>
      <div class="truth-hero">
        <article>
          <span>Spend</span>
          <strong>${currency(totalSpend)}</strong>
          <p>${campaigns.length} campaigns reported spend for this range.</p>
        </article>
        <article>
          <span>RevenueCat Gross</span>
          <strong>${currency(economics.grossRevenue)}</strong>
          <p>${economics.revenueSourceLabel} for the selected date range.</p>
        </article>
        <article>
          <span>After Apple</span>
          <strong>${currency(economics.netRevenue)}</strong>
          <p>${percentFromFraction(state.assumptions.appleFeeRate)} estimated Apple share removed.</p>
        </article>
        <article>
          <span>Gross Profit</span>
          <strong>${currency(economics.profit)}</strong>
          <p>${economics.profit >= 0 ? "Amount left after Apple fee and ad spend." : "Amount remaining after Apple fee and ad spend."}</p>
        </article>
      </div>
      <div class="truth-columns">
        <div>
          <h4>Campaign Spend</h4>
          ${campaigns.map((campaign) => `
            <div class="truth-row ${campaignProfitClass(campaign)}">
              <div>
                <strong>${escapeHtml(campaign.app || campaign.name)}</strong>
                <span>${escapeHtml(campaign.name.trim())} · ${escapeHtml(campaign.status)}</span>
              </div>
              <p>${campaign.spend} spend · ${campaign.installs} installs · ${campaign.cpa} CPA${campaign.appProfit?.revenueReady ? ` · ${currency(campaign.appProfit.profit)} app profit` : " · revenue unavailable"}</p>
            </div>
          `).join("")}
        </div>
        <div>
          <h4>Current Active Risk</h4>
          ${activeLeaks.length ? activeLeaks.map((leak) => truthLeakRow(leak)).join("") : `<div class="empty small">No detected spend leak is currently active. Campaigns/keywords appear paused or contained.</div>`}
        </div>
      </div>
      <div class="truth-history">
        <div class="panel-header compact">
          <h3>Historical Damage Today</h3>
          <span>${containedLeaks.length} contained leak${containedLeaks.length === 1 ? "" : "s"}</span>
        </div>
        <div class="truth-history-list">
          ${containedLeaks.length ? containedLeaks.map((leak) => truthLeakRow(leak)).join("") : `<div class="empty small">No contained historical leaks to show.</div>`}
        </div>
      </div>
    </section>
  `;
}

function campaignProfitClass(campaign) {
  if (campaign.appProfit?.revenueReady) {
    return campaign.appProfit.profit < 0 && campaign.spendValue > 0 ? "bad" : "ok";
  }
  return campaign.tapsValue >= 10 && campaign.installsValue === 0 ? "bad" : "ok";
}

function truthLeakRow(leak) {
  return `
    <div class="truth-row ${leak.contained ? "contained" : "bad"}">
              <div>
                <strong>${escapeHtml(leak.term)}</strong>
        <span>${escapeHtml(leak.campaignName || "Apple Ads")} · ${escapeHtml(leak.kind)} · ${escapeHtml(leak.stateLabel)}</span>
              </div>
      <p>${currency(leak.spend)} spend · ${compactNumber(leak.taps)} taps · ${compactNumber(leak.installs)} installs · ${leak.action}</p>
            </div>
  `;
}

function spendLeaks(data) {
  const campaigns = new Map((data.campaigns || []).map((campaign) => [normalizeKey(campaign.name), campaign]));
  const keywordStatuses = new Map();
  for (const keyword of data.appleAdsInsights?.keywords || []) {
    keywordStatuses.set(`${normalizeKey(keyword.campaignName)}:${normalizeKey(keyword.keyword || keyword.term)}:${normalizeKey(keyword.matchType)}`, keyword.status || "");
    keywordStatuses.set(`${normalizeKey(keyword.campaignName)}:${normalizeKey(keyword.keyword || keyword.term)}`, keyword.status || "");
  }
  const rows = [
    ...(data.appleAdsInsights?.searchTerms || []).map((row) => ({ ...row, kind: "search term" })),
    ...(data.appleAdsInsights?.keywords || []).map((row) => ({ ...row, kind: "keyword" }))
  ];
  const seen = new Set();
  return rows.map((row) => {
    const spend = Number(row.spend || 0);
    const taps = Number(row.taps || 0);
    const installs = Number(row.installs || 0);
    const cpi = installs ? spend / installs : 0;
    const installRate = taps ? installs / taps : 0;
    const isBroad = String(row.matchType || "").toUpperCase() === "BROAD";
    let action = "";
    if (spend >= 10 && installs === 0) action = "add negative or pause";
    else if (spend >= 25 && cpi >= 25) action = "cut bid hard";
    else if (isBroad && spend >= 25 && installRate < 0.15) action = "cut broad bid";
    else if (spend >= 15 && installRate < 0.1) action = "review today";
    if (!action) return null;
    const campaign = campaigns.get(normalizeKey(row.campaignName));
    const campaignPaused = normalizeKey(campaign?.status) === "paused";
    const keywordStatus = row.kind === "keyword"
      ? row.status
      : keywordStatuses.get(`${normalizeKey(row.campaignName)}:${normalizeKey(row.searchTerm || row.term)}:${normalizeKey(row.matchType)}`)
        || keywordStatuses.get(`${normalizeKey(row.campaignName)}:${normalizeKey(row.searchTerm || row.term)}`)
        || "";
    const keywordPaused = normalizeKey(keywordStatus) === "paused";
    const contained = campaignPaused || keywordPaused;
    const stateLabel = contained
      ? campaignPaused ? "contained: campaign paused" : "contained: keyword paused"
      : keywordStatus ? `active risk: ${keywordStatus}` : "active risk";
    return {
      term: row.searchTerm || row.keyword || row.term,
      campaignName: row.campaignName,
      kind: row.kind,
      spend,
      taps,
      installs,
      action: contained ? "already contained" : action,
      contained,
      stateLabel,
      sort: spend + (installs === 0 ? 50 : 0) + (contained ? 0 : 100)
    };
  }).filter(Boolean).filter((row) => {
    const key = `${row.kind}:${row.campaignName}:${row.term}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b.sort - a.sort);
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function readinessPanel(data) {
  const rows = endpointReadinessRows(data);
  const readyCount = rows.filter((row) => row.ready).length;
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Live Data Readiness</h3>
        <span>${readyCount}/${rows.length} endpoints ready</span>
      </div>
      <div class="readiness-grid">
        ${rows.map((row) => `
          <div class="readiness-card ${row.ready ? "ready" : ""}">
            <div class="readiness-top">
              <strong>${row.name}</strong>
              <span>${row.ready ? "ready" : "waiting"}</span>
            </div>
            <p>${row.detail}</p>
            <code>${row.endpoint}</code>
            ${row.ready ? "" : `<em>Missing: ${row.missing.join(", ")}</em>`}
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function endpointReadinessRows(data) {
  const ascMissing = data.credentials?.appStoreConnect?.missing || [];
  const adsMissing = data.credentials?.appleAds?.missing || [];
  const rcMissing = data.credentials?.revenueCat?.missing || [];
  const vendorMissing = state.config?.values?.ASC_VENDOR_NUMBER ? [] : ["ASC_VENDOR_NUMBER"];
  return [
    {
      name: "App Store Connect Apps",
      endpoint: "/v1/apps",
      ready: ascMissing.length === 0,
      missing: ascMissing,
      detail: "Pulls app metadata once the App Store Connect JWT can be signed."
    },
    {
      name: "ASC Sales Reports",
      endpoint: "/v1/salesReports",
      ready: ascMissing.length === 0 && vendorMissing.length === 0,
      missing: [...ascMissing, ...vendorMissing],
      detail: "Pulls daily sales exports after the vendor number is present."
    },
    {
      name: "Apple Ads Campaigns",
      endpoint: "/api/v5/campaigns",
      ready: adsMissing.length === 0,
      missing: adsMissing,
      detail: "Lists Apple Search Ads campaigns using the v5 OAuth setup."
    },
    {
      name: "Apple Ads Reports",
      endpoint: "/api/v5/reports/campaigns",
      ready: adsMissing.length === 0,
      missing: adsMissing,
      detail: "Pulls campaign performance rows for spend, taps, installs, and totals."
    },
    {
      name: "RevenueCat Metrics",
      endpoint: "/v2/projects/{project}/metrics",
      ready: Boolean(data.credentials?.revenueCat?.ready),
      missing: rcMissing,
      detail: "Pulls actual subscriptions, MRR, customers, trials, and date-range revenue."
    }
  ];
}

function syncPanel(sync) {
  if (!sync) {
    return summaryPanel("Sync Center", [
      "Run Sync checks App Store Connect apps, Apple Ads campaigns, sales reports, and campaign reports.",
      "Incomplete credential groups are skipped instead of failing the dashboard."
    ]);
  }
  const summary = sync.summary || { ok: 0, skipped: 0, failed: 0 };
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Sync Center</h3>
        <span>${sync.mode || "partial"} · ${summary.ok} ok · ${summary.skipped} skipped · ${summary.failed} failed</span>
      </div>
      <div class="sync-results">
        ${(sync.results || []).map((result) => `
          <div class="sync-result ${result.state}">
            <i></i>
            <div>
              <strong>${result.name}</strong>
              <span>${result.message}</span>
            </div>
          </div>
        `).join("")}
      </div>
      ${syncHistoryList(state.syncHistory)}
    </section>
  `;
}

function syncHistoryList(runs) {
  if (!runs?.length) return "";
  return `
    <div class="sync-history">
      <strong>Recent Runs</strong>
      ${runs.slice(0, 5).map((run) => `
        <div class="sync-history-row">
          <span>${formatTime(run.completedAt || run.startedAt)}</span>
          <em>${run.mode || "partial"} · ${run.summary?.ok || 0} ok · ${run.summary?.skipped || 0} skipped · ${run.summary?.failed || 0} failed</em>
        </div>
      `).join("")}
    </div>
  `;
}

function adsView(data) {
  return `
    <div class="stack">
      ${appleAdsOptimizationPanel(data)}
      ${searchTermOptimizationPanel(data)}
      ${keywordBidOptimizationPanel(data)}
      ${campaignPerformancePanel(data)}
      ${campaignTable(data.campaigns)}
      ${keywordOpportunityPanel(data)}
    </div>
  `;
}

function asoView(data) {
  return `
    <div class="stack">
      ${asoOpportunityPanel(data)}
      ${asoKeywordMonitorPanel(data)}
      ${asoCompetitorPanel(data)}
    </div>
  `;
}

function rankRescueView(payload) {
  if (!payload || payload.error) {
    return `
      <div class="stack">
        ${rankRescueTargetPanel(payload)}
        <section class="panel">
          <div class="panel-header"><h3>Rank Rescue</h3><span>loading</span></div>
          <div class="empty">Rank Rescue data has not loaded yet.</div>
        </section>
      </div>
    `;
  }
  const current = payload.current || {};
  const app = payload.app || {};
  return `
    <div class="stack rank-rescue-view">
      ${rankRescueTargetPanel(payload)}
      <section class="panel rank-rescue-hero">
        <div class="panel-header">
          <h3>${escapeHtml(app.name || "Selected app")}</h3>
          <span>${escapeHtml(current.sourceRange || state.dateRange.endDate)} · ${escapeHtml(payload.mode || "partial")}</span>
        </div>
        <div class="rank-hero-grid">
          ${rankHeroCard("Sports rank", current.rankLabel || "unavailable", rankDeltaLabel(current.reportedDrop, "vs reported #60"), "rank")}
          ${rankHeroCard("Rating", current.ratingAverage ? `${Number(current.ratingAverage).toFixed(1)}★` : "unavailable", `${compactNumber(current.ratingCount || 0)} ratings`, "rating")}
          ${rankHeroCard("Paid installs", compactNumber(current.installVelocityProxy || 0), `${currency(current.paidSpendVelocity || 0)} spend`, "velocity")}
          ${rankHeroCard("ASO keywords", compactNumber(current.asoKeywordCount || 0), `${escapeHtml(payload.keywords?.country || "US")} · ${escapeHtml(payload.keywords?.device || "iPhone")}`, "keywords")}
        </div>
        <div class="rank-diagnosis">
          <strong>${rankDiagnosisTitle(current)}</strong>
          <p>${rankDiagnosisBody(current)}</p>
        </div>
      </section>
      ${rankRescueActionsPanel(payload)}
      <div class="rank-two-column">
        ${rankRescueKeywordPanel(payload.keywords)}
        ${rankRescueAdsPanel(payload.ads)}
      </div>
      ${rankRescueBlueprintPanel(payload.competitiveBlueprint)}
      ${rankRescueHistoryPanel(payload.history)}
      ${rankRescueSourcesPanel(payload)}
    </div>
  `;
}

function rankRescueTargetPanel(payload = {}) {
  const app = payload?.app || {};
  const customerWorkspaceUrl = `/aso-saas.html?appUrl=${encodeURIComponent(state.rankRescueForm.appUrl || app.storeUrl || "")}&country=${encodeURIComponent(state.rankRescueForm.country || app.country || "US")}&baselineRank=${encodeURIComponent(state.rankRescueForm.baselineRank || "60")}&keywords=${encodeURIComponent(state.rankRescueForm.keywords || "")}`;
  return `
    <section class="panel rank-target-panel">
      <div class="panel-header">
        <h3>Target App</h3>
        <span>${escapeHtml(app.appId || "paste App Store URL")} · ${escapeHtml(state.rankRescueForm.country || "US")}</span>
      </div>
      <div class="rank-preset-grid">
        ${rankRescuePresets.map((preset, index) => `
          <button type="button" data-rank-preset="${index}" class="${state.rankRescueForm.appUrl === preset.appUrl ? "active" : ""}">
            <strong>${escapeHtml(preset.name)}</strong>
            <span>${escapeHtml(preset.appUrl.match(/id(\d+)/)?.[1] || "App Store")}</span>
          </button>
        `).join("")}
      </div>
      <form id="rank-rescue-form" class="rank-target-form">
        <label>
          <span>App Store URL or app ID</span>
          <input name="appUrl" type="text" value="${escapeAttr(state.rankRescueForm.appUrl)}" placeholder="https://apps.apple.com/us/app/example/id123456789">
        </label>
        <label>
          <span>Country</span>
          <input name="country" type="text" maxlength="2" value="${escapeAttr(state.rankRescueForm.country)}">
        </label>
        <label>
          <span>Baseline rank</span>
          <input name="baselineRank" type="number" min="1" value="${escapeAttr(state.rankRescueForm.baselineRank)}">
        </label>
        <label class="wide">
          <span>Seed keywords</span>
          <textarea name="keywords" rows="2" placeholder="exact terms, competitor terms, campaign seeds">${escapeHtml(state.rankRescueForm.keywords)}</textarea>
        </label>
        <div class="rank-target-actions">
          <button class="button" type="submit">Analyze App</button>
          <a class="button secondary" href="${escapeAttr(customerWorkspaceUrl)}" target="_blank" rel="noreferrer">Open Customer Workspace</a>
        </div>
      </form>
    </section>
  `;
}

function rankHeroCard(label, value, detail, kind) {
  return `
    <article class="${kind}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <p>${escapeHtml(detail)}</p>
    </article>
  `;
}

function rankDeltaLabel(value, label) {
  if (!Number.isFinite(Number(value))) return "no local baseline yet";
  const delta = Number(value);
  if (delta > 0) return `+${delta} worse ${label}`;
  if (delta < 0) return `${Math.abs(delta)} better ${label}`;
  return `flat ${label}`;
}

function rankDiagnosisTitle(current) {
  if (current.ratingAverage && current.ratingAverage < 3.5) return "Main blocker: rating drag is likely hurting conversion and chart recovery.";
  if (current.categoryRank && current.categoryRank >= 80) return "Main blocker: Sports rank needs controlled install velocity.";
  return "Main blocker: keep collecting rank and conversion snapshots.";
}

function rankDiagnosisBody(current) {
  const parts = [];
  if (current.categoryRank) parts.push(`Current public chart signal is ${current.rankLabel} ${current.category || "Sports"}.`);
  if (current.reportedDrop > 0) parts.push(`The reported movement from #${current.reportedBaselineRank} to ${current.rankLabel} is a ${current.reportedDrop}-place slide.`);
  if (current.ratingAverage) parts.push(`Rating quality is ${Number(current.ratingAverage).toFixed(1)} from ${current.ratingCount || 0} ratings, so fix the early paywall complaint before pushing broad traffic.`);
  if (!parts.length) parts.push("Apple did not expose a public chart rank in this response, so the console is falling back to keyword/rating/ad context.");
  return parts.join(" ");
}

function rankRescueActionsPanel(payload) {
  const actions = payload.actions || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Rank Rescue Actions</h3><span>${actions.length} actions</span></div>
      <div class="rank-action-grid">
        ${actions.map((action) => `
          <article class="rank-action ${rankActionClass(action.priority)}">
            <div class="rank-action-top">
              <strong>${escapeHtml(action.title)}</strong>
              <span>${escapeHtml(action.type || action.priority)}</span>
            </div>
            <p>${escapeHtml(action.body)}</p>
            <code>${escapeHtml(action.metric || "")}</code>
            <em>${escapeHtml(action.action || "")}</em>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function rankActionClass(priority) {
  if (priority === "critical") return "critical";
  if (priority === "high") return "high";
  if (priority === "medium") return "medium";
  return "low";
}

function rankRescueKeywordPanel(keywords = {}) {
  const protectedRows = keywords.protected || [];
  const opportunities = keywords.opportunities || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Keyword Defense</h3><span>${protectedRows.length} protected · ${opportunities.length} opportunities</span></div>
      <div class="rank-list-block">
        <h4>Keep / Protect</h4>
        ${protectedRows.length ? protectedRows.map((row) => rankKeywordRow(row, "protect")).join("") : `<div class="empty small">No protected keyword rows yet.</div>`}
        <h4>Move Next</h4>
        ${opportunities.slice(0, 5).map((row) => rankKeywordRow(row, row.action)).join("") || `<div class="empty small">No keyword opportunities loaded.</div>`}
      </div>
    </section>
  `;
}

function rankKeywordRow(row, tone) {
  return `
    <div class="rank-keyword-row ${tone === "protect" || row.action === "defend" ? "protect" : ""}">
      <div>
        <strong>${escapeHtml(row.keyword)}</strong>
        <span>${escapeHtml(row.action)} · ${escapeHtml(row.rankLabel || "unranked")}</span>
      </div>
      <p>${escapeHtml(row.spendLabel || "$0.00")} · ${compactNumber(row.taps || 0)} taps · ${compactNumber(row.installs || 0)} installs</p>
    </div>
  `;
}

function rankRescueAdsPanel(ads = {}) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Apple Ads Split</h3><span>${ads.ready ? "live" : "waiting"}</span></div>
      <div class="rank-ad-split">
        ${rankAdSplitCard("Exact", ads.exact)}
        ${rankAdSplitCard("Broad", ads.broad)}
        ${rankAdSplitCard("Search terms", ads.searchTerms)}
      </div>
      <div class="rank-list-block">
        <h4>Campaign Rows</h4>
        ${(ads.campaigns || []).slice(0, 5).map((campaign) => `
          <div class="rank-keyword-row">
            <div><strong>${escapeHtml(campaign.name)}</strong><span>${escapeHtml(campaign.status || "UNKNOWN")}</span></div>
            <p>${escapeHtml(campaign.spend)} · ${escapeHtml(campaign.taps)} taps · ${escapeHtml(campaign.installs)} installs · ${escapeHtml(campaign.cpa)} CPI</p>
          </div>
        `).join("") || `<div class="empty small">No Apple Ads campaign row matched the selected app for this date range.</div>`}
      </div>
    </section>
  `;
}

function rankAdSplitCard(label, row = {}) {
  return `
    <article>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(row.spendLabel || "$0.00")}</strong>
      <p>${compactNumber(row.taps || 0)} taps · ${compactNumber(row.installs || 0)} installs · ${escapeHtml(row.cpiLabel || "$0.00")} CPI</p>
    </article>
  `;
}

function rankRescueBlueprintPanel(blueprint = {}) {
  const competitors = blueprint.competitors || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>ASO SaaS Reverse Engineering</h3><span>Appfigures / Astro blueprint</span></div>
      <div class="rank-blueprint-summary">
        <strong>${escapeHtml(blueprint.positioning || "Rank rescue playbooks for indie iOS developers.")}</strong>
        <p>${escapeHtml(blueprint.integrationDecision || "")}</p>
      </div>
      <div class="rank-blueprint-grid">
        ${competitors.map((competitor) => `
          <article>
            <div class="rank-action-top">
              <strong>${escapeHtml(competitor.name)}</strong>
              <span>reverse engineered</span>
            </div>
            <h4>Public signals</h4>
            ${rankMiniList(competitor.publicSignals)}
            <h4>Build in our MVP</h4>
            ${rankMiniList(competitor.cloneableMvp)}
            <p>${escapeHtml(competitor.differentiation || "")}</p>
          </article>
        `).join("")}
      </div>
      <div class="rank-module-row">
        ${(blueprint.subscriptionModules || []).map((module) => `<span>${escapeHtml(module)}</span>`).join("")}
      </div>
    </section>
  `;
}

function rankMiniList(items = []) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function rankRescueHistoryPanel(history = {}) {
  const rows = history.recent || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Rank History</h3><span>${escapeHtml(history.path || "data/rank-history.json")}</span></div>
      <div class="table-wrap">
        <table class="table rank-history-table">
          <thead><tr><th>Captured</th><th>Rank</th><th>Rating</th><th>Spend</th><th>Exact</th><th>Broad</th><th>Installs</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td><strong>${formatTime(row.timestamp)}</strong><code>${escapeHtml(row.date || "")}</code></td>
                <td>${row.categoryRank ? `#${row.categoryRank}` : "unavailable"}</td>
                <td>${row.ratingAverage ? `${Number(row.ratingAverage).toFixed(1)} · ${compactNumber(row.ratingCount || 0)}` : "unavailable"}</td>
                <td>${currency(row.totalSpend || 0)}</td>
                <td>${currency(row.exactSpend || 0)}</td>
                <td>${currency(row.broadSpend || 0)}</td>
                <td>${compactNumber(row.installs || 0)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      ${rows.length ? "" : `<div class="empty small">No rank snapshots have been saved yet.</div>`}
    </section>
  `;
}

function rankRescueSourcesPanel(payload) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Data Sources</h3><span>${payload.errors?.length ? `${payload.errors.length} partial issue${payload.errors.length === 1 ? "" : "s"}` : "ready"}</span></div>
      <div class="rank-source-grid">
        ${(payload.dataSources || []).map((source) => `
          <article>
            <strong>${escapeHtml(source.name)}</strong>
            <span>${escapeHtml(source.status)}</span>
            <p>${escapeHtml(source.detail)}</p>
          </article>
        `).join("")}
      </div>
      ${(payload.errors || []).length ? `<div class="rank-error-list">${payload.errors.map((error) => `<code>${escapeHtml(error.source)}: ${escapeHtml(error.message)}</code>`).join("")}</div>` : ""}
    </section>
  `;
}

function asoSaasView(payload) {
  if (!payload || payload.error) {
    return `
      <div class="stack">
        ${asoSaasOnboardingPanel()}
        <section class="panel"><div class="empty">Keyword discovery has not loaded yet.</div></section>
      </div>
    `;
  }
  const app = payload.app || {};
  const current = payload.current || {};
  const keywords = payload.keywords || {};
  return `
    <div class="stack aso-saas-view aso-keyword-workbench">
      ${asoSaasOnboardingPanel()}
      <section class="panel saas-hero aso-focus-hero">
        <div class="panel-header">
          <h3>${escapeHtml(app.name || "App Store app")}</h3>
          <span>${escapeHtml(app.category || "App Store")} · ${escapeHtml(app.country || "US")} · ${escapeHtml(payload.mode || "partial")}</span>
        </div>
        <div class="rank-hero-grid">
          ${rankHeroCard("Primary category", escapeHtml(app.category || "unknown"), "App Store listing", "rank")}
          ${rankHeroCard("Rating", current.ratingAverage ? `${Number(current.ratingAverage).toFixed(1)}★` : "unavailable", `${compactNumber(current.ratingCount || 0)} ratings`, "rating")}
          ${rankHeroCard("Keyword ideas", compactNumber(current.trackedKeywords || 0), `${compactNumber(current.rankedKeywords || 0)} already ranked`, "keywords")}
          ${rankHeroCard("Campaign status", payload.ads?.ready ? "ads linked" : "no campaign needed", "discovery works pre-campaign", "velocity")}
        </div>
        <div class="rank-diagnosis">
          <strong>Find keywords before spending on Apple Ads.</strong>
          <p>Use exact-test keywords for new campaigns, broad seeds for exploration, and metadata terms for the App Store Connect keyword field. Existing campaign data is optional.</p>
        </div>
      </section>
      ${asoCampaignKeywordDiscoveryPanel(payload)}
      <div class="rank-two-column">
        ${asoSaasKeywordPanel(keywords)}
        ${asoKeywordFieldOptimizerPanel(payload.metadata?.keywordFieldPlan || {})}
      </div>
      ${asoSaasCompetitorPanel(payload.competitors)}
    </div>
  `;
}

function asoSaasOnboardingPanel() {
  return `
    <section class="panel saas-onboarding">
      <div class="panel-header"><h3>Keyword Discovery</h3><span>single app focus</span></div>
      <form id="aso-saas-form" class="saas-form">
        <label><span>App Store URL</span><input name="appUrl" type="url" value="${escapeAttr(state.asoSaasForm.appUrl)}"></label>
        <label><span>Country</span><input name="country" type="text" maxlength="2" value="${escapeAttr(state.asoSaasForm.country)}"></label>
        <label class="wide"><span>Seed keywords</span><input name="keywords" type="text" value="${escapeAttr(state.asoSaasForm.keywords)}" placeholder="optional: plant identifier, plant care, botany"></label>
        <button class="button" type="submit">Find Keywords</button>
      </form>
    </section>
  `;
}

function asoCampaignKeywordDiscoveryPanel(payload = {}) {
  const buckets = asoCampaignKeywordBuckets(payload);
  const exportRows = asoKeywordExportRows(buckets);
  return `
    <section class="panel aso-campaign-discovery">
      <div class="panel-header">
        <h3>Campaign Keyword Ideas</h3>
        <span>works before campaigns exist</span>
      </div>
      <div class="aso-copy-toolbar">
        <button class="button secondary" type="button" data-copy-keyword-bucket="all">Copy All</button>
        <button class="button secondary" type="button" data-copy-keyword-bucket="exact">Copy Exact</button>
        <button class="button secondary" type="button" data-copy-keyword-bucket="broad">Copy Broad</button>
        <button class="button secondary" type="button" data-copy-keyword-bucket="metadata">Copy Metadata</button>
        <button class="button secondary" type="button" data-copy-keyword-bucket="competitors">Copy Competitors</button>
      </div>
      <div class="aso-paste-box">
        <div class="rank-action-top">
          <strong>Campaign paste list</strong>
          <span>${exportRows.length} unique keywords · comma separated</span>
        </div>
        <textarea readonly data-keyword-export="all">${escapeHtml(formatKeywordExport(exportRows))}</textarea>
      </div>
      <div class="aso-discovery-grid">
        ${asoDiscoveryBucket("Exact tests", "exact", buckets.exact, "Start small exact campaigns. Keep budget capped until installs prove intent.")}
        ${asoDiscoveryBucket("Broad discovery seeds", "broad", buckets.broad, "Use these only in low-budget discovery ad groups to mine search terms.")}
        ${asoDiscoveryBucket("Metadata candidates", "metadata", buckets.metadata, "Best candidates for App Store Connect subtitle or keyword field.")}
        ${asoDiscoveryBucket("Competitor terms", "competitors", buckets.competitors, "Terms competitors rank for; test exact before making metadata changes.")}
      </div>
    </section>
  `;
}

function asoCampaignKeywordBuckets(payload = {}) {
  const rows = payload.keywords?.rows || [];
  const metadataTerms = payload.metadata?.keywordFieldPlan?.selectedTerms || [];
  const competitorTerms = [];
  for (const competitor of payload.competitors || []) {
    for (const keyword of competitor.keywords || []) {
      competitorTerms.push({
        keyword: keyword.keyword,
        rankLabel: `#${keyword.rank}`,
        action: competitor.name,
        traffic: 0,
        complexity: ""
      });
    }
  }
  const exact = rows
    .filter((row) => row.keyword && !/calculator|estimate|project planner/i.test(row.keyword))
    .sort((a, b) => Number(b.traffic || 0) - Number(a.traffic || 0))
    .slice(0, 8);
  const broad = rows
    .filter((row) => row.keyword && row.keyword.split(/\s+/).length <= 2 && !/calculator|estimate/i.test(row.keyword))
    .slice(0, 8);
  const metadata = metadataTerms.length
    ? metadataTerms.map((term) => ({ keyword: term.term || term, rankLabel: "metadata", action: term.reason || "keyword field" }))
    : rows.slice(0, 8);
  return {
    all: rows.filter((row) => row.keyword && !/calculator|estimate|project planner/i.test(row.keyword)),
    exact,
    broad,
    metadata,
    competitors: uniqueKeywordObjects(competitorTerms).slice(0, 8)
  };
}

function asoKeywordExportRows(buckets = {}, bucketName = "all") {
  const bucketRows = bucketName === "all"
    ? [...(buckets.all || []), ...(buckets.metadata || []), ...(buckets.competitors || [])]
    : buckets[bucketName] || [];
  const seen = new Set();
  const rows = [];
  for (const row of bucketRows) {
    const keyword = String(row.keyword || row.term || "").trim();
    const key = normalizeKey(keyword);
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    rows.push(keyword);
  }
  return rows;
}

function asoDiscoveryBucket(title, bucketName, rows = [], note = "") {
  return `
    <article>
      <div class="rank-action-top">
        <strong>${escapeHtml(title)}</strong>
        <span>${rows.length} ideas</span>
      </div>
      <button class="keyword-copy-button" type="button" data-copy-keyword-bucket="${escapeHtml(bucketName)}">Copy ${escapeHtml(title)}</button>
      <p>${escapeHtml(note)}</p>
      <div class="aso-discovery-list">
        ${rows.map((row) => `
          <div>
            <strong>${escapeHtml(row.keyword || row.term || "")}</strong>
            <span>${escapeHtml(row.rankLabel || row.action || "test")} · ${row.traffic ? compactNumber(row.traffic) : escapeHtml(row.action || "keyword")}</span>
          </div>
        `).join("") || `<em>No terms yet. Add seed keywords and run discovery.</em>`}
      </div>
    </article>
  `;
}

function uniqueKeywordObjects(rows = []) {
  const seen = new Set();
  return rows.filter((row) => {
    const key = normalizeKey(row.keyword || row.term || "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asoSaasSignupPanel(payload = {}) {
  const workspaces = payload.workspaces?.workspaces || [];
  const storage = payload.workspaces?.storage || {};
  const launchReadiness = payload.workspaces?.launchReadiness || {};
  const readinessChecks = launchReadiness.checks || [];
  const result = state.asoSignupResult;
  return `
    <section class="panel saas-signup">
      <div class="panel-header"><h3>Customer Signup</h3><span>${workspaces.length} workspaces · ${escapeHtml(storage.mode || "local-json")}</span></div>
      <div class="rank-source-grid compact">
        <article><strong>Workspace storage</strong><span>${escapeHtml(storage.configured ? storage.workspacesTable || "Supabase" : storage.localWorkspacePath || "local JSON")}</span></article>
        <article><strong>Notification store</strong><span>${escapeHtml(storage.configured ? storage.notificationsTable || "Supabase" : storage.localNotificationOutboxPath || "local outbox")}</span></article>
      </div>
      <div class="launch-readiness">
        <div class="rank-action-top">
          <strong>Launch Readiness</strong>
          <span>${escapeHtml(launchReadiness.mode || "setup-required")} · ${escapeHtml(launchReadiness.readyRequired || 0)}/${escapeHtml(launchReadiness.requiredCount || 0)} required</span>
        </div>
        <div class="workspace-list readiness-list">
          ${readinessChecks.map((check) => `
            <article class="${check.ready ? "ready" : ""}">
              <div class="rank-action-top">
                <strong>${escapeHtml(check.label || check.key)}</strong>
                <span>${check.ready ? "ready" : check.required ? "required" : "optional"}</span>
              </div>
              <p>${escapeHtml(check.detail || "")}</p>
              <code>${escapeHtml(check.key || "")}</code>
            </article>
          `).join("")}
        </div>
      </div>
      <form id="aso-signup-form" class="saas-form signup-form">
        <label><span>Email</span><input name="email" type="email" value="${escapeAttr(state.asoSignupForm.email)}" placeholder="founder@app.com" required></label>
        <label><span>Company</span><input name="company" type="text" value="${escapeAttr(state.asoSignupForm.company)}" placeholder="Studio name"></label>
        <label><span>SMS phone</span><input name="phone" type="tel" value="${escapeAttr(state.asoSignupForm.phone)}" placeholder="+13135551212"></label>
        <label><span>Plan</span><select name="plan">
          ${["Rescue", "Growth", "Studio"].map((plan) => `<option value="${plan}"${state.asoSignupForm.plan === plan ? " selected" : ""}>${plan}</option>`).join("")}
        </select></label>
        <button class="button" type="submit">Create Trial Workspace</button>
      </form>
      ${result?.saved ? `
        <div class="signup-result">
          <strong>Workspace ${escapeHtml(result.workspace.id)} created</strong>
          <p>${escapeHtml(result.workspace.checkout?.message || "Local trial created.")}</p>
          <code>${escapeHtml(result.workspace.plan)} · ${escapeHtml(result.workspace.status)} · trial ends ${escapeHtml(formatDate(result.workspace.trialEndsAt))}</code>
          ${result.access?.url ? `<a class="button secondary" href="${escapeAttr(result.access.url)}" target="_blank" rel="noreferrer">Open Customer Workspace</a>` : ""}
          ${result.workspace.checkout?.checkoutUrl ? `<a class="button secondary" href="${escapeAttr(result.workspace.checkout.checkoutUrl)}" target="_blank" rel="noreferrer">Open Stripe Checkout</a>` : ""}
        </div>
      ` : ""}
      <div class="workspace-list">
        ${workspaces.slice(0, 5).map((workspace) => `
          <article>
            <div class="rank-action-top">
              <strong>${escapeHtml(workspace.email)}</strong>
              <span>${escapeHtml(workspace.plan)}</span>
            </div>
            <p>${escapeHtml(workspace.company || "No company")} · ${escapeHtml(workspace.country || "US")} · ${workspace.keywords.length} keywords · ${escapeHtml(workspace.checkoutMode)}</p>
            <code>${escapeHtml(workspace.id)} · app ${escapeHtml(workspace.appId || "unknown")}</code>
          </article>
        `).join("") || `<div class="empty small">No customer workspaces yet. Create a trial workspace to test the signup path.</div>`}
      </div>
    </section>
  `;
}

function asoSaasActionPanel(actions = []) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Customer Action Queue</h3><span>${actions.length} recommendations</span></div>
      <div class="rank-action-grid">
        ${actions.map((action) => `
          <article class="rank-action ${rankActionClass(action.priority)}">
            <div class="rank-action-top">
              <strong>${escapeHtml(action.title)}</strong>
              <span>${escapeHtml(action.type || action.priority)}</span>
            </div>
            <p>${escapeHtml(action.body)}</p>
            <code>${escapeHtml(action.metric || "")}</code>
            <em>${escapeHtml(action.action || "")}</em>
          </article>
        `).join("") || `<div class="empty small">No action queue yet.</div>`}
      </div>
    </section>
  `;
}

function asoSaasKeywordPanel(keywords = {}) {
  const rows = keywords.rows || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Keyword Table</h3><span>${rows.length} ideas · ${escapeHtml(keywords.country || "US")}</span></div>
      <div class="table-wrap">
        <table class="table aso-table">
          <thead><tr><th>Keyword</th><th>Rank</th><th>Traffic</th><th>Complexity</th><th>Action</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td class="aso-keyword-cell"><strong>${escapeHtml(row.keyword)}</strong><span>${row.ads?.installs || 0} installs · ${row.ads?.spendLabel || "$0.00"}</span></td>
                <td><span class="rank-pill ${row.rank ? "ranked" : ""}">${escapeHtml(row.rankLabel || ">50")}</span></td>
                <td>${compactNumber(row.traffic || 0)}</td>
                <td>${escapeHtml(row.complexity || "")}</td>
                <td class="aso-action-cell" title="${escapeHtml(row.recommendation || "")}"><span class="tag ${row.action === "watch" ? "" : ""}">${escapeHtml(row.action === "watch" ? "test exact" : row.action || "test exact")}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function asoKeywordFieldOptimizerPanel(plan = {}) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Keyword Field Draft</h3><span>${escapeHtml(plan.length || 0)}/100 chars</span></div>
      <div class="keyword-field-plan">
        <textarea readonly>${escapeHtml(plan.optimized || "")}</textarea>
        <div class="keyword-field-term-list">
          ${(plan.selectedTerms || []).map((term) => `<span>${escapeHtml(term.term || term)}</span>`).join("")}
        </div>
        <p>${escapeHtml(plan.note || "Copy this into App Store Connect after reviewing title/subtitle duplicates.")}</p>
      </div>
    </section>
  `;
}

function asoSaasAdsPanel(ads = {}) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Apple Ads Correlation</h3><span>${ads.ready ? "connected" : "optional"}</span></div>
      <div class="rank-ad-split">
        ${rankAdSplitCard("Total", ads.total)}
        ${rankAdSplitCard("Exact", ads.exact)}
        ${rankAdSplitCard("Broad", ads.broad)}
      </div>
      <div class="rank-list-block">
        <h4>Matched Campaigns</h4>
        ${(ads.campaigns || []).map((campaign) => `
          <div class="rank-keyword-row">
            <div><strong>${escapeHtml(campaign.name)}</strong><span>${escapeHtml(campaign.status || "UNKNOWN")}</span></div>
            <p>${escapeHtml(campaign.spend || "$0.00")} · ${escapeHtml(campaign.taps || "0")} taps · ${escapeHtml(campaign.installs || "0")} installs · ${escapeHtml(campaign.cpa || "$0.00")} CPI</p>
          </div>
        `).join("") || `<div class="empty small">Apple Ads is optional for prospects; connected customers get exact/broad split and search-term actions here.</div>`}
      </div>
    </section>
  `;
}

function asoSaasCompetitorPanel(competitors = []) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Competitor Keyword Snapshot</h3><span>${competitors.length} competitors</span></div>
      <div class="saas-competitor-grid">
        ${competitors.slice(0, 8).map((competitor) => `
          <article>
            <div class="rank-action-top">
              <strong>${escapeHtml(competitor.name)}</strong>
              <span>${competitor.appearances} overlaps</span>
            </div>
            <p>${escapeHtml(competitor.genre || "App Store")} · avg rank ${escapeHtml(competitor.averageRank)} · ${Number(competitor.rating || 0).toFixed(1)}★</p>
            <div class="rank-module-row">
              ${(competitor.keywords || []).slice(0, 4).map((keyword) => `<span>${escapeHtml(keyword.keyword)} #${escapeHtml(keyword.rank)}</span>`).join("")}
            </div>
          </article>
        `).join("") || `<div class="empty small">No competitor overlap loaded.</div>`}
      </div>
    </section>
  `;
}

function asoSaasPricingPanel(product = {}) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Go-To-Market Package</h3><span>subscription ready</span></div>
      <div class="rank-blueprint-summary">
        <strong>${escapeHtml(product.buyer || "")}</strong>
        <p>${escapeHtml(product.wedge || "")}</p>
      </div>
      <div class="saas-tier-grid">
        ${(product.tiers || []).map((tier) => `
          <article>
            <span>${escapeHtml(tier.name)}</span>
            <strong>${escapeHtml(tier.price)}</strong>
            <p>${escapeHtml(tier.includes)}</p>
          </article>
        `).join("")}
      </div>
      <div class="rank-module-row">
        ${(product.mustHaveMvp || []).map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
    </section>
  `;
}

function asoSaasReverseEngineeringPanel(blueprint = {}) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Appfigures / Astro Teardown</h3><span>safe build path</span></div>
      <div class="rank-blueprint-summary">
        <strong>${escapeHtml(blueprint.positioning || "")}</strong>
        <p>${escapeHtml(blueprint.integrationDecision || "")}</p>
      </div>
      <div class="rank-blueprint-grid">
        ${(blueprint.competitors || []).map((competitor) => `
          <article>
            <div class="rank-action-top"><strong>${escapeHtml(competitor.name)}</strong><span>reference</span></div>
            <h4>Public signals</h4>
            ${rankMiniList(competitor.publicSignals)}
            <h4>Cloneable workflow</h4>
            ${rankMiniList(competitor.cloneableMvp)}
            <p>${escapeHtml(competitor.differentiation || "")}</p>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function asoSaasSourcesPanel(payload) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Data Sources</h3><span>${payload.errors?.length ? `${payload.errors.length} partial issue${payload.errors.length === 1 ? "" : "s"}` : "ready"}</span></div>
      <div class="rank-source-grid">
        ${(payload.dataSources || []).map((source) => `
          <article>
            <strong>${escapeHtml(source.name)}</strong>
            <span>${escapeHtml(source.status)}</span>
            <p>${escapeHtml(source.detail)}</p>
          </article>
        `).join("")}
      </div>
      ${(payload.errors || []).length ? `<div class="rank-error-list">${payload.errors.map((error) => `<code>${escapeHtml(error.source)}: ${escapeHtml(error.message)}</code>`).join("")}</div>` : ""}
    </section>
  `;
}

function storeView(data) {
  return `
    <div class="stack">
      ${storeGrowthPanel(data)}
      ${appStoreActualAccessPanel(data)}
      ${unitEconomicsPanel(data)}
      ${assumptionsPanel()}
      ${subscriberRevenuePanel(data)}
    </div>
  `;
}

function asoOpportunityPanel(data) {
  const aso = data.asoKeywordMonitor || {};
  const opportunities = aso.opportunities || [];
  const keywords = aso.keywords || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>ASO Opportunity Agent</h3>
        <span>${keywords.length} keywords · ${aso.country || "US"} · ${aso.source === "apple-search-api" ? "Apple Search API" : "local"}</span>
      </div>
      <div class="recommendation-grid">
        ${opportunities.slice(0, 6).map((row) => `
          <article class="recommendation ${asoPriority(row)}">
            <div class="recommendation-top">
              <strong>${escapeHtml(asoActionTitle(row))}</strong>
              <span>${escapeHtml(row.action)}</span>
            </div>
            <p>${escapeHtml(row.recommendation)}</p>
            <code>${row.rankLabel} rank · ${row.ads.installs} installs · ${row.ads.taps} taps · ${row.ads.spendLabel} spend</code>
          </article>
        `).join("") || `<article class="recommendation low"><div class="recommendation-top"><strong>Keep monitoring</strong><span>watch</span></div><p>No high-confidence organic keyword opportunity is available yet. The monitor will improve as Apple Ads search-term data grows.</p><code>waiting for signal</code></article>`}
      </div>
    </section>
  `;
}

function asoKeywordMonitorPanel(data) {
  const rows = data.asoKeywordMonitor?.keywords || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>ASO Keyword Monitor</h3>
        <span>${rows.length} ranked keywords</span>
      </div>
      <div class="table-wrap">
        <table class="table aso-table">
          <thead><tr><th>Keyword</th><th>Rank</th><th>Traffic</th><th>Complexity</th><th>Effectiveness</th><th>Search Ads</th><th>Apps</th><th>Action</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr>
                <td class="aso-keyword-cell">
                  <strong>${escapeHtml(row.keyword)}</strong>
                  <span>${row.ads.installs} installs · ${row.ads.taps} taps · ${row.ads.spendLabel}</span>
                </td>
                <td><span class="rank-pill ${row.rank ? "ranked" : ""}">${escapeHtml(row.rankLabel)}</span></td>
                <td>${compactNumber(row.traffic)}</td>
                <td>${row.complexity}</td>
                <td><span class="effectiveness-bar"><i style="width:${Math.min(100, row.effectivenessScore / 3)}%"></i></span>${escapeHtml(row.effectiveness)}</td>
                <td>${compactNumber(row.searchAds)}</td>
                <td>${compactNumber(row.apps)}</td>
                <td class="aso-action-cell" title="${escapeHtml(row.recommendation)}"><span class="tag ${row.action === "watch" ? "paused" : ""}">${escapeHtml(row.action)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      ${rows.length ? "" : `<div class="empty">No ASO keyword rows yet. Live Apple Ads search terms or default seed terms will populate this page after refresh.</div>`}
    </section>
  `;
}

function asoCompetitorPanel(data) {
  const rows = (data.asoKeywordMonitor?.keywords || []).slice(0, 6);
  return `
    <section class="panel">
      <div class="panel-header"><h3>Organic Competitor Snapshot</h3><span>top App Store results</span></div>
      <div class="aso-competitor-grid">
        ${rows.map((row) => `
          <article class="aso-competitor-card">
            <div>
              <strong>${escapeHtml(row.keyword)}</strong>
              <span>Your best rank: ${escapeHtml(row.rankLabel)}</span>
            </div>
            <ol>
              ${row.topApps.slice(0, 3).map((app) => `
                <li><b>#${app.rank}</b><span>${escapeHtml(app.name)}</span><em>${escapeHtml(app.genre || "App Store")}</em></li>
              `).join("")}
            </ol>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function asoPriority(row) {
  if (row.action === "add-to-metadata" || row.action === "improve-rank") return "high";
  if (row.action === "test-exact" || row.action === "defend") return "medium";
  return "low";
}

function asoActionTitle(row) {
  const titles = {
    "add-to-metadata": `Add to metadata: ${row.keyword}`,
    "improve-rank": `Improve organic rank: ${row.keyword}`,
    defend: `Defend top rank: ${row.keyword}`,
    "ads-only-test": `Keep ads-only test: ${row.keyword}`,
    "test-exact": `Test exact match: ${row.keyword}`,
    watch: `Watch: ${row.keyword}`
  };
  return titles[row.action] || `Review: ${row.keyword}`;
}

function ascAppsPanel(data) {
  const apps = data.ascApps || [];
  if (!apps.length) {
    return `
      <div class="panel">
        <div class="panel-header"><h3>App Store Connect Apps</h3><span>${data.mode}</span></div>
        <div class="empty">Live app metadata will appear here after <code>ASC_ISSUER_ID</code> and <code>ASC_PRIVATE_KEY_PATH</code> are configured.</div>
      </div>
    `;
  }
  return `
    <section class="panel">
      <div class="panel-header"><h3>App Store Connect Apps</h3><span>${apps.length} live apps</span></div>
      <div class="table-wrap">
        <table class="table asc-apps-table">
          <thead><tr><th>App</th><th>Bundle ID</th><th>SKU</th><th>Locale</th><th>Purchasing</th></tr></thead>
          <tbody>
            ${apps.map((app) => `
              <tr>
                <td><strong>${escapeHtml(app.name)}</strong><code>${escapeHtml(app.id)}</code></td>
                <td>${escapeHtml(app.bundleId)}</td>
                <td>${escapeHtml(app.sku)}</td>
                <td>${escapeHtml(app.primaryLocale)}</td>
                <td><span class="tag ${app.purchasing ? "" : "paused"}">${app.purchasing ? "ON" : "OFF"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function growthBriefPanel(data) {
  const spend = kpiValue(data, "Ad Spend");
  const installs = kpiValue(data, "Installs");
  const taps = kpiValue(data, "Taps");
  const economics = unitEconomics(data);
  return summaryPanel("Growth Brief", [
    `${data.campaigns.length} live campaigns are active in Apple Ads.`,
    `${spend} spend produced ${taps} taps and ${installs} installs in the latest campaign report.`,
    `${economics.revenueSourceLabel}: ${currency(economics.grossRevenue)} gross revenue, ${currency(economics.netRevenue)} after Apple fee, ${currency(economics.profit)} left after ad spend.`,
    "Keyword and search-term recommendations are based on live Apple Ads rows; profit uses RevenueCat date-range revenue where connected."
  ]);
}

function unitEconomicsPanel(data) {
  const economics = unitEconomics(data);
  const appRows = appProfitRows(data);
  return `
    <section class="panel unit-economics-panel">
      <div class="panel-header">
        <h3>Daily Profit</h3>
        <span>${state.dateRange.startDate} to ${state.dateRange.endDate} · RevenueCat + Apple Ads</span>
      </div>
      <div class="store-metric-grid">
        <article><span>RevenueCat Gross</span><strong>${currency(economics.grossRevenue)}</strong><p>Actual connected RevenueCat revenue for the selected date range.</p></article>
        <article><span>Apple Cut</span><strong>${currency(economics.appleShare)}</strong><p>${percentFromFraction(state.assumptions.appleFeeRate)} platform share estimate.</p></article>
        <article><span>Net After Apple</span><strong>${currency(economics.netRevenue)}</strong><p>Estimated proceeds before ad spend, taxes, refunds, and timing adjustments.</p></article>
        <article><span>Ad Spend</span><strong>${currency(economics.spend)}</strong><p>Live Apple Ads spend for the selected date range.</p></article>
        <article><span>Gross Profit</span><strong>${currency(economics.profit)}</strong><p>Amount left after Apple fee and Apple Ads spend.</p></article>
        <article><span>Cash Coverage</span><strong>${economics.roasLabel}</strong><p>After-Apple revenue divided by ad spend. Gross profit is the decision metric.</p></article>
      </div>
      <div class="optimization-list">
        ${appRows.map((row) => `
          <article class="optimization-item">
            <div>
              <strong>${escapeHtml(row.app)}</strong>
              <span>${row.revenueReady ? "RevenueCat live" : "Revenue unavailable"} · ${row.campaignCount} campaign${row.campaignCount === 1 ? "" : "s"}</span>
            </div>
            <div class="optimization-metrics">
              <span>${currency(row.grossRevenue)} gross</span>
              <span>${currency(row.netRevenue)} after Apple</span>
              <span>${currency(row.spend)} ads</span>
              <span>${row.revenueReady ? currency(row.profit) : "n/a"} gross profit</span>
            </div>
          </article>
        `).join("") || `<div class="empty small">No RevenueCat projects or Apple Ads campaigns are connected for this range.</div>`}
      </div>
    </section>
  `;
}

function campaignPerformancePanel(data) {
  const campaigns = data.campaigns || [];
  const maxSpend = Math.max(...campaigns.map((campaign) => parseMoney(campaign.spend)), 1);
  return `
    <section class="panel performance-panel">
      <div class="panel-header">
        <h3>Bid Optimization Matrix</h3>
        <span>spend, installs, CPI, app gross profit</span>
      </div>
      <div class="performance-list">
        ${campaigns.map((campaign) => campaignPerformanceRow(campaign, maxSpend, data)).join("")}
      </div>
    </section>
  `;
}

function campaignPerformanceRow(campaign, maxSpend, data) {
  const spend = parseMoney(campaign.spend);
  const installs = parseNumber(campaign.installs);
  const taps = parseNumber(campaign.taps);
  const cpi = parseMoney(campaign.cpa);
  const appProfit = appProfitForCampaign(data, campaign);
  const recommendation = campaignBidRecommendation({ campaign, spend, installs, taps, cpi, appProfit });
  return `
    <article class="performance-row ${recommendation.priority}">
      <div class="performance-main">
        <strong>${escapeHtml(campaign.name)}</strong>
        <span>${escapeHtml(campaign.app || "Apple Ads campaign")} · ${escapeHtml(campaign.status)}</span>
      </div>
      <div class="spend-bar" aria-label="${escapeAttr(campaign.spend)} spend">
        <i style="width:${Math.max(3, Math.round((spend / maxSpend) * 100))}%"></i>
      </div>
      <div class="performance-metrics">
        <span><b>${campaign.spend}</b> spend</span>
        <span><b>${campaign.taps}</b> taps</span>
        <span><b>${campaign.installs}</b> installs</span>
        <span><b>${campaign.cpa}</b> CPI</span>
        <span><b>${appProfit?.revenueReady ? currency(appProfit.profit) : "n/a"}</b> app profit</span>
      </div>
      <p>${recommendation.text}</p>
    </article>
  `;
}

function campaignBidRecommendation({ campaign, spend, installs, taps, cpi, appProfit }) {
  const hasRevenue = Boolean(appProfit?.revenueReady);
  const appProfitValue = Number(appProfit?.profit || 0);
  const appSpend = Number(appProfit?.spend || 0);
  if (hasRevenue && appProfitValue < 0 && spend > 0) {
    return {
      priority: taps >= 10 && installs === 0 ? "high" : "medium",
      text: `${appProfit.app} is negative after Apple fee and ads (${currency(appProfitValue)}). Do not scale this campaign; cut bids or pause rows that are not producing profitable installs.`
    };
  }
  if (!installs && taps >= 10) {
    return {
      priority: "high",
      text: "This campaign has 10+ taps and 0 installs. Pause it or pause the parent ad group until search terms prove buying intent."
    };
  }
  if (!installs && taps > 0) {
    return {
      priority: "medium",
      text: "Taps are not becoming installs. Pull search terms, add negatives, and lower broad-match bids before spending more."
    };
  }
  if (hasRevenue && appProfitValue > 0 && installs > 0 && cpi > 0 && cpi <= state.assumptions.targetCpi) {
    return {
      priority: "high",
      text: `${appProfit.app} is positive after Apple fee and ads (${currency(appProfitValue)}). Protect this campaign and scale only in small budget steps while the app stays profit-positive.`
    };
  }
  if (cpi >= state.assumptions.targetCpi && installs > 0) {
    return {
      priority: "medium",
      text: `CPI is above the ${currency(state.assumptions.targetCpi)} target. Split exact-match winners from discovery and reduce max CPT unless app gross profit keeps covering the spend.`
    };
  }
  if (!spend) {
    return {
      priority: "low",
      text: "No spend yet in this date range. Keep the campaign enabled, but do not judge optimization until it has taps."
    };
  }
  if (!hasRevenue && appSpend > 0) {
    return {
      priority: "medium",
      text: "RevenueCat revenue is unavailable for this app, so do not scale from CPI alone. Connect revenue or wait for app-level gross profit before adding budget."
    };
  }
  return {
    priority: "low",
    text: "Keep collecting data, then move budget toward campaigns attached to profit-positive apps with clean converting search terms."
  };
}

function nextActionsPanel(data) {
  return summaryPanel("Agent Next Actions", growthActions(data).slice(0, 4).map((item) => item.title));
}

function adsGrowthRecommendations(data) {
  const actions = growthActions(data);
  return `
    <section class="panel">
      <div class="panel-header"><h3>Apple Ads Growth Agent</h3><span>${actions.length} recommendations</span></div>
      <div class="recommendation-grid">
        ${actions.map((action) => `
          <article class="recommendation ${action.priority}">
            <div class="recommendation-top">
              <strong>${action.title}</strong>
              <span>${action.priority}</span>
            </div>
            <p>${action.body}</p>
            <code>${action.metric}</code>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function appleAdsOptimizationPanel(data) {
  const insights = data.appleAdsInsights || {};
  const allActions = insights.recommendations?.length ? insights.recommendations : growthActions(data);
  const actions = allActions.filter((action) => !isOptimizationComplete(action));
  const completedCount = allActions.length - actions.length;
  const keywordCount = insights.keywords?.length || 0;
  const searchTermCount = insights.searchTerms?.length || 0;
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Apple Ads Optimizer</h3>
        <span>${keywordCount} keywords · ${searchTermCount} search terms${completedCount ? ` · ${completedCount} completed hidden` : ""}</span>
      </div>
      <div class="recommendation-grid">
        ${actions.map((action) => {
          const key = optimizationActionKey(action);
          return `
          <article class="recommendation ${action.priority}">
            <div class="recommendation-top">
              <strong>${escapeHtml(action.title)}</strong>
              <span>${action.priority}</span>
            </div>
            <p>${escapeHtml(action.body)}</p>
            <code>${escapeHtml(action.metric)}</code>
            <button class="optimization-complete-button" type="button" data-complete-optimization="${escapeAttr(key)}" data-complete-title="${escapeAttr(action.title || "Optimization")}">Mark Complete</button>
          </article>
        `;
        }).join("") || `<div class="empty small">All current optimizer tasks are marked complete.</div>`}
      </div>
      ${completedCount ? `<div class="optimizer-complete-summary"><span>${completedCount} completed recommendation${completedCount === 1 ? "" : "s"} hidden.</span><button class="button secondary" type="button" data-clear-completed-optimizations>Show Again</button></div>` : ""}
      ${insights.ready ? "" : `<div class="empty small">Campaign reporting is live, but Apple has not returned keyword/search-term rows for this date range yet.</div>`}
    </section>
  `;
}

function searchTermOptimizationPanel(data) {
  const allRows = data.appleAdsInsights?.searchTerms || [];
  const exactKeywordKeys = exactKeywordLookup(data.appleAdsInsights?.keywords || []);
  const campaigns = searchTermCampaignOptions(allRows);
  if (state.adsCampaignFilter !== "all" && !campaigns.some((campaign) => campaign.name === state.adsCampaignFilter)) {
    state.adsCampaignFilter = "all";
  }
  const rows = state.adsCampaignFilter === "all"
    ? allRows
    : allRows.filter((row) => row.campaignName === state.adsCampaignFilter);
  const promote = rows
    .filter((row) => row.installs > 0)
    .map((row) => ({
      ...row,
      exactExists: exactKeywordKeys.has(exactLookupKey(row.campaignName, row.searchTerm || row.term)),
      recommendation: exactKeywordKeys.has(exactLookupKey(row.campaignName, row.searchTerm || row.term))
        ? "Already exists as an exact keyword. Do not add it again; protect it and adjust bid from the keyword row."
        : row.recommendation
    }))
    .slice(0, 6);
  const negatives = rows.filter((row) => row.taps > 0 && row.installs === 0).slice(0, 6);
  return `
    <section class="panel">
      <div class="panel-header search-term-header">
        <div>
          <h3>Search Term Actions</h3>
          <span>${rows.length}/${allRows.length} live rows · ${state.adsCampaignFilter === "all" ? "all campaigns" : escapeHtml(state.adsCampaignFilter)}</span>
        </div>
        ${searchTermCampaignFilter(campaigns)}
      </div>
      ${rows.length ? `
        ${searchTermCampaignBreakdown(campaigns, state.adsCampaignFilter)}
        <div class="optimization-columns">
          <div>
            <h4>Promote To Exact</h4>
            ${optimizationList(promote, "searchTerm", "No converting search terms yet.")}
          </div>
          <div>
            <h4>Negative / Bid Cut Review</h4>
            ${optimizationList(negatives, "searchTerm", "No wasted search terms in this range.")}
          </div>
        </div>
      ` : `<div class="empty">No search terms came back from Apple for this date range. Search-term reports require enough impressions, and Apple v5 requires <code>ORTZ</code> timezone for this endpoint.</div>`}
    </section>
  `;
}

function searchTermCampaignOptions(rows) {
  const totals = new Map();
  for (const row of rows) {
    const name = row.campaignName || "Unassigned Campaign";
    const current = totals.get(name) || { name, rows: 0, spend: 0, taps: 0, installs: 0 };
    current.rows += 1;
    current.spend += Number(row.spend || 0);
    current.taps += Number(row.taps || 0);
    current.installs += Number(row.installs || 0);
    totals.set(name, current);
  }
  return [...totals.values()].sort((a, b) => b.spend - a.spend || b.installs - a.installs);
}

function searchTermCampaignFilter(campaigns) {
  if (!campaigns.length) return "";
  return `
    <label class="search-term-filter">
      <span>Campaign</span>
      <select id="search-term-campaign-filter">
        <option value="all"${state.adsCampaignFilter === "all" ? " selected" : ""}>All campaigns</option>
        ${campaigns.map((campaign) => `
          <option value="${escapeAttr(campaign.name)}"${state.adsCampaignFilter === campaign.name ? " selected" : ""}>${escapeHtml(campaign.name.trim())} · ${campaign.rows} terms</option>
        `).join("")}
      </select>
    </label>
  `;
}

function searchTermCampaignBreakdown(campaigns, selected) {
  return `
    <div class="campaign-filter-summary">
      <div class="campaign-filter-title">
        <strong>Filter by campaign/app</strong>
        <span>Use this before taking action so negatives and exact-match adds stay inside the right campaign.</span>
      </div>
      <div class="campaign-filter-buttons">
        <button class="campaign-filter-button ${selected === "all" ? "active" : ""}" type="button" data-search-term-filter="all">
          <strong>All Campaigns</strong>
          <span>${campaigns.reduce((total, campaign) => total + campaign.rows, 0)} terms · ${currency(campaigns.reduce((total, campaign) => total + campaign.spend, 0))} spend</span>
        </button>
        ${campaigns.map((campaign) => `
          <button class="campaign-filter-button ${selected === campaign.name ? "active" : ""}" type="button" data-search-term-filter="${escapeAttr(campaign.name)}">
            <strong>${escapeHtml(campaign.name.trim())}</strong>
            <span>${campaign.rows} terms · ${currency(campaign.spend)} spend · ${campaign.taps} taps · ${campaign.installs} installs</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function keywordBidOptimizationPanel(data) {
  const rows = data.appleAdsInsights?.keywords || [];
  const scale = rows
    .filter((row) => row.installs > 0 && row.cpi <= state.assumptions.targetCpi)
    .map((row) => ({ ...row, targetBidLabel: "", targetBidDirection: "" }))
    .slice(0, 8);
  const cut = rows
    .filter((row) => (row.taps >= 2 || row.spend >= 5) && row.installs === 0)
    .map((row) => ({ ...row, targetBidLabel: "", targetBidDirection: "" }))
    .slice(0, 8);
  return `
    <section class="panel">
      <div class="panel-header"><h3>Keyword Bid Changes</h3><span>${rows.length} live rows</span></div>
      ${rows.length ? `
        <div class="optimization-columns">
          <div>
            <h4>Protect / Watch</h4>
            ${optimizationList(scale, "keyword", "No keyword currently clears the CPI target.")}
          </div>
          <div>
            <h4>Lower / Pause</h4>
            ${optimizationList(cut, "keyword", "No obvious keyword spend leak in this range.")}
          </div>
        </div>
      ` : `<div class="empty">No keyword-level rows came back from Apple for this date range. The dashboard will show rows here as soon as Apple returns targeting keyword report data.</div>`}
    </section>
  `;
}

function optimizationList(rows, field, emptyText) {
  if (!rows.length) return `<div class="empty small">${emptyText}</div>`;
  return `
    <div class="optimization-list">
      ${rows.map((row) => `
        <article class="optimization-item">
          <div>
            <strong>${escapeHtml(row[field] || row.term)}</strong>
            <span>${escapeHtml(row.campaignName || "Campaign")} ${row.adGroupName ? `· ${escapeHtml(row.adGroupName)}` : ""}${row.exactExists ? " · already exact" : ""}</span>
          </div>
          <div class="optimization-metrics">
            <span>${row.spendLabel}</span>
            <span>${row.taps} taps</span>
            <span>${row.installs} installs</span>
            <span>${row.cpiLabel} CPI</span>
            ${row.avgCptLabel ? `<span>${escapeHtml(row.avgCptLabel)} Avg CPT</span>` : ""}
            ${row.targetBidLabel ? `<span>${escapeHtml(row.targetBidDirection || "Target")} ${escapeHtml(row.targetBidLabel)}</span>` : ""}
          </div>
          <p>${escapeHtml(row.recommendation)}</p>
        </article>
      `).join("")}
    </div>
  `;
}

function exactKeywordLookup(rows = []) {
  return new Set(rows
    .filter((row) => normalizeKey(row.matchType) === "exact")
    .map((row) => exactLookupKey(row.campaignName, row.keyword || row.term)));
}

function exactLookupKey(campaignName = "", keyword = "") {
  return `${normalizeKey(campaignName)}:${normalizeKey(keyword)}`;
}

function targetBidLabel(row = {}, multiplier = 1.15) {
  const current = Number(row.avgCpt || 0);
  if (!current) return "";
  return currency(current * multiplier);
}

function keywordOpportunityPanel(data) {
  const opportunities = [
    {
      title: "Competitor conquest set",
      body: "Build exact-match ad groups around direct alternatives for Cup Companion, BARE food scanning, and blueprint estimate tools. Keep daily budget capped until taps convert below target CPI.",
      tag: "new ad groups"
    },
    {
      title: "Problem-intent keywords",
      body: "Test terms that describe urgent jobs: world cup schedule app, food ingredient scanner, blueprint estimate app, contractor quote calculator.",
      tag: "discovery"
    },
    {
      title: "Negative keyword pass",
      body: "Pull search terms after 48 hours. Add negatives for taps without installs, especially broad research terms and unrelated sports/food/calculator traffic.",
      tag: "waste control"
    }
  ];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Competitive Keyword Plan</h3><span>agent suggestions</span></div>
      <div class="opportunity-list">
        ${opportunities.map((item) => `
          <div class="opportunity">
            <span>${item.tag}</span>
            <strong>${item.title}</strong>
            <p>${item.body}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function storeGrowthPanel(data) {
  const economics = unitEconomics(data);
  const totals = data.revenueCat?.totals || {};
  return `
    <section class="panel">
      <div class="panel-header"><h3>App Store Connect Growth</h3><span>RevenueCat + Apple Ads cash view</span></div>
      <div class="store-metric-grid">
        <article><span>RevenueCat Gross</span><strong>${currency(economics.grossRevenue)}</strong><p>Actual connected RevenueCat revenue for the selected date range.</p></article>
        <article><span>Apple Cut</span><strong>${currency(economics.appleShare)}</strong><p>Estimated at ${percentFromFraction(state.assumptions.appleFeeRate)} of gross revenue.</p></article>
        <article><span>After Apple</span><strong>${currency(economics.netRevenue)}</strong><p>Estimated proceeds before ad spend, taxes, refunds, and timing adjustments.</p></article>
        <article><span>Ad Spend</span><strong>${currency(economics.spend)}</strong><p>Live Apple Ads spend for the selected date range.</p></article>
        <article><span>Gross Profit</span><strong>${currency(economics.profit)}</strong><p>Amount left after Apple fee and Apple Ads spend.</p></article>
        <article><span>Active Subs</span><strong>${compactNumber(totals.activeSubscriptions || 0)}</strong><p>RevenueCat active subscription count where connected.</p></article>
      </div>
    </section>
  `;
}

function appStoreActualAccessPanel(data) {
  const access = data.appStoreDataAccess || {};
  const sales = access.salesReports || {};
  const analytics = access.analyticsReports || {};
  return `
    <section class="panel actual-access-panel">
      <div class="panel-header">
        <h3>Actual App Store Data Access</h3>
        <span>${accessStatusLabel(sales, analytics)}</span>
      </div>
      <div class="access-grid">
        ${accessCard("Revenue and subscriptions", sales, "ASC Sales Reports are required for actual proceeds, purchases, refunds, and subscriber report rows.")}
        ${accessCard("Downloads and app analytics", analytics, `ASC Analytics Reports are required for actual downloads and App Store funnel metrics${access.checkedApp?.name ? `; checked with ${escapeHtml(access.checkedApp.name)}` : ""}.`)}
      </div>
    </section>
  `;
}

function accessCard(title, access, body) {
  const ready = access.status === "ready";
  return `
    <article class="access-card ${ready ? "ready" : "blocked"}">
      <div>
        <strong>${title}</strong>
        <span>${ready ? "ready" : `blocked${access.httpStatus ? ` · ${access.httpStatus}` : ""}`}</span>
      </div>
      <p>${body}</p>
      <code>${escapeHtml(access.message || "No live response yet.")}</code>
    </article>
  `;
}

function accessStatusLabel(sales, analytics) {
  if (sales.status === "ready" && analytics.status === "ready") return "actual data ready";
  if (sales.status === "ready" || analytics.status === "ready") return "partially available";
  return "actual data blocked";
}

function subscriberRevenuePanel(data) {
  const economics = unitEconomics(data);
  return `
    <section class="panel">
      <div class="panel-header"><h3>Revenue Agent</h3><span>next growth moves</span></div>
      <div class="recommendation-grid">
        <article class="recommendation high">
          <div class="recommendation-top"><strong>Use gross profit as the scaling gate</strong><span>${currency(economics.profit)}</span></div>
          <p>Only add budget when RevenueCat gross revenue minus Apple fee and Apple Ads spend stays positive for the app. CPI is diagnostic, not the source of truth.</p>
          <code>${currency(economics.grossRevenue)} gross · ${currency(economics.spend)} ads</code>
        </article>
        <article class="recommendation medium">
          <div class="recommendation-top"><strong>Protect profitable exact matches</strong><span>bid discipline</span></div>
          <p>Keep exact keywords that produce installs while the app is profit-positive. Cut broad or no-install rows before they pull the app below zero.</p>
          <code>${currency(economics.netRevenue)} after Apple · ${currency(economics.profit)} gross profit</code>
        </article>
        <article class="recommendation medium">
          <div class="recommendation-top"><strong>Instrument the paywall funnel</strong><span>growth</span></div>
          <p>Track product page view, install, onboarding complete, paywall view, trial start, paid conversion, cancellation, and refund by app and campaign.</p>
          <code>subscriber conversion by campaign</code>
        </article>
      </div>
    </section>
  `;
}

function appMonetizationPanel(data) {
  const apps = data.ascApps || [];
  return `
    <section class="panel">
      <div class="panel-header"><h3>Apps To Monetize</h3><span>${apps.length} apps</span></div>
      <div class="app-growth-list">
        ${apps.map((app) => `
          <div class="app-growth-row">
            <div>
              <strong>${escapeHtml(app.name)}</strong>
              <span>${escapeHtml(app.bundleId)}</span>
            </div>
            <p>${monetizationAdvice(app, data)}</p>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function monetizationAdvice(app, data) {
  const campaign = data.campaigns.find((item) => item.app === app.name || item.name.includes(app.name.split(" ")[0]));
  if (!campaign) return "No matching Apple Ads campaign found yet. Create a small exact-match campaign before scaling broad discovery.";
  const profit = appProfitForCampaign(data, campaign);
  const profitLabel = profit.revenueReady ? `${currency(profit.profit)} gross profit` : "RevenueCat revenue unavailable";
  return `${campaign.name}: ${campaign.spend} spend, ${campaign.installs} installs, ${campaign.cpa} CPI, ${profitLabel}. Scale only while this app stays positive after Apple fee and ads.`;
}

function growthActions(data) {
  const campaigns = data.campaigns || [];
  const actions = [];
  const profitRows = appProfitRows(data);
  const negativeProfit = profitRows.filter((row) => row.revenueReady && row.spend > 0 && row.profit < 0);
  const positiveProfit = profitRows.filter((row) => row.revenueReady && row.spend > 0 && row.profit > 0);
  const noInstall = campaigns.filter((campaign) => parseNumber(campaign.installs) === 0);
  const highCpi = campaigns.filter((campaign) => parseMoney(campaign.cpa) >= 6);
  const efficient = campaigns.filter((campaign) => parseMoney(campaign.cpa) > 0 && parseMoney(campaign.cpa) < 5);

  if (negativeProfit.length) {
    actions.push({
      priority: "high",
      title: `Stop profit bleed in ${negativeProfit[0].app}`,
      body: `${negativeProfit[0].app} is ${currency(negativeProfit[0].profit)} after Apple fee and ads today. Cut bids or pause non-converting rows before adding any budget.`,
      metric: `${currency(negativeProfit[0].grossRevenue)} gross · ${currency(negativeProfit[0].spend)} ads`
    });
  }
  if (positiveProfit.length && efficient.length) {
    const campaign = efficient.find((item) => appProfitForCampaign(data, item).app === positiveProfit[0].app) || efficient[0];
    const profit = appProfitForCampaign(data, campaign);
    actions.push({
      priority: "high",
      title: `Protect ${campaign.name.trim()}`,
      body: `${profit.app} is profit-positive after Apple fee and ads (${currency(profit.profit)}). Keep the campaign protected and scale only in small steps while app gross profit stays positive.`,
      metric: `${campaign.spend} spend · ${campaign.installs} installs · ${currency(profit.profit)} profit`
    });
  }
  if (highCpi.length) {
    actions.push({
      priority: "medium",
      title: `Tighten bids on ${highCpi[0].name.trim()}`,
      body: `${highCpi[0].name.trim()} is above the current CPI target. Lower max CPT or split high-intent keywords into exact match unless the parent app remains gross-profit positive.`,
      metric: `${highCpi[0].cpa} CPI`
    });
  }
  if (noInstall.length) {
    actions.push({
      priority: "medium",
      title: `Diagnose ${noInstall[0].name.trim()}`,
      body: `${noInstall[0].name.trim()} has impressions but no installs in the latest report. Check search terms and pause low-intent broad matches before adding spend.`,
      metric: `${noInstall[0].taps} taps · 0 installs`
    });
  }
  actions.push({
    priority: "high",
    title: "Use gross profit as the budget gate",
    body: "Move budget only toward apps that are positive after Apple fee and Apple Ads spend. Search terms, CPI, and taps explain the move, but gross profit decides it.",
    metric: `${currency(unitEconomics(data).profit)} total gross profit`
  });
  return actions;
}

function kpiValue(data, label) {
  return data.kpis.find((item) => item.label === label)?.value || "0";
}

function dailyProfitKpis(data) {
  const economics = unitEconomics(data);
  return [
    { label: "Ad Spend", value: currency(economics.spend), delta: "Apple Ads" },
    { label: "Gross Revenue", value: currency(economics.grossRevenue), delta: "RevenueCat" },
    { label: "Apple Cut", value: currency(economics.appleShare), delta: `${percentFromFraction(state.assumptions.appleFeeRate)} estimate` },
    { label: "After Apple", value: currency(economics.netRevenue), delta: "estimated proceeds" },
    { label: "Gross Profit", value: currency(economics.profit), delta: "after ads" }
  ];
}

function unitEconomics(data) {
  const campaigns = data.campaigns || [];
  const spend = campaigns.reduce((total, campaign) => total + parseMoney(campaign.spend), 0);
  const installs = campaigns.reduce((total, campaign) => total + parseNumber(campaign.installs), 0);
  const subscribers = installs * state.assumptions.installToSubscriberRate;
  const modeledGrossMrr = subscribers * state.assumptions.monthlyPrice;
  const grossRevenue = Number(data.revenueCat?.totals?.revenue || 0);
  const appleShare = grossRevenue * state.assumptions.appleFeeRate;
  const netRevenue = grossRevenue - appleShare;
  const profit = netRevenue - spend;
  const roas = spend ? netRevenue / spend : netRevenue ? Infinity : 0;
  const connectedRevenueProjects = (data.revenueCat?.connections || []).filter((connection) => connection.ready).length;
  const revenueSourceLabel = data.revenueCat?.ready
    ? `${connectedRevenueProjects} RevenueCat project${connectedRevenueProjects === 1 ? "" : "s"} connected`
    : "RevenueCat not connected";
  return {
    spend,
    installs,
    subscribers,
    grossRevenue,
    modeledGrossMrr,
    appleShare,
    netRevenue,
    profit,
    roas,
    grossMrr: grossRevenue,
    netMrr: netRevenue,
    revenueSourceLabel,
    installsLabel: compactNumber(installs),
    subscribersLabel: subscribers >= 10 ? compactNumber(subscribers) : subscribers.toFixed(1),
    roasLabel: Number.isFinite(roas) ? `${roas.toFixed(2)}x` : "∞",
    perApp: appProfitRows(data)
  };
}

function appProfitRows(data) {
  const rows = new Map();
  const ensure = (app) => {
    const name = app || "Unmapped";
    if (!rows.has(name)) {
      rows.set(name, {
        app: name,
        grossRevenue: 0,
        appleShare: 0,
        netRevenue: 0,
        spend: 0,
        profit: 0,
        taps: 0,
        installs: 0,
        campaignCount: 0,
        revenueReady: false,
        revenueUnavailable: false
      });
    }
    return rows.get(name);
  };

  for (const connection of data.revenueCat?.connections || []) {
    const row = ensure(appProfitNameFromText(connection.label || connection.name || connection.project?.id));
    row.revenueReady = row.revenueReady || Boolean(connection.ready);
    row.revenueUnavailable = row.revenueUnavailable || !connection.ready;
    row.grossRevenue += Number(connection.revenue?.value || 0);
  }

  for (const campaign of data.campaigns || []) {
    const row = ensure(appProfitNameForCampaign(campaign));
    row.spend += parseMoney(campaign.spend);
    row.taps += parseNumber(campaign.taps);
    row.installs += parseNumber(campaign.installs);
    row.campaignCount += 1;
  }

  for (const row of rows.values()) {
    row.appleShare = row.grossRevenue * state.assumptions.appleFeeRate;
    row.netRevenue = row.grossRevenue - row.appleShare;
    row.profit = row.revenueReady ? row.netRevenue - row.spend : 0 - row.spend;
  }

  return [...rows.values()].sort((a, b) => {
    const activeDelta = Number(b.spend > 0 || b.grossRevenue > 0) - Number(a.spend > 0 || a.grossRevenue > 0);
    return activeDelta || b.spend - a.spend || b.grossRevenue - a.grossRevenue || a.app.localeCompare(b.app);
  });
}

function appProfitForCampaign(data, campaign) {
  const appName = appProfitNameForCampaign(campaign);
  return appProfitRows(data).find((row) => row.app === appName) || {
    app: appName,
    revenueReady: false,
    grossRevenue: 0,
    netRevenue: 0,
    spend: parseMoney(campaign?.spend),
    profit: -parseMoney(campaign?.spend),
    campaignCount: 1
  };
}

function appProfitNameForCampaign(campaign = {}) {
  return appProfitNameFromText(`${campaign.app || ""} ${campaign.name || ""}`);
}

function appProfitNameFromText(value = "") {
  const text = normalizeKey(value);
  if (text.includes("perfect album") || text.includes("perfect-album") || text.includes("album")) return "Legend Run: The Perfect Album";
  if (text.includes("162-0")) return "Legend Run: 162-0";
  if (text.includes("16-0")) return "Legend Run: 16-0";
  if (text.includes("82-0") || text.includes("legend run")) return "Legend Run: 82-0";
  if (text.includes("plantedu") || text.includes("plant edu") || text.includes("plantedu")) return "PlantEdu";
  if (text.includes("blueprint") || text.includes("bpai")) return "Blueprint AI";
  if (text.includes("cup") || text.includes("world cup")) return "Cup Companion";
  if (text.includes("bare")) return "BARE";
  return String(value || "Unmapped").trim() || "Unmapped";
}

function assumptionsPanel() {
  const assumptions = state.assumptions;
  return `
    <section class="panel assumptions-panel">
      <div class="panel-header"><h3>Revenue Assumptions</h3><span>editable local model</span></div>
      <form id="assumptions-form" class="assumptions-form">
        ${assumptionField("monthlyPrice", "Monthly Price", assumptions.monthlyPrice, "number", "0.01")}
        ${assumptionField("installToSubscriberRate", "Install to Subscriber %", assumptions.installToSubscriberRate * 100, "number", "0.1")}
        ${assumptionField("appleFeeRate", "Apple Share %", assumptions.appleFeeRate * 100, "number", "0.1")}
        ${assumptionField("targetCpi", "Target CPI", assumptions.targetCpi, "number", "0.01")}
        ${assumptionField("targetRoas", "Cash Coverage Watch", assumptions.targetRoas, "number", "0.1")}
        <button class="button" type="submit">Update Model</button>
      </form>
    </section>
  `;
}

function assumptionField(name, label, value, type, step) {
  return `
    <label>
      <span>${label}</span>
      <input name="${name}" type="${type}" step="${step}" value="${Number(value).toFixed(step === "0.01" ? 2 : 1)}">
    </label>
  `;
}

function loadAssumptions() {
  const defaults = {
    monthlyPrice: 9.99,
    installToSubscriberRate: 0.15,
    appleFeeRate: 0.3,
    targetCpi: 5,
    targetRoas: 1.5
  };
  try {
    const saved = JSON.parse(localStorage.getItem("appleGrowthAssumptions") || "{}");
    const merged = { ...defaults, ...saved };
    if (Number(merged.appleFeeRate) === 0.15) merged.appleFeeRate = 0.3;
    return merged;
  } catch {
    return defaults;
  }
}

function saveAssumptions(values) {
  localStorage.setItem("appleGrowthAssumptions", JSON.stringify(values));
}

function loadCompletedOptimizations() {
  try {
    const parsed = JSON.parse(localStorage.getItem("appleGrowthCompletedOptimizations") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveCompletedOptimizations() {
  localStorage.setItem("appleGrowthCompletedOptimizations", JSON.stringify(state.completedOptimizations || {}));
}

function optimizationActionKey(action = {}) {
  return `opt_${hashString(normalizeKey(action.title || action.body || action.metric || "optimization"))}`;
}

function isOptimizationComplete(action = {}) {
  return Boolean(state.completedOptimizations?.[optimizationActionKey(action)]);
}

function hashString(value = "") {
  let hash = 5381;
  const text = String(value || "");
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) + hash) ^ text.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function parseMoney(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function parseNumber(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function currency(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value || 0));
}

function formatSignedCurrency(value) {
  const amount = Number(value || 0);
  const formatted = currency(Math.abs(amount));
  if (amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

function compactNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Number(value || 0));
}

function percentFromFraction(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function reportsView(data) {
  const ascMissing = [...(data.credentials?.appStoreConnect.missing || [])];
  const vendorMissing = state.config?.values?.ASC_VENDOR_NUMBER ? [] : ["ASC_VENDOR_NUMBER"];
  const adsMissing = data.credentials?.appleAds.missing || [];
  return `
    <div class="stack">
    <div class="panel">
      <div class="panel-header"><h3>Report Probes</h3><span>live guarded</span></div>
      <div style="padding:14px">
        <div class="report-actions">
          <button class="button" id="probe-reports-button" type="button">Probe Report Endpoints</button>
          <span>Checks App Store Connect sales reports and Apple Ads campaign reports using the current local config.</span>
        </div>
      </div>
      <div class="table-wrap">
        <table class="table compact">
          <thead><tr><th>Source</th><th>Endpoint</th><th>Readiness</th><th>Missing</th></tr></thead>
          <tbody>
            <tr>
              <td><strong>App Store Connect</strong></td>
              <td><code>/v1/salesReports</code></td>
              <td><span class="tag ${(ascMissing.length || vendorMissing.length) ? "paused" : ""}">${(ascMissing.length || vendorMissing.length) ? "WAITING" : "READY"}</span></td>
              <td>${[...ascMissing, ...vendorMissing].join(", ") || "None"}</td>
            </tr>
            <tr>
              <td><strong>Apple Ads</strong></td>
              <td><code>/api/v5/reports/campaigns</code></td>
              <td><span class="tag ${adsMissing.length ? "paused" : ""}">${adsMissing.length ? "WAITING" : "READY"}</span></td>
              <td>${adsMissing.join(", ") || "None"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="grid">
      <div class="panel">
        <div class="panel-header"><h3>Report Queue</h3><span>planned</span></div>
        <div class="empty">Report endpoints are wired. Add credentials, then use Probe Report Endpoints to validate live pulls before scheduling daily refreshes.</div>
      </div>
      ${summaryPanel("Report Types", [
        "Daily Apple Ads campaign summary",
        "App Store Connect sales summary",
        "Spend-to-revenue reconciliation",
        "Install efficiency watchlist"
      ])}
    </div>
    </div>
  `;
}

function credentialsView(credentials) {
  const data = state.overview || {};
  return `
    <div class="stack">
      ${setupChecklistPanel(credentials, state.config)}
      ${appleAdsOAuthHelperPanel(state.appleAdsKeypair)}
      ${readinessPanel(data)}
      ${syncPanel(state.sync)}
      ${syncDetailsPanel(state.sync)}
      ${ascAppsPanel(data)}
      ${configForm(state.config)}
      ${knownKeysPanel(state.config)}
      ${keyCandidatesPanel(state.keyCandidates)}
      ${diagnosticsPanel(state.diagnostics)}
    <div class="grid">
      <div class="panel">
        <div class="panel-header"><h3>Credential Matrix</h3><span>${credentialsLabel(credentials)}</span></div>
        <div style="padding:14px">
          <div class="checklist">
            ${credentialGroup("App Store Connect", credentials.appStoreConnect)}
            ${credentialGroup("Apple Search Ads", credentials.appleAds)}
            ${credentialGroup("RevenueCat", credentials.revenueCat)}
          </div>
        </div>
      </div>
      ${summaryPanel("Why A Key ID Is Not Enough", [
        "It identifies an App Store Connect API key, but it is not the full credential.",
        "Apple still requires the issuer ID.",
        "The private .p8 key is needed to sign JWT requests.",
        "Apple Ads v5 uses a separate OAuth setup and org context."
      ])}
    </div>
    </div>
  `;
}

function appleAdsOAuthHelperPanel(keypair) {
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Apple Ads OAuth Keypair Helper</h3>
        <span>${keypair ? "public key ready" : "local setup"}</span>
      </div>
      <div class="oauth-helper">
        <div>
          <strong>No Create button visible?</strong>
          <p>That usually means the signed-in Apple Ads user still needs an API role. In Apple Ads, go to Account Settings > User Management and assign this user API Account Manager or API Account Read Only. Sign out and back in, then return to Account Settings > API.</p>
          <p>When Apple shows a public key field, paste the public key below. Apple will then show clientId, teamId, and keyId.</p>
        </div>
        <button class="button secondary" id="apple-ads-keypair-button" type="button">Generate Public Key</button>
      </div>
      ${keypair ? `
        <div class="public-key-box">
          <label>
            <span>Paste this public key into Apple Ads API settings</span>
            <textarea readonly>${escapeHtml(keypair.publicKey)}</textarea>
          </label>
          <div class="key-path-note">
            <strong>Private key path saved locally</strong>
            <code>${escapeHtml(keypair.privateKeyPath)}</code>
          </div>
        </div>
      ` : ""}
    </section>
  `;
}

function setupChecklistPanel(credentials, config) {
  const values = config?.values || {};
  const steps = [
    {
      label: "App Store Connect key ID",
      field: "ASC_KEY_ID",
      source: "Users and Access > Integrations > App Store Connect API",
      present: Boolean(values.ASC_KEY_ID),
      detail: "Paste the key ID from the customer's App Store Connect API key."
    },
    {
      label: "App Store Connect issuer ID",
      field: "ASC_ISSUER_ID",
      source: "Users and Access > Integrations > App Store Connect API",
      present: Boolean(values.ASC_ISSUER_ID),
      detail: "Shared across App Store Connect API keys in your account."
    },
    {
      label: "App Store Connect .p8 file path",
      field: "ASC_PRIVATE_KEY_PATH",
      source: "The downloaded AuthKey_<KEY_ID>.p8 file on this machine",
      present: Boolean(values.ASC_PRIVATE_KEY_PATH),
      detail: "Use the local path only. The dashboard never displays the key contents."
    },
    {
      label: "ASC vendor number",
      field: "ASC_VENDOR_NUMBER",
      source: "Payments and Financial Reports, or Sales and Trends vendor selector",
      present: Boolean(values.ASC_VENDOR_NUMBER),
      detail: "Needed for /v1/salesReports, but not for the app-list endpoint."
    },
    {
      label: "Apple Ads OAuth client ID",
      field: "APPLE_ADS_CLIENT_ID",
      source: "Apple Ads API settings for Campaign Management API v5",
      present: Boolean(values.APPLE_ADS_CLIENT_ID),
      detail: "Used as the OAuth client identifier for token exchange."
    },
    {
      label: "Apple Ads team ID",
      field: "APPLE_ADS_TEAM_ID",
      source: "Apple Ads API settings",
      present: Boolean(values.APPLE_ADS_TEAM_ID),
      detail: "Used as the issuer when signing the Apple Ads client-secret JWT."
    },
    {
      label: "Apple Ads key ID and .p8 path",
      field: "APPLE_ADS_KEY_ID / APPLE_ADS_PRIVATE_KEY_PATH",
      source: "Apple Ads API private key download",
      present: Boolean(values.APPLE_ADS_KEY_ID && values.APPLE_ADS_PRIVATE_KEY_PATH),
      detail: "This is separate from the App Store Connect API key unless Apple gave you the same key for that API setup."
    },
    {
      label: "Apple Ads org ID",
      field: "APPLE_ADS_ORG_ID",
      source: "Apple Ads account/org selector",
      present: Boolean(values.APPLE_ADS_ORG_ID),
      detail: "Sent as X-AP-Context so reports use the right Apple Ads organization."
    },
    {
      label: "RevenueCat project access",
      field: "REVENUECAT_API_KEY / REVENUECAT_PROJECT_ID",
      source: "RevenueCat API v2 project settings",
      present: Boolean(credentials?.revenueCat?.ready),
      detail: "Replaces modeled revenue with actual subscriptions, MRR, trials, customers, and date-range revenue."
    }
  ];
  const done = steps.filter((step) => step.present).length;
  const ascReady = credentials?.appStoreConnect?.ready;
  const adsReady = credentials?.appleAds?.ready;
  const rcReady = credentials?.revenueCat?.ready;
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Setup Checklist</h3>
        <span>${done}/${steps.length} values present · ASC ${ascReady ? "ready" : "waiting"} · Ads ${adsReady ? "ready" : "waiting"} · RevenueCat ${rcReady ? "ready" : "waiting"}</span>
      </div>
      <div class="setup-list">
        ${steps.map((step) => `
          <div class="setup-step ${step.present ? "done" : ""}">
            <i></i>
            <div>
              <strong>${step.label}</strong>
              <code>${step.field}</code>
              <p>${step.detail}</p>
              <span>${step.source}</span>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function keyCandidatesPanel(payload) {
  const candidates = payload?.candidates || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Local .p8 Key Finder</h3>
        <span>${candidates.length} candidate${candidates.length === 1 ? "" : "s"}</span>
      </div>
      <div class="diagnostics-actions">
        <button class="button secondary" id="key-candidates-button" type="button">Find .p8 Keys</button>
        <span>Scans common local folders for Apple private key files and shows paths only. Key contents are never displayed.</span>
      </div>
      ${candidates.length ? `
        <div class="key-candidates">
          ${candidates.slice(0, 8).map((candidate) => `
            <div class="key-candidate ${candidate.matchesConfiguredKey ? "match" : ""}">
              <div>
                <strong>${candidate.fileName}</strong>
                <code>${candidate.path}</code>
                ${candidate.knownKey ? `<small>${candidate.knownKey.name} · ${candidate.knownKey.keyId}</small>` : ""}
              </div>
              <div class="key-candidate-actions">
                <span>${candidateLabel(candidate)}</span>
                ${candidateKeyActions(candidate)}
              </div>
            </div>
          `).join("")}
        </div>
      ` : `<div class="empty small">No .p8 files found in the app folder, Downloads, Desktop, or Documents.</div>`}
    </section>
  `;
}

function candidateLabel(candidate) {
  if (candidate.matchesAscKey) return "matches ASC";
  if (candidate.matchesIapKey) return "matches IAP";
  if (candidate.matchesAdsKey) return "matches Ads";
  if (candidate.knownKey) return "known key, not active";
  return "candidate";
}

function candidateKeyActions(candidate) {
  const path = escapeAttr(candidate.path);
  const buttons = [];
  if (candidate.matchesAscKey) buttons.push(`<button class="button secondary apply-key-button" type="button" data-target="ASC_PRIVATE_KEY_PATH" data-path="${path}">Use for ASC</button>`);
  if (candidate.matchesIapKey) buttons.push(`<button class="button secondary apply-key-button" type="button" data-target="IAP_PRIVATE_KEY_PATH" data-path="${path}">Use for IAP</button>`);
  if (candidate.matchesAdsKey) buttons.push(`<button class="button secondary apply-key-button" type="button" data-target="APPLE_ADS_PRIVATE_KEY_PATH" data-path="${path}">Use for Ads</button>`);
  if (!buttons.length && candidate.knownKey) {
    const keyId = escapeAttr(candidate.knownKey.keyId);
    buttons.push(`<button class="button secondary apply-key-and-path-button" type="button" data-key-target="ASC_KEY_ID" data-path-target="ASC_PRIVATE_KEY_PATH" data-key-id="${keyId}" data-path="${path}">Set ASC to this key</button>`);
  }
  if (!buttons.length) buttons.push(`<button class="button secondary apply-key-button" type="button" data-target="ASC_PRIVATE_KEY_PATH" data-path="${path}">Use path only</button>`);
  return buttons.join("");
}

function knownKeysPanel(config) {
  const keys = config?.knownKeys || [];
  if (!keys.length) return "";
  return `
    <section class="panel">
      <div class="panel-header"><h3>Known Apple Keys</h3><span>${keys.length} saved options</span></div>
      <div class="known-keys">
        ${keys.map((key) => `
          <div class="known-key">
            <div>
              <strong>${key.name}</strong>
              <code>${key.keyId}</code>
            </div>
            <div class="known-key-actions">
              <span>${key.keyId === state.config?.values?.ASC_KEY_ID ? "ASC" : key.keyId === state.config?.values?.IAP_KEY_ID ? "IAP" : "available"}</span>
              <button class="button secondary apply-value-button" type="button" data-target="ASC_KEY_ID" data-value="${escapeAttr(key.keyId)}">Set ASC</button>
              <button class="button secondary apply-value-button" type="button" data-target="IAP_KEY_ID" data-value="${escapeAttr(key.keyId)}">Set IAP</button>
            </div>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function diagnosticsPanel(diagnostics) {
  if (!diagnostics) {
    return `
      <section class="panel">
        <div class="panel-header"><h3>Local Diagnostics</h3><span>not run</span></div>
        <div class="empty">Diagnostics have not loaded yet.</div>
      </section>
    `;
  }
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Local Diagnostics</h3>
        <span>${new Date(diagnostics.generatedAt).toLocaleTimeString()}</span>
      </div>
      <div class="diagnostics-actions">
        <button class="button secondary" id="diagnostics-button" type="button">Run Local Diagnostics</button>
        <span>Checks local values, .p8 path existence, and whether keys can sign ES256 JWTs. No Apple network request is made.</span>
      </div>
      <div class="diagnostics-grid">
        ${diagnosticGroup("App Store Connect", diagnostics.appStoreConnect)}
        ${diagnosticGroup("In-App Purchase", diagnostics.inAppPurchase || [])}
        ${diagnosticGroup("RevenueCat", diagnostics.revenueCat || [])}
        ${diagnosticGroup("Apple Search Ads", diagnostics.appleAds)}
      </div>
    </section>
  `;
}

function diagnosticGroup(title, items) {
  return `
    <div class="diagnostic-group">
      <h4>${title}</h4>
      ${items.map((item) => `
        <div class="diagnostic-row">
          <span class="diag-dot ${item.ok ? "ok" : ""}"></span>
          <div>
            <strong>${item.name}</strong>
            <p>${item.status}: ${item.message}</p>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function configForm(config) {
  const values = config?.values || {};
  const field = (key, label, help = "") => `
    <label class="field">
      <span>${label}</span>
      <input name="${key}" value="${escapeAttr(values[key] || "")}" placeholder="${key}" />
      ${help ? `<small>${help}</small>` : ""}
    </label>
  `;
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>Local API Setup</h3>
        <span>${config?.envPath || ".env"}</span>
      </div>
      <form class="config-form" id="config-form">
        <div class="form-section">
          <h4>App Store Connect</h4>
          <div class="form-grid">
            ${field("ASC_KEY_ID", "Key ID", "From App Store Connect Users and Access.")}
            ${field("ASC_ISSUER_ID", "Issuer ID")}
            ${field("ASC_PRIVATE_KEY_PATH", ".p8 Private Key Path", "Path only. The dashboard does not store private key contents.")}
            ${field("ASC_VENDOR_NUMBER", "Vendor Number", "Needed later for Sales and Trends reports.")}
          </div>
        </div>
        <div class="form-section">
          <h4>Apple Search Ads API v5</h4>
          <div class="form-grid">
            ${field("APPLE_ADS_CLIENT_ID", "Client ID")}
            ${field("APPLE_ADS_TEAM_ID", "Team ID")}
            ${field("APPLE_ADS_KEY_ID", "Key ID")}
            ${field("APPLE_ADS_PRIVATE_KEY_PATH", ".p8 Private Key Path", "Path only. Keep the actual key file local.")}
            ${field("APPLE_ADS_ORG_ID", "Org ID")}
          </div>
        </div>
        <div class="form-section">
          <h4>RevenueCat</h4>
          <div class="form-grid">
            ${field("REVENUECAT_API_KEY", "BARE API Key", "RevenueCat API v2 secret key.")}
            ${field("REVENUECAT_PROJECT_ID", "BARE Project ID", "RevenueCat project ID for this app.")}
            ${field("REVENUECAT_BLUEPRINT_API_KEY", "Blueprint AI API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_BLUEPRINT_PROJECT_ID", "Blueprint AI Project ID")}
            ${field("REVENUECAT_CUP_COMPANION_API_KEY", "Cup Companion API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_CUP_COMPANION_PROJECT_ID", "Cup Companion Project ID")}
            ${field("REVENUECAT_LEGEND_RUN_API_KEY", "Legend Run: 82-0 API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_LEGEND_RUN_PROJECT_ID", "Legend Run: 82-0 Project ID")}
            ${field("REVENUECAT_LEGEND_RUN_16_API_KEY", "Legend Run: 16-0 API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_LEGEND_RUN_16_PROJECT_ID", "Legend Run: 16-0 Project ID")}
            ${field("REVENUECAT_LEGEND_RUN_162_API_KEY", "Legend Run: 162-0 API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_LEGEND_RUN_162_PROJECT_ID", "Legend Run: 162-0 Project ID")}
            ${field("REVENUECAT_PERFECT_ALBUM_API_KEY", "Perfect Album API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_PERFECT_ALBUM_PROJECT_ID", "Perfect Album Project ID")}
            ${field("REVENUECAT_PLANTEDU_API_KEY", "PlantEdu API Key", "Optional. Needs project metrics permission and a project ID.")}
            ${field("REVENUECAT_PLANTEDU_PROJECT_ID", "PlantEdu Project ID")}
          </div>
        </div>
        <div class="form-section">
          <h4>In-App Purchase / App Store Server API</h4>
          <div class="form-grid">
            ${field("IAP_KEY_ID", "Key ID")}
            ${field("IAP_ISSUER_ID", "Issuer ID")}
            ${field("IAP_PRIVATE_KEY_PATH", ".p8 Private Key Path", "Path only. Use the private key that matches the IAP key ID.")}
          </div>
        </div>
        <div class="form-actions">
          <button class="button" type="submit">Save Local Config</button>
          <span>${state.saveMessage}</span>
        </div>
      </form>
    </section>
  `;
}

function campaignTable(campaigns) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>Campaigns</h3><span>${campaigns.length} tracked</span></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th>Campaign</th><th>Status</th><th>Budget</th><th>Spend</th><th>Taps</th><th>Installs</th><th>CPA</th></tr></thead>
          <tbody>
            ${campaigns.map((row) => `
              <tr>
                <td><strong>${row.name}</strong></td>
                <td><span class="tag ${row.status === "PAUSED" ? "paused" : ""}">${row.status}</span></td>
                <td>${row.budget}</td>
                <td>${row.spend}</td>
                <td>${row.taps}</td>
                <td>${row.installs}</td>
                <td>${row.cpa}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function summaryPanel(title, items) {
  return `
    <section class="panel">
      <div class="panel-header"><h3>${title}</h3></div>
      <div style="padding:14px">
        <div class="log">
          ${items.map((item) => `<div class="log-item ok"><i></i><div><span>${item}</span></div></div>`).join("")}
        </div>
      </div>
    </section>
  `;
}

function syncDetailsPanel(sync, serviceFilter = "") {
  if (!sync?.results?.length) return "";
  const results = serviceFilter ? sync.results.filter((result) => result.service === serviceFilter) : sync.results;
  if (!results.length) return "";
  const title = serviceFilter === "apple-ads" ? "Apple Ads Sync Details" : serviceFilter === "app-store-connect" ? "App Store Connect Sync Details" : "Endpoint Result Details";
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>${title}</h3>
        <span>${results.length} endpoint${results.length === 1 ? "" : "s"}</span>
      </div>
      <div class="sync-detail-list">
        ${results.map((result) => syncDetailCard(result)).join("")}
      </div>
    </section>
  `;
}

function syncDetailCard(result) {
  const preview = Array.isArray(result.preview) ? result.preview : [];
  return `
    <div class="sync-detail-card ${result.state}">
      <div class="sync-detail-head">
        <div>
          <strong>${escapeHtml(result.name)}</strong>
          <span>${escapeHtml(result.message || "No message returned.")}</span>
        </div>
        <em>${escapeHtml(result.state || "unknown")}${result.status ? ` · ${result.status}` : ""}</em>
      </div>
      ${preview.length ? `
        <div class="preview-rows">
          ${preview.slice(0, 3).map((row) => previewRow(row)).join("")}
        </div>
      ` : `<p class="sync-detail-empty">${result.state === "skipped" ? "No request was made because setup is incomplete." : "No preview rows returned yet."}</p>`}
    </div>
  `;
}

function previewRow(row) {
  const entries = Object.entries(flattenPreview(row)).slice(0, 6);
  if (!entries.length) return `<div class="preview-row"><code>${escapeHtml(JSON.stringify(row))}</code></div>`;
  return `
    <div class="preview-row">
      ${entries.map(([key, value]) => `
        <span><strong>${escapeHtml(key)}</strong>${escapeHtml(formatPreviewValue(value))}</span>
      `).join("")}
    </div>
  `;
}

function flattenPreview(value, prefix = "", output = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) output[prefix] = value;
    return output;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object" && !Array.isArray(child)) flattenPreview(child, nextKey, output);
    else output[nextKey] = child;
    if (Object.keys(output).length >= 8) break;
  }
  return output;
}

function formatPreviewValue(value) {
  if (value === null || value === undefined || value === "") return "empty";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function sidePanel(data) {
  const credentials = data.credentials;
  const ascReady = Boolean(credentials?.appStoreConnect.ready);
  const adsReady = Boolean(credentials?.appleAds.ready);
  const rcReady = Boolean(credentials?.revenueCat?.ready);
  const ready = ascReady && adsReady && rcReady;
  const label = ready ? "Live credentials ready" : ascReady || adsReady ? "Partial live: credentials needed" : "Sample mode: credentials needed";
  setConnection(label, ready || ascReady || adsReady);
  if (state.tab === "rank") return rankRescueSidePanel(state.rankRescue);
  if (state.tab === "saas") return asoSaasSidePanel(state.asoSaas);
  if (state.tab !== "credentials" && state.tab !== "reports") return growthSidePanel(data);
  return `
    <h2>Connection Readiness</h2>
    <p>The app can render now. Live Apple calls turn on after these required values exist in <code>.env</code>.</p>
    <div class="checklist">
      ${credentialGroup("App Store Connect", credentials.appStoreConnect)}
      ${credentialGroup("Apple Search Ads", credentials.appleAds)}
      ${credentialGroup("RevenueCat", credentials.revenueCat)}
    </div>
    <div class="section-title">Sync Log</div>
    <div class="log">
      ${(data.syncLog || []).map((item) => `
        <div class="log-item ${item.level === "ok" ? "ok" : ""}">
          <i></i>
          <div><strong>${item.source}</strong><span>${item.message}</span></div>
        </div>
      `).join("")}
    </div>
  `;
}

function rankRescueSidePanel(payload) {
  const current = payload?.current || {};
  const actions = (payload?.actions || []).slice(0, 4);
  const selectedName = payload?.app?.name || rankRescuePresets.find((preset) => preset.appUrl === state.rankRescueForm.appUrl)?.name || "Selected app";
  return `
    <h2>Rank Rescue</h2>
    <p><strong>${escapeHtml(selectedName)}</strong> is at <strong>${escapeHtml(current.rankLabel || "unavailable")}</strong> ${escapeHtml(current.category || "App Store")} with ${current.ratingAverage ? `<strong>${Number(current.ratingAverage).toFixed(1)}★</strong>` : "no visible rating"}.</p>
    <div class="side-metrics">
      <div><span>Reported drop</span><strong>${rankDeltaLabel(current.reportedDrop, "places")}</strong></div>
      <div><span>Paid installs</span><strong>${compactNumber(current.installVelocityProxy || 0)}</strong></div>
      <div><span>Rating count</span><strong>${compactNumber(current.ratingCount || 0)}</strong></div>
    </div>
    <div class="section-title">Do Next</div>
    <div class="log">
      ${actions.map((item) => `
        <div class="log-item ok"><i></i><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.action || item.metric || "")}</span></div></div>
      `).join("")}
    </div>
  `;
}

function asoSaasSidePanel(payload) {
  const current = payload?.current || {};
  const actions = (payload?.actions || []).slice(0, 4);
  return `
    <h2>Keyword Finder</h2>
    <p><strong>${escapeHtml(payload?.app?.name || "Prospect app")}</strong> has ${compactNumber(current.trackedKeywords || 0)} keyword ideas and ${compactNumber((payload?.competitors || []).length)} competitor overlaps. Apple Ads data is optional for this workflow.</p>
    <div class="side-metrics">
      <div><span>Rating</span><strong>${current.ratingAverage ? `${Number(current.ratingAverage).toFixed(1)}★` : "n/a"}</strong></div>
      <div><span>Ideas</span><strong>${compactNumber(current.trackedKeywords || 0)}</strong></div>
      <div><span>Competitors</span><strong>${compactNumber((payload?.competitors || []).length)}</strong></div>
    </div>
    <div class="section-title">Suggested Moves</div>
    <div class="log">
      ${actions.map((item) => `
        <div class="log-item ok"><i></i><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.action || item.metric || "")}</span></div></div>
      `).join("")}
    </div>
  `;
}

function growthSidePanel(data) {
  const economics = unitEconomics(data);
  const actions = growthActions(data).slice(0, 3);
  return `
    <h2>Growth Agent</h2>
    <p>Selected range: <strong>${state.dateRange.startDate}</strong> to <strong>${state.dateRange.endDate}</strong>. Recommendations use gross profit first: RevenueCat gross minus Apple fee minus Apple Ads spend.</p>
    <div class="side-metrics">
      <div><span>Gross Profit</span><strong>${currency(economics.profit)}</strong></div>
      <div><span>Gross Revenue</span><strong>${currency(economics.grossRevenue)}</strong></div>
      <div><span>Ad Spend</span><strong>${currency(economics.spend)}</strong></div>
    </div>
    <div class="section-title">Next Moves</div>
    <div class="log">
      ${actions.map((item) => `
        <div class="log-item ok"><i></i><div><strong>${item.title}</strong><span>${item.metric}</span></div></div>
      `).join("")}
    </div>
  `;
}

function credentialGroup(label, group) {
  return `
    <div class="check">
      <div class="check-top">
        <strong>${label}</strong>
        <span class="mini-status ${group.ready ? "ok" : ""}">${group.ready ? "ready" : "missing"}</span>
      </div>
      <code>${group.missing.length ? `Missing: ${group.missing.join(", ")}` : "All required values are present."}</code>
    </div>
  `;
}

function bindViewActions() {
  const form = document.querySelector("#config-form");
  if (form) {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const payload = Object.fromEntries(new FormData(form).entries());
      const result = await fetchJson("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      state.saveMessage = result.saved ? "Saved. Rechecking readiness..." : `Save failed: ${result.error || "unknown error"}`;
      await loadOverview();
      state.tab = "credentials";
      state.saveMessage = result.saved ? "Saved local .env." : state.saveMessage;
      render();
    });
  }

  const probeReportsButton = document.querySelector("#probe-reports-button");
  if (probeReportsButton) probeReportsButton.addEventListener("click", probeReports);

  const asoSaasForm = document.querySelector("#aso-saas-form");
  if (asoSaasForm) {
    asoSaasForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(asoSaasForm).entries());
      state.asoSaasForm = {
        appUrl: form.appUrl || state.asoSaasForm.appUrl,
        country: String(form.country || "US").slice(0, 2).toUpperCase(),
        keywords: form.keywords || ""
      };
      await loadAsoSaas();
    });
  }

  const rankRescueForm = document.querySelector("#rank-rescue-form");
  if (rankRescueForm) {
    rankRescueForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(rankRescueForm).entries());
      state.rankRescueForm = normalizeRankRescueForm(form);
      await loadRankRescue();
    });
  }

  document.querySelectorAll("[data-rank-preset]").forEach((button) => {
    button.addEventListener("click", async () => {
      const preset = rankRescuePresets[Number(button.dataset.rankPreset)];
      if (!preset) return;
      state.rankRescueForm = normalizeRankRescueForm(preset);
      await loadRankRescue();
    });
  });

  const asoSignupForm = document.querySelector("#aso-signup-form");
  if (asoSignupForm) {
    asoSignupForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(asoSignupForm).entries());
      state.asoSignupForm = {
        email: form.email || "",
        company: form.company || "",
        phone: form.phone || "",
        plan: form.plan || "Growth"
      };
      state.asoSignupResult = await fetchJson("/api/aso-saas/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...state.asoSignupForm,
          appUrl: state.asoSaasForm.appUrl,
          country: state.asoSaasForm.country,
          keywords: state.asoSaasForm.keywords
        })
      });
      await loadAsoSaas();
    });
  }

  document.querySelectorAll("[data-copy-keyword-bucket]").forEach((button) => {
    button.addEventListener("click", async () => {
      const buckets = asoCampaignKeywordBuckets(state.asoSaas || {});
      const bucketName = button.dataset.copyKeywordBucket || "all";
      const rows = asoKeywordExportRows(buckets, bucketName);
      const exportText = formatKeywordExport(rows);
      await copyText(exportText);
      setConnection(`Copied ${rows.length} keywords`, true);
      const exportBox = document.querySelector("[data-keyword-export='all']");
      if (exportBox) exportBox.value = exportText;
    });
  });

  document.querySelectorAll("[data-complete-optimization]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.completeOptimization || "";
      if (!key) return;
      state.completedOptimizations = {
        ...(state.completedOptimizations || {}),
        [key]: {
          title: button.dataset.completeTitle || "Optimization",
          completedAt: new Date().toISOString()
        }
      };
      saveCompletedOptimizations();
      setConnection("Optimization marked complete", true);
      render();
    });
  });

  const clearCompletedOptimizations = document.querySelector("[data-clear-completed-optimizations]");
  if (clearCompletedOptimizations) {
    clearCompletedOptimizations.addEventListener("click", () => {
      state.completedOptimizations = {};
      saveCompletedOptimizations();
      setConnection("Completed optimizations restored", true);
      render();
    });
  }

  const searchTermCampaignFilter = document.querySelector("#search-term-campaign-filter");
  if (searchTermCampaignFilter) {
    searchTermCampaignFilter.addEventListener("change", () => {
      state.adsCampaignFilter = searchTermCampaignFilter.value || "all";
      render();
    });
  }

  document.querySelectorAll("[data-search-term-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.adsCampaignFilter = button.dataset.searchTermFilter || "all";
      render();
    });
  });

  const assumptionsForm = document.querySelector("#assumptions-form");
  if (assumptionsForm) {
    assumptionsForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(assumptionsForm).entries());
      state.assumptions = {
        monthlyPrice: Number(form.monthlyPrice) || state.assumptions.monthlyPrice,
        installToSubscriberRate: (Number(form.installToSubscriberRate) || 0) / 100,
        appleFeeRate: (Number(form.appleFeeRate) || 0) / 100,
        targetCpi: Number(form.targetCpi) || state.assumptions.targetCpi,
        targetRoas: Number(form.targetRoas) || state.assumptions.targetRoas
      };
      saveAssumptions(state.assumptions);
      render();
    });
  }

  const diagnosticsButton = document.querySelector("#diagnostics-button");
  if (diagnosticsButton) {
    diagnosticsButton.addEventListener("click", async () => {
      state.diagnostics = await fetchJson("/api/diagnostics");
      render();
    });
  }

  const keyCandidatesButton = document.querySelector("#key-candidates-button");
  if (keyCandidatesButton) {
    keyCandidatesButton.addEventListener("click", async () => {
      state.keyCandidates = await fetchJson("/api/key-candidates");
      render();
    });
  }

  const appleAdsKeypairButton = document.querySelector("#apple-ads-keypair-button");
  if (appleAdsKeypairButton) {
    appleAdsKeypairButton.addEventListener("click", async () => {
      const keypair = await fetchJson("/api/apple-ads/keypair", { method: "POST" });
      state.appleAdsKeypair = keypair;
      if (keypair.privateKeyPath) applyConfigValue("APPLE_ADS_PRIVATE_KEY_PATH", keypair.privateKeyPath);
      else render();
    });
  }

  document.querySelectorAll(".apply-key-button").forEach((button) => {
    button.addEventListener("click", () => {
      applyConfigValue(button.dataset.target, button.dataset.path);
    });
  });

  document.querySelectorAll(".apply-key-and-path-button").forEach((button) => {
    button.addEventListener("click", () => {
      applyConfigValues({
        [button.dataset.keyTarget]: button.dataset.keyId,
        [button.dataset.pathTarget]: button.dataset.path
      });
    });
  });

  document.querySelectorAll(".apply-value-button").forEach((button) => {
    button.addEventListener("click", () => {
      applyConfigValue(button.dataset.target, button.dataset.value);
    });
  });
}

function applyConfigValue(target, value) {
  if (!target || !value) return;
  applyConfigValues({ [target]: value });
}

function applyConfigValues(values) {
  const entries = Object.entries(values || {}).filter(([, value]) => Boolean(value));
  if (!entries.length) return;
  state.config = {
    ...(state.config || {}),
    values: {
      ...(state.config?.values || {}),
      ...Object.fromEntries(entries)
    }
  };
  state.saveMessage = `${entries.map(([target]) => target).join(", ")} filled. Click Save Local Config to persist.`;
  render();
}

function credentialsLabel(credentials) {
  const groups = [credentials?.appStoreConnect, credentials?.appleAds, credentials?.revenueCat].filter(Boolean);
  const ready = groups.filter((group) => group.ready).length;
  return ready === groups.length ? "ready" : `${ready}/${groups.length} ready`;
}

function escapeAttr(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });
}

function formatDate(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function setConnection(label, ok) {
  const dot = document.querySelector("#status-dot");
  const text = document.querySelector("#connection-label");
  if (!dot || !text) return;
  dot.classList.toggle("ok", Boolean(ok));
  text.textContent = label;
}

async function copyText(value) {
  const text = String(value || "");
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function formatKeywordExport(rows = []) {
  return rows.map((row) => String(row || "").trim()).filter(Boolean).join(", ");
}
