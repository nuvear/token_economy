# Central finding

The current material is a strong **pricing framework**, but it is not yet a complete, enforceable pricing policy.

At present, the core model contains:

* Baseline parameters: `U, h, Rb, Rc`
* AI-delivery parameters: `c, e, q, t, P`
* Commercial parameters: `d, d*`
* Calculator extensions: model tier, input/output tokens, retries, caching/batch discount, team size, premium rate and opening discount band
* Delivery evidence: complexity, AI/human/review minutes, rework flag, tokens and model tier

That is enough to demonstrate the economic concept, but not enough to safely approve production deals. The model still assumes a single complexity mix, a single labor cost rate, average productivity, no explicit rework cost, no warranty reserve and no risk-adjusted margin hurdle.   

The four most financially material omissions are:

1. **Complexity-class economics**
2. **Expected rework and warranty cost**
3. **Separate labor roles and senior-review rates**
4. **A target-margin and risk-adjusted price floor**

Those four omissions alone can make the current `d*` materially too generous.

---

# 1. The price-floor policy is incomplete

The current formula is:

[
d^* = 1-\frac{\text{Traditional gross profit}+\text{AI cost}}
{\text{Traditional price}}
]

This protects the **same absolute gross-profit dollars** as the traditional project. It does not necessarily protect:

* A minimum gross-margin percentage
* A required return on the AI platform investment
* A risk reserve
* Sales commissions
* Warranty exposure
* Financing costs
* Opportunity cost of scarce delivery capacity
* Profit growth expected from the AI investment

For example, if the traditional deal was already underpriced, the formula institutionalizes the old underpricing. If the new AI deal carries greater warranty or legal risk, that risk is not reflected in `d*`. The calculator follows the same gross-profit-preservation formula.  

## Parameters that must be added to the price floor

| Parameter     | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `GMmin`       | Minimum permitted gross-margin percentage                   |
| `GPgrowth`    | Required increase over traditional gross-profit dollars     |
| `Ccont`       | Delivery-risk contingency                                   |
| `W`           | Warranty reserve                                            |
| `L`           | Expected liability or escaped-defect cost                   |
| `Ccomm`       | Sales commission and channel cost                           |
| `Cfin`        | Financing cost caused by payment terms                      |
| `Fmin`        | Minimum engagement fee                                      |
| `ROIplatform` | Required contribution toward recovering platform investment |
| `Copp`        | Opportunity cost of using constrained specialist capacity   |

A stronger floor is:

[
\text{Required revenue} =
\max
\begin{cases}
\frac{\text{Expected AI cost}}{1-GM_{min}}\
\text{Expected AI cost}+\text{Baseline GP}\times(1+GP_{growth})\
F_{min}
\end{cases}
]

Then:

[
d_{max}=1-\frac{\text{Required revenue}}
{\text{Validated customer alternative cost}}
]

The deal should be quoted only when the customer’s willingness to pay is at least the required revenue. Otherwise, the appropriate decision is **re-scope, change the service level, or no-bid**—not automatically approve a larger discount.

---

# 2. Scope and baseline parameters missing from the policy

## 2.1 Units must be modeled by class, not only as one blended population

The deck proposes simple, medium and complex tier prices, and the workbook measures productivity by those classes. The calculator, however, largely collapses the engagement into one blended `U, h, c, e, q, t`.  

The policy needs:

| Missing parameter | Required treatment                                          |
| ----------------- | ----------------------------------------------------------- |
| `Ui`              | Units in each complexity class                              |
| `mixi`            | Expected percentage mix of simple, medium and complex units |
| `hi`              | Traditional effort per class                                |
| `ci`              | AI coverage per class                                       |
| `ei`              | Effort reduction per class                                  |
| `vi`              | Review coverage per class                                   |
| `ri`              | Rework rate per class                                       |
| `ti`              | AI-consumption cost per class                               |
| `pricei`          | Published price for each class                              |
| `mixTolerance`    | Permitted deviation from quoted class mix                   |

Without a mix-tolerance rule, the customer can unintentionally or deliberately deliver a harder population than the one priced. This creates **adverse selection**: the blended price remains fixed while the actual work shifts toward complex objects.

