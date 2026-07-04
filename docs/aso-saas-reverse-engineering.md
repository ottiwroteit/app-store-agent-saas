# Appfigures / Astro Reverse Engineering For ASO SaaS

## Objective

Build a sellable ASO product for iOS app sellers, using Legend Run as the first proof case but supporting any customer-provided App Store URL. The wedge is rank rescue: detect rank drops, explain likely causes, and recommend concrete ASO or Apple Ads actions.

## Reverse-Engineering Decision

Do not depend on private Appfigures or Astro APIs. Appfigures has its own public data API and paid platform, and Astro exposes public product/docs pages, but our production product should be based on sources customers can legally connect or data Apple exposes publicly.

Recommended path: **hybrid public-data + customer-owned integrations**.

- Public App Store pages: visible chart rank, category, rating, reviews, screenshots, version, and metadata.
- iTunes Lookup/Search: app metadata, keyword result ordering, and organic competitor snapshots.
- App Store Connect: customer-owned analytics, sales, product-page testing, custom product pages, and metadata context.
- Apple Ads: customer-owned campaign spend, taps, installs, exact/broad split, and search-term quality.
- RevenueCat/App Store Server data: subscription conversion, payback, and LTV assumptions when available.

Public source anchors:

- Astro public site: https://tryastro.app/
- Astro public keyword tool: https://tryastro.app/tools/most-searched-keywords/
- Appfigures public site: https://appfigures.com/
- Appfigures competitor keyword guide: https://appfigures.com/resources/guides/competitor-keyword-analysis
- Apple App Store search guidance: https://developer.apple.com/app-store/search/
- Apple Product Page Optimization: https://developer.apple.com/app-store/product-page-optimization/
- Apple Custom Product Pages: https://developer.apple.com/app-store/custom-product-pages/

## Competitor Teardown

### Astro

Publicly visible positioning:

- Astro is a lightweight ASO tool centered on keyword research and rank tracking.
- Its public site says it extracts popularity data from Apple Search Ads and calculates difficulty for ranking in the top 10.
- It advertises daily keyword rank updates, position-change tracking, historical graphs, and many Apple Ads-supported storefronts.
- Its docs describe app onboarding by search, with the US store selected by default and 91 stores available through Apple Ads.
- Its public keyword tool exposes a "most searched keywords" report using Apple Search Ads data.

Cloneable workflows:

- App onboarding by App Store URL or search.
- Keyword rank monitor by app, country, device, and keyword.
- Popularity/difficulty proxy from Apple Ads data plus App Store top-result density.
- Daily rank delta and historical graph.
- Metadata actions: add to metadata, improve rank, defend, test exact, watch.

Differentiation for us:

- Astro is keyword-first. We should be action-first: when rank falls, say whether the next move is rating repair, conversion testing, exact-match protection, broad-match cuts, or custom product pages.

### Appfigures

Publicly visible positioning:

- Appfigures is broad app analytics and intelligence: downloads, revenue, subscriptions, reviews, ad spend, ranks, ratings, ASO, competitors, top charts, and market benchmarks.
- Pricing shows low-entry analytics plus larger tiers; the Monitor tier includes daily keyword rank updates, keyword popularity scores, and ASO performance snapshots.
- Appfigures ASO pages advertise keyword suggestions, hourly keyword rank monitoring, and competitor keyword visibility.
- Its public API docs advertise metadata, daily/hourly rank trends, hourly top charts, reviews, ratings trends, and app features.

Cloneable workflows:

- Top chart snapshots by app, category, country, and platform.
- Competitor and keyword teardown pages.
- Review/rating risk monitor.
- Apple Ads correlation between paid keyword quality and organic ASO decisions.
- Daily rank-change digest with concrete actions.

Differentiation for us:

- Appfigures is broad intelligence. We should be narrower, faster, and more prescriptive for small teams: "your app dropped; here are the three actions to take today."

## SaaS MVP Requirements

1. App onboarding by App Store URL.
2. Country/device/category rank snapshot.
3. Saved keyword rank tracker with add/remove controls plus 7-day and 30-day deltas.
4. Competitor snapshots from top App Store keyword results.
5. Named competitor URL tracking with keyword-gap recommendations.
6. Review/rating risk alerts.
7. Apple Ads import for owned apps.
8. Exact/broad split and search-term leakage detection.
9. Listing metadata coverage audit with customer-owned App Store Connect metadata import.
10. Rank-drop diagnosis with action queue.
11. Daily email/SMS alerts.
12. Stripe subscriptions and team workspaces.

## Pricing Hypothesis

