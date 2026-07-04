const analyzeForm = document.querySelector("#public-analyze-form");
const importAscAppsButton = document.querySelector("#public-import-asc-apps");
const refreshCampaignsButton = document.querySelector("#public-refresh-campaigns");
const statusEl = document.querySelector("#public-status");
const workspaceEl = document.querySelector("#public-workspace");
const resultsEl = document.querySelector("#public-results");

const PORTFOLIO_KEY = "rank-rescue-aso-portfolio-v2";
const CONNECTIONS_KEY = "rank-rescue-aso-connections-v1";
const queryParams = new URLSearchParams(window.location.search);

let portfolio = loadPortfolio();
let currentPayload = null;
let serverWorkspace = null;
let workspaceAccess = {
  workspaceId: queryParams.get("workspaceId") || "local-portfolio",
  token: queryParams.get("token") || "local"
};
let selectedAppId = queryParams.get("appId") || portfolio.apps[0]?.id || "";
let currentQuery = initialQuery();
let activeTrackedKeywords = [];
let campaignRows = [];
let customerConnections = loadCustomerConnections();
let coachBusy = false;
let coachSuggestions = [
  "What do I need to connect first?",
  "How do I switch apps?",
  "What should I optimize next?"
];
let coachConnectionChecks = [];
let coachMessages = [{
  role: "assistant",
  content: "I can help connect your App Store Connect, RevenueCat, and Apple Ads credentials, switch apps, import paid rows, and explain what to optimize next."
}];

syncForm(currentQuery);

analyzeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  currentQuery = formValues(analyzeForm);
  upsertPortfolioApp(currentQuery);
  await analyze();
});

importAscAppsButton?.addEventListener("click", importAppStoreConnectApps);
refreshCampaignsButton?.addEventListener("click", () => loadCampaigns({ quiet: false }));

workspaceEl.addEventListener("click", async (event) => {
  const appButton = event.target.closest("[data-select-app]");
  if (appButton) {
    event.preventDefault();
    selectedAppId = appButton.dataset.selectApp || "";
    const app = selectedPortfolioApp();
    currentQuery = appToQuery(app);
    syncForm(currentQuery);
    renderWorkspace();
    await analyze();
    setStatus(`Selected ${app?.name || app?.appId || "app"}.`);
    return;
  }
  const removeAppButton = event.target.closest("[data-remove-app]");
  if (removeAppButton) {
    event.preventDefault();
    removePortfolioApp(removeAppButton.dataset.removeApp || "");
    renderWorkspace();
    await analyze();
    return;
  }
  const removeKeywordButton = event.target.closest("[data-remove-keyword]");
  if (removeKeywordButton) {
    event.preventDefault();
    const keyword = removeKeywordButton.dataset.removeKeyword || "";
    removeKeywordButton.disabled = true;
    const payload = await updateTrackedKeywords("remove", keyword);
    removeKeywordButton.disabled = false;
    if (payload) setStatus(`Removed ${keyword} from tracked keywords.`);
    return;
  }
});

resultsEl.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-keyword-field]");
  if (copyButton) {
    event.preventDefault();
    const value = copyButton.closest(".keyword-field-plan")?.querySelector("textarea")?.value || "";
    if (!value) return;
    await navigator.clipboard?.writeText(value);
    setStatus("Optimized keyword field copied.");
    return;
  }
  const coachButton = event.target.closest("[data-coach-question]");
  if (coachButton) {
    event.preventDefault();
    await askCoach(coachButton.dataset.coachQuestion || "");
    return;
  }
  const trackButton = event.target.closest("[data-track-keyword]");
  if (!trackButton) return;
  event.preventDefault();
  const keyword = trackButton.dataset.trackKeyword || "";
  trackButton.disabled = true;
  const payload = await updateTrackedKeywords("add", keyword);
  trackButton.disabled = false;
  if (payload) setStatus(`Tracking ${keyword}.`);
});

resultsEl.addEventListener("submit", async (event) => {
  const coachForm = event.target.closest("#public-coach-form");
  if (!coachForm) return;
  event.preventDefault();
  const values = formValues(coachForm);
  coachForm.reset();
  await askCoach(values.question || "");
});

workspaceEl.addEventListener("submit", async (event) => {
  const connectionForm = event.target.closest("[data-customer-connection-form]");
  if (connectionForm) {
    event.preventDefault();
    const values = formValues(connectionForm);
    await saveCustomerConnection(values);
    return;
  }
  const keywordForm = event.target.closest("#public-keyword-tracker-form");
  if (keywordForm) {
    event.preventDefault();
    const values = formValues(keywordForm);
    const payload = await updateTrackedKeywords("add", values.keywords || "");
    if (!payload) return;
    keywordForm.reset();
    setStatus(`Tracking ${payload.keywords?.count || 0}/${payload.keywords?.limit || 0} keywords.`);
    return;
  }
  const form = event.target.closest("#public-add-app-form");
  if (!form) return;
  event.preventDefault();
  currentQuery = formValues(form);
  upsertPortfolioApp(currentQuery);
  syncForm(currentQuery);
  await analyze();
});

await loadServerWorkspace({ quiet: true });
await loadCampaigns({ quiet: true });
renderWorkspace();
await analyze();

async function analyze(options = {}) {
  if (!options.quiet) setStatus("Analyzing App Store data...");
  const params = new URLSearchParams({
    appUrl: currentQuery.appUrl || "",
    country: currentQuery.country || "US",
    keywords: currentQuery.keywords || "",
    baselineRank: currentQuery.baselineRank || "60"
  });
  currentPayload = await fetchJson(`/api/aso-saas?${params}`);
  if (currentPayload.error) {
    setStatus(currentPayload.error);
    return;
  }
  upsertPortfolioApp({
    ...currentQuery,
    name: currentPayload.app?.name,
    appId: currentPayload.app?.appId,
    category: currentPayload.app?.category,
    rankLabel: currentPayload.current?.rankLabel,
    ratingAverage: currentPayload.current?.ratingAverage,
    ratingCount: currentPayload.current?.ratingCount
  }, { preserveSelection: true });
  if (!options.quiet) setStatus(`Analyzed ${currentPayload.app?.name || "app"}.`);
  renderWorkspace();
  renderResults(currentPayload);
}

async function updateTrackedKeywords(mode, keywords) {
  const app = selectedPortfolioApp();
  if (!app) return null;
  const values = parseCsvTerms(keywords);
  const current = new Set((app.keywords || []).map(normalizeUiKey));
  if (mode === "remove") {
    app.keywords = (app.keywords || []).filter((keyword) => normalizeUiKey(keyword) !== normalizeUiKey(keywords));
  } else {
    for (const value of values) {
      if (!current.has(normalizeUiKey(value))) app.keywords.push(value);
    }
  }
  currentQuery = appToQuery(app);
  syncForm(currentQuery);
  savePortfolio();
  renderWorkspace();
  await analyze({ quiet: true });
  return { keywords: { count: app.keywords.length, limit: 1000 } };
}

async function loadServerWorkspace(options = {}) {
  if (!hasServerWorkspaceAccess()) return null;
  if (!options.quiet) setStatus("Loading customer workspace...");
  const payload = await fetchJson(`/api/aso-saas/workspace?${workspaceQuery()}`);
  if (payload.error || !payload.workspace) {
    setStatus(payload.error || "Could not load customer workspace.");
    return null;
  }
  serverWorkspace = payload.workspace;
  customerConnections = normalizeCustomerConnections(payload.workspace.connections || customerConnections);
  saveCustomerConnections();
  portfolio.apps = (payload.workspace.apps || []).map(workspaceAppToPortfolioApp);
  savePortfolio();
  selectedAppId = queryParams.get("appId") || portfolio.apps[0]?.id || "";
  const selected = selectedPortfolioApp();
  if (selected) {
    currentQuery = appToQuery(selected);
    syncForm(currentQuery);
  }
  if (!options.quiet) setStatus(`Loaded workspace ${payload.workspace.id}.`);
  return payload.workspace;
}