The policy should state that a quote is valid only within an agreed class-mix tolerance, such as:

[
|\text{Actual complex mix}-\text{Quoted complex mix}| \leq x%
]

Beyond that point, remaining units are reclassified and repriced.

## 2.2 “Completed unit” is not formally defined

The policy counts units but does not provide a sufficiently precise definition of when a unit is billable and complete.

Each offering needs a unit acceptance definition covering:

* Required input state
* Required output state
* Tests that must pass
* Documentation required
* Code-review requirement
* Deployment responsibility
* Acceptance authority
* Acceptance period
* Deemed-acceptance rule
* Treatment of partially completed units

For remediation, “one remediated object” could mean anything from “ATC warning resolved” to “successfully regression-tested in the customer environment.” Those are very different cost and risk propositions.

## 2.3 The baseline anchor is not independently validated

The deck describes `h × Rb` as the customer’s alternative cost, but `Rb` is the provider’s own traditional blended rate. That may not equal the customer’s actual alternative.

The policy needs:

| Parameter     | Meaning                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------ |
| `Btype`       | Baseline type: own historical quote, incumbent supplier, internal team or market benchmark |
| `Bsource`     | Source of the baseline                                                                     |
| `Bdate`       | Date of the baseline                                                                       |
| `Bconfidence` | Confidence grade                                                                           |
| `Bcustomer`   | Validated customer alternative cost                                                        |
| `Bswitch`     | Customer switching and transition cost                                                     |

The customer’s economic alternative might be an offshore provider, an internal SAP team, an existing AMS contract or postponement of the work. The price anchor should be evidence-based, not automatically equal to the partner’s previous rate card.

## 2.4 Scope uncertainty is missing

A single scope percentage is not enough. The policy needs:

* Scan coverage
* False-positive rate
* False-negative rate
* Dead-code treatment
* Dynamic-code and dependency exposure
* Number of units not yet classifiable
* Scope confidence level
* P50/P80/P90 unit estimates
* Reclassification rules after detailed discovery

A fixed-price quote should normally be based on a risk-adjusted scope, not only the average estimate.

## 2.5 Dependencies and reuse are missing

Units are treated as independent and identical. In reality:

* Several objects may share the same remediation pattern.
* One interface may depend on several mappings.
* One failure may cause regression across multiple objects.
* Common prompt or code-pattern development may create economies of scale.
* The final units may be disproportionately difficult.

The policy needs a `reuseFactor`, a `dependencyFactor` and a `tailComplexityFactor`.

## 2.6 Customer responsibilities are not parameterized

The policy should identify and price assumptions for:

* System and code access
* Test-data availability
* Environment availability
* Business-user availability
* Test-script quality
* Customer approval turnaround
* Security review turnaround
* Transport and deployment responsibilities
* Availability of functional specifications
* Existing technical debt

Customer-caused delays and poor input quality must trigger schedule relief, repricing or a change request.

---

# 3. Labor and delivery-cost parameters missing from the policy

## 3.1 One blended cost rate is not sufficient

The model applies one `Rc` to all remaining delivery hours, including senior QA. But AI delivery generally changes the labor pyramid:

* Fewer junior execution hours
* More AI-workflow engineering
* More architecture and exception handling
* More senior review
* More test and security effort

The policy needs labor cost by role and location:

[
C_{labor}=\sum_{i}\sum_{r}H_{ir}\times R_{r}
]

Where `r` could include:

* Junior consultant
* Senior consultant
* Solution architect
* AI/workflow engineer
* Test engineer
* Security reviewer
* Project manager
* Engagement lead
* Offshore, nearshore and onshore delivery

The deck explicitly anticipates a shift toward senior reviewers and AI-workflow engineers, but the cost formula does not reflect separate rates. 

## 3.2 Review coverage and review effort are being conflated

The current `q` is defined as review hours as a percentage of hours saved. That is not the same as the policy statement that 100% of AI output is senior-reviewed until rework falls below 2%.

The policy needs two separate parameters:

| Parameter  | Meaning                                                  |
| ---------- | -------------------------------------------------------- |
| `v`        | Percentage of AI-assisted units reviewed                 |
| `hQA`      | Review hours per reviewed unit                           |
| `RQA`      | Loaded cost rate of the reviewer                         |
| `QAexit`   | Threshold at which review may move from 100% to sampling |
| `QAsample` | Sampling percentage after the exit threshold             |

