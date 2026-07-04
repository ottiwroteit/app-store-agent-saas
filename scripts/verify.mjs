import { chromium } from "/Users/otti/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
const errors = [];

page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto("http://127.0.0.1:4177", { waitUntil: "networkidle" });
await page.locator('.date-controls input[name="startDate"]').fill("2026-06-04");
await page.locator('.date-controls input[name="endDate"]').fill("2026-06-10");
await page.getByRole("button", { name: /Apply/ }).click();
await page.waitForFunction(() => !document.querySelector("#connection-label")?.textContent?.includes("Loading data"), null, { timeout: 90000 });
await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("bid optimization matrix"), null, { timeout: 90000 });
await page.screenshot({ path: "/private/tmp/apple-growth-console-1440.png", fullPage: true });

const title = await page.locator("#view-title").textContent();
const kpis = await page.locator(".kpi").count();
const rows = await page.locator("tbody tr").count();
const status = await page.locator("#connection-label").textContent();
const syncText = await page.locator("#view").innerText();
const syncTextLower = syncText.toLowerCase();
const dashboardShowsGrowthBrief = syncTextLower.includes("growth brief");
const dashboardShowsLiveCampaign = syncText.includes("Cup Companion Search");
const dashboardHidesSyncDetails = await page.locator(".sync-detail-card").count() === 0;
const dashboardShowsRoas = syncTextLower.includes("est. roas");
const dashboardHidesRevenueCatActuals = !syncText.includes("RevenueCat Actuals") && !syncText.includes("RevenueCat reports");
const dashboardShowsBidMatrix = syncTextLower.includes("bid optimization matrix");
const dashboardHidesBackendButtons = await page.locator("#probe-button.is-hidden").count() === 1 && await page.locator("#sync-button.is-hidden").count() === 1;
const dashboardHidesOldChart = !syncText.includes("Spend vs Taps by Campaign");
const dateControls = await page.locator(".date-controls input").count();
const overviewRange = await fetch("http://127.0.0.1:4177/api/overview?startDate=2026-06-04&endDate=2026-06-10").then((response) => response.json());
const rankRescueApi = await fetch("http://127.0.0.1:4177/api/rank-rescue?startDate=2026-06-25&endDate=2026-06-25&appId=6779005725&country=US&baselineRank=60").then((response) => response.json());
const asoSaasApi = await fetch("http://127.0.0.1:4177/api/aso-saas?startDate=2026-06-25&endDate=2026-06-25&appUrl=https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2Flegend-run-82-0%2Fid6779005725&country=US&keywords=82-0%2C82%20and%200%2Cbasketball%20simulator%2Cfootball%20game&baselineRank=60").then((response) => response.json());
const genericAsoSaasApi = await fetch("http://127.0.0.1:4177/api/aso-saas?appUrl=https%3A%2F%2Fapps.apple.com%2Fus%2Fapp%2Fchatgpt%2Fid6448311069&country=US&keywords=ai%20assistant%2Cchatbot%2Cai%20chat").then((response) => response.json());
const directSignup = await fetch("http://127.0.0.1:4177/api/aso-saas/signup", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "direct-verify@example.com",
    company: "Direct Verify Studio",
    phone: "+13135551212",
    plan: "Growth",
    appUrl: "https://apps.apple.com/us/app/legend-run-82-0/id6779005725",
    country: "US",
    keywords: "82-0,82 and 0,basketball simulator,football game"
  })
}).then((response) => response.json());
const directAccess = new URLSearchParams({
  workspaceId: directSignup.access?.workspaceId || "",
  token: directSignup.access?.token || ""
});
const directAddApp = await fetch(`http://127.0.0.1:4177/api/aso-saas/apps?${directAccess}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    appUrl: "https://apps.apple.com/us/app/chatgpt/id6448311069",
    country: "US",
    baselineRank: 1,
    keywords: "ai assistant, chatbot, ai chat"
  })
}).then((response) => response.json());
const directAddCompetitor = await fetch(`http://127.0.0.1:4177/api/aso-saas/competitors?${directAccess}&appId=6448311069`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    competitorUrl: "https://apps.apple.com/us/app/claude-by-anthropic/id6473753684",
    keywords: "ai assistant, chatbot, ai chat"
  })
}).then((response) => response.json());
const directCompetitors = await fetch(`http://127.0.0.1:4177/api/aso-saas/competitors?${directAccess}&appId=6448311069`).then((response) => response.json());
const appleAdsImportCsv = `Search Term,Keyword,Match Type,Spend,Taps,Installs,Impressions,Campaign,Ad Group
ai chatbot,ai chat,EXACT,$12.50,20,5,400,ChatGPT Imported Apple Ads,Exact
bad ai app,ai app,BROAD,$9.00,12,0,250,ChatGPT Imported Apple Ads,Broad`;
const directAppleAdsImport = await fetch(`http://127.0.0.1:4177/api/aso-saas/apple-ads-import?${directAccess}&appId=6448311069`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceName: "Verifier Apple Ads CSV",
    csv: appleAdsImportCsv
  })
}).then((response) => response.json());
const directMetadataImport = await fetch(`http://127.0.0.1:4177/api/aso-saas/metadata-import?${directAccess}&appId=6448311069`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceName: "Verifier ASC Metadata",
    locale: "en-US",
    title: "ChatGPT",
    subtitle: "AI assistant and chatbot",
    keywordField: "ai chat,assistant,writing,answers",
    screenshotCount: 8,
    description: "ChatGPT is an AI assistant for writing, answers, brainstorming, and everyday productivity."
  })
}).then((response) => response.json());
const directKeywordUpdate = await fetch(`http://127.0.0.1:4177/api/aso-saas/keywords?${directAccess}&appId=6448311069`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "add",
    keywords: "best ai app, writing assistant"
  })
}).then((response) => response.json());
const reviewImportCsv = `Rating,Title,Body,Date,Version
1,Paywall too early,I could not finish my first session before the unlock paywall appeared.,2026-06-25,1.0
2,Confusing start,The app asked me to subscribe before I understood the first run.,2026-06-25,1.0
5,Useful app,Helpful and fun once I understood it.,2026-06-25,1.0`;
const directReviewImport = await fetch(`http://127.0.0.1:4177/api/aso-saas/reviews-import?${directAccess}&appId=6448311069`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sourceName: "Verifier App Store Reviews",
    csv: reviewImportCsv
  })
}).then((response) => response.json());
const directWorkspace = await fetch(`http://127.0.0.1:4177/api/aso-saas/workspace?${directAccess}`).then((response) => response.json());
const directDigest = await fetch(`http://127.0.0.1:4177/api/aso-saas/digest?${directAccess}`).then((response) => response.json());
const directSecondAppDigest = await fetch(`http://127.0.0.1:4177/api/aso-saas/digest?${directAccess}&appId=6448311069`).then((response) => response.json());
const directSendDigest = await fetch(`http://127.0.0.1:4177/api/aso-saas/send-digest?${directAccess}&appId=6448311069`, { method: "POST" }).then((response) => response.json());
const directMonitor = await fetch(`http://127.0.0.1:4177/api/aso-saas/monitor?workspaceId=${encodeURIComponent(directSignup.access?.workspaceId || "")}&send=none&maxApps=2`, { method: "POST" }).then((response) => response.json());
const directHistory = await fetch(`http://127.0.0.1:4177/api/aso-saas/history?${directAccess}&appId=6448311069`).then((response) => response.json());
const directWebhook = await fetch("http://127.0.0.1:4177/api/aso-saas/stripe-webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    id: "evt_verify_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_verify",
        customer: "cus_verify",
        subscription: "sub_verify",
        metadata: { workspaceId: directSignup.workspace?.id || "" },
        status: "complete"
      }
    }
  })
}).then((response) => response.json());

