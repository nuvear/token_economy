# DealSpine — UI/UX Handover (for the next chat)

**Engagement:** UI/UX for DealSpine, an internal AI-native SAP pricing & evidence platform.
**Design language:** Apple **Liquid Glass, iOS 27 generation (WWDC 2026)**, adapted for web.
**Authority docs (read first, in the GitHub repo `nuvear/token_economy`):** `Claude-Design-UIUX-Brief.md` (binding), `SaaS-Product-Requirements.md` (§2 access matrix), reference `AI-SAP-Pricing-Calculator.jsx` (engine + IA).
**Design system:** the attached "Design System" project is empty — **the brief's tokens ARE the visual authority.** See `design-tokens.json` in this project.

---

## 1. Status — 12 of 12 screens built · light + dark · desktop + responsive

All are single-file **Design Components** (`*.dc.html`), bilingual EN/日本語, with the iOS-27 glass-intensity control (Full / Reduced / Opaque) wired live, a light/dark `theme` prop + rail toggle on every screen, and a mobile glass bottom-tab bar. **The screen set is feature-complete** — all 4 hero morphs built, light+dark and desktop+responsive throughout. What's left is documentation/tooling, not screens (see §5).

**Dark + responsive pass — how it was done (follow this pattern for any new screen):**
- **Theme tokens are CSS custom properties with light fallbacks:** content uses `var(--ink,#16243D)`, `var(--surface,#fff)`, `var(--border,#D9E6F7)`, `--surface-alt`, `--muted`, `--ink2`, `--faint`, `--hairline`, `--row`/`--row-alt`, `--th`, `--track`, `--panel-border` (+ `--pass-ink`/`--warn-ink` where tinted banners carry dark text). The fallback = the light value, so first paint is correct even before the root resolves. The **root `.ds-scroll` sets the theme's var block inline via the `pageStyle` hole** (dark block vs light block) — the DC runtime **does** preserve `--custom` props passed through a style-string hole (verified).
- **`theme` prop** (enum light/dark, section "Liquid Glass") seeded in the constructor (`props.theme==="dark"?"dark":"light"`), `const dark=theme==="dark"` in `renderVals`; a **Theme** segmented control sits above the Glass control in the rail.
- **Glass chrome (`glassBase`) is unchanged** across themes — it's navy-translucent and reads on both light and dark pages. **Navy "dark panels"** (hero/KPI-accent tiles, reinvestment card) keep their gradient and gain `border:1px solid var(--panel-border)` so they separate on dark.
- **Chart/SVG colours that were `NAVY2` become a mid-blue (`#3A5F94` / `#5A72A4` / `#6E8CBE`)** so bars/lines read on dark surfaces; SVG grid/text branch on `theme`. `mdNodes` markdown colours were converted to `var()` so rendered Markdown reads on the dark result card.
- **Mobile:** `.ds-tabbar` (glass bottom tab, 5 destinations via `FILEMAP`/`hrefFor`) shows ≤860px; `.ds-rail` hides; `.ds-search` hides ≤620px; `.ds-main` gets bottom padding; screens with a floating action cluster add `.ds-fab{bottom:84px}` so it clears the tab bar. Master-detail/2-col grids already collapse.
- **Cross-screen nav is now unified:** every screen has `FILEMAP`/`hrefFor`; rails on screens that were button+setState still switch in-file, but the bottom tab always deep-links between files.
- **Special cases:** the **Proposal paper stays white in both themes** (it's a document — only its chrome + left control column theme). **Login** is bespoke: `theme` flips the page gradient + brand-text vars + the auth card between white-frost (dark) and navy-frost (light); it has no rail/tab.

| # | Screen | File | Notes |
|---|--------|------|-------|
| 1 | Deal Workspace | `DealSpine Deal Workspace.dc.html` | The heart. Ported `compute()` engine (reproduces reference case: $1,197,000 rev · d\*=32.5%). Governance verdict banner (hero glass) + **morph #1** (banner → gate list). Inputs/results/governance 3-col. |
| 2 | Insights | `DealSpine Insights.dc.html` | AI-native signature. Glass capsule wall, context run-bar, **morph #2** (capsule → packaging → streaming → solid Markdown card), what-was-sent disclosure, Insight Studio builder sheet (typed vars, data-scope, floor/cost role-lock, publish). Contains the shared **Markdown renderer** (`mdNodes`). |
| 3 | Approvals | `DealSpine Approvals.dc.html` | Deal-desk queue, quantified detail panel, append-only audit trail, glass override sheet (approve/re-scope/no-bid, mandatory rationale + expiry, validated). |
| 4 | Proposal Preview | `DealSpine Proposal Preview.dc.html` | Customer paper doc (serif, solid). **Structural** floor/cost exclusion + CI-tested assurance. Proposal locale EN/JA independent of UI (JA: 御中, 印 seal, long-form date; USD preserved). **Morph #3** (action cluster → generate sheet). |
| 5 | Portfolio | `DealSpine Portfolio.dc.html` | Leadership. KPI strip, revenue-vs-floor + discount-vs-bands bar charts, GP/hour SVG trend, deals table, reinvestment fund card. |
| 6 | Policy Studio | `DealSpine Policy Studio.dc.html` | Pricing owner. Offerings/rate-cards/LLM-prices/history tabs. Versioned draft → **diff drawer** → publish; gold-highlighted pending rows; LLM **staleness clock** (90/180-day); Editor/Reader role toggle (read-only for non-owners). Glass on chrome + edit/diff drawers + toast. |
| 7 | Evidence | `DealSpine Evidence.dc.html` | Delivery evidence ledger. Computed KPIs, filter tabs (all/verified/pending/disputed), 6 evidence types tied to engagements, glass **capture drawer** (plain fade — morph #4 still reserved for mobile), inline Verify (pending→verified) + toast. |
| 8 | Home | `DealSpine Home.dc.html` | **Role-aware** hub. "Viewing as" switcher (sales/desk/lead/owner/exec) rebuilds greeting, hero metric + CTAs, work cards, routed signals. Real cross-screen deep-links (CTAs/cards/signals/rail → sibling files). `role` prop added. |
| 9 | Engagements | `DealSpine Engagements.dc.html` | Sold-vs-actual delivery. Master-detail; realization/hours-variance/GP-hr KPIs; paired sold-vs-actual bars (hours/GP-hr/GP), variance banner, linked evidence → Evidence. DL-0155 at-risk. |
| 10 | Settings/Admin | `DealSpine Settings.dc.html` | Menu: **access matrix** (surfaces × 6 roles, None/Read/Edit/Publish, admin-editable cycling), team (inline role selects), integrations (SAP/Okta/LLM Gateway/Slack), preferences (lang/glass defaults + notif switches + a11y note). |
| 11 | Login | `DealSpine Login.dc.html` | The one non-shell screen. Solid brand panel + floating **light-frost glass** auth card over navy (entry chrome). Okta SSO + email magic-link flow (validated → sending → sent state), passkey, animated orbs (reduced-motion honored), floating lang+glass pills. |
| 12 | Help | `DealSpine Help.dc.html` | Solid hero search + popular chips; category-filtered **searchable FAQ accordion** (10 articles, deep-linked); guided tours w/ progress, keyboard shortcuts, navy support card. |

**Morph budget: 4 of 4 used.** Morph #4 = **mobile capture affordance → unit-capture sheet** (Evidence): a raised gold "+" FAB (`.ds-capfab`, shown ≤860px above the bottom tab) opens the capture sheet, which on mobile rises from the bottom as a bottom sheet (`.ds-capsheet` + `ds-rise` keyframe + grab handle) instead of the desktop right drawer. Honors `prefers-reduced-motion`. On desktop the capture drawer stays a plain right-side fade.

**Cross-screen navigation:** Home, Engagements, Settings, Help nav rails + action links deep-link to sibling `.dc.html` files via a shared `FILEMAP`/`hrefFor`. Screens 1–7's rails still use in-file `setState` (no file nav) — unify to `FILEMAP` links in the responsive pass if desired.

---

## 2. Non-negotiable design rules (the architect reviews these)

1. **Glass is navigation-layer ONLY.** Allowed: app bar, nav rail/bottom tab, floating action cluster, sheets/drawers/modals, menus/popovers, Insights run-bar & prompt capsules, governance verdict banner, toast pills. **Forbidden:** KPI tiles, tables/rows, forms, charts, proposal preview, dense text — those are **solid** (`#fff`/`#EEF4FC` on light, navy panels on dark). No glass-on-glass, no glass on scroll-recycled rows. **Numbers live on solid surfaces.**
2. **≤ 4 tint semantics** — neutral / gold (action·deal-desk) / green (pass) / red (block). No fifth without sign-off.
3. **Morph budget = exactly 4** hero morphs (listed above). Everything else = plain fades/slides. Honor `prefers-reduced-motion` (morphs → cross-fades).
4. **Performance:** ≤ 8 glass surfaces per screen (mobile ≤ 5); `backdrop-filter` only on glass surfaces.
5. **A11y:** WCAG AA on every text/surface pair **including text on glass** at every intensity stop; gold 2px focus rings; ARIA on all glass controls; reduced-transparency/motion/contrast fallbacks.
6. **Internal cost/margin/floor** appears on internal surfaces only — proposal & anything shareable is **structurally incapable** of showing it (CI-tested).

---

## 3. The shared shell — copy this into every new screen

Each screen re-implements the shell inline (DC "one file by default"). Copy from any built screen; they are identical. Pieces:

- **`<helmet>`**: font `<link>` (Inter + Noto Sans JP [+ Noto Serif for proposals, JetBrains Mono where mono needed]), body reset, focus-ring rule, `.ds-scroll` scrollbar, keyframes (`ds-pop`, `ds-scrim`, `ds-sheet`/`ds-spin` as needed), and the responsive `@media` classes (media queries are the ONE thing allowed in `<helmet><style>` — everything else is inline).
- **Logic class**: `glassBase()` (returns the Full/Reduced/Opaque style object from `state.glass`), `toStr()` helper (camelCase→css string), `NAV` array (11 items, EN/JA/icon), and in `renderVals`: `gBar`, `gRail`, `navItems`, `langs`, `glassStops`, `kicker`, `card`. Constructor seeds `lang`/`glass` from `props.locale`/`props.intensity`.
- **Props JSON**: always expose `intensity` (enum full/reduced/opaque) and `locale` (enum en/ja) so the Tweaks panel + editor work.

**Shell markup**: glass `<header>` (logo · search [solid pill] · lang switch · avatar) + glass `<nav class="ds-rail">` (nav items + glass-mode segmented control pinned bottom) + `<main>`.

---

## 4. DC framework conventions & gotchas (learned the hard way — save yourself the debugging)

- **Inline styles only.** No CSS classes for styling; only media queries live in `<helmet><style>`. Repeat literal style strings — that's expected. Style **holes** (`style="{{ x }}"`) are OK only for runtime-driven values (glass intensity, locale-dependent kicker, selection state); never for static theme tokens (delays first paint).
- **`sc-for list` does NOT resolve nested dotted paths.** `list="{{ p.tiers }}"` renders empty. **Expose arrays as top-level keys** (`return { tiers, terms }`) and use `list="{{ tiers }}"`. (Scalar `{{ p.total }}` interpolation is fine.)
- **Repeated UI (nav, tabs, chips, cards) → build the array in `renderVals` with an embedded `onClick` per item**, then `<sc-for>` + `onClick="{{ item.onClick }}"`. Distinct one-off inputs → write explicit rows with `h.fieldName` handlers.
- **Streaming/timed state:** guard async loops with an instance token (`this._tok`), NOT `this.state` reads (state is stale inside a setTimeout/interval chain — this stalled the Insights stream). Use `setInterval` + clear on a token mismatch; clear timers in `componentWillUnmount`.
- **Backslashes in `dc_write`/`dc_js_str_replace` are preserved literally.** To get a real `\n`/`\s`/`\d` in the file, type a SINGLE backslash. Typing `\\n` puts a literal 2-char `\n` in the file (this broke the Markdown split + regexes). `dc_js_str_replace` matches file bytes exactly.
- **Controlled inputs:** `<textarea value="{{ x }}">` + `onInput`, NOT children `>{{ x }}<` (children-bound = uncontrolled, won't reflect programmatic updates like variable-chip insertion).
- **Charts / rendered Markdown via `React.createElement` in `renderVals`, exposed through a `{{ hole }}`** — acceptable for data-viz/generated content the template can't express. NOT for editable UI layout. Add `data-om-raster` on glyph/diagram spans.
- **Verifying glass:** `multi_screenshot`/verifier `screenshot` use html-to-image which **does not render `backdrop-filter`** — glass panels look empty/light there. Use `save_screenshot` (real capture) or read the DOM via `eval_js_user_view` for authoritative checks.

---

## 5. What's left (no screens — docs, tooling, polish)

The 12-screen set is done in light+dark, desktop+responsive, EN/日本語, 4/4 morphs. Remaining items are all supporting deliverables:

1. **Accessibility annex** — contrast table for every text/surface pair × 3 glass stops × 2 themes. Spot-checks pass AA; the formal table is not written. This is the top item for architect sign-off (rule 5).
2. **Component-library spec doc** — the components exist in-situ and are consistent across all 12 screens, but there's no standalone spec (anatomy, props, states, do/don'ts). Extract from any built screen.
3. **Tailwind config** — `design-tokens.json` holds the values; the Tailwind theme mapping is still to generate (brief §6).
4. **Redlines / dev handoff notes** — spacing/typography annotations for the vibe-coding dev.
5. **Optional nav unify** — screens 1–7 rails still switch in-file via `setState`; 8–12 + all bottom tabs deep-link via `FILEMAP`/`hrefFor`. Porting `FILEMAP` into 1–7 rails would make every rail navigate between files (bottom tab already does).
6. **Deeper mobile table treatment** — tables collapse to horizontal scroll (`.ds-tablewrap`/`.ds-mxwrap`) on mobile; a card-per-row treatment would be nicer but isn't required.

---

## 6. Architect rulings (2026-07 — resolved) + binding redlines

1. **"Risk-adjusted max discount 12.5%"** is currently a **static readout** (user chose to leave it as-is) on Deal Workspace + Approvals. The base `compute()` doesn't derive it; porting `backups/AI-SAP-Pricing-Calculator-Risk-Adjusted-1.jsx` would make it computed. **RESOLVED (architect):** the risk-adjusted max is **engine-bound — computed per deal by `compute()`**, never a policy constant. The 12.5% shown is placeholder, approved ONLY with the binding redline below.
   - **Redline (binding):** every screen showing it (Deal Workspace governance banner; Approvals metric grid) must annotate it `engine-bound · per-deal` and never present it as a fixed policy value. Captured in `design-tokens.json → risk_adjusted_max`.
2. **Dark-mode palette sign-off.** Dark surfaces use `#182A47` panels on a `#0d1830`/`#1b2d4c` page, navy "dark" tiles keep their gradient + a gold `--panel-border`, and chart navy became mid-blue (`#3A5F94`/`#5A72A4`). **RESOLVED (architect):** approved — navy-anchored, gold + red/green semantics unchanged, **no new hues**, AA re-proven at both glass extremes in the annex. Sign-off is on the **tokens**, not per-screen colors → the dark palette now lives in `design-tokens.json → themes.dark` (+ `chart_navy_on_dark`).
3. **Mobile glass budget.** Rule 4 caps mobile at ≤5 glass surfaces; the bottom tab bar is one more glass surface than desktop. **RESOLVED (architect):** hold ≤5, no raise — consolidate IA if a screen needs more (e.g., verdict pill + run-bar share a cluster). **Open task:** audit each mobile screen (chrome header + bottom tab + any open sheet) against the cap.

---

## 7. Deliverables checklist (brief §6) — progress

- [x] Design tokens — `design-tokens.json` (palette, type, radius, elevation/blur, glass stops, reduced-transparency fallback, i18n). **Dark-theme token block** now also lives inline per screen (see §1). Tailwind config still to generate.
- [~] Component library — implemented in-situ and **consistent across all 12 screens** (app bar, rail, bottom tab, verdict banner ×4 tints, gate pill, KPI tile, section card, input rows, data table + chart bars, sheet/drawer, bottom sheet, insight capsule, provider badge, result panel, streaming indicator, toast, empty state, audit timeline, access-matrix grid, theme/glass segmented controls). Formal spec doc still to write.
- [x] Hi-fi mockups — **12/12 screens × desktop+responsive × light+dark × EN/JA.**
- [x] Morph specs — **4/4 built** (durations `cubic-bezier(.2,.7,.2,1)`, ~.3s; morph #4 = mobile capture bottom-sheet). `prefers-reduced-motion` honored throughout.
- [ ] Accessibility annex (contrast table per intensity stop × theme) — pending (§5 #1).
- [ ] Redlines/handoff notes for the vibe-coding dev — pending (§5 #4).
