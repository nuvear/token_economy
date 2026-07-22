# DealSpine — Internal Platform Requirements

> **This is the target PRD, not the current state.** Phase 1 is built and running. For what actually exists and where the implementation intentionally deviates from this document, read **`docs/AS-BUILT.md`**; for *why* those choices were made, **`docs/DECISIONS.md`**; for what's next, **`docs/ROADMAP.md`**. New to the repo? Start with **`CLAUDE.md`**.

**AI-Delivery Pricing & Evidence Platform — internal tool for the advisory practice**

| | |
|---|---|
| Status | Draft v3.0 (internal, advisory use only; built and tested via AI-assisted "vibe coding" — simplicity is a requirement, not a preference) |
| Date | 22 July 2026 |
| Source assets | AI-SAP-Pricing-Calculator.jsx (engine + views), AI-Delivery-Data-Capture.xlsx (evidence spine), AI-SAP-Pricing-Framework.pptx (policy deck), 36 verified red-team findings |

---

## 1. Purpose

One internal web application that replaces the three loose artifacts with a closed loop:

1. **Prepare** — advisory and deal teams simulate AI-delivery deals, run the governance gates, and generate customer-safe proposals.
2. **Track** — delivery logs per-unit actuals against the sold quote (sold-vs-actual), warranties and true-ups included.
3. **Learn** — measured c/e/q, rework, tokens, and competitor anchors recalibrate the next quote; accelerators and risk learnings accumulate as reusable assets.

The math already exists and is tested (`compute()` reproduces the reference case exactly: revenue $1,197,000 · base AI cost $392,446 · legacy d\* 32.5% · risk-adjusted max discount 12.5%). The platform is the shared database, workflow, and learning loop around it — replacing retyped dashboard values, hash-stamped JSON files, and browser localStorage.

**Not in scope:** selling the tool to other partners, cross-company benchmarks, customer logins (documents are generated instead), running ATC scans (imports only), replacing CRM or Jira.

### The case in one page — low effort, immediate value

**Why this is cheap to build.** The expensive parts of a pricing platform — the economic model, the governance rules, the evidence schema, the proposal content, the training material — are already built and red-team-tested:

| Already exists (tested) | Remaining work |
|---|---|
| Pricing engine: ~900 lines of pure logic, 34 governance gates, invariant tests that reproduce the reference case to the dollar | Port to a shared library — mechanical |
| Five working UI views (deal workspace, risk & policy, customer view, portfolio, training academy) | Reuse with a backend behind them |
| Evidence schema and calibration math (40-column log, weighted formulas, evidence gates) — specified and verified in the workbook | Turn into a form + database table |
| Policy content, worked examples, battlecards, objection handling (the deck) | Load as defaults and enablement pages |

What remains is plumbing: a database, company SSO, forms, and a PDF template. Indicative effort: **Phase 1 ≈ 2 developers × 6–8 weeks**; Phase 2 similar. No tenancy, compliance-certification, or go-to-market overhead, because it is internal.

**Why management should care.** In the reference deal ($1.2M traditional baseline), pricing the same AI-delivered scope as T&M loses ~$252K of gross profit; governed value pricing gains ~$89K — a ~$340K swing on one mid-size deal. The platform makes that swing systematic instead of heroic: quotes below the floor physically cannot leave the building, proposals carry evidence procurement can't puncture, and leadership sees GP-per-delivery-hour, floor adherence, and reinvestment across the portfolio in one place. **One governed deal pays for the entire build several times over.**

**Why the team should care.** Sales stops improvising: the contested-bid path, the anchor rules, and the objection playbook give a sanctioned answer for every hard moment in a negotiation. Delivery's one-minute-per-unit log is what makes their estimates and warranties defensible — their credibility, compounding. The deal desk gets a queue with context instead of email threads. Nobody retypes spreadsheet values into a calculator again, and nobody gets blamed for a discount the tool would have blocked.

---

## 2. Personas and access management

Five roles, assigned per user by the admin. Access is enforced per page and per action — simple to build (one role column on the user, one guard per route) and simple to test (one access test per cell of this matrix).

| Page / action | Pricing owner (admin) | Sales / advisory | Deal desk | Delivery / PMO | Leadership |
|---|---|---|---|---|---|
| Offerings, rate cards, parameter sets, bands & floors | **Edit + publish** | Read (floors hidden if policy says so) | Read | Read | Read |
| Deal workspace (simulate, save quotes) | Edit | **Edit (own quotes)** | Edit | Read | Read |
| Contested-bid entry & evidence | Edit | Edit | **Verify** | — | Read |
| Approvals, overrides, exceptions | Read | Request only | **Approve / reject** | — | Read |
| Proposal generation (customer PDF) | Yes | **Yes (green/approved quotes only)** | Yes | — | — |
| Evidence log (unit records) | Read | Read | Read | **Create + countersign** (logger ≠ countersigner) | Read |
| Engagements, sold-vs-actual, true-ups, warranty ledger | Read | Read (own deals) | Read | **Edit** | Read |
| Portfolio & analytics | Read | Own-deal view | Read | Read | **Read (primary user)** |
| Insights page (click prompt buttons, view results) | Yes | Yes | Yes | Yes | Yes |
| Insight Studio (author prompt buttons) | Yes | Users with the **builder flag** (any role, granted by admin) | | | — |
| LLM provider keys & model routing | **Yes** | — | — | — | — |
| User & role admin | **Yes** | — | — | — | — |

