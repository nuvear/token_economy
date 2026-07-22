# DealSpine — Decisions Log

*Why the significant choices were made. Newest decisions are numbered highest. Each records the decision, the reasoning, and the consequence. This is the "why" behind `docs/AS-BUILT.md` (the "what").*

Last updated: 2026-07-23.

---

## Product-shape decisions (set before the build)

### D1 · Internal tool, not a commercial SaaS *(superseded by D17 for GA)*
DealSpine was initially built for one advisory practice's own use, not licensed to peers. **Why:** the user scoped it down; removed multi-tenancy, per-tenant billing, and cross-company benchmark governance from the pilot. **Consequence:** single-company data model, dev-login, no benchmark network at launch. **Update (2026-07-23):** the product direction changed to white-label distribution — see **D17**. The single-company architecture is retained (each customer gets a separate packaged build), so this decision's *simplicity* holds even though its *"internal-only"* framing is superseded.

### D2 · The deck already publishes the math; the moat is evidence + workflow
The pricing formulas are openly documented in the deck and the reference JSX. **Why:** secrecy of the formula was never the advantage — the calibrated evidence base and the governance workflow are. **Consequence:** the engine is a straight, readable port (no obfuscation); value is placed in the evidence loop, the governance gates, and (future) the knowledge base.

### D3 · AI-native from v1
Multi-provider LLM integration (Anthropic, OpenAI, Gemini, Grok, local Gemma) and an Insights page of builder-authored prompt buttons are core, not an add-on. **Why:** the practice wants LLM insight over its own data as a first-class capability. **Consequence:** the `providers.ts` adapter layer, the `insight_buttons` / `insight_runs` tables, and the Insight Studio exist in Phase 1. See D11 for the offline default.

### D4 · Markdown-first storage
Unstructured content is Markdown; every entity has a canonical `as_markdown()` rendering; the schema is plain-English snake_case. **Why:** one representation serves the human reviewer, the querying LLM, and the future MCP knowledge base — no translation layers, no drift. **Consequence:** `asMarkdown.ts` is the packaging format for insights and exports; the schema reads as documentation; the MCP end-state becomes a thin layer over existing data.

### D5 · Built and tested via "vibe coding"
The app is developed by AI-assisted coding, so simplicity is a hard requirement. **Why:** an AI agent must be able to build and verify each piece safely. **Consequence:** single app + single SQLite DB, no ORM/microservices/queues, one `role` column with one guard per route, and a generated test suite as the merge gate. Anything that can't be built and verified this way is descoped.

### D6 · Apple Liquid Glass (iOS 27 generation), adapted for web
The UI follows the WWDC 2026 Liquid Glass refinements. **Why:** the practice wanted a premium, current design language. **Consequence:** glass is a navigation-layer material only (numbers on solid surfaces); the design tokens (`design/design-tokens.json`) are the visual authority mirrored into `src/tokens.ts`; glass-intensity stops and reduced-transparency fallbacks are built in.

### D7 · End state: the app becomes an agent knowledge base (MCP)
After 6–12 months of governed use, curated best practices serve AI agents via a read-only MCP server under the same role-based access. **Why:** the accumulated evidence and playbook are the compounding asset. **Consequence:** D4 (Markdown-first) is the enabler; curation flags and canonical renderings are being written toward this now. Not built in Phase 1 — see roadmap.

---

## Build-time decisions (discovered while implementing — deviations from the PRD are intentional)

### D8 · The engine is a pure, verbatim TypeScript port of the reference JSX
`src/engine/engine.ts` reproduces `AI-SAP-Pricing-Calculator.jsx`'s `compute()` field-for-field. **Why:** the economics are already red-teamed and correct; re-deriving them risks divergence. Keeping it pure (no imports) lets it run identically in the browser (instant sliders) and on the server (authoritative record). **Consequence:** an invariant test suite pins the reference case to the dollar; if the economics change, change the JSX first, then re-port. Same field names as the JSX so the UI copy maps 1:1.

### D9 · The server is authoritative; clients send inputs, never outputs
Every quote save re-runs the engine server-side and stores `input_snapshot_json` + `outputs_json` + `engine_version`. **Why:** a client could otherwise forge a price or a green governance state. **Consequence:** any historical quote is reproducible; the stored governance state can be trusted.

### D10 · Audit is an append-only `events` table with SQL triggers
Instead of the PRD's abstract "immutable event log," a plain table with UPDATE/DELETE-rejecting triggers, written only via `logEvent()`. **Why:** simplest thing that gives a real tamper-evident audit trail under D5. **Consequence:** no event-sourcing machinery; the audit trail is queryable SQL.

