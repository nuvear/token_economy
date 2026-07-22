// Canonical Markdown rendering of a quote — the as_markdown() for the quote
// entity, used by insights packaging and exports. PURE: imports only from the
// engine directory.
//
// NOTE: this is the INTERNAL record (deal desk / pricing owner view). It
// contains floors and cost stack — it must never be pasted into a customer
// proposal. Proposal rendering (floor-leakage-gated) is a separate view.

import type { EngineResult, PresetInput, Scenario } from "./engine";
import { ENGINE_VERSION, MODELS } from "./engine";

const usd = (v: number): string =>
  (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");

const pctStr = (v: number): string =>
  Number.isFinite(v) ? (v * 100).toFixed(1) + "%" : "—";

const modelLabel = (id: string): string =>
  MODELS.find((m) => m.id === id)?.label ?? id;

export function asMarkdownQuote(input: PresetInput, result: EngineResult): string {
  const r = result;
  const lines: string[] = [];

  lines.push(`# Quote ${input.quoteId} — ${input.name}`);
  lines.push("");
  lines.push(`> ${input.tagline}`);
  lines.push("");
  lines.push(`- Engine version: ${ENGINE_VERSION}`);
  lines.push(`- Policy version: ${input.policyVersion} · Parameter set: ${input.parameterSetVersion} · Effective: ${input.effectiveDate}`);
  lines.push(`- Quote stage: ${input.quoteStage} · Deal context: ${input.dealContext} · Pricing model: ${modelLabel(input.pricingModel)}`);
  lines.push("");

  lines.push(`## Baseline (traditional delivery)`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Units in scope | ${r.unitsInScope.toLocaleString("en-US")} ${input.unitPlural} |`);
  lines.push(`| Traditional hours | ${Math.round(r.tradHours).toLocaleString("en-US")} |`);
  lines.push(`| Traditional revenue | ${usd(r.tradRevenue)} |`);
  lines.push(`| Traditional cost | ${usd(r.tradCost)} |`);
  lines.push(`| Traditional gross profit | ${usd(r.tradProfit)} (${pctStr(r.tradMarginPct)}) |`);
  lines.push(`| Validated alternative (anchor) | ${usd(r.validatedAlternative)}${r.anchorUnvalidated ? " — ANCHOR UNVALIDATED (clamped)" : ""} |`);
  lines.push("");

  lines.push(`## AI delivery economics`);
  lines.push("");
  lines.push(`| Metric | Value |`);
  lines.push(`| --- | ---: |`);
  lines.push(`| Delivery hours | ${Math.round(r.deliveryHours).toLocaleString("en-US")} |`);
  lines.push(`| Labor cost | ${usd(r.laborCost)} |`);
  lines.push(`| Token cost | ${usd(r.tokenCost)} (${usd(r.tokenPerUnit)} per covered ${input.unit}) |`);
  lines.push(`| Platform cost | ${usd(r.effectivePlatformCost)} |`);
  lines.push(`| Base AI cost | ${usd(r.baseAiCost)} |`);
  lines.push(`| Risk-adjusted cost (selected) | ${usd(r.selected.cost)} |`);
  lines.push(`| Required revenue (floor) | ${usd(r.requiredRevenue)} |`);
  lines.push(`| Max safe discount | ${pctStr(r.maxSafeDiscount)} (legacy naive floor ${pctStr(r.legacyBreakevenDiscount)}) |`);
  lines.push(`| Willingness-to-pay ceiling | ${Number.isFinite(r.willingnessCeiling) ? usd(r.willingnessCeiling) : "—"} |`);
  lines.push(`| Projected next-gen floor (d\\*) | ${pctStr(r.dStarProjected)} |`);
  lines.push(`| Platform reinvestment funded | ${usd(r.reinvestmentFunded)} |`);
  lines.push("");

  lines.push(`## Scenario KPIs`);
  lines.push("");
  lines.push(`| Scenario | Revenue | Cost | Gross profit | Margin | Price per ${input.unit} | GP per total hour |`);
  lines.push(`| --- | ---: | ---: | ---: | ---: | ---: | ---: |`);
  const scenarios: Scenario[] = [r.tm, r.premium, r.value, r.subscription];
  for (const s of scenarios) {
    const mark = s.model === r.selected.model ? " **(selected)**" : "";
    lines.push(
      `| ${modelLabel(s.model)}${mark} | ${usd(s.revenue)} | ${usd(s.cost)} | ${usd(s.profit)} | ${pctStr(s.marginPct)} | ${usd(s.pricePerUnit)} | ${usd(s.gpPerTotalHour)} |`,
    );
  }
  lines.push("");
  lines.push(`Customer savings vs. reference (selected): ${usd(r.selected.customerSavings)}.`);
  lines.push("");

  lines.push(`## Policy gates (${r.gates.length - r.hardFailures.length}/${r.gates.length} pass · ${r.hardFailures.length} hard failures · ${r.warnings.length} warnings)`);
  lines.push("");
  lines.push(`| Gate | Severity | Status |`);
  lines.push(`| --- | --- | --- |`);
  for (const g of r.gates) {
    const status = g.pass ? "PASS" : g.severity === "hard" ? "FAIL" : "WARNING";
    lines.push(`| ${g.label} | ${g.severity} | ${status} |`);
  }
  lines.push("");

  lines.push(`## Governance verdict`);
  lines.push("");
  lines.push(`**${r.governance.title}** (level ${r.governance.level})`);
  lines.push("");
  lines.push(r.governance.message);
  if (r.governance.override) {
    lines.push("");
    lines.push(`Override rationale: ${input.overrideRationale}`);
  }
  lines.push("");

  return lines.join("\n");
}
