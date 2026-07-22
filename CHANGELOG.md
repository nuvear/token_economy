# Changelog

All notable changes to DealSpine. Format: reverse-chronological; dates ISO.

## [1.0.0-pilot] — 2026-07-23

First tagged milestone: **Phase 1 complete, red-teamed, and tested.** A functional internal pilot of the DealSpine AI-delivery pricing & evidence platform. Not yet production-hardened — see `docs/PRODUCTION-READINESS.md` for the path to a general-availability `1.0.0`.

### Added — application (`app/`)
- **Pricing engine** — pure TypeScript verbatim port of the red-teamed reference calculator (`compute()`, token economics, 5 offering presets, 33 governance gates, contested-bid path, capability-drift projection). Reproduces the reference case to the dollar.
- **Deal Workspace** — live client-side compute for sliders; server re-runs the engine on save (client outputs ignored); Copy-as-Markdown.
- **Policy Studio** — versioned parameter sets, publish + immutability, rate cards, staleness clock (pricing-owner only).
- **Approvals** — deal-desk queue, quantified detail, approve/re-scope/no-bid with rationale + expiry, author-≠-approver enforced.
- **Proposal generator** — customer HTML/Markdown in EN + JA, internal figures structurally excluded (leak-proof, tested).
- **Portfolio** — server-side aggregates: revenue-vs-floor, GP-vs-traditional, discount bands, reinvestment, floor adherence.
- **AI-native Insights** — prompt-button library, Insight Studio (builder-flag authoring), provider adapters (Anthropic/OpenAI/Gemini/Grok) plus a deterministic **offline mock** default so the app is fully functional with no API keys.
- **Governance & audit** — 33-gate engine; append-only `events` table (SQL triggers reject UPDATE/DELETE); every mutation logged.
- **Shell** — Apple Liquid Glass (iOS 27) chrome (navigation-layer only), light/dark themes, glass-intensity stops, EN/日本語, role-filtered nav.
- **Test gate** — 161 tests: engine invariants, §2 access matrix, floor-leakage (EN+JA), happy paths, e2e, and 10 bug regressions.

### Security & correctness (from the multi-agent QA bug hunt — all 10 confirmed defects fixed)
- Segregation of duties on competing-bid verification (only deal-desk/pricing-owner).
- Server-side role enforcement of floor/cost insight scopes.
- Error middleware (no stack-trace or filesystem-path leakage).
- Numeric input validation (no 500s from malformed input).
- Delivery role denied the approvals queue; user role/builder admin endpoint; offline-provider gate-count fix; governance numbers moved off glass onto solid surfaces.
- Full report: `app/QA-BUG-REPORT.md`; regressions: `app/tests/bugfixes.test.ts`.

### Documentation
- `CLAUDE.md`, `README.md`, `docs/AS-BUILT.md`, `docs/DECISIONS.md`, `docs/ROADMAP.md`, `guide/DealSpine-Guide.md` (end-user book, 16 screenshots).

### Known limitations (deferred to production `1.0.0`)
- Auth is a dev-login user picker (no SSO). Provider keys/cookie secret use env-var defaults.
- LLM insights default to the offline mock; live providers unverified.
- Evidence & Engagements are Phase-2 placeholders; calibration and sold-vs-actual not yet built.
- UI is English in practice (Japanese plumbing present; screens/translation later).
- Single SQLite file; no backups/HA; no rate limiting.