await page.locator('[data-tab="credentials"]').click({ force: true });
await page.waitForFunction(() => document.querySelector("#view-title")?.textContent === "Credentials");
await page.getByRole("button", { name: /Probe APIs/ }).click();
await page.waitForTimeout(250);
const probeText = await page.locator("#side-panel").innerText();

await page.locator('[data-tab="reports"]').click();
await page.waitForTimeout(250);
await page.screenshot({ path: "/private/tmp/apple-growth-console-reports.png", fullPage: true });
const reportsText = await page.locator("#view").innerText();
const reportsLogText = await page.locator("#side-panel").innerText();
const [ascReportProbe, adsReportProbe] = await Promise.all([
  fetch("http://127.0.0.1:4177/api/app-store-connect/sales-report").then((response) => response.json()),
  fetch("http://127.0.0.1:4177/api/apple-ads/reports/campaigns").then((response) => response.json())
]);

await page.locator('[data-tab="store"]').click();
await page.waitForTimeout(250);
const storeText = await page.locator("#view").innerText();
const storeTextLower = storeText.toLowerCase();
const storeShowsRevenueAgent = storeTextLower.includes("revenue agent");
const storeShowsRevenueMetrics = storeText.toLowerCase().includes("est. gross mrr") && storeText.toLowerCase().includes("apple share") && storeText.toLowerCase().includes("downloads");
const storeShowsAssumptions = storeTextLower.includes("revenue assumptions");
const storeShowsActualAccess = storeTextLower.includes("actual app store data access") && storeTextLower.includes("revenue and subscriptions") && storeTextLower.includes("downloads and app analytics");
const storeHidesRevenueCatActuals = !storeText.includes("RevenueCat Actuals") && !storeText.includes("subscriptions live via RevenueCat");
const storeShowsBlockedAscActuals = storeText.toLowerCase().includes("actual data") && storeText.includes("403");
const storeHidesAppMetadataTable = await page.locator(".asc-apps-table tbody tr").count() === 0;
const storeHidesBackendButtons = await page.locator("#probe-button.is-hidden").count() === 1 && await page.locator("#sync-button.is-hidden").count() === 1;