async function saveCustomerConnection(values = {}) {
  const connection = normalizeCustomerConnection(values);
  if (hasServerWorkspaceAccess()) {
    const payload = await fetchJson(`/api/aso-saas/connections?${workspaceQuery()}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: values.service, fields: values })
    });
    if (payload.error) {
      setStatus(payload.error);
      return;
    }
    serverWorkspace = payload.workspace || serverWorkspace;
    customerConnections = normalizeCustomerConnections(payload.workspace?.connections || [payload.connection, ...customerConnections]);
    setStatus(`${payload.connection?.label || connection.label} connection saved.`);
  } else {
    customerConnections = upsertCustomerConnection(customerConnections, connection);
    setStatus(`${connection.label} connection saved locally.`);
  }
  saveCustomerConnections();
  renderWorkspace();
  if (currentPayload) renderResults(currentPayload);
}

function hasServerWorkspaceAccess() {
  return Boolean(workspaceAccess.workspaceId && workspaceAccess.token && workspaceAccess.token !== "local" && workspaceAccess.workspaceId !== "local-portfolio");
}

function workspaceQuery() {
  return new URLSearchParams(workspaceAccess).toString();
}

function workspaceAppToPortfolioApp(app = {}) {
  return normalizePortfolioApp({
    id: app.appId || app.id,
    appId: app.appId || app.id,
    appUrl: app.appUrl || app.storeUrl || `https://apps.apple.com/us/app/id${app.appId || app.id}`,
    name: app.name,
    country: app.country || "US",
    baselineRank: app.baselineRank || "60",
    keywords: app.keywords || [],
    category: app.category,
    rankLabel: app.historySummary?.latest?.rankLabel || app.rankLabel || "",
    ratingAverage: app.ratingAverage,
    ratingCount: app.ratingCount
  });
}

async function askCoach(question) {
  const cleanQuestion = String(question || "").trim();
  if (!cleanQuestion || coachBusy) return;
  coachBusy = true;
  coachMessages.push({ role: "user", content: cleanQuestion });
  renderResults(currentPayload || {});
  const payload = await fetchJson("/api/aso-saas/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: cleanQuestion,
      analysis: currentPayload || {},
      app: selectedPortfolioApp() || {},
      connections: customerConnections
    })
  });
  coachBusy = false;
  if (payload.error) {
    coachMessages.push({ role: "assistant", content: `I could not answer that yet: ${payload.error}` });
  } else {
    coachMessages.push({
      role: "assistant",
      content: [payload.answer, ...(payload.steps || []).map((step) => `- ${step}`)].filter(Boolean).join("\n")
    });
    coachSuggestions = payload.suggestions?.length ? payload.suggestions : coachSuggestions;
    coachConnectionChecks = payload.connectionChecks || [];
  }
  renderResults(currentPayload || {});
}

function renderWorkspace() {
  const apps = portfolio.apps || [];
  const activeApp = selectedPortfolioApp() || apps[0] || {};
  const workspaceLabel = hasServerWorkspaceAccess()
    ? `${serverWorkspace?.plan || "customer"} workspace`
    : "local browser workspace";
  if (activeApp.id && selectedAppId !== activeApp.id) selectedAppId = activeApp.id;
  activeTrackedKeywords = activeApp.keywords || [];
  workspaceEl.innerHTML = `
    <article class="public-workspace-card">
      <div class="panel-header">
        <h3>App Portfolio</h3>
        <span>${apps.length} apps · ${escapeHtml(workspaceLabel)}</span>
      </div>
      <div class="public-app-switcher">
        ${apps.map((app) => `
          <button class="${String(app.id) === String(activeApp.id) ? "active" : ""}" type="button" data-select-app="${escapeHtml(app.id)}">
            <strong>${escapeHtml(app.name || app.appUrl || "Untitled app")}</strong>
            <span>${escapeHtml(app.country || "US")} · ${escapeHtml(app.rankLabel || app.appId || "not analyzed")}</span>
          </button>
        `).join("") || `<p class="public-import-note">Add an App Store URL or import your App Store Connect apps.</p>`}
      </div>
      <div class="public-access-row">
        <code>${escapeHtml(activeApp.appId || activeApp.id || "No app selected")}</code>
        ${activeApp.id ? `<button class="button secondary" type="button" data-remove-app="${escapeHtml(activeApp.id)}">Remove App</button>` : ""}
      </div>
      ${customerConnectionPanel()}
      ${campaignPortfolioPanel(activeApp)}
      ${keywordTrackerPanel(activeApp, currentPayload?.keywords || {}, { limits: { keywords: 1000 } })}
      <form id="public-add-app-form" class="public-add-app-form">
        <label>
          <span>Add App Store URL</span>
          <input name="appUrl" type="url" required placeholder="https://apps.apple.com/us/app/example/id123456789">
        </label>
        <div class="public-saas-row">
          <label>
            <span>Country</span>
            <input name="country" type="text" maxlength="2" value="US">
          </label>
          <label>
            <span>Baseline rank</span>
            <input name="baselineRank" type="number" value="60" min="1">
          </label>
        </div>
        <label>
          <span>Keywords</span>
          <textarea name="keywords" rows="3" placeholder="keyword one, keyword two"></textarea>
        </label>
        <button class="button secondary" type="submit">Add App</button>
      </form>
    </article>
  `;
}

function customerConnectionPanel() {
  const readyCount = customerConnections.filter((connection) => connection.ready).length;
  return `
    <section class="public-connection-panel">
      <div class="rank-action-top">
        <strong>Connect Your Data</strong>
        <span>${readyCount}/${customerConnections.length} connected · App Store Connect, RevenueCat, Apple Ads</span>
      </div>
      <p class="public-import-note">Use the customer's own App Store Connect, RevenueCat, and Apple Ads credentials. Do not paste private key contents into chat. Store secrets in the app's secure credential flow or import CSV rows as a fallback.</p>
      <div class="public-connection-grid">
        ${customerConnections.map(customerConnectionCard).join("")}
      </div>
    </section>
  `;
}

