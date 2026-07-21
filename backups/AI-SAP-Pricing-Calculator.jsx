import { useMemo, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, CartesianGrid, ResponsiveContainer, Cell,
} from "recharts";

// ————— Palette (matches the framework deck) —————
const NAVY = "#16243D";
const NAVY2 = "#24385C";
const ICE = "#D9E6F7";
const ICE2 = "#EEF4FC";
const GOLD = "#E8A33D";
const GOLDD = "#C77F1A";
const SLATE = "#3C4C66";
const MUTED = "#6B7A93";
const RED = "#C0504D";
const GREEN = "#4E8A5A";

// ————— Offering presets (any AI-powered SAP offering fits the same model) —————
const PRESETS = {
  remediation: {
    name: "Custom Code Remediation — ECC → S/4HANA",
    tagline: "Case example from the framework deck",
    unit: "object",
    unitPlural: "objects",
    populationLabel: "Custom objects in ECC estate",
    scopeLabel: "Objects needing remediation",
    totalUnits: 12000, scopePct: 30, hrsPerUnit: 3.5, billRate: 95, costRate: 62,
    aiCoverage: 85, effortReduction: 70, qaAddBack: 10, platformCost: 25000,
    teamFtes: 8, openingBandPct: 25,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 200, tokensOutK: 30, agentOverheadPct: 50, tokenDiscountPct: 5,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  },
  testAutomation: {
    name: "Test Script Automation — S/4 Regression Suite",
    tagline: "Manual test cases converted to automated scripts",
    unit: "test case",
    unitPlural: "test cases",
    populationLabel: "Test cases in regression suite",
    scopeLabel: "Test cases worth automating",
    totalUnits: 4000, scopePct: 70, hrsPerUnit: 2.5, billRate: 85, costRate: 55,
    aiCoverage: 90, effortReduction: 75, qaAddBack: 8, platformCost: 20000,
    teamFtes: 6, openingBandPct: 25,
    llmTier: "efficient", priceIn: 1, priceOut: 5, tokensInK: 250, tokensOutK: 60, agentOverheadPct: 60, tokenDiscountPct: 10,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  },
  dataMigration: {
    name: "Data Migration Objects — ECC → S/4HANA",
    tagline: "Extraction, mapping, cleansing and load per data object",
    unit: "data object",
    unitPlural: "data objects",
    populationLabel: "Data objects identified",
    scopeLabel: "Data objects in migration scope",
    totalUnits: 250, scopePct: 80, hrsPerUnit: 40, billRate: 100, costRate: 65,
    aiCoverage: 70, effortReduction: 55, qaAddBack: 15, platformCost: 40000,
    teamFtes: 6, openingBandPct: 20,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 1500, tokensOutK: 250, agentOverheadPct: 60, tokenDiscountPct: 10,
    pricingModel: "value", premiumPct: 15, discountPct: 20,
  },
  interfaces: {
    name: "Interface Development — BTP / CPI",
    tagline: "Legacy interfaces rebuilt as clean-core integrations",
    unit: "interface",
    unitPlural: "interfaces",
    populationLabel: "Interfaces in landscape",
    scopeLabel: "Interfaces to rebuild",
    totalUnits: 120, scopePct: 100, hrsPerUnit: 60, billRate: 110, costRate: 70,
    aiCoverage: 75, effortReduction: 50, qaAddBack: 12, platformCost: 35000,
    teamFtes: 8, openingBandPct: 20,
    llmTier: "frontier", priceIn: 5, priceOut: 25, tokensInK: 1200, tokensOutK: 300, agentOverheadPct: 60, tokenDiscountPct: 7,
    pricingModel: "value", premiumPct: 15, discountPct: 20,
  },
  custom: {
    name: "Custom Offering",
    tagline: "Define your own unit of work and parameters",
    unit: "unit",
    unitPlural: "units",
    populationLabel: "Units in total population",
    scopeLabel: "Units in scope",
    totalUnits: 1000, scopePct: 50, hrsPerUnit: 8, billRate: 100, costRate: 65,
    aiCoverage: 70, effortReduction: 60, qaAddBack: 10, platformCost: 25000,
    teamFtes: 5, openingBandPct: 25,
    llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 600, tokensOutK: 100, agentOverheadPct: 60, tokenDiscountPct: 5,
    pricingModel: "value", premiumPct: 15, discountPct: 25,
  },
};

