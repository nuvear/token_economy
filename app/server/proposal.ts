// Customer proposal renderer — floor-leakage-proof BY CONSTRUCTION.
//
// The renderers receive a CustomerView object that simply has no cost,
// margin, floor, rate, or discount fields: internal figures are excluded by
// the type, not by discipline (PRD §2 hard rule 1). Never add a field here
// without checking it against the proposal whitelist:
//   customer price · tier prices · savings vs validated alternative ·
//   timeline · warranty terms · mix tolerance · telemetry commitment ·
//   evidence grade.
import type { EngineResult, PresetInput } from "../src/engine";

export type ProposalLocale = "en" | "ja";

export interface CustomerView {
  quote_reference: string;
  offering_name: string;
  offering_tagline: string;
  unit: string;
  unit_plural: string;
  currency: string;
  units_in_scope: number;
  customer_price: number;
  price_per_unit: number;
  tier_prices: { label: string; price: number }[];
  validated_alternative: number;
  savings_vs_alternative: number;
  timeline_months: number;
  traditional_timeline_months: number;
  warranty_months: number;
  warranty_cap_pct: number;
  warranty_cycles: number;
  mix_tolerance_pct: number;
  telemetry_committed: boolean;
  evidence_grade: string;
  effective_date: string;
  quote_validity_days: number;
}

/** Build the whitelist object. Everything customer-visible passes through here. */
export function buildCustomerView(input: PresetInput, result: EngineResult): CustomerView {
  return {
    quote_reference: input.quoteId,
    offering_name: input.name,
    offering_tagline: input.tagline,
    unit: input.unit,
    unit_plural: input.unitPlural,
    currency: "USD",
    units_in_scope: result.unitsInScope,
    customer_price: result.selected.revenue,
    price_per_unit: result.selected.pricePerUnit,
    tier_prices: (input.complexityTiers ?? []).map((t) => ({
      label: t.label,
      price: t.publishedPrice,
    })),
    validated_alternative: result.validatedAlternative,
    savings_vs_alternative: result.selected.customerSavings,
    timeline_months: result.aiMonths,
    traditional_timeline_months: result.tradMonths,
    warranty_months: Number(input.warrantyMonths) || 0,
    warranty_cap_pct: Number(input.warrantyCapPct) || 0,
    warranty_cycles: Number(input.warrantyCycles) || 0,
    mix_tolerance_pct: Number(input.complexityMixTolerancePct) || 0,
    telemetry_committed: true,
    evidence_grade: input.evidenceGrade,
    effective_date: input.effectiveDate,
    quote_validity_days: Number(input.quoteValidityDays) || 30,
  };
}

const money = (v: number, locale: ProposalLocale, currency: string): string =>
  new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(v));

const num = (v: number, locale: ProposalLocale): string =>
  new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US").format(v);

const months = (v: number, locale: ProposalLocale): string =>
  locale === "ja" ? `約${v.toFixed(1)}ヶ月` : `approx. ${v.toFixed(1)} months`;

interface ProposalStrings {
  title: (v: CustomerView) => string;
  intro: (v: CustomerView) => string;
  price_heading: string;
  price_line: (v: CustomerView) => string;
  per_unit_line: (v: CustomerView) => string;
  tiers_heading: string;
  tier_col_class: string;
  tier_col_price: string;
  savings_heading: string;
  savings_line: (v: CustomerView) => string;
  timeline_heading: string;
  timeline_line: (v: CustomerView) => string;
  warranty_heading: string;
  warranty_line: (v: CustomerView) => string;
  mix_heading: string;
  mix_line: (v: CustomerView) => string;
  telemetry_heading: string;
  telemetry_line: string;
  evidence_heading: string;
  evidence_line: (v: CustomerView) => string;
  validity_line: (v: CustomerView) => string;
}

