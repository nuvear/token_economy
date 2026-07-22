# DealSpine QA — Bug-Hunt Report

> **RESOLUTION (all 10 fixed).** Every confirmed defect below was fixed and locked
> with regression tests in `tests/bugfixes.test.ts`. The full gate is green:
> **161 tests pass** (engine invariants · 80-cell access matrix · floor-leakage EN+JA ·
> e2e happy path · 19 bug regressions). Each fix is cited inline in the source.
> This report is retained as the audit trail of what the multi-agent hunt found.

*Multi-agent workflow: 6 testers → adversarial verification → triage. 14 raw findings, all confirmed, deduped to 10.*

## Overall verdict

Not production-ready. The defect surface is dominated by server-side authorization gaps: the most severe is a segregation-of-duties bypass (sev 4) where a sales user single-handedly sets bidEvidence="Verified quote", collapsing the pricing floor ~30% (1,047,336 → 739,931) and flipping governance BLOCKED → COMPETITIVE DEFENSE with no deal-desk action. RBAC leaks recur: the approvals queue is readable by the delivery role (independently confirmed by 3 testers) and restricted floor/cost insight scopes are role-gated only client-side. Robustness is thin — a null array element 500s the engine and every unhandled error leaks absolute filesystem paths and stack traces (no error middleware). Two functional bugs will directly break the in-progress end-user guide: 2 of 5 seeded offerings (Test Automation, Data Migration) cannot be saved at all, and the advertised Team-&-roles admin control is a dead endpoint that silently reverts. The default offline insight provider also miscounts gates (reports phantom FAILs and false "hard failures"), corrupting any demo/insight screenshot. Fix the SoD bypass and the two guide-blocking functional bugs before screenshots are captured; harden server-side RBAC and input validation before release.

## Confirmed bugs (ranked)

### #1 · [sev 4] · rbac
**Sales can self-verify a competing bid and collapse the pricing floor (no deal-desk Verify)**

- **Repro:** As sales (user 2): POST /api/quotes with input_overrides {dealContext:'Contested', competingBidAmount:1000000, bidEvidence:'Verified quote', discountPct:22}. contestedValid=true, requiredRevenue drops 1,047,336 → 739,931 (defense floor), governance flips BLOCKED → COMPETITIVE DEFENSE, and the 'competing-bid evidence verified before floor relief' hard gate passes. Identical body with bidEvidence:'None' stays BLOCKED. (Merged: engine + consistency testers.)
- **Fix:** server/routes/quotes.ts applyOverrides copies free-form bidEvidence with no role check; engine.ts:1161 treats bidEvidence==='Verified quote' as verified. Enforce SoD at route layer: when caller is not deal_desk/pricing_owner, reject or clamp any override that sets bidEvidence='Verified quote' (preserve prior snapshot value). Add a deal-desk-only POST /quotes/:id/verify-bid (requireRole('deal_desk','pricing_owner')) that flips a server-tracked bid_verified flag, and change engine.ts:1161 to read that flag. Re-enter non-verified state on any bid edit so author != verifier.

### #2 · [sev 3] · ui · BLOCKS GUIDE
**Deal Workspace cannot save Test Automation or Data Migration quotes (preset_key case mismatch)**

- **Repro:** #/deal → pick 'Test Script Automation' or 'Data Migration' → Save → POST /api/quotes → 400 unknown_offering; status shows 'Save failed', header stays 'DRAFT — NOT SAVED'. Generate-Proposal (saves first) also fails. Root cause: DealWorkspace.tsx:237 builds <select> options from Object.keys(PRESETS) = camelCase (testAutomation, dataMigration); saveQuote (line ~101) does offeringList.find(o=>o.preset_key===presetKey) but DB preset_key is snake_case (test_automation, data_migration) → offering_id undefined. Only remediation/interfaces/custom save.
- **Fix:** src/screens/DealWorkspace.tsx: either build the <select> options from offeringList (value=o.preset_key, label=o.name) at line ~237, or map camelCase→snake_case before the find at line ~101 ({remediation, testAutomation:'test_automation', dataMigration:'data_migration', interfaces, custom}). Makes offering_id resolve for all five.

