# Token Economy / DealSpine — repo guide for Claude Code

*Read this first when you open this repo in a new session. It orients you fast: what this is, how the pieces relate, how to run and test the app, the invariants you must not break, and where to look next.*

Last updated: 2026-07-23. If you make a structural change, update this file.

---

## What this repository is

Two layers that build on each other:

1. **The framework artifacts** (repo root) — the intellectual property: a red-teamed commercial pricing model for AI-enabled SAP delivery. These are the *source of truth for the economics and policy*.
   - `AI-SAP-Pricing-Calculator.jsx` — the reference pricing engine (React/JSX). The app's TypeScript engine is a **verbatim port** of this file's `compute()`. If the economics ever change, they change here first.
   - `AI-Delivery-Data-Capture.xlsx` — the evidence "data spine" (7 sheets).
   - `AI-SAP-Pricing-Framework.pptx` — the 22-slide policy deck. Slides 11–14 are the worked case example ("Custom Code Remediation, ECC → S/4HANA") that the app and the user guide both reproduce.
   - `notes/note_01.md`, `notes/note_02.md` — the original research the whole package grew from.
   - `backups/` — pre-red-team originals. Do not edit; reference only.

2. **DealSpine** (`app/`) — the productization: an internal web app for an SAP advisory practice that turns the framework into a governed workflow (prepare quotes → track delivery → learn). Built Phase 1 + red-team hardening. This is the live, running, tested software.

Supporting documents (all current):
- `SaaS-Product-Requirements.md` — the PRD (target product). Read its top banner: parts are aspirational; `docs/AS-BUILT.md` says what actually exists.
- `Claude-Design-UIUX-Brief.md` + `design/` — the UI/UX contract (Apple Liquid Glass, iOS 27) and the delivered mockups, tokens, and architect review.
- `guide/DealSpine-Guide.md` — the end-user book (all personas, the case example, 16 real screenshots). English only for now.
- `docs/DECISIONS.md` — why the significant choices were made (ADR-style).
- `docs/AS-BUILT.md` — where the implementation deviates from the PRD, and why (the "best practices discovered while building").
- `docs/ROADMAP.md` — what's next (Phase 2, Phase 3, production-hardening backlog).
- `app/QA-BUG-REPORT.md` — the multi-agent bug hunt and its 10 fixes (all resolved, regression-tested).

There is an **older single-file prototype** at the repo root (`src/`, `index.html`, `vite.config.js`, root `package.json`) — this predates `app/` and is *not* the product. The product is `app/`. Don't confuse them.

---

## Running and testing the app (do this first if you're touching code)

```sh
cd app
npm install
npm run seed        # (re)creates data/dealspine.db — users, offerings, insight buttons
npm run dev         # api :8791 + web :8790 (vite proxies /api). Open http://localhost:8790
npm test            # 161 tests — THE MERGE GATE. Must stay green.
npm run build       # tsc -b (typechecks tests too) + vite build
```

Dev login is a user picker (no passwords — SSO is future). Seeded users, one per role, in `app/README.md`. `Bea Tanaka` carries the builder flag (Insight Studio).

**Demo data / screenshots:** `node seed-demo.mjs` (curated quotes via the API) and `node capture.mjs` (headless screenshots for the guide) — both need the dev server running. They use `playwright-core` (browser binary already cached).

---

## The invariants — do not break these

These are enforced by tests; a change that violates one should fail `npm test`. If you must change one, change the test deliberately and say why.

1. **Engine reference case reproduces to the dollar.** remediation preset defaults → traditional revenue **$1,197,000**, base AI cost **≈ $392,446**, naive floor d\* **≈ 32.5%**, risk-adjusted max **≈ 12.5%**, published tiers **$120 / $260 / $520**, default governance **BLOCKED**. (`tests/engine.test.ts`)
2. **The server always re-runs the engine.** Clients send *inputs*; the server computes and stores outputs. Never trust a client-supplied price or governance state.
3. **No internal figure on a customer surface.** The proposal is built from a whitelist object with no cost/margin/floor fields — leakage is structurally impossible and tested in EN + JA (`tests/floor-leakage.test.ts`).
4. **A quote's author can never be its sole approver** (`server/routes/approvals.ts`).
5. **The `events` table is append-only** — SQL triggers reject UPDATE/DELETE. Write only via `logEvent()`.
6. **Role access is server-enforced per §2 of the PRD**, not just hidden in the UI (`tests/access-matrix.test.ts`). The UI hiding nav is convenience; the API guard is the security boundary.
7. **The pricing engine (`src/engine/`) stays pure** — no imports outside the engine directory — so it runs identically client-side (instant sliders) and server-side (authoritative record).