Review cost should be:

[
C_{QA}=U\times c\times v\times h_{QA}\times R_{QA}
]

The present `q` can then be reported as a derived productivity statistic, but it should not be the only policy control.

## 3.3 Fixed versus avoidable labor cost is missing

The formula assumes that every saved delivery hour reduces cost by `Rc`. That may be true in a fully variable subcontracting model, but not immediately for salaried consultants.

The policy needs:

| Parameter     | Meaning                                                     |
| ------------- | ----------------------------------------------------------- |
| `RcVariable`  | Cash cost that disappears when an hour is saved             |
| `RcFixed`     | Payroll and overhead that remain in the short term          |
| `pRedeploy`   | Probability that freed capacity is sold to another customer |
| `tRedeploy`   | Time required to redeploy capacity                          |
| `CMredeploy`  | Contribution margin earned on redeployed hours              |
| `CostHorizon` | Deal, annual or long-term economic horizon                  |

The policy should distinguish:

* **Cash savings:** actual cost eliminated
* **Capacity savings:** hours released
* **Revenue opportunity:** margin earned if those hours are resold

Otherwise, the savings pool can be overstated during the transition period.

## 3.4 PMO and non-production work are missing

The formula primarily models direct production and review effort. It needs separate allowance for:

* Discovery and scoping
* Architecture
* Project management
* Customer workshops
* Prompt and agent configuration
* Data preparation
* Test preparation
* Defect triage
* Security review
* Documentation
* Knowledge transfer
* Deployment support
* Hypercare
* Reporting and governance

These activities may not scale proportionately with the number of units.

## 3.5 Setup and onboarding cost is missing

The `P` platform line is too broad. The policy needs to distinguish:

| Parameter      | Example                                                 |
| -------------- | ------------------------------------------------------- |
| `Fdiscovery`   | ATC/readiness scan and detailed classification          |
| `Fsetup`       | Customer-specific workflow configuration                |
| `Fintegration` | Connecting repositories, SAP systems and test tools     |
| `Fsecurity`    | Security, data-residency and access reviews             |
| `Fevaluation`  | Benchmarking and acceptance calibration                 |
| `Ftraining`    | Team and customer enablement                            |
| `Fshutdown`    | Data deletion, access revocation and engagement closure |

A small engagement may be uneconomic because these costs are fixed even when unit volume is low. That is why a minimum engagement fee is necessary.

## 3.6 Platform amortization is undefined

The framework refers to platform and tooling cost `P`, but it does not state how shared platform investment is assigned to deals.

Required parameters include:

* Annual platform cost
* Expected annual unit volume
* Expected number of engagements
* Useful life of platform IP
* Amortization method
* Minimum recovery rate
* Shared versus customer-specific component
* Idle-capacity allocation
* Platform reinvestment rate

Without an allocation policy, different deal teams can enter inconsistent values for `P`.

---

# 4. Rework, warranty and quality-risk parameters are missing

The workbook measures a binary rework flag and the deck sets a target below 2%, but rework does not flow into the calculator’s AI cost. The customer proposal also promises free correction of failures.   

## 4.1 Rework needs both probability and cost

A binary rate is insufficient. The policy needs:

| Parameter   | Meaning                                             |
| ----------- | --------------------------------------------------- |
| `ρ`         | Probability a unit requires rework                  |
| `w`         | Average rework hours                                |
| `n`         | Average number of rework cycles                     |
| `Rw`        | Rate of the person performing rework                |
| `ρseverity` | Rework rate by defect severity                      |
| `ρcause`    | AI, requirement, customer-data or integration cause |
| `ρinternal` | Rework found before customer acceptance             |
| `ρwarranty` | Rework found after acceptance                       |

Expected rework cost is:

[
E[C_{rework}]
=U\times c\times \rho\times w\times n\times R_w
]

Failed AI attempts must also be captured. A unit for which AI was attempted and abandoned may incur tokens and human triage even though it is ultimately classified as manual.

## 4.2 Escaped defects are not captured

The policy needs:

