import http from "node:http";
import { createHash, createHmac, createSign, generateKeyPairSync, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");
const publicDir = join(root, "public");

loadEnv(join(root, ".env"));

const PORT = Number(process.env.PORT || 4177);
const envPath = join(root, ".env");
const dataDir = join(root, "data");
const syncHistoryPath = join(dataDir, "sync-history.json");
const rankHistoryPath = join(dataDir, "rank-history.json");
const asoProspectHistoryPath = join(dataDir, "aso-prospect-history.json");
const asoWorkspacesPath = join(dataDir, "aso-saas-workspaces.json");
const asoNotificationOutboxPath = join(dataDir, "aso-saas-notification-outbox.json");
const asoSupabaseWorkspacesTable = process.env.ASO_SUPABASE_WORKSPACES_TABLE || "aso_saas_workspaces";
const asoSupabaseNotificationsTable = process.env.ASO_SUPABASE_NOTIFICATIONS_TABLE || "aso_saas_notifications";
const secretsDir = join(root, "secrets");
const appleAdsPrivateKeyPath = join(secretsDir, "apple-ads-private-key.pem");
const appleAdsPublicKeyPath = join(secretsDir, "apple-ads-public-key.pem");
const revenueCatCache = new Map();
const revenueCatCacheTtlMs = 60_000;
const asoCache = new Map();
const asoCacheTtlMs = 30 * 60_000;

const legendRunTarget = {
  appId: "6779005725",
  bundleId: "com.otticoded.legendrun",
  name: "Legend Run: 82-0",
  country: "US",
  device: "iPhone",
  category: "Sports"
};

const editableEnvKeys = [
  "ASC_KEY_ID",
  "ASC_ISSUER_ID",
  "ASC_PRIVATE_KEY_PATH",
  "ASC_VENDOR_NUMBER",
  "IAP_KEY_ID",
  "IAP_ISSUER_ID",
  "IAP_PRIVATE_KEY_PATH",
  "REVENUECAT_API_KEY",
  "REVENUECAT_PROJECT_ID",
  "REVENUECAT_BLUEPRINT_API_KEY",
  "REVENUECAT_BLUEPRINT_PROJECT_ID",
  "REVENUECAT_CUP_COMPANION_API_KEY",
  "REVENUECAT_CUP_COMPANION_PROJECT_ID",
  "REVENUECAT_LEGEND_RUN_API_KEY",
  "REVENUECAT_LEGEND_RUN_PROJECT_ID",
  "REVENUECAT_LEGEND_RUN_16_API_KEY",
  "REVENUECAT_LEGEND_RUN_16_PROJECT_ID",
  "REVENUECAT_LEGEND_RUN_162_API_KEY",
  "REVENUECAT_LEGEND_RUN_162_PROJECT_ID",
  "REVENUECAT_PERFECT_ALBUM_API_KEY",
  "REVENUECAT_PERFECT_ALBUM_PROJECT_ID",
  "REVENUECAT_PLANTEDU_API_KEY",
  "REVENUECAT_PLANTEDU_PROJECT_ID",
  "APPLE_ADS_CLIENT_ID",
  "APPLE_ADS_TEAM_ID",
  "APPLE_ADS_KEY_ID",
  "APPLE_ADS_PRIVATE_KEY_PATH",
  "APPLE_ADS_ORG_ID"
];

const knownAppleKeys = [];

const revenueCatSlots = [
  { id: "bare", label: "BARE", apiKey: "REVENUECAT_API_KEY", projectId: "REVENUECAT_PROJECT_ID" },
  { id: "blueprint", label: "Blueprint AI", apiKey: "REVENUECAT_BLUEPRINT_API_KEY", projectId: "REVENUECAT_BLUEPRINT_PROJECT_ID" },
  { id: "cup-companion", label: "Cup Companion", apiKey: "REVENUECAT_CUP_COMPANION_API_KEY", projectId: "REVENUECAT_CUP_COMPANION_PROJECT_ID" },
  { id: "legend-run-82-0", label: "Legend Run: 82-0", apiKey: "REVENUECAT_LEGEND_RUN_API_KEY", projectId: "REVENUECAT_LEGEND_RUN_PROJECT_ID" },
  { id: "legend-run-16-0", label: "Legend Run: 16-0", apiKey: "REVENUECAT_LEGEND_RUN_16_API_KEY", projectId: "REVENUECAT_LEGEND_RUN_16_PROJECT_ID" },
  { id: "legend-run-162-0", label: "Legend Run: 162-0", apiKey: "REVENUECAT_LEGEND_RUN_162_API_KEY", projectId: "REVENUECAT_LEGEND_RUN_162_PROJECT_ID" },
  { id: "perfect-album", label: "Legend Run: The Perfect Album", apiKey: "REVENUECAT_PERFECT_ALBUM_API_KEY", projectId: "REVENUECAT_PERFECT_ALBUM_PROJECT_ID" },
  { id: "plantedu", label: "PlantEdu", apiKey: "REVENUECAT_PLANTEDU_API_KEY", projectId: "REVENUECAT_PLANTEDU_PROJECT_ID" }
];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const sample = {
  overview: {
    mode: "sample",
    updatedAt: new Date().toISOString(),
    kpis: [
      { label: "Installs", value: "12,480", delta: "+8.4%", tone: "good" },
      { label: "Ad Spend", value: "$18,920", delta: "-2.1%", tone: "neutral" },
      { label: "CPT", value: "$1.14", delta: "-9.8%", tone: "good" },
      { label: "Revenue", value: "$42,710", delta: "+12.6%", tone: "good" },
      { label: "Conv. Rate", value: "18.7%", delta: "+1.9 pts", tone: "good" }
    ],
    trend: [
      { day: "Mon", spend: 2250, installs: 1530, revenue: 5100 },
      { day: "Tue", spend: 2410, installs: 1610, revenue: 5450 },
      { day: "Wed", spend: 2590, installs: 1720, revenue: 6010 },
      { day: "Thu", spend: 2380, installs: 1675, revenue: 5900 },
      { day: "Fri", spend: 2860, installs: 1900, revenue: 6720 },
      { day: "Sat", spend: 3140, installs: 2015, revenue: 7040 },
      { day: "Sun", spend: 3290, installs: 2030, revenue: 6490 }
    ],
    campaigns: [
      { name: "Brand Defense", status: "RUNNING", budget: "$400/day", spend: "$3,840", taps: "5,920", installs: "1,184", cpa: "$3.24" },
      { name: "Competitor Search", status: "RUNNING", budget: "$700/day", spend: "$6,210", taps: "8,440", installs: "1,430", cpa: "$4.34" },
      { name: "Discovery Exact", status: "PAUSED", budget: "$250/day", spend: "$1,020", taps: "1,220", installs: "180", cpa: "$5.67" },
      { name: "Today Tab Test", status: "RUNNING", budget: "$900/day", spend: "$7,850", taps: "11,260", installs: "2,310", cpa: "$3.40" }
    ],
    syncLog: [
      { source: "App Store Connect", message: "Waiting for issuer ID and private key", level: "warn" },
      { source: "Apple Ads", message: "Waiting for OAuth client, team, key, private key, and org ID", level: "warn" },
      { source: "Local", message: "Sample data loaded so the dashboard can be reviewed", level: "ok" }
    ]
  }
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname === "/api/status") return json(res, statusPayload());
    if (url.pathname === "/api/config" && req.method === "GET") return json(res, configPayload());
    if (url.pathname === "/api/config" && req.method === "POST") return json(res, await saveConfig(req));
    if (url.pathname === "/api/diagnostics") return json(res, diagnosticsPayload());
    if (url.pathname === "/api/key-catalog") return json(res, keyCatalogPayload());
    if (url.pathname === "/api/key-candidates") return json(res, keyCandidatesPayload());
    if (url.pathname === "/api/sync") return json(res, await syncPayload(url));
    if (url.pathname === "/api/sync/history") return json(res, syncHistoryPayload());
    if (url.pathname === "/api/overview") return json(res, await overviewPayload(url));
    if (url.pathname === "/api/app-store-connect/apps") return json(res, await fetchAscApps());
    if (url.pathname === "/api/app-store-connect/sales-report") return json(res, await fetchAscSalesReport(url));
    if (url.pathname === "/api/app-store-connect/analytics-report-requests") return json(res, await fetchAscAnalyticsReportRequests(url));
    if (url.pathname === "/api/revenuecat/projects") return json(res, await fetchRevenueCatProjects());
    if (url.pathname === "/api/revenuecat/overview") return json(res, await fetchRevenueCatOverview());
    if (url.pathname === "/api/revenuecat/revenue") return json(res, await fetchRevenueCatRevenue(url));
    if (url.pathname === "/api/revenuecat/chart") return json(res, await fetchRevenueCatChart(url));
    if (url.pathname === "/api/apple-ads/acls") return json(res, await fetchAppleAdsAcls());
    if (url.pathname === "/api/apple-ads/campaigns") return json(res, await fetchAppleAdsCampaigns());
    if (url.pathname === "/api/apple-ads/reports/campaigns") return json(res, await fetchAppleAdsCampaignReport(url));
    if (url.pathname === "/api/apple-ads/reports/keywords") return json(res, await fetchAppleAdsKeywordReports(url));
    if (url.pathname === "/api/apple-ads/reports/searchterms") return json(res, await fetchAppleAdsSearchTermReports(url));
    if (url.pathname === "/api/aso/keywords") return json(res, await fetchAsoKeywordMonitor(url));
    if (url.pathname === "/api/rank-rescue") return json(res, await rankRescuePayload(url));
    if (url.pathname === "/api/aso-saas") return json(res, await asoSaasPayload(url));
    if (url.pathname === "/api/aso-saas/signup" && req.method === "POST") return json(res, await asoSaasSignupPayload(req), 201);
    if (url.pathname === "/api/aso-saas/login" && req.method === "POST") return json(res, await asoSaasLoginPayload(req));
    if (url.pathname === "/api/aso-saas/workspace") return json(res, await asoSaasWorkspacePayload(url));
    if (url.pathname === "/api/aso-saas/apps" && req.method === "POST") return json(res, await asoSaasAddAppPayload(url, req), 201);
    if (url.pathname === "/api/aso-saas/connections" && req.method === "POST") return json(res, await asoSaasConnectionsPayload(url, req));
    if (url.pathname === "/api/aso-saas/keywords" && req.method === "POST") return json(res, await asoSaasUpdateKeywordsPayload(url, req));
    if (url.pathname === "/api/aso-saas/apple-ads-import" && req.method === "POST") return json(res, await asoSaasAppleAdsImportPayload(url, req), 201);
    if (url.pathname === "/api/aso-saas/metadata-import" && req.method === "POST") return json(res, await asoSaasMetadataImportPayload(url, req), 201);
    if (url.pathname === "/api/aso-saas/reviews-import" && req.method === "POST") return json(res, await asoSaasReviewsImportPayload(url, req), 201);
    if (url.pathname === "/api/aso-saas/competitors" && req.method === "POST") return json(res, await asoSaasAddCompetitorPayload(url, req), 201);
    if (url.pathname === "/api/aso-saas/competitors") return json(res, await asoSaasCompetitorsPayload(url));
    if (url.pathname === "/api/aso-saas/history") return json(res, await asoSaasHistoryPayload(url));
    if (url.pathname === "/api/aso-saas/digest") return json(res, await asoSaasDigestPayload(url));
    if (url.pathname === "/api/aso-saas/send-digest" && req.method === "POST") return json(res, await asoSaasSendDigestPayload(url));
    if (url.pathname === "/api/aso-saas/monitor" && req.method === "POST") return json(res, await asoSaasMonitorPayload(url, req));
    if (url.pathname === "/api/aso-saas/coach" && req.method === "POST") return json(res, await asoSaasCoachPayload(req));
    if (url.pathname === "/api/aso-saas/stripe-webhook" && req.method === "POST") return json(res, await asoSaasStripeWebhookPayload(req));
    if (url.pathname === "/api/aso-saas/readiness") return json(res, await asoSaasReadinessPayload());
    if (url.pathname === "/api/aso-saas/workspaces") return json(res, await asoSaasWorkspacesPayload());
    if (url.pathname === "/api/apple-ads/keypair" && req.method === "POST") return json(res, appleAdsKeypairPayload());
    return serveStatic(url.pathname, res);
  } catch (error) {
    json(res, { error: error.message || "Unknown server error" }, 500);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Apple Growth Console running at http://127.0.0.1:${PORT}`);
});

function serveStatic(pathname, res) {
  const cleanPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = resolve(publicDir, `.${cleanPath}`);
  if (!filePath.startsWith(publicDir) || !existsSync(filePath)) {
    json(res, { error: "Not found" }, 404);
    return;
  }
  res.writeHead(200, { "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream" });
  res.end(readFileSync(filePath));
}

function appleAdsKeypairPayload() {
  mkdirSync(secretsDir, { recursive: true });
  const reusedExisting = existsSync(appleAdsPrivateKeyPath) && existsSync(appleAdsPublicKeyPath);
  if (!reusedExisting) {
    const { privateKey, publicKey } = generateKeyPairSync("ec", {
      namedCurve: "prime256v1",
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" }
    });
    writeFileSync(appleAdsPrivateKeyPath, privateKey, { mode: 0o600 });
    writeFileSync(appleAdsPublicKeyPath, publicKey, { mode: 0o644 });
  }

  return {
    privateKeyPath: appleAdsPrivateKeyPath,
    publicKeyPath: appleAdsPublicKeyPath,
    publicKey: readFileSync(appleAdsPublicKeyPath, "utf8"),
    reusedExisting
  };
}