// ————— LLM model tiers (indicative list prices, $ per 1M tokens, July 2026 — reprice quarterly) —————
const TIERS = {
  frontier: { name: "Frontier — Opus 4.8 / GPT-5.6 class", pin: 5, pout: 25 },
  workhorse: { name: "Workhorse — Sonnet 4.6 / Gemini 3.1 Pro class", pin: 3, pout: 15 },
  efficient: { name: "Efficient — Haiku 4.5 / Flash class", pin: 1, pout: 5 },
  saphub: { name: "SAP GenAI Hub / ABAP-tuned (AI Units)", pin: 3, pout: 15 },
  customRates: { name: "Custom rates", pin: null, pout: null },
};

const fmt$ = (v) =>
  Math.abs(v) >= 1_000_000
    ? "$" + (v / 1_000_000).toFixed(2) + "M"
    : "$" + Math.round(v / 1000).toLocaleString() + "K";
const fmt$full = (v) => "$" + Math.round(v).toLocaleString();
const fmtPct = (v) => (isFinite(v) ? (v * 100).toFixed(1) + "%" : "—");

// ————— The framework's formula set (generic) —————
// Baseline:  Revenue = U·h·Rb   Cost = U·h·Rc
// AI hours   = U·h·(1 − c·e·(1−q))
// AI cost    = AI hours·Rc + U·c·t + P
// Value price= Traditional price·(1 − d);  d* = 1 − (Trad profit + AI cost)/Trad price
function compute(p) {
  const unitsInScope = Math.round(p.totalUnits * (p.scopePct / 100));
  const tradHours = unitsInScope * p.hrsPerUnit;
  const tradRevenue = tradHours * p.billRate;
  const tradCost = tradHours * p.costRate;
  const tradProfit = tradRevenue - tradCost;

  const coveredUnits = unitsInScope * (p.aiCoverage / 100);
  // t derived from the LLM layer: (tokens × price) × agentic overhead × (1 − caching/batch discount)
  const tokenPerUnit =
    ((p.tokensInK * p.priceIn + p.tokensOutK * p.priceOut) / 1000) *
    (1 + p.agentOverheadPct / 100) *
    (1 - p.tokenDiscountPct / 100);
  const savedHours = tradHours * (p.aiCoverage / 100) * (p.effortReduction / 100);
  const qaHours = savedHours * (p.qaAddBack / 100);
  const aiHours = tradHours - savedHours + qaHours;
  const tokenCost = coveredUnits * tokenPerUnit;
  const aiCost = aiHours * p.costRate + tokenCost + p.platformCost;

  const revenueFor = (model) => {
    if (model === "tm") return aiHours * p.billRate;
    if (model === "premium") return aiHours * p.billRate * (1 + p.premiumPct / 100);
    return tradRevenue * (1 - p.discountPct / 100);
  };

  const scen = (model) => {
    const revenue = revenueFor(model);
    const profit = revenue - aiCost;
    return {
      revenue, cost: aiCost, profit,
      marginPct: revenue > 0 ? profit / revenue : 0,
      revPerHour: aiHours > 0 ? revenue / aiHours : 0,
      pricePerUnit: unitsInScope > 0 ? revenue / unitsInScope : 0,
      customerSavings: tradRevenue - revenue,
    };
  };

  const HOURS_PER_FTE_MONTH = 140;
  const tradMonths = tradHours / Math.max(p.teamFtes * HOURS_PER_FTE_MONTH, 1);
  const aiMonths = aiHours / Math.max(p.teamFtes * HOURS_PER_FTE_MONTH, 1);

  const beRevenue = tradProfit + aiCost;
  const breakevenDiscount = tradRevenue > 0 ? 1 - beRevenue / tradRevenue : 0;

  return {
    unitsInScope, tradHours, tradRevenue, tradCost, tradProfit,
    tradMarginPct: tradRevenue > 0 ? tradProfit / tradRevenue : 0,
    tradPricePerUnit: unitsInScope > 0 ? tradRevenue / unitsInScope : 0,
    aiHours, savedHours, qaHours, tokenCost, aiCost, tokenPerUnit,
    tradMonths, aiMonths,
    aiCostPerUnit: unitsInScope > 0 ? aiCost / unitsInScope : 0,
    selected: scen(p.pricingModel),
    tm: scen("tm"), premium: scen("premium"), value: scen("value"),
    breakevenDiscount,
  };
}

