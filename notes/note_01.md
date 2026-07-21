# 1. The business problem the materials are solving

Traditional SAP services are usually priced as:

**Billable hours × hourly rate**

AI disrupts that model because it reduces the number of hours needed. Under time-and-materials pricing, fewer hours automatically mean less revenue.

The deck’s argument is that this creates a **margin trap**:

1. AI reduces delivery effort substantially.
2. Billable volume falls with the effort.
3. Revenue falls faster than total cost because platform, token and quality-review costs remain.
4. The partner created the productivity improvement but gives nearly all its economic benefit away through lower billable hours.
5. Procurement may demand an AI discount anyway.

The deck’s indexed illustration shows revenue declining from 100 to 46 and gross profit from 35 to 14 when AI is introduced but the same hourly pricing logic remains. The absolute gross-profit collapse is more important than the percentage margin alone. 

The materials therefore reject “use AI and keep billing fewer hours” as the destination. Their proposed destination is **per-unit, fixed-outcome or recurring solution pricing**.

---

# 2. Step 1 — establish the traditional baseline

The first step is to identify a countable unit of work. Examples in the deck include:

* One custom object remediated
* One test case automated
* One interface built
* One data object migrated
* One AMS ticket resolved
* One report converted

The framework then defines four baseline variables:

| Variable | Meaning                               |
| -------- | ------------------------------------- |
| `U`      | Units in scope                        |
| `h`      | Traditional effort per unit, in hours |
| `Rb`     | Blended customer bill rate            |
| `Rc`     | Loaded internal delivery cost rate    |

The baseline formulas are:

**Traditional revenue**

`U × h × Rb`

**Traditional cost**

`U × h × Rc`

**Traditional gross profit**

`U × h × (Rb − Rc)`

**Traditional price per unit**

`h × Rb`

The traditional unit price is important because it represents the customer’s alternative cost: approximately what the customer would pay to complete the same scope without the AI-enabled delivery model.

The discipline behind the model is: **if the scope cannot be counted in units, it is not yet ready for unit pricing.** Hours may still be used internally for costing and capacity planning, but the customer-facing commercial unit becomes the object, test case, interface or other outcome. 

---

# 3. Step 2 — reconstruct the cost of delivery with AI

The model then separates AI delivery economics into five variables:

| Variable | Meaning                                                            |
| -------- | ------------------------------------------------------------------ |
| `c`      | AI coverage: percentage of units AI can handle                     |
| `e`      | Effort reduction on an AI-covered unit                             |
| `q`      | QA add-back: human review as a percentage of hours initially saved |
| `t`      | AI/token cost per covered unit                                     |
| `P`      | Engagement-level platform and tooling cost                         |

The AI-adjusted effort formula is:

`AI hours = U × h × [1 − c × e × (1 − q)]`

An easier way to read it is:

1. Begin with traditional hours.
2. Remove the hours saved on AI-covered work.
3. Add back senior review or QA hours.

The resulting cost formula is:

`AI cost = AI hours × Rc + U × c × t + P`

The **savings pool** is then:

`S = Traditional cost − AI cost`

This savings pool is the core economic asset created by AI. It can be divided among:

* Customer discount
* Additional partner gross profit
* Reinvestment in AI tooling and intellectual property

The deck emphasizes that token cost is usually much smaller than labor cost. The decisive economics are generally AI coverage, human-effort reduction, delivery labor mix and review discipline—not merely the model’s price per token. 

## How the calculator derives `t`

The React calculator does not require the user to enter a single arbitrary token-cost number. It calculates token cost per covered unit from:

* Input tokens
* Output tokens
* Input and output rates
* Agentic retry overhead
* Caching and batch discount

Its formula is effectively:

`token cost/unit = [(input K × input rate) + (output K × output rate)] ÷ 1,000 × retry factor × discount factor`

The division by 1,000 converts thousands of tokens into the “per million token” rate basis. 

The deck and calculator also treat model selection as an **internal routing and cost decision**, not as the customer’s billing unit. Frontier models are reserved for difficult work, workhorse models for bulk transformation, and efficient models for triage and simple tasks. The customer is supposed to receive a stable unit price while the provider manages model-price volatility inside its delivery platform.

The embedded model names and prices are labelled as indicative July 2026 assumptions and the files themselves instruct users to refresh them quarterly; I have treated them as document assumptions rather than independently verified market data.  

---

# 4. Step 3 — choose the pricing architecture

The framework describes four stages of commercial maturity.

### T&M pass-through — avoid where possible

Revenue equals:

`AI hours × old bill rate`

AI productivity is passed directly through as fewer billable hours. This is the margin trap.

### Premium-rate T&M — temporary bridge