---

## Where things live (app/)

- `server/engine` is imported from `../src/engine` — one engine, shared by API and UI.
- `server/routes/*.ts` — one file per resource; each route carries its own `requireRole(...)` guard.
- `server/app.ts` — Express factory (testable with supertest against `:memory:` SQLite). Error middleware here (no stack/path leakage).
- `server/proposal.ts` — the customer-view whitelist + Markdown/HTML render. The leak-proofing lives here.
- `server/providers.ts` — LLM adapters (Anthropic/OpenAI/Gemini/Grok) **plus a deterministic offline mock** that is the default when no API key is stored. The app is fully functional with zero keys.
- `src/engine/` — `engine.ts` (the port), `asMarkdown.ts` (canonical Markdown per quote — the insight/export packaging format), `presets.ts`, `index.ts`.
- `src/screens/` — one file per screen. `src/shell/Shell.tsx` — glass chrome + theme/glass/language controls + role-filtered nav.
- `src/tokens.ts` mirrors `design/design-tokens.json` verbatim (the visual authority).
- `tests/` — engine invariants, `access-matrix` (§2 cells), `floor-leakage`, `happy-path`, `e2e`, `bugfixes` (regression for the 10 QA defects), smokes.

---

## Conventions that matter

- **Markdown-first.** Unstructured DB columns are `*_md`. Every entity has an `as_markdown()` rendering — it is the single format used for insight packaging, exports, and audit. Content artifacts (prompts, help) are Markdown.
- **Plain-English snake_case schema.** `quotes.max_safe_discount`, never `q_msd`. The schema reads as documentation (this is deliberate — it's what will make the future MCP knowledge base a thin layer).
- **Glass is navigation-layer only.** Numbers live on solid surfaces. If you add UI, keep `backdrop-filter` off content cards, tables, and charts.
- **i18n via `Intl`, never hand-formatted.** Currency follows the *deal*, not the UI language. Customer proposals render in the *customer's* locale. EN + JA are both first-class (JA screens are a later edition, but the plumbing is there).
- **Vibe-coding discipline.** Single app, single DB, plain CRUD, one role column, generated tests as the gate. Keep it simple enough that an AI agent can build and verify each piece.

---

## Current state (2026-07-23)

- Phase 1 is **built, tested (161 green), and running.** All 10 defects from the multi-agent QA hunt are fixed and regression-tested.
- **Evidence** and **Engagements** screens are honest Phase-2 placeholders.
- **No live LLM keys** are configured — insights use the offline mock. Real keys go in Settings → Provider keys (admin only).
- **English UI only** in practice; Japanese plumbing exists but JA screens/translation are a later edition.
- The git repo (`nuvear/token_economy`, branch `main`) is up to date with code and all documents.

## What to do next / where to pick up

- `docs/ROADMAP.md` — Phase 2 (the evidence loop) and Phase 3 (IP registry + MCP knowledge base).
- `docs/PRODUCTION-READINESS.md` — the full `v1.0.0-pilot → GA v1.0.0` activity list: SSO+SCIM, full Japanese, live LLM + secrets, data/ops, security, accessibility, and (groups 10–11) **white-label packaging + time-bound licensing**.
- `docs/AS-BUILT.md` — the specific deviations from the PRD to know before extending anything.

**Commercial direction (D17–D18):** the product is moving to white-label distribution as **full source** — each customer receives the entire codebase (e.g., Nuvear → Minervia Partners), self-hosts it, **integrates the engine with their own systems**, all under a **time-bound license**. Single-company architecture is kept (no multi-tenancy). Implications for anyone touching the code: **(1) don't hardcode brand identity** — product name ("DealSpine") and firm identity ("Nuvear", domain, proposal letterhead) will move into a `brand/` config; route new brand references through it. **(2) keep the engine (`src/engine/`) a clean, importable, license-free module** — it's what the customer integrates; the license layer must stay *separate* from it. **(3) licensing is legal-primary** — since source is delivered, technical license checks are good-faith + tamper-evidence, not DRM. None of this is built yet; all is specified in `docs/PRODUCTION-READINESS.md` groups 10–12.