function json(res, payload, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

async function overviewPayload(url = new URL("http://127.0.0.1/api/overview")) {
  const status = statusPayload();
  const history = readSyncHistory();
  const range = reportDateRange(url);
  const syncLog = [];
  let ascApps = [];
  let liveCampaigns = [];
  let liveKpis = sample.overview.kpis;
  let liveTrend = [];
  let liveReportDate = range.endDate;
  let appStoreDataAccess = { salesReports: "unknown", analyticsReports: "unknown" };
  let appleAdsInsights = { ready: false, keywords: [], searchTerms: [], access: {}, recommendations: [] };
  let asoKeywordMonitor = { ready: false, keywords: [], opportunities: [], country: "US", device: "iPhone", source: "apple-search-api" };
  let revenueCat = { ready: false, mode: "missing-credentials", connections: [], totals: {}, primary: null };
  if (status.appStoreConnect.ready) {
    try {
      const apps = await fetchAscApps();
      ascApps = summarizeAscApps(apps);
      appStoreDataAccess = await appStoreDataAccessStatus(range, ascApps);
      syncLog.push({
        source: "App Store Connect",
        message: apps.ok ? `Live apps endpoint returned ${ascApps.length} apps` : `Apps endpoint returned status ${apps.status || "unknown"}`,
        level: apps.ok ? "ok" : "warn"
      });
    } catch (error) {
      syncLog.push({ source: "App Store Connect", message: error.message, level: "warn" });
    }
  } else {
    syncLog.push({ source: "App Store Connect", message: "Waiting for issuer ID and private key", level: "warn" });
  }

  if (status.appleAds.ready) {
    try {
      const reportUrl = new URL("http://127.0.0.1/api/apple-ads/reports/campaigns");
      reportUrl.searchParams.set("startDate", range.startDate);
      reportUrl.searchParams.set("endDate", range.endDate);
      const [campaignsPayload, reportPayload] = await Promise.all([
        fetchAppleAdsCampaigns(),
        fetchAppleAdsCampaignReport(reportUrl)
      ]);
      liveCampaigns = summarizeAppleAdsCampaigns(campaignsPayload, reportPayload);
      liveKpis = summarizeAppleAdsKpis(campaignsPayload, reportPayload);
      liveTrend = summarizeAppleAdsTrend(reportPayload);
      appleAdsInsights = await appleAdsInsightsPayload(range, liveCampaigns);
      asoKeywordMonitor = await asoKeywordMonitorPayload(ascApps, appleAdsInsights, url);
      syncLog.push({
        source: "Apple Ads",
        message: campaignsPayload.ok ? `Live campaigns endpoint returned ${liveCampaigns.length} campaigns` : `Campaigns endpoint returned status ${campaignsPayload.status || "unknown"}`,
        level: campaignsPayload.ok ? "ok" : "warn"
      });
    } catch (error) {
      syncLog.push({ source: "Apple Ads", message: error.message, level: "warn" });
    }
  } else {
    syncLog.push({ source: "Apple Ads", message: "Waiting for OAuth client, team, key, private key, and org ID", level: "warn" });
  }

  if (status.revenueCat.ready) {
    try {
      revenueCat = await revenueCatPayload(range);
      const readyConnections = revenueCat.connections.filter((connection) => connection.ready);
      syncLog.push({
        source: "RevenueCat",
        message: readyConnections.length ? `Live subscription metrics returned for ${readyConnections.map((connection) => connection.label).join(", ")}` : "RevenueCat returned no live metrics",
        level: revenueCat.ready ? "ok" : "warn"
      });
    } catch (error) {
      syncLog.push({ source: "RevenueCat", message: error.message, level: "warn" });
    }
  } else {
    syncLog.push({ source: "RevenueCat", message: "Waiting for at least one API key and project ID", level: "warn" });
  }

  if (!status.appStoreConnect.ready && !status.appleAds.ready) {
    syncLog.push({ source: "Local", message: "Sample data loaded so the dashboard can be reviewed", level: "ok" });
  }

  if (!status.appStoreConnect.ready || !status.appleAds.ready) {
    return {
      ...sample.overview,
      credentials: status,
      mode: status.appStoreConnect.ready || status.appleAds.ready ? "partial-live" : "sample",
      ascApps,
      campaigns: liveCampaigns.length ? liveCampaigns : sample.overview.campaigns,
      kpis: status.appleAds.ready ? liveKpis : sample.overview.kpis,
      trend: liveTrend.length ? liveTrend : sample.overview.trend,
      reportDate: liveReportDate,
      dateRange: range,
      appStoreDataAccess,
      appleAdsInsights,
      asoKeywordMonitor,
      revenueCat,
      syncHistory: history,
      syncLog
    };
  }
  return {
    ...sample.overview,
    credentials: status,
    mode: "live-ready",
    ascApps,
    campaigns: liveCampaigns.length ? liveCampaigns : sample.overview.campaigns,
    kpis: liveKpis,
    trend: liveTrend.length ? liveTrend : sample.overview.trend,
    reportDate: liveReportDate,
    dateRange: range,
    appStoreDataAccess,
    appleAdsInsights,
    asoKeywordMonitor,
    revenueCat,
    syncHistory: history,
    syncLog
  };
}

function summarizeAscApps(payload) {
  const apps = payload?.body?.data;
  if (!Array.isArray(apps)) return [];
  return apps.map((app) => ({
    id: app.id,
    name: app.attributes?.name || "Untitled App",
    bundleId: app.attributes?.bundleId || "",
    sku: app.attributes?.sku || "",
    primaryLocale: app.attributes?.primaryLocale || "",
    kids: Boolean(app.attributes?.isOrEverWasMadeForKids),
    purchasing: Boolean(app.attributes?.streamlinedPurchasingEnabled)
  }));
}

function summarizeAppleAdsCampaigns(campaignsPayload, reportPayload) {
  const campaigns = campaignsPayload?.body?.data;
  const campaignRows = Array.isArray(campaigns) ? campaigns : [];
  const reportsByCampaignId = new Map();
  const reportRows = reportPayload?.body?.data?.reportingDataResponse?.row;
  if (Array.isArray(reportRows) && reportRows.length) {
    for (const row of reportRows) {
      const meta = row.metadata || {};
      const total = row.total || {};
      const spend = moneyValue(total.localSpend);
      const taps = numberValue(total.taps);
      const installs = numberValue(total.totalInstalls);
      reportsByCampaignId.set(String(meta.campaignId || ""), {
        name: meta.campaignName || "Untitled Campaign",
        status: meta.displayStatus || meta.campaignStatus || "UNKNOWN",
        budget: moneyLabel(meta.dailyBudget, "/day"),
        spend: moneyLabel(total.localSpend),
        taps: formatNumber(taps),
        installs: formatNumber(installs),
        cpa: installs ? moneyLabel({ amount: spend / installs, currency: total.localSpend?.currency || "USD" }) : "$0.00",
        app: meta.app?.appName || "",
        id: meta.campaignId
      });
    }
  }

  const rows = campaignRows.map((campaign) => {
    const id = String(campaign.id || "");
    const report = reportsByCampaignId.get(id);
    if (report) {
      return {
        ...report,
        name: campaign.name || report.name,
        status: campaign.displayStatus || campaign.status || report.status,
        budget: moneyLabel(campaign.dailyBudgetAmount || campaign.budgetAmount || report.dailyBudget, "/day"),
        app: report.app || appleAdsAppNameForAdamId(campaign.adamId),
        id: campaign.id
      };
    }
    return {
      name: campaign.name || "Untitled Campaign",
      status: campaign.displayStatus || campaign.status || "UNKNOWN",
      budget: moneyLabel(campaign.dailyBudgetAmount || campaign.budgetAmount, "/day"),
      spend: "$0.00",
      taps: "0",
      installs: "0",
      cpa: "$0.00",
      app: appleAdsAppNameForAdamId(campaign.adamId),
      id: campaign.id
    };
  });

  for (const [id, report] of reportsByCampaignId.entries()) {
    if (!rows.some((row) => String(row.id) === id)) rows.push(report);
  }

  return rows;
}

function appleAdsAppNameForAdamId(adamId) {
  const id = String(adamId || "");
  const names = {
    6782313559: "Legend Run: 162-0",
    6779005725: "Legend Run: 82-0",
    6770161145: "Cup Companion",
    6761767663: "BARE Food Scanner",
    6760570091: "Blueprint Estimate Companion",
    6780004544: "PlantEdu"
  };
  return names[id] || "";
}

function summarizeAppleAdsKpis(campaignsPayload, reportPayload) {
  const campaigns = campaignsPayload?.body?.data;
  const campaignCount = Array.isArray(campaigns) ? campaigns.length : 0;
  const total = reportPayload?.body?.data?.reportingDataResponse?.grandTotals?.total || {};
  const spend = moneyValue(total.localSpend);
  const installs = numberValue(total.totalInstalls);
  const taps = numberValue(total.taps);
  const impressions = numberValue(total.impressions);
  const avgCpt = moneyValue(total.avgCPT);
  return [
    { label: "Campaigns", value: formatNumber(campaignCount), delta: "live Apple Ads" },
    { label: "Ad Spend", value: moneyLabel(total.localSpend), delta: "latest report" },
    { label: "Taps", value: formatNumber(taps), delta: `${formatNumber(impressions)} impressions` },
    { label: "Installs", value: formatNumber(installs), delta: `${percentLabel(total.totalInstallRate)} install rate` },
    { label: "Avg CPT", value: moneyLabel({ amount: avgCpt, currency: total.avgCPT?.currency || total.localSpend?.currency || "USD" }), delta: spend ? `${moneyLabel({ amount: spend, currency: total.localSpend?.currency || "USD" })} total` : "no spend" }
  ];
}

function summarizeAppleAdsTrend(reportPayload) {
  const rows = reportPayload?.body?.data?.reportingDataResponse?.row;
  if (!Array.isArray(rows) || !rows.length) return [];
  return rows.map((row) => ({
    day: (row.metadata?.app?.appName || row.metadata?.campaignName || "Campaign").replace(" Companion", "").slice(0, 12),
    spend: moneyValue(row.total?.localSpend),
    installs: numberValue(row.total?.totalInstalls),
    revenue: numberValue(row.total?.taps)
  }));
}

async function appleAdsInsightsPayload(range, campaigns) {
  const campaignIds = (campaigns || []).map((campaign) => campaign.id).filter(Boolean);
  if (!campaignIds.length) return { ready: false, keywords: [], searchTerms: [], access: {}, recommendations: [] };
  const params = new URLSearchParams({ startDate: range.startDate, endDate: range.endDate });
  for (const id of campaignIds) params.append("campaignId", id);
  const [keywordPayload, searchTermPayload] = await Promise.all([
    fetchAppleAdsKeywordReports(new URL(`http://127.0.0.1/api/apple-ads/reports/keywords?${params}`)),
    fetchAppleAdsSearchTermReports(new URL(`http://127.0.0.1/api/apple-ads/reports/searchterms?${params}`))
  ]);
  const campaignLookup = Object.fromEntries((campaigns || []).map((campaign) => [String(campaign.id), campaign.name]));
  const keywords = enrichAppleAdsRows(summarizeAppleAdsKeywordRows(keywordPayload), campaignLookup);
  const searchTerms = enrichAppleAdsRows(summarizeAppleAdsSearchTermRows(searchTermPayload), campaignLookup);
  return {
    ready: Boolean(keywordPayload.ok || searchTermPayload.ok),
    keywords,
    searchTerms,
    recommendations: appleAdsOptimizationRecommendations({ campaigns, keywords, searchTerms }),
    access: {
      keywords: accessSummary(keywordPayload),
      searchTerms: accessSummary(searchTermPayload)
    }
  };
}

function summarizeAppleAdsKeywordRows(payload) {
  return summarizeAppleAdsReportRows(payload, "keyword").map((row) => ({
    ...row,
    keyword: row.term,
    recommendation: keywordRecommendation(row)
  }));
}

function summarizeAppleAdsSearchTermRows(payload) {
  return summarizeAppleAdsReportRows(payload, "searchTerm").map((row) => ({
    ...row,
    searchTerm: row.term,
    recommendation: searchTermRecommendation(row)
  }));
}

function summarizeAppleAdsReportRows(payload, termType) {
  const rows = payload?.reports?.flatMap((report) => (report.body?.data?.reportingDataResponse?.row || []).map((row) => ({ ...row, _campaignId: report.campaignId }))) || [];
  return rows.map((row) => {
    const meta = row.metadata || {};
    const total = row.total || {};
    const spend = moneyValue(total.localSpend);
    const installs = numberValue(total.totalInstalls);
    const taps = numberValue(total.taps);
    const impressions = numberValue(total.impressions);
    const term = termType === "searchTerm"
      ? meta.searchTermText || meta.searchTerm || meta.searchterm || meta.query || meta.keyword || "Unknown search term"
      : meta.keyword || meta.keywordText || meta.text || meta.name || "Unknown keyword";
    return {
      term,
      campaignId: row._campaignId,
      campaignName: meta.campaignName || "",
      adGroupName: meta.adGroupName || "",
      matchType: meta.matchType || meta.keywordMatchType || "",
      status: meta.keywordStatus || meta.status || meta.displayStatus || "",
      spend,
      spendLabel: moneyLabel(total.localSpend),
      taps,
      installs,
      impressions,
      cpi: installs ? spend / installs : 0,
      cpiLabel: installs ? moneyLabel({ amount: spend / installs, currency: total.localSpend?.currency || "USD" }) : "$0.00",
      avgCpt: moneyValue(total.avgCPT),
      avgCptLabel: moneyLabel({ amount: moneyValue(total.avgCPT), currency: total.avgCPT?.currency || total.localSpend?.currency || "USD" }),
      installRate: Number(total.totalInstallRate || 0)
    };
  }).sort((a, b) => b.spend - a.spend || b.taps - a.taps);
}

function enrichAppleAdsRows(rows, campaignLookup) {
  return rows.map((row) => ({
    ...row,
    campaignName: row.campaignName || campaignLookup[String(row.campaignId)] || ""
  }));
}

function targetBidLabel(row, multiplier = 1.15) {
  const current = Number(row.avgCpt || 0);
  if (!current) return "";
  return moneyLabel({ amount: current * multiplier, currency: "USD" });
}

function keywordRecommendation(row) {
  if (row.installs > 0 && row.cpi && row.cpi <= 3.15) {
    return row.avgCptLabel
      ? `Protect this exact keyword. Do not raise max CPT unless impression share is constrained; Avg CPT is ${row.avgCptLabel}.`
      : "Protect this exact keyword. Do not raise max CPT unless impression share is constrained.";
  }
  if (row.installs > 0 && row.cpi && row.cpi <= 6.29) {
    return "Keep this exact keyword active, but do not raise the configured max CPT. CPI is above the fallback 3-month payback line; lower bid 15-25% unless app gross profit stays positive.";
  }
  if (row.installs > 0) {
    return "Lower the configured max CPT 20-30% or pause until parent-app gross profit proves this keyword can carry the spend.";
  }
  if (row.taps >= 2 && row.installs === 0) {
    return "Lower the configured max CPT 20-30%, or pause until search terms prove buying intent.";
  }
  if (row.spend >= 5 && row.installs === 0) return "Stop spend leak: pause or move to a low-bid discovery ad group.";
  return "Keep collecting data; do not scale until installs or subscriber events prove quality.";
}

function searchTermRecommendation(row) {
  if (row.installs > 0 && row.cpi && row.cpi <= 5) return "Promote this search term into an exact-match keyword.";
  if (row.taps > 0 && row.installs === 0) return "Add as negative exact if the query is off-intent, or cut the parent keyword bid.";
  if (row.impressions >= 10 && row.taps === 0) return "Low CTR: tighten creative/app metadata alignment or lower broad discovery exposure.";
  return "Watch for another day before changing bids.";
}

function appleAdsOptimizationRecommendations({ campaigns, keywords, searchTerms }) {
  const actions = [];
  const exactKeywordKeys = new Set(keywords
    .filter((row) => normalizeKey(row.matchType) === "exact")
    .map((row) => `${normalizeKey(row.campaignName)}:${normalizeKey(row.keyword || row.term)}`));
  const hasExactKeyword = (row) => exactKeywordKeys.has(`${normalizeKey(row.campaignName)}:${normalizeKey(row.searchTerm || row.term)}`);
  const efficientTerm = searchTerms.find((row) => row.installs > 0 && row.cpi <= 5 && !hasExactKeyword(row));
  const protectedTerm = searchTerms.find((row) => row.installs > 0 && row.cpi <= 5 && hasExactKeyword(row));
  const wasteTerm = searchTerms.find((row) => row.taps > 0 && row.installs === 0);
  const efficientKeyword = keywords.find((row) => row.installs > 0 && row.cpi <= 5);
  const wasteKeyword = keywords.find((row) => row.taps >= 2 && row.installs === 0);
  if (efficientTerm) actions.push({
    priority: "high",
    title: `Add exact keyword: ${efficientTerm.searchTerm}`,
    body: `${efficientTerm.searchTerm} produced ${efficientTerm.installs} install${efficientTerm.installs === 1 ? "" : "s"} at ${efficientTerm.cpiLabel} CPI. Promote it into an exact-match ad group and start near ${efficientTerm.avgCptLabel || "current Avg CPT"}.`,
    metric: `${efficientTerm.spendLabel} spend · ${efficientTerm.taps} taps · ${efficientTerm.installs} installs`
  });
  if (protectedTerm) actions.push({
    priority: "high",
    title: `Protect exact keyword: ${protectedTerm.searchTerm}`,
    body: `${protectedTerm.searchTerm} already has an exact keyword in ${protectedTerm.campaignName}. Do not add it again; protect it and use the keyword bid row for max CPT changes.`,
    metric: `${protectedTerm.spendLabel} spend · ${protectedTerm.taps} taps · ${protectedTerm.installs} installs`
  });
  if (wasteTerm) actions.push({
    priority: "medium",
    title: `Review wasted search term: ${wasteTerm.searchTerm}`,
    body: `${wasteTerm.searchTerm} has ${wasteTerm.taps} tap${wasteTerm.taps === 1 ? "" : "s"} and 0 installs. Add a negative exact if it is not buying intent; otherwise cut the parent bid before more spend goes out.`,
    metric: `${wasteTerm.spendLabel} spend · 0 installs`
  });
  if (efficientKeyword) actions.push({
    priority: "high",
    title: `Protect exact keyword: ${efficientKeyword.keyword}`,
    body: `${efficientKeyword.keyword} has install signal. Keep it exact and only raise the configured max CPT if impression share is constrained; do not infer max bid from Avg CPT.`,
    metric: `${efficientKeyword.avgCptLabel} Avg CPT · ${efficientKeyword.cpiLabel} CPI · ${efficientKeyword.installs} installs`
  });
  if (wasteKeyword) actions.push({
    priority: "medium",
    title: `Cut bid on ${wasteKeyword.keyword}`,
    body: `${wasteKeyword.keyword} is taking taps without installs. Lower the configured max CPT 20-30% or pause it if matching search terms are off-intent.`,
    metric: `${wasteKeyword.avgCptLabel} Avg CPT · ${wasteKeyword.taps} taps · 0 installs`
  });
  if (!actions.length && campaigns?.length) actions.push({
    priority: "low",
    title: "Keyword rows need more signal",
    body: "Campaign-level data is live, but keyword/search-term rows have too little install signal. Keep budgets capped and collect another day before scaling.",
    metric: `${campaigns.length} campaigns watched`
  });
  return actions.slice(0, 6);
}

async function fetchAsoKeywordMonitor(url) {
  const status = statusPayload();
  let ascApps = [];
  if (status.appStoreConnect.ready) {
    ascApps = summarizeAscApps(await fetchAscApps());
  }
  const range = reportDateRange(url);
  let appleAdsInsights = { keywords: [], searchTerms: [] };
  if (status.appleAds.ready) {
    const campaignsPayload = await fetchAppleAdsCampaigns();
    const reportUrl = new URL("http://127.0.0.1/api/apple-ads/reports/campaigns");
    reportUrl.searchParams.set("startDate", range.startDate);
    reportUrl.searchParams.set("endDate", range.endDate);
    const reportPayload = await fetchAppleAdsCampaignReport(reportUrl);
    const campaigns = summarizeAppleAdsCampaigns(campaignsPayload, reportPayload);
    appleAdsInsights = await appleAdsInsightsPayload(range, campaigns);
  }
  return asoKeywordMonitorPayload(ascApps, appleAdsInsights, url);
}

async function asoKeywordMonitorPayload(ascApps, appleAdsInsights, url = new URL("http://127.0.0.1/api/aso/keywords")) {
  const country = (url.searchParams.get("country") || "US").toUpperCase();
  const limit = Math.min(Number(url.searchParams.get("limit") || 16), 30);
  const targetApps = (ascApps || []).filter((app) => app.bundleId);
  const explicitTerms = parseListParam(url.searchParams.get("keywords"));
  const seedTerms = asoSeedTerms(appleAdsInsights, limit, explicitTerms);
  const cacheKey = `${country}:${targetApps.map((app) => app.bundleId).join("|")}:${seedTerms.join("|")}`;
  const cached = asoCache.get(cacheKey);
  if (cached && Date.now() - cached.storedAt < asoCacheTtlMs) {
    return { ...cached.payload, cache: { hit: true, storedAt: new Date(cached.storedAt).toISOString() } };
  }
  const rows = await Promise.all(seedTerms.map((term) => asoKeywordRow(term, country, targetApps, appleAdsInsights)));
  const explicitOrder = new Map(explicitTerms.map((term, index) => [normalizeKey(term), index]));
  const keywords = rows.filter(Boolean).sort((a, b) => {
    const aExplicit = explicitOrder.has(normalizeKey(a.keyword));
    const bExplicit = explicitOrder.has(normalizeKey(b.keyword));
    if (aExplicit && bExplicit) return explicitOrder.get(normalizeKey(a.keyword)) - explicitOrder.get(normalizeKey(b.keyword));
    if (aExplicit) return -1;
    if (bExplicit) return 1;
    return b.opportunityScore - a.opportunityScore;
  });
  const payload = {
    ready: keywords.length > 0,
    source: "apple-search-api",
    country,
    device: "iPhone",
    updatedAt: new Date().toISOString(),
    keywords,
    opportunities: keywords.filter((row) => row.action !== "watch").slice(0, 8)
  };
  asoCache.set(cacheKey, { storedAt: Date.now(), payload });
  return payload;
}

function asoSeedTerms(appleAdsInsights, limit, explicitTerms = []) {
  const terms = new Map();
  const addTerm = (term, weight = 1) => {
    const cleaned = String(term || "").trim().toLowerCase();
    if (!cleaned || cleaned.length < 3 || cleaned === "unknown search term") return;
    terms.set(cleaned, Math.max(terms.get(cleaned) || 0, weight));
  };
  for (const term of explicitTerms) addTerm(term, 140);
  for (const row of appleAdsInsights?.searchTerms || []) {
    addTerm(row.searchTerm || row.term, 100 + Number(row.installs || 0) * 10 + Number(row.taps || 0));
  }
  for (const row of appleAdsInsights?.keywords || []) {
    addTerm(row.keyword || row.term, 80 + Number(row.installs || 0) * 10 + Number(row.taps || 0));
  }
  [
    "82-0",
    "82 and 0",
    "82-0 game",
    "legend run",
    "basketball simulator",
    "basketball manager",
    "food scanner",
    "ingredient scanner",
    "ultra processed food scanner",
    "world cup app",
    "miami world cup",
    "construction estimate app",
    "blueprint estimate app"
  ].forEach((term) => addTerm(term, 20));
  return [...terms.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

async function asoKeywordRow(term, country, targetApps, appleAdsInsights) {
  const params = new URLSearchParams({ term, country, entity: "software", limit: "50" });
  const response = await fetch(`https://itunes.apple.com/search?${params}`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) return null;
  const body = await response.json();
  const results = Array.isArray(body.results) ? body.results : [];
  const targetMatches = targetApps.map((app) => {
    const index = results.findIndex((result) => result.bundleId === app.bundleId || String(result.trackId) === String(app.id));
    return {
      appId: app.id,
      appName: app.name,
      bundleId: app.bundleId,
      rank: index >= 0 ? index + 1 : null
    };
  }).filter((match) => match.rank);
  const bestRank = targetMatches.reduce((best, match) => Math.min(best, match.rank), Infinity);
  const appleAdsRows = [
    ...(appleAdsInsights?.searchTerms || []).filter((row) => sameKeyword(row.searchTerm || row.term, term)),
    ...(appleAdsInsights?.keywords || []).filter((row) => sameKeyword(row.keyword || row.term, term))
  ];
  const adsSpend = appleAdsRows.reduce((total, row) => total + Number(row.spend || 0), 0);
  const taps = appleAdsRows.reduce((total, row) => total + Number(row.taps || 0), 0);
  const installs = appleAdsRows.reduce((total, row) => total + Number(row.installs || 0), 0);
  const traffic = Math.round((taps * 120) + (installs * 300) + Math.min(results.length, 50) * 18);
  const complexity = asoComplexity(results);
  const effectivenessScore = Math.max(1, Math.round((traffic / Math.max(complexity, 1)) * (bestRank === Infinity ? 1 : 1.35)));
  const opportunityScore = Math.round(effectivenessScore + (installs * 25) + (bestRank === Infinity ? 35 : Math.max(0, 30 - bestRank)));
  return {
    keyword: term,
    traffic,
    complexity,
    effectiveness: effectivenessLabel(effectivenessScore),
    effectivenessScore,
    searchAds: taps || installs || adsSpend ? Math.round(taps + installs * 4 + adsSpend) : 0,
    rank: bestRank === Infinity ? null : bestRank,
    rankLabel: bestRank === Infinity ? ">50" : String(bestRank),
    apps: results.length,
    topApps: results.slice(0, 5).map((result, index) => ({
      rank: index + 1,
      name: result.trackName,
      bundleId: result.bundleId,
      rating: Number(result.averageUserRating || 0),
      ratings: Number(result.userRatingCount || 0),
      genre: result.primaryGenreName || ""
    })),
    targetMatches,
    ads: {
      spend: Number(adsSpend.toFixed(2)),
      spendLabel: moneyLabel({ amount: adsSpend, currency: "USD" }),
      taps,
      installs
    },
    action: asoAction({ rank: bestRank, installs, taps, complexity, effectivenessScore }),
    recommendation: asoRecommendation({ term, rank: bestRank, installs, taps, complexity, effectivenessScore }),
    opportunityScore
  };
}

function sameKeyword(left, right) {
  return String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();
}

function asoComplexity(results) {
  if (!results.length) return 1;
  const top = results.slice(0, 10);
  const ratingWeight = top.reduce((total, app) => total + Math.min(Number(app.userRatingCount || 0), 10000) / 1000, 0);
  const ratingScore = top.reduce((total, app) => total + Number(app.averageUserRating || 0), 0);
  return Number(Math.min(10, Math.max(1, (ratingWeight / 4) + (ratingScore / 10))).toFixed(1));
}

function effectivenessLabel(score) {
  if (score >= 250) return "Very high";
  if (score >= 140) return "High";
  if (score >= 70) return "Medium";
  if (score >= 35) return "Neutral";
  return "Low";
}

function asoAction({ rank, installs, taps, complexity, effectivenessScore }) {
  if (installs > 0 && rank === Infinity) return "add-to-metadata";
  if (installs > 0 && rank > 10) return "improve-rank";
  if (installs > 0 && rank <= 10) return "defend";
  if (taps > 0 && installs === 0) return "ads-only-test";
  if (effectivenessScore > 140 && complexity <= 5) return "test-exact";
  return "watch";
}

function asoRecommendation({ term, rank, installs, taps, complexity, effectivenessScore }) {
  if (installs > 0 && rank === Infinity) return `${term} converts in Apple Ads but your app is not top 50 organically. Add it to metadata and keep exact-match coverage.`;
  if (installs > 0 && rank > 10) return `${term} converts but organic rank is ${rank}. Improve title/subtitle/keyword-field relevance and protect the exact-match ad group.`;
  if (installs > 0 && rank <= 10) return `${term} already ranks in the top 10 and converts. Defend with exact match and avoid broad-match waste.`;
  if (taps > 0 && installs === 0) return `${term} has paid interest but no installs. Keep it out of metadata for now and test tighter ad copy or negatives.`;
  if (effectivenessScore > 140 && complexity <= 5) return `${term} has a favorable traffic-to-complexity profile. Test it as exact match before changing metadata.`;
  return `${term} needs more signal before metadata or bid changes. Keep it monitored.`;
}

async function asoSaasPayload(url, context = {}) {
  const range = reportDateRange(url);
  const country = (url.searchParams.get("country") || "US").toUpperCase();
  const appUrl = url.searchParams.get("appUrl") || url.searchParams.get("url") || `https://apps.apple.com/us/app/id${legendRunTarget.appId}`;
  const appId = parseAppStoreAppId(appUrl) || url.searchParams.get("appId") || legendRunTarget.appId;
  const limit = Math.min(Number(url.searchParams.get("limit") || 24), 40);
  const explicitKeywords = parseListParam(url.searchParams.get("keywords"));
  const baselineRank = Number(url.searchParams.get("baselineRank") || 60);
  const target = { ...legendRunTarget, appId, country, name: "", bundleId: "", category: "" };
  const errors = [];
  const appStore = await fetchRankRescueAppStoreSnapshot(target);
  if (appStore.error) errors.push({ source: "App Store public data", message: appStore.error });

  const targetApp = {
    id: appStore.appId || appId,
    name: appStore.name || target.name || `App ${appId}`,
    bundleId: appStore.bundleId || target.bundleId || ""
  };

  const status = statusPayload();
  let campaigns = [];
  let appleAdsInsights = { ready: false, keywords: [], searchTerms: [], recommendations: [], access: {} };
  if (status.appleAds.ready) {
    try {
      const reportUrl = new URL("http://127.0.0.1/api/apple-ads/reports/campaigns");
      reportUrl.searchParams.set("startDate", range.startDate);
      reportUrl.searchParams.set("endDate", range.endDate);
      const [campaignsPayload, reportPayload] = await Promise.all([
        fetchAppleAdsCampaigns(),
        fetchAppleAdsCampaignReport(reportUrl)
      ]);
      campaigns = summarizeAppleAdsCampaigns(campaignsPayload, reportPayload);
      appleAdsInsights = await appleAdsInsightsPayload(range, campaigns);
    } catch (error) {
      errors.push({ source: "Apple Ads", message: error.message });
    }
  }
  const importedAds = context.appleAdsInsights || { ready: false, keywords: [], searchTerms: [] };
  appleAdsInsights = mergeAppleAdsInsights(appleAdsInsights, importedAds);
  campaigns = [...campaigns, ...(context.campaigns || [])];

  const ads = genericAsoAdsPayload({ campaigns, appleAdsInsights, targetApp, appStore });
  const keywordSeeds = uniqueStrings([
    ...explicitKeywords,
    ...defaultAsoSaasKeywords(appStore),
    ...ads.keywordRows.map((row) => row.keyword || row.term),
    ...ads.searchTermRows.map((row) => row.searchTerm || row.term)
  ]).slice(0, limit);
  const keywordRowsRaw = await Promise.all(keywordSeeds.map((term) =>
    asoKeywordRow(term, country, [targetApp], {
      keywords: ads.keywordRows,
      searchTerms: ads.searchTermRows
    })
  ));
  const keywordRows = keywordRowsRaw.filter(Boolean).sort((a, b) => b.opportunityScore - a.opportunityScore);
  const competitors = asoSaasCompetitorSnapshot(keywordRows, targetApp);
  const current = asoSaasCurrent({ appStore, ads, keywordRows, range, baselineRank });
  const metadata = asoMetadataAudit({ appStore, keywordRows, ads, competitors, importedMetadata: context.metadataImport || null });
  const reviews = asoReviewsAudit({ appStore, importedReviews: context.reviewImport || null, reviewSummary: context.reviewSummary || null });
  const actions = asoSaasActions({ current, appStore, ads, keywordRows, competitors, baselineRank, metadata, reviews });
  const snapshot = {
    timestamp: new Date().toISOString(),
    date: range.endDate,
    appId,
    country,
    appName: targetApp.name,
    categoryRank: current.categoryRank,
    ratingAverage: current.ratingAverage,
    ratingCount: current.ratingCount,
    keywordCount: keywordRows.length,
    actionCount: actions.length,
    topKeywords: keywordRows.slice(0, 5).map((row) => ({ keyword: row.keyword, rank: row.rank, action: row.action }))
  };
  const history = appendAsoProspectHistory(snapshot);

  return {
    ready: Boolean(appStore.ready || keywordRows.length),
    mode: appStore.ready ? "live-public" : "partial",
    updatedAt: snapshot.timestamp,
    range,
    app: {
      appId,
      bundleId: targetApp.bundleId,
      name: targetApp.name,
      country,
      storeUrl: appStore.storeUrl || `https://apps.apple.com/us/app/id${appId}`,
      category: current.category,
      version: appStore.version || "",
      price: appStore.price || ""
    },
    current,
    keywords: {
      country,
      device: "iPhone",
      seedTerms: keywordSeeds,
      rows: keywordRows.map(asoSaasKeywordRow),
      opportunities: keywordRows.filter((row) => row.action !== "watch").slice(0, 10).map(asoSaasKeywordRow),
      protected: keywordRows.filter((row) => row.action === "defend").slice(0, 8).map(asoSaasKeywordRow)
    },
    competitors,
    metadata,
    reviews,
    ads: {
      ready: ads.ready,
      total: ads.total,
      exact: ads.exact,
      broad: ads.broad,
      campaigns: ads.campaigns,
      imports: context.importSummary || null
    },
    actions,
    product: asoSaasProductBlueprint(),
    workspaces: await asoSaasWorkspacesPayload(),
    reverseEngineering: competitiveBlueprintPayload(),
    dataSources: asoSaasDataSources({ appStore, ads }),
    history: {
      path: asoProspectHistoryPath,
      latest: snapshot,
      recent: history.slice(0, 20)
    },
    errors
  };
}

async function asoSaasCoachPayload(req) {
  const payload = await readJsonBody(req, 500_000);
  const question = String(payload.question || "").trim();
  const normalized = normalizeKey(question);
  const analysis = payload.analysis || {};
  const app = analysis.app || payload.app || {};
  const status = statusPayload();
  const actions = Array.isArray(analysis.actions) ? analysis.actions : [];
  const keywords = analysis.keywords?.rows || [];
  const ads = analysis.ads || {};
  const connectionChecks = coachConnectionChecks(status, payload.connections || analysis.connections || []);
  let mode = "next-best-action";
  let answer = "";
  let steps = [];
  if (/(key|credential|connect|api|revenuecat|apple ads|search ads|app store connect|asc|troubleshoot|setup|import)/.test(normalized)) {
    mode = "byok-setup";
    answer = `Rank Rescue uses the customer's own App Store Connect, RevenueCat, and Apple Ads credentials for ${app.name || "this app"}. App Store Connect powers app/metadata context, RevenueCat powers revenue and gross profit, and Apple Ads powers paid keyword/search-term quality. If they cannot connect Apple Ads yet, have them import Apple Ads CSV rows so recommendations still work.`;
    steps = coachSetupSteps(connectionChecks);
  } else if (/(switch|change app|add app|portfolio|another app)/.test(normalized)) {
    mode = "app-switching";
    answer = "Use the App Portfolio. Add or paste an App Store URL, select the app card, then Save + Analyze. Import App Store Connect apps when ASC is connected, and Refresh Campaigns after Apple Ads is connected so campaigns attach by app ID.";
    steps = [
      "Paste the App Store URL or app ID for the new app.",
      "Set the country and seed keywords for that app.",
      "Save + Analyze, then select the app from App Portfolio.",
      "Import ASC apps or refresh campaigns only after the customer's own API keys are connected."
    ];
  } else if (/(optimi|recommend|what should|spend|keyword|rank|pause|bid|scale|profit)/.test(normalized)) {
    mode = "optimization";
    const topActions = actions.slice(0, 4);
    answer = topActions.length
      ? `For ${app.name || "this app"}, I would start with ${topActions[0].action || topActions[0].title}. Recommendations should be gated by connected RevenueCat profit when revenue is available; otherwise treat CPI/rank/keyword data as diagnostic, not proof to scale.`
      : `For ${app.name || "this app"}, connect or import Apple Ads and RevenueCat before scaling. Without paid conversion or revenue data, the safe recommendation is to collect keyword rank, rating, and metadata coverage first.`;
    steps = topActions.length
      ? topActions.map((action) => `${action.title}: ${action.action || action.metric || "review"}`)
      : [
        "Add high-intent seed keywords and analyze.",
        "Import Apple Ads CSV rows or connect Apple Ads.",
        "Connect RevenueCat so budget decisions use gross profit, not modeled ROAS."
      ];
  } else {
    answer = `Ask me about connecting App Store Connect, RevenueCat, or Apple Ads, changing apps, importing Apple Ads data, or what to optimize next for ${app.name || "this app"}. I will coach from this workspace's current app, actions, keyword rows, and connected customer-data status.`;
    steps = [
      "Connect App Store Connect first for owned app import and metadata.",
      "Connect or import Apple Ads next for paid keyword quality.",
      "Connect RevenueCat before scaling spend so recommendations use gross profit."
    ];
  }
  return {
    ready: true,
    mode,
    generatedAt: new Date().toISOString(),
    app: {
      appId: app.appId || "",
      name: app.name || "",
      country: app.country || "US"
    },
    answer,
    steps,
    suggestions: coachSuggestions({ connectionChecks, actions, keywords, ads }),
    connectionChecks
  };
}

function coachConnectionChecks(status, customerConnections = []) {
  if (Array.isArray(customerConnections) && customerConnections.length) {
    return upsertAsoCustomerConnection(customerConnections).map((connection) => ({
      id: connection.service,
      label: connection.label,
      ready: Boolean(connection.ready),
      missing: connection.missing || (connection.ready ? [] : connection.required || []),
      purpose: connection.purpose,
      fields: connection.fields || {}
    }));
  }
  const revenueConnections = status.revenueCat?.connections || [];
  return [
    {
      id: "app-store-connect",
      label: "App Store Connect",
      ready: Boolean(status.appStoreConnect?.ready),
      missing: status.appStoreConnect?.missing || [],
      purpose: "Import owned apps, metadata, sales context, and app identity."
    },
    {
      id: "apple-ads",
      label: "Apple Ads",
      ready: Boolean(status.appleAds?.ready),
      missing: status.appleAds?.missing || [],
      purpose: "Attach campaigns, keywords, search terms, taps, installs, CPT, and CPI."
    },
    {
      id: "revenuecat",
      label: "RevenueCat",
      ready: Boolean(status.revenueCat?.ready),
      missing: status.revenueCat?.ready ? [] : ["RevenueCat API key + project ID"],
      purpose: "Use actual gross revenue and gross profit as the budget gate.",
      projects: revenueConnections.map((connection) => ({
        label: connection.label,
        ready: connection.ready,
        missing: connection.missing || []
      }))
    }
  ];
}

function coachSetupSteps(connectionChecks = []) {
  const steps = [];
  for (const check of connectionChecks) {
    if (check.ready) {
      steps.push(`${check.label}: connected. Use it for ${check.purpose.toLowerCase()}`);
    } else {
      steps.push(`${check.label}: add ${check.missing.join(", ") || "the required customer-owned credentials"}. ${check.purpose}`);
    }
  }
  steps.push("Never ask users for private key text in chat. They should upload/store keys in their own account or provide a local/server-side path handled by the app.");
  return steps;
}

function coachSuggestions({ connectionChecks = [], actions = [], keywords = [], ads = {} }) {
  const suggestions = [];
  if (connectionChecks.some((check) => !check.ready)) suggestions.push("What do I need to connect first?");
  if (actions.length) suggestions.push("What should I optimize next?");
  if (keywords.length) suggestions.push("Which keywords should I test exact?");
  if (!ads.ready) suggestions.push("How do I import Apple Ads data?");
  suggestions.push("How do I switch apps?");
  return uniqueStrings(suggestions).slice(0, 5);
}

function parseAppStoreAppId(value) {
  const input = String(value || "");
  const match = input.match(/id(\d{5,})/) || input.match(/\b(\d{5,})\b/);
  return match ? match[1] : "";
}

function defaultAsoCustomerConnections() {
  return [
    {
      service: "app-store-connect",
      label: "App Store Connect",
      ready: false,
      status: "needs-credentials",
      purpose: "Owned apps, metadata, sales context, product-page tests, and review exports.",
      required: ["keyId", "issuerId", "privateKeyStored"],
      fields: {},
      updatedAt: ""
    },
    {
      service: "revenuecat",
      label: "RevenueCat",
      ready: false,
      status: "needs-credentials",
      purpose: "Gross revenue, Apple cut, after-Apple revenue, and gross profit by app.",
      required: ["projectId", "apiKeyStored"],
      fields: {},
      updatedAt: ""
    },
    {
      service: "apple-ads",
      label: "Apple Ads",
      ready: false,
      status: "needs-credentials-or-import",
      purpose: "Campaign spend, taps, installs, CPA/CPI, keywords, and search terms.",
      required: ["clientId", "teamId", "keyId", "privateKeyStored", "orgId"],
      fields: {},
      updatedAt: ""
    }
  ];
}

function normalizeAsoCustomerConnection(payload = {}) {
  const service = normalizeAsoConnectionService(payload.service);
  const defaults = defaultAsoCustomerConnections().find((item) => item.service === service);
  if (!defaults) throw new Error("Unknown connection service.");
  const rawFields = payload.fields && typeof payload.fields === "object" ? payload.fields : payload;
  const fields = sanitizeAsoConnectionFields(service, rawFields);
  const missing = defaults.required.filter((field) => !fields[field]);
  const ready = missing.length === 0;
  return {
    ...defaults,
    ready,
    status: ready ? "connected" : "needs-credentials",
    fields,
    missing,
    updatedAt: new Date().toISOString()
  };
}

function normalizeAsoConnectionService(value) {
  const key = normalizeKey(value);
  if (["asc", "appstoreconnect", "app-store-connect", "app store connect"].includes(key)) return "app-store-connect";
  if (["revenuecat", "revenue-cat", "revenue cat", "rc"].includes(key)) return "revenuecat";
  if (["appleads", "apple-ads", "apple ads", "searchads", "search ads"].includes(key)) return "apple-ads";
  return key;
}

function sanitizeAsoConnectionFields(service, fields = {}) {
  const clean = {};
  const stringField = (key, aliases = []) => {
    const value = [key, ...aliases].map((name) => fields[name]).find((item) => item !== undefined && item !== null && String(item).trim() !== "");
    if (value !== undefined && value !== null && String(value).trim() !== "") clean[key] = String(value).trim().slice(0, 160);
  };
  const boolField = (key, aliases = []) => {
    const value = [key, ...aliases].map((name) => fields[name]).find((item) => item !== undefined && item !== null);
    clean[key] = value === true || value === "true" || value === "on" || value === "yes" || value === "1";
  };
  if (service === "app-store-connect") {
    stringField("keyId", ["ASC_KEY_ID"]);
    stringField("issuerId", ["ASC_ISSUER_ID"]);
    stringField("vendorNumber", ["ASC_VENDOR_NUMBER"]);
    boolField("privateKeyStored", ["privateKeyUploaded", "ASC_PRIVATE_KEY_STORED"]);
  }
  if (service === "revenuecat") {
    stringField("projectId", ["REVENUECAT_PROJECT_ID"]);
    stringField("projectName", ["label"]);
    boolField("apiKeyStored", ["apiKeyProvided", "REVENUECAT_API_KEY_STORED"]);
  }
  if (service === "apple-ads") {
    stringField("clientId", ["APPLE_ADS_CLIENT_ID"]);
    stringField("teamId", ["APPLE_ADS_TEAM_ID"]);
    stringField("keyId", ["APPLE_ADS_KEY_ID"]);
    stringField("orgId", ["APPLE_ADS_ORG_ID"]);
    boolField("privateKeyStored", ["privateKeyUploaded", "APPLE_ADS_PRIVATE_KEY_STORED"]);
  }
  return Object.fromEntries(Object.entries(clean).map(([key, value]) => {
    if (typeof value === "boolean") return [key, value];
    if (/key|token|secret/i.test(key) && key !== "keyId") return [key, mask(String(value))];
    return [key, value];
  }));
}

function normalizeStoredAsoCustomerConnection(connection = {}) {
  try {
    const normalized = normalizeAsoCustomerConnection(connection);
    return {
      ...normalized,
      updatedAt: connection.updatedAt || normalized.updatedAt,
      status: normalized.ready ? "connected" : (connection.status || normalized.status)
    };
  } catch {
    return null;
  }
}

function upsertAsoCustomerConnection(connections = [], connection = null) {
  const defaults = defaultAsoCustomerConnections();
  const normalizedRows = (Array.isArray(connections) ? connections : [])
    .map(normalizeStoredAsoCustomerConnection)
    .filter(Boolean);
  const merged = defaults.map((item) => normalizedRows.find((row) => row.service === item.service) || item);
  if (!connection) return merged;
  const normalizedConnection = normalizeStoredAsoCustomerConnection(connection);
  if (!normalizedConnection) return merged;
  const index = merged.findIndex((item) => item.service === normalizedConnection.service);
  if (index >= 0) merged[index] = normalizedConnection;
  else merged.push(normalizedConnection);
  return merged;
}

function parseListParam(value) {
  return uniqueStrings(String(value || "")
    .split(/[,|\n]/)
    .map((item) => item.trim())
    .filter(Boolean));
}

function parseKeywordPayloadTerms(payload = {}) {
  const raw = payload.keywords ?? payload.keyword ?? payload.terms ?? payload.term ?? "";
  return parseListParam(Array.isArray(raw) ? raw.join(",") : raw);
}

function normalizeKeywordUpdateMode(value) {
  const mode = normalizeKey(value || "add");
  if (["add", "remove", "replace"].includes(mode)) return mode;
  return "add";
}

function asoKeywordLimit(workspace = {}) {
  return Number(workspace.limits?.keywords || normalizeAsoPlan(workspace.plan).limits.keywords || 50);
}

function uniqueStrings(values) {
  const seen = new Set();
  return values
    .map((value) => String(value || "").trim())
    .filter((value) => {
      const key = value.toLowerCase();
      if (!key || key.length < 2 || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function defaultAsoSaasKeywords(appStore) {
  const seeds = [];
  const name = appStore.name || "";
  const category = appStore.category || appStore.primaryGenreName || "";
  const metadataText = `${name} ${category} ${(appStore.genres || []).join(" ")} ${appStore.lookup?.description || ""}`;
  const stopWords = new Set(["app", "game", "games", "legend", "run", "the", "and", "for", "with"]);
  const add = (value) => {
    const cleaned = String(value || "").toLowerCase().replace(/[™®:]+/g, " ").replace(/\s+/g, " ").trim();
    const usefulWords = cleaned.split(/[^a-z0-9&-]+/).filter((word) => word.length >= 2 && !stopWords.has(word));
    if (cleaned && cleaned.length >= 3 && usefulWords.length) seeds.push(cleaned);
  };
  const words = name.toLowerCase().split(/[^a-z0-9-]+/).filter((word) => word.length >= 3 && !stopWords.has(word));
  for (let index = 0; index < words.length; index += 1) {
    if (words[index + 1]) add(`${words[index]} ${words[index + 1]}`);
  }
  add(name);
  add(name.replace(/[:™®-]/g, " "));
  if (/plant|botany|garden/i.test(metadataText)) {
    add("plant education");
    add("plant identifier");
    add("plant care");
    add("plant app");
    add("plant learning");
    add("botany");
    add("garden planner");
    add("plant guide");
    add("plant scanner");
    add("plant disease");
    add("house plants");
  } else if (/album|music|artist|producer|hip-hop|r&b|pop hit/i.test(metadataText)) {
    add("music game");
    add("album draft");
    add("album ranking");
    add("music trivia");
    add("music simulator");
    add("artist draft");
    add("best albums");
    add("producer game");
    add("hip hop game");
    add("pop music game");
    add("r&b music");
  } else if (/football|16[- ]?0|undefeated/i.test(metadataText)) {
    add("football game");
    add("football simulator");
    add("football manager");
    add("football draft");
    add("football lineup");
    add("undefeated football");
    add("sports simulator");
    add("sports draft");
    add("16-0");
    add("16 and 0");
    add("17-0");
    add("20-0");
  } else if (/baseball|162/i.test(name)) {
    add("baseball game");
    add("baseball simulator");
    add("baseball manager");
    add("baseball gm");
    add("baseball lineup");
    add("baseball strategy");
  } else if (/basketball|82/i.test(name)) {
    add("basketball game");
    add("basketball simulator");
    add("basketball manager");
    add("basketball gm");
    add("sports game");
  } else if (/sport|game/i.test(category)) {
    add("sports game");
    add("sports simulator");
  }
  if (/food|health/i.test(`${name} ${category}`)) {
    add("food scanner");
    add("ingredient scanner");
    add("nutrition scanner");
  }
  if (/business|productivity|utilities/i.test(category) && !/plant|botany|garden/i.test(metadataText)) {
    add("estimate app");
    add("calculator app");
    add("project planner");
  }
  return uniqueStrings(seeds).slice(0, 12);
}

function genericAsoAdsPayload({ campaigns, appleAdsInsights, targetApp, appStore }) {
  const identifiers = appIdentityTerms(targetApp, appStore);
  const campaignRows = (campaigns || []).filter((campaign) => genericAppTextMatch(`${campaign.app || ""} ${campaign.name || ""}`, identifiers));
  const campaignNames = new Set(campaignRows.map((campaign) => normalizeKey(campaign.name)));
  const matchesRow = (row) => campaignNames.has(normalizeKey(row.campaignName)) || genericAppTextMatch([
    row.app,
    row.campaignName,
    row.adGroupName,
    row.keyword,
    row.searchTerm,
    row.term
  ].filter(Boolean).join(" "), identifiers);
  const keywordRows = (appleAdsInsights?.keywords || []).filter(matchesRow);
  const searchTermRows = (appleAdsInsights?.searchTerms || []).filter(matchesRow);
  const exactRows = keywordRows.filter((row) => normalizeKey(row.matchType) === "exact");
  const broadRows = keywordRows.filter((row) => normalizeKey(row.matchType) === "broad");
  const campaignTotals = summarizeAdMetricRows(campaignRows.map((campaign) => ({
    spend: parseCurrencyLabel(campaign.spend),
    taps: parseCurrencyLabel(campaign.taps),
    installs: parseCurrencyLabel(campaign.installs)
  })));
  const rowTotals = summarizeAdMetricRows([...keywordRows, ...searchTermRows]);
  return {
    ready: Boolean(campaignRows.length || keywordRows.length || searchTermRows.length),
    total: campaignTotals.spend || campaignTotals.installs ? campaignTotals : rowTotals,
    exact: summarizeAdMetricRows(exactRows),
    broad: summarizeAdMetricRows(broadRows),
    keywordRows,
    searchTermRows,
    campaigns: campaignRows.map((campaign) => ({
      name: campaign.name,
      app: campaign.app,
      status: campaign.status,
      spend: campaign.spend,
      taps: campaign.taps,
      installs: campaign.installs,
      cpa: campaign.cpa
    }))
  };
}

function mergeAppleAdsInsights(base = {}, extra = {}) {
  return {
    ...base,
    ready: Boolean(base.ready || extra.ready || (extra.keywords || []).length || (extra.searchTerms || []).length),
    keywords: [...(base.keywords || []), ...(extra.keywords || [])],
    searchTerms: [...(base.searchTerms || []), ...(extra.searchTerms || [])],
    recommendations: [...(base.recommendations || []), ...(extra.recommendations || [])],
    access: { ...(base.access || {}), ...(extra.access || {}) }
  };
}

function appIdentityTerms(targetApp, appStore) {
  const stopWords = new Set(["app", "game", "games", "sports", "sport", "run", "legend", "the", "and"]);
  const values = [
    targetApp.name,
    targetApp.bundleId,
    appStore.name,
    appStore.bundleId
  ];
  const words = String(targetApp.name || appStore.name || "")
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => (word.length >= 4 || /\d/.test(word)) && !stopWords.has(word));
  return uniqueStrings([...values, ...words]).map(normalizeKey).filter(Boolean);
}

function genericAppTextMatch(value, identifiers) {
  const haystack = normalizeKey(value);
  return identifiers.some((identifier) => identifier.length >= 3 && haystack.includes(identifier));
}

function asoMetadataAudit({ appStore = {}, keywordRows = [], ads = {}, competitors = [], importedMetadata = null }) {
  const lookup = appStore.lookup || {};
  const importedFields = normalizeAsoMetadataFields(importedMetadata?.fields || {});
  const hasImportedMetadata = metadataImportHasUsefulFields(importedFields);
  const title = importedFields.title || appStore.name || lookup.trackName || "";
  const subtitle = importedFields.subtitle || "";
  const keywordField = importedFields.keywordField || "";
  const promotionalText = importedFields.promotionalText || "";
  const description = importedFields.description || lookup.description || "";
  const releaseNotes = importedFields.releaseNotes || lookup.releaseNotes || "";
  const categoryText = [
    appStore.category,
    appStore.primaryGenreName,
    ...(Array.isArray(appStore.genres) ? appStore.genres : [])
  ].filter(Boolean).join(" ");
  const screenshots = [
    ...(lookup.screenshotUrls || []),
    ...(lookup.ipadScreenshotUrls || []),
    ...(lookup.appletvScreenshotUrls || [])
  ].filter(Boolean);
  const screenshotCount = importedFields.screenshotCount || screenshots.length;
  const terms = asoMetadataTerms(keywordRows, ads, competitors);
  const coverageRows = terms.map((term) => {
    const inTitle = metadataContains(title, term.term);
    const inSubtitle = metadataContains(subtitle, term.term);
    const inKeywordField = metadataContains(keywordField, term.term);
    const inPromotionalText = metadataContains(promotionalText, term.term);
    const inDescription = metadataContains(description, term.term);
    const inReleaseNotes = metadataContains(releaseNotes, term.term);
    const inCategory = metadataContains(categoryText, term.term);
    const indexedCovered = inTitle || inSubtitle || inKeywordField;
    const covered = indexedCovered || inPromotionalText || inDescription || inReleaseNotes || inCategory;
    return {
      ...term,
      inTitle,
      inSubtitle,
      inKeywordField,
      inPromotionalText,
      inDescription,
      inReleaseNotes,
      inCategory,
      indexedCovered,
      covered,
      action: metadataCoverageAction({ ...term, inTitle, inSubtitle, inKeywordField, inPromotionalText, inDescription, inReleaseNotes, inCategory, indexedCovered, covered })
    };
  });
  const missingHighIntent = coverageRows
    .filter((row) => !row.indexedCovered && ["high", "medium"].includes(row.priority))
    .slice(0, 8);
  const titleLength = [...title].length;
  const subtitleLength = [...subtitle].length;
  const keywordFieldLength = [...keywordField].length;
  const descriptionLength = [...description].length;
  const titleScore = titleLength >= 12 && titleLength <= 30 ? 20 : titleLength > 30 ? 8 : 12;
  const subtitleScore = hasImportedMetadata ? (subtitleLength >= 10 && subtitleLength <= 30 ? 10 : subtitleLength > 30 ? 2 : 5) : 0;
  const keywordFieldScore = hasImportedMetadata ? (keywordFieldLength >= 60 && keywordFieldLength <= 100 ? 10 : keywordFieldLength > 100 ? 2 : 5) : 0;
  const coverageScore = terms.length
    ? Math.round((coverageRows.filter((row) => row.indexedCovered).length / terms.length) * 40)
    : 0;
  const screenshotScore = Math.min(15, screenshotCount * 1.5);
  const descriptionScore = descriptionLength >= 300 ? 10 : descriptionLength >= 120 ? 6 : 2;
  const score = Math.min(100, Math.round(titleScore + subtitleScore + keywordFieldScore + coverageScore + screenshotScore + descriptionScore));
  const recommendations = asoMetadataRecommendations({
    score,
    title,
    titleLength,
    subtitle,
    subtitleLength,
    keywordField,
    keywordFieldLength,
    descriptionLength,
    screenshotCount,
    coverageRows,
    missingHighIntent,
    hasImportedMetadata
  });
  const keywordFieldPlan = asoKeywordFieldOptimizer({
    title,
    subtitle,
    keywordField,
    coverageRows,
    missingHighIntent
  });
  return {
    ready: Boolean(title || description || coverageRows.length),
    score,
    scoreLabel: `${score}/100`,
    source: hasImportedMetadata ? "customer-metadata-import" : "public-itunes-lookup",
    import: hasImportedMetadata ? asoMetadataImportSummary(importedMetadata) : null,
    limits: {
      appName: 30,
      subtitle: 30,
      keywordField: 100,
      screenshots: 10
    },
    fields: {
      title,
      titleLength,
      titleCapacity: Math.max(0, 30 - titleLength),
      subtitleAvailable: Boolean(subtitle),
      subtitleLength,
      subtitleCapacity: Math.max(0, 30 - subtitleLength),
      keywordFieldAvailable: Boolean(keywordField),
      keywordFieldLength,
      keywordFieldCapacity: Math.max(0, 100 - keywordFieldLength),
      keywordFieldTerms: parseKeywordFieldTerms(keywordField).slice(0, 20),
      promotionalTextAvailable: Boolean(promotionalText),
      promotionalTextLength: [...promotionalText].length,
      subtitleNote: hasImportedMetadata ? "Using customer-imported App Store Connect metadata." : "Public iTunes Lookup does not expose subtitle; import App Store Connect metadata to audit it exactly.",
      descriptionLength,
      firstDescriptionLine: String(description || "").split(/\n+/).find(Boolean)?.slice(0, 180) || "",
      screenshotCount,
      hasIcon: Boolean(lookup.artworkUrl512 || lookup.artworkUrl100)
    },
    coverage: {
      totalTerms: coverageRows.length,
      coveredTerms: coverageRows.filter((row) => row.covered).length,
      indexedCoveredTerms: coverageRows.filter((row) => row.indexedCovered).length,
      titleTerms: coverageRows.filter((row) => row.inTitle).length,
      subtitleTerms: coverageRows.filter((row) => row.inSubtitle).length,
      keywordFieldTerms: coverageRows.filter((row) => row.inKeywordField).length,
      descriptionTerms: coverageRows.filter((row) => row.inDescription).length,
      rows: coverageRows.slice(0, 16)
    },
    missingHighIntent,
    keywordFieldPlan,
    recommendations
  };
}

function asoMetadataTerms(keywordRows = [], ads = {}, competitors = []) {
  const terms = new Map();
  const add = (term, source, weight = 1, data = {}) => {
    const cleaned = cleanMetadataTerm(term);
    if (!cleaned) return;
    const existing = terms.get(cleaned) || {
      term: cleaned,
      sources: [],
      weight: 0,
      rank: null,
      rankLabel: ">50",
      paidInstalls: 0,
      paidSpend: 0,
      competitorCount: 0,
      priority: "low"
    };
    if (!existing.sources.includes(source)) existing.sources.push(source);
    existing.weight += weight;
    if (data.rank && (!existing.rank || data.rank < existing.rank)) {
      existing.rank = data.rank;
      existing.rankLabel = String(data.rank);
    }
    existing.paidInstalls += Number(data.paidInstalls || 0);
    existing.paidSpend += Number(data.paidSpend || 0);
    existing.competitorCount += Number(data.competitorCount || 0);
    terms.set(cleaned, existing);
  };
  for (const row of keywordRows.slice(0, 20)) {
    const installs = Number(row.ads?.installs || 0);
    const spend = Number(row.ads?.spend || 0);
    const rank = Number(row.rank || 0) || null;
    const weight = Number(row.opportunityScore || 0) + installs * 35 + spend * 2 + (rank ? Math.max(0, 30 - rank) : 15);
    add(row.keyword, row.action === "watch" ? "tracked keyword" : row.action, weight, {
      rank,
      paidInstalls: installs,
      paidSpend: spend
    });
  }
  for (const competitor of competitors.slice(0, 8)) {
    for (const row of (competitor.keywords || []).slice(0, 4)) {
      add(row.keyword, `competitor: ${competitor.name}`, 30 + Math.max(0, 20 - Number(row.rank || 20)), {
        competitorCount: 1,
        rank: Number(row.rank || 0) || null
      });
    }
  }
  for (const row of [...(ads.keywordRows || []), ...(ads.searchTermRows || [])]) {
    add(row.keyword || row.searchTerm || row.term, "Apple Ads", 50 + Number(row.installs || 0) * 40 + Number(row.spend || 0) * 2, {
      paidInstalls: Number(row.installs || 0),
      paidSpend: Number(row.spend || 0)
    });
  }
  return [...terms.values()]
    .map((term) => ({
      ...term,
      paidSpend: Number(term.paidSpend.toFixed(2)),
      paidSpendLabel: moneyLabel({ amount: term.paidSpend, currency: "USD" }),
      priority: term.paidInstalls > 0 || term.weight >= 180 ? "high" : term.weight >= 80 ? "medium" : "low"
    }))
    .sort((a, b) => b.weight - a.weight || b.paidInstalls - a.paidInstalls)
    .slice(0, 18);
}

function cleanMetadataTerm(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[™®]/g, "")
    .replace(/[^a-z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 2 || cleaned === "unknown keyword" || cleaned === "unknown search term") return "";
  return cleaned;
}

function metadataContains(field, term) {
  const haystack = ` ${cleanMetadataTerm(field)} `;
  const needle = cleanMetadataTerm(term);
  if (!needle) return false;
  if (haystack.includes(` ${needle} `)) return true;
  const words = needle.split(" ").filter((word) => word.length >= 3 || /\d/.test(word));
  return words.length > 1 && words.every((word) => haystack.includes(` ${word} `));
}

function metadataCoverageAction(row) {
  if (row.inTitle && row.paidInstalls > 0) return "defend title coverage";
  if (row.inTitle) return "covered in title";
  if (row.inSubtitle) return "covered in subtitle";
  if (row.inKeywordField) return "covered in keyword field";
  if (row.indexedCovered) return "covered in indexed metadata";
  if (row.covered && row.priority === "high") return "move into subtitle/keyword field";
  if (!row.covered && row.priority === "high") return "add to subtitle or keyword field";
  if (!row.covered && row.priority === "medium") return "test in keyword field";
  if (row.covered) return "covered";
  return "watch";
}

function asoKeywordFieldOptimizer({ title = "", subtitle = "", keywordField = "", coverageRows = [], missingHighIntent = [] }) {
  const indexedWords = new Set([
    ...metadataWordSet(title),
    ...metadataWordSet(subtitle)
  ]);
  const existingTerms = parseKeywordFieldTerms(keywordField);
  const currentLength = [...String(keywordField || "")].length;
  const candidateRows = uniqueKeywordFieldCandidates([
    ...missingHighIntent,
    ...coverageRows.filter((row) => !row.inTitle && !row.inSubtitle)
  ], indexedWords);
  const selected = [];
  const dropped = [];
  let value = "";
  for (const row of candidateRows) {
    const term = keywordFieldTermCandidate(row.term, indexedWords);
    if (!term) continue;
    const nextValue = value ? `${value},${term}` : term;
    const selectedKeys = new Set(selected.map((item) => item.term));
    if (selectedKeys.has(term)) continue;
    if ([...nextValue].length <= 100) {
      selected.push({
        term,
        originalTerm: row.term,
        priority: row.priority || "low",
        sources: row.sources || [],
        reason: keywordFieldCandidateReason(row)
      });
      value = nextValue;
    } else {
      dropped.push({
        term,
        originalTerm: row.term,
        reason: "would exceed 100 characters"
      });
    }
  }
  const remaining = Math.max(0, 100 - [...value].length);
  return {
    ready: Boolean(selected.length || existingTerms.length),
    source: "tracked-paid-competitor-signals",
    current: keywordField || "",
    currentLength,
    optimized: value,
    optimizedLength: [...value].length,
    remaining,
    selected,
    dropped: dropped.slice(0, 8),
    existingTerms,
    note: selected.length
      ? "Paste into App Store Connect keyword field after removing any terms already covered by title/subtitle."
      : "No new high-signal keyword-field terms found beyond current indexed metadata."
  };
}

function uniqueKeywordFieldCandidates(rows = [], indexedWords = new Set()) {
  const seen = new Set();
  return rows
    .map((row) => ({
      ...row,
      candidate: keywordFieldTermCandidate(row.term, indexedWords)
    }))
    .filter((row) => {
      if (!row.candidate || seen.has(row.candidate)) return false;
      seen.add(row.candidate);
      return true;
    })
    .sort((a, b) => metadataCandidateScore(b) - metadataCandidateScore(a));
}

function metadataCandidateScore(row = {}) {
  const priorityScore = row.priority === "high" ? 1000 : row.priority === "medium" ? 500 : 100;
  return priorityScore + Number(row.weight || 0) + Number(row.paidInstalls || 0) * 60 + Number(row.competitorCount || 0) * 25;
}

function keywordFieldCandidateReason(row = {}) {
  if (Number(row.paidInstalls || 0) > 0) return "paid installs";
  if (Number(row.competitorCount || 0) > 0) return "competitor gap";
  if (row.priority === "high") return "high-intent missing term";
  if (row.priority === "medium") return "medium-intent test term";
  return "tracked keyword";
}

function keywordFieldTermCandidate(term, indexedWords = new Set()) {
  const cleaned = cleanMetadataTerm(term);
  if (!cleaned) return "";
  const words = cleaned
    .split(" ")
    .map((word) => word.trim())
    .filter((word) => word.length >= 2 && !indexedWords.has(word));
  return uniqueStrings(words).join(" ").slice(0, 45).trim();
}

function metadataWordSet(value) {
  return new Set(cleanMetadataTerm(value).split(" ").filter(Boolean));
}

function asoMetadataRecommendations({ score, titleLength, subtitleLength, keywordFieldLength, descriptionLength, screenshotCount, coverageRows, missingHighIntent, hasImportedMetadata }) {
  const recommendations = [];
  const topMissing = missingHighIntent[0];
  if (topMissing) {
    recommendations.push({
      priority: topMissing.priority,
      title: `Add ${topMissing.term} to indexed metadata`,
      body: `${topMissing.term} is coming from ${topMissing.sources.slice(0, 2).join(" + ")} but is not covered by app name, subtitle, or keyword field. Put it in subtitle or keyword field before scaling ads.`,
      action: "subtitle/keyword-field rewrite"
    });
  }
  const titleCovered = coverageRows.filter((row) => row.inTitle).length;
  if (titleLength < 24 && titleCovered < 2) {
    recommendations.push({
      priority: "medium",
      title: "Use remaining app-name capacity carefully",
      body: `The visible app name uses ${titleLength}/30 characters and carries ${titleCovered} tracked term${titleCovered === 1 ? "" : "s"}. Test one high-intent descriptor without making the brand generic.`,
      action: "app-name test"
    });
  }
  if (hasImportedMetadata && subtitleLength > 30) {
    recommendations.push({
      priority: "high",
      title: "Trim subtitle to App Store limit",
      body: `The imported subtitle is ${subtitleLength}/30 characters. Shorten it before submission or Apple will reject the metadata update.`,
      action: "subtitle trim"
    });
  }
  if (hasImportedMetadata && keywordFieldLength > 100) {
    recommendations.push({
      priority: "high",
      title: "Trim keyword field to 100 characters",
      body: `The imported keyword field is ${keywordFieldLength}/100 characters. Remove repeated title/subtitle words and low-signal terms.`,
      action: "keyword-field trim"
    });
  }
  if (screenshotCount < 6) {
    recommendations.push({
      priority: "medium",
      title: "Add more product-page screenshots",
      body: `Only ${screenshotCount} screenshots are visible from metadata. Build a fuller screenshot set and run Product Page Optimization once traffic is sufficient.`,
      action: "PPO screenshot treatment"
    });
  }
  if (descriptionLength < 250) {
    recommendations.push({
      priority: "low",
      title: "Strengthen the first description paragraph",
      body: `The public description is ${descriptionLength} characters. Make the first paragraph explain the core use case and mirror the best converting search intent.`,
      action: "description rewrite"
    });
  }
  if (!recommendations.length) {
    recommendations.push({
      priority: score >= 80 ? "low" : "medium",
      title: "Keep metadata monitored",
      body: "Core listing coverage is acceptable. Keep watching rank movement and update subtitle/keyword field only when paid or competitor data proves a better term.",
      action: "keep/protect"
    });
  }
  return recommendations.slice(0, 5);
}

function asoSaasCurrent({ appStore, ads, keywordRows, range, baselineRank }) {
  const categoryRank = Number(appStore.categoryRank || 0) || null;
  const ratingAverage = Number(appStore.ratingAverage || 0) || null;
  const ratingCount = Number(appStore.ratingCount || 0) || null;
  const rankedKeywords = keywordRows.filter((row) => row.rank);
  const unrankedOpportunities = keywordRows.filter((row) => !row.rank && row.action !== "watch").length;
  return {
    categoryRank,
    category: appStore.category || appStore.primaryGenreName || "App Store",
    rankLabel: categoryRank ? `#${categoryRank}` : "unavailable",
    reportedBaselineRank: baselineRank,
    reportedDrop: categoryRank && baselineRank ? categoryRank - baselineRank : null,
    ratingAverage,
    ratingCount,
    paidSpendVelocity: ads.total.spend,
    installVelocityProxy: ads.total.installs,
    trackedKeywords: keywordRows.length,
    rankedKeywords: rankedKeywords.length,
    unrankedOpportunities,
    sourceRange: `${range.startDate} to ${range.endDate}`
  };
}

function asoSaasKeywordRow(row) {
  return {
    keyword: row.keyword,
    rank: row.rank,
    rankLabel: row.rankLabel,
    action: row.action,
    recommendation: row.recommendation,
    traffic: row.traffic,
    complexity: row.complexity,
    effectiveness: row.effectiveness,
    effectivenessScore: row.effectivenessScore,
    searchAds: row.searchAds,
    apps: row.apps,
    ads: row.ads,
    topApps: row.topApps
  };
}

function asoSaasCompetitorSnapshot(keywordRows, targetApp = {}) {
  const competitors = new Map();
  const targetKeys = new Set([
    normalizeKey(targetApp.name),
    normalizeKey(targetApp.bundleId)
  ].filter(Boolean));
  for (const row of keywordRows) {
    for (const app of row.topApps || []) {
      const key = app.bundleId || app.name;
      if (!key) continue;
      if (targetKeys.has(normalizeKey(app.bundleId)) || targetKeys.has(normalizeKey(app.name))) continue;
      const existing = competitors.get(key) || {
        name: app.name,
        bundleId: app.bundleId,
        genre: app.genre,
        rating: app.rating,
        ratings: app.ratings,
        appearances: 0,
        rankTotal: 0,
        keywords: []
      };
      existing.appearances += 1;
      existing.rankTotal += Number(app.rank || 0);
      existing.keywords.push({ keyword: row.keyword, rank: app.rank });
      competitors.set(key, existing);
    }
  }
  return [...competitors.values()]
    .map((competitor) => ({
      ...competitor,
      averageRank: Number((competitor.rankTotal / Math.max(competitor.appearances, 1)).toFixed(1)),
      keywords: competitor.keywords.slice(0, 6)
    }))
    .sort((a, b) => b.appearances - a.appearances || a.averageRank - b.averageRank)
    .slice(0, 10);
}

function asoSaasActions({ current, ads, keywordRows, competitors, baselineRank, metadata, reviews }) {
  const actions = [];
  if (current.ratingAverage && current.ratingAverage < 3.8) {
    actions.push({
      priority: "critical",
      type: "rank risk",
      title: "Fix rating/review drag before scaling traffic",
      body: `Visible rating is ${current.ratingAverage.toFixed(1)} from ${current.ratingCount || 0} ratings. Repair the highest-friction onboarding/paywall moment, answer recent reviews, and prompt ratings only after a successful user moment.`,
      metric: `${current.ratingAverage.toFixed(1)} stars · ${current.ratingCount || 0} ratings`,
      action: "ship product fix + review response"
    });
  }
  const reviewTheme = (reviews?.topThemes || [])[0];
  if (reviews?.summary?.negativeCount > 0 && reviewTheme) {
    actions.push({
      priority: reviewTheme.key === "paywall" || reviewTheme.key === "onboarding" ? "critical" : "high",
      type: "review intelligence",
      title: `Fix ${reviewTheme.label.toLowerCase()} review drag`,
      body: `${reviews.summary.negativeCount}/${reviews.summary.rowCount} imported reviews are negative, and ${reviewTheme.count} mention ${reviewTheme.label.toLowerCase()}. Ship the product fix before scaling install velocity, then respond to those reviews with the concrete change.`,
      metric: `${reviews.summary.averageRatingLabel} imported review average`,
      action: reviewTheme.action
    });
  }
  if (current.categoryRank && current.reportedDrop > 15) {
    actions.push({
      priority: "high",
      type: "rank rescue",
      title: "Run a controlled install-velocity push",
      body: `Category rank is ${current.rankLabel}, ${current.reportedDrop} places worse than the #${baselineRank} baseline. Push only high-intent exact keywords and matching content until conversion/rating quality improves.`,
      metric: `${current.rankLabel} · ${current.category}`,
      action: "cap budget + exact-match push"
    });
  }
  const protect = keywordRows.find((row) => row.action === "defend");
  if (protect) {
    actions.push({
      priority: "high",
      type: "keep/protect",
      title: `Defend ${protect.keyword}`,
      body: `${protect.keyword} ranks ${protect.rankLabel} and has paid-install signal. Keep exact coverage active and prevent broad campaigns from consuming this budget.`,
      metric: `${protect.ads.spendLabel} · ${protect.ads.installs} installs`,
      action: "keep/protect exact"
    });
  }
  const metadataOpportunity = keywordRows.find((row) => row.action === "add-to-metadata" || row.action === "improve-rank");
  if (metadataOpportunity) {
    actions.push({
      priority: "medium",
      type: "ASO opportunity",
      title: `Prioritize ${metadataOpportunity.keyword} in metadata`,
      body: metadataOpportunity.recommendation,
      metric: `${metadataOpportunity.rankLabel} rank · ${metadataOpportunity.effectiveness} effectiveness`,
      action: "metadata test + exact ad validation"
    });
  }
  const missingMetadata = (metadata?.missingHighIntent || [])[0];
  if (missingMetadata) {
    actions.push({
      priority: missingMetadata.priority === "high" ? "high" : "medium",
      type: "metadata coverage",
      title: `Cover ${missingMetadata.term} in metadata`,
      body: `${missingMetadata.term} has paid, ranking, or competitor signal but is not visible in the app name or description. Add it to the subtitle or keyword field, then validate with an exact-match ad test.`,
      metric: `${metadata.score}/100 listing score · ${metadata.missingHighIntent.length} missing high-intent terms`,
      action: "metadata rewrite"
    });
  }
  const exactWinner = keywordRows.find((row) => row.action === "test-exact");
  if (exactWinner) {
    actions.push({
      priority: "medium",
      type: "prospecting",
      title: `Test exact match for ${exactWinner.keyword}`,
      body: `${exactWinner.keyword} has favorable traffic-to-complexity before enough conversion data exists. Buy a small exact test, then promote it to metadata only if installs are efficient.`,
      metric: `${exactWinner.traffic} traffic proxy · ${exactWinner.complexity} complexity`,
      action: "move/promote to exact"
    });
  }
  const paidWaste = keywordRows.find((row) => row.ads?.installs === 0 && (row.ads?.taps >= 10 || row.ads?.spend >= 7));
  if (paidWaste) {
    actions.push({
      priority: "high",
      type: "Apple Ads import risk",
      title: `Stop waste on ${paidWaste.keyword}`,
      body: `${paidWaste.keyword} has customer-imported Apple Ads demand but no installs. Keep it out of metadata and pause it, add a negative exact, or isolate it before more spend accrues.`,
      metric: `${paidWaste.ads.spendLabel} · ${paidWaste.ads.taps} taps · ${paidWaste.ads.installs} installs`,
      action: "pause or add negative exact"
    });
  }
  if (ads.broad.spend >= 7 && ads.broad.installRate < 0.15) {
    actions.push({
      priority: "medium",
      type: "Apple Ads risk",
      title: "Cap broad discovery until search terms prove intent",
      body: `Broad-match spend has a ${(ads.broad.installRate * 100).toFixed(1)}% install rate. Keep discovery capped and move winners into exact-match groups.`,
      metric: `${ads.broad.spendLabel} broad spend · ${ads.broad.taps} taps`,
      action: "lower bid percentage"
    });
  }
  if (competitors.length) {
    const competitor = competitors[0];
    actions.push({
      priority: "medium",
      type: "competitive keyword",
      title: `Study ${competitor.name}`,
      body: `${competitor.name} appears across ${competitor.appearances} tracked keyword result sets with average rank ${competitor.averageRank}. Compare screenshots, subtitle, ratings, and keyword coverage before picking the next test.`,
      metric: `${competitor.appearances} keyword overlaps`,
      action: "competitor snapshot"
    });
  }
  actions.push({
    priority: "medium",
    type: "conversion",
    title: "Create a high-intent custom product page",
    body: "Match screenshots and promotional text to the best exact keyword cluster, then route paid search to that page and compare conversion before broad scaling.",
    metric: "custom product page + PPO-ready screenshots",
    action: "launch custom product page"
  });
  return actions;
}

function asoSaasProductBlueprint() {
  return {
    positioning: "Rank rescue playbooks for iOS sellers: monitor rank drops, explain why they happened, and prescribe the next ASO or Apple Ads move.",
    buyer: "Indie iOS developers and small app studios spending enough on Apple Ads or ASO to care about rank movement, but not enough to hire a full-time growth analyst.",
    wedge: "A daily rank-drop diagnosis that combines public App Store rank/rating, keyword ranks, competitor overlap, Apple Ads search-term quality, and product-page conversion actions.",
    tiers: [
      { name: "Rescue", price: "$29/mo", includes: "1 app, 5 competitors, 50 keywords, daily rank/rating alerts, competitor gaps, action queue." },
      { name: "Growth", price: "$79/mo", includes: "5 apps, 25 competitors/app, 250 keywords, Apple Ads import, exact/broad split, SMS emergencies, custom product-page planner." },
      { name: "Studio", price: "$199/mo", includes: "25 apps, 100 competitors/app, 1,000 keywords, team seats, API export, weekly opportunity reports, priority alerts." }
    ],
    launchSequence: [
      "Use Legend Run as the public case study and prove rank recovery playbooks.",
      "Invite 10 iOS indie founders with one free app audit.",
      "Ship daily email/SMS digest before building heavyweight analytics.",
      "Charge for ongoing monitoring, not one-off keyword research."
    ],
    mustHaveMvp: [
      "App Store URL onboarding",
      "Keyword rank and competitor snapshots",
      "Named competitor tracking and keyword gaps",
      "Listing metadata coverage audit",
      "App Store Connect metadata import",
      "Review/rating risk alerts",
      "Apple Ads keyword/search-term correlation",
      "Concrete action queue with pause/protect/promote/cap/test recommendations"
    ]
  };
}

async function asoSaasSignupPayload(req) {
  const payload = await readJsonBody(req);
  const email = String(payload.email || "").trim().toLowerCase();
  const company = String(payload.company || "").trim();
  const phone = normalizePhoneNumber(payload.phone || payload.sms || payload.smsPhone);
  const plan = normalizeAsoPlan(payload.plan);
  const appUrl = String(payload.appUrl || "").trim();
  const country = String(payload.country || "US").trim().slice(0, 2).toUpperCase() || "US";
  const keywords = parseListParam(payload.keywords);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required.");
  }
  const appId = parseAppStoreAppId(appUrl);
  if (!appId) {
    throw new Error("A valid App Store URL with an app id is required.");
  }
  const now = new Date();
  const existingWorkspaces = await readAsoWorkspaces();
  const existing = existingWorkspaces.find((workspace) => normalizeKey(workspace.email) === normalizeKey(email));
  const workspaceId = existing?.id || `ws_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const access = issueAsoWorkspaceAccess(workspaceId, req);
  const checkout = await asoSaasCheckoutPayload(plan, email, { workspaceId, appId, appUrl, country, req });
  const appEntry = await asoWorkspaceAppEntry({ appUrl, appId, country, keywords, createdAt: now.toISOString() });
  const apps = upsertAsoWorkspaceApp(existing?.apps || [], appEntry, plan.limits);
  const workspace = {
    id: workspaceId,
    email,
    company,
    plan: plan.name,
    status: existing?.status || "trialing",
    createdAt: existing?.createdAt || now.toISOString(),
    updatedAt: now.toISOString(),
    trialEndsAt: existing?.trialEndsAt || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    limits: plan.limits,
    stripe: existing?.stripe || {},
    notifications: {
      email,
      phone: phone || existing?.notifications?.phone || "",
      emailEnabled: true,
      smsEnabled: Boolean(phone || existing?.notifications?.phone)
    },
    apps,
    checkout,
    access: {
      tokenHash: hashAsoAccessToken(access.token),
      issuedAt: now.toISOString(),
      lastSeenAt: existing?.access?.lastSeenAt || ""
    },
    onboarding: [
      "Connect the customer's App Store Connect credentials for owned apps, metadata, and sales context.",
      "Connect the customer's RevenueCat API key and project ID before spend recommendations use gross profit.",
      "Connect the customer's Apple Ads credentials or import Apple Ads CSV rows for exact/broad split and search-term quality."
    ],
    connections: existing?.connections || defaultAsoCustomerConnections()
  };
  const workspaces = [workspace, ...existingWorkspaces.filter((item) => item.id !== workspace.id)];
  await writeAsoWorkspaces(workspaces);
  return {
    saved: true,
    workspace: asoWorkspaceDetail(workspace),
    access,
    workspaces: workspaces.slice(0, 12).map(asoWorkspaceSummary)
  };
}

async function asoSaasLoginPayload(req) {
  const payload = await readJsonBody(req);
  const email = String(payload.email || "").trim().toLowerCase();
  const appId = parseAppStoreAppId(payload.appUrl) || String(payload.appId || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is required.");
  const workspaces = await readAsoWorkspaces();
  const workspace = workspaces.find((item) =>
    normalizeKey(item.email) === normalizeKey(email)
    && (!appId || (item.apps || []).some((app) => String(app.appId) === String(appId)))
  );
  if (!workspace) throw new Error("No workspace found for that email and app.");
  const access = issueAsoWorkspaceAccess(workspace.id, req);
  const updated = {
    ...workspace,
    updatedAt: new Date().toISOString(),
    access: {
      tokenHash: hashAsoAccessToken(access.token),
      issuedAt: new Date().toISOString(),
      lastSeenAt: workspace.access?.lastSeenAt || ""
    }
  };
  await writeAsoWorkspaces([updated, ...workspaces.filter((item) => item.id !== workspace.id)]);
  return { sent: true, workspace: asoWorkspaceDetail(updated), access };
}

async function asoSaasAddAppPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const payload = await readJsonBody(req);
  const appUrl = String(payload.appUrl || "").trim();
  const appId = parseAppStoreAppId(appUrl);
  if (!appId) throw new Error("A valid App Store URL with an app id is required.");
  const country = String(payload.country || "US").trim().slice(0, 2).toUpperCase() || "US";
  const keywords = parseListParam(payload.keywords);
  const baselineRank = Number(payload.baselineRank || 60);
  const appEntry = await asoWorkspaceAppEntry({
    appUrl,
    appId,
    country,
    keywords,
    baselineRank,
    createdAt: new Date().toISOString()
  });
  const apps = upsertAsoWorkspaceApp(workspace.apps || [], appEntry, workspace.limits || normalizeAsoPlan(workspace.plan).limits);
  const updated = {
    ...workspace,
    apps,
    updatedAt: new Date().toISOString()
  };
  await writeAsoWorkspaces([updated, ...workspaces.filter((item) => item.id !== workspace.id)]);
  return {
    saved: true,
    app: apps.find((app) => String(app.appId) === String(appId)),
    workspace: asoWorkspaceDetail(updated)
  };
}

async function asoSaasConnectionsPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const payload = await readJsonBody(req, 100_000);
  const connection = normalizeAsoCustomerConnection(payload);
  const connections = upsertAsoCustomerConnection(workspace.connections || defaultAsoCustomerConnections(), connection);
  const updated = {
    ...workspace,
    connections,
    updatedAt: new Date().toISOString()
  };
  await writeAsoWorkspaces([updated, ...workspaces.filter((item) => item.id !== workspace.id)]);
  return {
    saved: true,
    connection,
    workspace: asoWorkspaceDetail(updated)
  };
}

async function asoSaasAddCompetitorPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const selectedApp = selectAsoWorkspaceApp(workspace, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const payload = await readJsonBody(req);
  const competitorUrl = String(payload.competitorUrl || payload.appUrl || "").trim();
  const competitorAppId = parseAppStoreAppId(competitorUrl);
  if (!competitorAppId) throw new Error("A valid competitor App Store URL with an app id is required.");
  const country = String(payload.country || selectedApp.country || "US").trim().slice(0, 2).toUpperCase() || "US";
  const keywords = parseListParam(payload.keywords);
  const competitorEntry = await asoWorkspaceCompetitorEntry({
    appUrl: competitorUrl,
    appId: competitorAppId,
    country,
    keywords,
    createdAt: new Date().toISOString()
  });
  const updatedApp = {
    ...selectedApp,
    competitors: upsertAsoWorkspaceCompetitor(
      selectedApp.competitors || [],
      competitorEntry,
      workspace.limits || normalizeAsoPlan(workspace.plan).limits
    ),
    updatedAt: new Date().toISOString()
  };
  const updatedWorkspace = updateAsoWorkspaceApp(workspace, updatedApp);
  await writeAsoWorkspaces([updatedWorkspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const competitorResearch = await asoWorkspaceCompetitorResearch(updatedApp, { limit: Number(url.searchParams.get("limit") || 16) });
  return {
    saved: true,
    competitor: competitorEntry,
    workspace: asoWorkspaceDetail(updatedWorkspace),
    selectedApp: updatedApp,
    competitorResearch
  };
}

async function asoSaasUpdateKeywordsPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const selectedApp = selectAsoWorkspaceApp(workspace, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const payload = await readJsonBody(req);
  const mode = normalizeKeywordUpdateMode(payload.mode);
  const terms = parseKeywordPayloadTerms(payload);
  if (!terms.length) throw new Error("At least one keyword is required.");
  const currentKeywords = uniqueStrings(selectedApp.keywords || []);
  const removeKeys = new Set(terms.map((term) => normalizeKey(term)));
  let nextKeywords = currentKeywords;
  if (mode === "replace") {
    nextKeywords = terms;
  } else if (mode === "remove") {
    nextKeywords = currentKeywords.filter((keyword) => !removeKeys.has(normalizeKey(keyword)));
  } else {
    nextKeywords = uniqueStrings([...currentKeywords, ...terms]);
  }
  const limit = asoKeywordLimit(workspace);
  if (nextKeywords.length > limit) {
    throw new Error(`This plan allows ${limit} tracked keyword${limit === 1 ? "" : "s"} per app. Remove keywords or upgrade before adding more.`);
  }
  const updatedApp = {
    ...selectedApp,
    keywords: nextKeywords,
    updatedAt: new Date().toISOString()
  };
  const updatedWorkspace = updateAsoWorkspaceApp(workspace, updatedApp);
  await writeAsoWorkspaces([updatedWorkspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const analysis = await analyzeAsoWorkspaceApp(updatedApp, reportDateRange(url));
  return {
    saved: true,
    mode,
    keywords: {
      count: nextKeywords.length,
      limit,
      rows: nextKeywords
    },
    workspace: asoWorkspaceDetail(updatedWorkspace),
    selectedApp: asoWorkspaceAppDetail(updatedApp),
    analysis
  };
}

async function asoSaasAppleAdsImportPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const selectedApp = selectAsoWorkspaceApp(workspace, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const payload = await readJsonBody(req, 2_000_000);
  const csv = String(payload.csv || payload.report || "").trim();
  if (!csv) throw new Error("Apple Ads CSV text is required.");
  const rows = parseAppleAdsImportCsv(csv, selectedApp).slice(0, 2_000);
  if (!rows.length) throw new Error("No Apple Ads rows with a keyword or search term were found.");
  const importRecord = {
    id: `ads_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    sourceName: String(payload.sourceName || payload.filename || "Apple Ads CSV import").slice(0, 120),
    reportType: String(payload.reportType || inferAppleAdsReportType(rows)).slice(0, 60),
    rowCount: rows.length,
    totals: summarizeAdMetricRows(rows),
    rows
  };
  const updatedApp = {
    ...selectedApp,
    appleAdsImports: [importRecord, ...(selectedApp.appleAdsImports || [])].slice(0, 20),
    updatedAt: importRecord.createdAt
  };
  const updatedWorkspace = updateAsoWorkspaceApp(workspace, updatedApp);
  await writeAsoWorkspaces([updatedWorkspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const analysis = await analyzeAsoWorkspaceApp(updatedApp, reportDateRange(url));
  return {
    saved: true,
    import: asoAppleAdsImportSummary(importRecord),
    workspace: asoWorkspaceDetail(updatedWorkspace),
    selectedApp: asoWorkspaceAppDetail(updatedApp),
    analysis
  };
}

async function asoSaasMetadataImportPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const selectedApp = selectAsoWorkspaceApp(workspace, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const payload = await readJsonBody(req, 1_000_000);
  const fields = parseAsoMetadataImportFields(payload, selectedApp);
  if (!metadataImportHasUsefulFields(fields)) {
    throw new Error("Metadata import needs at least one of app name, subtitle, keyword field, promotional text, description, release notes, or screenshot count.");
  }
  const importRecord = {
    id: `meta_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    sourceName: String(payload.sourceName || payload.filename || "App Store Connect metadata import").slice(0, 120),
    locale: String(payload.locale || fields.locale || selectedApp.locale || "en-US").slice(0, 20),
    fields
  };
  const updatedApp = {
    ...selectedApp,
    metadataImports: [importRecord, ...(selectedApp.metadataImports || [])].slice(0, 20),
    updatedAt: importRecord.createdAt
  };
  const updatedWorkspace = updateAsoWorkspaceApp(workspace, updatedApp);
  await writeAsoWorkspaces([updatedWorkspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const analysis = await analyzeAsoWorkspaceApp(updatedApp, reportDateRange(url));
  return {
    saved: true,
    import: asoMetadataImportSummary(importRecord),
    workspace: asoWorkspaceDetail(updatedWorkspace),
    selectedApp: asoWorkspaceAppDetail(updatedApp),
    analysis
  };
}

async function asoSaasReviewsImportPayload(url, req) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const selectedApp = selectAsoWorkspaceApp(workspace, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const payload = await readJsonBody(req, 1_000_000);
  const rows = parseAsoReviewImportRows(payload).slice(0, 1_000);
  if (!rows.length) throw new Error("Review import needs at least one review row with a rating, title, or body.");
  const importRecord = {
    id: `reviews_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    sourceName: String(payload.sourceName || payload.filename || "App Store review import").slice(0, 120),
    rowCount: rows.length,
    summary: summarizeAsoReviewRows(rows),
    rows
  };
  const updatedApp = {
    ...selectedApp,
    reviewImports: [importRecord, ...(selectedApp.reviewImports || [])].slice(0, 20),
    updatedAt: importRecord.createdAt
  };
  const updatedWorkspace = updateAsoWorkspaceApp(workspace, updatedApp);
  await writeAsoWorkspaces([updatedWorkspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const analysis = await analyzeAsoWorkspaceApp(updatedApp, reportDateRange(url));
  return {
    saved: true,
    import: asoReviewImportSummary(importRecord),
    workspace: asoWorkspaceDetail(updatedWorkspace),
    selectedApp: asoWorkspaceAppDetail(updatedApp),
    analysis
  };
}

async function asoSaasCompetitorsPayload(url) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const updated = await touchAsoWorkspace(workspace, workspaces);
  const selectedApp = selectAsoWorkspaceApp(updated, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  const competitorResearch = await asoWorkspaceCompetitorResearch(selectedApp, { limit: Number(url.searchParams.get("limit") || 16) });
  return {
    ready: true,
    workspace: asoWorkspaceDetail(updated),
    selectedApp,
    competitorResearch
  };
}

async function asoWorkspaceAppEntry({ appUrl, appId, country, keywords, baselineRank = 60, createdAt }) {
  let appStore = {};
  try {
    appStore = await fetchRankRescueAppStoreSnapshot({ ...legendRunTarget, appId, country, name: "", bundleId: "", category: "" });
  } catch {
    appStore = {};
  }
  return {
    appUrl,
    appId,
    name: appStore.name || `App ${appId}`,
    bundleId: appStore.bundleId || "",
    category: appStore.category || appStore.primaryGenreName || "",
    country,
    keywords,
    baselineRank,
    createdAt,
    updatedAt: new Date().toISOString()
  };
}

async function asoWorkspaceCompetitorEntry({ appUrl, appId, country, keywords, createdAt }) {
  let appStore = {};
  try {
    appStore = await fetchRankRescueAppStoreSnapshot({ ...legendRunTarget, appId, country, name: "", bundleId: "", category: "" });
  } catch {
    appStore = {};
  }
  const metadataKeywords = defaultAsoSaasKeywords(appStore);
  return {
    appUrl,
    appId,
    name: appStore.name || `App ${appId}`,
    bundleId: appStore.bundleId || "",
    category: appStore.category || appStore.primaryGenreName || "",
    country,
    keywords: uniqueStrings([...keywords, ...metadataKeywords]).slice(0, 20),
    createdAt,
    updatedAt: new Date().toISOString()
  };
}

function upsertAsoWorkspaceApp(existingApps, appEntry, limits = {}) {
  const apps = Array.isArray(existingApps) ? existingApps : [];
  const index = apps.findIndex((app) => String(app.appId) === String(appEntry.appId) && String(app.country || "US") === String(appEntry.country || "US"));
  if (index >= 0) {
    return apps.map((app, currentIndex) => currentIndex === index
      ? {
          ...app,
          ...appEntry,
          createdAt: app.createdAt || appEntry.createdAt,
          keywords: appEntry.keywords?.length ? appEntry.keywords : app.keywords || [],
          baselineRank: appEntry.baselineRank || app.baselineRank || 60
        }
      : app);
  }
  const maxApps = Number(limits.apps || 1);
  if (apps.length >= maxApps) {
    throw new Error(`This plan allows ${maxApps} app${maxApps === 1 ? "" : "s"}. Upgrade before adding another app.`);
  }
  return [appEntry, ...apps];
}

function upsertAsoWorkspaceCompetitor(existingCompetitors, competitorEntry, limits = {}) {
  const competitors = Array.isArray(existingCompetitors) ? existingCompetitors : [];
  const index = competitors.findIndex((competitor) =>
    String(competitor.appId) === String(competitorEntry.appId)
    && String(competitor.country || "US") === String(competitorEntry.country || "US")
  );
  if (index >= 0) {
    return competitors.map((competitor, currentIndex) => currentIndex === index
      ? {
          ...competitor,
          ...competitorEntry,
          createdAt: competitor.createdAt || competitorEntry.createdAt,
          keywords: competitorEntry.keywords?.length ? competitorEntry.keywords : competitor.keywords || []
        }
      : competitor);
  }
  const maxCompetitors = Number(limits.competitors || 5);
  if (competitors.length >= maxCompetitors) {
    throw new Error(`This plan allows ${maxCompetitors} competitor${maxCompetitors === 1 ? "" : "s"} per app. Upgrade before adding another competitor.`);
  }
  return [competitorEntry, ...competitors];
}

function updateAsoWorkspaceApp(workspace, updatedApp) {
  const apps = workspace.apps || [];
  return {
    ...workspace,
    updatedAt: new Date().toISOString(),
    apps: apps.map((app) =>
      String(app.appId) === String(updatedApp.appId) && String(app.country || "US") === String(updatedApp.country || "US")
        ? updatedApp
        : app
    )
  };
}

function parseAppleAdsImportCsv(csv, app) {
  const table = parseCsvTable(csv);
  const [headers = [], ...records] = table;
  const normalizedHeaders = headers.map(normalizeColumnKey);
  return records
    .map((record) => normalizeAppleAdsImportRow(record, normalizedHeaders, app))
    .filter(Boolean);
}

function parseCsvTable(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  const text = String(csv || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === "\"" && next === "\"") {
      cell += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && char === "\n") {
      row.push(cell);
      if (row.some((value) => String(value || "").trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value || "").trim())) rows.push(row);
  return rows;
}

function normalizeAppleAdsImportRow(record, headers, app) {
  const get = (...keys) => {
    for (const key of keys.map(normalizeColumnKey)) {
      const index = headers.indexOf(key);
      if (index >= 0) return String(record[index] || "").trim();
    }
    return "";
  };
  const searchTerm = get("search term", "searchterm", "query", "search query");
  const keyword = get("keyword", "keyword text", "bid keyword");
  const term = searchTerm || keyword;
  if (!term) return null;
  const spend = parseMetricNumber(get("spend", "local spend", "amount spent"));
  const taps = parseMetricNumber(get("taps", "tap", "clicks", "click"));
  const installs = parseMetricNumber(get("installs", "conversions", "downloads"));
  const avgCpt = parseMetricNumber(get("avg cpt", "average cpt", "avg. cpt", "cpt"));
  const impressions = parseMetricNumber(get("impressions"));
  const row = {
    source: "customer-apple-ads-import",
    app: app.name || "",
    campaignName: get("campaign", "campaign name") || `${app.name || "App"} Imported Apple Ads`,
    adGroupName: get("ad group", "ad group name", "adgroup") || "Imported Apple Ads",
    keyword,
    searchTerm,
    term,
    matchType: normalizeAppleAdsMatchType(get("match type", "matchtype")),
    status: normalizeAppleAdsRowStatus(get("status", "keyword status")),
    spend,
    taps,
    installs,
    avgCpt: avgCpt || (taps ? Number((spend / taps).toFixed(4)) : 0),
    impressions
  };
  return row;
}

function normalizeColumnKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function parseMetricNumber(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function normalizeAppleAdsMatchType(value) {
  const text = normalizeKey(value);
  if (text.includes("broad")) return "BROAD";
  if (text.includes("exact")) return "EXACT";
  return text ? text.toUpperCase() : "EXACT";
}

function normalizeAppleAdsRowStatus(value) {
  const text = normalizeKey(value);
  if (!text) return "ACTIVE";
  if (text.includes("pause")) return "PAUSED";
  if (text.includes("active") || text.includes("run")) return "ACTIVE";
  return text.toUpperCase();
}

function inferAppleAdsReportType(rows) {
  return rows.some((row) => row.searchTerm) ? "search-terms" : "keywords";
}

function asoAppleAdsImportSummary(importRecord = {}) {
  return {
    id: importRecord.id,
    createdAt: importRecord.createdAt,
    sourceName: importRecord.sourceName,
    reportType: importRecord.reportType,
    rowCount: importRecord.rowCount || 0,
    totals: importRecord.totals || summarizeAdMetricRows(importRecord.rows || [])
  };
}

function parseAsoMetadataImportFields(payload = {}, app = {}) {
  const csv = String(payload.csv || payload.metadataCsv || "").trim();
  const csvFields = csv ? parseAsoMetadataCsvFields(csv) : {};
  return normalizeAsoMetadataFields({
    locale: payload.locale || csvFields.locale,
    title: payload.title || payload.appName || payload.name || csvFields.title || csvFields.appName,
    subtitle: payload.subtitle || csvFields.subtitle,
    keywordField: payload.keywordField || payload.keywordsField || payload.keyword_field || payload.keywords || csvFields.keywordField || csvFields.keywords || csvFields.keywordfield,
    promotionalText: payload.promotionalText || payload.promotional_text || csvFields.promotionalText || csvFields.promotionaltext,
    description: payload.description || csvFields.description,
    releaseNotes: payload.releaseNotes || payload.whatsNew || payload.release_notes || csvFields.releaseNotes || csvFields.whatsnew || csvFields.releasenotes,
    screenshotCount: payload.screenshotCount || payload.screenshots || csvFields.screenshotCount || csvFields.screenshots
  });
}

function parseAsoMetadataCsvFields(csv) {
  const table = parseCsvTable(csv);
  const [headers = [], firstRecord = []] = table;
  const normalizedHeaders = headers.map(normalizeColumnKey);
  const fields = {};
  for (let index = 0; index < normalizedHeaders.length; index += 1) {
    fields[normalizedHeaders[index]] = String(firstRecord[index] || "").trim();
  }
  return fields;
}

function normalizeAsoMetadataFields(fields = {}) {
  const normalized = {
    locale: String(fields.locale || "").trim(),
    title: String(fields.title || fields.appName || "").trim().slice(0, 120),
    subtitle: String(fields.subtitle || "").trim().slice(0, 120),
    keywordField: String(fields.keywordField || "").trim().slice(0, 500),
    promotionalText: String(fields.promotionalText || "").trim().slice(0, 500),
    description: String(fields.description || "").trim().slice(0, 8000),
    releaseNotes: String(fields.releaseNotes || "").trim().slice(0, 4000),
    screenshotCount: Number(fields.screenshotCount || 0) || 0
  };
  normalized.keywordFieldTerms = parseKeywordFieldTerms(normalized.keywordField);
  return normalized;
}

function parseKeywordFieldTerms(value) {
  return uniqueStrings(String(value || "")
    .split(",")
    .map((term) => term.trim())
    .filter(Boolean));
}

function metadataImportHasUsefulFields(fields = {}) {
  return Boolean(
    fields.title
    || fields.subtitle
    || fields.keywordField
    || fields.promotionalText
    || fields.description
    || fields.releaseNotes
    || fields.screenshotCount
  );
}

function asoMetadataImportSummary(importRecord = {}) {
  const fields = normalizeAsoMetadataFields(importRecord.fields || {});
  return {
    id: importRecord.id,
    createdAt: importRecord.createdAt,
    sourceName: importRecord.sourceName,
    locale: importRecord.locale || fields.locale || "",
    titleLength: [...(fields.title || "")].length,
    subtitleLength: [...(fields.subtitle || "")].length,
    keywordFieldLength: [...(fields.keywordField || "")].length,
    keywordFieldTerms: fields.keywordFieldTerms.slice(0, 20),
    promotionalTextLength: [...(fields.promotionalText || "")].length,
    descriptionLength: [...(fields.description || "")].length,
    releaseNotesLength: [...(fields.releaseNotes || "")].length,
    screenshotCount: fields.screenshotCount || 0
  };
}

function parseAsoReviewImportRows(payload = {}) {
  const csv = String(payload.csv || payload.reviewsCsv || payload.reviewCsv || "").trim();
  if (csv) {
    const table = parseCsvTable(csv);
    const [headers = [], ...records] = table;
    const normalizedHeaders = headers.map(normalizeColumnKey);
    return records.map((record) => normalizeAsoReviewImportRow(record, normalizedHeaders)).filter(Boolean);
  }
  const reviews = Array.isArray(payload.reviews) ? payload.reviews : [payload.review || payload].filter(Boolean);
  return reviews.map((review) => normalizeAsoReviewImportRow(review)).filter(Boolean);
}

function normalizeAsoReviewImportRow(record, normalizedHeaders = []) {
  const get = (...keys) => reviewImportField(record, normalizedHeaders, keys);
  const rating = Math.max(0, Math.min(5, Number(parseMetricNumber(get("rating", "stars", "score")) || 0)));
  const title = String(get("title", "review title", "subject") || "").trim().slice(0, 180);
  const body = String(get("body", "review", "content", "text", "comment") || "").trim().slice(0, 1200);
  const text = `${title} ${body}`.trim();
  if (!rating && !text) return null;
  const themes = asoReviewThemes(text);
  return {
    rating,
    title,
    body,
    date: String(get("date", "created", "created at", "submitted") || "").trim().slice(0, 40),
    version: String(get("version", "app version") || "").trim().slice(0, 40),
    country: String(get("country", "storefront", "territory") || "").trim().slice(0, 20),
    author: String(get("author", "user", "reviewer") || "").trim().slice(0, 120),
    sentiment: rating && rating <= 2 ? "negative" : rating >= 4 ? "positive" : "neutral",
    themes,
    theme: themes[0]?.key || "general",
    themeLabel: themes[0]?.label || "General feedback"
  };
}

function reviewImportField(record, normalizedHeaders = [], keys = []) {
  if (Array.isArray(record)) {
    for (const key of keys.map(normalizeColumnKey)) {
      const index = normalizedHeaders.indexOf(key);
      if (index >= 0) return record[index];
    }
    return "";
  }
  const entries = Object.entries(record || {});
  for (const key of keys.map(normalizeColumnKey)) {
    const match = entries.find(([field]) => normalizeColumnKey(field) === key);
    if (match) return match[1];
  }
  return "";
}

function asoReviewThemes(text) {
  const value = normalizeKey(text);
  const definitions = [
    { key: "paywall", label: "Paywall timing", action: "delay paywall + clarify unlock", patterns: ["paywall", "pay wall", "unlock", "subscription", "subscribe", "trial", "paid", "money"] },
    { key: "onboarding", label: "Onboarding friction", action: "fix first session before rating prompt", patterns: ["first", "tutorial", "confusing", "start", "too early", "before i could", "cannot play"] },
    { key: "stability", label: "Stability or bugs", action: "ship crash/bug fix before scaling", patterns: ["crash", "bug", "broken", "freeze", "stuck", "doesn't work", "does not work"] },
    { key: "pricing", label: "Pricing objection", action: "clarify value + price framing", patterns: ["expensive", "price", "cost", "refund", "charge"] },
    { key: "ads", label: "Ad experience", action: "reduce interruption frequency", patterns: ["ads", "advert", "commercial", "interruption"] },
    { key: "support", label: "Support issue", action: "respond to reviews + fix help path", patterns: ["support", "contact", "email", "help", "response"] }
  ];
  const matches = definitions.filter((definition) =>
    definition.patterns.some((pattern) => value.includes(normalizeKey(pattern)))
  );
  return matches.length ? matches.slice(0, 3) : [{ key: "general", label: "General feedback", action: "respond to review + inspect session" }];
}

function summarizeAsoReviewRows(rows = []) {
  const usableRows = rows.filter(Boolean);
  const ratingRows = usableRows.filter((row) => Number(row.rating || 0) > 0);
  const ratingTotal = ratingRows.reduce((total, row) => total + Number(row.rating || 0), 0);
  const averageRating = ratingRows.length ? Number((ratingTotal / ratingRows.length).toFixed(2)) : 0;
  const negativeRows = usableRows.filter((row) => row.sentiment === "negative");
  const positiveRows = usableRows.filter((row) => row.sentiment === "positive");
  const neutralRows = usableRows.filter((row) => row.sentiment === "neutral");
  const themeMap = new Map();
  for (const row of negativeRows) {
    for (const theme of row.themes || []) {
      const existing = themeMap.get(theme.key) || { ...theme, count: 0 };
      existing.count += 1;
      themeMap.set(theme.key, existing);
    }
  }
  const topThemes = [...themeMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  return {
    ready: usableRows.length > 0,
    rowCount: usableRows.length,
    averageRating,
    averageRatingLabel: averageRating ? `${averageRating.toFixed(1)} stars` : "n/a",
    negativeCount: negativeRows.length,
    positiveCount: positiveRows.length,
    neutralCount: neutralRows.length,
    negativeShare: usableRows.length ? Number((negativeRows.length / usableRows.length).toFixed(3)) : 0,
    negativeShareLabel: usableRows.length ? percentLabel(negativeRows.length / usableRows.length) : "0.0%",
    topThemes,
    latestNegativeReviews: negativeRows.slice(0, 5).map(asoReviewRowSummary)
  };
}

function asoReviewRowSummary(row = {}) {
  return {
    rating: row.rating || 0,
    title: row.title || "",
    body: row.body ? `${row.body.slice(0, 220)}${row.body.length > 220 ? "..." : ""}` : "",
    date: row.date || "",
    version: row.version || "",
    theme: row.theme || "general",
    themeLabel: row.themeLabel || "General feedback"
  };
}

function asoReviewImportSummary(importRecord = {}) {
  return {
    id: importRecord.id,
    createdAt: importRecord.createdAt,
    sourceName: importRecord.sourceName,
    rowCount: importRecord.rowCount || 0,
    summary: importRecord.summary || summarizeAsoReviewRows(importRecord.rows || [])
  };
}

function latestAsoReviewImport(app = {}) {
  const latest = Array.isArray(app.reviewImports) ? app.reviewImports[0] : null;
  if (!latest) return null;
  return {
    ...latest,
    summary: latest.summary || summarizeAsoReviewRows(latest.rows || [])
  };
}

function summarizeImportedReviews(app = {}) {
  const imports = Array.isArray(app.reviewImports) ? app.reviewImports : [];
  const rows = imports.flatMap((importRecord) => Array.isArray(importRecord.rows) ? importRecord.rows : []);
  return {
    ...summarizeAsoReviewRows(rows),
    importCount: imports.length,
    latest: imports[0] ? asoReviewImportSummary(imports[0]) : null
  };
}

function asoReviewsAudit({ appStore = {}, importedReviews = null, reviewSummary = null }) {
  const summary = reviewSummary || (importedReviews ? importedReviews.summary || summarizeAsoReviewRows(importedReviews.rows || []) : summarizeAsoReviewRows([]));
  const ratingAverage = Number(appStore.ratingAverage || 0) || null;
  const ratingCount = Number(appStore.ratingCount || 0) || null;
  const topThemes = summary.topThemes || [];
  const recommendations = [];
  if (topThemes[0]) {
    recommendations.push({
      priority: topThemes[0].key === "paywall" || topThemes[0].key === "onboarding" ? "critical" : "high",
      title: `Fix ${topThemes[0].label.toLowerCase()}`,
      body: `${topThemes[0].count} imported negative review${topThemes[0].count === 1 ? "" : "s"} mention this theme.`,
      action: topThemes[0].action
    });
  }
  if (ratingAverage && ratingAverage < 3.8 && !recommendations.length) {
    recommendations.push({
      priority: "high",
      title: "Repair visible rating drag",
      body: `Public rating is ${ratingAverage.toFixed(1)} from ${ratingCount || 0} ratings.`,
      action: "product fix + review response"
    });
  }
  return {
    ready: Boolean(summary.ready || ratingAverage),
    source: summary.ready ? "customer-review-import" : "public-rating-only",
    ratingAverage,
    ratingCount,
    import: importedReviews ? asoReviewImportSummary(importedReviews) : null,
    summary,
    topThemes,
    recentNegativeReviews: summary.latestNegativeReviews || [],
    recommendations
  };
}

function latestAsoMetadataImport(app = {}) {
  const latest = Array.isArray(app.metadataImports) ? app.metadataImports[0] : null;
  if (!latest) return null;
  return {
    ...latest,
    fields: normalizeAsoMetadataFields(latest.fields || {})
  };
}

function importedAppleAdsContext(app = {}) {
  const summary = summarizeImportedAppleAds(app);
  const metadataImport = latestAsoMetadataImport(app);
  const reviewImport = latestAsoReviewImport(app);
  const reviewSummary = summarizeImportedReviews(app);
  if (!summary.ready) {
    return {
      appleAdsInsights: { ready: false, keywords: [], searchTerms: [], recommendations: [], access: {} },
      campaigns: [],
      importSummary: summary,
      metadataImport,
      reviewImport,
      reviewSummary
    };
  }
  return {
    appleAdsInsights: importedAppleAdsInsights(app),
    campaigns: importedAppleAdsCampaigns(app, summary),
    importSummary: summary,
    metadataImport,
    reviewImport,
    reviewSummary
  };
}

function summarizeImportedAppleAds(app = {}) {
  const imports = Array.isArray(app.appleAdsImports) ? app.appleAdsImports : [];
  const rows = imports.flatMap((importRecord) => Array.isArray(importRecord.rows) ? importRecord.rows : []);
  const totals = summarizeAdMetricRows(rows);
  const exact = summarizeAdMetricRows(rows.filter((row) => normalizeKey(row.matchType) === "exact"));
  const broad = summarizeAdMetricRows(rows.filter((row) => normalizeKey(row.matchType) === "broad"));
  const noInstallRows = rows
    .filter((row) => Number(row.installs || 0) === 0 && (Number(row.taps || 0) >= 10 || Number(row.spend || 0) >= 7))
    .sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0) || Number(b.taps || 0) - Number(a.taps || 0));
  return {
    ready: imports.length > 0,
    importCount: imports.length,
    latest: imports[0] ? asoAppleAdsImportSummary(imports[0]) : null,
    rowCount: rows.length,
    totals,
    exact,
    broad,
    noInstallRiskCount: noInstallRows.length,
    topNoInstallRisks: noInstallRows.slice(0, 5).map(importedAppleAdsRowSummary)
  };
}

function importedAppleAdsInsights(app = {}) {
  const rows = importedAppleAdsRows(app);
  return {
    ready: rows.length > 0,
    keywords: rows.filter((row) => row.keyword),
    searchTerms: rows.filter((row) => row.searchTerm),
    recommendations: importedAppleAdsRecommendations(rows),
    access: {
      source: "customer-apple-ads-csv",
      importCount: Array.isArray(app.appleAdsImports) ? app.appleAdsImports.length : 0,
      mode: "customer-owned-import"
    }
  };
}

function importedAppleAdsCampaigns(app = {}, summary = summarizeImportedAppleAds(app)) {
  if (!summary.ready) return [];
  return [{
    app: app.name || "",
    name: `${app.name || "App"} Imported Apple Ads`,
    status: "IMPORTED",
    budget: "customer import",
    spend: summary.totals.spendLabel,
    taps: formatNumber(summary.totals.taps),
    installs: formatNumber(summary.totals.installs),
    cpa: summary.totals.cpiLabel
  }];
}

function importedAppleAdsRows(app = {}) {
  return (app.appleAdsImports || [])
    .flatMap((importRecord) => (importRecord.rows || []).map((row) => ({
      ...row,
      app: row.app || app.name || "",
      campaignName: row.campaignName || `${app.name || "App"} Imported Apple Ads`,
      adGroupName: row.adGroupName || "Imported Apple Ads"
    })))
    .slice(0, 2000);
}

function importedAppleAdsRecommendations(rows = []) {
  return rows
    .filter((row) => Number(row.installs || 0) === 0 && (Number(row.taps || 0) >= 10 || Number(row.spend || 0) >= 7))
    .sort((a, b) => Number(b.spend || 0) - Number(a.spend || 0) || Number(b.taps || 0) - Number(a.taps || 0))
    .slice(0, 8)
    .map((row) => ({
      priority: "high",
      term: row.term || row.searchTerm || row.keyword,
      action: normalizeKey(row.matchType) === "broad" ? "lower bid percentage or add negative exact" : "pause or lower bid",
      metric: `${moneyLabel({ amount: Number(row.spend || 0), currency: "USD" })} · ${Number(row.taps || 0)} taps · 0 installs`
    }));
}

function importedAppleAdsRowSummary(row = {}) {
  return {
    term: row.term || row.searchTerm || row.keyword || "",
    keyword: row.keyword || "",
    searchTerm: row.searchTerm || "",
    matchType: row.matchType || "",
    campaignName: row.campaignName || "",
    spend: Number(row.spend || 0),
    spendLabel: moneyLabel({ amount: Number(row.spend || 0), currency: "USD" }),
    taps: Number(row.taps || 0),
    installs: Number(row.installs || 0),
    avgCpt: Number(row.avgCpt || 0),
    avgCptLabel: row.avgCpt ? moneyLabel({ amount: Number(row.avgCpt || 0), currency: "USD" }) : "$0.00",
    status: row.status || "ACTIVE"
  };
}

function normalizeAsoPlan(value) {
  const plans = asoSaasPlans();
  const key = normalizeKey(value || "growth");
  return plans.find((plan) => normalizeKey(plan.name) === key) || plans[1];
}

function asoSaasPlans() {
  return [
    { name: "Rescue", price: "$29/mo", priceIdEnv: "STRIPE_ASO_RESCUE_PRICE_ID", limits: { apps: 1, competitors: 5, keywords: 50, smsAlerts: false, appleAdsImport: false } },
    { name: "Growth", price: "$79/mo", priceIdEnv: "STRIPE_ASO_GROWTH_PRICE_ID", limits: { apps: 5, competitors: 25, keywords: 250, smsAlerts: true, appleAdsImport: true } },
    { name: "Studio", price: "$199/mo", priceIdEnv: "STRIPE_ASO_STUDIO_PRICE_ID", limits: { apps: 25, competitors: 100, keywords: 1000, smsAlerts: true, appleAdsImport: true } }
  ];
}

async function asoSaasCheckoutPayload(plan, email, context = {}) {
  const priceId = process.env[plan.priceIdEnv] || "";
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && priceId);
  const baseUrl = String(process.env.ASO_SAAS_PUBLIC_URL || `http://${context.req?.headers?.host || "127.0.0.1:4177"}`).replace(/\/$/, "");
  if (stripeConfigured) {
    try {
      const params = new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        customer_email: email,
        success_url: `${baseUrl}/?checkout=success&workspaceId=${encodeURIComponent(context.workspaceId || "")}`,
        cancel_url: `${baseUrl}/?checkout=cancelled&workspaceId=${encodeURIComponent(context.workspaceId || "")}`,
        "metadata[workspaceId]": context.workspaceId || "",
        "metadata[appId]": context.appId || "",
        "metadata[country]": context.country || "US",
        client_reference_id: context.workspaceId || "",
        "subscription_data[metadata][workspaceId]": context.workspaceId || "",
        "subscription_data[metadata][appId]": context.appId || ""
      });
      const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          mode: "stripe-error",
          provider: "stripe",
          priceId,
          priceIdEnv: plan.priceIdEnv,
          customerEmail: email,
          checkoutUrl: "",
          message: body?.error?.message || `Stripe Checkout returned ${response.status}.`
        };
      }
      return {
        mode: "stripe-checkout",
        provider: "stripe",
        sessionId: body.id || "",
        priceId,
        priceIdEnv: plan.priceIdEnv,
        customerEmail: email,
        checkoutUrl: body.url || "",
        message: body.url ? "Stripe Checkout Session created." : "Stripe created a session without a hosted URL."
      };
    } catch (error) {
      return {
        mode: "stripe-error",
        provider: "stripe",
        priceId,
        priceIdEnv: plan.priceIdEnv,
        customerEmail: email,
        checkoutUrl: "",
        message: error.message || "Stripe Checkout request failed."
      };
    }
  }
  return {
    mode: "local-trial",
    provider: "stripe",
    priceId,
    priceIdEnv: plan.priceIdEnv,
    customerEmail: email,
    checkoutUrl: "",
    message: `Local trial created. Add STRIPE_SECRET_KEY and ${plan.priceIdEnv} to enable live checkout.`
  };
}

async function asoSaasWorkspacePayload(url) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const updated = await touchAsoWorkspace(workspace, workspaces);
  return {
    ready: true,
    workspace: asoWorkspaceDetail(updated)
  };
}

async function asoSaasHistoryPayload(url) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const updated = await touchAsoWorkspace(workspace, workspaces);
  const selectedApp = selectAsoWorkspaceApp(updated, url.searchParams.get("appId"));
  if (!selectedApp) throw new Error("Workspace has no app configured.");
  return {
    ready: true,
    workspace: asoWorkspaceDetail(updated),
    selectedApp,
    history: asoWorkspaceAppHistoryPayload(selectedApp)
  };
}

async function asoSaasDigestPayload(url) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const updated = await touchAsoWorkspace(workspace, workspaces);
  const selectedApp = selectAsoWorkspaceApp(updated, url.searchParams.get("appId"));
  if (!selectedApp?.appUrl) throw new Error("Workspace has no app configured.");
  const analysis = await analyzeAsoWorkspaceApp(selectedApp, reportDateRange(url));
  const historyResult = appendAsoWorkspaceAppAnalysis(updated, selectedApp, analysis);
  await writeAsoWorkspaces([historyResult.workspace, ...workspaces.filter((item) => item.id !== workspace.id)]);
  const competitorResearch = await asoWorkspaceCompetitorResearch(historyResult.app, { limit: Number(url.searchParams.get("competitorLimit") || 16) });
  return {
    ready: true,
    workspace: asoWorkspaceDetail(historyResult.workspace),
    selectedApp: historyResult.app,
    history: asoWorkspaceAppHistoryPayload(historyResult.app),
    competitorResearch,
    digest: asoSaasDigestFromAnalysis(historyResult.workspace, analysis, historyResult.app),
    analysis
  };
}