function customerConnectionCard(connection = {}) {
  const fields = connection.fields || {};
  const storedSecrets = connection.storedSecrets || {};
  if (connection.service === "app-store-connect") {
    return `
      <form data-customer-connection-form class="public-connection-card ${connection.ready ? "ready" : ""}">
        <input type="hidden" name="service" value="app-store-connect">
        <div class="rank-action-top"><strong>App Store Connect</strong><span>${connection.ready ? "connected" : "needed"}</span></div>
        <p>${escapeHtml(connection.purpose)}</p>
        <label><span>Key ID</span><input name="keyId" value="${escapeHtml(fields.keyId || "")}" placeholder="ABC123DEFG"></label>
        <label><span>Issuer ID</span><input name="issuerId" value="${escapeHtml(fields.issuerId || "")}" placeholder="uuid issuer id"></label>
        <label><span>Vendor number optional</span><input name="vendorNumber" value="${escapeHtml(fields.vendorNumber || "")}" placeholder="Sales reports"></label>
        <label><span>.p8 private key</span><textarea name="privateKeySecret" rows="3" placeholder="Paste AuthKey_<KEY_ID>.p8 here to store it encrypted. Leave blank if already stored."></textarea></label>
        ${storedSecrets.privateKey ? `<p class="public-vault-note">Encrypted key stored ${escapeHtml(formatDate(storedSecrets.privateKey.storedAt))}</p>` : ""}
        <label class="public-checkbox"><input name="privateKeyStored" type="checkbox"${fields.privateKeyStored ? " checked" : ""}> <span>Private key is already stored in the app credential vault or managed externally</span></label>
        <button class="button secondary" type="submit">Save ASC Setup</button>
      </form>
    `;
  }
  if (connection.service === "revenuecat") {
    return `
      <form data-customer-connection-form class="public-connection-card ${connection.ready ? "ready" : ""}">
        <input type="hidden" name="service" value="revenuecat">
        <div class="rank-action-top"><strong>RevenueCat</strong><span>${connection.ready ? "connected" : "needed"}</span></div>
        <p>${escapeHtml(connection.purpose)}</p>
        <label><span>Project ID</span><input name="projectId" value="${escapeHtml(fields.projectId || "")}" placeholder="proj..."></label>
        <label><span>Project label optional</span><input name="projectName" value="${escapeHtml(fields.projectName || "")}" placeholder="App name"></label>
        <label><span>RevenueCat API key</span><input name="apiKeySecret" type="password" autocomplete="off" placeholder="Store encrypted; never shown again"></label>
        ${storedSecrets.apiKey ? `<p class="public-vault-note">Encrypted API key stored ${escapeHtml(formatDate(storedSecrets.apiKey.storedAt))} ${escapeHtml(storedSecrets.apiKey.preview || "")}</p>` : ""}
        <label class="public-checkbox"><input name="apiKeyStored" type="checkbox"${fields.apiKeyStored ? " checked" : ""}> <span>RevenueCat API key is already stored in the app credential vault or managed externally</span></label>
        <button class="button secondary" type="submit">Save RevenueCat Setup</button>
      </form>
    `;
  }
  return `
    <form data-customer-connection-form class="public-connection-card ${connection.ready ? "ready" : ""}">
      <input type="hidden" name="service" value="apple-ads">
      <div class="rank-action-top"><strong>Apple Ads</strong><span>${connection.ready ? "connected" : "csv fallback ok"}</span></div>
      <p>${escapeHtml(connection.purpose)}</p>
      <label><span>Client ID</span><input name="clientId" value="${escapeHtml(fields.clientId || "")}" placeholder="OAuth client ID"></label>
      <label><span>Team ID</span><input name="teamId" value="${escapeHtml(fields.teamId || "")}" placeholder="Apple Ads team ID"></label>
      <label><span>Key ID</span><input name="keyId" value="${escapeHtml(fields.keyId || "")}" placeholder="Apple Ads key ID"></label>
      <label><span>Org ID</span><input name="orgId" value="${escapeHtml(fields.orgId || "")}" placeholder="Apple Ads org ID"></label>
      <label><span>Apple Ads private key</span><textarea name="privateKeySecret" rows="3" placeholder="Paste the Apple Ads private key here to store it encrypted. Leave blank if already stored."></textarea></label>
      ${storedSecrets.privateKey ? `<p class="public-vault-note">Encrypted key stored ${escapeHtml(formatDate(storedSecrets.privateKey.storedAt))}</p>` : ""}
      <label class="public-checkbox"><input name="privateKeyStored" type="checkbox"${fields.privateKeyStored ? " checked" : ""}> <span>Apple Ads private key is already stored in the app credential vault or managed externally</span></label>
      <button class="button secondary" type="submit">Save Apple Ads Setup</button>
    </form>
  `;
}

async function loadCampaigns(options = {}) {
  if (!options.quiet) setStatus("Loading Apple Ads campaigns...");
  if (refreshCampaignsButton) refreshCampaignsButton.disabled = true;
  const payload = await fetchJson("/api/apple-ads/campaigns");
  if (refreshCampaignsButton) refreshCampaignsButton.disabled = false;
  const rows = payload.body?.data || payload.data || [];
  if (payload.error || !Array.isArray(rows)) {
    if (!options.quiet) setStatus(payload.error || "Could not load Apple Ads campaigns.");
    return;
  }
  campaignRows = rows.map(normalizeCampaignRow).filter((campaign) => campaign.id);
  attachCampaignApps();
  savePortfolio();
  renderWorkspace();
  if (!options.quiet) setStatus(`Loaded ${campaignRows.length} Apple Ads campaigns.`);
}

function normalizeCampaignRow(row = {}) {
  const reasons = Array.isArray(row.servingStateReasons) ? row.servingStateReasons : [];
  const amount = Number(row.dailyBudgetAmount?.amount || row.budgetAmount?.amount || 0);
  return {
    id: String(row.id || "").trim(),
    appId: String(row.adamId || row.app?.adamId || "").trim(),
    name: String(row.name || "Untitled campaign").trim(),
    status: String(row.status || "UNKNOWN").trim(),
    servingStatus: String(row.servingStatus || "UNKNOWN").trim(),
    displayStatus: String(row.displayStatus || row.status || "UNKNOWN").trim(),
    dailyBudget: amount ? `$${amount.toFixed(0)}/day` : "No daily budget",
    budgetAmount: amount,
    reasons,
    countries: Array.isArray(row.countriesOrRegions) ? row.countriesOrRegions : [],
    createdAt: row.createdTime || row.createdAt || ""
  };
}

function attachCampaignApps() {
  for (const campaign of campaignRows) {
    if (!campaign.appId) continue;
    const existing = portfolio.apps.find((app) => String(app.appId) === String(campaign.appId));
    if (existing) continue;
    upsertPortfolioApp({
      id: campaign.appId,
      appId: campaign.appId,
      name: campaignAppName(campaign),
      appUrl: `https://apps.apple.com/us/app/id${campaign.appId}`,
      country: campaign.countries.includes("US") ? "US" : "US",
      baselineRank: "60",
      keywords: inferSeedKeywords(campaign.name)
    }, { preserveSelection: true });
  }
}

function campaignAppName(campaign = {}) {
  if (String(campaign.appId) === "6782313559") return "Legend Run: 162-0";
  if (String(campaign.appId) === "6782729206") return "Legend Run: The Perfect Album";
  if (String(campaign.appId) === "6781080886") return "Legend Run: 16-0";
  if (String(campaign.appId) === "6780004544") return "PlantEdu";
  if (String(campaign.appId) === "6779005725") return "Legend Run: 82-0";
  if (String(campaign.appId) === "6770161145") return "Cup Companion";
  if (String(campaign.appId) === "6761767663") return "BARE";
  if (String(campaign.appId) === "6760570091") return "Blueprint AI";
  return `App ${campaign.appId}`;
}

function campaignPortfolioPanel(activeApp = {}) {
  const appId = String(activeApp.appId || "");
  const rows = campaignRows.filter((campaign) => String(campaign.appId) === appId);
  const totalBudget = rows.reduce((sum, campaign) => sum + (campaign.budgetAmount || 0), 0);
  const activeCount = rows.filter((campaign) => normalizeUiKey(campaign.status) === "enabled").length;
  return `
    <section class="public-campaign-panel">
      <div class="rank-action-top">
        <strong>Apple Ads Campaigns</strong>
        <span>${rows.length} linked · ${activeCount} enabled · $${totalBudget.toFixed(0)}/day</span>
      </div>
      ${rows.length ? `
        <div class="public-campaign-list">
          ${rows.map(campaignCard).join("")}
        </div>
      ` : `
        <p class="public-import-note">No Apple Ads campaigns are linked to this app ID yet. Use Refresh Campaigns after creating campaigns in Apple Ads.</p>
      `}
    </section>
  `;
}