* Defect escape probability
* Severity classification
* Average remediation cost by severity
* Customer disruption cost
* Service-credit exposure
* Liability cap
* Probability of invoking indemnity or warranty

An ATC pass is not necessarily equivalent to successful end-to-end business operation.

## 4.3 The warranty is undefined

“Fixed at no charge” needs boundaries:

* Warranty duration
* Start date
* Number of free correction cycles
* Response and resolution SLA
* Severity levels
* Customer acceptance period
* Customer-change exclusions
* Third-party and SAP-platform exclusions
* Maximum warranty liability
* Treatment of dependent-object defects
* Whether regression-environment problems are included
* Evidence required to invoke the warranty

The expected warranty cost should be reserved in the price before calculating `d*`.

## 4.4 Quality thresholds need more than rework rate

The policy should include:

* First-pass acceptance rate
* ATC pass rate
* Unit-test pass rate
* Regression pass rate
* Defects per unit
* Severity-weighted defect rate
* Security vulnerability rate
* Code-quality score
* Documentation completeness
* Manual override rate
* Customer rejection rate
* Post-production incident rate

The quality gate should not exit 100% review based solely on a single aggregate rework percentage.

---

# 5. AI-consumption and technical-operation parameters missing from the policy

## 5.1 Model-routing mix is not modeled

The deck says to route tasks between efficient, workhorse, frontier and SAP-native models. The calculator selects one tier for the entire engagement.  

The policy needs:

[
a_{ij}=\text{share of complexity class }i
\text{ routed to model route }j
]

It should capture:

* Efficient-model share
* Workhorse-model share
* Frontier-model share
* SAP-native-model share
* Fallback share
* Human-only share
* Escalation trigger
* Maximum frontier-model usage
* Provider concentration limit

## 5.2 Exact model identity and version are missing

“Workhorse” and “Frontier” are not auditable technical records. Capture:

* Provider
* Exact model name
* Model version or snapshot
* Endpoint
* Deployment region
* Pricing agreement
* Effective rate date
* Prompt version
* Agent version
* Tool version
* Evaluation benchmark version

A model change can alter quality, latency and token consumption even when the tier name remains unchanged.

## 5.3 Caching and batch are incorrectly combined into one discount

The calculator has one “caching + batch discount” input. These are economically different:

* Caching affects eligible repeated input tokens.
* Batch pricing applies only to eligible asynchronous requests.
* Output tokens may not receive the same discount.
* Long-context requests may carry surcharges.

Required parameters include:

| Parameter           | Meaning                             |
| ------------------- | ----------------------------------- |
| `cacheEligible`     | Share of input eligible for caching |
| `cacheHit`          | Actual cache-hit rate               |
| `cacheRate`         | Price of cached input               |
| `batchShare`        | Share processed through batch       |
| `batchDiscount`     | Batch discount                      |
| `longContextShare`  | Share attracting context surcharges |
| `retryDistribution` | P50/P80/P95 retry count             |
| `loopCap`           | Maximum agent iterations            |

## 5.4 Non-token AI costs are missing

Add:

* Embedding cost
* Vector-database cost
* Reranking cost
* Tool-call cost
* Code-execution sandbox cost
* Storage
* Logging and observability
* API gateway
* Data egress
* Fine-tuning
* Evaluation runs
* Guardrail and moderation services
* Private endpoint premium
* Disaster-recovery capacity
* Vendor minimum commitments

## 5.5 Throughput and elapsed-time constraints are missing

The calculator estimates duration as hours divided by team FTEs and a fixed 140 productive hours per month. That assumes linear parallelization.

The policy needs:

* Machine runtime per unit
* Queue time
* Concurrency limit
* API rate limit
* Batch turnaround
* Environment availability
* Critical-path factor
* Parallelizability factor
* Customer wait time
* Productive hours by geography
* Holidays and planned leave
* Ramp-up and ramp-down
* Capacity reserved for exceptions

AI can reduce human effort without reducing calendar duration to the same extent.

## 5.6 Model deprecation and performance drift are not costed

The deck acknowledges deprecation and lock-in, but there is no corresponding reserve or reopener rule. 

Add:

