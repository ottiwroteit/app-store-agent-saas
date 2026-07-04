# Apple Growth Console

Local Codex side-panel mini-app for Apple Search Ads and App Store Connect.

## Run

```bash
npm run dev
```

Open `http://127.0.0.1:4177`.

Customer-facing ASO SaaS MVP:

```text
http://127.0.0.1:4177/aso-saas.html
```

## Credentials

Open the `Credentials` tab in the dashboard and fill in the setup form, or copy `.env.example` to `.env` and fill in the missing Apple credentials manually.

App Store Connect needs:

- `ASC_KEY_ID`
- `ASC_ISSUER_ID`
- `ASC_PRIVATE_KEY_PATH`
- `ASC_VENDOR_NUMBER` for Sales and Trends reports

In-App Purchase / App Store Server API is also tracked:

- `IAP_KEY_ID`
- `IAP_ISSUER_ID`
- `IAP_PRIVATE_KEY_PATH`

Apple Search Ads API v5 also needs its own OAuth credentials:

- `APPLE_ADS_CLIENT_ID`
- `APPLE_ADS_TEAM_ID`
- `APPLE_ADS_KEY_ID`
- `APPLE_ADS_PRIVATE_KEY_PATH`
- `APPLE_ADS_ORG_ID`

Without complete credentials, the dashboard runs in sample-data mode and shows the exact missing fields.

The dashboard stores private key file paths only. It does not ask for or store `.p8` private key contents in the browser.

For the customer SaaS workspace, users connect their own App Store Connect, RevenueCat, and Apple Ads credentials from the workspace setup panel. The app records non-secret readiness fields such as key IDs and project IDs, and stores submitted API/private keys encrypted server-side. Raw private key contents should never be pasted into chat or committed to the repo.

## Local API Routes

- `GET /api/status` checks credential readiness.
- `GET /api/config` returns editable local setup fields.
- `POST /api/config` writes the local `.env` file.
- `GET /api/diagnostics` checks local required values, `.p8` paths, and JWT signing without calling Apple.
- `GET /api/key-candidates` scans common local folders for `.p8` key file paths without reading key contents.
- `GET /api/sync` runs one guarded sync pass across App Store Connect apps, Apple Ads campaigns, ASC sales reports, and Apple Ads campaign reports.
- `GET /api/sync/history` returns the latest local sync runs saved in `data/sync-history.json`.
- `GET /api/overview` returns live-ready/sample dashboard data.
- `GET /api/app-store-connect/apps` calls the App Store Connect apps endpoint when credentials are ready.
- `GET /api/app-store-connect/sales-report` calls App Store Connect Sales and Trends reports when credentials and vendor number are ready.
- `GET /api/apple-ads/campaigns` calls Apple Search Ads Campaign Management API v5 campaigns when credentials are ready.
- `GET /api/apple-ads/reports/campaigns` calls Apple Search Ads Campaign Management API v5 campaign reports when credentials are ready.
- `GET /api/aso-saas` analyzes any App Store URL for rank risk, keyword opportunities, competitor overlap, listing metadata coverage, and action recommendations.
- `POST /api/aso-saas/signup` creates a local trial workspace and returns a one-time customer access link.
- `POST /api/aso-saas/login` re-issues a local workspace access link by email and app URL.
- `GET /api/aso-saas/workspace` returns a token-authenticated customer workspace.
- `POST /api/aso-saas/connections` saves customer App Store Connect, RevenueCat, or Apple Ads connection setup for the authenticated workspace, encrypting submitted API/private key material before storage.
- `POST /api/aso-saas/apps` adds or updates a tracked app inside the authenticated workspace and enforces plan app limits.
- `POST /api/aso-saas/keywords` adds, removes, or replaces tracked keyword seeds for the selected app and enforces the plan keyword limit.
- `GET /api/aso-saas/competitors` returns named competitor tracking and keyword-gap analysis for the selected app.
- `POST /api/aso-saas/competitors` adds or updates a named competitor App Store URL for the selected app.
- `POST /api/aso-saas/apple-ads-import` imports customer-owned Apple Ads keyword/search-term CSV rows for the selected app.
- `POST /api/aso-saas/metadata-import` imports customer-owned App Store Connect listing metadata for exact subtitle and keyword-field coverage.
- `POST /api/aso-saas/reviews-import` imports customer-owned App Store review CSV/JSON rows and turns negative themes into rank-risk actions.
- `GET /api/aso-saas/history` returns app-specific monitor snapshots for a token-authenticated customer workspace, including latest, 7d, and 30d rank/rating trend labels plus tracked keyword movement.
- `GET /api/aso-saas/digest` returns the customer daily Rank Rescue digest.
- `POST /api/aso-saas/send-digest` sends the digest through configured providers or queues it to the local outbox.
- `POST /api/aso-saas/monitor` scans active/trialing workspaces, appends per-app ASO snapshots, and optionally sends alert digests.
- `POST /api/aso-saas/stripe-webhook` reconciles Stripe checkout/subscription events into workspace status.
- `GET /api/aso-saas/readiness` returns production launch readiness for HTTPS URL, Supabase storage, Stripe, webhook, email/SMS delivery, monitor-token protection, and the safe public/customer-owned data path.
- `GET /api/aso-saas/workspaces` lists workspaces plus active storage mode for admin review.