async function asoSaasSendDigestPayload(url) {
  const { workspace, workspaces } = await authenticateAsoWorkspace(url);
  const updated = await touchAsoWorkspace(workspace, workspaces);
  const digestUrl = new URL("http://127.0.0.1/api/aso-saas/digest");
  digestUrl.searchParams.set("workspaceId", updated.id);
  digestUrl.searchParams.set("token", url.searchParams.get("token") || "");
  if (url.searchParams.get("appId")) digestUrl.searchParams.set("appId", url.searchParams.get("appId"));
  const digestPayload = await asoSaasDigestPayload(digestUrl);
  const delivery = await deliverAsoSaasDigest(updated, digestPayload.digest, digestPayload.selectedApp);
  return {
    ready: true,
    workspace: digestPayload.workspace,
    selectedApp: digestPayload.selectedApp,
    history: digestPayload.history,
    competitorResearch: digestPayload.competitorResearch,
    digest: digestPayload.digest,
    delivery
  };
}

async function asoSaasMonitorPayload(url, req) {
  authorizeAsoMonitor(url, req);
  const range = reportDateRange(url);
  const sendMode = normalizeMonitorSendMode(url.searchParams.get("send"));
  const workspaceIdFilter = url.searchParams.get("workspaceId") || "";
  const maxApps = Math.max(1, Math.min(Number(url.searchParams.get("maxApps") || 100), 250));
  const workspaces = await readAsoWorkspaces();
  const updatedWorkspaces = [];
  const results = [];
  let scannedApps = 0;

  for (const workspace of workspaces) {
    let updatedWorkspace = workspace;
    const shouldScanWorkspace = !workspaceIdFilter || workspace.id === workspaceIdFilter;
    const status = normalizeKey(workspace.status || "trialing");
    if (shouldScanWorkspace && ["trialing", "active", "past_due"].includes(status)) {
      for (const app of workspace.apps || []) {
        if (scannedApps >= maxApps) break;
        scannedApps += 1;
        try {
          const analysis = await analyzeAsoWorkspaceApp(app, range);
          const historyResult = appendAsoWorkspaceAppAnalysis(updatedWorkspace, app, analysis);
          updatedWorkspace = historyResult.workspace;
          const digest = asoSaasDigestFromAnalysis(updatedWorkspace, analysis, historyResult.app);
          const shouldSend = sendMode === "all" || (sendMode === "alerts" && (digest.alerts || []).length > 0);
          const delivery = shouldSend ? await deliverAsoSaasDigest(updatedWorkspace, digest, historyResult.app) : null;
          results.push({
            workspaceId: workspace.id,
            email: workspace.email,
            appId: historyResult.app.appId,
            appName: historyResult.app.name,
            country: historyResult.app.country,
            ready: Boolean(analysis.ready),
            current: analysis.current,
            snapshot: historyResult.snapshot,
            actionCount: (analysis.actions || []).length,
            alertCount: (digest.alerts || []).length,
            delivery: delivery ? {
              delivered: delivery.delivered,
              queued: delivery.queued,
              storage: delivery.storage,
              channels: (delivery.record?.deliveries || []).map((item) => ({ channel: item.channel, mode: item.mode, status: item.status }))
            } : null,
            errors: analysis.errors || []
          });
        } catch (error) {
          results.push({
            workspaceId: workspace.id,
            email: workspace.email,
            appId: app.appId,
            appName: app.name,
            country: app.country,
            ready: false,
            error: error.message || "Monitor analysis failed."
          });
        }
      }
    }
    updatedWorkspaces.push(updatedWorkspace);
  }

  await writeAsoWorkspaces(updatedWorkspaces);
  return {
    ready: true,
    mode: "workspace-monitor",
    storage: asoStorageStatus(),
    range,
    sendMode,
    workspaceFilter: workspaceIdFilter || "all",
    scannedApps,
    resultCount: results.length,
    results
  };
}