### D11 · Offline deterministic mock is the default LLM provider
With no API key stored, every insight run uses a local deterministic analysis computed from the packaged Markdown. **Why:** the app must be fully functional (and demoable, and testable) with zero keys and no network. **Consequence:** the Insights feature works out of the box; the UI transparently labels "fell back to offline mock"; real keys (admin-stored, write-only) switch the same buttons to live models.

### D12 · Attestation gates default to FALSE; severity escalates by quote stage
Governance attestations (unit-acceptance, security, warranty, etc.) start unchecked; they are *warnings* at Pilot stage and *hard blocks* at Production. **Why:** carried from the red-team hardening — a fresh deal must earn its checkmarks, but pilots aren't blocked by unfinished paperwork. **Consequence:** a brand-new quote is never accidentally "green"; the workspace shows the governance discipline immediately (the case example loads BLOCKED, which is the teaching point).

### D13 · Security hardening from the multi-agent QA hunt (10 fixes)
A 6-agent bug-hunt workflow found 14 defects (deduped to 10), all fixed and regression-tested. The load-bearing ones became architectural rules:
- **Segregation of duties on bid verification** — only deal_desk/pricing_owner may mark a competing bid "Verified"; a non-privileged author's attempt is clamped, never accepted. (Interim: a clamp in `applyOverrides`. Future: a dedicated `POST /quotes/:id/verify-bid` endpoint — see roadmap.)
- **Insight data-scope is coupled to roles server-side** — floor/cost-bearing scopes (`policy`, `current_quote`) can never be granted to or run by roles not permitted to see floors; enforced at publish (clamp) and at run (403), not just in the client.
- **Every unhandled error returns a clean JSON code** — no stack traces or filesystem paths reach clients (error middleware in `app.ts`).
- **All external input is validated** — finite numbers, non-negative magnitudes, bounded percentages, object-only array elements; malformed input is a 400, never a 500 crash.
See `app/QA-BUG-REPORT.md` for the full list and `app/tests/bugfixes.test.ts` for the regression tests. **Why:** the hunt's own verdict was "not production-ready — server-side authorization gaps"; these close them. **Consequence:** the access matrix and input validation are now test-pinned.

### D14 · Customer needs are met by generated documents, not a portal (Phase 1)
No external customer logins. Proposals, classification exhibits, and telemetry extracts are generated documents. **Why:** fastest path to a working internal loop; the portal is Phase 3. **Consequence:** the proposal screen exports HTML; the contractual commitments stand; only the self-service surface waits.

### D15 · A small camelCase↔snake_case seam at the offering boundary
The engine uses camelCase field names (matching the JSX, D8); the DB schema is snake_case (D4). `offerings.base_inputs_json` is snake_case and mapped to camelCase when loaded; the workspace maps its camelCase preset keys to the DB's snake_case `preset_key` when saving. **Why:** each side keeps its own idiomatic convention. **Consequence:** one mapping function on each boundary (documented; a QA bug came from missing the second one — now fixed and tested).

### D16 · `playwright-core` as a dev dependency for tooling
Added to script curated demo data (`seed-demo.mjs`) and capture guide screenshots (`capture.mjs`) against the real running app. **Why:** authentic governance states and real screenshots beat hand-mocked ones. **Consequence:** a dev-only dependency; the browser binary is cached locally; not needed to run or ship the app.

---

## Commercial-direction decisions (post-pilot)

### D17 · White-label distribution under time-bound licenses *(revises D1)*
DealSpine will be sold to multiple advisory firms, each running it under **their own brand** (the deploying firm today is Nuvear; a customer such as Minervia Partners must see only their own identity), under a **time-bound license**. **Why:** the product has value beyond one practice; white-labeling and licensing turn it into a sellable asset. **Model:** each customer is a **separately packaged single-tenant build** — not a multi-tenant SaaS — produced by a one-click packaging utility from a per-customer brand config, with a signed license injected at package time. **Consequence (deliberately architecture-preserving):** the existing single-company design (D1, D5) is kept intact — no multi-tenancy, no shared database, no tenant-isolation complexity; each sale is an isolated branded, licensed deployment. What this *adds* is: (a) a brand-token system so no identity is hardcoded, (b) the packaging utility that rebrands code + customer docs and runs the test gate, and (c) a time-bound licensing layer with a graceful, data-preserving expiry ladder. Full activity list: `docs/PRODUCTION-READINESS.md` groups 10–11. **Open question for the vendor:** whether the platform name "DealSpine" is also white-labeled per customer or kept as the vendor's product brand (the schema supports either — `productName` is a brand token).