Tracked keyword limits are server-side: Rescue allows 50 keywords per app, Growth allows 250, and Studio allows 1000. The public `/aso-saas.html` workspace exposes saved keyword chips, add/remove controls, and one-click Track buttons from prospecting and competitor-gap rows.

Workspace history is append-only and summarized into Rank Rescue trend windows. Each monitor or digest run stores the current chart rank, rating count, paid install proxy, action counts, and top tracked keyword ranks; the customer workspace then shows latest movement, 7d/30d rank trend labels, and keyword-level movement when a baseline snapshot exists.

## ASO SaaS Launch Setup

The ASO SaaS path runs without paid credentials by using public App Store/iTunes data. For paid subscriptions, configure:

- `ASO_SAAS_PUBLIC_URL`
- `ASO_CREDENTIAL_VAULT_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_ASO_RESCUE_PRICE_ID`
- `STRIPE_ASO_GROWTH_PRICE_ID`
- `STRIPE_ASO_STUDIO_PRICE_ID`

For digest delivery, configure:

- `RESEND_API_KEY`
- `ASO_ALERT_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

For production storage, run `docs/aso-saas-storage-schema.sql` in Supabase and configure:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ASO_SUPABASE_WORKSPACES_TABLE` if you changed the default table name
- `ASO_SUPABASE_NOTIFICATIONS_TABLE` if you changed the default table name
- `ASO_MONITOR_ADMIN_TOKEN` to protect the monitor endpoint in hosted environments

Until Stripe is configured, signup creates a local 14-day trial workspace. Until email/SMS providers are configured, digest sends are written to the configured notification store with the exact email and SMS body that would be delivered. Without Supabase, workspace and notification data stays in `data/aso-saas-workspaces.json` and `data/aso-saas-notification-outbox.json`. Raw customer access tokens are shown once in the generated link; only token hashes are stored.

Set `ASO_CREDENTIAL_VAULT_KEY` in production before customers connect credentials. In local development, the app creates an ignored `data/aso-credential-vault-key` fallback so submitted RevenueCat/API private keys are still stored as ciphertext rather than plaintext.

Use `GET /api/aso-saas/readiness` before selling paid access. It returns `mode: "production-ready"` only when the public HTTPS URL, Supabase storage, Stripe checkout prices, Stripe webhook secret, email delivery, and hosted monitor token are configured. SMS is reported separately as optional for Rescue and expected for Growth/Studio alerts.

Plan limits are enforced server-side: Rescue supports 1 app and 5 competitors per app, Growth supports 5 apps and 25 competitors per app, and Studio supports 25 apps and 100 competitors per app.

Apple Ads import accepts CSV text in the request body as `csv` or `report`. Supported columns include `Search Term`, `Keyword`, `Match Type`, `Spend`, `Taps` or `Clicks`, `Installs` or `Conversions`, `Impressions`, `Campaign`, `Ad Group`, `Status`, and `Avg CPT`. Imported rows are kept server-side with summaries returned to the browser, then folded into keyword recommendations, exact/broad split, no-install paid-risk actions, digests, and monitor snapshots.

The listing audit uses public iTunes/App Store metadata to score app-name, description, screenshot readiness, and keyword coverage. It compares tracked keywords, paid terms, and competitor terms against visible metadata, then recommends subtitle/keyword-field rewrites, Product Page Optimization screenshot tests, or keep/protect actions. Public lookup does not expose the App Store subtitle, so exact subtitle auditing should be added through App Store Connect metadata import before production launch.

Every analysis response also returns `metadata.keywordFieldPlan`: a paste-ready App Store Connect keyword-field optimizer that ranks tracked, paid, and competitor terms, removes words already covered by title/subtitle, and keeps the suggested field at 100 characters or less.

Metadata import accepts JSON fields or a one-row CSV as `csv`. Supported fields include `title`/`appName`, `subtitle`, `keywordField`, `promotionalText`, `description`, `releaseNotes`/`whatsNew`, `screenshotCount`, and `locale`. Imported metadata is used to score indexed coverage across app name, subtitle, and keyword field; long raw descriptions are stored server-side while workspace responses return bounded summaries.

Review import accepts CSV text in `csv` or JSON rows in `reviews`. Supported columns include `Rating`, `Title`, `Body`, `Date`, `Version`, `Country`, and `Author`. Imported reviews are summarized into negative-share, top complaint themes such as paywall timing or onboarding friction, recent negative snippets, and concrete product/review-response actions.

Cron example for a daily rank monitor:

```bash
curl -X POST "$ASO_SAAS_PUBLIC_URL/api/aso-saas/monitor?send=alerts&token=$ASO_MONITOR_ADMIN_TOKEN"
```

Use `send=none` to only collect history, `send=alerts` to send digests only when urgent/high-priority actions exist, or `send=all` to send every tracked app digest.

Before a public launch, deploy behind HTTPS, set `ASO_SAAS_PUBLIC_URL` to the public domain, configure the Stripe webhook to point at `/api/aso-saas/stripe-webhook`, set the Supabase env values above, and keep service-role keys/server monitor tokens server-side only.