Revenue equals:

`AI hours × bill rate × (1 + premium)`

A 10–20% rate premium partially compensates for fewer hours, but the commercial model remains tied to effort.

### Per-unit or fixed-outcome pricing — core model

Revenue equals:

`Traditional price × (1 − customer discount)`

The customer receives a lower price than the traditional approach, but the price no longer changes every time internal delivery effort decreases.

### Solution subscription — intended end state

The deck’s long-term destination is recurring revenue for continuous monitoring, upgrades and remediation.

The supplied calculator implements the first three options—T&M, premium T&M and per-unit value pricing—but it does not yet implement the subscription model described in the deck.  

---

# 5. Step 4 — divide the AI productivity benefit

Let `d` be the customer’s discount from the traditional price.

The value-priced revenue is:

`Value price = Traditional revenue × (1 − d)`

The maximum discount that preserves the old gross-profit dollars is:

`d* = 1 − (Traditional profit + AI cost) ÷ Traditional revenue`

This can also be simplified to:

`d* = Savings pool ÷ Traditional revenue`

That makes the economics intuitive:

* At a discount of zero, the partner retains the entire savings pool as additional gross profit.
* At a discount equal to `d*`, the customer receives the entire savings pool and partner gross profit is exactly unchanged.
* At a discount greater than `d*`, the partner earns less gross profit than it would have earned under the traditional delivery model.

The documents sometimes refer to `d*` as a “floor.” More precisely:

* `d*` is the **maximum allowable discount**.
* It creates a **minimum acceptable customer price**.

The proposed sales policy is therefore:

1. Publish a normal opening discount band, such as 20–30%.
2. Allow sales to sign within that band.
3. Require deal-desk approval above the opening band but below `d*`.
4. Block a quote beyond `d*`.

This converts value sharing from ad hoc negotiation into a finance-controlled policy. 

---

# 6. The worked ECC-to-S/4HANA example

The deck and calculator use custom code remediation as the primary example.

## Traditional baseline

* 12,000 custom objects in the ECC estate
* 30% require remediation
* `U = 3,600` objects
* `h = 3.5` hours per object
* `Rb = $95/hour`
* `Rc = $62/hour`

This produces:

* Traditional hours: `3,600 × 3.5 = 12,600`
* Revenue: `$1,197,000`
* Cost: `$781,200`
* Gross profit: `$415,800`
* Gross margin: `34.7%`
* Traditional price per object: `$332.50`

## AI delivery assumptions

* `c = 85%`
* `e = 70%`
* `q = 10%`
* Token cost per covered object: approximately `$1.50`
* Platform cost: `$25,000`

The AI effort becomes:

`12,600 × [1 − .85 × .70 × (1 − .10)]`

`= 5,852.7 hours`

The calculator’s more precise default cost is approximately:

* Labor cost: `$362,867`
* Token cost: `$4,579`
* Platform cost: `$25,000`
* Total AI cost: `$392,446`

The savings pool is therefore approximately:

`$781,200 − $392,446 = $388,754`

## Pricing outcomes

| Metric                    | Traditional | AI with T&M | AI with per-object value price |
| ------------------------- | ----------: | ----------: | -----------------------------: |
| Customer price/revenue    |     $1.197M |       $556K |                          $898K |
| Cost of delivery          |       $781K |       $392K |                          $392K |
| Gross profit              |       $416K |       $164K |                          $505K |
| Gross margin              |       34.7% |       29.4% |                          56.3% |
| Price per object          |        $332 |        $154 |                           $249 |
| Revenue per delivery hour |         $95 |         $95 |                           $153 |

Under T&M, the provider delivers the same scope efficiently but loses approximately 61% of its gross-profit dollars.

Under value pricing with a 25% customer discount:

* Customer saves approximately `$299,250`.
* Partner gross profit increases by approximately `$89,500`.
* Customer receives roughly 77% of the `$389K` savings pool.
* Partner retains roughly 23% as additional gross profit.
* The customer still receives faster delivery and a lower fixed price.

The maximum discount is approximately `32.5%`. At that point, the minimum acceptable revenue is about `$808K`; below that price, the AI deal would earn less gross profit than the traditional project.  

The example is the clearest expression of the framework’s thesis: **AI savings do not need to be kept entirely by the partner, but they should not automatically be surrendered through fewer billable hours.**

---

# 7. What the React calculator does

The JSX file is the deal-level implementation of the deck. It is a React component using React state, Tailwind-style CSS classes and Recharts visualizations. As supplied, it is a front-end component rather than a complete production application; there is no persistence layer, database, authentication, workflow history or direct workbook import. 

## Offering presets

