# Design Brief for "Claude Design" — DealSpine UI/UX

> This entire document is the prompt. Hand it to Claude Design verbatim.

---

You are **Claude Design**, the UI/UX engineer for **DealSpine** — an internal, AI-native pricing and evidence platform for an SAP advisory practice. I am the solution architect; this brief contains my binding architectural decisions. Your job is to design the complete UI/UX — every screen, every state, desktop/tablet/mobile — and deliver design tokens, a component library, and per-screen specifications that an AI-assisted ("vibe-coding") developer can implement directly in React + Tailwind without further design decisions.

**Repository:** https://github.com/nuvear/token_economy — study it first. It contains the working calculator (`AI-SAP-Pricing-Calculator.jsx`: five views — internal deal workspace, risk & policy, customer value, portfolio, help/training), the evidence workbook, the policy deck (`AI-SAP-Pricing-Framework.pptx` — the brand source), and `SaaS-Product-Requirements.md` (product scope, personas, access matrix). The existing views define the information architecture; you are re-skinning and re-structuring them into a product, not inventing content.

---

## 1. Design language: Apple Liquid Glass, **iOS 27 generation (WWDC 2026)**, adapted for the web

Apply Apple's **updated Liquid Glass as released with iOS 27 at WWDC 2026** — the refined generation, not the iOS 26 original — translated to a responsive web app. Verify details against the current HIG; the iOS 27 refinements that must shape this design:

1. **Tuned diffusion for legibility.** iOS 27 diffuses complex content behind glass far more effectively, with more depth and separation. Web translation: our glass tokens pair `backdrop-filter` blur with a calibrated dimming/saturation layer so text over glass never depends on what happens to scroll beneath it.
2. **User-controlled glass intensity (the iOS 27 slider).** Users can now dial Liquid Glass from clear to fully opaque system-wide. DealSpine mirrors this: a **glass-intensity control in Settings (and quick-toggle in the user menu)** with at least three stops — Full glass · Reduced · Opaque. "Opaque" reuses the reduced-transparency fallback tokens. Design every glass surface to be beautiful at all three stops; screenshot deliverables include the Opaque state.
3. **Adaptive transparency.** iOS 27 reads the busyness of content behind a surface and reduces blur/transparency over high-entropy backgrounds. Web translation: surfaces overlaying busy content (charts, dense tables) automatically step up their dimming tier — define two dimming tiers in the tokens (`over-calm`, `over-busy`) and specify which applies per surface.
4. **Contrast guarantees at any setting.** iOS 27's new APIs let apps hold icon/control contrast regardless of the user's glass setting. Our equivalent is a hard rule: **every text/control-on-glass pair meets WCAG AA at every intensity stop** — the a11y annex (§ deliverables) must show the contrast table per stop.
5. **Automatic inheritance.** Apps adopting the system got iOS 27's improvements for free — emulate that property: all glass styling flows from the token set, so a future tuning pass edits tokens, never components.

The three HIG principles carry over from the iOS 26 foundation and still govern every decision:

1. **Hierarchy** — depth, translucency, and elevation communicate importance. Controls float above content; primary actions are more prominent than secondary; modal surfaces sit visibly above their parent.
2. **Harmony** — custom UI shares one shape language, corner-radius system, and spacing rhythm. Nothing fights the glass chrome.
3. **Consistency** — the same patterns adapt (not get replaced) across desktop, tablet, and mobile.

### The one rule you may never break

**Liquid Glass is a navigation-layer material, not a content-layer material.**

- Glass **belongs on**: the top app bar, the side navigation rail, floating action clusters, sheets/drawers/modals, menus and popovers, the Insights run-bar, toast/status pills.
- Glass is **forbidden on**: KPI cards, tables and their rows, form fields, charts, proposal previews, dense text. Content is **solid and readable**; controls float above it. No glass-on-glass nesting. No glass on scroll-recycled rows. Numbers are the product — they sit on solid surfaces, always.