await page.locator('[data-tab="ads"]').click();
await page.waitForTimeout(250);
const adsText = await page.locator("#view").innerText();
const adsTextLower = adsText.toLowerCase();
const adsShowsGrowthAgent = adsTextLower.includes("apple ads optimizer");
const adsShowsKeywordPlan = adsTextLower.includes("competitive keyword plan");
const adsShowsSearchTermActions = adsTextLower.includes("search term actions") && adsTextLower.includes("promote to exact");
const adsShowsKeywordBidChanges = adsTextLower.includes("keyword bid changes") && adsTextLower.includes("raise / protect");
const adsShowsRealSearchTerm = adsText.includes("olive food scanner") || adsText.includes("yuca") || adsText.includes("dr livingood scanner");
const adsShowsRealKeyword = adsText.includes("ultra processed food scanner") || adsText.includes("miami world cup");
const adsShowsBidMatrix = adsTextLower.includes("bid optimization matrix") && adsTextLower.includes("est. roas");
const adsCampaignFilterVisible = await page.locator("#search-term-campaign-filter").count() === 1;
const adsCampaignFilterButtonsVisible = await page.locator("[data-search-term-filter]").count() >= 4;
const adsCampaignFilterOptions = await page.locator("#search-term-campaign-filter option").evaluateAll((options) => options.map((option) => option.textContent));
const cupCampaignFilterValue = await page.locator("#search-term-campaign-filter option").evaluateAll((options) => options.find((option) => option.textContent?.includes("Cup Companion Search"))?.value || "");
if (cupCampaignFilterValue) await page.locator(`[data-search-term-filter="${cupCampaignFilterValue}"]`).click();
await page.waitForTimeout(250);
const cupFilteredText = await page.locator(".panel", { hasText: "Search Term Actions" }).innerText();
const adsCampaignFilterNarrowsRows = Boolean(cupCampaignFilterValue) && cupFilteredText.includes("Cup Companion Search") && cupFilteredText.includes("miami world cup") && !cupFilteredText.includes("olive food scanner");
const adsHidesSyncDetails = await page.locator(".sync-detail-card").count() === 0;
const adsHidesBackendButtons = await page.locator("#probe-button.is-hidden").count() === 1 && await page.locator("#sync-button.is-hidden").count() === 1;

await page.locator('[data-tab="aso"]').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/private/tmp/apple-growth-console-aso.png", fullPage: true });
const asoText = await page.locator("#view").innerText();
const asoTextLower = asoText.toLowerCase();
const asoShowsOpportunityAgent = asoTextLower.includes("aso opportunity agent");
const asoShowsKeywordMonitor = asoTextLower.includes("aso keyword monitor");
const asoShowsCompetitors = asoTextLower.includes("organic competitor snapshot");
const asoShowsLiveKeyword = asoText.includes("ultra processed food scanner") || asoText.includes("olive food scanner") || asoText.includes("miami world cup");
const asoShowsRank = asoText.includes(">50") || asoText.includes("rank");
const asoRows = await page.locator(".aso-table tbody tr").count();

await page.locator('[data-tab="rank"]').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/private/tmp/apple-growth-console-rank-rescue.png", fullPage: true });
const rankText = await page.locator("#view").innerText();
const rankTextLower = rankText.toLowerCase();
const rankTitle = await page.locator("#view-title").textContent();
const rankShowsLegendRun = rankTextLower.includes("legend run: 82-0");
const rankShowsRank = rankTextLower.includes("sports rank") && rankText.includes("#");
const rankShowsRatingRisk = rankTextLower.includes("repair rating drag") || rankTextLower.includes("rating drag");
const rankShowsProtect82 = rankText.includes("Protect 82-0") || rankText.includes("82-0");
const rankShowsAppfiguresAstro = rankText.includes("Appfigures") && rankText.includes("Astro");
const rankShowsHistory = rankTextLower.includes("rank history") && rankTextLower.includes("rank-history.json");
const rankShowsSources = rankTextLower.includes("data sources") && rankTextLower.includes("app store public page");
const rankHidesBackendButtons = await page.locator("#probe-button.is-hidden").count() === 1 && await page.locator("#sync-button.is-hidden").count() === 1;
const rankApiHasCurrentRank = Number.isFinite(rankRescueApi.current?.categoryRank);
const rankApiHasHistory = Array.isArray(rankRescueApi.history?.recent) && rankRescueApi.history.recent.length > 0;
const rankApiProtects82 = (rankRescueApi.keywords?.protected || []).some((row) => row.keyword === "82-0" && row.action === "defend");
const rankApiHasCompetitorBlueprint = (rankRescueApi.competitiveBlueprint?.competitors || []).some((competitor) => competitor.name === "Astro")
  && (rankRescueApi.competitiveBlueprint?.competitors || []).some((competitor) => competitor.name === "Appfigures");