function campaignCard(campaign = {}) {
  const isBlocked = campaign.displayStatus === "ON_HOLD" || campaign.servingStatus === "NOT_RUNNING" || campaign.reasons.length;
  return `
    <article class="public-campaign-card ${isBlocked ? "warning" : "ready"}">
      <div>
        <strong>${escapeHtml(campaign.name)}</strong>
        <span>${escapeHtml(campaign.dailyBudget)} · ${campaign.countries.length ? escapeHtml(campaign.countries.join(", ")) : "countries not listed"}</span>
      </div>
      <div class="public-campaign-status">
        <span>${escapeHtml(campaign.status)}</span>
        <span>${escapeHtml(campaign.displayStatus)}</span>
        <span>${escapeHtml(campaign.servingStatus)}</span>
      </div>
      ${campaign.reasons.length ? `
        <p>${escapeHtml(campaign.reasons.join(" · "))}</p>
      ` : ""}
      <p><strong>Action:</strong> ${escapeHtml(campaignAction(campaign))}</p>
    </article>
  `;
}

function campaignAction(campaign = {}) {
  const reasons = new Set((campaign.reasons || []).map(String));
  if (reasons.has("NO_AVAILABLE_AD_GROUPS")) return "Create an ad group with exact baseball keywords, or pause this campaign until the ad group exists.";
  if (reasons.has("APP_NOT_CATEGORIZED")) return "Do not change bids yet. Wait for Apple to categorize the new App Store listing, then confirm serving starts.";
  if (normalizeUiKey(campaign.status) === "paused") return "Paused. Leave off unless this app needs spend again.";
  if (normalizeUiKey(campaign.servingStatus) === "running") return "Running. Watch spend, taps, installs, and CPA against rank movement.";
  if (campaign.displayStatus === "ON_HOLD") return "Campaign is on hold. Check Apple Ads setup before expecting installs.";
  return "Monitor after the next Apple Ads reporting refresh.";
}

function loadPortfolio() {
  const stored = safeJsonParse(localStorage.getItem(PORTFOLIO_KEY));
  if (stored?.apps?.length) {
    return {
      apps: stored.apps.map(normalizePortfolioApp).filter((app) => app.appUrl)
    };
  }
  return {
    apps: [
      normalizePortfolioApp({
        name: "Legend Run: The Perfect Album",
        appId: "6782729206",
        appUrl: "https://apps.apple.com/us/app/legend-run-the-perfect-album/id6782729206",
        country: "US",
        baselineRank: "60",
        keywords: "perfect album,music game,album ranking,album collection,music trivia,music challenge"
      }),
      normalizePortfolioApp({
        name: "Legend Run: 16-0",
        appId: "6781080886",
        appUrl: "https://apps.apple.com/us/app/legend-run-16-0/id6781080886",
        country: "US",
        baselineRank: "60",
        keywords: "16-0,16 and 0,football game,football run,undefeated football,sports game"
      }),
      normalizePortfolioApp({
        name: "Legend Run: 162-0",
        appId: "6782313559",
        appUrl: "https://apps.apple.com/us/app/legend-run-162-0/id6782313559",
        country: "US",
        baselineRank: "60",
        keywords: "162-0,162 and 0,baseball game,baseball simulator,baseball manager,baseball gm,baseball lineup,baseball strategy"
      }),
      normalizePortfolioApp({
        name: "Legend Run: 82-0",
        appId: "6779005725",
        appUrl: "https://apps.apple.com/us/app/legend-run-82-0/id6779005725",
        country: "US",
        baselineRank: "60",
        keywords: "82-0,82 and 0,basketball simulator,basketball manager,basketball gm,sports game"
      })
    ]
  };
}

function loadCustomerConnections() {
  return normalizeCustomerConnections(safeJsonParse(localStorage.getItem(CONNECTIONS_KEY))?.connections || []);
}

function saveCustomerConnections() {
  localStorage.setItem(CONNECTIONS_KEY, JSON.stringify({ connections: customerConnections }));
}

function defaultCustomerConnections() {
  return [
    {
      service: "app-store-connect",
      label: "App Store Connect",
      ready: false,
      status: "needs-credentials",
      purpose: "Owned apps, metadata, sales context, product-page tests, and review exports.",
      required: ["keyId", "issuerId", "privateKeyStored"],
      fields: {}
    },
    {
      service: "revenuecat",
      label: "RevenueCat",
      ready: false,
      status: "needs-credentials",
      purpose: "Gross revenue, Apple cut, after-Apple revenue, and gross profit by app.",
      required: ["projectId", "apiKeyStored"],
      fields: {}
    },
    {
      service: "apple-ads",
      label: "Apple Ads",
      ready: false,
      status: "needs-credentials-or-import",
      purpose: "Campaign spend, taps, installs, CPI, keywords, and search terms.",
      required: ["clientId", "teamId", "keyId", "privateKeyStored", "orgId"],
      fields: {}
    }
  ];
}

function normalizeCustomerConnections(rows = []) {
  return defaultCustomerConnections().map((defaults) => {
    const existing = rows.find((row) => row.service === defaults.service) || {};
    return {
      ...defaults,
      ...existing,
      fields: existing.fields || {},
      ready: Boolean(existing.ready),
      missing: existing.missing || missingConnectionFields(defaults, existing.fields || {})
    };
  });
}

function normalizeCustomerConnection(values = {}) {
  const service = normalizeConnectionService(values.service);
  const defaults = defaultCustomerConnections().find((item) => item.service === service) || defaultCustomerConnections()[0];
  const fields = {};
  const hasPrivateKeySecret = Boolean(String(values.privateKeySecret || "").trim());
  const hasApiKeySecret = Boolean(String(values.apiKeySecret || "").trim());
  for (const key of defaults.required) {
    if (key.endsWith("Stored")) {
      fields[key] = values[key] === "on" || values[key] === "true" || values[key] === true
        || (key === "privateKeyStored" && hasPrivateKeySecret)
        || (key === "apiKeyStored" && hasApiKeySecret);
    }
    else fields[key] = String(values[key] || "").trim();
  }
  if (values.vendorNumber) fields.vendorNumber = String(values.vendorNumber).trim();
  if (values.projectName) fields.projectName = String(values.projectName).trim();
  const missing = missingConnectionFields(defaults, fields);
  return {
    ...defaults,
    fields,
    ready: missing.length === 0,
    status: missing.length === 0 ? "connected" : "needs-credentials",
    missing,
    updatedAt: new Date().toISOString()
  };
}

function normalizeConnectionService(value = "") {
  const key = normalizeUiKey(value);
  if (key === "asc" || key === "app store connect" || key === "appstoreconnect") return "app-store-connect";
  if (key === "revenue cat" || key === "revenue-cat") return "revenuecat";
  if (key === "apple ads" || key === "appleads" || key === "search ads") return "apple-ads";
  return key;
}

function missingConnectionFields(defaults, fields = {}) {
  return (defaults.required || []).filter((key) => !fields[key]);
}

function upsertCustomerConnection(rows = [], connection) {
  const normalized = normalizeCustomerConnections(rows);
  const index = normalized.findIndex((row) => row.service === connection.service);
  if (index >= 0) normalized[index] = connection;
  else normalized.push(connection);
  return normalizeCustomerConnections(normalized);
}

function savePortfolio() {
  portfolio.apps = uniquePortfolioApps(portfolio.apps.map(normalizePortfolioApp).filter((app) => app.appUrl));
  localStorage.setItem(PORTFOLIO_KEY, JSON.stringify(portfolio));
}

function initialQuery() {
  const urlQuery = {
    appUrl: queryParams.get("appUrl") || "",
    country: queryParams.get("country") || "US",
    baselineRank: queryParams.get("baselineRank") || "60",
    keywords: queryParams.get("keywords") || ""
  };
  if (urlQuery.appUrl) {
    const app = upsertPortfolioApp(urlQuery, { preserveSelection: true });
    selectedAppId = app.id;
    return appToQuery(app);
  }
  const selected = portfolio.apps.find((app) => app.id === selectedAppId) || portfolio.apps[0] || {};
  return appToQuery(selected);
}

