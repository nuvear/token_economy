# DealSpine (app)

Internal AI-delivery pricing & evidence platform — pilot build.

## Run

```sh
npm install
npm run seed   # creates data/dealspine.db with users, offerings, insight buttons
npm run dev    # api on :8791 + web on :8790 (vite proxies /api)
```

Open http://localhost:8790 — pick a seeded user (pilot dev login), no password.

`npm test` runs the vitest suite (merge gate: engine invariants, §2 access matrix, floor-leakage, happy paths, e2e). `npm run build` typechecks (tsc -b) and bundles the web app to `dist/` (served by the API server when `NODE_ENV=production`).

## Seeded users (dev login)

| Name | Role | Notes |
|---|---|---|
| Priya Owens | pricing_owner | Admin: publishes parameter sets, manages users & provider keys |
| Sam Alvarez | sales | Own quotes only; approvals request-only; green/approved proposals only |
| Dana Kimura | deal_desk | Approves/rejects; verifies contested-bid evidence |
| Devi Larsson | delivery | Evidence log create+countersign; no approvals/proposal nav |
| Lee Novak | leadership | Read-across + portfolio (primary user); no proposal nav |
| Bea Tanaka | sales + builder flag | Authors Insight Studio prompt buttons |

## What works (Phase 1)

- **Engine** — verbatim TS port of the reference calculator (`compute()`, token economics, 5 presets, 33 gates) in `src/engine/`, pure, versioned (`engine_version` stored per quote with the full input snapshot).
- **Deal workspace** — live client-side compute for sliders; save re-runs the engine server-side (client outputs are ignored); Copy-as-Markdown.
- **Offerings & Policy Studio** — versioned parameter sets; published sets are immutable; publish retires the prior version (pricing_owner only).
- **Approvals** — non-green quotes auto-queue for deal desk (24h SLA); rationale + expiry required; quote author can never be sole approver.
- **Proposal** — customer Markdown/HTML in EN + JA; internal cost/margin/floor figures excluded by template and proven absent by tests.
- **Portfolio** — server-side aggregates (revenue vs floors, GP vs traditional, discount bands, reinvestment funded); sales see own-deal scope.
- **Insights** — seeded prompt-button library; scoped data packaged as Markdown; runs logged (who/button/scope/model); builder-flag users author buttons.
- **Audit** — append-only `events` table (SQL triggers reject UPDATE/DELETE); every mutation logs an event.
- **Shell** — glass chrome (navigation layer only), light/dark themes, glass-intensity stops, EN/JA, nav items hidden per §2 role matrix (server guards enforce regardless).

## Phase-2 placeholders

- **Evidence** and **Engagements** screens are honest placeholders: full screen frame, explanatory empty state, disabled CTAs. Unit-record capture (40-column validated form, CSV import, logged-by ≠ countersigned-by), live calibration, and sold-vs-actual variance land in Phase 2.
- Win/loss capture and rolling validated-alternative benchmarks: Phase 2.
- Asset registry, risk playbook, MCP/knowledge-base exposure: Phase 3.

## LLM provider keys

Default is the **offline mock provider**: with no key stored, every insight run uses a deterministic local mock that answers from the packaged Markdown — no network calls, safe for demos and tests. The pricing owner can store real provider keys (Anthropic, OpenAI, Gemini, Grok) under Settings → Provider keys; keys are held server-side only, write-only from the client, never returned by any API.

## Architecture (10 lines)

1. One app, one SQLite file (`data/dealspine.db`), plain-English snake_case schema.
2. `server/` — Express on 8791: `db.ts` (open + migrate), `auth.ts` (dev login → signed cookie; `requireAuth`/`requireRole` guards per §2), `app.ts` (factory, testable), `seed.ts`.
3. Audit = append-only `events` table (triggers reject UPDATE/DELETE); write via `logEvent()` only.
4. `src/engine/` — PURE pricing engine (no imports); `compute()` port + invariant tests land here; quotes store `input_snapshot_json` + `outputs_json` + `engine_version`.
5. `src/` — Vite + React 18: tiny hash router (`App.tsx`), one file per screen in `src/screens/`.
6. `src/shell/Shell.tsx` — glass chrome (app bar + rail ONLY; content surfaces solid) with theme, glass-intensity, and EN/JA controls; nav filtered by role.
7. `src/tokens.ts` mirrors `../design/design-tokens.json` verbatim — the visual authority.
8. `src/i18n.ts` — `t(key)` EN/JA + `Intl` formatters; currency follows the deal, not the UI language.
9. Markdown-first: unstructured columns are `*_md`; every entity grows an `as_markdown()` rendering used for insight packaging and exports.
10. Tests are the merge gate: engine invariants, §2 access matrix, floor-leakage on proposal output, API happy paths, e2e script (`npm test`).