await page.locator('[data-tab="saas"]').click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/private/tmp/apple-growth-console-aso-saas.png", fullPage: true });
const saasTitle = await page.locator("#view-title").textContent();
const saasText = await page.locator("#view").innerText();
const saasTextLower = saasText.toLowerCase();
const saasShowsOnboarding = saasTextLower.includes("app onboarding") && saasTextLower.includes("app store url");
const saasShowsActionQueue = saasTextLower.includes("customer action queue") && saasTextLower.includes("fix rating");
const saasShowsKeywordProspecting = saasTextLower.includes("keyword prospecting") && saasText.includes("82-0");
const saasShowsCompetitors = saasTextLower.includes("competitor keyword snapshot") && saasText.includes("Madden");
const saasShowsPricing = saasTextLower.includes("go-to-market package") && saasText.includes("$29/mo") && saasText.includes("$79/mo");
const saasShowsTeardown = saasText.includes("Appfigures") && saasText.includes("Astro") && saasTextLower.includes("safe build path");
const saasShowsLaunchReadiness = saasTextLower.includes("launch readiness") && saasTextLower.includes("production storage") && saasTextLower.includes("stripe checkout");
const saasHidesBackendButtons = await page.locator("#probe-button.is-hidden").count() === 1 && await page.locator("#sync-button.is-hidden").count() === 1;
await page.locator('#aso-signup-form input[name="email"]').fill("verify-aso@example.com");
await page.locator('#aso-signup-form input[name="company"]').fill("Verify ASO Studio");
await page.locator('#aso-signup-form select[name="plan"]').selectOption("Growth");
await page.locator('#aso-signup-form button[type="submit"]').click();
await page.waitForFunction(() => document.body.innerText.includes("Workspace ws_"), null, { timeout: 90000 });
const saasSignupText = await page.locator(".saas-signup").innerText();
const saasSignupCreated = saasSignupText.includes("Workspace ws_") && saasSignupText.includes("local-trial");
const saasWorkspaceListed = saasSignupText.includes("verify-aso@example.com") && saasSignupText.includes("Verify ASO Studio");
const workspacesApi = await fetch("http://127.0.0.1:4177/api/aso-saas/workspaces").then((response) => response.json());
const readinessApi = await fetch("http://127.0.0.1:4177/api/aso-saas/readiness").then((response) => response.json());
const saasWorkspacesApiHasSignup = (workspacesApi.workspaces || []).some((workspace) => workspace.email === "verify-aso@example.com" && workspace.checkoutMode === "local-trial");
const saasStorageMode = workspacesApi.storage?.mode || "";
const saasStorageConfiguredOrFallbackWorks = saasStorageMode === "supabase"
  || (saasStorageMode === "local-json" && (workspacesApi.storage?.missingEnv || []).includes("SUPABASE_URL"));
const saasReadinessApiWorks = Boolean(
  readinessApi.ready
  && ["production-ready", "setup-required"].includes(readinessApi.launchReadiness?.mode)
  && (readinessApi.launchReadiness?.checks || []).some((check) => check.key === "safe-data-path" && check.ready)
  && (readinessApi.launchReadiness?.checks || []).some((check) => check.key === "stripe-checkout")
);
const saasApiReady = Boolean(asoSaasApi.ready);
const saasApiHasActions = (asoSaasApi.actions || []).length >= 4;
const saasApiHasCompetitors = (asoSaasApi.competitors || []).length > 0;
const saasApiExcludesSelfCompetitor = !(asoSaasApi.competitors || []).some((competitor) => competitor.name === asoSaasApi.app?.name);
const saasApiHasPricing = (asoSaasApi.product?.tiers || []).some((tier) => tier.price === "$29/mo")
  && (asoSaasApi.product?.tiers || []).some((tier) => tier.price === "$79/mo");
const saasApiHasMetadataAudit = Boolean(asoSaasApi.metadata?.ready && Number.isFinite(asoSaasApi.metadata?.score) && (asoSaasApi.metadata?.coverage?.rows || []).length > 0);
const genericSaasApiWorks = Boolean(genericAsoSaasApi.ready && genericAsoSaasApi.app?.appId === "6448311069" && (genericAsoSaasApi.keywords?.rows || []).length > 0);
const genericSaasMetadataWorks = Boolean(genericAsoSaasApi.metadata?.ready && (genericAsoSaasApi.metadata?.coverage?.rows || []).length > 0);
const genericSaasKeywordFieldOptimizerWorks = Boolean(
  genericAsoSaasApi.metadata?.keywordFieldPlan?.ready
  && genericAsoSaasApi.metadata?.keywordFieldPlan?.optimized
  && Number(genericAsoSaasApi.metadata?.keywordFieldPlan?.optimizedLength || 0) <= 100
);