### #3 · [sev 3] · rbac
**Delivery role can read the entire Approvals queue (PRD §2 matrix denies it)**

- **Repro:** Login user 4 (delivery); GET /api/approvals → HTTP 200 with the full queue (quote_id, quote_title, requested_by, governance_state, rationale_md for every approval). PRD §2 'Approvals, overrides, exceptions' = '—' for Delivery; the same cell is enforced as 403 on the proposal route, and the UI hides the nav (Shell.tsx) and encodes delivery='none' (Settings.tsx). API contradicts the matrix the UI enforces everywhere else. (Merged: engine + api + ui-flows — 3 testers.)
- **Fix:** server/routes/approvals.ts GET /approvals guards with requireAuth only. Replace with an explicit allowlist matching §2: requireRole('pricing_owner','deal_desk','leadership','sales'), keeping the existing sales own-rows narrowing (requested_by = u.id). Delivery/any other role → 403.

### #4 · [sev 3] · rbac
**Restricted floor/cost insight scopes are role-gated only client-side; server trusts client allowed_roles at publish and run**

- **Repro:** server/routes/insights.ts POST /insights/buttons validates data_scope and allowed_roles independently and never couples them; a builder can publish data_scope=current_quote (or policy) with allowed_roles including sales/delivery → 201, no validation error. At run time (POST /insights/run) the server honors stored allowed_roles with no scope check, and GET /insights/runs returns packaged_markdown containing the internal cost stack ('Base AI cost $392,446', 'Required revenue (floor) $1,047,336', 'Max safe discount 12.5%', per-scenario Margin). insightsShared.ts marks policy scope restricted:true but that limit is applied only in Insight Studio on the client. (Merged: rbac + ui-flows testers.)
- **Fix:** server/routes/insights.ts: define RESTRICTED/FLOOR_COST_SCOPES = new Set(['current_quote','policy']) and FLOOR_SEEING_ROLES/RESTRICTED_ROLES = ['pricing_owner','deal_desk','leadership']. (1) At POST /insights/buttons (~L85-89), if the scope is floor/cost-bearing and allowed_roles contains any role not permitted to see floors (notably sales/delivery), reject 400 scope_role_coupling_violation (or clamp). (2) At POST /insights/run (~L141) return 403 if scope is restricted and u.role not in the permitted set, regardless of stored allowed_roles.

### #5 · [sev 3] · engine
**Unhandled 500: null (or non-object) element in a quote input array crashes the engine**

- **Repro:** POST /api/quotes with input_overrides {complexityTiers:[null]} → HTTP 500 'TypeError: Cannot read properties of null (reading mixPct)'. Also modelRoutes:[null], roleRates:[null] (advancedLaborEnabled), and via PUT /api/quotes/:id. tierMixTotal is computed unconditionally so it crashes even with complexityModelEnabled=false. Reachable by any edit role. Crash precedes UPDATE so existing quote is not corrupted.
- **Fix:** server/routes/quotes.ts applyOverrides: filter override arrays to real objects — arr.filter(x => x && typeof x==='object' && !Array.isArray(x)) — before assigning complexityTiers/modelRoutes/roleRates. Defensively optional-chain element derefs in src/engine/engine.ts (851 x?.sharePct, 890 x?.mixPct, 939 x?.sharePct, and the gated reduces at 854-855, 941). Return 400 on malformed input, never 500.

### #6 · [sev 3] · api
**Full stack trace with absolute filesystem paths leaked on every unhandled error (no error middleware)**

- **Repro:** POST /api/auth/login with body '{bad json' → 400 text/html containing a SyntaxError stack with absolute paths (…/app/node_modules/body-parser/lib/types/json.js:96). Same leakage on the engine 500. server/app.ts registers no error-handling middleware, so Express's default dev handler renders the stack; NODE_ENV is not production.
- **Fix:** server/app.ts: register a 4-arg error handler after app.use('/api', api). Map body-parser parse errors (err.type==='entity.parse.failed' / SyntaxError with status 400) to res.status(400).json({error:'invalid_json'}); all others to res.status(err.status||500).json({error:'internal_error'}) with no err.message/err.stack. Optionally set NODE_ENV=production as defense-in-depth.

