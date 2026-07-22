# Token Economy → DealSpine

A red-teamed commercial pricing framework for AI-enabled SAP delivery, productized as **DealSpine** — an internal, governed pricing & evidence app for an SAP advisory practice.

New here (human or AI)? **Read [`CLAUDE.md`](CLAUDE.md) first** — it orients you to the whole repo in a few minutes.

## Map

| Path | What it is |
|---|---|
| `AI-SAP-Pricing-Calculator.jsx` · `AI-Delivery-Data-Capture.xlsx` · `AI-SAP-Pricing-Framework.pptx` | The framework artifacts — the economic/policy source of truth (the deck's slides 11–14 are the worked case example). |
| `notes/` | The original research the package grew from. |
| `SaaS-Product-Requirements.md` | The product requirements (the target). |
| `Claude-Design-UIUX-Brief.md` · `design/` | UI/UX contract (Apple Liquid Glass, iOS 27) + delivered mockups, tokens, architect review. |
| **`app/`** | **DealSpine — the running, tested application (Phase 1).** |
| `guide/DealSpine-Guide.md` | End-user book: all personas, the case example, real screenshots. |
| `docs/AS-BUILT.md` · `docs/DECISIONS.md` · `docs/ROADMAP.md` | What's built vs the PRD · why · what's next. |
| `docs/PRODUCTION-READINESS.md` · `CHANGELOG.md` | The activity list from `v1.0.0-pilot` → GA `v1.0.0` · release history. |
| `app/QA-BUG-REPORT.md` | The multi-agent bug hunt and its 10 fixes (all resolved). |
| `backups/` | Pre-red-team originals (reference only). |

## Run the app

```sh
cd app && npm install && npm run seed && npm run dev
# open http://localhost:8790 · npm test = the 161-test merge gate
```

## Status (2026-07-23)

Phase 1 built, 161 tests green, running. Evidence/Engagements are Phase-2 placeholders; insights use an offline mock until real LLM keys are added; UI is English (Japanese plumbing present, screens later). Repo `nuvear/token_economy`, branch `main`, is current with code and docs.