await page.locator('[data-tab="credentials"]').click({ force: true });
await page.waitForFunction(() => document.querySelector("#view-title")?.textContent === "Credentials");
await page.waitForSelector('#config-form input[name="ASC_KEY_ID"]', { timeout: 10000 });
await page.waitForTimeout(250);
const candidateButtons = await page.locator(".apply-key-button").count();
const setKeyAndPathButtons = await page.locator(".apply-key-and-path-button").count();
await page.screenshot({ path: "/private/tmp/apple-growth-console-credentials.png", fullPage: true });
const credentialText = await page.locator("#view").innerText();
const readinessCards = await page.locator(".readiness-card").count();
const readinessText = await page.locator(".readiness-grid").innerText();
const syncDetailCards = await page.locator(".sync-detail-card").count();
const configPayload = await fetch("http://127.0.0.1:4177/api/config").then((response) => response.json());
const configInputs = Object.keys(configPayload.values || {}).length;
const knownKeyButtons = await page.locator(".apply-value-button").count();
const setupSteps = await page.locator(".setup-step").count();
const formValues = configPayload.values || {};
const keyValue = formValues.ASC_KEY_ID;
const issuerValue = formValues.ASC_ISSUER_ID;
const iapKeyValue = formValues.IAP_KEY_ID;
const saveWorked = Boolean(configPayload.writable);

await page.setViewportSize({ width: 390, height: 900 });
await page.locator('[data-tab="dashboard"]').click();
await page.screenshot({ path: "/private/tmp/apple-growth-console-mobile.png", fullPage: true });
const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