* Rebenchmark frequency
* Minimum benchmark quality
* Model-switch approval
* Prompt migration cost
* Regression evaluation cost
* Failover-provider cost
* Deprecation reserve
* Maximum allowable quality degradation
* Repricing trigger after major provider changes

---

# 6. Gain-share parameters missing from the policy

## 6.1 Discount percentage is not the same as savings-pool share

The framework refers to gain-sharing, but `d` is a discount from traditional revenue. It is not the percentage of the savings pool given to the customer.

The actual customer share is:

[
\alpha_{customer}
=================

\frac{d\times \text{Traditional price}}
{\text{Traditional cost}-\text{Expected AI cost}}
]

In the worked example, a 25% price discount transfers about three-quarters of the savings pool to the customer. Therefore, policy should explicitly define:

| Parameter   | Meaning                                       |
| ----------- | --------------------------------------------- |
| `αcustomer` | Customer’s share of the productivity dividend |
| `αpartner`  | Incremental margin retained by the partner    |
| `αreinvest` | Amount reserved for platform reinvestment     |

With:

[
\alpha_{customer}+\alpha_{partner}+\alpha_{reinvest}=1
]

This is more transparent than describing a price discount as though it were automatically the gain-share percentage.

## 6.2 Platform reinvestment is mentioned but not enforced

The deck says that the savings pool funds customer discounts, margin expansion and platform reinvestment. The calculator only shows customer savings and partner profit; it does not carve out reinvestment. 

Add:

* Minimum reinvestment percentage
* Platform-recovery target
* Reinvestment account owner
* Eligible uses
* Annual cap
* Deal-level versus portfolio-level allocation

## 6.3 Market and willingness-to-pay parameters are absent

The framework is primarily cost- and baseline-based. A complete pricing policy also needs:

* Customer willingness to pay
* Competitor benchmark
* Customer internal cost
* Urgency
* Regulatory deadline
* Cost of delay
* Business value of earlier completion
* Risk reduction
* Strategic value to the customer
* Price sensitivity
* Availability of substitutes

Price should be constrained by both:

* **Internal floor:** economic minimum
* **External ceiling:** customer willingness to pay and market alternatives

## 6.4 Win probability is absent

The deck notes that giving customers too little benefit may reduce the win rate, but no parameter models that effect. 

Add:

[
p_{win}(d,\text{account},\text{competition},\text{value case})
]

Expected commercial contribution is:

[
E[\text{Contribution}]
======================

p_{win}\times(\text{Price}-\text{Expected cost})
-\text{Bid cost}
]

The optimal discount is not necessarily the discount that maximizes profit on a won deal. It is the discount that produces the best risk-adjusted expected contribution across win probability and margin.

## 6.5 Volume and commitment economics are absent

Add:

* Minimum unit commitment
* Volume bands
* Committed versus forecast units
* Overage price
* Under-consumption charge
* Take-or-pay requirement
* Mix protection
* Ramp schedule
* Cancellation fee
* Pause and restart fee
* Maximum units per period

The unit price should not be the same for 25 units and 25,000 units when setup cost and reuse economics differ materially.

## 6.6 Account and risk segmentation are absent

The same opening band should not apply automatically to every customer.

Bands should vary by:

* Deal size
* Strategic account status
* New versus existing customer
* Industry regulation
* Country and delivery region
* Payment risk
* Contract term
* Reference value
* Competitive intensity
* Data-security classification
* Scope confidence
* Delivery maturity

The deck refers to floors “by deal size,” but the calculator contains no deal-size approval table. It only compares the entered discount to one opening band and one calculated floor.  

---

# 7. Commercial and financial parameters missing from the policy

The following should be explicit deal inputs rather than buried in a general loaded cost:

| Area                | Missing parameters                                             |
| ------------------- | -------------------------------------------------------------- |
| Currency            | Quote currency, cost currency and exchange-rate source         |
| FX risk             | Hedge rate, buffer and reopener threshold                      |
| Inflation           | Labor escalation and annual unit-price uplift                  |
| Taxes               | Sales tax, VAT/GST, withholding tax and digital-service taxes  |
| Payment terms       | Deposit, milestones, DSO and retention                         |
| Financing           | Cost of working capital                                        |
| Revenue recognition | Milestone, unit acceptance or subscription treatment           |
| Sales costs         | Commission, referral fee, reseller margin and SAP/channel fees |
| Travel              | Travel, expenses and on-site premium                           |
| Third-party costs   | SAP licenses, test tools and customer-mandated technology      |
| Credit risk         | Customer credit score and bad-debt reserve                     |
| Price validity      | Quote-expiry date                                              |
| Contract term       | Initial term, renewal term and termination rights              |
| Indexation          | Annual uplift formula                                          |
| Change in law       | Repricing or termination rights                                |
| Termination         | Cancellation and early-termination charge                      |

A deal can satisfy the current gross-profit floor and still have poor cash economics because of long payment terms, taxes or currency movement.

---

# 8. Subscription-policy parameters are almost entirely missing

The deck identifies subscription pricing as the intended end state, but the calculator implements only T&M, premium T&M and per-unit value pricing.  

A subscription policy needs:

* Base annual fee
* Included units
* Included environments
* Included users or systems
* Overage unit price
* Minimum annual commitment
* Contract duration
* Renewal uplift
* Support tier
* SLA tier
* Availability target
* Response and resolution times
* Monitoring frequency
* Upgrade entitlement
* Data-retention period
* Model and platform upgrade rights
* Customer-success cost
* Support cost
* Gross-retention target
* Net-retention target
* Churn assumption
* Expansion assumption
* Implementation fee
* Termination fee
* Usage true-up
* Capacity reservation
* Price protection period

Without these parameters, the subscription ambition is a strategy statement rather than an operable pricing policy.

---

# 9. SLA, contract and legal parameters missing from the policy

Several issues are mentioned conceptually but not converted into pass/fail policy gates.

## 9.1 SLA parameters

Add:

* Start condition
* Delivery lead time
* Throughput per week
* Response time
* Resolution time
* Severity definitions
* Availability target
* Planned-maintenance exclusion
* Customer-delay exclusion
* Service-credit formula
* Maximum service-credit liability
* Measurement source
* Reporting frequency

## 9.2 Data and security parameters

The deck highlights data retention, training use, residency and indemnity but provides no mandatory eligibility gate. 

The quote workflow should require:

* Data classification
* Permitted model providers
* Approved regions
* Private-endpoint requirement
* Data-retention setting
* No-training confirmation
* Subprocessor approval
* Encryption requirements
* Log-retention period
* Access-control model
* Code and data deletion procedure
* Incident-notification period
* Customer audit rights

A deal should be blocked when the selected model route does not satisfy the customer’s security classification, regardless of margin.

## 9.3 IP and licensing parameters

Add:

* Ownership of generated code
* Ownership of prompts and agents
* Ownership of reusable accelerators
* Rights to use engagement learnings
* Rights to retain anonymized benchmarks
* Open-source-license scanning
* Third-party-code restrictions
* Model-provider indemnity
* Customer-code indemnity
* Patent and copyright treatment
* Restrictions on model training
* Exit and portability rights

## 9.4 Liability parameters

Add:

* Liability cap
* Warranty cap
* Consequential-damage exclusion
* Security-event treatment
* IP-indemnity cap
* Data-loss treatment
* Regulatory-fine allocation
* Customer-contribution and misuse clauses
* Insurance requirements
* High-risk-industry approval

These terms affect expected cost and should feed either a risk premium or a no-bid decision.

---

# 10. Governance parameters missing from the policy

The quote workflow currently has three broad outcomes: sales approval, deal-desk exception and blocked. That is a useful start but not a sufficient approval matrix.  

## Required governance fields

| Parameter             | Required policy                                |
| --------------------- | ---------------------------------------------- |
| Policy owner          | Named accountable executive                    |
| Formula owner         | Finance or pricing function                    |
| Delivery-data owner   | Delivery operations                            |
| AI-rate owner         | Platform or procurement function               |
| Effective date        | Start date of the parameter set                |
| Expiry date           | Date after which it cannot be used             |
| Version               | Immutable policy/calculator version            |
| Source                | Evidence supporting each input                 |
| Confidence grade      | High, medium or low                            |
| Approvers             | Named roles by threshold                       |
| Segregation of duties | Input preparer cannot be sole approver         |
| Record retention      | Duration for quote and approval evidence       |
| Exception expiry      | Exceptions must not become permanent precedent |
| Reapproval trigger    | Conditions requiring a new simulation          |
| Audit frequency       | Review of compliance and outcomes              |