Two hard rules the tests must prove: (1) internal cost, margin, and floor figures never render on any proposal output regardless of role; (2) a quote's author can never be its sole approver.

---

## 3. What gets built (three phases)

### Phase 1 — Governed quoting (replaces the calculator)

- **Engine as a shared library.** Port `compute()` + token economics to TypeScript with the existing invariant tests; every quote stores the engine version and full input snapshot, so any historical quote is reproducible.
- **Offering & policy studio.** The five presets become editable offerings. Parameter sets are versioned and published by the pricing owner; bands, floors, defense margin, and reinvestment floor are read-only for everyone else. Rate cards by role and geography (e.g. Tokyo onsite / Chennai offshore); LLM price list with a staleness clock.
- **Deal workspace.** Full parity with today's calculator: blended and tier modes, anchor evidence block (validated alternative with source/date/confidence; unsourced factors clamped), contested-bid path with defense floor, all 34 gates (attestations default false: warnings at Pilot, hard at Production), scenario compare, capability-drift projection, GP per total delivery hour.
- **Approvals & audit.** Blocked/exception quotes route to a deal-desk queue (24h SLA); overrides need rationale + approver + expiry; append-only audit log; quote author ≠ sole approver. "No calculator run, no quote" becomes checkable fact.
- **Proposal generator.** One-click customer PDF from the customer view: price, tier table, savings vs. validated alternative, warranty terms (duration, cap, cycles), mix-tolerance clause, telemetry commitment, evidence-grade stamp. Internal figures are excluded by template, not discipline.
- **Portfolio page.** Server-side replacement for the localStorage view: deals, revenue vs. floors, GP vs. traditional, discounts vs. bands, reinvestment funded.
- **AI-native Insights (v1).** The app ships AI-integrated from day one: an **Insights page** of customizable prompt buttons. A technical engineer (builder flag) authors a button = a stored prompt template + a declared data scope (e.g. current quote, portfolio summary, engagement variance) + a provider/model choice; any user clicks it, the app packages the scoped data with the prompt, calls the selected LLM, and streams the answer back. Providers: **Anthropic, OpenAI, Gemini, Grok (xAI), and local Gemma 4 on-device** (mobile/edge — for insights that must not leave the device). API keys are admin-managed, stored encrypted server-side, never exposed to the client; every run respects the caller's data-access rights (§2) and is logged (who, which button, which data scope, which model). Seed library: "Explain this quote's governance state", "Where is this deal below policy?", "Summarize portfolio floor adherence for the exec meeting", "Draft the objection-handling talking points for this contested bid".

### Phase 2 — Evidence loop (replaces the workbook)

- **Unit capture.** The Object_Log's 40 columns become a validated web form + CSV/XLSX import (the workbook stays as the offline template). Logged-by ≠ countersigned-by enforced; token source recorded; config version (model/prompt/agent) stamped on every row.
- **Live calibration.** Per offering × class × config version: measured c/e/q (baseline-minute weighted), rework, warranty rate, tokens in/out — with sample counts and recency. The quote form shows measured values beside entered ones; "matches evidence" becomes computed, not a checkbox. Evidence gates read these counters directly.
- **Sold-vs-actual.** Engagement links a won quote (frozen snapshot) to rolling actuals; variance dashboard with named drivers (mix drift, rework, redeployment shortfall, tokens, delay), each mapped to the reserve that did or didn't cover it. Symmetric mix true-up and shared-improvement credit computed automatically. Warranty ledger: claims, SLA, reserve consumed vs. funded.
- **Win/loss capture.** Competitor type and observed price per unit recorded at close; rolling validated-alternative benchmarks feed the anchor block.

### Phase 3 — IP & learning reuse