const STRINGS: Record<ProposalLocale, ProposalStrings> = {
  en: {
    title: (v) => `Proposal — ${v.offering_name}`,
    intro: (v) =>
      `Scope: ${num(v.units_in_scope, "en")} ${v.unit_plural}. ${v.offering_tagline}.`,
    price_heading: "Your investment",
    price_line: (v) =>
      `Total engagement price: **${money(v.customer_price, "en", v.currency)}**.`,
    per_unit_line: (v) =>
      `Effective price per ${v.unit}: ${money(v.price_per_unit, "en", v.currency)}.`,
    tiers_heading: "Published tier rate card",
    tier_col_class: "Complexity class",
    tier_col_price: `Price per unit`,
    savings_heading: "Savings versus your validated alternative",
    savings_line: (v) =>
      `Against the validated alternative of ${money(v.validated_alternative, "en", v.currency)}, this proposal saves you **${money(v.savings_vs_alternative, "en", v.currency)}**.`,
    timeline_heading: "Timeline",
    timeline_line: (v) =>
      `Delivery in ${months(v.timeline_months, "en")}, versus ${months(v.traditional_timeline_months, "en")} on a conventional plan.`,
    warranty_heading: "Warranty",
    warranty_line: (v) =>
      `${v.warranty_months}-month warranty, capped at ${v.warranty_cap_pct}% of the engagement price, covering up to ${v.warranty_cycles} correction cycles per ${v.unit}.`,
    mix_heading: "Class-mix tolerance",
    mix_line: (v) =>
      `The quoted price holds within a ±${v.mix_tolerance_pct}% shift of the complexity-class mix; beyond that, a symmetric true-up applies in either direction.`,
    telemetry_heading: "Telemetry commitment",
    telemetry_line:
      "We commit to delivering per-unit telemetry (throughput, first-pass acceptance, correction cycles) throughout the engagement and a closeout telemetry extract at completion.",
    evidence_heading: "Evidence grade",
    evidence_line: (v) =>
      `This quotation is calibrated on measured delivery evidence, grade: **${v.evidence_grade}**.`,
    validity_line: (v) =>
      `Reference ${v.quote_reference} · effective ${v.effective_date} · valid for ${v.quote_validity_days} days.`,
  },
  ja: {
    title: (v) => `ご提案書 — ${v.offering_name}`,
    intro: (v) => `対象範囲: ${num(v.units_in_scope, "ja")} ${v.unit_plural}。`,
    price_heading: "ご投資額",
    price_line: (v) =>
      `本エンゲージメントの総額: **${money(v.customer_price, "ja", v.currency)}**。`,
    per_unit_line: (v) =>
      `1 ${v.unit} あたりの実効価格: ${money(v.price_per_unit, "ja", v.currency)}。`,
    tiers_heading: "公表ティア料金表",
    tier_col_class: "複雑度クラス",
    tier_col_price: "単価",
    savings_heading: "検証済み代替案に対する節約額",
    savings_line: (v) =>
      `検証済み代替案 ${money(v.validated_alternative, "ja", v.currency)} に対し、本提案では **${money(v.savings_vs_alternative, "ja", v.currency)}** の節約となります。`,
    timeline_heading: "スケジュール",
    timeline_line: (v) =>
      `納期は${months(v.timeline_months, "ja")}(従来型では${months(v.traditional_timeline_months, "ja")})。`,
    warranty_heading: "保証",
    warranty_line: (v) =>
      `${v.warranty_months}ヶ月保証。上限はご契約額の${v.warranty_cap_pct}%、1 ${v.unit} あたり最大${v.warranty_cycles}回の修正サイクルを含みます。`,
    mix_heading: "クラス構成の許容範囲",
    mix_line: (v) =>
      `複雑度クラス構成が±${v.mix_tolerance_pct}%以内の変動であれば提示価格を維持します。それを超える場合は双方向の精算を適用します。`,
    telemetry_heading: "テレメトリのお約束",
    telemetry_line:
      "エンゲージメント期間を通じてユニット単位のテレメトリ(処理量、一次合格率、修正サイクル)を提供し、完了時にテレメトリ抜粋をお渡しします。",
    evidence_heading: "エビデンス等級",
    evidence_line: (v) => `本見積は実測データに基づき校正されています。等級: **${v.evidence_grade}**。`,
    validity_line: (v) =>
      `参照番号 ${v.quote_reference} · 発効日 ${v.effective_date} · 有効期間 ${v.quote_validity_days} 日。`,
  },
};

export function renderProposalMarkdown(view: CustomerView, locale: ProposalLocale): string {
  const s = STRINGS[locale];
  const lines: string[] = [];
  lines.push(`# ${s.title(view)}`);
  lines.push("");
  lines.push(s.intro(view));
  lines.push("");
  lines.push(`## ${s.price_heading}`);
  lines.push("");
  lines.push(s.price_line(view));
  lines.push("");
  lines.push(s.per_unit_line(view));
  lines.push("");
  if (view.tier_prices.length > 0) {
    lines.push(`## ${s.tiers_heading}`);
    lines.push("");
    lines.push(`| ${s.tier_col_class} | ${s.tier_col_price} |`);
    lines.push("| --- | ---: |");
    for (const t of view.tier_prices) {
      lines.push(`| ${t.label} | ${money(t.price, locale, view.currency)} |`);
    }
    lines.push("");
  }
  lines.push(`## ${s.savings_heading}`);
  lines.push("");
  lines.push(s.savings_line(view));
  lines.push("");
  lines.push(`## ${s.timeline_heading}`);
  lines.push("");
  lines.push(s.timeline_line(view));
  lines.push("");
  lines.push(`## ${s.warranty_heading}`);
  lines.push("");
  lines.push(s.warranty_line(view));
  lines.push("");
  lines.push(`## ${s.mix_heading}`);
  lines.push("");
  lines.push(s.mix_line(view));
  lines.push("");
  lines.push(`## ${s.telemetry_heading}`);
  lines.push("");
  lines.push(s.telemetry_line);
  lines.push("");
  lines.push(`## ${s.evidence_heading}`);
  lines.push("");
  lines.push(s.evidence_line(view));
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(s.validity_line(view));
  lines.push("");
  return lines.join("\n");
}

const escapeHtml = (t: string): string =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Minimal Markdown → HTML for the proposal document (headings, tables, hr, bold). */
export function renderProposalHtml(view: CustomerView, locale: ProposalLocale): string {
  const md = renderProposalMarkdown(view, locale);
  const body: string[] = [];
  const lines = md.split("\n");
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trim();
    const inline = (t: string): string =>
      escapeHtml(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    if (line.startsWith("| ")) {
      const cells = line.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.every((c) => /^-+:?$|^:?-+$/.test(c))) continue;
      if (!inTable) {
        body.push("<table>");
        inTable = true;
        body.push("<tr>" + cells.map((c) => `<th>${inline(c)}</th>`).join("") + "</tr>");
      } else {
        body.push("<tr>" + cells.map((c) => `<td>${inline(c)}</td>`).join("") + "</tr>");
      }
      continue;
    }
    if (inTable) {
      body.push("</table>");
      inTable = false;
    }
    if (line === "") continue;
    if (line === "---") body.push("<hr>");
    else if (line.startsWith("# ")) body.push(`<h1>${inline(line.slice(2))}</h1>`);
    else if (line.startsWith("## ")) body.push(`<h2>${inline(line.slice(3))}</h2>`);
    else body.push(`<p>${inline(line)}</p>`);
  }
  if (inTable) body.push("</table>");
  const lang = locale === "ja" ? "ja" : "en";
  return `<article lang="${lang}" class="dealspine-proposal">\n${body.join("\n")}\n</article>`;
}