await page.setViewportSize({ width: 1440, height: 1100 });
await page.goto("http://127.0.0.1:4177/aso-saas.html", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("action queue"), null, { timeout: 90000 });
await page.screenshot({ path: "/private/tmp/apple-growth-console-public-aso-saas.png", fullPage: true });
const publicSaasText = await page.locator("body").innerText();
const publicSaasTextLower = publicSaasText.toLowerCase();
const publicSaasShowsAnalyzer = publicSaasTextLower.includes("rank rescue") && publicSaasTextLower.includes("analyze app");
const publicSaasShowsActions = publicSaasTextLower.includes("action queue") && publicSaasTextLower.includes("fix rating");
const publicSaasShowsKeywords = publicSaasTextLower.includes("keyword prospecting") && publicSaasText.includes("82-0");
const publicSaasShowsCompetitors = publicSaasTextLower.includes("competitive keywords") && publicSaasText.includes("Madden");
const publicSaasShowsMetadataAudit = publicSaasTextLower.includes("listing audit") && publicSaasTextLower.includes("score") && publicSaasTextLower.includes("screenshots");
const publicSaasShowsKeywordFieldOptimizer = publicSaasTextLower.includes("keyword field optimizer");
await page.locator('#public-signup-form input[name="email"]').fill("public-verify@example.com");
await page.locator('#public-signup-form input[name="company"]').fill("Public Verify Studio");
await page.locator('#public-signup-form input[name="phone"]').fill("+13135551212");
await page.locator('#public-signup-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Workspace ws_"), null, { timeout: 90000 });
await page.waitForFunction(() => document.querySelector("#public-workspace")?.textContent?.includes("Daily Digest"), null, { timeout: 90000 });
const publicSignupStatus = await page.locator("#public-status").textContent();
await page.locator('#public-add-app-form input[name="appUrl"]').fill("https://apps.apple.com/us/app/chatgpt/id6448311069");
await page.locator('#public-add-app-form textarea[name="keywords"]').fill("ai assistant, chatbot, ai chat");
await page.locator('#public-add-app-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Added"), null, { timeout: 90000 });
await page.waitForFunction(() => document.querySelector("#public-workspace")?.textContent?.includes("ChatGPT"), null, { timeout: 90000 });
await page.locator('#public-keyword-tracker-form textarea[name="keywords"]').fill("best ai app, writing assistant");
await page.locator('#public-keyword-tracker-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Tracking"), null, { timeout: 90000 });
await page.waitForFunction(() => document.querySelector("#public-workspace")?.textContent?.includes("best ai app"), null, { timeout: 90000 });
await page.locator('#public-reviews-import-form input[name="sourceName"]').fill("Public Verifier Reviews");
await page.locator('#public-reviews-import-form textarea[name="csv"]').fill(reviewImportCsv);
await page.locator('#public-reviews-import-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Imported 3 review rows"), null, { timeout: 90000 });
await page.locator('#public-add-competitor-form input[name="competitorUrl"]').fill("https://apps.apple.com/us/app/claude-by-anthropic/id6473753684");
await page.locator('#public-add-competitor-form textarea[name="keywords"]').fill("ai assistant, chatbot, ai chat");
await page.locator('#public-add-competitor-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Added competitor"), null, { timeout: 90000 });
await page.waitForFunction(() => document.querySelector("#public-workspace")?.textContent?.includes("Claude"), null, { timeout: 90000 });
await page.locator('#public-metadata-import-form input[name="title"]').fill("ChatGPT");
await page.locator('#public-metadata-import-form input[name="subtitle"]').fill("AI assistant and chatbot");
await page.locator('#public-metadata-import-form textarea[name="keywordField"]').fill("ai chat,assistant,writing,answers");
await page.locator('#public-metadata-import-form input[name="screenshotCount"]').fill("8");
await page.locator('#public-metadata-import-form textarea[name="description"]').fill("ChatGPT is an AI assistant for writing, answers, brainstorming, and everyday productivity.");
await page.locator('#public-metadata-import-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Imported en-US metadata"), null, { timeout: 90000 });
await page.locator('#public-ads-import-form input[name="sourceName"]').fill("Public Verifier Apple Ads CSV");
await page.locator('#public-ads-import-form textarea[name="csv"]').fill(appleAdsImportCsv);
await page.locator('#public-ads-import-form button[type="submit"]').click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Imported 2 Apple Ads rows"), null, { timeout: 90000 });
await page.locator("[data-send-digest]").click();
await page.waitForFunction(() => document.querySelector("#public-status")?.textContent?.includes("Digest processed"), null, { timeout: 90000 });
const publicSendStatus = await page.locator("#public-status").textContent();
const publicWorkspaceText = await page.locator("#public-workspace").innerText();
const publicWorkspaceTextLower = publicWorkspaceText.toLowerCase();
const publicSaasSignupWorks = publicSignupStatus.includes("Workspace ws_") && publicSignupStatus.includes("Local trial");
const publicSaasShowsDigest = publicWorkspaceTextLower.includes("daily digest") && publicWorkspaceTextLower.includes("rank rescue");
const publicSaasShowsHistory = publicWorkspaceTextLower.includes("rank history") && publicWorkspaceTextLower.includes("snapshots");
const publicSaasShowsHistoryTrends = publicSaasShowsHistory
  && publicWorkspaceTextLower.includes("7d rank")
  && publicWorkspaceTextLower.includes("30d rank")
  && publicWorkspaceTextLower.includes("keyword movement");
const publicSaasShowsCompetitorTracker = publicWorkspaceTextLower.includes("competitor keywords") && publicWorkspaceText.includes("Claude");
const publicSaasShowsKeywordTracker = publicWorkspaceTextLower.includes("tracked keywords") && publicWorkspaceTextLower.includes("best ai app");
const publicSaasShowsReviewImport = publicWorkspaceTextLower.includes("review import") && publicWorkspaceTextLower.includes("paywall timing");
const publicSaasShowsMetadataImport = publicWorkspaceTextLower.includes("metadata import") && publicWorkspaceTextLower.includes("customer metadata") && publicWorkspaceTextLower.includes("keywords");
const publicSaasShowsAppleAdsImport = publicWorkspaceTextLower.includes("apple ads import") && publicWorkspaceTextLower.includes("bad ai app") && publicWorkspaceTextLower.includes("lower bid");
const publicSaasSendsDigest = publicSendStatus.includes("Digest processed") && publicWorkspaceTextLower.includes("local-outbox");
const publicSaasMultiAppWorks = publicWorkspaceText.includes("ChatGPT") && publicWorkspaceTextLower.includes("apps");
await page.setViewportSize({ width: 390, height: 900 });
await page.screenshot({ path: "/private/tmp/apple-growth-console-public-aso-saas-mobile.png", fullPage: true });
const publicSaasMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

await browser.close();

console.log(JSON.stringify({
  title,
  status,
  statusShowsPartialLive: status.includes("Partial live"),
  statusShowsLiveReady: status.includes("Live credentials ready"),
  kpis,
  rows,
  errors,
  dashboardShowsGrowthBrief,
  dashboardShowsLiveCampaign,
  dashboardHidesSyncDetails,
  dashboardShowsRoas,
  dashboardHidesRevenueCatActuals,
  dashboardShowsBidMatrix,
  dashboardHidesBackendButtons,
  dashboardHidesOldChart,
  dateControls,
  overviewRange,
  revenueCatReady: overviewRange.revenueCat?.ready,
  revenueCatTotals: overviewRange.revenueCat?.totals,
  revenueCatConnections: overviewRange.revenueCat?.connections?.map((connection) => ({
    id: connection.id,
    label: connection.label,
    ready: connection.ready,
    mode: connection.mode
  })),
  syncShowsSkippedServices: credentialText.includes("failed") || credentialText.includes("skipped"),
  syncShowsCampaignReport: credentialText.includes("Apple Ads Campaign Report"),
  syncShowsRecentRuns: credentialText.toLowerCase().includes("recent runs"),
  syncDetailCards,
  syncDetailsExplainSkipped: syncText.includes("No request was made because setup is incomplete."),
  readinessCards,
  readinessShowsAscSales: readinessText.includes("ASC Sales Reports"),
  readinessShowsAppleAdsV5: readinessText.includes("/api/v5/campaigns"),
  hasMissingAsc: credentialText.includes("ASC_VENDOR_NUMBER") || credentialText.includes("IAP_PRIVATE_KEY_PATH"),
  hasMissingAds: credentialText.includes("APPLE_ADS_CLIENT_ID"),
  probeShowsIncompleteCredentials: probeText.includes("Live endpoint responded") || probeText.includes("Not called because credentials are incomplete"),
  reportsViewShowsSalesReport: reportsText.includes("/v1/salesReports"),
  reportsProbeShowsAsc: ascReportProbe.mode === "missing-credentials" || ascReportProbe.ok || ascReportProbe.status === 403,
  reportsProbeShowsAppleAds: adsReportProbe.ok,
  storeShowsRevenueAgent,
  storeShowsRevenueMetrics,
  storeHidesRevenueCatActuals,
  storeShowsAssumptions,
  storeShowsActualAccess,
  storeShowsBlockedAscActuals,
  storeHidesAppMetadataTable,
  storeHidesBackendButtons,
  adsShowsGrowthAgent,
  adsShowsKeywordPlan,
  adsShowsSearchTermActions,
  adsShowsKeywordBidChanges,
  adsShowsRealSearchTerm,
  adsShowsRealKeyword,
  adsCampaignFilterVisible,
  adsCampaignFilterButtonsVisible,
  adsCampaignFilterOptions,
  adsCampaignFilterNarrowsRows,
  adsShowsBidMatrix,
  adsHidesSyncDetails,
  adsHidesBackendButtons,
  asoShowsOpportunityAgent,
  asoShowsKeywordMonitor,
  asoShowsCompetitors,
  asoShowsLiveKeyword,
  asoShowsRank,
  asoRows,
  rankTitle,
  rankShowsLegendRun,
  rankShowsRank,
  rankShowsRatingRisk,
  rankShowsProtect82,
  rankShowsAppfiguresAstro,
  rankShowsHistory,
  rankShowsSources,
  rankHidesBackendButtons,
  rankApiHasCurrentRank,
  rankApiHasHistory,
  rankApiProtects82,
  rankApiHasCompetitorBlueprint,
  rankRescueCurrent: rankRescueApi.current,
  rankRescueApp: rankRescueApi.app,
  saasTitle,
  saasShowsOnboarding,
  saasShowsActionQueue,
  saasShowsKeywordProspecting,
  saasShowsCompetitors,
  saasShowsPricing,
  saasShowsTeardown,
  saasShowsLaunchReadiness,
  saasHidesBackendButtons,
  saasSignupCreated,
  saasWorkspaceListed,
  saasWorkspacesApiHasSignup,
  saasStorageMode,
  saasStorageConfiguredOrFallbackWorks,
  saasReadinessApiWorks,
  saasApiReady,
  saasApiHasActions,
  saasApiHasCompetitors,
  saasApiExcludesSelfCompetitor,
  saasApiHasPricing,
  saasApiHasMetadataAudit,
  genericSaasApiWorks,
  genericSaasMetadataWorks,
  genericSaasKeywordFieldOptimizerWorks,
  asoSaasCurrent: asoSaasApi.current,
  asoSaasApp: asoSaasApi.app,
  publicSaasShowsAnalyzer,
  publicSaasShowsActions,
  publicSaasShowsKeywords,
  publicSaasShowsCompetitors,
  publicSaasShowsMetadataAudit,
  publicSaasShowsKeywordFieldOptimizer,
  publicSaasSignupWorks,
  publicSaasShowsDigest,
  publicSaasMultiAppWorks,
  publicSaasMobileOverflow,
  directWorkspaceAccessWorks: Boolean(directWorkspace.ready && directWorkspace.workspace?.email === "direct-verify@example.com"),
  directAddAppWorks: Boolean(directAddApp.saved && directAddApp.workspace?.apps?.some((app) => String(app.appId) === "6448311069")),
  directAddCompetitorWorks: Boolean(directAddCompetitor.saved && directAddCompetitor.competitor?.name?.includes("Claude")),
  directCompetitorGapsWork: Boolean(directCompetitors.ready && (directCompetitors.competitorResearch?.competitors || []).some((competitor) => competitor.name?.includes("Claude")) && Array.isArray(directCompetitors.competitorResearch?.keywordGaps)),
  directAppleAdsImportWorks: Boolean(directAppleAdsImport.saved && directAppleAdsImport.import?.rowCount === 2 && directAppleAdsImport.import?.totals?.spend === 21.5),
  directMetadataImportWorks: Boolean(directMetadataImport.saved && directMetadataImport.import?.subtitleLength > 0 && directMetadataImport.import?.keywordFieldLength > 0),
  directKeywordUpdateWorks: Boolean(directKeywordUpdate.saved && (directKeywordUpdate.selectedApp?.keywords || []).includes("best ai app")),
  directKeywordUpdateAffectsAnalysis: Boolean((directKeywordUpdate.analysis?.keywords?.seedTerms || []).includes("best ai app") && (directKeywordUpdate.analysis?.keywords?.rows || []).some((row) => row.keyword === "best ai app")),
  directReviewImportWorks: Boolean(directReviewImport.saved && directReviewImport.import?.rowCount === 3 && directReviewImport.import?.summary?.negativeCount === 2),
  directReviewImportAffectsActions: Boolean(
    directReviewImport.analysis?.reviews?.source === "customer-review-import"
    && (directReviewImport.analysis?.actions || []).some((action) => String(action.type || "").includes("review intelligence") && String(action.title || "").toLowerCase().includes("paywall"))
  ),
  directMetadataImportAffectsAnalysis: Boolean(directMetadataImport.analysis?.metadata?.source === "customer-metadata-import" && directMetadataImport.analysis?.metadata?.fields?.keywordFieldAvailable && Number(directMetadataImport.analysis?.metadata?.coverage?.indexedCoveredTerms || 0) > 0),
  directImportedAdsAffectAnalysis: Boolean(
    Number(directAppleAdsImport.analysis?.ads?.imports?.totals?.spend || 0) >= 21.5
    && (directAppleAdsImport.analysis?.actions || []).some((action) =>
      String(action.title || "").includes("Stop waste")
      || String(action.type || "").includes("Apple Ads import")
      || String(action.action || "").includes("negative exact")
    )
  ),
  directWorkspaceHasMultipleApps: Boolean((directWorkspace.workspace?.apps || []).length >= 2),
  directDigestWorks: Boolean(directDigest.ready && directDigest.digest?.subject && (directDigest.digest?.nextSteps || []).length > 0),
  directSecondAppDigestWorks: Boolean(directSecondAppDigest.ready && directSecondAppDigest.selectedApp?.appId === "6448311069" && directSecondAppDigest.digest?.subject?.includes("ChatGPT")),
  directSendDigestQueuesOutbox: Boolean(directSendDigest.ready && directSendDigest.delivery?.queued && (directSendDigest.delivery?.record?.deliveries || []).some((delivery) => delivery.channel === "email")),
  directSendDigestQueuesSms: Boolean((directSendDigest.delivery?.record?.deliveries || []).some((delivery) => delivery.channel === "sms")),
  directMonitorRuns: Boolean(directMonitor.ready && directMonitor.mode === "workspace-monitor" && directMonitor.scannedApps >= 1 && (directMonitor.results || []).some((result) => result.snapshot?.id)),
  directHistoryPersists: Boolean(directHistory.ready && directHistory.history?.count >= 1 && directHistory.history?.latest?.id),
  directHistoryTrendsWork: Boolean(
    directHistory.history?.trend?.ready
    && typeof directHistory.history?.trend?.rankDelta7dLabel === "string"
    && typeof directHistory.history?.trend?.rankDelta30dLabel === "string"
    && Array.isArray(directHistory.history?.trend?.keywordDeltas)
  ),
  stripeWebhookUpdatesWorkspace: Boolean(directWebhook.received && directWebhook.workspace?.status === "active" && directWebhook.workspace?.stripe?.subscriptionId === "sub_verify"),
  publicSaasSendsDigest,
  publicSaasShowsHistory,
  publicSaasShowsHistoryTrends,
  publicSaasShowsCompetitorTracker,
  publicSaasShowsKeywordTracker,
  publicSaasShowsReviewImport,
  publicSaasShowsMetadataImport,
  publicSaasShowsAppleAdsImport,
  keyFinderVisible: credentialText.includes("Local .p8 Key Finder"),
  keyFinderExplainsSafety: credentialText.includes("Key contents are never displayed"),
  keyFinderHandlesKnownKeyCatalog: knownKeyButtons >= 0,
  keyFinderShowsActiveAscMatch: credentialText.toLowerCase().includes("matches asc"),
  candidateButtons,
  setKeyAndPathButtons,
  knownKeyButtons,
  setupSteps,
  setupChecklistShowsAppleAdsOrg: credentialText.includes("APPLE_ADS_ORG_ID"),
  setupChecklistShowsPrivateKeyPath: credentialText.includes("ASC_PRIVATE_KEY_PATH"),
  diagnosticsShowsAscKey: credentialText.includes("ASC_KEY_ID"),
  diagnosticsShowsIapKey: credentialText.includes("IAP_KEY_ID"),
  diagnosticsShowsJwtHint: credentialText.includes("ES256 JWTs"),
  configInputs,
  keyValue,
  issuerValue,
  iapKeyValue,
  saveWorked,
  mobileOverflow,
  screenshots: [
    "/private/tmp/apple-growth-console-1440.png",
    "/private/tmp/apple-growth-console-aso.png",
    "/private/tmp/apple-growth-console-rank-rescue.png",
    "/private/tmp/apple-growth-console-aso-saas.png",
    "/private/tmp/apple-growth-console-reports.png",
    "/private/tmp/apple-growth-console-credentials.png",
    "/private/tmp/apple-growth-console-mobile.png",
    "/private/tmp/apple-growth-console-public-aso-saas.png",
    "/private/tmp/apple-growth-console-public-aso-saas-mobile.png"
  ]
}, null, 2));
