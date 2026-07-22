# DealSpine — Roadmap

*Where to pick up. Phase 1 is built, tested, and running (see `docs/AS-BUILT.md`). This is the forward plan, most-ready first. Last updated: 2026-07-23.*

## Phase 2 — Close the evidence loop (the next build)

The goal: move Evidence and Engagements from placeholders to function, so the numbers the workspace quotes come from measured reality instead of preset assumptions.

- **Unit-record capture (M5).** The workbook's Object_Log (40 columns) becomes a validated web form + CSV/XLSX import. Enforce logger ≠ countersigner; record token source; stamp the config version on every row. Screens exist as frames — fill them in.
- **Live calibration (M7).** Per offering × complexity class × config version, compute measured c/e/q, rework, warranty rate, tokens (baseline-minute weighted). Surface measured values beside entered ones in the workspace; turn the honor-system `calibrationConfirmed` checkbox into a computed match/mismatch.
- **Evidence gates read live counters.** Today the sample-policy gates read self-declared numbers; wire them to the calibration counters (n per class, distinct projects, distinct customers, recency).
- **Sold-vs-actual & true-up (M6).** Link a won quote (frozen snapshot) to rolling delivery actuals; variance dashboard with named drivers (mix drift, rework, tokens, delay); symmetric class-mix true-up; warranty ledger.
- **Win/loss capture.** Record competitor type and observed price at close; feed rolling validated-alternative benchmarks into the workspace anchor block.

## Phase 3 — Compound the IP

- **Asset registry (M8).** Prompt packs, accelerators, classification rulebooks — versioned, each with a measured uplift delta (partner-stack vs. vanilla-control from the workbook protocol).
- **Risk & mitigation playbook.** Seed from the red-team findings; accumulate engagement variance drivers as case evidence; surface relevant entries in the quote flow.
- **Subscription / AMS economics (M10).** Service-event and contract tracking; measured cost-to-serve; subscription quotes gated on that evidence (the engine already supports a subscription pricing model).
- **Customer portal (M3 completion).** Joint classification countersign, warranty self-service, telemetry-extract download, proposal acceptance — replacing the Phase-1 generated documents (D14).
- **The MCP knowledge base (D7 — the end state).** Expose the curated Markdown corpus (measured calibration, closed engagements with variance, playbook, published policy, proven prompts) to AI agents via a **read-only MCP server** under the same role-based access and logging as human users. Because of the Markdown-first decision (D4), this is a thin layer, not a project. Tools like `get_calibrated_parameters`, `search_precedents`, `get_playbook_entry`, `render_quote_md`; resources = the curated `.md` corpus. Gate on ~6–12 months of accumulated governed use.

## Production-hardening backlog (do before real customer data / go-live)

> The complete, workstream-organized activity list to take `v1.0.0-pilot` → GA `v1.0.0` (SSO, full Japanese, live LLM, data/ops, security, accessibility) is in **`docs/PRODUCTION-READINESS.md`**. The summary below is the short version.

These are known gaps in the pilot build, ordered by importance:

1. **Real authentication.** Replace the dev-login user picker with SSO (SAML/OIDC) + SCIM. The role model and guards are already in place.
2. **The `verify-bid` endpoint.** Replace the interim server-side clamp (D13) with a dedicated deal-desk-only `POST /quotes/:id/verify-bid` that flips a server-tracked `bid_verified` flag and re-enters unverified state on any bid edit — the clean segregation-of-duties form.
3. **Secrets management.** Provider API keys and the cookie-signing secret currently use env vars / a dev default; move to a real secret store; set `NODE_ENV=production` (the error handler already suppresses stack traces regardless).
4. **Rate limiting & request-size caps** on the public API surface (LLM run endpoints especially).
5. **Japanese screens (later edition).** The `Intl` plumbing, JA dictionaries, and JA proposal template exist; complete the JA UI strings and localize the user guide.
6. **Persistence & backups** for the SQLite DB (or migrate to Postgres if scale demands — the schema is portable; the code uses plain SQL, no ORM lock-in).
7. **Real LLM provider verification.** The adapters in `providers.ts` speak the right shapes but have only been exercised against the offline mock; validate each live provider before relying on it.

## Non-goals (explicitly not planned)

- Multi-tenancy / licensing to peer firms (D1 — internal tool).
- Cross-company benchmark network (deferred; documented as a future option only if peer trust and demand appear).
- Replacing CRM, ALM/Jira, or the ATC scan tooling — DealSpine integrates with these, it doesn't rebuild them.