// ————— UI pieces —————
function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold tracking-widest" style={{ color: GOLDD }}>
        {title.toUpperCase()}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function SliderRow({ label, value, setValue, min, max, step = 1, suffix = "", hint }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
        <span className="text-sm font-bold tabular-nums" style={{ color: NAVY }}>
          {value.toLocaleString()}{suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="mt-1 w-full accent-amber-500"
        aria-label={label}
      />
      {hint && <div className="text-xs" style={{ color: MUTED }}>{hint}</div>}
    </div>
  );
}

function NumRow({ label, value, setValue, step = 1, prefix = "", suffix = "" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm font-medium" style={{ color: SLATE }}>{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm" style={{ color: MUTED }}>{prefix}</span>}
        <input
          type="number" value={value} step={step}
          onChange={(e) => setValue(Number(e.target.value) || 0)}
          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-amber-400"
          style={{ color: NAVY }}
          aria-label={label}
        />
        {suffix && <span className="text-sm" style={{ color: MUTED }}>{suffix}</span>}
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, tone = "light", accent = false }) {
  const dark = tone === "dark";
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: dark ? NAVY : ICE2, border: dark ? "none" : `1px solid ${ICE}` }}
    >
      <div className="text-xs font-bold tracking-wider" style={{ color: dark ? GOLD : GOLDD }}>
        {label.toUpperCase()}
      </div>
      <div className="mt-1 text-2xl font-extrabold tabular-nums" style={{ color: accent ? GOLD : dark ? "#fff" : NAVY }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs" style={{ color: dark ? ICE : MUTED }}>{sub}</div>}
    </div>
  );
}

const MODELS = [
  { id: "tm", label: "T&M pass-through", note: "AI hours × old rate — the margin trap" },
  { id: "premium", label: "Premium-rate T&M", note: "AI hours × rate + premium — a bridge" },
  { id: "value", label: "Per-unit value price", note: "Traditional price − customer discount" },
];