## Approval should be multidimensional

Approval should depend on more than discount:

* Total contract value
* Gross-margin percentage
* Gross-profit dollars
* Risk-adjusted margin
* Scope confidence
* Warranty exposure
* Data classification
* Liability cap
* Contract duration
* Payment terms
* Country risk
* Customer credit risk
* Technology maturity
* Percentage of unvalidated assumptions
* Strategic exception score

A 15% discount on a high-risk, multi-year regulated-industry contract may deserve more scrutiny than a 28% discount on a small, well-measured deal.

---

# 11. Data-spine parameters missing from the workbook

The current log contains Unit ID, type, complexity, AI-handled status, AI/human/review minutes, rework, tokens, model and notes. That supports a prototype but not a sufficiently auditable commercial dataset. 

The following columns should be added.

## Engagement and context

* Quote ID
* Engagement ID
* Customer
* Industry
* Country
* Delivery location
* Offering
* SAP module
* SAP product/version
* Environment
* Unit completion date
* Delivery team
* Owner

## Baseline and scope

* Unit-level baseline minutes
* Baseline source
* Baseline version
* Complexity score
* Complexity rationale
* Initial complexity
* Final complexity
* Dependency group
* Reuse pattern
* Scope-change flag

Using only one class-level baseline can distort measured productivity when units within a class vary substantially.

## AI operation

* AI attempted Y/N
* AI contribution percentage
* Exact provider
* Exact model and version
* Endpoint region
* Prompt version
* Agent version
* Toolchain version
* Retry count
* Tool-call count
* Cache-eligible tokens
* Cached tokens
* Batch Y/N
* Machine elapsed time
* Failure or fallback reason

The existing binary “AI Handled Y/N” cannot represent partial assistance or unsuccessful attempts.

## Human effort

* Prompting minutes
* Analysis minutes
* Editing minutes
* Testing minutes
* Review minutes
* PM minutes
* Security-review minutes
* Role or grade
* Delivery location
* Actual labor rate

## Quality and rework

* First-pass accepted Y/N
* ATC result
* Unit-test result
* Regression result
* Defect count
* Defect severity
* Rework minutes
* Number of rework cycles
* Root cause
* Customer rejection Y/N
* Warranty incident Y/N
* Warranty remediation minutes
* Production incident Y/N

## Commercial outcome

* Quoted unit price
* Actual unit revenue
* Actual cost
* Discount
* Customer acceptance date
* SLA result
* Service credit
* Gross profit
* Quote-to-actual variance

Without commercial-outcome fields, the data spine can improve productivity assumptions but cannot determine whether the pricing policy itself improved win rate, margin or customer outcomes.

---

# 12. Statistical-policy parameters are missing

The workbook states that approximately 500 units, or roughly 150 per class, should make results defensible. It does not specify the statistical standard behind that threshold.  

The policy should define:

* Required confidence level
* Maximum acceptable margin of error
* Minimum sample size per class
* Minimum number of separate projects
* Minimum number of customers
* Outlier treatment
* Missing-data treatment
* Recency window
* Weighting method
* Seasonality treatment
* Learning-curve treatment
* Independence assumptions
* Required pilot representativeness
* Rules for excluding abnormal units
* Rules for blending geographies or offerings

A sample of 500 units from one project and one customer may be less reliable than 300 units spread across several customers and delivery teams.

## The all-units weighting rule also needs correction

The workbook derives all-unit `e` and `q` by weighting class percentages using the number of AI-handled units. Because simple, medium and complex units have different baseline minutes, count-weighting can distort the economic result.

Using the sample data:

* Workbook all-unit effort reduction: approximately **68.8%**
* Total-baseline-minute calculation: approximately **64.9%**
* Workbook QA add-back: approximately **13.7%**
* Total-review-minutes divided by total gross minutes saved: approximately **15.2%**

The policy must specify whether blended metrics are weighted by:

* Unit count
* Baseline hours
* Actual hours
* Cost
* Quoted revenue