- Rescue: $29/mo, 1 app, 5 competitors/app, 50 keywords, daily rank/rating alerts, competitor gaps, action queue.
- Growth: $79/mo, 5 apps, 25 competitors/app, 250 keywords, Apple Ads import, exact/broad split, SMS emergencies, custom product-page planner.
- Studio: $199/mo, 25 apps, 100 competitors/app, 1,000 keywords, team seats, API export, weekly opportunity reports, priority alerts.

## Current Implementation

The local console now exposes:

- `GET /api/aso-saas?appUrl=<App Store URL>&country=US&keywords=<comma terms>`
- `POST /api/aso-saas/signup` for trial workspace creation.
- `POST /api/aso-saas/login` to re-issue a local workspace access link by email and app URL.
- `GET /api/aso-saas/workspace?workspaceId=<id>&token=<token>` for customer workspace access.
- `POST /api/aso-saas/apps?workspaceId=<id>&token=<token>` to add or update tracked apps inside the customer workspace.
- `POST /api/aso-saas/keywords?workspaceId=<id>&token=<token>&appId=<id>` to add, remove, or replace saved keyword seeds for the selected app.
- `GET /api/aso-saas/competitors?workspaceId=<id>&token=<token>&appId=<id>` for named competitor keyword-gap analysis.
- `POST /api/aso-saas/competitors?workspaceId=<id>&token=<token>&appId=<id>` to add or update a competitor App Store URL.
- `POST /api/aso-saas/apple-ads-import?workspaceId=<id>&token=<token>&appId=<id>` to import customer-owned Apple Ads keyword/search-term CSV rows.
- `POST /api/aso-saas/metadata-import?workspaceId=<id>&token=<token>&appId=<id>` to import customer-owned App Store Connect listing metadata.
- `POST /api/aso-saas/reviews-import?workspaceId=<id>&token=<token>&appId=<id>` to import customer-owned App Store review CSV/JSON rows and generate complaint-theme actions.
- `GET /api/aso-saas/history?workspaceId=<id>&token=<token>&appId=<id>` for customer-visible rank/keyword history.
- `GET /api/aso-saas/digest?workspaceId=<id>&token=<token>` for the daily rank-rescue digest customers pay for.
- `POST /api/aso-saas/send-digest?workspaceId=<id>&token=<token>` to deliver or queue the daily digest.
- `POST /api/aso-saas/monitor?send=none|alerts|all` for cron-driven workspace monitoring.
- `POST /api/aso-saas/stripe-webhook` to reconcile checkout/subscription events back into workspace status.
- `GET /api/aso-saas/workspaces` for local workspace/admin review.
- App URL onboarding for any iOS app ID.
- Public App Store/iTunes snapshot with rank, category, rating, version, and price where available.
- Keyword rank/prospecting rows using iTunes Search result ordering.
- Organic competitor overlap snapshots from top keyword results.
- Named competitor tracking from customer-provided App Store URLs, with gap/out-ranked/defend/test-exact keyword recommendations.
- Listing metadata audit using public app name, description, genre, screenshot count, imported subtitle, imported keyword field, and tracked/paid/competitor terms. It returns a compact score, coverage rows, missing high-intent terms, a paste-ready 100-character keyword-field optimizer, and rewrite actions.
- Optional Apple Ads correlation for owned apps when local credentials match campaign/app identity.
- Customer-owned Apple Ads CSV import for teams that do not want to connect API credentials yet. Supported columns include search term, keyword, match type, spend, taps/clicks, installs/conversions, impressions, campaign, ad group, status, and avg CPT.
- Customer-facing action queue and subscription packaging in the `ASO SaaS` tab.
- Local trial workspaces with email, company, plan, app URL, keyword list, trial end date, and Stripe checkout metadata.
- Tokenized customer workspace links. Raw tokens are issued once to the client; only a SHA-256 token hash is stored locally.
- Multi-app customer workspaces with server-enforced plan limits.
- Per-app workspace histories with category rank, rating count, keyword ranks, competitors, action counts, and paid-signal snapshots.
- Daily digest generation with urgent alerts, protected keywords, keyword opportunities, SMS body, and email body.
- Workspace-wide monitor runs that append snapshots and optionally send alerts for all active/trialing customers.
- Digest delivery through Resend email and Twilio SMS when configured, with a local outbox fallback at `data/aso-saas-notification-outbox.json`.
- Live Stripe Checkout Session creation when `STRIPE_SECRET_KEY` plus the selected `STRIPE_ASO_<PLAN>_PRICE_ID` are configured.
- Stripe webhook signature verification when `STRIPE_WEBHOOK_SECRET` is configured; local unsigned webhook payloads are accepted only as a development fallback.
- Optional Supabase-backed workspace and notification storage via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, with local JSON fallback when those values are absent.
- Standalone customer-facing route at `http://127.0.0.1:4177/aso-saas.html` for app analysis and trial signup without the internal operator dashboard.

