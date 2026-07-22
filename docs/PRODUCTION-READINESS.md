# DealSpine — Production Readiness Plan (v1.0.0-pilot → v1.0.0)

*Everything required to take the pilot to a production-grade general-availability release. Grouped by workstream; each item has a scope note and an acceptance signal. Ordered within each group by dependency. "DoD" = definition of done.*

Baseline: `v1.0.0-pilot` (2026-07-23) — Phase 1 built, 161 tests green, single-company internal app, dev-login, offline-mock LLM, English UI, SQLite.
Target: `v1.0.0` — SSO-secured, Japanese + English, live LLM providers, hardened, operable, backed up, and evidenced by the Phase-2 loop.

Legend — **[P0]** blocks GA · **[P1]** strongly expected at GA · **[P2]** fast-follow acceptable.

---

## 1. Authentication & identity

- **[P0] Replace dev-login with SSO.** Wire SAML 2.0 or OIDC to the corporate IdP (Okta/Entra). Keep the existing `role` model and `requireRole` guards — only the session-establishment layer changes. Sessions become IdP-issued; the current signed-cookie picker is removed. *DoD: no unauthenticated path issues a session; login redirects to the IdP; logout clears the federated session.*
- **[P0] SCIM / directory provisioning.** Auto-provision and de-provision users from the directory; map IdP groups → DealSpine roles; the `builder` flag is grantable by an admin. *DoD: a deactivated directory user cannot authenticate; role changes propagate.*
- **[P1] Session management.** Idle + absolute session timeouts, secure/httpOnly/SameSite cookies, CSRF protection on state-changing routes, and a server-side session store (not just a signed cookie) so sessions can be revoked. *DoD: revoking a session ends access immediately.*
- **[P1] Segregation of duties, hardened.** Replace the interim bid-verification clamp with the dedicated **`POST /quotes/:id/verify-bid`** endpoint (deal-desk/pricing-owner only) that flips a server-tracked `bid_verified` flag and re-enters unverified state on any bid edit (see `docs/DECISIONS.md` D13). *DoD: author-verified bids are impossible via any route; regression test added.*
- **[P2] Admin audit of access.** An admin view of who-has-which-role and recent role changes (data already in the `events` log).

## 2. Internationalization — full Japanese support

- **[P0] Complete the JA UI string catalog.** Every user-facing string in `src/i18n.ts` + per-screen dictionaries has a reviewed `ja` value; no raw keys or English fallback render in JA mode. *DoD: a JA-only reviewer can operate every screen; automated check fails the build on a missing `ja` key.*
- **[P0] Native-quality translation review.** Professional review of all JA strings, the JA proposal template, and the JA help content for business register (keigo) and SAP domain terms. *DoD: sign-off from a native business reviewer.*
- **[P1] Locale-correct formatting everywhere.** Audit every number/date/currency render through `Intl` (no hand-formatted strings); confirm currency follows the *deal*, dates/times follow the *user*, and proposals render in the *customer's* locale. *DoD: a test asserts `¥` amounts have no decimals and JA long-form dates on the proposal.*
- **[P1] Japanese typography & layout.** Noto Sans JP / Hiragino stack, JA line-height, no italics-for-emphasis, and layout tolerance so longer/denser strings don't clip (per the design brief). *DoD: visual QA of all 12 screens in JA at desktop/tablet/mobile.*
- **[P1] Localize the user guide.** A Japanese edition of `guide/DealSpine-Guide.md` with JA screenshots (the capture tooling already supports `locale: ja`).
- **[P2] Timezone handling.** Store UTC (already done), display in the user's timezone; confirm JST rendering.

## 3. LLM providers — from offline mock to live

- **[P0] Verify each live adapter.** Exercise Anthropic, OpenAI, Gemini, and Grok against real endpoints; confirm request/response shapes, streaming, timeouts, and error mapping in `providers.ts`. The offline mock remains the no-key fallback. *DoD: an integration test (behind a key-present flag) round-trips each provider.*
- **[P0] Secrets management for keys.** Move provider API keys and the cookie/signing secret out of env-var defaults into a real secret store (cloud KMS / vault); keys stay write-only from the client, never logged, never returned. *DoD: no secret in source, config files, or logs; key rotation is possible without a deploy.*
- **[P1] Cost & rate governance.** Per-provider rate limiting, a token/cost budget per run and per period, and a visible spend log (the `insight_runs` table already records model/scope). *DoD: a runaway loop cannot exceed the configured budget.*
- **[P1] On-device / local model (Gemma) path.** Decide and implement the local-model route the design calls for (privacy-sensitive insights that must not leave the device/edge), or explicitly defer with a note. *DoD: the "never leaves this device" chip reflects real behavior.*
- **[P1] Prompt-injection & output safety.** Since insights package internal data into prompts, add guardrails: strip/escape untrusted content, cap packaged size, and never let a floor/cost scope reach a role that can't see it (already enforced — add tests at the provider boundary). *DoD: a red-team pass on the insight path.*