### Surface inventory (architect's source of truth — follow it)

| Surface | Layer | Glass | Variant / notes |
|---|---|---|---|
| Top app bar (logo, search, user, provider status) | Navigation | Yes | `regular`; condenses on scroll |
| Side nav rail (desktop/tablet) / bottom tab bar (mobile) | Navigation | Yes | `regular`; system-style |
| Floating action cluster on Deal Workspace (Save · Export · Generate proposal) | Navigation | Yes | `regular`, one shared cluster |
| Governance verdict banner (WITHIN POLICY / DEAL DESK / BLOCKED / NO-BID) | Navigation | Yes | `regular` + semantic tint — this is the app's signature surface |
| Sheets: gate detail, approval action, override form, insight result panel | Navigation | Yes | `regular`; morphs on expand |
| Insights prompt buttons (the customizable button grid) | Navigation | Yes | `regular`; capsule; provider badge |
| Insight result panel while streaming | Navigation | Yes | `clear` over a dimmed scrim, solid card once complete |
| KPI tiles, tables, charts, forms, proposal preview, unit-capture form | Content | **No** | Solid `ice`/white surfaces on light, solid navy panels on dark |
| Login | Navigation | Yes | One glass card over a subdued brand backdrop |

**Performance budget:** ≤ 8 simultaneous glass surfaces per screen (mobile target ≤ 5); `backdrop-filter` only on the surfaces above; no full-screen glass overlays during scroll; test on a mid-range phone.

### Glass clusters and morphing (budget: exactly 4 hero morphs)

Group adjacent glass elements into shared clusters (one blur context, coordinated blending — the web analog of `GlassEffectContainer`): (a) app bar + nav rail, (b) the floating action cluster, (c) the Insights run-bar + provider selector.