It includes presets for:

* Custom code remediation
* Test script automation
* Data migration
* Interface development
* A custom user-defined offering

Each preset changes the unit, baseline effort, rates, coverage, productivity, model tier, token assumptions, platform cost and normal discount band.

## Internal deal view

The internal view exposes the complete cost stack and lets the user change:

* Scope and units
* Traditional hours per unit
* Bill and cost rates
* Team size
* AI coverage
* Effort reduction
* Review add-back
* Input/output tokens and rates
* Agentic retry overhead
* Caching/batch discount
* Platform cost
* Pricing model
* Customer discount
* Sales opening band

It then calculates:

* Traditional and AI revenue
* Cost and gross profit
* Gross margin
* Customer savings
* AI cost per unit
* Revenue per delivery hour
* Estimated delivery duration
* Maximum discount `d*`

Delivery duration assumes **140 productive hours per FTE-month**, an implementation assumption that is not part of the deck’s generic formula.

## Governance logic

For value pricing, the calculator displays one of three outcomes:

| Outcome                   | Meaning                     |
| ------------------------- | --------------------------- |
| Within published band     | Sales may sign              |
| Above band but below `d*` | Deal-desk approval required |
| Beyond `d*`               | Quote blocked               |

It also visualizes:

* Traditional versus T&M, premium T&M and value pricing
* Gross profit across different discount levels
* The traditional-profit line
* The breakeven discount
* The currently selected discount

## Customer value view

The customer view intentionally hides the internal cost stack. It shows:

* Fixed customer investment
* Customer savings
* Delivery duration
* Per-unit price
* Senior review
* Rework warranty
* Traditional versus proposed customer cost

This directly implements the deck’s principle that the customer should see value, speed, scope and risk transfer—not the provider’s internal labor and token economics.

One implementation detail is worth knowing: as coded, the customer view always displays the **value-pricing scenario**, even when a different pricing model has been selected in the internal view. That may be intentional for proposal generation, but it should be made explicit in the interface. 

---

# 8. What the delivery workbook does

The workbook is the empirical “data spine.” Its purpose is to replace sales or vendor assumptions with measured project actuals. It has three worksheets.

## README

The README explains that teams should log one row per unit, use controlled dropdowns and replace the 12 sample rows before collecting real data. It proposes transferring the resulting metrics into the pricing calculator after roughly 500 observations. 

## Object_Log

The log captures:

| Category    | Fields                                           |
| ----------- | ------------------------------------------------ |
| Identity    | Unit ID, unit type, complexity                   |
| Automation  | AI handled Y/N                                   |
| Effort      | AI minutes, human minutes, senior review minutes |
| Quality     | Rework Y/N                                       |
| Consumption | Input tokens, output tokens, model               |
| Context     | Notes                                            |

The complexity, AI-handled, rework and model fields have dropdown validation. The sample rows include reports, functions, classes, enhancements and interfaces across simple, medium and complex classes. 

## Dashboard

The dashboard contains editable traditional baseline minutes:

* Simple: 90 minutes
* Medium: 210 minutes
* Complex: 420 minutes

It then calculates per complexity class:

**Coverage**

`c = AI-handled units ÷ units logged`

**Effort reduction**

`e = 1 − average(AI minutes + human minutes) ÷ baseline minutes`

**QA add-back**

`q = average review minutes ÷ [baseline minutes − AI minutes − human minutes]`

It also calculates rework and average token consumption.

Using the 12 supplied sample records, the dashboard reports:

| Metric                          | Sample result |
| ------------------------------- | ------------: |
| Units logged                    |            12 |
| AI-handled units                |            10 |
| AI coverage                     |         83.3% |
| Effort reduction                |         68.8% |
| QA add-back                     |         13.7% |
| Rework rate                     |         20.0% |
| Average tokens per covered unit |        324.5K |

Those values are illustrative, not production-ready. In particular, the 20% sample rework rate is far above the stated target of less than 2%. The workbook explicitly tells the user to delete the sample records before collecting project data. 

The expected pattern in the sample is sensible:

* Simple work has high coverage and high effort reduction.
* Complex work has lower coverage, lower reduction, more review and more tokens.
* Some complex objects remain fully manual.

That evidence is intended to justify differentiated tier pricing rather than one unsupported blended claim.

---

# 9. How the three artifacts connect in practice

The intended workflow is:

1. **Scope the work.**
   Run an ATC or readiness scan, identify the unit of work and classify it as simple, medium or complex.

2. **Establish the traditional economics.**
   Count units and determine traditional hours, bill rate, cost rate, revenue and gross profit.

