# DealSpine — As-Built vs the PRD

*What actually exists in `app/` as of 2026-07-23, reconciled against `SaaS-Product-Requirements.md`. Where the build deviates from the PRD, the deviation is intentional and the reason is in `docs/DECISIONS.md` (D-numbers cited). Read this before extending the app so you build on what's there, not what was only planned.*

## Status by PRD module

| PRD module | As-built status | Notes |
|---|---|---|
| M1 · Offering & Policy Studio | **Built** | Versioned parameter sets, publish + immutability, rate cards, staleness clock, pricing-owner-only edit. |
| M2 · Deal Workspace | **Built** | Full engine parity, live client compute, contested-bid path, 33 gates, capability-drift, GP/total-hour. |
| M3 · Proposal Generator | **Built** (portal deferred) | Customer HTML/Markdown, EN+JA, structural floor/cost exclusion. Customer portal → Phase 3 (D14). |
| M4 · Governance, Gates & Approvals | **Built** | Queue, quantified detail, approve/re-scope/no-bid, rationale+expiry, author≠approver, append-only audit. |
| M5 · Evidence Capture | **Placeholder** | Honest Phase-2 frame + empty state. Workbook remains the offline template. |
| M6 · Sold-vs-Actual & True-up | **Placeholder** | Engagements screen is a Phase-2 frame. |
| M7 · Calibration & Learning | **Not built** | Phase 2. Evidence gates read self-declared sample counts today, not measured. |
| M8 · IP & Asset Registry | **Not built** | Phase 3. |
| M9 · Portfolio & Analytics | **Built** | Server-side aggregates: revenue-vs-floor, GP-vs-traditional, discount bands, reinvestment, floor adherence. |
| M10 · Subscription / AMS | **Not built** | Phase 3 (the engine supports a subscription pricing model; no service/contract tracking yet). |
| M11 · Integrations & API | **Partial** | Internal REST API + dev login exist. SSO, CRM, ATC import, LLM billing reconciliation → future. |
| Insights (AI-native, §3) | **Built** | Prompt buttons, Insight Studio, provider adapters + offline mock (D11), run logging, scope→role coupling (D13). |

## Where the build deviates from the PRD (intentional)

1. **Engine is a verbatim port of the reference JSX**, not a re-implementation from the PRD formulas (D8). The JSX is the economic source of truth; the PRD describes intent.
2. **Auth is a dev-login user picker**, not SSO (D1). SSO/SCIM is a production-hardening item.
3. **Audit is a concrete append-only SQL table with triggers**, not abstract "event sourcing" (D10).
4. **Attestation gates default FALSE with Pilot=warn / Production=hard** severity (D12) — stricter and more nuanced than the PRD's flat "hard gate" description; carried from red-team hardening.
5. **Offline deterministic mock is the default insight provider** (D11) — the PRD assumed live keys; the build works fully offline.
6. **Customer portal is replaced by generated documents** in Phase 1 (D14).
7. **Bid verification is currently a server-side clamp**, not yet the dedicated deal-desk `verify-bid` endpoint the ideal design calls for (D13; see roadmap). Behaviour is correct today (a non-privileged author cannot relax the floor); the endpoint is a cleaner future form.
8. **Insight scope→role coupling is enforced server-side** beyond what the PRD spelled out (D13) — a security tightening found by the QA hunt.
9. **Numeric input validation and error-response hygiene** were added beyond the PRD (D13) — no 500s from bad input, no stack/path leakage.
10. **A camelCase↔snake_case seam** exists at the offering boundary (D15) — an implementation detail the PRD didn't anticipate; documented and tested.

## Not yet built — required for commercial GA (D17)

The product direction moved to white-label distribution as **full source** under time-bound licenses, with the customer integrating the engine (`docs/DECISIONS.md` D17–D18). None of this exists in the pilot; all is specified in `docs/PRODUCTION-READINESS.md` groups 10–12:

- **Brand-token system.** Product name ("DealSpine") and firm identity ("Nuvear", domain, proposal letterhead) are currently **hardcoded across ~20 files**; GA requires centralizing them into a `brand/` config read by a runtime brand context.
- **One-click packaging utility.** A command that rebrands code + customer docs from a per-customer brand config, injects a license, runs the test gate, and emits a **branded source distribution** (git bundle/tarball) with an integrity manifest.
- **Time-bound licensing (legal-primary).** Since source is delivered, the commercial license agreement is the primary control; the technical layer is a signed, offline-verifiable license with a graceful, data-preserving expiry ladder, entitlement/seat enforcement, and tamper-evidence — not DRM.
- **Engine integration.** A stable, versioned, documented public engine API and integration modes (embed the library / REST / headless service), with the license layer kept separable from the engine module.

## What exists that the PRD didn't specify

- **The offline mock provider** (D11) — a genuine feature: full insight functionality with zero API keys, transparently labelled.
- **`asMarkdown()` per entity as a first-class packaging format** (D4) — used by insights, exports, and (future) MCP.
- **`app/QA-BUG-REPORT.md`** — the audit trail of the multi-agent bug hunt and its 10 fixes.
- **`seed-demo.mjs` / `capture.mjs`** — dev tooling for curated demo data and headless guide screenshots (D16).

## Test coverage (the merge gate)

161 tests across 9 files: engine invariants (reference case to the dollar), the §2 access matrix (every role × route class), floor-leakage on the proposal (EN + JA), API happy paths, the e2e flow (login → quote → block → approve → proposal → insight → portfolio), 10 bug regressions, and smokes. `npm test` must stay green; `npm run build` typechecks tests too.