The four morphing interactions — no more:
1. **Governance banner → gate-detail sheet** (the banner expands into the full gate list; its tint carries over).
2. **Insight button → result panel** (the clicked capsule morphs into the streaming panel — the AI-native signature moment).
3. **Floating action cluster → proposal-preview sheet.**
4. **Mobile bottom tab bar → unit-capture sheet** (delivery's one-minute log entry).

Everything else uses plain fades/slides. Honor `prefers-reduced-motion` by replacing morphs with cross-fades.

### Accessibility (non-negotiable, test-gated)

- `prefers-reduced-transparency` → every glass surface has a documented solid fallback (navy `#16243D` at 98% for dark chrome, `#EEF4FC` for light chrome) — the same tokens the in-app "Opaque" intensity stop uses (iOS 27 slider paradigm), so OS setting and app setting converge on one look.
- `prefers-reduced-motion` → morphs become fades; no parallax.
- `prefers-contrast: more` → borders on all cards, full-opacity text.
- WCAG 2.2 AA contrast on every text/background pair **including text on glass** (add the dimming layer if sampling breaks contrast); keyboard-complete; visible focus rings (gold, 2px); VoiceOver/ARIA labels on all glass controls — visual prominence does not auto-translate to semantic prominence.
- Type scales with user font-size settings up to 200% without loss of function (test the deal workspace at 200%).

---

## 2. Brand system (extracted from the policy deck — do not invent colors)

Consultancy-grade branding in the McKinsey/BCG mold: one dominant dark tone carrying authority, one warm accent used sparingly for emphasis and action, generous whitespace, restrained charts. The palette below is lifted from `AI-SAP-Pricing-Framework.pptx` and the existing calculator; it is the complete list.

| Token | Hex | Role & weight |
|---|---|---|
| `navy` | `#16243D` | Primary brand surface — chrome backdrop, hero panels, dark sections. **60–70% of visual weight.** |
| `navy-2` | `#24385C` | Secondary panels, hover states on navy |
| `slate` | `#3C4C66` | Body text on light, secondary panels |
| `muted` | `#6B7A93` | Captions, hints, disabled |
| `ice` | `#D9E6F7` | Light panel fill, text on navy |
| `ice-2` | `#EEF4FC` | Page background, card fill (light mode) |
| `gold` | `#E8A33D` | **The accent.** Primary actions, active states, key numbers, focus rings. Sparingly — if gold exceeds ~10% of a screen, redesign. |
| `gold-deep` | `#C77F1A` | Section labels, gold hover |
| `red` | `#C0504D` | Semantic: blocked / hard failure / destructive only |
| `green` | `#4E8A5A` | Semantic: pass / within policy only |

**Tint semantics for glass (fixed list — a fifth tint requires a new semantic and my sign-off):** neutral chrome = untinted `regular` glass over navy; **gold** = primary action / active; **green** = governance pass; **red** = governance block / destructive. Deal-desk/warning states use `gold-deep`.

**Typography:** one variable sans family (Inter or SF-equivalent), weights 400/600/800. Display 28–32 · section 20 · body 14–15 · caption 11–12 · **tabular numerals for every figure**. Uppercase tracked labels (the deck's `TRACKING` style) only for section kickers — never body text.

**Charts** follow the existing Recharts look: navy/ice series, gold for the highlighted series, red/green only for semantic states, no gradients, no 3D, gridlines `#E4E9F2`.

**Voice:** headlines like the deck — declarative, no fluff ("Grow the spread. Guard the floor."). Empty states teach (reuse Help-view copy).

### Internationalization: US English + 日本語 (both are first-class, v1)

The app ships bilingual with a per-user language switch (user menu, instant). Design for both from the first mockup — retrofit is not an option:

- **Type stack per locale:** Latin — Inter (or SF-equivalent); Japanese — Noto Sans JP (or Hiragino Sans), matched weights. Slightly larger line-height for JA body (1.7 vs 1.5); no italics in JA (use weight or color for emphasis); numerals stay Latin and tabular in both locales.
- **The uppercase tracked kicker style does not exist in Japanese.** Define the JA equivalent once: same gold-deep color and size, normal tracking, optional leading dot (・) — and apply it consistently.
- **Layout tolerance:** every label container must survive both languages — EN runs longer, JA runs denser. No fixed-width labels, no truncation of policy-critical terms ("BLOCKED", 「ブロック」). Test strings for the worst case are part of your redlines.
- **Formats are locale-driven, never drawn:** dates (`2026年7月22日` vs `Jul 22, 2026`), times, numbers, percents. **Currency follows the deal, not the UI language** — a JA-UI user on a USD deal sees `$1,234,567`; an EN-UI user on a JPY deal sees `¥1,234,567` (no decimals). Design number cells wide enough for `¥` amounts (no decimal point but larger magnitudes).
- **No text in images or icons.** All states (governance verdicts, gate pills, empty states) are string-driven so they translate.
- **Proposal renders in the customer's locale** regardless of the author's UI language — design the JA proposal template as its own deliverable (JA business-document conventions: recipient line, date format, seal/signature block placement).
- **Deliverable addition:** the Deal Workspace, governance banner states, Insights page, and proposal preview mocked in **both languages**; the token file carries the per-locale font stacks and line-height overrides.

---

## 3. Responsive architecture

One design system, three adaptations — same patterns, adapted, never replaced:

| | Desktop ≥1280 | Tablet 768–1279 | Mobile <768 |
|---|---|---|---|
| Navigation | Glass left rail, labels visible | Rail collapses to icons; overlay drawer | Glass bottom tab bar (5 slots by role) |
| Deal workspace | 3 columns: inputs · results/charts · governance | 2 columns; governance docks as a sticky glass bar | Single column, stepper (Baseline → AI cost → Pricing → Verdict); verdict is a persistent glass pill that expands |
| Tables | Full tables | Priority columns + row expand | Cards, one record per card |
| Insights | Button grid + persistent result side-panel | Grid; result as sheet | **Primary surface** — insights and unit capture are the two mobile-first jobs |
| Unit capture | Side panel | Sheet | Full-screen sheet, ≤ 1 minute to complete, works offline, thumb-reach controls |

Mobile is not a shrunk desktop: its jobs are (1) click an insight button, (2) log/countersign a unit record, (3) check a deal's governance state, (4) approve an exception. Design those four flows natively; everything else may defer to desktop.

---

## 4. Screens to deliver (all three breakpoints, light + dark)

1. **Login** — SSO; one glass card; brand backdrop (subdued navy gradient, no imagery).
2. **Home** — role-aware: sales sees own pipeline + governance states; deal desk sees the approval queue; delivery sees engagements + capture shortcut; leadership sees portfolio KPIs.
3. **Deal Workspace** — the heart. Port of the internal + risk views: input sections, KPI grid, scenario chart, gain-share curve, allocation bridge, floor tests, 34-gate list with pass/warn/fail pills, contested-bid block, governance verdict banner (hero surface). Include: evidence-vs-entered comparison chips, capability-drift line, per-tier P&L table.
4. **Approvals queue** (deal desk) — cards with quantified context, approve / re-scope / no-bid actions, override form (rationale + expiry mandatory), audit trail viewer.
5. **Policy Studio** (pricing owner) — offerings, versioned parameter sets with publish flow and diff view, rate cards, LLM price list with staleness clock.
6. **Proposal preview** — exact customer PDF rendering; a visible "internal figures excluded" assurance; generate/download. Nothing on this screen may show cost, margin, or floor — design the layout so the omission is structural.
7. **Evidence capture** — the 40-field unit record as a grouped, dropdown-driven form (≤1 min); countersign queue; import (CSV/XLSX) flow with validation results.
8. **Engagement / sold-vs-actual** — frozen quote vs. rolling actuals, variance drivers, mix true-up, warranty ledger.
9. **Portfolio** — deals table, revenue vs. floors, GP/total-hour trend, discount distribution vs. bands, reinvestment fund.
10. **Insights page + Insight Studio** — see §5.
11. **Settings/Admin** — users & roles, builder flags, **LLM providers & keys** (Anthropic, OpenAI, Gemini, Grok, local Gemma 4), insight-run audit log.
12. **Help & training academy** — port of the existing Help view including the Japan/offshore scenario; add per-screen "what am I looking at?" popovers reusing its copy.

Also design: empty states, loading/streaming states, error states (LLM provider down, key invalid, offline capture), and the BLOCKED/NO-BID governance states — the blocked state must feel firm but constructive (it routes you to the deal desk; it never dead-ends).

## 5. The Insights page (AI-native signature — get this perfect)

**Concept:** a wall of customizable buttons. Each button *is* a prompt. A builder (technical engineer) authors it once; anyone clicks it forever.

**Runner experience (all users):**
- Buttons are glass capsules in a grid, grouped by category (Deal · Portfolio · Delivery · Strategy), each showing: name, one-line description, provider badge (Claude / GPT / Gemini / Grok / **On-device Gemma 4** with a "never leaves this device" privacy chip), and data-scope chip ("uses: current quote", "uses: portfolio summary").
- Click → the capsule morphs into the result panel (hero morph #2): packaging step ("gathering quote data…"), streaming answer, then a solid result card with copy/save/share-to-deal actions and a "what was sent" disclosure (exact data scope + prompt, for trust).
- Context awareness: on a quote or engagement page, relevant buttons appear in a compact glass run-bar ("Insights for this deal").
- Result history per user; re-run with one tap; provider fallback prompt if the selected LLM is unavailable.

**Builder experience (builder flag):**
- "New button" flow: name/category/icon → **prompt editor** with typed variables (`{{quote}}`, `{{portfolio_summary}}`, `{{engagement_variance}}`, `{{gate_results}}`, `{{competitor_observations}}`…) inserted from a picker, never free-typed → **data-scope declaration** (checkboxes; scopes containing floor/cost data force a role restriction on the button — surface this rule in the UI) → provider + model + temperature → test-run split view (prompt preview | live result) → publish (with version history and rollback).
- Buttons are shareable within the org and pinnable; admin can feature a "seed library" row.
- Design the empty state for a fresh install: 6 seed buttons visible but clearly editable ("This is a prompt. Duplicate it. Make it yours.").

**Trust & governance surface (design requirements, not options):** every result shows model + provider + timestamp; every run is logged (visible in Settings); data-scope chips are always visible before clicking; on-device runs are visually distinct (green-tinged privacy chip is the only permitted non-semantic green use — justify or drop it).

**Markdown is the content format — design for it everywhere:**
- Insight results ARE Markdown: the result panel is a first-class Markdown renderer (headings, tables, lists, code, blockquotes) styled with the brand type scale — design that rendered look, including how an LLM-generated table sits on a solid card.
- The "what was sent" disclosure shows the actual Markdown package (prompt + data scope) in a readable mono-styled view — trust through legibility.
- The builder's prompt editor is a Markdown editor with the typed-variable picker; live preview beside it.
- Every long-text field in the app (override rationale, approval comment, playbook entry, help page) is authored and displayed as Markdown — one editor component, one renderer component, reused everywhere. Design both once, well.
- Every record view (quote, engagement, variance report) offers "Copy as Markdown" — the same canonical rendering the insight buttons package. Make it a standard, quiet action in the page header.

## 6. Deliverables I expect back from you

1. **Design tokens** (JSON + Tailwind config): the palette above, spacing (4px grid), radius scale (capsule / 12px cards / 16px sheets / concentric nesting rule), elevation/blur tiers, typography scale, light + dark values, reduced-transparency fallback values.
2. **Component library spec:** glass app bar, nav rail/tab bar, verdict banner (4 tinted states), gate pill, KPI tile, section card, slider/num/select/check rows (port the existing ones), data table (+ mobile card variant), sheet, insight button capsule, provider badge, result panel, streaming indicator, toast, empty state. Each with states (default/hover/focus/disabled/loading), a11y notes, and its reduced-transparency fallback.
3. **High-fidelity mockups** of all 12 screens × 3 breakpoints × light/dark (Figma or equivalent), plus the 4 morphing interactions as motion specs (duration, easing, reduced-motion fallback).
4. **Interaction spec** for the two signature flows: quote → blocked → deal desk → approved → proposal; and insight button author → publish → run.
5. **Accessibility annex:** contrast table for every text/surface pair, focus order per screen, ARIA landmark map, the reduce-transparency/motion/contrast behavior matrix.
6. **Redlines/handoff notes** written for an AI-assisted developer: every component maps to Tailwind utilities + a small `glass` utility class set you define; no bespoke CSS beyond it.

## 7. Constraints and acceptance

- React + TypeScript + Tailwind, single app; the pricing engine and its numbers are already correct — never redesign a formula, a threshold, or a label's meaning.
- Simplicity is a requirement (vibe-coding build): if a component can't be described in one sentence to a developer AI, split it.
- Internal floor/cost/margin data appears on internal surfaces only; the proposal preview and anything shareable is structurally incapable of showing it. This is CI-tested; design accordingly.
- Don't fight the reference implementation's information architecture — improve its hierarchy, spacing, and responsiveness.
- Acceptance: I will review your surface inventory compliance (no content-layer glass), tint semantics (≤4), morph budget (=4), the a11y annex, and both signature flows before anything is built.

Questions to me (the architect) before you start, if anything is ambiguous: the access matrix in `SaaS-Product-Requirements.md` §2 is the authority on who sees what; the deck is the authority on brand tone; the calculator's Help view is the authority on voice.