async function analyzeAsoWorkspaceApp(app, range = null) {
  const analysisUrl = new URL("http://127.0.0.1/api/aso-saas");
  analysisUrl.searchParams.set("appUrl", app.appUrl || `https://apps.apple.com/us/app/id${app.appId}`);
  analysisUrl.searchParams.set("country", app.country || "US");
  analysisUrl.searchParams.set("keywords", (app.keywords || []).join(","));
  analysisUrl.searchParams.set("baselineRank", String(app.baselineRank || 60));
  if (range?.startDate) analysisUrl.searchParams.set("startDate", range.startDate);
  if (range?.endDate) analysisUrl.searchParams.set("endDate", range.endDate);
  return asoSaasPayload(analysisUrl, importedAppleAdsContext(app));
}

async function asoWorkspaceCompetitorResearch(app, options = {}) {
  const competitors = (app.competitors || []).slice(0, 8);
  const limit = Math.max(4, Math.min(Number(options.limit || 16), 40));
  if (!competitors.length) {
    return {
      ready: true,
      appId: app.appId,
      appName: app.name,
      country: app.country || "US",
      competitors: [],
      keywordGaps: [],
      actions: []
    };
  }

  const targetApp = { id: app.appId, name: app.name, bundleId: app.bundleId };
  const competitorApps = competitors.map((competitor) => ({
    id: competitor.appId,
    name: competitor.name,
    bundleId: competitor.bundleId
  }));
  const termSources = competitorKeywordSources(competitors, limit);
  const rows = await Promise.all([...termSources.keys()].map((term) =>
    asoKeywordRow(term, app.country || "US", [targetApp, ...competitorApps], { keywords: [], searchTerms: [] })
  ));
  const targetKey = competitorRankKey(targetApp);
  const competitorSummaries = new Map(competitors.map((competitor) => [String(competitor.appId), {
    appId: competitor.appId,
    name: competitor.name,
    bundleId: competitor.bundleId,
    category: competitor.category,
    country: competitor.country || app.country || "US",
    appUrl: competitor.appUrl,
    keywords: competitor.keywords || [],
    gapCount: 0,
    strongestGap: null
  }]));

  const keywordGaps = [];
  for (const row of rows.filter(Boolean)) {
    const sources = termSources.get(row.keyword) || [];
    const targetRank = rankForAsoTarget(row, targetKey);
    const rankedCompetitors = competitors
      .map((competitor) => ({
        competitor,
        rank: rankForAsoTarget(row, competitorRankKey({ id: competitor.appId, bundleId: competitor.bundleId, name: competitor.name }))
      }))
      .filter((item) => Number.isFinite(item.rank))
      .sort((a, b) => a.rank - b.rank);
    const leader = rankedCompetitors[0];
    const action = competitorGapAction(targetRank, leader?.rank, row);
    const gap = {
      keyword: row.keyword,
      action,
      targetRank,
      targetRankLabel: targetRank ? String(targetRank) : ">50",
      competitorRank: leader?.rank || null,
      competitorRankLabel: leader?.rank ? String(leader.rank) : ">50",
      competitorName: leader?.competitor?.name || sources[0]?.name || "Competitor",
      competitorAppId: leader?.competitor?.appId || sources[0]?.appId || "",
      sourceCompetitors: sources.map((source) => ({ appId: source.appId, name: source.name })),
      traffic: row.traffic,
      complexity: row.complexity,
      effectiveness: row.effectiveness,
      effectivenessScore: row.effectivenessScore,
      topApps: row.topApps || [],
      recommendation: competitorGapRecommendation({ keyword: row.keyword, action, targetRank, competitorRank: leader?.rank, competitorName: leader?.competitor?.name })
    };
    if (action !== "ignore") keywordGaps.push(gap);
    if (leader?.competitor && ["gap", "out-ranked", "test-exact"].includes(action)) {
      const summary = competitorSummaries.get(String(leader.competitor.appId));
      if (summary) {
        summary.gapCount += 1;
        if (!summary.strongestGap || gap.effectivenessScore > summary.strongestGap.effectivenessScore) summary.strongestGap = gap;
      }
    }
  }

  const sortedGaps = keywordGaps
    .sort((a, b) => competitorGapPriority(b) - competitorGapPriority(a))
    .slice(0, limit);
  return {
    ready: true,
    appId: app.appId,
    appName: app.name,
    country: app.country || "US",
    competitors: [...competitorSummaries.values()].sort((a, b) => b.gapCount - a.gapCount || a.name.localeCompare(b.name)),
    keywordGaps: sortedGaps,
    actions: sortedGaps.slice(0, 5).map((gap) => ({
      priority: gap.action === "gap" ? "high" : "medium",
      title: `${gap.keyword}: ${gap.action}`,
      action: gap.action === "gap" ? "add to metadata/test exact" : gap.action === "out-ranked" ? "improve metadata relevance" : "watch/defend",
      metric: `${gap.competitorName} #${gap.competitorRankLabel} · you ${gap.targetRankLabel}`
    }))
  };
}

