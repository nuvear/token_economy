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

*The product is sold to multiple advisory firms, each under its own brand (today the deploying firm is **Nuvear**; a customer such as **Minervia Partners** must see only their own identity). **The delivery form is full source** — the customer receives the entire codebase, self-hosts it, and may integrate the engine (D18). So "packaging" produces a **branded source distribution**, not a black-box binary. No brand identity may be hardcoded. See `docs/DECISIONS.md` D17–D18; each customer is a separate single-tenant deployment, which keeps the architecture simple (no multi-tenancy).*

- **[P1] Brand-token extraction.** Centralize every brand string and asset into one source: `brand/brand.config.json` + `brand/assets/`. Today the product name ("DealSpine") and the firm identity ("Nuvear", its domain, and the proposal letterhead) are hardcoded across ~20 files (`src/shell/Shell.tsx`, `src/screens/Login.tsx`, `server/proposal.ts`, every screen, the i18n dictionaries incl. JA, and `server/seed.ts`). Replace each with a read from a brand context. *DoD: grepping the literal vendor/product brand strings in `app/src` + `app/server` returns zero hits outside `brand/`.*
- **[P1] Brand config schema.** `productName`; `firm` (legal name, display name, short name, per-locale name incl. JA); `logo` (SVG light + dark); `favicon`; `primaryDomain`; brand `colors` that override the `design-tokens.json` palette (navy/gold/ice → the customer's palette, flowing through `src/tokens.ts` so one accent recolors the whole app); proposal `letterhead` + `footer` + `legalEntity`; `supportEmail`; default `locale`/`currency`/`region`. *DoD: a documented, validated schema with a worked `minervia` example.*
- **[P1] Runtime brand context.** The app loads the brand config at boot; UI reads product name/logo/colors from context; the proposal renderer reads letterhead/firm/legal entity from it. Colors route through the token layer, not per-component overrides. *DoD: swapping the brand config alone rebrands the running app with no code edits.*
- **[P1] Customer-facing documentation templating.** Decide the split: vendor-internal docs (this plan, `DECISIONS.md`, `CLAUDE.md`) stay generic; **customer-delivered** docs (the user guide, an admin guide) are branded. Templatize their brand references (`{{PRODUCT_NAME}}`, `{{FIRM_NAME}}`, `{{DOMAIN}}`) and regenerate per customer, re-capturing branded screenshots via the existing `capture.mjs` (it already parameterizes locale/user). *DoD: the delivered guide shows only the customer's brand.*
- **[P0-for-sale] The one-click packaging utility.** `npm run package -- --brand=minervia` (`scripts/package-brand.mjs`) that, from a brand config, in one command: (1) **validates** the config — all required fields, assets present, brand colors pass WCAG AA on their surfaces; (2) **applies** brand context + asset replacement + token overrides; (3) **substitutes** brand into customer-facing docs and the guide and re-captures branded screenshots; (4) **injects the license** (group 11) and the commercial `LICENSE` + source license headers; (5) runs `npm test` + `npm run build` on the branded output; (6) emits a **branded source distribution** — a clean git bundle / source tarball the customer can read, build, and integrate (plus, optionally, a prebuilt container for convenience) — tagged `<customer>-<version>-<license-window>`, with an **integrity manifest** (hashes of the delivered files) so the vendor can attest exactly what was shipped. It **fails loudly** on any partial substitution, missing asset, contrast failure, or red test. *DoD: `package --brand=minervia` produces a green, fully-rebranded, licensed **source** distribution with zero Nuvear/vendor identity anywhere, in a single command.*
- **[P1] Brand-leak QA.** Automated residual-brand scan (string + visual diff of key screens) that the packaging step runs and the CI enforces. *DoD: a planted vendor string fails the package.*
- **[P1] Re-packaging pipeline.** Because each customer is a separate distribution, define how a core code change (especially a security fix) is rebuilt and re-issued to **every** customer brand from one source of truth, with each customer's license preserved — and how a customer who has *integrated/modified* their source takes the update (documented upgrade path, semver, changelog). *DoD: a one-line engine/security change reaches all customer distributions through the pipeline, not by hand.*

## 11. Licensing & entitlements (time-bound, under source delivery)

> **Enforcement reality (D18).** The customer receives full source, so a license check can technically be edited out — **hard DRM is impossible and is not the goal.** The **commercial license agreement (legal) is the primary control.** The technical layer is **good-faith enforcement + the recurring-renewal touchpoint + tamper-evidence**: a legitimate customer honors the signed license (they cannot forge the vendor signature to self-extend the term), the app degrades gracefully at expiry, and audit/telemetry make overrun *detectable*.
>
> **Revenue model (D19).** The app ships **locked** and unlocks only against a **vendor-signed, time-bound activation key** the vendor mints upon payment — **renewal requires the vendor's consent (a fresh signed key = the recurring fee).** Sustained revenue is anchored in value only the vendor can supply (maintenance/quarterly rate-card refresh, the curated knowledge-base subscription), not the bypassable lock. Full model and revenue lines: `docs/MONETIZATION.md`.

- **[P0-for-sale] Commercial license agreement (the real teeth).** A written license: term/expiry, licensed scope (named customer, environments, seat/usage limits), **integration & modification rights** (they may integrate the engine and modify their copy) and **restrictions** (no redistribution/sublicensing/resale; no removing the license mechanism or notices; source-modification terms), warranty/support terms, and the consequences of expiry. Ship it as the `LICENSE` file plus per-file source license headers. *DoD: legal-reviewed agreement delivered with every distribution; headers on every source file.*
- **[P0-for-sale] Signed license token (good-faith technical enforcement).** A cryptographically signed license, verified with the vendor's public key that ships in the source, containing: license id, customer/firm id, edition, **entitlements** (enabled features, seat/user cap, environment), issue date, not-before, **expiry date**, signature. **Offline-verifiable** (no phone-home) for self-hosted/air-gapped customers. The customer can *read* the public key but cannot *forge* a vendor signature, so a legitimate signed license can't be self-extended without editing the check (which the legal agreement prohibits). *DoD: the app rejects a license with a bad signature or an out-of-window date.*
- **[P0-for-sale] Graceful, data-preserving expiry ladder.** *Warning window* (e.g. 30 days out): admin-visible renewal banner. *At expiry:* a *grace period* (e.g. 14 days, configurable) — app goes read-only with a prominent renewal notice; data stays readable and **exportable**. *After grace:* governed write actions (new quotes, approvals, proposals, insight runs) are blocked; **customer data is never deleted or locked away.** *DoD: each rung enforced and tested with a clock-advanced fixture.*
- **[P1] Tamper-evidence (not tamper-proofing).** License checks and state transitions log to the append-only `events` table; track the last-seen timestamp and flag a system clock earlier than it (a legitimate deployment never rolls back). Optionally the packaged integrity manifest (group 10) lets the vendor detect whether the license code was altered. These make overrun *visible and evidentiary for the legal agreement* — they don't pretend to prevent a source edit. *DoD: an expiry overrun or clock-rollback leaves an auditable trail.*
- **[P0-for-sale] Ships locked; unlock is the consent key (D19).** The app is inert until a valid vendor-signed activation key is present; the vendor mints the key on payment and mints a fresh one on renewal (the recurring touchpoint). Offline token drop is the default; online activation (below) is the stronger, revocable form. *DoD: a fresh install without a vendor-signed key does not serve governed actions; dropping in a valid key unlocks it for the paid term.*
- **[P1] Subscription entitlements sold via the key.** Feature flags, seat caps, and optional modules (insights via a vendor gateway, subscription-pricing module, benchmark subscription) are entitlements inside the signed key, enforced in the app; selling an add-on or more seats = re-issuing the key. *DoD: exceeding a seat cap or using a disabled entitlement is refused by default; a re-issued key grants it with no code change.*
- **[P1] Vendor license tooling.** A vendor-side utility to **mint/sign** a license (window + entitlements), **renew**, and **revoke**; the vendor holds the private signing key. Integrate license injection into the packaging utility (group 10) so a distribution ships with its initial license; support **in-place renewal** — the customer drops in a new signed token, no code change. *DoD: renewing is a single signed-file swap; the private key never leaves the vendor.*
- **[P2] Optional license telemetry/heartbeat.** An opt-in periodic phone-home for usage metering and expiry-overrun detection; **off by default** so air-gapped customers are unaffected. *DoD: disabling it leaves the app fully functional.*
- **[P1] Admin license view.** An admin screen shows the current license — customer, edition, entitlements, expiry, seats used/allowed — and its state (valid/expiring/expired/renewed), sourced from the license token and the `events` log. *DoD: an admin can see exactly why the app is (or isn't) licensed and when it renews.*

## 12. Engine integration & embeddability (customer integrates with their systems, D18)

*The customer wants to integrate the pricing/governance engine with their existing systems (CPQ, CRM, ERP). The engine is already pure and importable (`src/engine/`) — GA makes it a first-class, documented, versioned, embeddable interface, and the license layer stays separable so embedding is friction-free.*

- **[P0-for-integration] Stable public engine API.** Freeze and document the engine's public surface: `compute(input) → result`, the governance verdict, and `asMarkdown` — with a typed input/output contract, the meaning of `engine_version`, and the invariant guarantees (reference case reproduces to the dollar). Semver the engine; a breaking change bumps major. *DoD: a published API reference; the invariant tests ship so the customer can verify integrity in their environment.*
- **[P1] Integration modes.** Document and support three ways to consume it: (a) **embed the library** — import the pure engine module directly into their Node/TS app; (b) **call the REST API** — run DealSpine headless and call `/api/quotes` etc.; (c) **headless engine service** — the engine + governance without the UI. *DoD: a worked example for each mode.*
- **[P1] Integration surfaces for "their existing systems".** SSO to *their* IdP (group 1); connectors/adapters or a documented data-contract for their datastore, CRM/CPQ/ERP; import/export leveraging the Markdown-first design (D4); an events/webhook feed off the append-only `events` table so their systems can react to quotes/approvals. *DoD: an integration guide covering auth, data in/out, and events.*
- **[P1] License/engine separation.** Keep license enforcement out of the engine module so embedding the engine carries no license friction, while the delivered *product* remains governed by the license (D18). *DoD: the engine module has no dependency on the license layer; importing it needs no license.*
- **[P1] Integration SDK & examples.** A small SDK/typed client and example integrations (e.g., "price a deal from your CRM", "post approvals to Slack"), plus the API reference. *DoD: a customer engineer integrates the engine from the guide alone.*
- **[P2] Backwards-compatibility policy.** A documented deprecation/compat policy for the engine API and the DB schema so a customer who has integrated survives upgrades (ties to the group-10 re-packaging/upgrade path). *DoD: written policy; a compat test guards the public surface.*

---

## Suggested GA sequencing

1. **Security & identity foundation** — SSO + SCIM, secrets management, transport/headers, the `verify-bid` endpoint. (Nothing else should go live without this.)
2. **Data & ops** — production datastore + backups, migrations, structured logging, health/metrics, CI/CD.
3. **Live LLM + i18n** — verify providers under real keys with cost governance; complete and review Japanese.
4. **Commercial packaging & integration** — white-label brand system, one-click **source** packaging utility, time-bound licensing, and the stable public engine API for customer integration (groups 10–12). Required before the first external customer sale; sequence as soon as security+data foundations exist, since branding touches many files, licensing gates the app, and the engine API is what the customer integrates.
5. **Phase-2 evidence loop** — unit capture, calibration, sold-vs-actual (makes the platform whole).
6. **Accessibility, cross-device QA, expanded tests, pen test** — then tag **`v1.0.0`**.

A realistic GA is the P0 + P1 set across groups 1–6 and 8, with group 7 (Phase 2) and the P2 items as the immediate fast-follow if schedule forces a cut — but a `1.0.0` without the evidence loop should be an explicit, documented decision, since "Track → Learn" is core to the product's thesis. **Groups 10–12 (white-label + licensing + engine integration) are gating for any external/commercial sale even if internal use ships earlier** — the "P0-for-sale" / "P0-for-integration" items must be complete before a branded, licensed **source** distribution goes to a paying customer such as Minervia Partners, who will self-host and integrate it. Remember the D18 reality: since source is delivered, the **commercial license agreement is the primary control** and the technical license is good-faith enforcement + tamper-evidence.