function normalizePortfolioApp(app = {}) {
  const appUrl = String(app.appUrl || app.storeUrl || "").trim();
  const appId = String(app.appId || parseAppId(appUrl) || "").trim();
  const id = String(app.id || appId || appUrl).trim();
  return {
    id,
    appId,
    appUrl,
    name: String(app.name || "").trim(),
    country: String(app.country || "US").trim().toUpperCase() || "US",
    baselineRank: String(app.baselineRank || "60"),
    keywords: parseCsvTerms(app.keywords),
    category: String(app.category || "").trim(),
    rankLabel: String(app.rankLabel || "").trim(),
    ratingAverage: app.ratingAverage ?? null,
    ratingCount: app.ratingCount ?? null
  };
}

function appToQuery(app = {}) {
  return {
    appUrl: app.appUrl || "",
    country: app.country || "US",
    baselineRank: app.baselineRank || "60",
    keywords: (app.keywords || []).join(", ")
  };
}

function selectedPortfolioApp() {
  return portfolio.apps.find((app) => app.id === selectedAppId) || portfolio.apps[0] || null;
}

function upsertPortfolioApp(values = {}, options = {}) {
  const app = normalizePortfolioApp({
    ...values,
    keywords: values.keywords || selectedPortfolioApp()?.keywords || []
  });
  const existingIndex = portfolio.apps.findIndex((row) => row.id === app.id || (app.appId && row.appId === app.appId) || row.appUrl === app.appUrl);
  if (existingIndex >= 0) {
    const existing = portfolio.apps[existingIndex];
    portfolio.apps[existingIndex] = normalizePortfolioApp({
      ...existing,
      ...app,
      keywords: app.keywords.length ? app.keywords : existing.keywords
    });
  } else {
    portfolio.apps.unshift(app);
  }
  const saved = existingIndex >= 0 ? portfolio.apps[existingIndex] : app;
  if (!options.preserveSelection) selectedAppId = saved.id;
  if (options.preserveSelection && !selectedAppId) selectedAppId = saved.id;
  savePortfolio();
  return saved;
}

function removePortfolioApp(id) {
  portfolio.apps = portfolio.apps.filter((app) => app.id !== id);
  if (selectedAppId === id) selectedAppId = portfolio.apps[0]?.id || "";
  savePortfolio();
  const app = selectedPortfolioApp();
  if (app) {
    currentQuery = appToQuery(app);
    syncForm(currentQuery);
    setStatus(`Removed app. Selected ${app.name || app.appId || "next app"}.`);
  } else {
    setStatus("Removed app. Add or import an App Store app to continue.");
    resultsEl.innerHTML = "";
  }
}

async function importAppStoreConnectApps() {
  importAscAppsButton.disabled = true;
  setStatus("Importing App Store Connect apps...");
  const payload = await fetchJson("/api/app-store-connect/apps");
  importAscAppsButton.disabled = false;
  const rows = payload.body?.data || payload.data || [];
  if (payload.error || !Array.isArray(rows)) {
    setStatus(payload.error || "Could not import App Store Connect apps.");
    return;
  }
  let added = 0;
  for (const row of rows) {
    const appId = String(row.id || "").trim();
    if (!appId) continue;
    const existing = portfolio.apps.find((app) => app.appId === appId);
    const name = row.attributes?.name || existing?.name || `App ${appId}`;
    const keywords = existing?.keywords?.length ? existing.keywords : inferSeedKeywords(name);
    upsertPortfolioApp({
      id: appId,
      appId,
      name,
      appUrl: `https://apps.apple.com/us/app/id${appId}`,
      country: "US",
      baselineRank: existing?.baselineRank || "60",
      keywords
    }, { preserveSelection: true });
    if (!existing) added += 1;
  }
  if (!selectedAppId && portfolio.apps[0]) selectedAppId = portfolio.apps[0].id;
  savePortfolio();
  const selected = selectedPortfolioApp();
  if (selected) {
    currentQuery = appToQuery(selected);
    syncForm(currentQuery);
  }
  renderWorkspace();
  await analyze({ quiet: true });
  setStatus(`Imported ${rows.length} App Store Connect apps (${added} new).`);
}

function inferSeedKeywords(name = "") {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("perfect album")) return parseCsvTerms("perfect album,music game,album ranking,album collection,music trivia,music challenge");
  if (lowerName.includes("16-0") || lowerName.includes("16 0")) return parseCsvTerms("16-0,16 and 0,football game,football run,undefeated football,sports game");
  if (lowerName.includes("162")) return parseCsvTerms("162-0,162 and 0,baseball game,baseball simulator,baseball manager,baseball gm,baseball lineup,baseball strategy");
  if (lowerName.includes("82")) return parseCsvTerms("82-0,82 and 0,basketball simulator,basketball manager,basketball gm,sports game");
  if (lowerName.includes("plantedu") || lowerName.includes("plant")) return parseCsvTerms("plant education,plant identifier,plant care,plant app,plant learning,botany,garden planner");
  if (lowerName.includes("bare")) return parseCsvTerms("food scanner,food scan,ingredient scanner,nutrition scanner,olive food scanner");
  if (lowerName.includes("cup")) return parseCsvTerms("world cup 2026,football 2026,world cup app,fifa world cup,soccer schedule");
  if (lowerName.includes("blueprint")) return parseCsvTerms("construction calculator,blueprint app,roofing estimate,quote app,contractor app");
  return parseCsvTerms(name);
}

function syncForm(values = {}) {
  for (const [key, value] of Object.entries(values)) {
    const field = analyzeForm.elements[key];
    if (field) field.value = value;
  }
}

function parseAppId(appUrl = "") {
  return String(appUrl).match(/id(\d+)/)?.[1] || "";
}