function competitorKeywordSources(competitors, limit) {
  const terms = new Map();
  const add = (term, competitor) => {
    const cleaned = String(term || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < 3) return;
    const sources = terms.get(cleaned) || [];
    if (!sources.some((source) => String(source.appId) === String(competitor.appId))) {
      sources.push({ appId: competitor.appId, name: competitor.name });
    }
    terms.set(cleaned, sources);
  };
  for (const competitor of competitors) {
    const metadataSeeds = defaultAsoSaasKeywords({
      name: competitor.name,
      category: competitor.category,
      primaryGenreName: competitor.category
    });
    for (const term of [...(competitor.keywords || []), ...metadataSeeds]) add(term, competitor);
  }
  return new Map([...terms.entries()].slice(0, limit));
}

function competitorRankKey(app = {}) {
  return {
    id: String(app.id || app.appId || ""),
    bundleId: String(app.bundleId || ""),
    name: normalizeKey(app.name || "")
  };
}

function rankForAsoTarget(row, key) {
  const match = (row.targetMatches || []).find((item) =>
    String(item.appId) === key.id
    || (key.bundleId && String(item.bundleId) === key.bundleId)
    || (key.name && normalizeKey(item.appName) === key.name)
  );
  return match?.rank || null;
}

function competitorGapAction(targetRank, competitorRank, row) {
  if (!competitorRank && targetRank && targetRank <= 10) return "defend";
  if (!competitorRank) return row.effectivenessScore >= 120 ? "test-exact" : "ignore";
  if (!targetRank) return "gap";
  if (competitorRank + 4 < targetRank) return "out-ranked";
  if (targetRank <= competitorRank) return "defend";
  return row.effectivenessScore >= 140 ? "test-exact" : "ignore";
}

function competitorGapRecommendation({ keyword, action, targetRank, competitorRank, competitorName }) {
  if (action === "gap") return `${competitorName || "A competitor"} ranks #${competitorRank} for ${keyword} while your app is outside the top 50. Test exact match, then add it to metadata if paid conversion is clean.`;
  if (action === "out-ranked") return `${competitorName || "A competitor"} is ahead on ${keyword}. Improve subtitle/keyword-field relevance and compare screenshots for that intent.`;
  if (action === "defend") return `${keyword} is already covered. Keep monitoring and protect exact-match ads if it converts.`;
  if (action === "test-exact") return `${keyword} has enough search-result signal to run a small exact-match validation before changing metadata.`;
  return `${keyword} does not need action yet.`;
}

function competitorGapPriority(gap) {
  const actionWeight = { gap: 400, "out-ranked": 300, "test-exact": 180, defend: 80 };
  const rankWeight = gap.competitorRank ? Math.max(0, 60 - gap.competitorRank) : 0;
  return (actionWeight[gap.action] || 0) + Number(gap.effectivenessScore || 0) + rankWeight;
}

function appendAsoWorkspaceAppAnalysis(workspace, selectedApp, analysis) {
  const appId = String(selectedApp.appId || analysis.app?.appId || "");
  const country = String(selectedApp.country || analysis.app?.country || "US");
  const apps = workspace.apps || [];
  const existingApp = apps.find((app) => String(app.appId) === appId && String(app.country || "US") === country) || selectedApp;
  const existingHistory = Array.isArray(existingApp.history) ? existingApp.history : [];
  const snapshot = asoWorkspaceHistorySnapshot(analysis, existingApp, existingHistory);
  const updatedApp = {
    ...existingApp,
    name: analysis.app?.name || existingApp.name || `App ${appId}`,
    bundleId: analysis.app?.bundleId || existingApp.bundleId || "",
    category: analysis.app?.category || existingApp.category || "",
    updatedAt: snapshot.timestamp,
    lastSnapshot: snapshot,
    history: [snapshot, ...existingHistory].slice(0, 180)
  };
  const nextApps = apps.map((app) =>
    String(app.appId) === appId && String(app.country || "US") === country ? updatedApp : app
  );
  const workspaceHasApp = nextApps.some((app) => String(app.appId) === appId && String(app.country || "US") === country);
  return {
    workspace: {
      ...workspace,
      updatedAt: snapshot.timestamp,
      apps: workspaceHasApp ? nextApps : [updatedApp, ...nextApps]
    },
    app: updatedApp,
    snapshot
  };
}