- **Asset registry.** Prompt packs, agent workflows, classification rulebooks, accelerators — versioned, linked to engagements, each with a measured uplift delta from the vanilla-control samples (Δe, Δq, Δrework). "Platform IP" claims require a number.
- **Risk playbook.** The 36 verified red-team findings seed a living risk/mitigation library; engagement variance drivers accumulate as case evidence; the quote flow surfaces relevant entries ("deals like this get attacked on X — here is the sanctioned answer").
- **Drift alerts & reinvestment ledger.** New model generation or provider repricing flags stale configs and open quotes; the reinvestment carve-out accrues per deal into a tracked fund.
- **Customer-facing documents, upgraded.** Classification-exhibit and closeout telemetry-extract generation (from live data) — still documents, still no customer logins.
- **Subscription/AMS economics** (if the practice needs it): service events, cost-to-serve, renewals — subscription quotes gated on that evidence.
- **Knowledge base & MCP server (the 6–12 month objective).** After 6–12 months of use, the platform's accumulated best practices become directly consumable by AI agents — via an **MCP server** or as a plain knowledge base. Because of the Markdown-first decision, this is exposure, not construction: the knowledge base *is* the canonical Markdown renderings plus the versioned `.md` artifacts.
  - **What qualifies as knowledge (curated, not dumped):** measured-grade calibration parameters (per offering × class × config version, with sample sizes), closed engagements with reconciled sold-vs-actual variance and named drivers, risk-playbook entries with accumulated case evidence, the current published policy (bands, floors, gates), win/loss patterns with competitor anchors, and the proven prompt library. A `curated` flag marks records that have passed review — agents see best practice, not raw exhaust.
  - **MCP server (read-only at launch):** tools such as `get_calibrated_parameters(offering, class)`, `get_policy(offering)`, `search_precedents(deal_characteristics)`, `get_playbook_entry(risk)`, `render_quote_md(quote_id)`, `list_prompts(category)`; resources = the curated `.md` corpus. Any AI agent (a future proposal-drafting agent, a delivery copilot, next year's vibe-coding session) consumes the practice's hard-won evidence as structured tools.
  - **Same governance as humans:** agent access uses service accounts bound to the §2 role matrix; floor/cost scopes require a restricted service role; every tool call is logged like an insight run. The knowledge base inherits the platform's access model — it does not bypass it.

---

## 4. Technical shape — built for vibe coding

The architecture is deliberately boring so that AI-assisted development can build, test, and modify every part of it safely:

- **One app, one database.** A single full-stack React + TypeScript application (e.g. Next.js or Vite + a small Node server) with Postgres (SQLite acceptable for the pilot). No microservices, no queues, no event sourcing — the audit log is an ordinary append-only table.
- **The engine stays pure.** `compute()` ports as-is into a plain TS module with its existing invariant test harness. Pure functions are what vibe coding tests best — every pricing change is provable by re-running the reference-case suite.
- **CRUD everywhere else.** Offerings, quotes, approvals, unit records, engagements are plain tables with forms. Quote snapshots are a JSON column (input + engine version + outputs). Proposal PDFs render from one template.
- **AI- and human-friendly data, Markdown-first.** The data layer must be equally legible to humans, to the LLM insight runs, and to the AI agents that build and maintain the app:
  - *Structured data* stays relational, with plain-English snake_case tables and columns that read as documentation (`quotes.max_safe_discount`, not `q_msd`); no opaque codes; enums as readable strings.
  - *All unstructured content is Markdown* — override rationales, approval comments, insight prompts and results, risk-playbook entries, proposal and classification templates, help pages, release notes. No proprietary rich-text formats anywhere.
  - *Every entity renders as Markdown*: a canonical `as_markdown()` view per record (quote, engagement, gate results, variance report) is THE packaging format for insight-button data scopes, exports, audit reviews, and email — one representation serves the human reading it and the LLM reasoning over it.
  - *Content artifacts live as versioned .md files in the repo* (prompt library seeds, playbook entries, help/training pages, proposal templates), so they are diffable, reviewable in pull requests, and editable by vibe-coding agents like any other source file.
- **Auth kept trivial:** Google Workspace / company SSO login, one `role` column per user, one guard per route. No permission trees, no groups.
- **Test strategy (the safety net that makes vibe coding viable):** (1) engine invariant suite — reference case to the dollar, plus the gate-behavior tests already written; (2) one access test per cell of the §2 matrix; (3) floor-leakage test on every proposal render; (4) a handful of end-to-end happy paths (quote → block → approve → proposal → log units → variance). All generated and run in CI; a change that breaks any of these does not merge.
- **Integrations stay file-based:** ATC scan CSV import, LLM billing CSV import, workbook XLSX import/export. No live connections to customer systems or CRM in v1.
- **Internationalization (v1 requirement).** The UI ships bilingual: **US English and Japanese**, switchable per user (stored preference, instant switch, no reload). All formatting is locale-driven via the standard `Intl` APIs — never hand-formatted strings:
  - *Dates/times:* `2026年7月22日` / `22:30` for `ja-JP`; `Jul 22, 2026` / `10:30 PM` for `en-US` (other English locales — en-GB, en-AU — follow their `Intl` defaults). Timestamps store UTC; display in the user's timezone.
  - *Currency:* JPY renders `¥1,234,567` (no decimals); USD `$1,234,567`; currency is a property of the offering/deal, not of the UI language — a Japanese-UI user quoting a USD deal sees USD formatted correctly, and vice versa.
  - *Numbers:* thousands separators and percent formats per locale; tabular numerals everywhere.
  - *Content:* UI strings in locale files (EN keys as source of truth); proposals, classification exhibits, and telemetry extracts generate in the **customer's** locale independent of the author's UI language; Markdown content fields remain author-language (no machine translation of records).
  - Insight buttons may declare an output language ("answer in Japanese") as part of the prompt template.

---

## 5. Migration

| Today | Becomes |
|---|---|
| Calculator JSX | Engine library + Phase-1 UI (largely a port, not a rewrite); node test harness → CI contract test |
| Workbook | UnitRecord schema + calibration math (formulas already specified); remains the offline capture template |
| Deck | Policy-studio defaults + sales-enablement content; internal/external split enforced by roles |
| Hash-stamped quote JSONs | Imported as historical quotes |
| Red-team findings | Phase-3 risk playbook seed + acceptance tests (e.g. "no customer-visible surface exposes the floor") |

---

## 6. Success criteria

- Built and tested via AI-assisted development: the full test suite (engine invariants, access matrix, floor-leakage, end-to-end paths) runs green in CI from the first release onward.
- Every AI-scoped quote in the advisory practice runs through the platform (target > 95% within 6 months of Phase 1).
- Phase 2: first parameter set republished from measured actuals; median sold-vs-actual GP variance < 5 pts by an engagement's close.
- Zero floor-leakage incidents on customer-visible outputs (tested, not hoped).
- Delivery logging burden ≤ 1 minute per unit record.
- By month 12: the curated knowledge corpus is live behind the MCP server, and at least one agent workflow (e.g. proposal-drafting assistant or delivery copilot) consumes it in production — the practice's evidence serving agents, not just screens.

## 7. Risks (from the red-team exercise, carried forward)

Gamed evidence → countersigning + token reconciliation + config-version counters. Floor leakage → template separation + RBAC + CI leakage tests. Anchor circularity → evidence-graded anchors fed by win/loss data. Capability drift → drift alerts + projected-floor exposure. Attestation theater → defaults false, Pilot-warn/Production-hard, expiring overrides.

## 8. Decisions log

1. **Internal tool only** — used by the company's advisory practice; not offered or licensed externally. No commercial pricing, no peer tenancy, no cross-company benchmarks.
2. **Engine openness moot internally** — it is a shared internal library; the deck already publishes the math, so no secrecy machinery around formulas. The valuable part is the evidence base and workflow.
3. **No customer portal** — customer-facing needs are met with generated documents (proposal, classification exhibit, telemetry extract).
4. **ATC import only** — the platform never connects to customer SAP systems.
5. **Vibe-coding build** — the application is developed and tested via AI-assisted coding. Consequences are binding requirements: single app + single database, pure-function engine, plain CRUD, one role column with per-route guards, file-based integrations, and a generated test suite (engine invariants, access matrix, floor leakage, happy paths) as the merge gate. Anything that cannot be built and verified this way is descoped or deferred.
6. **AI-native from v1** — multi-provider LLM integration (Anthropic, OpenAI, Gemini, Grok, local Gemma 4 on-device) behind an admin-managed key vault; the Insights page with builder-authored prompt buttons is a first-class module, not an add-on. Guardrails: runs are scoped to the caller's data rights, logged, and rate-limited; the internal floor/cost data is only includable in a button's data scope if the button is restricted to roles that may see it. Repo: https://github.com/nuvear/token_economy. UI/UX is delivered by the "Claude Design" engineer against the brief in `Claude-Design-UIUX-Brief.md` (Apple Liquid Glass, **iOS 27 generation / WWDC 2026** — incl. user glass-intensity control and adaptive-legibility rules; PPTX brand palette; desktop/tablet/mobile).
7. **Markdown-first, AI- and human-friendly storage** — plain-English relational schema; all unstructured content stored and rendered as Markdown; a canonical Markdown rendering per entity is the single packaging format for insight runs, exports, and audits; content artifacts (prompts, playbook, help, templates) are versioned `.md` files in the repo. One representation for the human, the querying LLM, and the vibe-coding agent.
8. **End state: the app is a knowledge base for agents.** After 6–12 months of governed use, the accumulated best practices are served to AI agents via a read-only MCP server (tools + curated `.md` resources) under the same role-based access and audit logging as human users. Design consequence today: every feature writes toward that corpus — curation flags, canonical Markdown renderings, and plain-English schema are what make the future MCP server a thin layer instead of a project.