function parseCsvTerms(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniquePortfolioApps(apps = []) {
  const seen = new Set();
  return apps.filter((app) => {
    const key = app.appId || app.appUrl || app.id;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value || "");
  } catch {
    return null;
  }
}

function keywordTrackerPanel(app = {}, keywords = {}, workspace = {}) {
  const tracked = app.keywords || [];
  const limit = workspace.limits?.keywords || tracked.length || 0;
  const trackedKeys = new Set(tracked.map(normalizeUiKey));
  const suggestions = uniqueKeywordSuggestions([
    ...(keywords.opportunities || []),
    ...(keywords.rows || [])
  ], trackedKeys).slice(0, 6);
  return `
    <section class="public-keyword-tracker-panel">
      <div class="rank-action-top">
        <strong>Tracked Keywords</strong>
        <span>${tracked.length}/${limit} saved</span>
      </div>
      <div class="public-keyword-chip-list">
        ${tracked.map((keyword) => `
          <span class="public-keyword-chip">
            ${escapeHtml(keyword)}
            <button type="button" aria-label="Remove ${escapeHtml(keyword)}" data-remove-keyword="${escapeHtml(keyword)}">Remove</button>
          </span>
        `).join("") || `<p class="public-import-note">Save keywords to monitor rank, paid conversion, and listing coverage over time.</p>`}
      </div>
      ${suggestions.length ? `
        <div class="public-keyword-suggestions">
          ${suggestions.map((row) => `
            <button type="button" data-track-keyword="${escapeHtml(row.keyword || row.term)}">
              <strong>${escapeHtml(row.keyword || row.term)}</strong>
              <span>${escapeHtml(row.action || "watch")} · ${escapeHtml(row.rankLabel || ">50")}</span>
            </button>
          `).join("")}
        </div>
      ` : ""}
      <form id="public-keyword-tracker-form" class="public-add-app-form">
        <label>
          <span>Add keywords</span>
          <textarea name="keywords" rows="2" required placeholder="keyword one, keyword two"></textarea>
        </label>
        <button class="button secondary" type="submit">Add Keywords</button>
      </form>
    </section>
  `;
}

function reviewsImportPanel(app = {}, reviews = {}) {
  const summary = app.reviewImportSummary || reviews.import || {};
  const stats = reviews.summary || summary.summary || {};
  const themes = reviews.topThemes || stats.topThemes || [];
  const recentNegative = reviews.recentNegativeReviews || stats.latestNegativeReviews || [];
  const hasImport = Boolean(summary.createdAt || reviews.source === "customer-review-import");
  return `
    <section class="public-ads-import-panel">
      <div class="rank-action-top">
        <strong>Review Import</strong>
        <span>${hasImport ? "customer reviews" : "public rating only"}</span>
      </div>
      <div class="public-import-metrics">
        ${metric("Avg rating", stats.averageRatingLabel || (reviews.ratingAverage ? `${Number(reviews.ratingAverage).toFixed(1)} stars` : "n/a"))}
        ${metric("Reviews", stats.rowCount || reviews.ratingCount || 0)}
        ${metric("Negative", stats.negativeCount || 0)}
        ${metric("Top theme", themes[0]?.label || "n/a")}
      </div>
      <p class="public-import-note">${hasImport ? `Latest: ${escapeHtml(summary.sourceName || "Review export")} · ${escapeHtml(new Date(summary.createdAt).toLocaleString())}` : "Import App Store review exports to turn paywall, bug, pricing, and onboarding complaints into rank-recovery actions."}</p>
      ${themes.length ? `
        <div class="public-import-risk-list">
          ${themes.slice(0, 4).map((theme) => `
            <article>
              <strong>${escapeHtml(theme.label || "Theme")}</strong>
              <span>${escapeHtml(theme.count || 0)} negative reviews</span>
              <code>${escapeHtml(theme.action || "respond to review + inspect session")}</code>
            </article>
          `).join("")}
        </div>
      ` : ""}
      ${recentNegative.length ? `
        <div class="public-review-list">
          ${recentNegative.slice(0, 3).map((review) => `
            <article>
              <strong>${escapeHtml(review.title || review.themeLabel || "Negative review")}</strong>
              <span>${escapeHtml(review.rating || 0)} stars · ${escapeHtml(review.themeLabel || "")}</span>
              <p>${escapeHtml(review.body || "")}</p>
            </article>
          `).join("")}
        </div>
      ` : ""}
      <form id="public-reviews-import-form" class="public-add-app-form">
        <label>
          <span>Source name</span>
          <input name="sourceName" type="text" placeholder="App Store review export">
        </label>
        <label>
          <span>CSV rows</span>
          <textarea name="csv" rows="5" required placeholder="Rating,Title,Body,Date,Version&#10;1,Paywall too early,Could not finish the first session before unlock.,2026-06-25,1.0"></textarea>
        </label>
        <button class="button secondary" type="submit">Import Reviews</button>
      </form>
    </section>
  `;
}

function metadataImportPanel(app = {}, metadata = {}) {
  const summary = app.metadataImportSummary || metadata.import || {};
  const fields = metadata.fields || {};
  const hasImport = Boolean(summary.createdAt || metadata.source === "customer-metadata-import");
  return `
    <section class="public-ads-import-panel">
      <div class="rank-action-top">
        <strong>Metadata Import</strong>
        <span>${hasImport ? "customer metadata" : "public lookup only"}</span>
      </div>
      <div class="public-import-metrics">
        ${metric("Score", metadata.scoreLabel || "n/a")}
        ${metric("Subtitle", fields.subtitleAvailable ? `${fields.subtitleLength || 0}/30` : "missing")}
        ${metric("Keywords", fields.keywordFieldAvailable ? `${fields.keywordFieldLength || 0}/100` : "missing")}
        ${metric("Shots", fields.screenshotCount || summary.screenshotCount || 0)}
      </div>
      <p class="public-import-note">${hasImport ? `Latest: ${escapeHtml(summary.sourceName || "App Store Connect metadata")} · ${escapeHtml(summary.locale || "locale")}` : "Import subtitle and keyword field from App Store Connect for exact listing coverage."}</p>
      <form id="public-metadata-import-form" class="public-add-app-form">
        <div class="public-saas-row">
          <label>
            <span>Locale</span>
            <input name="locale" type="text" value="en-US">
          </label>
          <label>
            <span>Screenshots</span>
            <input name="screenshotCount" type="number" min="0" max="10" placeholder="8">
          </label>
        </div>
        <label>
          <span>App name</span>
          <input name="title" type="text" maxlength="30" placeholder="App name in App Store Connect">
        </label>
        <label>
          <span>Subtitle</span>
          <input name="subtitle" type="text" maxlength="30" placeholder="30 characters max">
        </label>
        <label>
          <span>Keyword field</span>
          <textarea name="keywordField" rows="3" maxlength="100" placeholder="comma,separated,keywords"></textarea>
        </label>
        <label>
          <span>Description optional</span>
          <textarea name="description" rows="4" placeholder="Paste listing description if you want description coverage scored too."></textarea>
        </label>
        <button class="button secondary" type="submit">Import Metadata</button>
      </form>
    </section>
  `;
}

function appleAdsImportPanel(app = {}, ads = {}) {
  const summary = app.appleAdsImportSummary || ads.imports || {};
  const totals = summary.totals || {};
  const latest = summary.latest || {};
  const risks = summary.topNoInstallRisks || [];
  return `
    <section class="public-ads-import-panel">
      <div class="rank-action-top">
        <strong>Apple Ads Import</strong>
        <span>${summary.importCount || 0} imports · ${summary.rowCount || 0} rows</span>
      </div>
      <div class="public-import-metrics">
        ${metric("Spend", totals.spendLabel || "$0.00")}
        ${metric("Taps", totals.taps || 0)}
        ${metric("Installs", totals.installs || 0)}
        ${metric("CPI", totals.cpiLabel || "$0.00")}
      </div>
      ${latest.createdAt ? `<p class="public-import-note">Latest: ${escapeHtml(latest.sourceName || "Apple Ads CSV")} · ${escapeHtml(new Date(latest.createdAt).toLocaleString())}</p>` : `<p class="public-import-note">Import a keyword or search-term export to connect paid demand with ASO actions.</p>`}
      ${risks.length ? `
        <div class="public-import-risk-list">
          ${risks.map((row) => `
            <article>
              <strong>${escapeHtml(row.term || row.keyword || row.searchTerm)}</strong>
              <span>${escapeHtml(row.matchType || "EXACT")} · ${escapeHtml(row.spendLabel || "$0.00")} · ${escapeHtml(row.taps || 0)} taps · ${escapeHtml(row.installs || 0)} installs</span>
              <code>${normalizeImportAction(row)}</code>
            </article>
          `).join("")}
        </div>
      ` : ""}
      <form id="public-ads-import-form" class="public-add-app-form">
        <label>
          <span>Source name</span>
          <input name="sourceName" type="text" placeholder="Apple Ads search-term report">
        </label>
        <label>
          <span>CSV rows</span>
          <textarea name="csv" rows="5" required placeholder="Search Term,Keyword,Match Type,Spend,Taps,Installs,Campaign&#10;ai chatbot,ai chat,EXACT,$12.50,20,5,Brand Exact"></textarea>
        </label>
        <button class="button secondary" type="submit">Import Apple Ads CSV</button>
      </form>
    </section>
  `;
}

function normalizeImportAction(row = {}) {
  if (String(row.matchType || "").toLowerCase() === "broad") return "lower bid percentage or add negative exact";
  return "pause or lower bid";
}

function competitorPanel(app = {}, research = {}) {
  const competitors = research.competitors?.length ? research.competitors : app.competitors || [];
  const gaps = research.keywordGaps || [];
  const canTrack = Boolean(workspaceAccess.workspaceId && workspaceAccess.token);
  const trackedKeys = new Set(activeTrackedKeywords.map(normalizeUiKey));
  return `
    <section class="public-competitor-panel">
      <div class="rank-action-top">
        <strong>Competitor Keywords</strong>
        <span>${competitors.length} competitors · ${gaps.length} gaps</span>
      </div>
      <div class="public-competitor-list">
        ${competitors.slice(0, 6).map((competitor) => `
          <article>
            <strong>${escapeHtml(competitor.name || `App ${competitor.appId}`)}</strong>
            <span>${escapeHtml(competitor.category || "App Store")} · ${escapeHtml(competitor.gapCount || 0)} gaps</span>
          </article>
        `).join("") || `<p>No named competitors yet.</p>`}
      </div>
      ${gaps.length ? `
        <div class="public-table-wrap">
          <table class="table aso-table">
            <thead><tr><th>Keyword</th><th>You</th><th>Competitor</th><th>Action</th></tr></thead>
            <tbody>
              ${gaps.slice(0, 8).map((gap) => `
                <tr>
                  <td class="aso-keyword-cell"><strong>${escapeHtml(gap.keyword)}</strong><span>${escapeHtml(gap.competitorName || "")} · ${escapeHtml(gap.effectiveness || "")}</span></td>
                  <td>${escapeHtml(gap.targetRankLabel || ">50")}</td>
                  <td>${escapeHtml(gap.competitorRankLabel || ">50")}</td>
                  <td>${keywordActionCell(gap, canTrack, trackedKeys)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<p class="public-competitor-empty">Add a competitor to generate keyword gaps and metadata tests.</p>`}
      <form id="public-add-competitor-form" class="public-add-app-form">
        <label>
          <span>Competitor App Store URL</span>
          <input name="competitorUrl" type="url" required placeholder="https://apps.apple.com/us/app/competitor/id123456789">
        </label>
        <label>
          <span>Seed keywords</span>
          <textarea name="keywords" rows="2" placeholder="optional competitor keyword seeds"></textarea>
        </label>
        <button class="button secondary" type="submit">Add Competitor</button>
      </form>
    </section>
  `;
}

function historyPanel(history = {}) {
  const rows = history.recent || [];
  if (!rows.length) {
    return `<div class="public-history-panel"><span>Rank history</span><p>No monitor snapshots yet. This workspace will build history each time the daily digest or monitor runs.</p></div>`;
  }
  const latest = rows[0] || {};
  const trend = history.trend || {};
  const keywordDeltas = trend.keywordDeltas || [];
  return `
    <div class="public-history-panel">
      <div class="rank-action-top">
        <strong>Rank History</strong>
        <span>${rows.length} snapshots</span>
      </div>
      <div class="public-history-metrics">
        ${metric("Latest rank", latest.rankLabel || "n/a")}
        ${metric("Rank move", rankMoveLabel(latest.rankDeltaLatest))}
        ${metric("7d rank", trend.rankDelta7dLabel || "collecting")}
        ${metric("30d rank", trend.rankDelta30dLabel || "collecting")}
        ${metric("Ratings", latest.ratingCount ?? "n/a")}
        ${metric("Urgent", latest.urgentActionCount || 0)}
      </div>
      ${keywordDeltas.length ? `
        <div class="public-history-keywords">
          <strong>Keyword Movement</strong>
          ${keywordDeltas.slice(0, 5).map((row) => `
            <article>
              <span>${escapeHtml(row.keyword || "")}</span>
              <code>${escapeHtml(row.rankLabel || ">50")} · 7d ${escapeHtml(row.delta7dLabel || "collecting")} · 30d ${escapeHtml(row.delta30dLabel || "collecting")}</code>
            </article>
          `).join("")}
        </div>
      ` : ""}
      <div class="public-history-list">
        ${rows.slice(0, 5).map((row) => `
          <article>
            <strong>${escapeHtml(row.rankLabel || "n/a")}</strong>
            <span>${escapeHtml(row.date || "")} · ${rankMoveLabel(row.rankDeltaLatest)} · ${escapeHtml(row.actionCount || 0)} actions</span>
          </article>
        `).join("")}
      </div>
    </div>
  `;
}

function deliveryPanel(delivery) {
  const rows = delivery.record?.deliveries || [];
  return `
    <div class="public-delivery-panel">
      <span>${delivery.delivered ? "sent" : delivery.queued ? "queued" : "delivery"}</span>
      ${rows.map((row) => `<p>${escapeHtml(row.channel)} · ${escapeHtml(row.mode || "")} · ${escapeHtml(row.status)} · ${escapeHtml(row.message || "")}</p>`).join("")}
      <code>${escapeHtml(delivery.outboxPath || "")}</code>
    </div>
  `;
}

function renderResults(payload) {
  const current = payload.current || {};
  const actions = payload.actions || [];
  const keywords = payload.keywords?.rows || [];
  const competitors = payload.competitors || [];
  const metadata = payload.metadata || {};
  const product = payload.product || {};
  const canTrack = Boolean(workspaceAccess.workspaceId && workspaceAccess.token);
  const trackedKeys = new Set(activeTrackedKeywords.map(normalizeUiKey));
  resultsEl.innerHTML = `
    <section class="public-result-hero">
      <div>
        <span>${escapeHtml(payload.app?.country || "US")} · ${escapeHtml(payload.mode || "partial")}</span>
        <h2>${escapeHtml(payload.app?.name || "App Store app")}</h2>
        <p>${escapeHtml(product.wedge || "Daily rank-drop diagnosis for iOS sellers.")}</p>
      </div>
      <div class="public-metrics">
        ${metric("Rank", current.rankLabel || "n/a")}
        ${metric("Rating", current.ratingAverage ? `${Number(current.ratingAverage).toFixed(1)} stars` : "n/a")}
        ${metric("Keywords", current.trackedKeywords || 0)}
        ${metric("Competitors", competitors.length)}
      </div>
    </section>
    <section class="public-card">
      <div class="panel-header"><h3>Action Queue</h3><span>${actions.length} actions</span></div>
      <div class="public-action-list">
        ${actions.map((action) => `
          <article>
            <div class="rank-action-top"><strong>${escapeHtml(action.title)}</strong><span>${escapeHtml(action.type || "")}</span></div>
            <p>${escapeHtml(action.body || "")}</p>
            <code>${escapeHtml(action.action || action.metric || "")}</code>
          </article>
        `).join("")}
      </div>
    </section>
    ${coachPanel(payload)}
    ${metadataAuditPanel(metadata)}
    <section class="public-card">
      <div class="panel-header"><h3>Keyword Prospecting</h3><span>${keywords.length} terms</span></div>
      <div class="public-table-wrap">
        <table class="table aso-table">
          <thead><tr><th>Keyword</th><th>Rank</th><th>Traffic</th><th>Complexity</th><th>Action</th></tr></thead>
          <tbody>
            ${keywords.slice(0, 12).map((row) => `
              <tr>
                <td class="aso-keyword-cell"><strong>${escapeHtml(row.keyword)}</strong><span>${row.ads?.spendLabel || "$0.00"} · ${row.ads?.installs || 0} installs</span></td>
                <td><span class="rank-pill ${row.rank ? "ranked" : ""}">${escapeHtml(row.rankLabel || ">50")}</span></td>
                <td>${number(row.traffic)}</td>
                <td>${escapeHtml(row.complexity || "")}</td>
                <td>${keywordActionCell(row, canTrack, trackedKeys)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
    <section class="public-card">
      <div class="panel-header"><h3>Competitive Keywords</h3><span>${competitors.length} apps</span></div>
      <div class="public-competitors">
        ${competitors.slice(0, 6).map((competitor) => `
          <article>
            <strong>${escapeHtml(competitor.name)}</strong>
            <p>${escapeHtml(competitor.genre || "App Store")} · ${competitor.appearances} overlaps · avg #${escapeHtml(competitor.averageRank)}</p>
            <div class="rank-module-row">${(competitor.keywords || []).slice(0, 3).map((keyword) => `<span>${escapeHtml(keyword.keyword)} #${escapeHtml(keyword.rank)}</span>`).join("")}</div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function coachPanel(payload = {}) {
  const checks = coachConnectionChecks.length ? coachConnectionChecks : customerConnections;
  return `
    <section class="public-card public-coach-panel">
      <div class="panel-header">
        <h3>Setup + Optimization Coach</h3>
        <span>ASC · RevenueCat · Apple Ads</span>
      </div>
      <div class="public-coach-layout">
        <div class="public-coach-chat" aria-live="polite">
          ${coachMessages.slice(-6).map((message) => `
            <article class="${message.role === "user" ? "user" : "assistant"}">
              <span>${message.role === "user" ? "You" : "Rank Rescue"}</span>
              <p>${escapeHtml(message.content || "")}</p>
            </article>
          `).join("")}
          ${coachBusy ? `<article class="assistant"><span>Rank Rescue</span><p>Checking this workspace...</p></article>` : ""}
        </div>
        <div class="public-coach-side">
          <div class="public-byok-checks">
            ${checks.map((check) => `
              <article class="${check.ready ? "ready" : ""}">
                <strong>${escapeHtml(check.label)}</strong>
                <span>${check.ready ? "connected" : "needs setup"}</span>
                <p>${escapeHtml(check.ready ? check.purpose || "Ready." : (check.missing || []).join(", ") || check.purpose || "Add customer-owned credentials.")}</p>
              </article>
            `).join("")}
          </div>
          <div class="public-coach-suggestions">
            ${coachSuggestions.slice(0, 4).map((question) => `
              <button type="button" data-coach-question="${escapeHtml(question)}">${escapeHtml(question)}</button>
            `).join("")}
          </div>
          <form id="public-coach-form" class="public-coach-form">
            <label>
              <span>Ask the coach</span>
              <textarea name="question" rows="3" required placeholder="What do I need to connect? What should I optimize next?"></textarea>
            </label>
            <button class="button" type="submit"${coachBusy ? " disabled" : ""}>Ask</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function metadataAuditPanel(metadata = {}) {
  if (!metadata.ready) {
    return `
      <section class="public-card">
        <div class="panel-header"><h3>Listing Audit</h3><span>waiting</span></div>
        <p class="public-import-note">Metadata coverage will appear when public App Store lookup data is available.</p>
      </section>
    `;
  }
  const fields = metadata.fields || {};
  const coverage = metadata.coverage || {};
  const rows = coverage.rows || [];
  const missing = metadata.missingHighIntent || [];
  return `
    <section class="public-card public-metadata-card">
      <div class="panel-header"><h3>Listing Audit</h3><span>${escapeHtml(metadata.scoreLabel || "0/100")}</span></div>
      <div class="public-metrics public-metadata-metrics">
        ${metric("Score", metadata.scoreLabel || "0/100")}
        ${metric("Title", `${fields.titleLength || 0}/30`)}
        ${metric("Screenshots", `${fields.screenshotCount || 0}/10`)}
        ${metric("Missing", missing.length)}
      </div>
      ${keywordFieldOptimizerPanel(metadata.keywordFieldPlan || {})}
      <div class="public-action-list public-metadata-recommendations">
        ${(metadata.recommendations || []).slice(0, 3).map((item) => `
          <article>
            <div class="rank-action-top"><strong>${escapeHtml(item.title || "")}</strong><span>${escapeHtml(item.priority || "medium")}</span></div>
            <p>${escapeHtml(item.body || "")}</p>
            <code>${escapeHtml(item.action || "")}</code>
          </article>
        `).join("")}
      </div>
      <div class="public-table-wrap">
        <table class="table aso-table">
          <thead><tr><th>Term</th><th>Title</th><th>Description</th><th>Action</th></tr></thead>
          <tbody>
            ${rows.slice(0, 10).map((row) => `
              <tr>
                <td class="aso-keyword-cell"><strong>${escapeHtml(row.term)}</strong><span>${escapeHtml((row.sources || []).slice(0, 2).join(" + "))}</span></td>
                <td><span class="tag ${row.inTitle ? "ok" : "paused"}">${row.inTitle ? "yes" : "no"}</span></td>
                <td><span class="tag ${row.inDescription ? "ok" : "paused"}">${row.inDescription ? "yes" : "no"}</span></td>
                <td><span class="tag ${row.priority === "high" ? "" : "paused"}">${escapeHtml(row.action || "watch")}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function keywordFieldOptimizerPanel(plan = {}) {
  if (!plan.ready) return "";
  return `
    <div class="keyword-field-plan">
      <div class="rank-action-top">
        <strong>Keyword Field Optimizer</strong>
        <span>${escapeHtml(plan.optimizedLength || 0)}/100 characters</span>
      </div>
      <textarea readonly rows="2">${escapeHtml(plan.optimized || "")}</textarea>
      <div class="public-access-row">
        <p class="public-import-note">${escapeHtml(plan.note || "")}</p>
        <button class="button secondary" type="button" data-copy-keyword-field>Copy</button>
      </div>
      ${plan.selected?.length ? `
        <div class="keyword-field-term-list">
          ${plan.selected.slice(0, 8).map((item) => `
            <span>${escapeHtml(item.term)} · ${escapeHtml(item.reason || "signal")}</span>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function metric(label, value) {
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}

function keywordActionCell(row = {}, canTrack = false, trackedKeys = new Set()) {
  const keyword = row.keyword || row.term || "";
  const tracked = trackedKeys.has(normalizeUiKey(keyword));
  return `
    <div class="public-keyword-action">
      <span class="tag ${row.action === "watch" ? "paused" : row.action === "defend" ? "ok" : ""}">${escapeHtml(row.action || "watch")}</span>
      ${canTrack ? `<button class="keyword-track-button" type="button" data-track-keyword="${escapeHtml(keyword)}" ${tracked ? "disabled" : ""}>${tracked ? "Tracked" : "Track"}</button>` : ""}
    </div>
  `;
}

function uniqueKeywordSuggestions(rows = [], trackedKeys = new Set()) {
  const seen = new Set(trackedKeys);
  return rows.filter((row) => {
    const keyword = row.keyword || row.term || "";
    const key = normalizeUiKey(keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeUiKey(value) {
  return String(value || "").trim().toLowerCase();
}

function rankMoveLabel(delta) {
  const value = Number(delta);
  if (!Number.isFinite(value) || value === 0) return "flat";
  return value > 0 ? `down ${value}` : `up ${Math.abs(value)}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function accessFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return {
    workspaceId: params.get("workspaceId") || "",
    token: params.get("token") || ""
  };
}

function setWorkspaceAccess(access = {}) {
  workspaceAccess = {
    workspaceId: access.workspaceId || "",
    token: access.token || ""
  };
  if (workspaceAccess.workspaceId && workspaceAccess.token) {
    const params = new URLSearchParams(workspaceAccess);
    window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
  }
}

async function fetchJson(path, options) {
  try {
    const response = await fetch(path, options);
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}

function setStatus(message) {
  statusEl.textContent = message;
}

function number(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Number(value || 0));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