## Internal Proof Checklist

- Legend Run current public chart rank is captured when Apple exposes it.
- `82-0` is classified as defend/protect when it ranks #1 and converts cheaply.
- Rating average below 3.8 creates a rank-risk action.
- A simulated drop from #60 to #90 creates install-velocity and conversion actions.
- Prospect history appends in `data/aso-prospect-history.json` without overwriting old rows.
- If public chart rank is unavailable, the product still shows keyword, rating, competitor, Apple Ads, and source status context.
- Public analysis returns a listing audit with coverage rows and missing high-intent metadata terms.
- Public analysis returns an App Store Connect keyword-field optimizer that stays within 100 characters and explains selected terms.
- Customers can import App Store Connect metadata and the audit switches from public lookup to exact subtitle/keyword-field indexed coverage.
- Customers can import App Store review exports, and paywall/onboarding/bug/pricing themes become rank-risk actions without relying on private competitor APIs.
- Trial signup is idempotent by email + app ID, so demos and tests do not create duplicate workspaces.
- Workspace access tokens can fetch a customer digest, while the stored workspace record does not expose token hashes to the browser.
- Growth/Studio workspaces can track multiple apps and generate app-specific digests from the same customer workspace.
- Customers can add a named competitor URL and see competitor keyword gaps for the selected app.
- Customers can save/remove tracked keyword seeds, and saved terms immediately feed rank analysis, listing audit coverage, digests, and monitor snapshots.
- Customers can import Apple Ads CSV rows and see spend/taps/install totals plus no-install paid-risk actions without exposing private Apple Ads credentials.
- Digest sending queues an email/SMS payload locally when provider keys are absent.
- A monitor run appends app-level history without overwriting prior snapshots.
- Customer workspaces render recent rank-history snapshots and rank/rating movement.
- A checkout webhook can move a local trial workspace to `active` and persist Stripe customer/subscription IDs.
- `GET /api/aso-saas/workspaces` reports `storage.mode` as `local-json` or `supabase`, so deployment checks can confirm whether customer state is durable.
- Saved keyword tracking is customer-owned state, not a private Appfigures/Astro API dependency. Plan limits are enforced on the server: Rescue 50, Growth 250, Studio 1000 keywords per app.

## Stripe Configuration

Live checkout is off by default. To sell subscriptions from the local product surface, configure:

- `STRIPE_SECRET_KEY`
- `STRIPE_ASO_RESCUE_PRICE_ID`
- `STRIPE_ASO_GROWTH_PRICE_ID`
- `STRIPE_ASO_STUDIO_PRICE_ID`
- Optional but recommended: `STRIPE_WEBHOOK_SECRET`
- Optional: `ASO_SAAS_PUBLIC_URL` for success/cancel URLs after deployment.
- Optional for email digest delivery: `RESEND_API_KEY`, `ASO_ALERT_FROM_EMAIL`
- Optional for SMS alerts: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

Without these values, signup still creates a local 14-day trial workspace and reports the missing price ID env key.

## Storage Configuration

Local JSON is the default for development. For production, run `docs/aso-saas-storage-schema.sql` in Supabase and configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `ASO_SUPABASE_WORKSPACES_TABLE`
- Optional: `ASO_SUPABASE_NOTIFICATIONS_TABLE`
- Recommended: `ASO_MONITOR_ADMIN_TOKEN`

The service role key is used only by the server-side API. Browser responses include storage mode and table names, never the key. If Supabase is temporarily unavailable, the server logs the failure and falls back to the local JSON store instead of dropping signup or alert data.

## Monitor Configuration

`POST /api/aso-saas/monitor` is the cron surface. It scans trialing, active, and past-due workspaces, analyzes each tracked app, appends a bounded history snapshot, and can send digests:

- `send=none`: collect history only.
- `send=alerts`: deliver only when urgent/high-priority actions are present.
- `send=all`: deliver every app digest.

Set `ASO_MONITOR_ADMIN_TOKEN` in hosted environments and pass it with `?token=<value>` or `Authorization: Bearer <value>`.

## Sources

- Astro homepage: https://tryastro.app/
- Astro onboarding docs: https://tryastro.app/docs/add-your-first-app/
- Astro most searched keywords: https://tryastro.app/tools/most-searched-keywords/
- Appfigures homepage: https://appfigures.com/
- Appfigures pricing: https://appfigures.com/platform/pricing
- Appfigures ASO tools: https://appfigures.com/products/aso-tools
- Appfigures Public Data API: https://docs.appfigures.com/public-data-access
- Apple Product Page Optimization: https://developer.apple.com/app-store/product-page-optimization/
- Apple Custom Product Pages: https://developer.apple.com/app-store/custom-product-pages/