export default function App() {
  const [presetId, setPresetId] = useState("remediation");
  const [view, setView] = useState("internal"); // "internal" | "customer"
  const [st, setSt] = useState({ ...PRESETS.remediation });
  const set = (k) => (v) => setSt((s) => ({ ...s, [k]: v }));
  const loadPreset = (id) => { setPresetId(id); setSt({ ...PRESETS[id] }); };

  const r = useMemo(() => compute(st), [st]);
  const sel = r.selected;
  const profitDelta = sel.profit - r.tradProfit;
  const belowFloor = st.pricingModel === "value" && st.discountPct / 100 > r.breakevenDiscount;
  const U = st.unit, Up = st.unitPlural;
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);

  const compareData = [
    { name: "Traditional (no AI)", Revenue: r.tradRevenue, "Cost of delivery": r.tradCost, "Gross profit": r.tradProfit },
    { name: "AI + T&M", Revenue: r.tm.revenue, "Cost of delivery": r.tm.cost, "Gross profit": r.tm.profit },
    { name: "AI + Premium T&M", Revenue: r.premium.revenue, "Cost of delivery": r.premium.cost, "Gross profit": r.premium.profit },
    { name: `AI + Value (−${st.discountPct}%)`, Revenue: r.value.revenue, "Cost of delivery": r.value.cost, "Gross profit": r.value.profit },
  ];

  const discountCurve = useMemo(() => {
    const pts = [];
    for (let d = 0; d <= 50; d += 2.5) {
      const rev = r.tradRevenue * (1 - d / 100);
      pts.push({ discount: d, "Gross profit (value pricing)": Math.round(rev - r.aiCost) });
    }
    return pts;
  }, [r.tradRevenue, r.aiCost]);

  return (
    <div className="min-h-screen" style={{ background: "#F5F8FC", fontFamily: "ui-sans-serif, system-ui" }}>
      {/* Header */}
      <div style={{ background: NAVY }} className="px-6 py-5">
        <div className="mx-auto max-w-6xl">
          <div className="text-xs font-bold tracking-[0.25em]" style={{ color: GOLD }}>
            AI-POWERED SAP OFFERINGS · PRICING CALCULATOR
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-white">{st.name}</h1>
              <p className="mt-1 text-sm" style={{ color: ICE }}>
                One generic model — baseline economics, AI cost of delivery, price architecture, value sharing. Pick an offering or define your own.
              </p>
            </div>
            <button
              onClick={() => loadPreset(presetId)}
              className="rounded-lg px-4 py-2 text-sm font-bold shadow"
              style={{ background: GOLD, color: NAVY }}
            >
              Reset this offering
            </button>
          </div>
          {/* View toggle */}
          <div className="mt-4 inline-flex rounded-lg p-1" style={{ background: NAVY2 }}>
            {[["internal", "Internal deal view"], ["customer", "Customer value view"]].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className="rounded-md px-4 py-1.5 text-xs font-bold transition"
                style={{ background: view === id ? GOLD : "transparent", color: view === id ? NAVY : ICE }}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Preset tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([id, p]) => (
              <button
                key={id}
                onClick={() => loadPreset(id)}
                className="rounded-full px-3 py-1.5 text-xs font-bold transition"
                style={{
                  background: presetId === id ? GOLD : NAVY2,
                  color: presetId === id ? NAVY : ICE,
                }}
              >
                {id === "remediation" ? "★ Code Remediation (case example)" : p.name.split(" — ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "customer" ? (
        /* ————— Customer value view: price, savings, speed — never the cost stack ————— */
        <div className="mx-auto max-w-3xl space-y-5 p-5">
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: NAVY }}>
            <div className="text-xs font-bold tracking-widest" style={{ color: GOLD }}>YOUR PROPOSAL — PER-{U.toUpperCase()} PRICING</div>
            <div className="mt-3 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">{fmt$(r.value.revenue)}</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>Your investment · {r.unitsInScope.toLocaleString()} {Up} at {fmt$full(r.value.pricePerUnit)} each</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold tabular-nums" style={{ color: GOLD }}>{fmt$(r.value.customerSavings)}</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>You save {fmtPct(r.value.customerSavings / Math.max(r.tradRevenue, 1))} vs. the traditional approach</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">{r.aiMonths.toFixed(1)} mo</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>Delivery timeline — vs. {r.tradMonths.toFixed(1)} months traditionally</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-white tabular-nums">100%</div>
                <div className="mt-1 text-xs" style={{ color: ICE }}>Senior-reviewed, warranty-backed {Up}</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-extrabold" style={{ color: NAVY }}>Your cost: traditional approach vs. this offer</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: "Traditional approach", Cost: r.tradRevenue },
                { name: "This offer", Cost: r.value.revenue },
              ]} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: SLATE }} />
                <Tooltip formatter={(v) => fmt$full(v)} />
                <Bar dataKey="Cost" radius={[0, 4, 4, 0]}>
                  <Cell fill="#7A93B8" />
                  <Cell fill={GOLD} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-2 text-sm font-extrabold" style={{ color: NAVY }}>What's included in the {U} price</div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Fixed scope, counted openly", `ATC-based scoping and complexity classification — you see exactly which ${Up} are in scope and in which tier.`],
                ["Senior quality gate", `Every AI-assisted ${U} is reviewed by a senior consultant before delivery — nothing ships unreviewed.`],
                ["Rework warranty", `Any delivered ${U} that fails ATC or regression testing is fixed at no charge. Quality risk stays with us.`],
                ["Predictable price", `You pay per ${U}, not per hour — scope changes reprice transparently at the published tier rates.`],
              ].map(([t, d]) => (
                <div key={t} className="rounded-lg p-3" style={{ background: ICE2 }}>
                  <div className="text-sm font-bold" style={{ color: NAVY }}>{t}</div>
                  <div className="mt-1 text-xs" style={{ color: SLATE }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl p-4 text-xs" style={{ background: ICE, color: SLATE }}>
            Comparison baseline: the market-standard effort-based approach for this scope ({Math.round(r.tradHours).toLocaleString()} hours at prevailing blended rates). Figures are illustrative until scope is confirmed by ATC scan.
          </div>
        </div>
      ) : (
      <div className="mx-auto grid max-w-6xl gap-5 p-5 lg:grid-cols-[340px_1fr]">
        {/* ————— Inputs ————— */}
        <div className="space-y-4">
          <Section title={`Step 1 · Baseline (unit: ${U})`}>
            {presetId === "custom" && (
              <div className="flex items-center justify-between gap-3">
                <label className="text-sm font-medium" style={{ color: SLATE }}>Unit of work (name)</label>
                <input
                  type="text" value={st.unit}
                  onChange={(e) => setSt((s) => ({ ...s, unit: e.target.value || "unit", unitPlural: (e.target.value || "unit") + "s" }))}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                  style={{ color: NAVY }}
                />
              </div>
            )}
            <NumRow label={st.populationLabel} value={st.totalUnits} setValue={set("totalUnits")} step={100} />
            <SliderRow label={st.scopeLabel} value={st.scopePct} setValue={set("scopePct")} min={5} max={100} suffix="%" hint={`U = ${r.unitsInScope.toLocaleString()} ${Up} in scope`} />
            <NumRow label={`Traditional effort per ${U} (h)`} value={st.hrsPerUnit} setValue={set("hrsPerUnit")} step={0.5} suffix="hrs" />
            <NumRow label="Blended bill rate (Rb)" value={st.billRate} setValue={set("billRate")} prefix="$" suffix="/hr" />
            <NumRow label="Loaded delivery cost (Rc)" value={st.costRate} setValue={set("costRate")} prefix="$" suffix="/hr" />
            <NumRow label="Delivery team size" value={st.teamFtes} setValue={set("teamFtes")} suffix="FTE" />
          </Section>

          <Section title="Step 2 · AI cost of delivery">
            <SliderRow label={`AI coverage of ${Up} (c)`} value={st.aiCoverage} setValue={set("aiCoverage")} min={0} max={100} suffix="%" hint={`Share of ${Up} AI can handle`} />
            <SliderRow label="Effort reduction on covered (e)" value={st.effortReduction} setValue={set("effortReduction")} min={0} max={90} suffix="%" />
            <SliderRow label="Human QA add-back (q)" value={st.qaAddBack} setValue={set("qaAddBack")} min={0} max={40} suffix="%" hint="Senior review, as % of hours AI saves" />
            <div className="rounded-lg p-3" style={{ background: ICE2 }}>
              <div className="mb-2 text-xs font-bold tracking-widest" style={{ color: GOLDD }}>LLM ASSUMPTIONS → t</div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium" style={{ color: SLATE }}>Model tier (routing choice)</label>
                  <select
                    value={st.llmTier}
                    onChange={(e) => {
                      const id = e.target.value; const t = TIERS[id];
                      setSt((s) => ({ ...s, llmTier: id, priceIn: t.pin ?? s.priceIn, priceOut: t.pout ?? s.priceOut }));
                    }}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400"
                    style={{ color: NAVY }}
                  >
                    {Object.entries(TIERS).map(([id, t]) => (
                      <option key={id} value={id}>{t.name}</option>
                    ))}
                  </select>
                  {st.llmTier === "saphub" && (
                    <div className="mt-1 text-xs" style={{ color: MUTED }}>Billed as AI Units under the BTP contract — enter the $-equivalent rate for your agreement.</div>
                  )}
                </div>
                <NumRow label="Price / 1M input tokens" value={st.priceIn} setValue={(v) => setSt((s) => ({ ...s, priceIn: v, llmTier: "customRates" }))} step={0.25} prefix="$" />
                <NumRow label="Price / 1M output tokens" value={st.priceOut} setValue={(v) => setSt((s) => ({ ...s, priceOut: v, llmTier: "customRates" }))} step={0.5} prefix="$" />
                <NumRow label={`K tokens in / covered ${U}`} value={st.tokensInK} setValue={set("tokensInK")} step={10} />
                <NumRow label={`K tokens out / covered ${U}`} value={st.tokensOutK} setValue={set("tokensOutK")} step={5} />
                <SliderRow label="Agentic retry overhead" value={st.agentOverheadPct} setValue={set("agentOverheadPct")} min={0} max={200} suffix="%" hint="Multi-step loops & retries inflate tokens vs. a single pass" />
                <SliderRow label="Caching + batch discount" value={st.tokenDiscountPct} setValue={set("tokenDiscountPct")} min={0} max={70} suffix="%" hint="Prompt caching (−90% cached input) and batch runs (−50%)" />
                <div className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: NAVY }}>
                  <span className="text-xs font-bold" style={{ color: GOLD }}>AI TOKEN COST / COVERED {U.toUpperCase()} (t)</span>
                  <span className="text-sm font-extrabold tabular-nums text-white">{"$" + r.tokenPerUnit.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <NumRow label="Platform & tooling (P)" value={st.platformCost} setValue={set("platformCost")} step={5000} prefix="$" />
          </Section>

          <Section title="Step 3 · Pricing model">
            <div className="space-y-2">
              {MODELS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => set("pricingModel")(m.id)}
                  className="w-full rounded-lg border px-3 py-2 text-left transition"
                  style={{
                    borderColor: st.pricingModel === m.id ? GOLD : "#DCE4F0",
                    background: st.pricingModel === m.id ? "#FBF3E4" : "#fff",
                  }}
                >
                  <div className="text-sm font-bold" style={{ color: NAVY }}>{m.label}</div>
                  <div className="text-xs" style={{ color: MUTED }}>{m.note}</div>
                </button>
              ))}
            </div>
            {st.pricingModel === "premium" && (
              <SliderRow label="Rate premium" value={st.premiumPct} setValue={set("premiumPct")} min={0} max={50} suffix="%" />
            )}
            {st.pricingModel === "value" && (
              <>
                <SliderRow
                  label="Customer discount vs. traditional price (d)"
                  value={st.discountPct} setValue={set("discountPct")} min={0} max={50} step={0.5} suffix="%"
                  hint={`Breakeven floor d* = ${(r.breakevenDiscount * 100).toFixed(1)}% — beyond this, AI destroys value`}
                />
                <SliderRow
                  label="Published opening band (sales can sign up to)"
                  value={st.openingBandPct} setValue={set("openingBandPct")} min={0} max={40} step={0.5} suffix="%"
                  hint="Deal-desk policy: discounts inside the band need no approval"
                />
              </>
            )}
          </Section>
        </div>

        {/* ————— Outputs ————— */}
        <div className="space-y-5">
          {/* Baseline strip */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-bold tracking-widest" style={{ color: GOLDD }}>
              TRADITIONAL BASELINE (NO AI) · U × h × Rb
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                ["Revenue", fmt$(r.tradRevenue)],
                ["Cost", fmt$(r.tradCost)],
                ["Gross profit", fmt$(r.tradProfit)],
                ["Margin", fmtPct(r.tradMarginPct)],
                [`Price / ${U}`, fmt$full(r.tradPricePerUnit)],
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-lg font-extrabold tabular-nums" style={{ color: NAVY }}>{v}</div>
                  <div className="text-xs" style={{ color: MUTED }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected scenario */}
          <div>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-extrabold" style={{ color: NAVY }}>
                Selected scenario: {MODELS.find((m) => m.id === st.pricingModel).label}
              </h2>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  background: profitDelta >= 0 ? "#E6F1E9" : "#F9E7E6",
                  color: profitDelta >= 0 ? GREEN : RED,
                }}
              >
                Profit vs. traditional: {profitDelta >= 0 ? "+" : "−"}{fmt$(Math.abs(profitDelta))} ({fmtPct(Math.abs(profitDelta) / Math.max(r.tradProfit, 1))})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Kpi label="Revenue" value={fmt$(sel.revenue)} sub={`${fmt$full(sel.pricePerUnit)} per ${U}`} />
              <Kpi label="Cost of delivery" value={fmt$(sel.cost)} sub={`${Math.round(r.aiHours).toLocaleString()} hrs · ${fmt$(r.tokenCost)} tokens · ${fmt$(st.platformCost)} platform`} />
              <Kpi label="Gross profit" value={fmt$(sel.profit)} tone="dark" accent />
              <Kpi label="Gross margin" value={fmtPct(sel.marginPct)} tone="dark" />
              <Kpi label="Revenue per delivery hour" value={fmt$full(sel.revPerHour)} sub={`vs. $${st.billRate} traditional — the north-star metric`} />
              <Kpi label="Customer saves" value={sel.customerSavings > 0 ? fmt$(sel.customerSavings) : "$0"} sub={sel.customerSavings > 0 ? fmtPct(sel.customerSavings / r.tradRevenue) + " below traditional price" : "No saving vs. traditional"} />
              <Kpi label="Effort with AI" value={`${Math.round(r.aiHours).toLocaleString()} hrs`} sub={`−${fmtPct(1 - r.aiHours / Math.max(r.tradHours, 1))} vs. ${Math.round(r.tradHours).toLocaleString()} hrs`} />
              <Kpi label="Delivery duration" value={`${r.aiMonths.toFixed(1)} mo`} sub={`vs. ${r.tradMonths.toFixed(1)} mo traditional at ${st.teamFtes} FTE`} />
              <Kpi label={`AI cost per ${U}`} value={fmt$full(r.aiCostPerUnit)} sub={`vs. ${fmt$full(r.tradCost / Math.max(r.unitsInScope, 1))} traditional`} />
            </div>
            {st.pricingModel === "value" && (() => {
              const d = st.discountPct / 100, band = st.openingBandPct / 100, floor = r.breakevenDiscount;
              const state = d > floor ? 2 : d > Math.min(band, floor) ? 1 : 0;
              const cfg = [
                { bg: "#E6F1E9", fg: GREEN, title: "WITHIN PUBLISHED BAND", msg: "Sales can sign — attach this simulation to the quote and log the deal parameters." },
                { bg: "#FBF3E4", fg: GOLDD, title: "EXCEPTION — DEAL DESK APPROVAL REQUIRED", msg: `Discount is above the ${st.openingBandPct}% band but still under the ${(floor * 100).toFixed(1)}% breakeven floor. Route to the deal desk with the strategic rationale.` },
                { bg: "#F9E7E6", fg: RED, title: "BLOCKED — BELOW BREAKEVEN FLOOR", msg: `At d = ${st.discountPct}% this deal earns less than the traditional project (d* = ${(floor * 100).toFixed(1)}%). Do not quote — tighten the gain-share or improve coverage/effort assumptions with data.` },
              ][state];
              return (
                <div className="mt-3 rounded-lg px-4 py-3" style={{ background: cfg.bg }}>
                  <div className="text-xs font-extrabold tracking-wider" style={{ color: cfg.fg }}>DEAL GOVERNANCE · {cfg.title}</div>
                  <div className="mt-1 text-sm" style={{ color: SLATE }}>{cfg.msg}</div>
                </div>
              );
            })()}
          </div>

          {/* Scenario comparison */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Same engagement, four pricing choices</div>
            <div className="mb-2 text-xs" style={{ color: MUTED }}>All AI scenarios share the same cost of delivery — only the pricing logic changes.</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={compareData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: SLATE }} interval={0} />
                <YAxis tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <Tooltip formatter={(v) => fmt$full(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="#7A93B8" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cost of delivery" fill={NAVY2} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Gross profit" radius={[3, 3, 0, 0]}>
                  {compareData.map((d, i) => (
                    <Cell key={i} fill={d["Gross profit"] >= r.tradProfit && i > 0 ? GOLD : i === 0 ? "#B9A26B" : RED} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gain-share curve */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-1 text-sm font-extrabold" style={{ color: NAVY }}>Gain-share curve — profit vs. customer discount (value pricing)</div>
            <div className="mb-2 text-xs" style={{ color: MUTED }}>
              The dashed line is today's traditional profit ({fmt$(r.tradProfit)}). Where the curve crosses it — d* = {(r.breakevenDiscount * 100).toFixed(1)}% — is the maximum discount before AI adoption erodes profit.
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={discountCurve} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E9F2" vertical={false} />
                <XAxis dataKey="discount" tickFormatter={(v) => v + "%"} tick={{ fontSize: 11, fill: MUTED }} label={{ value: "Customer discount vs. traditional price", position: "insideBottom", offset: -2, fontSize: 11, fill: SLATE }} height={40} />
                <YAxis tickFormatter={(v) => "$" + Math.round(v / 1000) + "K"} tick={{ fontSize: 11, fill: MUTED }} />
                <Tooltip formatter={(v) => fmt$full(v)} labelFormatter={(l) => "Discount: " + l + "%"} />
                <ReferenceLine y={r.tradProfit} stroke={GOLDD} strokeDasharray="6 4" strokeWidth={2} />
                {r.breakevenDiscount > 0 && r.breakevenDiscount < 0.5 && (
                  <ReferenceLine x={Math.round(r.breakevenDiscount * 100 * 2) / 2} stroke={RED} strokeDasharray="4 4" />
                )}
                {st.pricingModel === "value" && <ReferenceLine x={st.discountPct} stroke={NAVY} strokeWidth={2} />}
                <Line type="monotone" dataKey="Gross profit (value pricing)" stroke={GOLD} strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-1 flex flex-wrap gap-4 text-xs" style={{ color: MUTED }}>
              <span><span style={{ color: GOLDD }}>▬ ▬</span> Traditional profit floor</span>
              <span><span style={{ color: RED }}>▬ ▬</span> Breakeven discount d*</span>
              {st.pricingModel === "value" && <span><span style={{ color: NAVY }}>▬</span> Your current discount d</span>}
            </div>
          </div>

          <div className="rounded-xl p-4 text-sm" style={{ background: ICE, color: SLATE }}>
            <span className="font-bold" style={{ color: NAVY }}>How to read this: </span>
            the model is identical for every offering — only the unit of work and parameters change. Price against the customer's alternative cost (the traditional baseline), deliver at the AI-enabled cost, and use the gain-share slider to decide how the spread is split. If gross profit isn't at or above the dashed floor, the deal isn't ready to quote. {cap(Up)} are the quoting language; hours are internal math only. LLM list prices reprice several times a year — refresh the token assumptions quarterly and keep model-price volatility inside the platform line, never in the customer's unit price.
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