function asoWorkspaceHistorySnapshot(analysis, app, existingHistory = []) {
  const current = analysis.current || {};
  const keywords = analysis.keywords?.rows || [];
  const actions = analysis.actions || [];
  const previous = existingHistory[0] || null;
  const categoryRank = numberOrNull(current.categoryRank);
  const ratingAverage = numberOrNull(current.ratingAverage);
  const ratingCount = numberOrNull(current.ratingCount);
  return {
    id: `snap_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    timestamp: analysis.updatedAt || new Date().toISOString(),
    date: analysis.range?.endDate || new Date().toISOString().slice(0, 10),
    appId: String(analysis.app?.appId || app.appId || ""),
    appName: analysis.app?.name || app.name || "",
    country: analysis.app?.country || app.country || "US",
    category: current.category || analysis.app?.category || app.category || "",
    categoryRank,
    rankLabel: current.rankLabel || "unavailable",
    rankDeltaLatest: rankDelta(categoryRank, previous?.categoryRank),
    ratingAverage,
    ratingCount,
    ratingDeltaLatest: valueDelta(ratingCount, previous?.ratingCount),
    trackedKeywords: numberOrZero(current.trackedKeywords),
    rankedKeywords: numberOrZero(current.rankedKeywords),
    unrankedOpportunities: numberOrZero(current.unrankedOpportunities),
    actionCount: actions.length,
    urgentActionCount: actions.filter((action) => ["critical", "high"].includes(action.priority)).length,
    competitorCount: (analysis.competitors || []).length,
    installs: numberOrZero(analysis.ads?.total?.installs),
    spend: numberOrZero(analysis.ads?.total?.spend),
    exactSpend: numberOrZero(analysis.ads?.exact?.spend),
    broadSpend: numberOrZero(analysis.ads?.broad?.spend),
    topKeywordRanks: keywords.slice(0, 8).map((row) => ({
      keyword: row.keyword,
      rank: row.rank || null,
      rankLabel: row.rankLabel || ">50",
      action: row.action || "watch",
      effectiveness: row.effectiveness || ""
    })),
    topActions: actions.slice(0, 5).map((action) => ({
      priority: action.priority,
      title: action.title,
      action: action.action
    }))
  };
}

function asoWorkspaceAppHistoryPayload(app = {}) {
  const history = sortAsoHistory(Array.isArray(app.history) ? app.history : []);
  const trend = asoWorkspaceHistoryTrend(history);
  return {
    count: history.length,
    latest: history[0] || null,
    previous: history[1] || null,
    recent: history.slice(0, 30),
    trend
  };
}

function sortAsoHistory(history = []) {
  return [...history].sort((a, b) => asoHistoryTime(b) - asoHistoryTime(a));
}

function asoHistoryTime(row = {}) {
  const value = row.timestamp || (row.date ? `${row.date}T00:00:00Z` : "");
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

function asoHistoryBaseline(history = [], latest = null, days = 7) {
  if (!latest) return null;
  const latestTime = asoHistoryTime(latest);
  if (!latestTime) return null;
  const targetTime = latestTime - days * 24 * 60 * 60 * 1000;
  return history.find((row) => row !== latest && asoHistoryTime(row) <= targetTime) || null;
}

function asoWorkspaceHistoryTrend(history = []) {
  const latest = history[0] || null;
  const previous = history[1] || null;
  const sevenDay = asoHistoryBaseline(history, latest, 7);
  const thirtyDay = asoHistoryBaseline(history, latest, 30);
  const rankDeltaLatest = rankDelta(latest?.categoryRank, previous?.categoryRank);
  const rankDelta7d = rankDelta(latest?.categoryRank, sevenDay?.categoryRank);
  const rankDelta30d = rankDelta(latest?.categoryRank, thirtyDay?.categoryRank);
  const ratingDeltaLatest = valueDelta(latest?.ratingCount, previous?.ratingCount);
  const ratingDelta7d = valueDelta(latest?.ratingCount, sevenDay?.ratingCount);
  const ratingDelta30d = valueDelta(latest?.ratingCount, thirtyDay?.ratingCount);
  return {
    ready: Boolean(latest),
    latestAt: latest?.timestamp || null,
    previousAt: previous?.timestamp || null,
    sevenDayBaselineAt: sevenDay?.timestamp || null,
    thirtyDayBaselineAt: thirtyDay?.timestamp || null,
    rankDeltaLatest,
    rankDeltaLatestLabel: formatRankDelta(rankDeltaLatest) || "flat",
    rankDelta7d,
    rankDelta7dLabel: sevenDay ? (formatRankDelta(rankDelta7d) || "flat") : "collecting",
    rankDelta30d,
    rankDelta30dLabel: thirtyDay ? (formatRankDelta(rankDelta30d) || "flat") : "collecting",
    ratingDeltaLatest,
    ratingDeltaLatestLabel: formatRatingDelta(ratingDeltaLatest) || "flat",
    ratingDelta7d,
    ratingDelta7dLabel: sevenDay ? (formatRatingDelta(ratingDelta7d) || "flat") : "collecting",
    ratingDelta30d,
    ratingDelta30dLabel: thirtyDay ? (formatRatingDelta(ratingDelta30d) || "flat") : "collecting",
    actionDelta7d: valueDelta(latest?.actionCount, sevenDay?.actionCount),
    actionDelta30d: valueDelta(latest?.actionCount, thirtyDay?.actionCount),
    urgentActionDelta7d: valueDelta(latest?.urgentActionCount, sevenDay?.urgentActionCount),
    urgentActionDelta30d: valueDelta(latest?.urgentActionCount, thirtyDay?.urgentActionCount),
    keywordDeltas: asoKeywordHistoryDeltas(latest, sevenDay, thirtyDay)
  };
}

function asoKeywordHistoryDeltas(latest = null, sevenDay = null, thirtyDay = null) {
  const latestRows = Array.isArray(latest?.topKeywordRanks) ? latest.topKeywordRanks : [];
  const sevenDayRanks = asoKeywordRankMap(sevenDay);
  const thirtyDayRanks = asoKeywordRankMap(thirtyDay);
  return latestRows.slice(0, 8).map((row) => {
    const key = normalizeKey(row.keyword);
    const sevenDayRow = sevenDayRanks.get(key) || null;
    const thirtyDayRow = thirtyDayRanks.get(key) || null;
    const delta7d = rankDelta(row.rank, sevenDayRow?.rank);
    const delta30d = rankDelta(row.rank, thirtyDayRow?.rank);
    return {
      keyword: row.keyword || "",
      rank: row.rank || null,
      rankLabel: row.rankLabel || ">50",
      action: row.action || "watch",
      effectiveness: row.effectiveness || "",
      rank7d: sevenDayRow?.rank || null,
      rank30d: thirtyDayRow?.rank || null,
      delta7d,
      delta7dLabel: sevenDayRow ? (formatRankDelta(delta7d) || "flat") : "collecting",
      delta30d,
      delta30dLabel: thirtyDayRow ? (formatRankDelta(delta30d) || "flat") : "collecting"
    };
  });
}

function asoKeywordRankMap(snapshot = null) {
  const rows = Array.isArray(snapshot?.topKeywordRanks) ? snapshot.topKeywordRanks : [];
  return new Map(rows.map((row) => [normalizeKey(row.keyword), row]).filter(([key]) => key));
}

function authorizeAsoMonitor(url, req) {
  const required = process.env.ASO_MONITOR_ADMIN_TOKEN || "";
  if (!required) return { mode: "local-unprotected" };
  const authorization = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const provided = url.searchParams.get("token") || authorization;
  if (!safeEqualText(required, provided)) throw new Error("Monitor token is invalid.");
  return { mode: "token" };
}

function normalizeMonitorSendMode(value) {
  const mode = normalizeKey(value || "none");
  return ["none", "alerts", "all"].includes(mode) ? mode : "none";
}

function rankDelta(current, previous) {
  const next = numberOrNull(current);
  const prior = numberOrNull(previous);
  return next && prior ? next - prior : null;
}

function valueDelta(current, previous) {
  const next = numberOrNull(current);
  const prior = numberOrNull(previous);
  return next !== null && prior !== null ? Number((next - prior).toFixed(2)) : null;
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function numberOrZero(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeEqualText(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

async function asoSaasStripeWebhookPayload(req) {
  const rawBody = await readRawBody(req, 1_000_000);
  const verification = verifyStripeWebhook(rawBody, req.headers["stripe-signature"]);
  const event = JSON.parse(rawBody || "{}");
  const object = event.data?.object || {};
  const workspaceId = object.metadata?.workspaceId
    || object.subscription_details?.metadata?.workspaceId
    || object.client_reference_id
    || "";
  if (!workspaceId) {
    return { received: true, verified: verification.verified, mode: verification.mode, warning: "No workspaceId metadata found." };
  }
  const workspaces = await readAsoWorkspaces();
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) {
    return { received: true, verified: verification.verified, mode: verification.mode, warning: `Workspace ${workspaceId} was not found.` };
  }
  const status = stripeWorkspaceStatus(event.type, object.status);
  const updated = {
    ...workspace,
    status,
    updatedAt: new Date().toISOString(),
    stripe: {
      ...(workspace.stripe || {}),
      customerId: object.customer || workspace.stripe?.customerId || "",
      subscriptionId: object.subscription || object.id || workspace.stripe?.subscriptionId || "",
      checkoutSessionId: event.type === "checkout.session.completed" ? object.id || "" : workspace.stripe?.checkoutSessionId || "",
      currentPeriodEnd: object.current_period_end ? new Date(Number(object.current_period_end) * 1000).toISOString() : workspace.stripe?.currentPeriodEnd || "",
      lastEventId: event.id || "",
      lastEventType: event.type || "",
      lastEventAt: new Date().toISOString()
    }
  };
  await writeAsoWorkspaces([updated, ...workspaces.filter((item) => item.id !== workspace.id)]);
  return {
    received: true,
    verified: verification.verified,
    mode: verification.mode,
    workspace: asoWorkspaceDetail(updated)
  };
}

function issueAsoWorkspaceAccess(workspaceId, req) {
  const token = `${randomUUID().replace(/-/g, "")}${randomUUID().replace(/-/g, "")}`;
  const baseUrl = String(process.env.ASO_SAAS_PUBLIC_URL || `http://${req?.headers?.host || "127.0.0.1:4177"}`).replace(/\/$/, "");
  return {
    workspaceId,
    token,
    url: `${baseUrl}/aso-saas.html?workspaceId=${encodeURIComponent(workspaceId)}&token=${encodeURIComponent(token)}`,
    issuedAt: new Date().toISOString()
  };
}

function hashAsoAccessToken(token) {
  return createHash("sha256").update(String(token || "")).digest("hex");
}

async function authenticateAsoWorkspace(url) {
  const workspaceId = url.searchParams.get("workspaceId") || "";
  const token = url.searchParams.get("token") || "";
  const workspaces = await readAsoWorkspaces();
  const workspace = workspaces.find((item) => item.id === workspaceId);
  if (!workspace) throw new Error("Workspace not found.");
  const expected = workspace.access?.tokenHash || "";
  if (!expected || !safeEqualHex(expected, hashAsoAccessToken(token))) throw new Error("Workspace access token is invalid.");
  return { workspace, workspaces };
}

async function touchAsoWorkspace(workspace, workspaces) {
  const updated = {
    ...workspace,
    access: {
      ...(workspace.access || {}),
      lastSeenAt: new Date().toISOString()
    }
  };
  await writeAsoWorkspaces([updated, ...workspaces.filter((item) => item.id !== workspace.id)]);
  return updated;
}

function safeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

function asoWorkspaceDetail(workspace) {
  return {
    ...asoWorkspaceSummary(workspace),
    updatedAt: workspace.updatedAt,
    limits: workspace.limits,
    apps: (workspace.apps || []).map(asoWorkspaceAppDetail),
    onboarding: workspace.onboarding || [],
    connections: upsertAsoCustomerConnection(workspace.connections || []),
    stripe: workspace.stripe || {},
    notifications: workspace.notifications || {
      email: workspace.email,
      phone: "",
      emailEnabled: true,
      smsEnabled: false
    },
    checkout: workspace.checkout ? {
      mode: workspace.checkout.mode,
      provider: workspace.checkout.provider,
      priceIdEnv: workspace.checkout.priceIdEnv,
      checkoutUrl: workspace.checkout.checkoutUrl || "",
      message: workspace.checkout.message || ""
    } : null,
    access: {
      issuedAt: workspace.access?.issuedAt || "",
      lastSeenAt: workspace.access?.lastSeenAt || ""
    }
  };
}

function asoWorkspaceAppDetail(app = {}) {
  return {
    ...app,
    historySummary: asoWorkspaceAppHistoryPayload(app),
    metadataImports: (app.metadataImports || []).map(asoMetadataImportSummary),
    metadataImportSummary: app.metadataImports?.[0] ? asoMetadataImportSummary(app.metadataImports[0]) : null,
    reviewImports: (app.reviewImports || []).map(asoReviewImportSummary),
    reviewImportSummary: app.reviewImports?.[0] ? asoReviewImportSummary(app.reviewImports[0]) : null,
    appleAdsImports: (app.appleAdsImports || []).map(asoAppleAdsImportSummary),
    appleAdsImportSummary: summarizeImportedAppleAds(app)
  };
}

function selectAsoWorkspaceApp(workspace, appId) {
  const apps = workspace.apps || [];
  if (!apps.length) return null;
  return apps.find((app) => String(app.appId) === String(appId)) || apps[0];
}

function asoSaasDigestFromAnalysis(workspace, analysis, selectedApp = null) {
  const current = analysis.current || {};
  const app = analysis.app || {};
  const actions = analysis.actions || [];
  const critical = actions.filter((action) => ["critical", "high"].includes(action.priority));
  const protectedKeywords = analysis.keywords?.protected || [];
  const opportunities = analysis.keywords?.opportunities || [];
  const history = asoWorkspaceAppHistoryPayload(selectedApp || {});
  const latest = history.latest || {};
  const trend = history.trend || {};
  const rankDeltaText = formatRankDelta(latest.rankDeltaLatest);
  const ratingDeltaText = formatRatingDelta(latest.ratingDeltaLatest);
  const sevenDayText = trend.rankDelta7dLabel && trend.rankDelta7dLabel !== "collecting" ? `7d ${trend.rankDelta7dLabel}` : "";
  const thirtyDayText = trend.rankDelta30dLabel && trend.rankDelta30dLabel !== "collecting" ? `30d ${trend.rankDelta30dLabel}` : "";
  const subject = `${app.name || "App"} Rank Rescue: ${current.rankLabel || "rank unavailable"} ${current.ratingAverage ? `· ${Number(current.ratingAverage).toFixed(1)} stars` : ""}`;
  const summary = [
    `${app.name || "App"} is ${current.rankLabel || "rank unavailable"} in ${current.category || "App Store"}.`,
    current.ratingAverage ? `Visible rating is ${Number(current.ratingAverage).toFixed(1)} from ${current.ratingCount || 0} ratings.` : "Visible rating is unavailable.",
    `${actions.length} actions are queued; ${critical.length} are urgent.`
  ].concat(rankDeltaText || ratingDeltaText ? [`Latest monitor movement: ${[rankDeltaText, ratingDeltaText].filter(Boolean).join("; ")}.`] : [])
    .concat(sevenDayText || thirtyDayText ? [`Trend window: ${[sevenDayText, thirtyDayText].filter(Boolean).join("; ")}.`] : []);
  const nextSteps = actions.slice(0, 5).map((action) => ({
    priority: action.priority,
    title: action.title,
    action: action.action,
    metric: action.metric
  }));
  const smsBody = [
    app.name || "App",
    current.rankLabel || "rank n/a",
    current.ratingAverage ? `${Number(current.ratingAverage).toFixed(1)} stars` : "rating n/a",
    nextSteps[0]?.action || "review action queue"
  ].join(" · ").slice(0, 240);
  return {
    generatedAt: new Date().toISOString(),
    workspaceId: workspace.id,
    appId: selectedApp?.appId || app.appId || "",
    subject,
    summary,
    alerts: critical,
    nextSteps,
    history,
    protectedKeywords: protectedKeywords.slice(0, 5),
    keywordOpportunities: opportunities.slice(0, 8),
    smsBody,
    emailBody: `${subject}\n\n${summary.join("\n")}\n\nNext steps:\n${nextSteps.map((step) => `- ${step.title}: ${step.action}`).join("\n")}`
  };
}

function formatRankDelta(delta) {
  if (!Number.isFinite(Number(delta)) || Number(delta) === 0) return "";
  const value = Number(delta);
  return value > 0 ? `rank worsened ${value} spots` : `rank improved ${Math.abs(value)} spots`;
}

function formatRatingDelta(delta) {
  if (!Number.isFinite(Number(delta)) || Number(delta) === 0) return "";
  const value = Number(delta);
  return value > 0 ? `ratings +${value}` : `ratings ${value}`;
}

function verifyStripeWebhook(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret) return { verified: false, mode: "local-unverified" };
  const header = String(signatureHeader || "");
  const timestamp = header.split(",").find((part) => part.startsWith("t="))?.slice(2);
  const signature = header.split(",").find((part) => part.startsWith("v1="))?.slice(3);
  if (!timestamp || !signature) throw new Error("Stripe signature header is missing timestamp or v1 signature.");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  if (!safeEqualHex(expected, signature)) throw new Error("Stripe webhook signature verification failed.");
  return { verified: true, mode: "stripe-signed" };
}

function stripeWorkspaceStatus(eventType, stripeStatus) {
  if (eventType === "checkout.session.completed") return "active";
  if (eventType === "customer.subscription.deleted") return "canceled";
  if (stripeStatus === "trialing") return "trialing";
  if (stripeStatus === "active") return "active";
  if (stripeStatus === "past_due") return "past_due";
  if (stripeStatus === "canceled" || stripeStatus === "cancelled") return "canceled";
  return stripeStatus || "active";
}

async function deliverAsoSaasDigest(workspace, digest, selectedApp = null) {
  const notifications = workspace.notifications || {};
  const emailTo = notifications.email || workspace.email || "";
  const phoneTo = notifications.phone || "";
  const deliveries = [];
  if (notifications.emailEnabled !== false && emailTo) {
    deliveries.push(await deliverAsoEmail({ to: emailTo, digest, workspace }));
  }
  if (notifications.smsEnabled && phoneTo) {
    deliveries.push(await deliverAsoSms({ to: phoneTo, digest, workspace }));
  }
  if (!deliveries.length) {
    deliveries.push({ channel: "none", mode: "skipped", status: "skipped", message: "No alert destination is enabled." });
  }
  const record = {
    id: `notif_${randomUUID().replace(/-/g, "").slice(0, 16)}`,
    createdAt: new Date().toISOString(),
    workspaceId: workspace.id,
    appId: selectedApp?.appId || workspace.apps?.[0]?.appId || "",
    subject: digest.subject,
    emailBody: digest.emailBody,
    smsBody: digest.smsBody,
    deliveries
  };
  const storage = await appendAsoNotification(record);
  return {
    outboxPath: asoNotificationOutboxPath,
    storage,
    record,
    delivered: deliveries.some((delivery) => delivery.status === "sent"),
    queued: deliveries.some((delivery) => delivery.status === "queued")
  };
}

async function deliverAsoEmail({ to, digest, workspace }) {
  const apiKey = process.env.RESEND_API_KEY || "";
  const from = process.env.ASO_ALERT_FROM_EMAIL || "Rank Rescue <alerts@rankrescue.local>";
  if (!apiKey) {
    return {
      channel: "email",
      mode: "local-outbox",
      status: "queued",
      to,
      message: "Set RESEND_API_KEY and ASO_ALERT_FROM_EMAIL to send live email."
    };
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to,
        subject: digest.subject,
        text: digest.emailBody,
        tags: [
          { name: "workspaceId", value: workspace.id },
          { name: "product", value: "rank-rescue-aso" }
        ]
      })
    });
    const body = await response.json().catch(() => ({}));
    return {
      channel: "email",
      mode: "resend",
      status: response.ok ? "sent" : "failed",
      to,
      providerId: body.id || "",
      message: response.ok ? "Email sent through Resend." : body?.message || `Resend returned ${response.status}.`
    };
  } catch (error) {
    return { channel: "email", mode: "resend", status: "failed", to, message: error.message };
  }
}

async function deliverAsoSms({ to, digest }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
  const authToken = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  if (!accountSid || !authToken || !from) {
    return {
      channel: "sms",
      mode: "local-outbox",
      status: "queued",
      to,
      message: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER to send live SMS."
    };
  }
  try {
    const params = new URLSearchParams({
      From: from,
      To: to,
      Body: digest.smsBody
    });
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params
    });
    const body = await response.json().catch(() => ({}));
    return {
      channel: "sms",
      mode: "twilio",
      status: response.ok ? "sent" : "failed",
      to,
      providerId: body.sid || "",
      message: response.ok ? "SMS sent through Twilio." : body?.message || `Twilio returned ${response.status}.`
    };
  } catch (error) {
    return { channel: "sms", mode: "twilio", status: "failed", to, message: error.message };
  }
}

async function appendAsoNotification(record) {
  try {
    if (isAsoSupabaseConfigured()) {
      await upsertAsoSupabaseRows(asoSupabaseNotificationsTable, [{
        id: record.id,
        workspace_id: record.workspaceId || "",
        created_at: record.createdAt || new Date().toISOString(),
        payload: record
      }]);
      return { mode: "supabase", path: asoSupabaseNotificationsTable };
    }
  } catch (error) {
    console.warn(`Supabase notification write failed, falling back to local outbox: ${error.message}`);
  }
  appendLocalAsoNotification(record);
  return { mode: "local-json", path: asoNotificationOutboxPath };
}

function appendLocalAsoNotification(record) {
  mkdirSync(dataDir, { recursive: true });
  const notifications = readLocalAsoNotifications();
  writeFileSync(asoNotificationOutboxPath, JSON.stringify({ notifications: [record, ...notifications].slice(0, 500) }, null, 2));
}

function readLocalAsoNotifications() {
  try {
    if (!existsSync(asoNotificationOutboxPath)) return [];
    const parsed = JSON.parse(readFileSync(asoNotificationOutboxPath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.notifications) ? parsed.notifications : [];
  } catch {
    return [];
  }
}

function normalizePhoneNumber(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const digits = raw.replace(/[^0-9]/g, "");
  const prefixed = raw.startsWith("+") ? `+${digits}` : `+${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(prefixed) ? prefixed : "";
}

async function asoSaasWorkspacesPayload() {
  const workspaces = await readAsoWorkspaces();
  const storage = asoStorageStatus();
  return {
    ready: true,
    storage,
    launchReadiness: asoSaasLaunchReadiness(storage),
    path: storage.configured ? storage.workspacesTable : asoWorkspacesPath,
    count: workspaces.length,
    workspaces: workspaces.map(asoWorkspaceSummary)
  };
}

async function asoSaasReadinessPayload() {
  const storage = asoStorageStatus();
  return {
    ready: true,
    storage,
    launchReadiness: asoSaasLaunchReadiness(storage)
  };
}

function asoSaasLaunchReadiness(storage = asoStorageStatus()) {
  const publicUrl = String(process.env.ASO_SAAS_PUBLIC_URL || "").trim();
  const stripePlans = asoSaasPlans().map((plan) => ({
    plan: plan.name,
    priceIdEnv: plan.priceIdEnv,
    configured: Boolean(process.env[plan.priceIdEnv])
  }));
  const stripePriceCount = stripePlans.filter((plan) => plan.configured).length;
  const checks = [
    {
      key: "public-https-url",
      label: "Public HTTPS URL",
      ready: /^https:\/\//i.test(publicUrl),
      required: true,
      detail: publicUrl || "Set ASO_SAAS_PUBLIC_URL before sending customers to checkout links."
    },
    {
      key: "production-storage",
      label: "Production storage",
      ready: Boolean(storage.configured),
      required: true,
      detail: storage.configured ? `Supabase tables ${storage.workspacesTable}, ${storage.notificationsTable}` : `Using local JSON at ${storage.localWorkspacePath}`
    },
    {
      key: "stripe-checkout",
      label: "Stripe Checkout",
      ready: Boolean(process.env.STRIPE_SECRET_KEY && stripePriceCount >= 3),
      required: true,
      detail: `${stripePriceCount}/3 plan prices configured`
    },
    {
      key: "stripe-webhook",
      label: "Stripe webhook",
      ready: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      required: true,
      detail: "Required to move workspaces from trialing to active/past_due/canceled."
    },
    {
      key: "email-digests",
      label: "Email digests",
      ready: Boolean(process.env.RESEND_API_KEY && process.env.ASO_ALERT_FROM_EMAIL),
      required: true,
      detail: process.env.ASO_ALERT_FROM_EMAIL ? `From ${process.env.ASO_ALERT_FROM_EMAIL}` : "Set RESEND_API_KEY and ASO_ALERT_FROM_EMAIL."
    },
    {
      key: "sms-alerts",
      label: "SMS alerts",
      ready: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
      required: false,
      detail: "Optional for Rescue, expected for Growth and Studio alerting."
    },
    {
      key: "monitor-token",
      label: "Monitor token",
      ready: Boolean(process.env.ASO_MONITOR_ADMIN_TOKEN),
      required: true,
      detail: "Protects hosted /api/aso-saas/monitor runs."
    },
    {
      key: "safe-data-path",
      label: "Safe data path",
      ready: true,
      required: true,
      detail: "Uses public App Store/iTunes data plus customer-owned imports, not private Appfigures or Astro APIs."
    }
  ];
  const requiredChecks = checks.filter((check) => check.required);
  const readyRequired = requiredChecks.filter((check) => check.ready).length;
  return {
    ready: readyRequired === requiredChecks.length,
    mode: readyRequired === requiredChecks.length ? "production-ready" : "setup-required",
    readyRequired,
    requiredCount: requiredChecks.length,
    readyCount: checks.filter((check) => check.ready).length,
    checkCount: checks.length,
    missingRequired: requiredChecks.filter((check) => !check.ready).map((check) => check.key),
    stripePlans,
    checks
  };
}

function asoWorkspaceSummary(workspace) {
  const firstApp = workspace.apps?.[0] || {};
  return {
    id: workspace.id,
    email: workspace.email,
    company: workspace.company,
    plan: workspace.plan,
    status: workspace.status,
    createdAt: workspace.createdAt,
    trialEndsAt: workspace.trialEndsAt,
    appCount: (workspace.apps || []).length,
    appId: firstApp.appId,
    appName: firstApp.name,
    appUrl: firstApp.appUrl,
    country: firstApp.country,
    keywords: firstApp.keywords || [],
    checkoutMode: workspace.checkout?.mode || "local-trial"
  };
}

async function readAsoWorkspaces() {
  try {
    if (isAsoSupabaseConfigured()) return await readAsoSupabaseWorkspaces();
  } catch (error) {
    console.warn(`Supabase workspace read failed, falling back to local JSON: ${error.message}`);
  }
  return readLocalAsoWorkspaces();
}

function readLocalAsoWorkspaces() {
  try {
    if (!existsSync(asoWorkspacesPath)) return [];
    const parsed = JSON.parse(readFileSync(asoWorkspacesPath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.workspaces) ? parsed.workspaces : [];
  } catch {
    return [];
  }
}

async function writeAsoWorkspaces(workspaces) {
  try {
    if (isAsoSupabaseConfigured()) {
      await writeAsoSupabaseWorkspaces(workspaces);
      return { mode: "supabase", path: asoSupabaseWorkspacesTable };
    }
  } catch (error) {
    console.warn(`Supabase workspace write failed, falling back to local JSON: ${error.message}`);
  }
  writeLocalAsoWorkspaces(workspaces);
  return { mode: "local-json", path: asoWorkspacesPath };
}

function writeLocalAsoWorkspaces(workspaces) {
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(asoWorkspacesPath, JSON.stringify({ workspaces }, null, 2));
}

function isAsoSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function asoStorageStatus() {
  const configured = isAsoSupabaseConfigured();
  return {
    mode: configured ? "supabase" : "local-json",
    configured,
    workspacesTable: configured ? asoSupabaseWorkspacesTable : "",
    notificationsTable: configured ? asoSupabaseNotificationsTable : "",
    localWorkspacePath: asoWorkspacesPath,
    localNotificationOutboxPath: asoNotificationOutboxPath,
    missingEnv: [
      process.env.SUPABASE_URL ? "" : "SUPABASE_URL",
      process.env.SUPABASE_SERVICE_ROLE_KEY ? "" : "SUPABASE_SERVICE_ROLE_KEY"
    ].filter(Boolean)
  };
}

async function readAsoSupabaseWorkspaces() {
  const url = asoSupabaseRestUrl(asoSupabaseWorkspacesTable);
  url.searchParams.set("select", "payload");
  url.searchParams.set("order", "updated_at.desc");
  const response = await fetch(url, { headers: asoSupabaseHeaders() });
  const body = await parseSupabaseResponse(response);
  if (!Array.isArray(body)) throw new Error("Supabase workspace response was not an array.");
  return body
    .map((row) => row.payload)
    .filter((workspace) => workspace && typeof workspace === "object");
}

async function writeAsoSupabaseWorkspaces(workspaces) {
  const rows = (workspaces || []).map((workspace) => ({
    id: workspace.id,
    email: workspace.email || "",
    updated_at: workspace.updatedAt || new Date().toISOString(),
    payload: workspace
  })).filter((row) => row.id);
  if (!rows.length) return;
  await upsertAsoSupabaseRows(asoSupabaseWorkspacesTable, rows);
}

async function upsertAsoSupabaseRows(tableName, rows) {
  const url = asoSupabaseRestUrl(tableName);
  url.searchParams.set("on_conflict", "id");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...asoSupabaseHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Supabase upsert returned ${response.status}: ${text.slice(0, 200)}`);
  }
}

function asoSupabaseRestUrl(tableName) {
  const safeTable = safeAsoSupabaseTable(tableName);
  const baseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("SUPABASE_URL is missing.");
  return new URL(`/rest/v1/${safeTable}`, `${baseUrl}/`);
}

function safeAsoSupabaseTable(tableName) {
  const table = String(tableName || "").trim();
  if (!/^[a-zA-Z0-9_]+$/.test(table)) throw new Error(`Unsafe Supabase table name: ${table}`);
  return table;
}

function asoSupabaseHeaders() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`
  };
}

async function parseSupabaseResponse(response) {
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    throw new Error(`Supabase request returned ${response.status}: ${String(text || "").slice(0, 200)}`);
  }
  return body;
}

function asoSaasDataSources({ appStore, ads }) {
  const storage = asoStorageStatus();
  return [
    { name: "Public App Store page", status: appStore.ready ? "ready" : "partial", detail: "Visible chart rank, rating, category, version, price, and store URL when Apple exposes them." },
    { name: "iTunes Lookup/Search", status: appStore.lookupReady ? "ready" : "partial", detail: "Metadata, rating count fallback, keyword result ordering, and organic competitor snapshots." },
    { name: "Apple Ads", status: ads.ready ? "ready" : "optional", detail: "Owned-app campaign, keyword, and search-term correlation when the customer connects Apple Ads credentials or imports a customer-owned CSV." },
    { name: "Customer workspace storage", status: storage.configured ? "ready" : "local", detail: storage.configured ? `Supabase REST tables ${storage.workspacesTable}, ${storage.notificationsTable}` : storage.localWorkspacePath },
    { name: "Local prospect history", status: "ready", detail: asoProspectHistoryPath }
  ];
}

function readAsoProspectHistory() {
  try {
    if (!existsSync(asoProspectHistoryPath)) return [];
    const parsed = JSON.parse(readFileSync(asoProspectHistoryPath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
  } catch {
    return [];
  }
}

function appendAsoProspectHistory(snapshot) {
  mkdirSync(dataDir, { recursive: true });
  const snapshots = [snapshot, ...readAsoProspectHistory()];
  writeFileSync(asoProspectHistoryPath, JSON.stringify({ snapshots }, null, 2));
  return snapshots;
}

async function rankRescuePayload(url) {
  const range = reportDateRange(url);
  const appUrl = url.searchParams.get("appUrl") || url.searchParams.get("url") || "";
  const appId = parseAppStoreAppId(appUrl) || url.searchParams.get("appId") || legendRunTarget.appId;
  const country = (url.searchParams.get("country") || legendRunTarget.country).toUpperCase();
  const baselineRank = Number(url.searchParams.get("baselineRank") || 60);
  const explicitKeywords = parseListParam(url.searchParams.get("keywords"));
  const target = String(appId) === String(legendRunTarget.appId)
    ? { ...legendRunTarget, appId, country }
    : { ...legendRunTarget, appId, country, name: "", bundleId: "", category: "" };
  const status = statusPayload();
  const errors = [];

  const appStore = await fetchRankRescueAppStoreSnapshot(target);
  if (appStore.error) errors.push({ source: "App Store public page", message: appStore.error });

  let ascApps = [];
  if (status.appStoreConnect.ready) {
    try {
      ascApps = summarizeAscApps(await fetchAscApps());
    } catch (error) {
      errors.push({ source: "App Store Connect", message: error.message });
    }
  }
  const targetApps = rankRescueTargetApps(ascApps, target, appStore);

  let campaigns = [];
  let appleAdsInsights = { ready: false, keywords: [], searchTerms: [], recommendations: [], access: {} };
  if (status.appleAds.ready) {
    try {
      const reportUrl = new URL("http://127.0.0.1/api/apple-ads/reports/campaigns");
      reportUrl.searchParams.set("startDate", range.startDate);
      reportUrl.searchParams.set("endDate", range.endDate);
      const [campaignsPayload, reportPayload] = await Promise.all([
        fetchAppleAdsCampaigns(),
        fetchAppleAdsCampaignReport(reportUrl)
      ]);
      campaigns = summarizeAppleAdsCampaigns(campaignsPayload, reportPayload);
      appleAdsInsights = await appleAdsInsightsPayload(range, campaigns);
    } catch (error) {
      errors.push({ source: "Apple Ads", message: error.message });
    }
  }

  const asoUrl = new URL("http://127.0.0.1/api/aso/keywords");
  asoUrl.searchParams.set("country", country);
  asoUrl.searchParams.set("limit", url.searchParams.get("limit") || "24");
  if (explicitKeywords.length) asoUrl.searchParams.set("keywords", explicitKeywords.join(","));
  const asoKeywordMonitor = await asoKeywordMonitorPayload(targetApps, appleAdsInsights, asoUrl);
  const ads = rankRescueAdsPayload({ campaigns, appleAdsInsights, target, appStore });
  const now = new Date().toISOString();
  const historyBefore = readRankHistory();
  const previous7d = previousRankSnapshot(historyBefore, target.appId, country, now, 7);
  const previousLatest = historyBefore.find((entry) => String(entry.appId) === String(target.appId) && entry.country === country) || null;
  const current = rankRescueCurrentPayload({ target, appStore, ads, asoKeywordMonitor, range, baselineRank, previous7d, previousLatest });
  const snapshot = rankRescueSnapshot({ target, appStore, ads, asoKeywordMonitor, current, range, now });
  const history = appendRankHistory(snapshot);
  const keywords = rankRescueKeywordPayload(asoKeywordMonitor, target, appStore);
  const actions = rankRescueActions({ current, ads, keywords, baselineRank, app: appStore });

  return {
    ready: Boolean(appStore.ready || asoKeywordMonitor.ready || ads.ready),
    mode: appStore.ready ? "live-public" : "partial",
    updatedAt: now,
    range,
    app: {
      appId: target.appId,
      bundleId: appStore.bundleId || target.bundleId,
      name: appStore.name || target.name,
      country,
      device: target.device,
      category: current.category,
      version: appStore.version || "",
      storeUrl: appStore.storeUrl || `https://apps.apple.com/us/app/id${target.appId}`,
      price: appStore.price || "Free"
    },
    current,
    ads,
    keywords,
    actions,
    competitiveBlueprint: competitiveBlueprintPayload(),
    dataSources: [
      { name: "App Store public page", status: appStore.ready ? "ready" : "partial", detail: appStore.sourceDetail || "Visible rank and ratings when Apple exposes them in page HTML." },
      { name: "iTunes Search / Lookup", status: appStore.lookupReady ? "ready" : "partial", detail: "Fallback app metadata, rating count, version, genres, and store URL." },
      { name: "Apple Ads", status: ads.ready ? "ready" : "waiting", detail: "Campaign, keyword, and search-term velocity when local Apple Ads credentials are ready." },
      { name: "Local rank history", status: "ready", detail: rankHistoryPath }
    ],
    history: {
      path: rankHistoryPath,
      latest: snapshot,
      previous7d,
      previousLatest,
      recent: history.slice(0, 20)
    },
    errors
  };
}

async function fetchRankRescueAppStoreSnapshot(target) {
  const lookup = await fetchAppStoreLookup(target.appId, target.country);
  const app = lookup.app || {};
  const storeUrl = normalizeAppStoreUrl(app.trackViewUrl || `https://apps.apple.com/us/app/id${target.appId}`);
  let page = {};
  try {
    page = await fetchAppStorePageSnapshot(storeUrl);
  } catch (error) {
    page = { ready: false, error: error.message };
  }
  const ratingAverage = firstNumber(page.ratingAverage, app.averageUserRating, app.averageUserRatingForCurrentVersion);
  const ratingCount = firstNumber(page.ratingCount, app.userRatingCount, app.userRatingCountForCurrentVersion);
  return {
    ready: Boolean(page.ready || lookup.ready),
    lookupReady: Boolean(lookup.ready),
    error: page.error || lookup.error || "",
    sourceDetail: page.ready ? "Parsed visible chart/rating cards from the public App Store page." : "Using iTunes Lookup fallback.",
    storeUrl,
    appId: String(app.trackId || target.appId),
    bundleId: app.bundleId || target.bundleId,
    name: app.trackName || target.name,
    categoryRank: page.categoryRank,
    category: page.category || target.category,
    ratingAverage,
    ratingCount,
    version: app.version || page.version || "",
    price: app.formattedPrice || "",
    releaseDate: app.currentVersionReleaseDate || app.releaseDate || "",
    genres: app.genres || [],
    primaryGenreName: app.primaryGenreName || "",
    lookup: app
  };
}

