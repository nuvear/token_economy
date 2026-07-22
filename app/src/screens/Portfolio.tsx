// Leadership analytics — mockup: design/mockups/DealSpine Portfolio.dc.html.
// Fed by GET /portfolio (server-side aggregation; sales sees own deals only).
// Charts are plain divs/SVG on SOLID surfaces, token colors only; numbers in
// tabular numerals. Dark-surface bars use chartNavyOnDark (design ruling).
import { useEffect, useState } from "react";
import { apiGet } from "../api";
import { useUi } from "../shell/Shell";
import { fmtNumber, fmtPct } from "../i18n";
import { chartNavyOnDark, color, radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { Card, Kicker, KpiTile, PageHeader, StateChip, navyPanelStyle, shortMoney } from "./parts/ui";

interface PortfolioLine {
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
interface PortfolioSummary {
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
  quotes: PortfolioLine[];
}

// Portfolio aggregates are engine outputs — USD (deal currency preserved
// per-quote elsewhere; the roll-up is dollar-denominated).
const CCY = "USD";

export default function Portfolio() {
  const { locale, user } = useUi();
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [scope, setScope] = useState<string>("all_deals");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    apiGet<{ scope: string; summary: PortfolioSummary }>("/portfolio")
      .then((r) => {
        setSummary(r.summary);
        setScope(r.scope);
      })
      .catch(() => setFailed(true));
  }, []);

  const header = (
    <PageHeader
      locale={locale}
      kicker={lt("portfolio.kicker", locale)}
      title={lt("portfolio.title", locale)}
      sub={
        summary
          ? `${scope === "own_deals" ? lt("portfolio.scope_own", locale) : lt("portfolio.scope_all", locale)} · ${fmtNumber(summary.quote_count, locale)} ${lt("portfolio.kpi_quotes", locale).toLowerCase()}`
          : undefined
      }
    />
  );

  if (failed) {
    return (
      <div style={{ maxWidth: 860 }}>
        {header}
        <Card>
          <p style={{ margin: 0, color: color.red, fontSize: 13 }}>{lt("portfolio.error", locale)}</p>
        </Card>
      </div>
    );
  }
  if (!summary) return <div style={{ maxWidth: 860 }}>{header}</div>;

  const priced = summary.quotes;
  const floorFraction = priced.length > 0 ? summary.quotes_at_or_above_floor / priced.length : 1;
  const maxRev = Math.max(1, ...priced.map((q) => Math.max(q.selected_revenue, q.required_revenue)));
  const maxBand = Math.max(1, ...summary.discount_distribution.map((b) => b.count));
  const reinvestTarget = Math.max(summary.total_reinvestment_funded, 1);

  if (priced.length === 0) {
    return (
      <div style={{ maxWidth: 860 }}>
        {header}
        <Card>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>
            {lt("portfolio.empty", locale)}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120 }}>
      {header}

      {/* KPI strip — solid tiles, tabular numerals */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 12,
        }}
      >
        <KpiTile
          label={lt("portfolio.kpi_quotes", locale)}
          value={fmtNumber(summary.quote_count, locale)}
        />
        <KpiTile
          label={lt("portfolio.kpi_revenue", locale)}
          value={shortMoney(summary.total_selected_revenue, CCY)}
        />
        <KpiTile
          label={lt("portfolio.kpi_floor", locale)}
          value={fmtPct(floorFraction, locale, 0)}
          sub={`${summary.quotes_at_or_above_floor} / ${priced.length}`}
          navy
          accent
        />
        <KpiTile
          label={lt("portfolio.kpi_gp_delta", locale)}
          value={`${summary.gp_delta_vs_traditional >= 0 ? "+" : ""}${shortMoney(summary.gp_delta_vs_traditional, CCY)}`}
          sub={lt("portfolio.kpi_gp_delta_sub", locale)}
        />
        <KpiTile
          label={lt("portfolio.kpi_reinvest", locale)}
          value={shortMoney(summary.total_reinvestment_funded, CCY)}
        />
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 16,
          marginTop: 16,
        }}
      >
        {/* Revenue vs floor — horizontal bars with a gold floor marker */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{lt("portfolio.rev_vs_floor", locale)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {lt("portfolio.rev_vs_floor_sub", locale)}
          </div>
          <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
            {priced.map((q) => {
              const below = !q.at_or_above_floor;
              const pct = (q.selected_revenue / maxRev) * 100;
              const fpct = (q.required_revenue / maxRev) * 100;
              return (
                <div key={q.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>
                      Q-{q.id} {q.title}
                    </span>
                    <span className="num" style={{ fontWeight: 700, color: below ? color.red : "var(--ink-2)" }}>
                      {shortMoney(q.selected_revenue, CCY)}
                    </span>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      height: 12,
                      borderRadius: 5,
                      background: "var(--track)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        height: "100%",
                        width: `${pct.toFixed(1)}%`,
                        background: below ? color.red : chartNavyOnDark.bar,
                        borderRadius: "5px 0 0 5px",
                      }}
                    />
                    <div
                      title={`${lt("portfolio.floor", locale)}: ${shortMoney(q.required_revenue, CCY)}`}
                      style={{
                        position: "absolute",
                        top: -2,
                        bottom: -2,
                        left: `${Math.min(99, fpct).toFixed(1)}%`,
                        width: 3,
                        borderRadius: 2,
                        background: color.gold,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, fontSize: 11, color: "var(--muted)", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: chartNavyOnDark.bar }} />
              {lt("portfolio.contracted", locale)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: color.gold }} />
              {lt("portfolio.floor", locale)}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: color.red }} />
              {lt("portfolio.below_floor", locale)}
            </span>
          </div>
        </Card>

        {/* Discount distribution — vertical band bars */}
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{lt("portfolio.disc_vs_band", locale)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {lt("portfolio.disc_vs_band_sub", locale)}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 14,
              height: 150,
              marginTop: 20,
              paddingBottom: 4,
              borderBottom: "1px solid var(--hairline)",
            }}
          >
            {summary.discount_distribution.map((b) => {
              const h = Math.max(4, (b.count / maxBand) * 120);
              return (
                <div key={b.band} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span className="num" style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
                    {b.count}
                  </span>
                  <div
                    style={{
                      width: "70%",
                      height: h,
                      borderRadius: "6px 6px 0 0",
                      background: b.count > 0 ? chartNavyOnDark.barAlt : "var(--track)",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 6 }}>
            {summary.discount_distribution.map((b) => (
              <div key={b.band} className="num" style={{ flex: 1, textAlign: "center", fontSize: 10.5, color: "var(--muted)" }}>
                {b.band}
              </div>
            ))}
          </div>

          {/* Governance states */}
          <div style={{ marginTop: 18, borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
            <Kicker locale={locale} style={{ fontSize: 10 }}>
              {lt("portfolio.governance", locale)}
            </Kicker>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {Object.entries(summary.governance_counts).map(([state, count]) => (
                <span key={state} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <StateChip state={state} label={`${state} · ${count}`} />
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Deals table — solid rows, tabular numerals */}
      <Kicker locale={locale} style={{ margin: "24px 0 10px" }}>
        {lt("portfolio.deals_table", locale)}
      </Kicker>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640 }}>
            <thead>
              <tr>
                {[
                  [lt("portfolio.col_deal", locale), "left"],
                  [lt("portfolio.col_state", locale), "center"],
                  [lt("portfolio.col_rev", locale), "right"],
                  [lt("portfolio.col_floor", locale), "right"],
                  [lt("portfolio.col_gp", locale), "right"],
                  [lt("portfolio.col_disc", locale), "right"],
                ].map(([label, align]) => (
                  <th
                    key={label}
                    style={{
                      textAlign: align as "left" | "right" | "center",
                      padding: "10px 14px",
                      background: "var(--th)",
                      color: "var(--ink)",
                      fontWeight: 700,
                      fontSize: 10.5,
                      letterSpacing: ".03em",
                      borderBottom: "2px solid var(--border)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priced.map((q, i) => (
                <tr
                  key={q.id}
                  style={{
                    background: i % 2 ? "var(--row-alt)" : "var(--row)",
                    borderBottom: "1px solid var(--hairline)",
                  }}
                >
                  <td style={{ padding: "10px 14px", fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>
                    Q-{q.id} {q.title}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <StateChip state={q.governance_state} />
                  </td>
                  <td className="num" style={{ padding: "10px 14px", textAlign: "right", fontSize: 12.5, color: "var(--ink)" }}>
                    {shortMoney(q.selected_revenue, CCY)}
                  </td>
                  <td className="num" style={{ padding: "10px 14px", textAlign: "right", fontSize: 12.5, color: q.at_or_above_floor ? "var(--muted)" : color.red }}>
                    {shortMoney(q.required_revenue, CCY)}
                  </td>
                  <td className="num" style={{ padding: "10px 14px", textAlign: "right", fontSize: 12.5, color: q.gross_profit < 0 ? color.red : "var(--ink)" }}>
                    {shortMoney(q.gross_profit, CCY)}
                  </td>
                  <td className="num" style={{ padding: "10px 14px", textAlign: "right", fontSize: 12.5, color: "var(--ink-2)" }}>
                    {fmtPct(q.discount_pct / 100, locale, 1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Reinvestment fund — navy panel */}
      <section style={{ ...navyPanelStyle, padding: "22px 26px", marginTop: 20, maxWidth: 560 }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -30,
            top: -30,
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,163,61,.22), transparent 70%)",
          }}
        />
        <div style={{ position: "relative" }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: locale === "ja" ? "normal" : ".14em",
              textTransform: locale === "ja" ? "none" : "uppercase",
              color: color.gold,
            }}
          >
            {lt("portfolio.reinvest_title", locale)}
          </div>
          <div className="num" style={{ fontSize: 27, fontWeight: 800, marginTop: 8 }}>
            {shortMoney(summary.total_reinvestment_funded, CCY)}
          </div>
          <div style={{ fontSize: 12, color: color.ice, marginTop: 4 }}>
            {lt("portfolio.reinvest_sub", locale)}
          </div>
          <div
            style={{
              marginTop: 14,
              height: 8,
              borderRadius: radius.pill,
              background: "rgba(255,255,255,.14)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (summary.total_reinvestment_funded / reinvestTarget) * 100).toFixed(0)}%`,
                background: `linear-gradient(90deg, ${color.gold}, ${color.goldDeep})`,
              }}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 11.5, color: color.ice }}>
            {lt("portfolio.deals_funding", locale)}:{" "}
            <span className="num" style={{ fontWeight: 800, color: "#fff" }}>
              {priced.filter((q) => q.reinvestment_funded > 0).length}
            </span>
            {user?.role === "sales" && ` · ${lt("portfolio.scope_own", locale)}`}
          </div>
        </div>
      </section>
    </div>
  );
}