### #7 · [sev 2] · api · BLOCKS GUIDE
**Settings → Team & roles admin controls are non-functional (endpoint does not exist)**

- **Repro:** As pricing_owner, #/settings → Team, change a user's Role select or Builder checkbox. Settings.tsx:178 issues PUT /api/auth/users/:id, but server/auth.ts exposes no such route, so the /api catch-all returns 404 → the change reverts and a 'team API pending' toast shows. §2 grants pricing_owner 'User & role admin: Yes' but no change persists.
- **Fix:** server/auth.ts: add PUT /users/:id guarded by requireRole('pricing_owner') that validates and UPDATEs users.role and users.is_builder with a logEvent audit entry. (Weaker alternative: disable the Role select + Builder checkbox so no dead control is shown; endpoint preferred.)

### #8 · [sev 2] · ui · BLOCKS GUIDE
**Default offline insight provider misstates gate results (double-counted PASS, phantom FAIL, false 'hard failures')**

- **Repro:** POST /api/insights/run {button_key:'explain_governance_state', quote_id:3} vs GET /api/quotes/3/markdown. Quote 3 markdown states '33/33 pass · 0 hard failures · 16 warnings'; the mock insight reports 'PASS markers: 34' (actual 17), 'FAIL markers: 1' (actual 0), and asserts 'The record carries hard failures: it cannot proceed without deal-desk action.' providers.ts:68 counts each PASS row twice; :69 matches /FAIL/g which also hits 'FAILED' in the verdict title 'BLOCKED — POLICY OR ECONOMIC FLOOR FAILED'. This is the default offline provider used in demos and the test suite.
- **Fix:** server/providers.ts:68 — drop the second additive term so passCount = (prompt.match(/\| PASS \|/g) ?? []).length. Line 69 — count only FAIL status cells, e.g. /\| FAIL \|/g, so 'FAILED' in the verdict title is excluded. With failCount 0 and warnCount 16 the Reading branch (102-108) correctly falls to the warnings branch.

### #9 · [sev 2] · data
**No numeric bounds validation on quote inputs — huge/negative values persist nonsensical/null economics**

- **Repro:** POST /api/quotes input_overrides {totalUnits:1e308, scopePct:1e308, billRate:1e308} → 201, stored selected_revenue=null (Infinity→null via JSON.stringify). discountPct:-1000/billRate:-95 → 201, quote stored with selected_revenue = -1,810,462.5. applyOverrides only checks typeof matches, never finiteness/range.
- **Fix:** server/routes/quotes.ts applyOverrides (lines 34-47): before merged[k]=v, require Number.isFinite(v) and enforce domain bounds (units/rates/hours ≥ 0; scopePct and discountPct within [0,100]; reject NaN/Infinity/negatives). Return 400 on violation instead of silently merging.

### #10 · [sev 1] · ui
**GovernancePanel verdict banner renders numeric KPIs on a glass surface (violates 'numbers live on solid surfaces')**

- **Repro:** src/components/workspace/GovernancePanel.tsx: the verdict <section className='glass'> (98-192) renders FLOOR, CURRENT, RISK MAX discount figures (fmtPct tabular-nums, lines 129-155) directly on the backdrop-filtered banner. The same file deliberately moved the gate list and contested-bid figures to solid var(--surface) surfaces (194-276) but left these KPIs on glass, contradicting tokens.ts:21-22 and the file's own header comment.
- **Fix:** src/components/workspace/GovernancePanel.tsx: move the FLOOR/CURRENT/RISK MAX row (flex div 129-155) onto a solid inner surface styled like the contested-bid grid (background var(--surface-alt), 1px var(--border), radius 10, padding). Keep the verdict dot/title/message and show-gates button on glass. Switch label/value ink from white/ice to var(--muted)/var(--ink).