## 4. Data & persistence

- **[P0] Production datastore.** Either operationalize SQLite (WAL, scheduled backups, restore drills) or migrate to Postgres. The code uses plain SQL with no ORM lock-in and a snake_case schema, so migration is mechanical. *DoD: a documented, tested backup + point-in-time restore.*
- **[P0] Schema migrations.** Introduce a migration tool/versioned migration files (today `db.ts` runs `CREATE TABLE IF NOT EXISTS` at boot). *DoD: an additive schema change ships without data loss via a migration.*
- **[P1] Data retention & deletion.** Retention policy for quotes, runs, and events; a customer/engagement data-deletion procedure (matching the platform's own data-rights promise). *DoD: documented retention; deletion path tested.*
- **[P1] Seed vs. production separation.** `seed.ts`/`seed-demo.mjs` are dev tooling; ensure they cannot run against production and that a fresh prod DB starts empty of demo data. *DoD: prod boot creates schema + real offerings only.*

## 5. Security & compliance

- **[P0] Transport & headers.** TLS everywhere; HSTS, CSP, X-Frame-Options, and the standard security headers; secure cookies. *DoD: an external header/TLS scan passes.*
- **[P0] Input & injection hardening (extend the pilot fixes).** The pilot added numeric bounds, array-element filtering, and JSON error hygiene. Extend to: request-size caps on all routes, output encoding, and parameterized queries audit (better-sqlite3 prepared statements — confirm no string interpolation anywhere). *DoD: a SAST pass and a dependency audit (`npm audit`) are clean.*
- **[P1] Security review / pen test.** An independent review of authz (the §2 matrix is the boundary), the proposal leak-proofing, the insight scope coupling, and the audit trail. *DoD: findings triaged and closed, mirroring the internal QA-hunt process.*
- **[P1] Compliance posture.** Decide the target (SOC 2 Type II is on the PRD roadmap); implement the controls it requires — access reviews, change management, logging, encryption at rest. Data residency: confirm the deployment region matches the customer's requirement (JP region is a target market). *DoD: a controls checklist mapped to the standard.*
- **[P1] Audit completeness.** Confirm every state-changing action logs an event; add tamper-evidence beyond triggers if required (e.g., a periodic hash chain of the events table). *DoD: an auditor can reconstruct any quote's full decision history.*

## 6. Observability & operations

- **[P0] Structured logging.** Replace ad-hoc logging with structured logs (request id, user id, route, latency, outcome) — no secrets, no PII beyond ids. *DoD: logs are queryable; an insight run or approval is traceable end-to-end.*
- **[P0] Health, readiness & metrics.** `/api/health` exists; add readiness (DB reachable) and basic metrics (request rate, error rate, latency, LLM spend). *DoD: a dashboard shows the golden signals.*
- **[P1] Error tracking & alerting.** Wire an error tracker; alert on 5xx spikes, auth failures, LLM provider errors, and floor-adherence anomalies. *DoD: a synthetic error pages the on-call.*
- **[P1] CI/CD pipeline.** `npm test` + `npm run build` as required checks on PRs; automated deploy to staging then production; migrations run as a deploy step; rollback plan. *DoD: no manual build/deploy steps; a red test blocks merge.*
- **[P1] Runbook.** Deploy, rollback, restore, key-rotation, and incident procedures documented. *DoD: a new engineer can deploy and recover from the runbook alone.*
- **[P2] Availability target.** Define and instrument an SLO (the PRD suggests 99.9% for quote/proposal paths); add HA if the single-node deployment can't meet it.

## 7. Close the Phase-2 evidence loop (product completeness for GA)

*The pilot ships Evidence and Engagements as placeholders. A credible `1.0.0` should make the "Track → Learn" half real — otherwise the platform only does half its stated job. See `docs/ROADMAP.md` Phase 2 for detail.*

- **[P1] Unit-record capture (M5).** The 40-column log as a validated form + CSV/XLSX import; logger ≠ countersigner enforced; token source + config version per row.
- **[P1] Live calibration (M7).** Measured c/e/q/rework/tokens per offering × class × config version; workspace shows measured beside entered; evidence gates read live counters instead of self-declared numbers.
- **[P1] Sold-vs-actual & true-up (M6).** Frozen sold snapshot vs. rolling actuals; variance drivers; class-mix true-up; warranty ledger.
- **[P2] Win/loss & anchor calibration.** Competitor price capture feeding the validated-alternative benchmark.

## 8. Quality, accessibility & release engineering

- **[P0] Accessibility (WCAG 2.2 AA).** Complete the contrast annex the design flagged (text/surface pairs × 3 glass stops × light/dark), keyboard completeness, ARIA on all controls, and Dynamic-Type/200%-zoom survival. *DoD: an a11y audit passes at AA; the design's open items are closed.*
- **[P0] Cross-device/browser QA.** Verify the responsive layouts (desktop/tablet/mobile) and the mobile glass-surface budget on real devices and supported browsers. *DoD: a device matrix signed off.*
- **[P1] Expand automated coverage.** Add UI/e2e tests (the current suite is API+engine heavy), load/performance tests on the engine and portfolio aggregates, and a leak-proofing test for the JA proposal at scale. *DoD: coverage thresholds agreed and met.*
- **[P1] Performance budget.** Confirm engine round-trip < 50 ms client-side, proposal render < 5 s, and portfolio aggregates scale to realistic deal counts. *DoD: measured against the PRD budgets.*
- **[P2] Versioning & release process.** Adopt semantic versioning going forward; tag `v1.0.0` when P0/P1 clear; keep `CHANGELOG.md` current.

## 9. Documentation & enablement for GA

- **[P1] Update the doc set.** Refresh `docs/AS-BUILT.md` as placeholders become features; add an operator/admin guide (SSO setup, provider keys, backups); publish the JA user guide.
- **[P1] Onboarding & training.** The in-app Help academy plus role-based training for sales, deal desk, delivery, and leadership.
- **[P2] API documentation.** If any integration (CRM/ATC) consumes the API, publish an OpenAPI spec.

## 10. White-labeling & one-click packaging

*The product is sold to multiple advisory firms, each under its own brand (today the deploying firm is **Nuvear**; a customer such as **Minervia Partners** must see only their own identity). No brand identity may be hardcoded. See `docs/DECISIONS.md` D17 for the distribution model — each customer is a separately packaged **single-tenant** build, which keeps the architecture simple (no multi-tenancy).*

- **[P1] Brand-token extraction.** Centralize every brand string and asset into one source: `brand/brand.config.json` + `brand/assets/`. Today the product name ("DealSpine") and the firm identity ("Nuvear", its domain, and the proposal letterhead) are hardcoded across ~20 files (`src/shell/Shell.tsx`, `src/screens/Login.tsx`, `server/proposal.ts`, every screen, the i18n dictionaries incl. JA, and `server/seed.ts`). Replace each with a read from a brand context. *DoD: grepping the literal vendor/product brand strings in `app/src` + `app/server` returns zero hits outside `brand/`.*
- **[P1] Brand config schema.** `productName`; `firm` (legal name, display name, short name, per-locale name incl. JA); `logo` (SVG light + dark); `favicon`; `primaryDomain`; brand `colors` that override the `design-tokens.json` palette (navy/gold/ice → the customer's palette, flowing through `src/tokens.ts` so one accent recolors the whole app); proposal `letterhead` + `footer` + `legalEntity`; `supportEmail`; default `locale`/`currency`/`region`. *DoD: a documented, validated schema with a worked `minervia` example.*
- **[P1] Runtime brand context.** The app loads the brand config at boot; UI reads product name/logo/colors from context; the proposal renderer reads letterhead/firm/legal entity from it. Colors route through the token layer, not per-component overrides. *DoD: swapping the brand config alone rebrands the running app with no code edits.*
- **[P1] Customer-facing documentation templating.** Decide the split: vendor-internal docs (this plan, `DECISIONS.md`, `CLAUDE.md`) stay generic; **customer-delivered** docs (the user guide, an admin guide) are branded. Templatize their brand references (`{{PRODUCT_NAME}}`, `{{FIRM_NAME}}`, `{{DOMAIN}}`) and regenerate per customer, re-capturing branded screenshots via the existing `capture.mjs` (it already parameterizes locale/user). *DoD: the delivered guide shows only the customer's brand.*
- **[P0-for-sale] The one-click packaging utility.** `npm run package -- --brand=minervia` (`scripts/package-brand.mjs`) that, from a brand config, in one command: (1) **validates** the config — all required fields, assets present, brand colors pass WCAG AA on their surfaces; (2) **applies** brand context + asset replacement + token overrides; (3) **substitutes** brand into customer-facing docs and the guide and re-captures branded screenshots; (4) **injects the license** (group 11); (5) runs `npm test` + `npm run build` on the branded output; (6) emits a **versioned, named distributable** (zip and/or container image and/or deploy bundle) tagged `<customer>-<version>-<license-window>`. It **fails loudly** on any partial substitution, missing asset, contrast failure, or red test. *DoD: `package --brand=minervia` produces a green, fully-rebranded, licensed build with zero Nuvear/vendor identity anywhere, in a single command.*
- **[P1] Brand-leak QA.** Automated residual-brand scan (string + visual diff of key screens) that the packaging step runs and the CI enforces. *DoD: a planted vendor string fails the package.*
- **[P1] Re-packaging pipeline.** Because each customer is a separate packaged build, define how a core code change (especially a security fix) is rebuilt and re-issued to **every** customer brand from one source of truth, with each customer's license preserved. *DoD: a one-line engine/security change reaches all customer builds through the pipeline, not by hand.*

## 11. Licensing & entitlements (time-bound)

*The product is sold under **time-bound licenses**; an expired or tampered license must not keep working, but must never destroy customer data. See D17.*

- **[P0-for-sale] Signed license model.** A cryptographically signed license token, issued by the vendor and verified with the vendor's public key baked into the build, containing: license id, customer/firm id, edition, **entitlements** (enabled features, seat/user cap, environment prod/non-prod), issue date, not-before, **expiry date**, and the issuer signature. **Offline-verifiable** (no phone-home) so on-prem/air-gapped customers work. *DoD: a build rejects any license whose signature or validity window fails.*
- **[P0-for-sale] Enforcement at boot + periodic re-check.** The server validates signature + window on startup and on a schedule; license status (valid / expiring-soon / expired) is exposed to the app. *DoD: an expired license cannot serve governed write actions; a test with a clock-advanced fixture proves it.*
- **[P0-for-sale] Graceful expiry ladder (defined policy).** *Warning window* (e.g. 30 days out): an admin-visible renewal banner. *At expiry:* a *grace period* (e.g. 14 days, configurable) — app goes read-only with a prominent renewal notice; data stays readable and **exportable**. *After grace:* governed write actions (new quotes, approvals, proposals, insight runs) are blocked; **customer data is never deleted**. *DoD: each rung of the ladder is enforced and tested.*
- **[P0-for-sale] Tamper & clock-rollback resistance.** The signature prevents field edits; track the last-seen timestamp in the datastore and refuse a system clock earlier than it (defeats clock rollback). Never gate solely on an editable config flag. *DoD: editing the license file or setting the clock back does not extend access.*
- **[P1] Entitlement enforcement.** Feature flags and seat caps derived from the license, enforced server-side (e.g., an "insights" add-on, subscription-pricing module, or a max active-user count). *DoD: exceeding a seat cap or using a disabled feature is refused by the API.*
- **[P1] Vendor license tooling.** A vendor-side utility to **mint/sign** a license for a customer (window + entitlements), and to **renew** and **revoke**. Integrate license injection into the packaging utility (group 10) so a customer build ships with its initial license; support **in-place renewal** — drop in a new signed token without redeploying code. *DoD: renewing a license is a single signed-file swap.*
- **[P1] License auditability.** License checks and state transitions (valid→expiring→expired→renewed) log to the append-only `events` table; an admin screen shows current license — customer, edition, entitlements, expiry, seats used/allowed. *DoD: an admin can see exactly why the app is (or isn't) licensed.*
- **[P2] Optional online activation/metering.** A heartbeat/activation service for usage metering and remote revocation, offline remaining the default. *DoD: opt-in; disabling it leaves the app fully functional.*

---

## Suggested GA sequencing

1. **Security & identity foundation** — SSO + SCIM, secrets management, transport/headers, the `verify-bid` endpoint. (Nothing else should go live without this.)
2. **Data & ops** — production datastore + backups, migrations, structured logging, health/metrics, CI/CD.
3. **Live LLM + i18n** — verify providers under real keys with cost governance; complete and review Japanese.
4. **Commercial packaging** — white-label brand system + one-click packaging utility + time-bound licensing (groups 10–11). Required before the first external customer sale; sequence it as soon as security+data foundations exist, since branding touches many files and licensing gates the whole app.
5. **Phase-2 evidence loop** — unit capture, calibration, sold-vs-actual (makes the platform whole).
6. **Accessibility, cross-device QA, expanded tests, pen test** — then tag **`v1.0.0`**.

A realistic GA is the P0 + P1 set across groups 1–6 and 8, with group 7 (Phase 2) and the P2 items as the immediate fast-follow if schedule forces a cut — but a `1.0.0` without the evidence loop should be an explicit, documented decision, since "Track → Learn" is core to the product's thesis. **Groups 10–11 (white-label + licensing) are gating for any external/commercial sale even if internal use ships earlier** — the "P0-for-sale" items in those groups must be complete before a branded, licensed build goes to a paying customer such as Minervia Partners.