For pricing, baseline-hour or cost weighting is generally more economically representative than straight unit-count weighting.

---

# 13. Concrete cross-document mismatches

| Policy statement                          | What is currently missing                                              |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| Publish simple, medium and complex prices | Calculator mainly operates as one blended scenario                     |
| Rework must remain below 2%               | Rework rate does not enter AI cost or the discount floor               |
| Every AI unit is senior-reviewed          | Calculator uses QA add-back hours but has no review-coverage parameter |
| Route tasks across model tiers            | Calculator selects one tier for the whole engagement                   |
| Use separate input and output token rates | Workbook’s calculator-transfer section reports only combined tokens    |
| Set floors by deal size                   | No deal-size band table or deal-size input exists                      |
| Provide an SLA                            | No SLA level, metric or service-credit input exists                    |
| Offer a free rework warranty              | No warranty duration, cap or reserve exists                            |
| Absorb model-price volatility             | No quote-validity, reopener or volatility reserve exists               |
| Verify data, IP and residency terms       | No security or legal approval gate exists                              |
| Move to subscription revenue              | No subscription economics are implemented                              |
| Provide a portfolio roll-up               | Supplied calculator has no persistence or portfolio aggregation        |
| Reinvest in the AI platform               | No mandatory reinvestment allocation exists                            |
| Shift sales compensation toward margin    | Commission cost and compensation rules are not in the deal economics   |

---

# 14. Minimum parameter set required before this becomes binding policy

The following should be mandatory before any value-priced quote leaves the business:

### Scope and evidence

`Ui`, complexity mix, acceptance criteria, baseline source, scope confidence, dependencies, exclusions, customer prerequisites and change thresholds.

### Delivery economics

Role-level hours and rates, separate senior-review cost, PMO/setup cost, fixed-versus-variable labor treatment, model-route mix, token and non-token infrastructure, expected rework, warranty reserve and contingency.

### Pricing

Validated customer alternative cost, minimum gross margin, minimum gross-profit hurdle, minimum engagement fee, customer/partner/reinvestment split, volume tier, market ceiling and no-bid rule.

### Contract

Warranty duration and cap, acceptance period, SLA, service credits, customer-delay relief, payment terms, FX/tax treatment, IP terms, data-residency route and liability limits.

### Governance

Quote ID, calculator version, parameter effective date, evidence grade, approval matrix, exception expiry, actual-to-quote review and rebaseline trigger.

---

# Recommended production formula

The policy should move from:

[
C_{AI}=AI\ hours\times R_c+tokens+P
]

to:

[
\begin{aligned}
E[C_{AI}] =;&
C_{\text{delivery labor by role and class}}\
&+C_{\text{review}}\
&+E[C_{\text{rework}}]\
&+E[C_{\text{warranty and escaped defects}}]\
&+C_{\text{tokens, tools and infrastructure}}\
&+F_{\text{discovery, setup and integration}}\
&+F_{\text{PMO, security and support}}\
&+P_{\text{allocated platform cost}}\
&+C_{\text{commission, FX and financing}}\
&+C_{\text{risk contingency}}
\end{aligned}
]

Then calculate:

[
R_{floor}
=========

\max
\left(
\frac{E[C_{AI}]}{1-GM_{min}},
E[C_{AI}]+GP_{baseline}(1+g),
F_{min}
\right)
]

[
d_{max}
=======

1-\frac{R_{floor}}{B_{customer}}
]

And enforce:

* `Customer willingness to pay ≥ Rfloor`
* Legal and security gates passed
* Scope confidence above threshold
* Required evidence current
* Class mix within tolerance
* Quote not expired

# Bottom line

The present policy protects margin only under a narrow set of assumptions: homogeneous units, accurate scope, fully variable labor, one blended cost rate, average AI performance, negligible rework cost and no additional contract risk.

A production policy must instead protect **risk-adjusted expected contribution**. The most urgent additions are complexity-level economics, separate QA rates, rework and warranty reserves, fixed-versus-variable labor treatment, target-margin floors, scope/change controls, contract-risk parameters and an auditable evidence and approval record. Without those additions, `d*` can appear safe in the calculator while the signed engagement is economically below the true floor.