3. **Run early AI-enabled delivery.**
   During pilots or initial live projects, log AI handling, AI minutes, human minutes, review minutes, rework and tokens in the workbook.

4. **Calibrate the AI parameters.**
   Use the workbook dashboard to replace assumed `c`, `e`, `q` and token volumes with measured values.

5. **Simulate the deal.**
   Enter the scope, calibrated productivity parameters, token rates and platform costs into the calculator.

6. **Choose the commercial model.**
   Compare T&M, premium T&M and per-unit value pricing.

7. **Apply the gain-share policy.**
   Select a customer discount inside the normal band and confirm that it remains below `d*`.

8. **Route the quote.**
   Sales signs in-band deals; the deal desk reviews exceptions; deals below the minimum price are blocked.

9. **Present the customer value case.**
   Show fixed investment, savings, speed, scope transparency and warranty without exposing the internal cost stack.

10. **Deliver and close the loop.**
    Log actual results from the engagement, update the benchmarks and recalibrate the next quote.

This is why the deck says, in effect, that the **deck sets policy, the calculator enforces policy and the data log keeps the assumptions honest.** 

---

# 10. The broader organizational transformation

The model is not merely a new calculator. It requires changes in how the SAP partner operates.

### Wave 1 — prove and protect, 0–6 months

Use AI on a small number of live projects while retaining existing commercial terms. Measure actual performance and build evidence.

### Wave 2 — repackage and reprice, 6–18 months

Launch named per-unit or fixed-outcome offers, introduce pricing bands and floors, retrain sales and shift sales compensation toward margin.

### Wave 3 — productize and recur, 18+ months

Convert accelerators, prompts, guardrails and workflow orchestration into reusable intellectual property and recurring subscription services.

The leadership implications are substantial:

* CEOs fund the AI delivery platform as product IP.
* Sales sells outcomes and risk transfer rather than FTEs.
* Delivery shifts from large execution pyramids toward AI-workflow engineers and senior reviewers.
* Project managers estimate and report in units and complexity classes.
* Finance and delivery jointly control the price floor.
* Revenue per delivery hour replaces utilization as a central productivity metric. 

---

# Important implementation observations

| Observation                                                                 | Why it matters                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The three files use consistent formulas and terminology.**                | The conceptual handoff from strategy to calculator to data collection is strong.                                                                                                                                                                                                                                                                                                                                                            |
| **The workbook-to-calculator handoff is manual.**                           | Dashboard values must currently be copied into the React interface; there is no import or integration.                                                                                                                                                                                                                                                                                                                                      |
| **The deck proposes tier prices, but the calculator is primarily blended.** | The deck gives simple, medium and complex prices of $120, $260 and $520, blending to $249. The calculator needs separate class simulations or a true tier engine to implement this fully.                                                                                                                                                                                                                                                   |
| **The workbook dashboard combines input and output tokens.**                | The calculator prices input and output tokens at different rates, so the dashboard should expose separate average input and output values.                                                                                                                                                                                                                                                                                                  |
| **The all-units workbook aggregation can distort `e` and `q`.**             | It count-weights class-level percentages even though classes have different baseline minutes. From the sample rows, the sheet reports `e = 68.8%`; a total-baseline-minute calculation produces approximately `64.9%`. It reports `q = 13.7%`; total review divided by total gross minutes saved produces approximately `15.2%`. Simulating each class separately or using minute-weighted aggregation would be more economically accurate. |
| **Senior review uses the same cost rate as all other labor.**               | In reality, QA may have a higher loaded rate. A separate reviewer rate would make the cost model more conservative.                                                                                                                                                                                                                                                                                                                         |
| **There is a minor token-documentation mismatch.**                          | The deck describes roughly 230K tokens per object as including retries and discounts, while the calculator begins with 200K input plus 30K output and then adds 50% retry overhead. The resulting `$1.50` cost is aligned, but the description of what the 230K represents should be corrected.                                                                                                                                             |
| **The final productization features are not yet implemented.**              | The supplied component lacks subscription pricing, persistence, audit history, deal export, workflow approval and the board-level portfolio roll-up envisioned by the deck.                                                                                                                                                                                                                                                                 |

These are implementation-hardening items rather than a rejection of the underlying economic model.   

# Bottom line

The package is designed to move an SAP services business from:

**selling people’s time**

to:

**selling a measured, warranty-backed delivery capability at a predictable unit or outcome price.**

The customer receives a visible discount, faster completion, fixed scope and quality protection. The SAP partner protects its traditional gross-profit dollars, retains part of the productivity gain and builds reusable platform IP. The workbook is what makes the claims defensible; the calculator is what prevents sales from giving the savings away; and the deck establishes the policy and organizational changes required to make the model sustainable.
