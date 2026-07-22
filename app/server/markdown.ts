// Markdown packaging helpers (PRD "Markdown-first"): the canonical
// as_markdown() renderings used by API responses, insight-run data scopes,
// and exports. One representation for the human and the LLM.
import type { Db } from "./db";
import { asMarkdownQuote } from "../src/engine";
import type { EngineResult, PresetInput } from "../src/engine";

export interface QuoteRow {
  id: number;
  offering_id: number;
  author_user_id: number;
  title: string;
  deal_currency: string;
  quote_stage: string;
  input_snapshot_json: string;
  outputs_json: string | null;
  engine_version: string;
  governance_state: string;
  created_at: string;
  updated_at: string;
}

export function getQuoteRow(db: Db, id: number): QuoteRow | undefined {
  return db.prepare("SELECT * FROM quotes WHERE id = ?").get(id) as QuoteRow | undefined;
}

export function parseQuote(row: QuoteRow): { input: PresetInput; result: EngineResult } {
  return {
    input: JSON.parse(row.input_snapshot_json) as PresetInput,
    result: JSON.parse(row.outputs_json ?? "null") as EngineResult,
  };
}

/** Canonical INTERNAL Markdown of a quote (contains floors + cost stack). */
export function quoteMarkdown(row: QuoteRow): string {
  const { input, result } = parseQuote(row);
  const header = [
    `<!-- dealspine quote_id=${row.id} governance_state=${row.governance_state} engine_version=${row.engine_version} -->`,
    "",
  ].join("\n");
  return header + asMarkdownQuote(input, result);
}

// ————— Portfolio summary (server-side replacement for the localStorage view) —————

export interface PortfolioQuoteLine {
  id: number;
  title: string;
  governance_state: string;
  selected_revenue: number;
  required_revenue: number;
  at_or_above_floor: boolean;
  gross_profit: number;
  traditional_gross_profit: number;
  discount_pct: number;
  reinvestment_funded: number;
}

export interface PortfolioSummary {
  quote_count: number;
  total_selected_revenue: number;
  total_required_revenue: number;
  quotes_at_or_above_floor: number;
  total_gross_profit: number;
  total_traditional_gross_profit: number;
  gp_delta_vs_traditional: number;
  total_reinvestment_funded: number;
  governance_counts: Record<string, number>;
  discount_distribution: { band: string; count: number }[];
  quotes: PortfolioQuoteLine[];
}

const DISCOUNT_BANDS: { band: string; lo: number; hi: number }[] = [
  { band: "0–5%", lo: 0, hi: 5 },
  { band: "5–10%", lo: 5, hi: 10 },
  { band: "10–15%", lo: 10, hi: 15 },
  { band: "15–20%", lo: 15, hi: 20 },
  { band: "20%+", lo: 20, hi: Infinity },
];

export function portfolioSummary(
  db: Db,
  opts: { authorUserId?: number } = {},
): PortfolioSummary {
  const rows = (
    opts.authorUserId !== undefined
      ? db.prepare("SELECT * FROM quotes WHERE author_user_id = ? ORDER BY id").all(opts.authorUserId)
      : db.prepare("SELECT * FROM quotes ORDER BY id").all()
  ) as QuoteRow[];

  const lines: PortfolioQuoteLine[] = [];
  for (const row of rows) {
    if (!row.outputs_json) continue;
    const { input, result } = parseQuote(row);
    lines.push({
      id: row.id,
      title: row.title,
      governance_state: row.governance_state,
      selected_revenue: result.selected.revenue,
      required_revenue: result.requiredRevenue,
      at_or_above_floor: result.selected.revenue >= result.requiredRevenue,
      gross_profit: result.selected.profit,
      traditional_gross_profit: result.tradProfit,
      discount_pct: Number(input.discountPct) || 0,
      reinvestment_funded: result.reinvestmentFunded,
    });
  }

  const governance_counts: Record<string, number> = {};
  for (const row of rows) {
    governance_counts[row.governance_state] = (governance_counts[row.governance_state] ?? 0) + 1;
  }

  const discount_distribution = DISCOUNT_BANDS.map((b) => ({
    band: b.band,
    count: lines.filter((l) => l.discount_pct >= b.lo && l.discount_pct < b.hi).length,
  }));

  const sum = (f: (l: PortfolioQuoteLine) => number): number =>
    lines.reduce((a, l) => a + f(l), 0);

  return {
    quote_count: rows.length,
    total_selected_revenue: sum((l) => l.selected_revenue),
    total_required_revenue: sum((l) => l.required_revenue),
    quotes_at_or_above_floor: lines.filter((l) => l.at_or_above_floor).length,
    total_gross_profit: sum((l) => l.gross_profit),
    total_traditional_gross_profit: sum((l) => l.traditional_gross_profit),
    gp_delta_vs_traditional: sum((l) => l.gross_profit - l.traditional_gross_profit),
    total_reinvestment_funded: sum((l) => l.reinvestment_funded),
    governance_counts,
    discount_distribution,
    quotes: lines,
  };
}

const usd = (v: number): string =>
  (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US");

/** as_markdown() for the portfolio — the insight-run packaging format. */
export function portfolioMarkdown(s: PortfolioSummary): string {
  const lines: string[] = [];
  lines.push("# Portfolio summary");
  lines.push("");
  lines.push("| Metric | Value |");
  lines.push("| --- | ---: |");
  lines.push(`| Quotes | ${s.quote_count} |`);
  lines.push(`| Selected revenue | ${usd(s.total_selected_revenue)} |`);
  lines.push(`| Required revenue (floors) | ${usd(s.total_required_revenue)} |`);
  lines.push(`| Quotes at/above floor | ${s.quotes_at_or_above_floor} / ${s.quotes.length} |`);
  lines.push(`| Gross profit (AI-delivered) | ${usd(s.total_gross_profit)} |`);
  lines.push(`| Gross profit (traditional) | ${usd(s.total_traditional_gross_profit)} |`);
  lines.push(`| GP delta vs traditional | ${usd(s.gp_delta_vs_traditional)} |`);
  lines.push(`| Platform reinvestment funded | ${usd(s.total_reinvestment_funded)} |`);
  lines.push("");
  lines.push("## Governance states");
  lines.push("");
  for (const [state, n] of Object.entries(s.governance_counts)) {
    lines.push(`- ${state}: ${n}`);
  }
  lines.push("");
  lines.push("## Discount distribution");
  lines.push("");
  for (const b of s.discount_distribution) {
    lines.push(`- ${b.band}: ${b.count}`);
  }
  lines.push("");
  lines.push("## Deals");
  lines.push("");
  lines.push("| Quote | State | Revenue | Floor | At/above floor | GP |");
  lines.push("| --- | --- | ---: | ---: | --- | ---: |");
  for (const l of s.quotes) {
    lines.push(
      `| #${l.id} ${l.title} | ${l.governance_state} | ${usd(l.selected_revenue)} | ${usd(l.required_revenue)} | ${l.at_or_above_floor ? "yes" : "NO"} | ${usd(l.gross_profit)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