async function fetchAppStoreLookup(appId, country) {
  try {
    const params = new URLSearchParams({ id: appId, country });
    const response = await fetch(`https://itunes.apple.com/lookup?${params}`, { headers: { Accept: "application/json" } });
    if (!response.ok) return { ready: false, error: `Lookup returned ${response.status}`, app: null };
    const body = await response.json();
    const app = Array.isArray(body.results) ? body.results[0] : null;
    return { ready: Boolean(app), app, error: app ? "" : "Lookup returned no app." };
  } catch (error) {
    return { ready: false, error: error.message, app: null };
  }
}

async function fetchAppStorePageSnapshot(storeUrl) {
  const response = await fetch(storeUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": "Mozilla/5.0 AppleGrowthConsole/1.0"
    }
  });
  if (!response.ok) throw new Error(`App Store page returned ${response.status}`);
  const html = await response.text();
  const chart = extractAppStoreChart(html);
  const rating = extractAppStoreRating(html);
  return {
    ready: Boolean(chart.categoryRank || rating.ratingAverage || rating.ratingCount),
    ...chart,
    ...rating
  };
}

function normalizeAppStoreUrl(url) {
  return String(url || "").replace(/\?.*$/, "");
}

function extractAppStoreChart(html) {
  const chartIndex = html.indexOf(">Chart</span>");
  if (chartIndex < 0) return { categoryRank: null, category: "" };
  const segment = html.slice(chartIndex, chartIndex + 1800);
  const rankMatch = segment.match(/#\s*([0-9]+)/);
  if (!rankMatch) return { categoryRank: null, category: "" };
  const afterRank = segment.slice(rankMatch.index + rankMatch[0].length);
  const categoryMatches = [...afterRank.matchAll(/multiline-clamp__text[^>]*>([^<]+)<\/span>/g)];
  const category = categoryMatches
    .map((match) => decodeHtmlText(match[1]))
    .find((value) => value && !/^#/.test(value) && value.toLowerCase() !== "chart") || "";
  return {
    categoryRank: Number(rankMatch[1]),
    category
  };
}

function extractAppStoreRating(html) {
  const jsonLd = html.match(/"aggregateRating"\s*:\s*\{[^}]*"ratingValue"\s*:\s*([0-9.]+)[^}]*"reviewCount"\s*:\s*([0-9]+)/);
  if (jsonLd) return { ratingAverage: Number(jsonLd[1]), ratingCount: Number(jsonLd[2]) };
  const ratings = html.match(/"ratingAverage"\s*:\s*([0-9.]+)[\s\S]{0,80}?"totalNumberOfRatings"\s*:\s*([0-9]+)/);
  if (ratings) return { ratingAverage: Number(ratings[1]), ratingCount: Number(ratings[2]) };
  return { ratingAverage: null, ratingCount: null };
}

function decodeHtmlText(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, "\"")
    .trim();
}

function rankRescueTargetApps(ascApps, target, appStore) {
  const matches = (ascApps || []).filter((app) =>
    String(app.id) === String(target.appId)
    || normalizeKey(app.bundleId) === normalizeKey(target.bundleId)
    || (appStore.name && normalizeKey(app.name) === normalizeKey(appStore.name))
  );
  const fallback = {
    id: target.appId,
    name: appStore.name || target.name,
    bundleId: appStore.bundleId || target.bundleId
  };
  const apps = matches.length ? matches : [fallback];
  const seen = new Set();
  return apps.filter((app) => {
    const key = `${app.id}:${app.bundleId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rankRescueAdsPayload({ campaigns, appleAdsInsights, target, appStore }) {
  const matchers = rankRescueAdMatchers(target, appStore);
  const campaignRows = (campaigns || []).filter((campaign) => isRankRescueAdRow(campaign, matchers, target));
  const keywordRows = (appleAdsInsights?.keywords || []).filter((row) => isRankRescueAdRow(row, matchers, target));
  const searchTermRows = (appleAdsInsights?.searchTerms || []).filter((row) => isRankRescueAdRow(row, matchers, target));
  const exactRows = keywordRows.filter((row) => normalizeKey(row.matchType) === "exact");
  const broadRows = keywordRows.filter((row) => normalizeKey(row.matchType) === "broad");
  const allRows = [...keywordRows, ...searchTermRows];
  const campaignTotals = summarizeAdMetricRows(campaignRows.map((campaign) => ({
    spend: parseCurrencyLabel(campaign.spend),
    taps: parseCurrencyLabel(campaign.taps),
    installs: parseCurrencyLabel(campaign.installs)
  })));
  const rowTotals = summarizeAdMetricRows(allRows);
  const total = campaignTotals.spend || campaignTotals.installs ? campaignTotals : rowTotals;
  return {
    ready: Boolean(campaignRows.length || allRows.length),
    total,
    exact: summarizeAdMetricRows(exactRows),
    broad: summarizeAdMetricRows(broadRows),
    searchTerms: summarizeAdMetricRows(searchTermRows),
    campaigns: campaignRows.map((campaign) => ({
      name: campaign.name,
      status: campaign.status,
      spend: campaign.spend,
      taps: campaign.taps,
      installs: campaign.installs,
      cpa: campaign.cpa
    })),
    keywords: keywordRows.slice(0, 12),
    topSearchTerms: searchTermRows.slice(0, 12),
    splitNote: "Exact protects proven intent; broad should stay capped until it proves installs and rank/revenue recovery."
  };
}

function rankRescueAdMatchers(target = {}, appStore = {}) {
  const phrases = new Set();
  const add = (value) => {
    const cleaned = normalizeKey(value);
    if (cleaned && cleaned.length >= 3 && cleaned !== "legend run") phrases.add(cleaned);
  };
  add(target.appId);
  add(appStore.appId);
  add(target.bundleId);
  add(appStore.bundleId);
  add(appStore.name || target.name);
  const name = normalizeKey(appStore.name || target.name || "");
  if (name.includes("82-0") || name.includes("82 0")) add("82-0");
  if (name.includes("16-0") || name.includes("16 0")) add("16-0");
  if (name.includes("162-0") || name.includes("162 0")) add("162-0");
  if (name.includes("perfect album")) add("perfect album");
  if (name.includes("plantedu") || name.includes("plant")) {
    add("plantedu");
    add("plant edu");
  }
  if (name.includes("bare")) add("bare");
  if (name.includes("blueprint")) add("blueprint");
  if (name.includes("cup")) add("cup companion");
  return [...phrases];
}

function isRankRescueAdRow(row, matchers, target = {}) {
  const rowAppId = String(row.appId || row.adamId || row.app?.adamId || "");
  if (rowAppId && String(target.appId || "") === rowAppId) return true;
  const text = normalizeKey([
    row.name,
    row.app,
    row.campaignName,
    row.adGroupName,
    row.keyword,
    row.searchTerm,
    row.term,
    row.bundleId
  ].filter(Boolean).join(" "));
  if (matchers.some((term) => text.includes(term))) return true;
  return String(target.appId || "") === String(legendRunTarget.appId) && isLegendRunAdRow(row);
}

function isLegendRunAdRow(row) {
  return isLegendRunText([
    row.campaignName,
    row.adGroupName,
    row.keyword,
    row.searchTerm,
    row.term
  ].filter(Boolean).join(" "));
}

function isLegendRunText(value) {
  const text = normalizeKey(value);
  return [
    "legend run",
    "82-0",
    "82 and 0",
    "82 0",
    "com.otticoded.legendrun",
    "basketball simulator",
    "basketball manager"
  ].some((term) => text.includes(term));
}

function summarizeAdMetricRows(rows) {
  const spend = rows.reduce((total, row) => total + Number(row.spend || 0), 0);
  const taps = rows.reduce((total, row) => total + Number(row.taps || 0), 0);
  const installs = rows.reduce((total, row) => total + Number(row.installs || 0), 0);
  const cpi = installs ? spend / installs : 0;
  return {
    spend: Number(spend.toFixed(2)),
    spendLabel: moneyLabel({ amount: spend, currency: "USD" }),
    taps,
    installs,
    cpi: Number(cpi.toFixed(2)),
    cpiLabel: installs ? moneyLabel({ amount: cpi, currency: "USD" }) : "$0.00",
    installRate: taps ? Number((installs / taps).toFixed(3)) : 0
  };
}

function parseCurrencyLabel(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0;
}

function normalizeKey(value) {
  return String(value || "").trim().toLowerCase();
}

function rankRescueCurrentPayload({ target, appStore, ads, asoKeywordMonitor, range, baselineRank, previous7d, previousLatest }) {
  const categoryRank = Number(appStore.categoryRank || 0) || null;
  const rankDelta7d = previous7d?.categoryRank && categoryRank ? categoryRank - previous7d.categoryRank : null;
  const rankDeltaLatest = previousLatest?.categoryRank && categoryRank ? categoryRank - previousLatest.categoryRank : null;
  const ratingCount = Number(appStore.ratingCount || 0) || null;
  const ratingAverage = Number(appStore.ratingAverage || 0) || null;
  const ratingDelta7d = previous7d?.ratingCount && ratingCount ? ratingCount - previous7d.ratingCount : null;
  const reportedDrop = categoryRank && baselineRank ? categoryRank - baselineRank : null;
  return {
    categoryRank,
    category: appStore.category || target.category,
    rankLabel: categoryRank ? `#${categoryRank}` : "unavailable",
    rankDelta7d,
    rankDeltaLatest,
    reportedBaselineRank: baselineRank,
    reportedDrop,
    ratingAverage,
    ratingCount,
    ratingDelta7d,
    installVelocityProxy: ads.total.installs,
    paidSpendVelocity: ads.total.spend,
    asoKeywordCount: asoKeywordMonitor.keywords?.length || 0,
    sourceRange: `${range.startDate} to ${range.endDate}`
  };
}

function rankRescueSnapshot({ target, appStore, ads, asoKeywordMonitor, current, range, now }) {
  return {
    timestamp: now,
    date: range.endDate,
    appId: target.appId,
    country: target.country,
    device: target.device,
    appName: appStore.name || target.name,
    category: current.category,
    categoryRank: current.categoryRank,
    ratingAverage: current.ratingAverage,
    ratingCount: current.ratingCount,
    version: appStore.version || "",
    totalSpend: ads.total.spend,
    installs: ads.total.installs,
    taps: ads.total.taps,
    exactSpend: ads.exact.spend,
    broadSpend: ads.broad.spend,
    protectedKeywords: (asoKeywordMonitor.keywords || [])
      .filter((row) => row.action === "defend")
      .slice(0, 5)
      .map((row) => ({ keyword: row.keyword, rank: row.rank, installs: row.ads?.installs || 0 }))
  };
}

function readRankHistory() {
  try {
    if (!existsSync(rankHistoryPath)) return [];
    const parsed = JSON.parse(readFileSync(rankHistoryPath, "utf8"));
    if (Array.isArray(parsed)) return parsed;
    return Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
  } catch {
    return [];
  }
}

function appendRankHistory(snapshot) {
  mkdirSync(dataDir, { recursive: true });
  const snapshots = [snapshot, ...readRankHistory()];
  writeFileSync(rankHistoryPath, JSON.stringify({ snapshots }, null, 2));
  return snapshots;
}

function previousRankSnapshot(snapshots, appId, country, timestamp, daysBack) {
  const targetTime = new Date(timestamp).getTime() - daysBack * 24 * 60 * 60 * 1000;
  const matches = (snapshots || [])
    .filter((entry) => String(entry.appId) === String(appId) && entry.country === country)
    .map((entry) => ({ ...entry, time: new Date(entry.timestamp).getTime() }))
    .filter((entry) => Number.isFinite(entry.time) && entry.time <= targetTime)
    .sort((a, b) => Math.abs(a.time - targetTime) - Math.abs(b.time - targetTime));
  return matches[0] || null;
}

function rankRescueKeywordPayload(asoKeywordMonitor, target = {}, appStore = {}) {
  const rows = asoKeywordMonitor.keywords || [];
  const matchers = rankRescueAdMatchers(target, appStore);
  const protect = rows.filter((row) =>
    row.action === "defend"
    || (isTargetKeywordText(row.keyword, matchers) && row.rank && row.rank <= 3 && row.ads?.installs > 0)
  );
  const opportunities = rows.filter((row) => row.action !== "watch").slice(0, 10);
  return {
    source: asoKeywordMonitor.source || "apple-search-api",
    country: asoKeywordMonitor.country || "US",
    device: asoKeywordMonitor.device || "iPhone",
    protected: protect.slice(0, 6).map(rankRescueKeywordRow),
    opportunities: opportunities.map(rankRescueKeywordRow),
    rows: rows.slice(0, 16).map(rankRescueKeywordRow)
  };
}

function isTargetKeywordText(keyword, matchers = []) {
  const text = normalizeKey(keyword);
  return Boolean(text && matchers.some((term) => text.includes(term)));
}

function rankRescueKeywordRow(row) {
  return {
    keyword: row.keyword,
    rank: row.rank,
    rankLabel: row.rankLabel,
    action: row.action,
    recommendation: row.recommendation,
    installs: row.ads?.installs || 0,
    taps: row.ads?.taps || 0,
    spend: row.ads?.spend || 0,
    spendLabel: row.ads?.spendLabel || "$0.00",
    traffic: row.traffic,
    complexity: row.complexity,
    effectiveness: row.effectiveness
  };
}

function rankRescueActions({ current, ads, keywords, baselineRank, app = {} }) {
  const actions = [];
  const appName = app.name || "this app";
  const rankDrop = Number(current.reportedDrop || 0);
  if (current.ratingAverage && current.ratingAverage < 3.5) {
    actions.push({
      priority: "critical",
      type: "active risk",
      title: "Repair rating drag before scaling spend",
      body: `Visible rating is ${current.ratingAverage.toFixed(1)} from ${current.ratingCount || 0} ratings. Ship a paywall-timing fix, respond to negative reviews, and prompt ratings only after a completed/positive run.`,
      metric: `${current.ratingAverage.toFixed(1)} stars · ${current.ratingCount || 0} ratings`,
      action: "fix product + review response"
    });
  }
  if (current.categoryRank && (current.categoryRank >= 80 || rankDrop >= 20)) {
    actions.push({
      priority: "high",
      type: "active risk",
      title: "Run controlled install velocity push",
      body: `Sports rank is ${current.rankLabel}${rankDrop ? ` after a reported drop from #${baselineRank}` : ""}. Use exact Apple Ads plus short-form content around "Can your lineup go 82-0?" and watch rank movement hourly/daily.`,
      metric: `${current.rankLabel} ${current.category} · ${rankDrop > 0 ? `+${rankDrop} worse than baseline` : "baseline tracking"}`,
      action: "cap budget + exact-match velocity push"
    });
  }
  if (keywords.protected.length) {
    const winner = keywords.protected[0];
    actions.push({
      priority: "high",
      type: "keep/protect",
      title: `Protect ${winner.keyword}`,
      body: `${winner.keyword} ranks ${winner.rankLabel} and produced ${winner.installs} installs from Apple Ads. Keep exact-match defense on and avoid letting broad terms steal budget.`,
      metric: `${winner.spendLabel} spend · ${winner.taps} taps · ${winner.installs} installs`,
      action: "keep/protect exact"
    });
  }
  if (ads.broad.spend >= 7 && ads.broad.installRate < 0.15) {
    actions.push({
      priority: "medium",
      type: "optimization watch",
      title: "Cap or cut broad discovery",
      body: `Broad-match ${appName} spend has a ${(ads.broad.installRate * 100).toFixed(1)}% install rate. Keep broad capped until ratings recover and search terms prove purchase intent.`,
      metric: `${ads.broad.spendLabel} broad spend · ${ads.broad.taps} taps · ${ads.broad.installs} installs`,
      action: "lower bid percentage"
    });
  }
  actions.push({
    priority: "medium",
    type: "optimization watch",
    title: "Create one high-intent custom product page",
    body: `Use a custom product page for exact ads tied to ${appName}'s highest-intent keyword cluster. Route only proven exact traffic there until conversion holds.`,
    metric: "custom product page + exact Apple Ads",
    action: "launch custom product page"
  });
  actions.push({
    priority: "medium",
    type: "SaaS MVP",
    title: "Package this workflow as rank rescue",
    body: "Turn the internal playbook into a subscription: app URL onboarding, keyword/rank history, review alerts, Apple Ads correlation, and daily rank-drop diagnosis.",
    metric: "Astro-style keyword monitor + Appfigures-style diagnostics",
    action: "build subscription workflow"
  });
  return actions;
}

function competitiveBlueprintPayload() {
  return {
    positioning: "Rank rescue playbooks for indie iOS app developers, focused on what to do next instead of generic analytics.",
    integrationDecision: "Build with Apple public pages/search, App Store Connect, Apple Ads, RevenueCat, and user-provided competitor URLs. Do not depend on private Appfigures or Astro APIs for the production product.",
    competitors: [
      {
        name: "Astro",
        publicSignals: [
          "Simple ASO keyword research and tracking.",
          "Daily keyword rank updates with historical graphs.",
          "Apple Search Ads popularity data and difficulty calculations.",
          "Unlimited apps/keywords for a fixed annual subscription.",
          "Review/rating tracking across stores."
        ],
        cloneableMvp: [
          "Keyword rank monitor by app/country/device.",
          "Popularity/difficulty proxy using Apple Search Ads and top-result density.",
          "Metadata action queue: add, defend, improve, test exact.",
          "Review/rating alerting and trend deltas."
        ],
        differentiation: "Astro tells developers what keywords to use; our MVP should explain which rank emergency to fix first and tie every keyword to paid-install quality."
      },
      {
        name: "Appfigures",
        publicSignals: [
          "Broad app intelligence, top charts, ASO, reviews, analytics, and ad-spend consolidation.",
          "Apple Ads Intelligence for competitor keyword discovery.",
          "Rank changes, metadata optimization, market/category benchmarks, and API docs.",
          "Positioned for indie developers through enterprise market analysts."
        ],
        cloneableMvp: [
          "Top chart snapshots by category/country.",
          "Competitor and keyword teardown pages.",
          "Review/rating monitor with actionable risk states.",
          "Apple Ads correlation: exact/broad split, CPI safety, no-install taps."
        ],
        differentiation: "Appfigures is broad market data; our product should be narrower, faster, and prescriptive for founders who need to recover rank today."
      }
    ],
    subscriptionModules: [
      "Rank Rescue dashboard",
      "Keyword rank monitor",
      "Competitor snapshots",
      "Review/rating alerts",
      "Apple Ads waste and winner correlation",
      "Daily email/SMS emergency digest",
      "Stripe subscription workspace"
    ]
  };
}

function firstNumber(...values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return null;
}

async function revenueCatPayload(range) {
  const cacheKey = `${range.startDate}:${range.endDate}`;
  const cached = revenueCatCache.get(cacheKey);
  if (cached && Date.now() - cached.storedAt < revenueCatCacheTtlMs) {
    return { ...cached.payload, cache: { hit: true, storedAt: new Date(cached.storedAt).toISOString() } };
  }
  const connections = await Promise.all(revenueCatConnections().map((connection) => revenueCatConnectionPayload(range, connection)));
  const readyConnections = connections.filter((connection) => connection.ready);
  const payload = {
    ready: readyConnections.length > 0,
    mode: readyConnections.length ? "live" : "missing-credentials",
    connections,
    primary: readyConnections[0] || connections[0] || null,
    totals: summarizeRevenueCatTotals(readyConnections)
  };
  if (payload.ready) revenueCatCache.set(cacheKey, { storedAt: Date.now(), payload });
  if (!payload.ready && cached?.payload?.ready) {
    return { ...cached.payload, cache: { hit: true, stale: true, storedAt: new Date(cached.storedAt).toISOString() } };
  }
  return payload;
}

async function revenueCatConnectionPayload(range, connection) {
  if (!connection.apiKey || !connection.projectId) {
    return {
      id: connection.id,
      label: connection.label,
      ready: false,
      mode: "missing-credentials",
      missing: [
        ...(connection.apiKey ? [] : [connection.apiKeyEnv]),
        ...(connection.projectId ? [] : [connection.projectIdEnv])
      ],
      project: connection.projectId ? { id: connection.projectId, name: "" } : null,
      projects: [],
      metrics: {},
      revenue: null,
      charts: {},
      access: {}
    };
  }
  const [projects, overview, revenue, revenueChart, mrrChart, activesChart, trialsChart] = await Promise.all([
    fetchRevenueCatProjects(connection),
    fetchRevenueCatOverview(connection),
    fetchRevenueCatRevenue(new URL(`http://127.0.0.1/api/revenuecat/revenue?startDate=${range.startDate}&endDate=${range.endDate}`), connection),
    fetchRevenueCatChart(new URL(`http://127.0.0.1/api/revenuecat/chart?chart=revenue&startDate=${range.startDate}&endDate=${range.endDate}`), connection),
    fetchRevenueCatChart(new URL(`http://127.0.0.1/api/revenuecat/chart?chart=mrr&startDate=${range.startDate}&endDate=${range.endDate}`), connection),
    fetchRevenueCatChart(new URL(`http://127.0.0.1/api/revenuecat/chart?chart=actives&startDate=${range.startDate}&endDate=${range.endDate}`), connection),
    fetchRevenueCatChart(new URL(`http://127.0.0.1/api/revenuecat/chart?chart=trials&startDate=${range.startDate}&endDate=${range.endDate}`), connection)
  ]);
  const project = (projects.body?.items || []).find((item) => item.id === connection.projectId) || projects.body?.items?.[0] || null;
  return {
    id: connection.id,
    label: project?.name || connection.label,
    ready: Boolean(overview.ok || revenue.ok || revenueChart.ok),
    mode: overview.ok || revenue.ok || revenueChart.ok ? "live" : "blocked",
    missing: [],
    project: project ? { id: project.id, name: project.name } : { id: connection.projectId, name: "" },
    projects: summarizeRevenueCatProjects(projects),
    metrics: summarizeRevenueCatOverview(overview),
    revenue: summarizeRevenueCatRevenue(revenue),
    charts: {
      revenue: summarizeRevenueCatChart(revenueChart),
      mrr: summarizeRevenueCatChart(mrrChart),
      actives: summarizeRevenueCatChart(activesChart),
      trials: summarizeRevenueCatChart(trialsChart)
    },
    access: {
      projects: accessSummary(projects),
      overview: accessSummary(overview),
      revenue: accessSummary(revenue),
      revenueChart: accessSummary(revenueChart)
    }
  };
}

function revenueCatConnections() {
  return revenueCatSlots.map((slot) => ({
    id: slot.id,
    label: slot.label,
    apiKeyEnv: slot.apiKey,
    projectIdEnv: slot.projectId,
    apiKey: process.env[slot.apiKey],
    projectId: process.env[slot.projectId]
  }));
}

function summarizeRevenueCatTotals(connections) {
  return connections.reduce((total, connection) => {
    total.revenue += Number(connection.revenue?.value || 0);
    total.mrr += Number(connection.metrics?.mrr?.value || 0);
    total.activeSubscriptions += Number(connection.metrics?.active_subscriptions?.value || 0);
    total.newCustomers += Number(connection.metrics?.new_customers?.value || 0);
    total.activeUsers += Number(connection.metrics?.active_users?.value || 0);
    total.activeTrials += Number(connection.metrics?.active_trials?.value || 0);
    return total;
  }, {
    revenue: 0,
    mrr: 0,
    activeSubscriptions: 0,
    newCustomers: 0,
    activeUsers: 0,
    activeTrials: 0
  });
}

function summarizeRevenueCatProjects(payload) {
  const items = payload?.body?.items;
  if (!Array.isArray(items)) return [];
  return items.map((project) => ({
    id: project.id,
    name: project.name,
    iconUrl: project.icon_url || "",
    object: project.object || ""
  }));
}

function summarizeRevenueCatOverview(payload) {
  const metrics = payload?.body?.metrics;
  if (!Array.isArray(metrics)) return {};
  return Object.fromEntries(metrics.map((metric) => [metric.id, {
    id: metric.id,
    name: metric.name,
    value: Number(metric.value || 0),
    unit: metric.unit || "",
    period: metric.period || "",
    description: metric.description || ""
  }]));
}

function summarizeRevenueCatRevenue(payload) {
  if (!payload?.ok || typeof payload.body?.value !== "number") return null;
  return {
    value: Number(payload.body.value || 0),
    currency: payload.body.currency || "USD",
    startDate: payload.body.start_date || "",
    endDate: payload.body.end_date || "",
    revenueType: payload.body.revenue_type || "revenue"
  };
}

function summarizeRevenueCatChart(payload) {
  if (!payload?.ok || !payload.body) return null;
  const measures = payload.body.measures || [];
  const primary = measures[0]?.display_name || payload.body.display_name || "Value";
  const values = Array.isArray(payload.body.values)
    ? payload.body.values
        .filter((point) => point.measure === 0 || point.measure === primary)
        .map((point) => ({
          date: epochDay(point.cohort),
          value: Number(point.value || 0),
          incomplete: Boolean(point.incomplete)
        }))
    : [];
  return {
    name: payload.body.display_name || "",
    description: payload.body.description || "",
    yaxis: payload.body.yaxis || "",
    currency: payload.body.yaxis_currency || "USD",
    summary: payload.body.summary || null,
    values
  };
}

function epochDay(value) {
  if (!value) return "";
  return new Date(Number(value) * 1000).toISOString().slice(0, 10);
}

function moneyValue(value) {
  return Number(value?.amount || 0);
}

function numberValue(value) {
  return Number(value || 0);
}

function moneyLabel(value, suffix = "") {
  const amount = moneyValue(value);
  const currency = value?.currency || "USD";
  return `${new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount)}${suffix}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

function percentLabel(value) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

async function syncPayload(url) {
  const startedAt = new Date().toISOString();
  const status = statusPayload();
  const diagnostics = diagnosticsPayload();
  const results = [];

  results.push(await guardedSyncResult("App Store Connect Apps", "app-store-connect", status.appStoreConnect.ready, () => fetchAscApps()));
  results.push(await guardedSyncResult("Apple Ads Campaigns", "apple-ads", status.appleAds.ready, () => fetchAppleAdsCampaigns()));
  results.push(await guardedSyncResult("ASC Sales Report", "app-store-connect", status.appStoreConnect.ready && Boolean(process.env.ASC_VENDOR_NUMBER), () => fetchAscSalesReport(url)));
  results.push(await guardedSyncResult("Apple Ads Campaign Report", "apple-ads", status.appleAds.ready, () => fetchAppleAdsCampaignReport(url)));
  results.push(await guardedSyncResult("RevenueCat Overview", "revenuecat", status.revenueCat.ready, () => fetchRevenueCatOverview()));

  const completedAt = new Date().toISOString();
  const payload = {
    mode: results.every((result) => result.state === "ok") ? "live" : "partial",
    startedAt,
    completedAt,
    credentials: status,
    diagnostics,
    results,
    summary: {
      ok: results.filter((result) => result.state === "ok").length,
      skipped: results.filter((result) => result.state === "skipped").length,
      failed: results.filter((result) => result.state === "failed").length
    },
    syncLog: results.map((result) => ({
      source: result.name,
      level: result.state === "ok" ? "ok" : "warn",
      message: result.message
    }))
  };
  appendSyncHistory(payload);
  return payload;
}

function syncHistoryPayload() {
  return { runs: readSyncHistory(), path: syncHistoryPath };
}

function readSyncHistory() {
  try {
    if (!existsSync(syncHistoryPath)) return [];
    const parsed = JSON.parse(readFileSync(syncHistoryPath, "utf8"));
    return Array.isArray(parsed.runs) ? parsed.runs : [];
  } catch {
    return [];
  }
}

function appendSyncHistory(sync) {
  mkdirSync(dataDir, { recursive: true });
  const runs = readSyncHistory();
  const entry = {
    mode: sync.mode,
    startedAt: sync.startedAt,
    completedAt: sync.completedAt,
    summary: sync.summary,
    results: sync.results.map((result) => ({
      name: result.name,
      service: result.service,
      state: result.state,
      status: result.status,
      message: result.message,
      rowCount: result.rowCount
    }))
  };
  writeFileSync(syncHistoryPath, JSON.stringify({ runs: [entry, ...runs].slice(0, 25) }, null, 2));
}

async function guardedSyncResult(name, service, ready, fetcher) {
  if (!ready) {
    return {
      name,
      service,
      state: "skipped",
      message: "Skipped because required credentials are incomplete.",
      rowCount: 0
    };
  }
  try {
    const payload = await fetcher();
    if (payload?.mode === "missing-credentials") {
      return {
        name,
        service,
        state: "skipped",
        message: `Skipped because required credentials are incomplete.${payload.missing?.length ? ` Missing: ${payload.missing.join(", ")}` : ""}`,
        rowCount: 0
      };
    }
    const rowCount = syncRowCount(payload);
    return {
      name,
      service,
      state: payload?.ok ? "ok" : "failed",
      status: payload?.status,
      message: payload?.ok ? `Fetched ${rowCount} records.` : `Endpoint returned status ${payload?.status || "unknown"}.`,
      rowCount,
      preview: syncPreview(payload)
    };
  } catch (error) {
    return {
      name,
      service,
      state: "failed",
      message: error.message,
      rowCount: 0
    };
  }
}

function syncRowCount(payload) {
  if (Number.isFinite(payload?.rowCount)) return payload.rowCount;
  const bodyData = payload?.body?.data;
  if (Array.isArray(bodyData)) return bodyData.length;
  const reportData = payload?.body?.data?.reportingDataResponse?.row;
  if (Array.isArray(reportData)) return reportData.length;
  return 0;
}

function syncPreview(payload) {
  if (Array.isArray(payload?.rows)) return payload.rows.slice(0, 3);
  if (Array.isArray(payload?.body?.data)) return payload.body.data.slice(0, 3);
  const reportData = payload?.body?.data?.reportingDataResponse?.row;
  if (Array.isArray(reportData)) return reportData.slice(0, 3);
  return [];
}

async function fetchAscApps() {
  const status = statusPayload();
  if (!status.appStoreConnect.ready) {
    return { mode: "missing-credentials", credentials: status.appStoreConnect, data: [] };
  }
  const token = createAppStoreConnectJwt();
  const response = await fetch("https://api.appstoreconnect.apple.com/v1/apps?limit=20", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return passthroughJson(response);
}

async function fetchAscSalesReport(url) {
  const status = statusPayload();
  if (!status.appStoreConnect.ready || !process.env.ASC_VENDOR_NUMBER) {
    return {
      mode: "missing-credentials",
      credentials: status.appStoreConnect,
      missing: [
        ...status.appStoreConnect.missing,
        ...(process.env.ASC_VENDOR_NUMBER ? [] : ["ASC_VENDOR_NUMBER"])
      ],
      data: []
    };
  }

  const reportDate = url.searchParams.get("reportDate") || yesterdayIsoDate();
  const params = new URLSearchParams({
    "filter[frequency]": url.searchParams.get("frequency") || "DAILY",
    "filter[reportDate]": reportDate,
    "filter[reportSubType]": url.searchParams.get("reportSubType") || "SUMMARY",
    "filter[reportType]": url.searchParams.get("reportType") || "SALES",
    "filter[vendorNumber]": process.env.ASC_VENDOR_NUMBER,
    "filter[version]": url.searchParams.get("version") || "1_0"
  });

  const token = createAppStoreConnectJwt();
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/salesReports?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/a-gzip, text/plain, application/json" }
  });
  return reportResponse(response, { reportDate, source: "app-store-connect-sales" });
}

async function fetchAscAnalyticsReportRequests(url) {
  const status = statusPayload();
  if (!status.appStoreConnect.ready) {
    return { mode: "missing-credentials", credentials: status.appStoreConnect, data: [] };
  }

  const appId = url.searchParams.get("appId");
  if (!appId) return { mode: "missing-app-id", status: 400, ok: false, error: "Missing appId query parameter." };

  const token = createAppStoreConnectJwt();
  const params = new URLSearchParams({
    limit: url.searchParams.get("limit") || "10"
  });
  const response = await fetch(`https://api.appstoreconnect.apple.com/v1/apps/${appId}/analyticsReportRequests?${params}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return passthroughJson(response);
}

async function appStoreDataAccessStatus(range, apps) {
  const salesUrl = new URL("http://127.0.0.1/api/app-store-connect/sales-report");
  salesUrl.searchParams.set("reportDate", range.endDate);
  const firstApp = apps?.[0];
  const [sales, analytics] = await Promise.all([
    fetchAscSalesReport(salesUrl),
    firstApp ? fetchAscAnalyticsReportRequests(new URL(`http://127.0.0.1/api/app-store-connect/analytics-report-requests?appId=${firstApp.id}`)) : Promise.resolve({ mode: "missing-app", status: 0, ok: false })
  ]);
  return {
    salesReports: accessSummary(sales),
    analyticsReports: accessSummary(analytics),
    checkedApp: firstApp ? { id: firstApp.id, name: firstApp.name } : null
  };
}

function accessSummary(payload) {
  if (payload?.ok) return { status: "ready", httpStatus: payload.status, message: "Ready" };
  const error = payload?.body?.errors?.[0] || {};
  if (payload?.mode === "missing-credentials") return { status: "missing-credentials", httpStatus: 0, message: "Missing credentials" };
  return {
    status: "blocked",
    httpStatus: payload?.status || 0,
    code: error.code || payload?.mode || "",
    message: error.detail || payload?.error || `Endpoint returned ${payload?.status || "unknown status"}`
  };
}

async function fetchAppleAdsCampaigns() {
  const status = statusPayload();
  if (!status.appleAds.ready) {
    return { mode: "missing-credentials", credentials: status.appleAds, data: [] };
  }
  const token = await createAppleAdsAccessToken();
  const response = await fetch("https://api.searchads.apple.com/api/v5/campaigns", {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-AP-Context": `orgId=${process.env.APPLE_ADS_ORG_ID}`
    }
  });
  return passthroughJson(response);
}

