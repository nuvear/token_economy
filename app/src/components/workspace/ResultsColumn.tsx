// Deal Workspace · Column B — live engine results: baseline strip, scenario
// KPI grid, four-choices comparison chart, gain-share curve.
// ALL numbers on solid surfaces; tabular numerals; Intl formatting.
import type { CSSProperties } from "react";
import { chartNavyOnDark, color } from "../../tokens";
import { fmtNumber, fmtPct, type Locale } from "../../i18n";
import { MODELS } from "../../engine";
import type { EngineResult, PresetInput, Scenario } from "../../engine";
import { Card, Kicker } from "./ui";
import { fill, tw } from "./strings";

const intl = (locale: Locale) => (locale === "ja" ? "ja-JP" : "en-US");

function money(v: number, locale: Locale): string {
  return new Intl.NumberFormat(intl(locale), {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

/** Compact currency (e.g. $1.2M) via Intl — locale-driven, never hand-built. */
function short(v: number, locale: Locale): string {
  return new Intl.NumberFormat(intl(locale), {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(v);
}

// ————— KPI tile —————

interface Kpi {
  label: string;
  value: string;
  sub: string;
  dark?: boolean;
  accent?: boolean;
}

function KpiTile({ k }: { k: Kpi }) {
  const style: CSSProperties = k.dark
    ? {
        borderRadius: 12,
        padding: 14,
        background: `linear-gradient(135deg, ${color.navy}, ${color.navy2})`,
        border: "1px solid var(--panel-border)",
      }
    : {
        borderRadius: 12,
        padding: 14,
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
      };
  return (
    <div style={style}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: k.dark ? color.gold : color.goldDeep,
        }}
      >
        {k.label}
      </div>
      <div
        style={{
          marginTop: 5,
          fontSize: 21,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color: k.accent ? color.gold : k.dark ? "#fff" : "var(--ink)",
        }}
      >
        {k.value}
      </div>
      {k.sub ? (
        <div style={{ marginTop: 4, fontSize: 11, color: k.dark ? color.ice : "var(--muted)" }}>{k.sub}</div>
      ) : null}
    </div>
  );
}

// ————— Gain-share curve (SVG, theme-aware via CSS vars) —————

function CurveChart(props: { result: EngineResult; input: PresetInput }) {
  const { result: r, input: st } = props;
  const W = 560;
  const H = 224;
  const pl = 52;
  const pr = 14;
  const pt = 16;
  const pb = 34;

  // Engine-consistent value-model profit at discount d:
  // gp(d) = A(1 - d)(1 - variableRate) - fixedRiskAdjustedCost
  const vr = st.applyRiskAdjustments ? r.projectVariableRate : 0;
  const gpAt = (d: number) =>
    Math.round(r.validatedAlternative * (1 - d / 100) * (1 - vr) - r.fixedRiskAdjustedCost);

  const pts: { d: number; gp: number }[] = [];
  for (let d = 0; d <= 50; d += 2.5) pts.push({ d, gp: gpAt(d) });
  const gps = pts.map((p) => p.gp).concat([Math.round(r.tradProfit)]);
  const mn = Math.min(...gps);
  const mx = Math.max(...gps);
  const xs = (d: number) => pl + (d / 50) * (W - pl - pr);
  const ys = (v: number) => pt + (1 - (v - mn) / Math.max(mx - mn, 1)) * (H - pt - pb);
  const line = pts
    .map((p, i) => (i ? "L" : "M") + xs(p.d).toFixed(1) + " " + ys(p.gp).toFixed(1))
    .join(" ");
  const dStar = r.riskBreakevenDiscount * 100;
  const dMax = r.maxSafeDiscount * 100;
  const cur = st.discountPct;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", maxWidth: "100%" }} role="img">
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
        const y = pt + f * (H - pt - pb);
        return <line key={`g${i}`} x1={pl} y1={y} x2={W - pr} y2={y} stroke="var(--hairline)" strokeWidth={1} />;
      })}
      {[0, 10, 20, 30, 40, 50].map((d) => (
        <text key={`x${d}`} x={xs(d)} y={H - 12} fontSize={10} fill="var(--muted)" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
          {d}%
        </text>
      ))}
      {/* Today's traditional profit — gold dashes */}
      <line x1={pl} y1={ys(r.tradProfit)} x2={W - pr} y2={ys(r.tradProfit)} stroke={color.goldDeep} strokeWidth={2} strokeDasharray="6 4" />
      {/* Risk breakeven d* — red dashes */}
      {dStar > 0 && dStar < 50 ? (
        <line x1={xs(dStar)} y1={pt} x2={xs(dStar)} y2={H - pb} stroke={color.red} strokeWidth={1.5} strokeDasharray="4 4" />
      ) : null}
      {/* Risk-adjusted max safe discount — green dashes */}
      {dMax > 0 && dMax < 50 ? (
        <line x1={xs(dMax)} y1={pt} x2={xs(dMax)} y2={H - pb} stroke={color.green} strokeWidth={1.5} strokeDasharray="4 4" />
      ) : null}
      {/* Current d — solid ink */}
      <line x1={xs(Math.min(cur, 50))} y1={pt} x2={xs(Math.min(cur, 50))} y2={H - pb} stroke="var(--ink)" strokeWidth={2} />
      <path d={line} fill="none" stroke={color.gold} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// ————— The column —————

export function ResultsColumn(props: { input: PresetInput; result: EngineResult; locale: Locale }) {
  const { input: st, result: r, locale } = props;
  const T = (k: Parameters<typeof tw>[0]) => tw(k, locale);
  const ja = locale === "ja";
  const sel = r.selected;

  const baselineStrip: [string, string][] = [
    [T("rev"), short(r.tradRevenue, locale)],
    [T("cost"), short(r.tradCost, locale)],
    [T("gp"), short(r.tradProfit, locale)],
    [T("margin"), fmtPct(r.tradMarginPct, locale)],
    [T("priceUnit"), money(r.tradPricePerUnit, locale)],
  ];

  const kpis: Kpi[] = [
    { label: T("rev"), value: short(sel.revenue, locale), sub: `${money(sel.pricePerUnit, locale)} ${T("perObj")}` },
    {
      label: T("cost"),
      value: short(sel.cost, locale),
      sub: `${fmtNumber(Math.round(r.deliveryHours), locale)} ${T("hoursShort")} · ${short(r.tokenCost, locale)} ${T("tokSuffix")}`,
    },
    { label: T("gp"), value: short(sel.profit, locale), sub: "", dark: true, accent: true },
    { label: T("margin"), value: fmtPct(sel.marginPct, locale), sub: "", dark: true },
    { label: T("revHr"), value: money(sel.revPerHour, locale), sub: fill(T("vsTradHr"), { "%b": String(st.billRate) }) },
    {
      label: T("saves"),
      value: short(sel.customerSavings, locale),
      sub: `${fmtPct(sel.customerSavings / Math.max(r.tradRevenue, 1), locale)} ${T("belowTrad")}`,
    },
    {
      label: T("aiEffort"),
      value: `${fmtNumber(Math.round(r.deliveryHours), locale)} ${T("hoursShort")}`,
      sub: `−${fmtPct(1 - r.deliveryHours / Math.max(r.tradHours, 1), locale)} vs ${fmtNumber(Math.round(r.tradHours), locale)} ${T("hoursShort")}`,
    },
    {
      label: T("duration"),
      value: `${r.aiMonths.toFixed(1)} ${T("monthsShort")}`,
      sub: fill(T("vsMonths"), { "%m": r.tradMonths.toFixed(1) }),
    },
  ];

  // Four-choices comparison bars
  const scen: [string, Scenario | null, number, number, number][] = [
    [ja ? "従来型" : "Traditional", null, r.tradRevenue, r.tradCost, r.tradProfit],
    ["AI + T&M", r.tm, r.tm.revenue, r.tm.cost, r.tm.profit],
    [ja ? "AI + プレミアム" : "AI + Premium", r.premium, r.premium.revenue, r.premium.cost, r.premium.profit],
    [`AI + ${ja ? "バリュー" : "Value"} −${st.discountPct}%`, r.value, r.value.revenue, r.value.cost, r.value.profit],
  ];
  const mxv = Math.max(...scen.flatMap((s) => [s[2], s[3], s[4]]), 1);
  const barH = (v: number) => Math.max(2, (v / mxv) * 150);
  const barRev = chartNavyOnDark.barAlt; // #5A72A4 — reads on light and dark
  const barCost = chartNavyOnDark.bar; // #3A5F94

  const selectedModelLabel = ja
    ? { tm: "T&M パススルー", premium: "プレミアム T&M", value: "オブジェクト単位バリュー価格", subscription: "サブスクリプション" }[st.pricingModel]
    : (MODELS.find((m) => m.id === st.pricingModel)?.label ?? st.pricingModel);

  const delta = sel.profit - r.tradProfit;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
      {/* Baseline strip */}
      <Card>
        <Kicker locale={locale}>{T("baseline")}</Kicker>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {baselineStrip.map(([label, value]) => (
            <div key={label}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                {value}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected scenario header + delta pill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--ink)" }}>
          {T("selectedPrefix")}
          {selectedModelLabel}
        </h2>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            padding: "5px 12px",
            borderRadius: 99,
            fontVariantNumeric: "tabular-nums",
            background: delta >= 0 ? "rgba(78,138,90,.16)" : "rgba(192,80,77,.16)",
            color: delta >= 0 ? "var(--pass-ink)" : color.red,
          }}
        >
          {(delta >= 0 ? "▲ " : "▼ ") + short(Math.abs(delta), locale) + " " + T("vsTraditional")}
        </span>
      </div>

      {/* KPI grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))", gap: 12 }}>
        {kpis.map((k) => (
          <KpiTile key={k.label} k={k} />
        ))}
      </div>

      {/* Comparison chart */}
      <Card>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>{T("fourChoices")}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{T("fourChoicesSub")}</div>
        <div style={{ display: "flex", gap: 18, alignItems: "flex-end", height: 190, marginTop: 18, padding: "0 4px" }}>
          {scen.map(([name, s, rev, cost, profit], i) => {
            const gpColor = i === 0 ? "#B9A26B" : profit >= r.tradProfit ? color.gold : color.red;
            const bars: [string, number, string][] = [
              [`${T("rev")}: ${money(rev, locale)}`, rev, barRev],
              [`${T("cost")}: ${money(cost, locale)}`, cost, barCost],
              [`${T("gp")}: ${money(profit, locale)}`, profit, gpColor],
            ];
            return (
              <div
                key={name}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}
              >
                <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 150 }}>
                  {bars.map(([title, v, bg]) => (
                    <div
                      key={title}
                      title={title}
                      style={{ width: 14, borderRadius: "3px 3px 0 0", background: bg, height: barH(Math.max(v, 0)) }}
                    />
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: "var(--ink-2)", textAlign: "center", lineHeight: 1.3, fontWeight: 600 }}>
                  {name}
                  {s && s.model === sel.model ? " ●" : ""}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
          {(
            [
              [T("rev"), barRev],
              [T("cost"), barCost],
              [T("gp"), color.gold],
            ] as [string, string][]
          ).map(([label, c]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: c, display: "inline-block" }} />
              {label}
            </div>
          ))}
        </div>
      </Card>

      {/* Gain-share curve */}
      <Card>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>{T("gainShare")}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
          {fill(T("gainShareSub"), {
            "%p": short(r.tradProfit, locale),
            "%d": fmtPct(r.riskBreakevenDiscount, locale),
          })}
        </div>
        <div style={{ marginTop: 12 }}>
          <CurveChart result={r} input={st} />
        </div>
      </Card>
    </div>
  );
}