async function fetchRevenueCatProjects(connection = revenueCatConnections()[0]) {
  const status = statusPayload();
  if (!connection?.apiKey) {
    return { mode: "missing-credentials", credentials: status.revenueCat, data: [] };
  }
  const response = await fetch("https://api.revenuecat.com/v2/projects", {
    headers: revenueCatHeaders(connection)
  });
  return passthroughJson(response);
}

async function fetchRevenueCatOverview(connection = revenueCatConnections()[0]) {
  const status = statusPayload();
  if (!connection?.apiKey || !connection?.projectId) {
    return { mode: "missing-credentials", credentials: status.revenueCat, data: [] };
  }
  const response = await fetch(`https://api.revenuecat.com/v2/projects/${connection.projectId}/metrics/overview`, {
    headers: revenueCatHeaders(connection)
  });
  return passthroughJson(response);
}

async function fetchRevenueCatRevenue(url, connection = revenueCatConnections()[0]) {
  const status = statusPayload();
  if (!connection?.apiKey || !connection?.projectId) {
    return { mode: "missing-credentials", credentials: status.revenueCat, data: [] };
  }
  const params = revenueCatDateParams(url);
  params.set("currency", url.searchParams.get("currency") || "USD");
  const response = await fetch(`https://api.revenuecat.com/v2/projects/${connection.projectId}/metrics/revenue?${params}`, {
    headers: revenueCatHeaders(connection)
  });
  return passthroughJson(response);
}

async function fetchRevenueCatChart(url, connection = revenueCatConnections()[0]) {
  const status = statusPayload();
  if (!connection?.apiKey || !connection?.projectId) {
    return { mode: "missing-credentials", credentials: status.revenueCat, data: [] };
  }
  const chart = url.searchParams.get("chart") || "revenue";
  const params = revenueCatDateParams(url);
  params.set("currency", url.searchParams.get("currency") || "USD");
  const response = await fetch(`https://api.revenuecat.com/v2/projects/${connection.projectId}/charts/${chart}?${params}`, {
    headers: revenueCatHeaders(connection)
  });
  return passthroughJson(response);
}

function revenueCatHeaders(connection = revenueCatConnections()[0]) {
  return { Authorization: `Bearer ${connection.apiKey}` };
}

function revenueCatDateParams(url) {
  const params = new URLSearchParams();
  params.set("start_date", url.searchParams.get("startDate") || url.searchParams.get("start_date") || daysAgoIsoDate(6));
  params.set("end_date", url.searchParams.get("endDate") || url.searchParams.get("end_date") || yesterdayIsoDate());
  return params;
}

async function fetchAppleAdsAcls() {
  const status = statusPayload();
  if (!status.appleAds.ready) {
    return { mode: "missing-credentials", credentials: status.appleAds, data: [] };
  }
  const token = await createAppleAdsAccessToken();
  const response = await fetch("https://api.searchads.apple.com/api/v5/acls", {
    headers: { Authorization: `Bearer ${token}` }
  });
  return passthroughJson(response);
}

async function fetchAppleAdsCampaignReport(url) {
  const status = statusPayload();
  if (!status.appleAds.ready) {
    return { mode: "missing-credentials", credentials: status.appleAds, data: [] };
  }

  const token = await createAppleAdsAccessToken();
  const endDate = url.searchParams.get("endDate") || yesterdayIsoDate();
  const startDate = url.searchParams.get("startDate") || endDate;
  const body = {
    startTime: startDate,
    endTime: endDate,
    selector: {
      orderBy: [{ field: "localSpend", sortOrder: "DESCENDING" }],
      pagination: { offset: 0, limit: 25 }
    },
    timeZone: url.searchParams.get("timeZone") || "UTC",
    returnRecordsWithNoMetrics: false,
    returnRowTotals: true,
    returnGrandTotals: true
  };

  const response = await fetch("https://api.searchads.apple.com/api/v5/reports/campaigns", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-AP-Context": `orgId=${process.env.APPLE_ADS_ORG_ID}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return passthroughJson(response);
}

async function fetchAppleAdsKeywordReports(url) {
  return fetchAppleAdsCampaignScopedReports(url, "keywords", "localSpend", "UTC");
}

async function fetchAppleAdsSearchTermReports(url) {
  return fetchAppleAdsCampaignScopedReports(url, "searchterms", "impressions", "ORTZ");
}

async function fetchAppleAdsCampaignScopedReports(url, reportType, orderField, timeZone) {
  const status = statusPayload();
  if (!status.appleAds.ready) {
    return { mode: "missing-credentials", credentials: status.appleAds, data: [] };
  }

  let campaignIds = url.searchParams.getAll("campaignId").filter(Boolean);
  if (!campaignIds.length) {
    const campaignsPayload = await fetchAppleAdsCampaigns();
    campaignIds = (campaignsPayload.body?.data || []).map((campaign) => campaign.id).filter(Boolean);
  }
  if (!campaignIds.length) return { ok: false, status: 0, mode: "missing-campaigns", reports: [] };

  const token = await createAppleAdsAccessToken();
  const endDate = url.searchParams.get("endDate") || yesterdayIsoDate();
  const startDate = url.searchParams.get("startDate") || endDate;
  const reports = await Promise.all(campaignIds.map(async (campaignId) => {
    const body = {
      startTime: startDate,
      endTime: endDate,
      selector: {
        orderBy: [{ field: orderField, sortOrder: "DESCENDING" }],
        pagination: { offset: 0, limit: Number(url.searchParams.get("limit") || 50) }
      },
      timeZone,
      returnRecordsWithNoMetrics: false,
      returnRowTotals: true,
      returnGrandTotals: true
    };
    const response = await fetch(`https://api.searchads.apple.com/api/v5/reports/campaigns/${campaignId}/${reportType}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-AP-Context": `orgId=${process.env.APPLE_ADS_ORG_ID}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });
    return { campaignId, ...(await passthroughJson(response)) };
  }));

  return {
    ok: reports.some((report) => report.ok),
    status: reports.find((report) => !report.ok)?.status || 200,
    reports,
    rowCount: reports.reduce((total, report) => total + (report.body?.data?.reportingDataResponse?.row?.length || 0), 0)
  };
}

async function passthroughJson(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { status: response.status, ok: response.ok, body };
}

async function reportResponse(response, metadata) {
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  let text = buffer.toString("utf8");
  try {
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) text = gunzipSync(buffer).toString("utf8");
  } catch (error) {
    return { status: response.status, ok: response.ok, metadata, error: `Failed to decompress report: ${error.message}` };
  }

  if (contentType.includes("json")) {
    try {
      return { status: response.status, ok: response.ok, metadata, body: JSON.parse(text) };
    } catch {
      return { status: response.status, ok: response.ok, metadata, raw: text };
    }
  }

  const rows = parseTsv(text);
  return {
    status: response.status,
    ok: response.ok,
    metadata,
    rowCount: rows.length,
    columns: rows[0] ? Object.keys(rows[0]) : [],
    rows: rows.slice(0, 50),
    truncated: rows.length > 50,
    rawPreview: rows.length ? undefined : text.slice(0, 800)
  };
}

function parseTsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2 || !lines[0].includes("\t")) return [];
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
  });
}

function statusPayload() {
  const asc = requiredFields({
    ASC_KEY_ID: process.env.ASC_KEY_ID,
    ASC_ISSUER_ID: process.env.ASC_ISSUER_ID,
    ASC_PRIVATE_KEY_PATH: existingPath(process.env.ASC_PRIVATE_KEY_PATH),
    ASC_VENDOR_NUMBER: process.env.ASC_VENDOR_NUMBER
  }, ["ASC_KEY_ID", "ASC_ISSUER_ID", "ASC_PRIVATE_KEY_PATH"]);

  const ads = requiredFields({
    APPLE_ADS_CLIENT_ID: process.env.APPLE_ADS_CLIENT_ID,
    APPLE_ADS_TEAM_ID: process.env.APPLE_ADS_TEAM_ID,
    APPLE_ADS_KEY_ID: process.env.APPLE_ADS_KEY_ID,
    APPLE_ADS_PRIVATE_KEY_PATH: existingPath(process.env.APPLE_ADS_PRIVATE_KEY_PATH),
    APPLE_ADS_ORG_ID: process.env.APPLE_ADS_ORG_ID
  }, ["APPLE_ADS_CLIENT_ID", "APPLE_ADS_TEAM_ID", "APPLE_ADS_KEY_ID", "APPLE_ADS_PRIVATE_KEY_PATH", "APPLE_ADS_ORG_ID"]);

  const revenueCatConnectionsStatus = revenueCatConnections().map((connection) => ({
    id: connection.id,
    label: connection.label,
    ready: Boolean(connection.apiKey && connection.projectId),
    missing: [
      ...(connection.apiKey ? [] : [connection.apiKeyEnv]),
      ...(connection.projectId ? [] : [connection.projectIdEnv])
    ],
    fields: [
      { name: connection.apiKeyEnv, present: Boolean(connection.apiKey), value: connection.apiKey ? mask(connection.apiKey) : "" },
      { name: connection.projectIdEnv, present: Boolean(connection.projectId), value: connection.projectId ? mask(connection.projectId) : "" }
    ]
  }));
  const revenueCat = {
    ready: revenueCatConnectionsStatus.some((connection) => connection.ready),
    missing: revenueCatConnectionsStatus.some((connection) => connection.ready) ? [] : ["RevenueCat API key + project ID"],
    fields: revenueCatConnectionsStatus.flatMap((connection) => connection.fields),
    connections: revenueCatConnectionsStatus
  };

  return {
    appStoreConnect: asc,
    appleAds: ads,
    revenueCat,
    server: { port: PORT, docs: "https://developer.apple.com/documentation/apple_ads/apple-search-ads-campaign-management-api-5" }
  };
}

function diagnosticsPayload() {
  const appStoreConnect = [
    checkValue("ASC_KEY_ID", process.env.ASC_KEY_ID, "Required for App Store Connect JWT header."),
    checkValue("ASC_ISSUER_ID", process.env.ASC_ISSUER_ID, "Required for App Store Connect JWT issuer."),
    checkPrivateKey("ASC_PRIVATE_KEY_PATH", process.env.ASC_PRIVATE_KEY_PATH, () => createAppStoreConnectJwt()),
    checkValue("ASC_VENDOR_NUMBER", process.env.ASC_VENDOR_NUMBER, "Required for Sales and Trends report downloads.", false)
  ];

  const appleAds = [
    checkValue("APPLE_ADS_CLIENT_ID", process.env.APPLE_ADS_CLIENT_ID, "Required for Apple Ads OAuth client credentials."),
    checkValue("APPLE_ADS_TEAM_ID", process.env.APPLE_ADS_TEAM_ID, "Required as issuer when building the Apple Ads client secret."),
    checkValue("APPLE_ADS_KEY_ID", process.env.APPLE_ADS_KEY_ID, "Required in the Apple Ads client secret JWT header."),
    checkPrivateKey("APPLE_ADS_PRIVATE_KEY_PATH", process.env.APPLE_ADS_PRIVATE_KEY_PATH, () => createAppleAdsClientSecret()),
    checkValue("APPLE_ADS_ORG_ID", process.env.APPLE_ADS_ORG_ID, "Required for X-AP-Context org selection.")
  ];

  const inAppPurchase = [
    checkValue("IAP_KEY_ID", process.env.IAP_KEY_ID, "Required for App Store Server API JWT header."),
    checkValue("IAP_ISSUER_ID", process.env.IAP_ISSUER_ID || process.env.ASC_ISSUER_ID, "Required for App Store Server API JWT issuer."),
    checkPrivateKey("IAP_PRIVATE_KEY_PATH", process.env.IAP_PRIVATE_KEY_PATH, () => createIapJwt())
  ];

  const revenueCat = [
    checkValue("REVENUECAT_API_KEY", process.env.REVENUECAT_API_KEY, "Required for RevenueCat API v2 metrics."),
    checkValue("REVENUECAT_PROJECT_ID", process.env.REVENUECAT_PROJECT_ID, "Required for RevenueCat project metrics."),
    checkValue("REVENUECAT_BLUEPRINT_API_KEY", process.env.REVENUECAT_BLUEPRINT_API_KEY, "Optional RevenueCat key for Blueprint AI.", false),
    checkValue("REVENUECAT_BLUEPRINT_PROJECT_ID", process.env.REVENUECAT_BLUEPRINT_PROJECT_ID, "Optional RevenueCat project ID for Blueprint AI.", false),
    checkValue("REVENUECAT_CUP_COMPANION_API_KEY", process.env.REVENUECAT_CUP_COMPANION_API_KEY, "Optional RevenueCat key for Cup Companion.", false),
    checkValue("REVENUECAT_CUP_COMPANION_PROJECT_ID", process.env.REVENUECAT_CUP_COMPANION_PROJECT_ID, "Optional RevenueCat project ID for Cup Companion.", false),
    checkValue("REVENUECAT_LEGEND_RUN_API_KEY", process.env.REVENUECAT_LEGEND_RUN_API_KEY, "Optional RevenueCat key for Legend Run: 82-0.", false),
    checkValue("REVENUECAT_LEGEND_RUN_PROJECT_ID", process.env.REVENUECAT_LEGEND_RUN_PROJECT_ID, "Optional RevenueCat project ID for Legend Run: 82-0.", false)
  ];

  return {
    generatedAt: new Date().toISOString(),
    appStoreConnect,
    inAppPurchase,
    revenueCat,
    appleAds,
    summary: {
      appStoreConnectReady: appStoreConnect.filter((item) => item.required !== false).every((item) => item.ok),
      inAppPurchaseReady: inAppPurchase.every((item) => item.ok),
      revenueCatReady: statusPayload().revenueCat.ready,
      appleAdsReady: appleAds.every((item) => item.ok)
    }
  };
}

function keyCandidatesPayload() {
  const home = process.env.HOME || "";
  const searchRoots = [
    root,
    home ? join(home, "Downloads") : "",
    home ? join(home, "Desktop") : "",
    home ? join(home, "Documents") : ""
  ].filter(Boolean);
  const configuredKeyIds = [
    process.env.ASC_KEY_ID,
    process.env.IAP_KEY_ID,
    process.env.APPLE_ADS_KEY_ID
  ].filter(Boolean);

  const seen = new Set();
  const candidates = [];
  for (const searchRoot of searchRoots) {
    collectP8Candidates(searchRoot, candidates, seen, configuredKeyIds, 0);
  }

  candidates.sort((a, b) => Number(b.matchesConfiguredKey) - Number(a.matchesConfiguredKey) || Number(b.knownKey) - Number(a.knownKey) || b.modifiedAt.localeCompare(a.modifiedAt));
  return {
    generatedAt: new Date().toISOString(),
    searchRoots,
    configuredKeyIds: configuredKeyIds.map(mask),
    candidates: candidates.slice(0, 50),
    truncated: candidates.length > 50
  };
}

function collectP8Candidates(dir, candidates, seen, configuredKeyIds, depth) {
  if (!dir || depth > 3 || candidates.length > 100) return;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (seen.has(fullPath)) continue;
    seen.add(fullPath);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "Library") continue;
      collectP8Candidates(fullPath, candidates, seen, configuredKeyIds, depth + 1);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".p8")) continue;
    let stats;
    try {
      stats = statSync(fullPath);
    } catch {
      continue;
    }
    const knownKey = knownAppleKeys.find((key) => entry.name.includes(key.keyId));
    const matchesAscKey = process.env.ASC_KEY_ID ? entry.name.includes(process.env.ASC_KEY_ID) : false;
    const matchesIapKey = process.env.IAP_KEY_ID ? entry.name.includes(process.env.IAP_KEY_ID) : false;
    const matchesAdsKey = process.env.APPLE_ADS_KEY_ID ? entry.name.includes(process.env.APPLE_ADS_KEY_ID) : false;
    const matchesConfiguredKey = configuredKeyIds.some((keyId) => entry.name.includes(keyId));
    candidates.push({
      path: fullPath,
      fileName: entry.name,
      size: stats.size,
      modifiedAt: stats.mtime.toISOString(),
      matchesConfiguredKey,
      matchesAscKey,
      matchesIapKey,
      matchesAdsKey,
      knownKey,
      suggestedFor: suggestedKeyTarget(entry.name)
    });
  }
}

function keyCatalogPayload() {
  const candidates = keyCandidatesPayload().candidates;
  return {
    issuerId: process.env.ASC_ISSUER_ID || "",
    keys: knownAppleKeys.map((key) => ({
      ...key,
      configuredForAsc: key.keyId === process.env.ASC_KEY_ID,
      configuredForIap: key.keyId === process.env.IAP_KEY_ID,
      localCandidate: candidates.find((candidate) => candidate.fileName.includes(key.keyId)) || null
    }))
  };
}

function suggestedKeyTarget(fileName) {
  if (process.env.ASC_KEY_ID && fileName.includes(process.env.ASC_KEY_ID)) return "ASC_PRIVATE_KEY_PATH";
  if (process.env.IAP_KEY_ID && fileName.includes(process.env.IAP_KEY_ID)) return "IAP_PRIVATE_KEY_PATH";
  if (process.env.APPLE_ADS_KEY_ID && fileName.includes(process.env.APPLE_ADS_KEY_ID)) return "APPLE_ADS_PRIVATE_KEY_PATH";
  return "";
}

function checkValue(name, value, message, required = true) {
  return {
    name,
    ok: Boolean(value) || required === false,
    required,
    status: value ? "present" : required === false ? "optional" : "missing",
    value: value ? mask(value) : "",
    message
  };
}

function checkPrivateKey(name, rawPath, signer) {
  if (!rawPath) {
    return { name, ok: false, required: true, status: "missing", value: "", message: "Add a local path to the .p8 key file." };
  }
  const expanded = expandHome(rawPath);
  if (!existsSync(expanded)) {
    return { name, ok: false, required: true, status: "not-found", value: mask(rawPath), message: "The configured .p8 path does not exist on this machine." };
  }
  try {
    signer();
    return { name, ok: true, required: true, status: "signs", value: mask(rawPath), message: "The key file exists and can sign an ES256 JWT." };
  } catch (error) {
    return { name, ok: false, required: true, status: "signing-failed", value: mask(rawPath), message: error.message };
  }
}

function yesterdayIsoDate() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function todayIsoDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgoIsoDate(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function reportDateRange(url) {
  const endDate = url.searchParams.get("endDate") || todayIsoDate();
  const startDate = url.searchParams.get("startDate") || endDate;
  return { startDate, endDate };
}

function configPayload() {
  return {
    values: Object.fromEntries(editableEnvKeys.map((key) => [key, configDefault(key)])),
    writable: true,
    envPath,
    knownKeys: knownAppleKeys
  };
}

function configDefault(key) {
  if (process.env[key]) return process.env[key];
  if (key === "IAP_ISSUER_ID") return process.env.ASC_ISSUER_ID || "";
  return "";
}

async function saveConfig(req) {
  const payload = await readJsonBody(req);
  const values = {};
  for (const key of editableEnvKeys) {
    const value = typeof payload[key] === "string" ? payload[key].trim() : "";
    values[key] = value;
    if (value) process.env[key] = value;
    else delete process.env[key];
  }
  if (!values.IAP_ISSUER_ID) {
    values.IAP_ISSUER_ID = values.ASC_ISSUER_ID;
    process.env.IAP_ISSUER_ID = values.IAP_ISSUER_ID;
  }
  writeFileSync(envPath, renderEnv(values));
  return { saved: true, envPath, status: statusPayload() };
}

function readJsonBody(req, maxBytes = 32_000) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        rejectBody(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        rejectBody(new Error("Invalid JSON body"));
      }
    });
    req.on("error", rejectBody);
  });
}

function readRawBody(req, maxBytes = 32_000) {
  return new Promise((resolveBody, rejectBody) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        rejectBody(new Error("Request body is too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolveBody(body));
    req.on("error", rejectBody);
  });
}

function renderEnv(values) {
  return [
    "# Apple Growth Console local config",
    "# Private key values are not stored here; use paths to .p8 files on this machine.",
    "",
    "# App Store Connect API",
    `ASC_KEY_ID=${quoteEnv(values.ASC_KEY_ID)}`,
    `ASC_ISSUER_ID=${quoteEnv(values.ASC_ISSUER_ID)}`,
    `ASC_PRIVATE_KEY_PATH=${quoteEnv(values.ASC_PRIVATE_KEY_PATH)}`,
    `ASC_VENDOR_NUMBER=${quoteEnv(values.ASC_VENDOR_NUMBER)}`,
    "",
    "# In-App Purchase / App Store Server API",
    `IAP_KEY_ID=${quoteEnv(values.IAP_KEY_ID)}`,
    `IAP_ISSUER_ID=${quoteEnv(values.IAP_ISSUER_ID || values.ASC_ISSUER_ID)}`,
    `IAP_PRIVATE_KEY_PATH=${quoteEnv(values.IAP_PRIVATE_KEY_PATH)}`,
    "",
    "# RevenueCat API v2",
    `REVENUECAT_API_KEY=${quoteEnv(values.REVENUECAT_API_KEY)}`,
    `REVENUECAT_PROJECT_ID=${quoteEnv(values.REVENUECAT_PROJECT_ID)}`,
    `REVENUECAT_BLUEPRINT_API_KEY=${quoteEnv(values.REVENUECAT_BLUEPRINT_API_KEY)}`,
    `REVENUECAT_BLUEPRINT_PROJECT_ID=${quoteEnv(values.REVENUECAT_BLUEPRINT_PROJECT_ID)}`,
    `REVENUECAT_CUP_COMPANION_API_KEY=${quoteEnv(values.REVENUECAT_CUP_COMPANION_API_KEY)}`,
    `REVENUECAT_CUP_COMPANION_PROJECT_ID=${quoteEnv(values.REVENUECAT_CUP_COMPANION_PROJECT_ID)}`,
    `REVENUECAT_LEGEND_RUN_API_KEY=${quoteEnv(values.REVENUECAT_LEGEND_RUN_API_KEY)}`,
    `REVENUECAT_LEGEND_RUN_PROJECT_ID=${quoteEnv(values.REVENUECAT_LEGEND_RUN_PROJECT_ID)}`,
    `REVENUECAT_LEGEND_RUN_16_API_KEY=${quoteEnv(values.REVENUECAT_LEGEND_RUN_16_API_KEY)}`,
    `REVENUECAT_LEGEND_RUN_16_PROJECT_ID=${quoteEnv(values.REVENUECAT_LEGEND_RUN_16_PROJECT_ID)}`,
    `REVENUECAT_LEGEND_RUN_162_API_KEY=${quoteEnv(values.REVENUECAT_LEGEND_RUN_162_API_KEY)}`,
    `REVENUECAT_LEGEND_RUN_162_PROJECT_ID=${quoteEnv(values.REVENUECAT_LEGEND_RUN_162_PROJECT_ID)}`,
    `REVENUECAT_PERFECT_ALBUM_API_KEY=${quoteEnv(values.REVENUECAT_PERFECT_ALBUM_API_KEY)}`,
    `REVENUECAT_PERFECT_ALBUM_PROJECT_ID=${quoteEnv(values.REVENUECAT_PERFECT_ALBUM_PROJECT_ID)}`,
    `REVENUECAT_PLANTEDU_API_KEY=${quoteEnv(values.REVENUECAT_PLANTEDU_API_KEY)}`,
    `REVENUECAT_PLANTEDU_PROJECT_ID=${quoteEnv(values.REVENUECAT_PLANTEDU_PROJECT_ID)}`,
    "",
    "# Apple Search Ads Campaign Management API v5",
    `APPLE_ADS_CLIENT_ID=${quoteEnv(values.APPLE_ADS_CLIENT_ID)}`,
    `APPLE_ADS_TEAM_ID=${quoteEnv(values.APPLE_ADS_TEAM_ID)}`,
    `APPLE_ADS_KEY_ID=${quoteEnv(values.APPLE_ADS_KEY_ID)}`,
    `APPLE_ADS_PRIVATE_KEY_PATH=${quoteEnv(values.APPLE_ADS_PRIVATE_KEY_PATH)}`,
    `APPLE_ADS_ORG_ID=${quoteEnv(values.APPLE_ADS_ORG_ID)}`,
    ""
  ].join("\n");
}

function quoteEnv(value = "") {
  if (!value) return "";
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function requiredFields(values, required) {
  const fields = Object.entries(values).map(([name, value]) => ({
    name,
    present: Boolean(value),
    value: value ? mask(value) : ""
  }));
  const missing = required.filter((name) => !values[name]);
  return { ready: missing.length === 0, missing, fields };
}

function existingPath(filePath) {
  if (!filePath) return "";
  const expanded = expandHome(filePath);
  return existsSync(expanded) ? expanded : "";
}

function expandHome(filePath) {
  return filePath.replace(/^~(?=$|\/)/, process.env.HOME || "");
}

function createAppStoreConnectJwt() {
  return createEs256Jwt({
    keyId: process.env.ASC_KEY_ID,
    issuer: process.env.ASC_ISSUER_ID,
    subject: undefined,
    audience: "appstoreconnect-v1",
    privateKeyPath: process.env.ASC_PRIVATE_KEY_PATH,
    expiresInSeconds: 20 * 60
  });
}

function createAppleAdsClientSecret() {
  return createEs256Jwt({
    keyId: process.env.APPLE_ADS_KEY_ID,
    issuer: process.env.APPLE_ADS_TEAM_ID,
    subject: process.env.APPLE_ADS_CLIENT_ID,
    audience: "https://appleid.apple.com",
    privateKeyPath: process.env.APPLE_ADS_PRIVATE_KEY_PATH,
    expiresInSeconds: 180 * 24 * 60 * 60
  });
}

function createIapJwt() {
  return createEs256Jwt({
    keyId: process.env.IAP_KEY_ID,
    issuer: process.env.IAP_ISSUER_ID || process.env.ASC_ISSUER_ID,
    subject: undefined,
    audience: "appstoreconnect-v1",
    privateKeyPath: process.env.IAP_PRIVATE_KEY_PATH,
    expiresInSeconds: 20 * 60
  });
}

async function createAppleAdsAccessToken() {
  const clientSecret = createAppleAdsClientSecret();

  const form = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.APPLE_ADS_CLIENT_ID,
    client_secret: clientSecret,
    scope: "searchadsorg"
  });

  const response = await fetch("https://appleid.apple.com/auth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form
  });
  const payload = await passthroughJson(response);
  if (!payload.ok) throw new Error(`Apple Ads OAuth failed with status ${payload.status}`);
  return payload.body.access_token;
}

function createEs256Jwt({ keyId, issuer, subject, audience, privateKeyPath, expiresInSeconds }) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuer,
    aud: audience,
    iat: now,
    exp: now + expiresInSeconds
  };
  if (subject) payload.sub = subject;

  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const signingInput = `${base64urlJson(header)}.${base64urlJson(payload)}`;
  const key = readFileSync(expandHome(privateKeyPath), "utf8");
  const signature = createSign("SHA256").update(signingInput).sign({ key, dsaEncoding: "ieee-p1363" });
  return `${signingInput}.${base64url(signature)}`;
}

function base64urlJson(value) {
  return base64url(Buffer.from(JSON.stringify(value)));
}

function base64url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function mask(value) {
  if (value.length <= 8) return "present";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function loadEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (process.env[key]) continue;
    process.env[key] = rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
}
