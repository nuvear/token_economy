// Help & training — mockup: design/mockups/DealSpine Help.dc.html.
// Static content ported from the reference calculator's Help view
// (AI-SAP-Pricing-Calculator.jsx → HelpView): the three-sentence idea,
// the variables table, the worked example, the sales/delivery rules, the
// Japan/offshore scenario, and "where everything lives" — behind a search
// filter. Article bodies are EN-authored reference copy (pilot).
import { useMemo, useState } from "react";
import { useUi } from "../shell/Shell";
import { color, radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { Card, PageHeader, navyPanelStyle } from "./parts/ui";

// ——— Content (verbatim port from the calculator Help view) ———

const VARS: { k: string; label: string; example: string }[] = [
  { k: "U", label: "How many units of work are in scope", example: "3,600 objects to remediate" },
  { k: "h", label: "Hours one unit used to take a human", example: "3.5 hrs per object" },
  { k: "Rb", label: "What we billed per hour (old world)", example: "$95/hr" },
  { k: "Rc", label: "What an hour of delivery costs us", example: "$62/hr loaded" },
  { k: "c", label: "Share of units AI can handle", example: "85% — measured, never assumed" },
  { k: "e", label: "Effort saved on an AI-handled unit", example: "70% less human time" },
  { k: "q", label: "Senior review added back", example: "10% of the hours saved" },
  { k: "t", label: "Token (AI usage) cost per covered unit", example: "≈ $1.50 — tiny next to labor" },
  { k: "P", label: "Platform & tooling per engagement", example: "$25K" },
  { k: "d", label: "Discount the customer sees vs. their alternative", example: "25% in the case example" },
  { k: "d*", label: "Maximum discount before we earn less than the old world", example: "32.5% naive · ~12.5% after risk — confidential" },
];

const STEPS: [string, string][] = [
  ["1 · Count the work", "12,000 custom objects in the estate; an ATC scan says 30% need remediation. U = 3,600 objects. Each traditionally takes h = 3.5 hours."],
  ["2 · Price the old way (in your head only)", "3,600 × 3.5 hrs × $95 bill rate = $1,197K revenue. It costs 12,600 hrs × $62 = $781K. Gross profit $416K — the number the whole framework exists to protect."],
  ["3 · Re-cost the work with AI", "AI handles 85% of objects (c) and cuts effort 70% on those (e); seniors review the output, adding back 10% of the saved hours (q). Delivery drops to 5,853 hrs. Add ~$1.50 of tokens per covered object and $25K of platform: total AI cost ≈ $392K."],
  ["4 · Find the savings pool", "$781K old cost − $392K new cost = $389K. This pool is the whole game. It can go to the customer (discount), to you (margin), or into your platform (reinvestment) — Step 5 decides the split."],
  ["5 · Pick a price the customer loves and the CFO signs", "Offer the same scope at 25% below the traditional price: $898K fixed, $249 per object. The customer saves $299K and finishes months earlier. You still make $505K gross profit — more than the $416K you were protecting."],
  ["6 · Let the calculator police it", "The risk page loads rework, warranty, evidence and commercial reserves on top of the base cost, then computes the real maximum discount. If a rep drags the slider past it, the deal shows BLOCKED and routes to the deal desk. That is not a bug — that is the product."],
];

const SALES_RULES: [string, string][] = [
  ["1 · Quote units, never hours.", "The customer buys 3,600 finished objects at $249 each — hours are internal math. If you quote hours, AI productivity becomes their discount, not our margin."],
  ["2 · Anchor on their alternative, not our rate card.", "“What would this cost you with your incumbent / internal team / a competing bid?” Get evidence for it; enter it in the anchor block. Savings claims are computed against that."],
  ["3 · Know the floor; never disclose it.", "The published band (e.g. 20–30%) is what you may offer. The real floor lives in this tool and in the deal desk. It never appears in a proposal, an email, or a bar conversation."],
  ["4 · Sell the protections, not the price.", "Fixed price, {n}-month funded warranty, senior review on every AI-touched unit, symmetric mix true-up, their own delivery telemetry at closeout. This is what an AI-native discounter cannot match."],
  ["5 · A rival bid is a process, not a panic.", "Get the bid verified, set deal context to Contested, and let the defense floor tell the deal desk what is defensible. Matching an unverified number is how the margin dies."],
];

const DELIVERY_RULES: [string, string][] = [
  ["Log every unit", "in the delivery workbook: who/what handled it, AI vs. human vs. review minutes, first-pass result, rework minutes and cause, tokens in/out, model and config version. One row per unit — it takes a minute and it is what makes the next quote defensible."],
  ["Respect the quality gate.", "100% senior review of AI output until rework is sustainably below 2%. Rework is booked to the project, not hidden — the warranty the customer signed is priced from your logged rates."],
  ["Bump the config version", "whenever the model, prompts or agent toolchain changes — the evidence counters restart, because last quarter's numbers do not describe this quarter's stack."],
  ["Estimate in units and classes,", "not person-days. Simple / medium / complex is the language of the quote, the log and the invoice."],
];

const SCENARIO_ROWS: [string, string, string, string, string, string, string][] = [
  ["Traditional", "7,000", "30 / 70%", "$55.50", "$388.5K", "$735K", "$346.5K"],
  ["AI-enabled", "3,252", "45 / 55%", "$68.25", "$244.4K", "$624.8K (−15%)", "$380.3K"],
];

const SCENARIO_TILES: [string, string][] = [
  ["Follow the sun", "Chennai/Dalian run the AI batch overnight (JST −3.5h / −1h); Tokyo reviews and walks the customer through results the same business day. The cycle-time win is part of the price."],
  ["Quality is the pitch", "Japanese enterprise buyers weight warranty, review discipline and evidence heavily — the funded warranty, jointly-signed classification and telemetry extract are the sale, not an appendix."],
  ["Set it up in the tool", "Turn on role-level labor rates in the risk view, set the on/offshore mix and rates, and let the floor recompute. Never quote a cross-geo deal off the single blended rate."],
];

const LIVES_TILES: [string, string][] = [
  ["Deal Workspace", "The deal cockpit: baseline, AI cost, pricing model, discount, governance banner, charts. Start every simulation here."],
  ["Policy Studio", "The grown-ups' page: floors, complexity tiers, labor roles, rework & warranty reserves, token routing, contested-bid inputs, the policy gates."],
  ["Proposal (customer view)", "What the customer sees: fixed price, savings vs. their validated alternative, warranty and data-rights commitments. No cost stack, ever."],
  ["Portfolio", "Every saved quote rolls up here — revenue vs. floors, profit vs. traditional, reinvestment funded."],
];

interface Section {
  id: string;
  title: { en: string; ja: string };
  searchText: string;
}

const SECTIONS: Section[] = [
  {
    id: "idea",
    title: { en: "The whole idea in three sentences", ja: "全体像を3文で" },
    searchText: "idea hours units finished work fixed price discount margin reinvestment split three sentences",
  },
  {
    id: "vars",
    title: { en: "The variables, for humans (case-example values in grey)", ja: "変数を、人間の言葉で（灰色は事例値）" },
    searchText: "variables " + VARS.map((v) => `${v.k} ${v.label} ${v.example}`).join(" "),
  },
  {
    id: "worked",
    title: { en: "Worked example — custom code remediation, start to finish", ja: "ワークド・イグザンプル — カスタムコード改修を最初から最後まで" },
    searchText: "worked example remediation " + STEPS.map((s) => s.join(" ")).join(" "),
  },
  {
    id: "sales",
    title: { en: "For sales — the five rules", ja: "営業向け — 5つのルール" },
    searchText: "sales five rules " + SALES_RULES.map((s) => s.join(" ")).join(" "),
  },
  {
    id: "delivery",
    title: { en: "For delivery — you are the evidence engine", ja: "デリバリー向け — あなたがエビデンスエンジン" },
    searchText: "delivery evidence engine workbook " + DELIVERY_RULES.map((s) => s.join(" ")).join(" "),
  },
  {
    id: "japan",
    title: {
      en: "Scenario — onsite Japan, offshore India/China (why role-level rates matter)",
      ja: "シナリオ — 日本オンサイト × インド/中国オフショア（ロール別レートが重要な理由）",
    },
    searchText:
      "japan offshore india china tokyo chennai dalian onsite role-level rates blended pyramid 2000 objects follow the sun quality pitch " +
      SCENARIO_TILES.map((s) => s.join(" ")).join(" "),
  },
  {
    id: "lives",
    title: { en: "Where everything lives", ja: "どこに何があるか" },
    searchText: "where everything lives golden rule policy workbook " + LIVES_TILES.map((s) => s.join(" ")).join(" "),
  },
];

// ——— Small solid building blocks ———

function TileGrid({ tiles, cols }: { tiles: [string, string][]; cols: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(${cols === 3 ? 180 : 220}px, 1fr))`,
        gap: 8,
        marginTop: 10,
      }}
    >
      {tiles.map(([t, d]) => (
        <div key={t} style={{ borderRadius: 10, padding: 12, background: "var(--surface-alt)" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{t}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.55 }}>{d}</div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{children}</div>;
}

export default function Help() {
  const { locale } = useUi();
  const ja = locale === "ja";
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return new Set(SECTIONS.map((s) => s.id));
    return new Set(
      SECTIONS.filter(
        (s) =>
          s.title.en.toLowerCase().includes(q) ||
          s.title.ja.includes(q) ||
          s.searchText.toLowerCase().includes(q),
      ).map((s) => s.id),
    );
  }, [query]);

  const show = (id: string) => visible.has(id);

  return (
    <div style={{ maxWidth: 960 }}>
      <PageHeader
        locale={locale}
        kicker={lt("help.kicker", locale)}
        title={lt("help.headline", locale)}
        sub={ja ? lt("help.ja_note", locale) : undefined}
      />

      {/* Search — solid pill */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={lt("help.search_ph", locale)}
        aria-label={lt("help.search_ph", locale)}
        style={{
          font: "inherit",
          fontSize: 13.5,
          width: "100%",
          maxWidth: 520,
          padding: "11px 18px",
          borderRadius: radius.pill,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          color: "var(--ink)",
          marginBottom: 20,
        }}
      />

      {visible.size === 0 && (
        <Card>
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>{lt("help.no_results", locale)}</p>
        </Card>
      )}

      <div style={{ display: "grid", gap: 16 }}>
        {/* The whole idea — navy hero */}
        {show("idea") && (
          <section style={{ ...navyPanelStyle, padding: "24px 26px" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: ja ? "normal" : ".14em",
                textTransform: ja ? "none" : "uppercase",
                color: color.gold,
              }}
            >
              {ja ? "ヘルプ・トレーニング · まずはここから" : "HELP & TRAINING · START HERE"}
            </div>
            <h2 style={{ fontSize: 19, fontWeight: 800, color: "#fff", margin: "10px 0 8px" }}>
              {SECTIONS[0].title[locale]}
            </h2>
            <p style={{ fontSize: 13.5, color: color.ice, lineHeight: 1.7, margin: 0 }}>
              We used to sell <strong style={{ color: "#fff" }}>hours</strong> — so every hour AI saved was revenue we
              handed back. Now we sell <strong style={{ color: "#fff" }}>counted units of finished work</strong> (a
              remediated object, an automated test case) at a fixed price that is visibly cheaper than the customer's
              alternative. AI makes each unit much cheaper to deliver, and this platform decides — and enforces — how
              that saving is split between the customer's discount, our margin, and platform reinvestment.
            </p>
          </section>
        )}

        {/* Variables */}
        {show("vars") && (
          <Card>
            <SectionTitle>{SECTIONS[1].title[locale]}</SectionTitle>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: 8,
                marginTop: 12,
              }}
            >
              {VARS.map((v) => (
                <div
                  key={v.k}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    borderRadius: 10,
                    padding: "9px 12px",
                    background: "var(--surface-alt)",
                  }}
                >
                  <span
                    className="num"
                    style={{
                      marginTop: 2,
                      display: "inline-flex",
                      height: 27,
                      minWidth: 36,
                      flexShrink: 0,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 7,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#fff",
                      background: color.navy2,
                    }}
                  >
                    {v.k}
                  </span>
                  <span style={{ fontSize: 12.5 }}>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>{v.label}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                      {v.example}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Worked example */}
        {show("worked") && (
          <Card>
            <SectionTitle>{SECTIONS[2].title[locale]}</SectionTitle>
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              {STEPS.map(([t, d]) => (
                <div key={t} style={{ borderRadius: 10, padding: 12, background: "var(--surface-alt)" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{t}</div>
                  <div className="num" style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.55 }}>
                    {d}
                  </div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: 10,
                borderRadius: 8,
                padding: "9px 12px",
                fontSize: 11.5,
                background: "rgba(232,163,61,.14)",
                color: "var(--warn-ink)",
                lineHeight: 1.55,
              }}
            >
              Try it live: this is exactly the ★ Code Remediation offering. Open the Deal Workspace and move the
              discount — watch gross profit, the governance banner and the gain-share curve react.
            </div>
          </Card>
        )}

        {/* Sales + delivery rules */}
        {(show("sales") || show("delivery")) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {show("sales") && (
              <section style={{ ...navyPanelStyle, padding: "20px 22px" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: color.gold }}>{SECTIONS[3].title[locale]}</div>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {SALES_RULES.map(([t, d]) => (
                    <p key={t} style={{ margin: 0, fontSize: 12.5, color: color.ice, lineHeight: 1.6 }}>
                      <strong style={{ color: "#fff" }}>{t}</strong> {d}
                    </p>
                  ))}
                </div>
              </section>
            )}
            {show("delivery") && (
              <Card>
                <SectionTitle>{SECTIONS[4].title[locale]}</SectionTitle>
                <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                  {DELIVERY_RULES.map(([t, d]) => (
                    <p key={t} style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.6 }}>
                      <strong style={{ color: "var(--ink)" }}>{t}</strong> {d}
                    </p>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Japan / offshore scenario */}
        {show("japan") && (
          <Card>
            <SectionTitle>{SECTIONS[5].title[locale]}</SectionTitle>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65, margin: "10px 0 0" }}>
              A Japanese manufacturer needs <strong style={{ color: "var(--ink)" }}>2,000 objects</strong> remediated for
              S/4HANA. The team: an onsite Tokyo group (architect, senior reviewers, customer workshops — loaded ≈{" "}
              <strong style={{ color: "var(--ink)" }}>$115/hr</strong>) and an offshore delivery center in Chennai or
              Dalian (production ≈ <strong style={{ color: "var(--ink)" }}>$30/hr</strong>).
            </p>
            <div style={{ overflowX: "auto", marginTop: 12 }}>
              <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560 }}>
                <thead>
                  <tr>
                    {["", "Hours", "Mix on/offshore", "Blended cost/hr", "Cost", "Revenue", "Gross profit"].map(
                      (h, i) => (
                        <th
                          key={h || "row"}
                          style={{
                            textAlign: i === 0 ? "left" : "right",
                            padding: "7px 10px",
                            fontSize: 10.5,
                            color: "var(--muted)",
                            fontWeight: 700,
                            borderBottom: "2px solid var(--border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {SCENARIO_ROWS.map((row) => (
                    <tr key={row[0]} style={{ borderBottom: "1px solid var(--hairline)" }}>
                      {row.map((cell, i) => (
                        <td
                          key={i}
                          className="num"
                          style={{
                            textAlign: i === 0 ? "left" : "right",
                            padding: "8px 10px",
                            fontSize: 12,
                            fontWeight: i === 0 || i === row.length - 1 ? 700 : 500,
                            color: i === 0 ? "var(--ink)" : "var(--ink-2)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.65, margin: "12px 0 0" }}>
              Same c = 85% and e = 70% as the case example — but notice what AI does to the pyramid: offshore execution
              hours collapse, while onsite senior review <strong style={{ color: "var(--ink)" }}>grows</strong> as a
              share (30% → 45% of a much smaller total). The blended cost rate rises from $55.50 to $68.25, so the
              savings pool is $144K, not the $389K a single blended rate would suggest, and the naive floor tightens to
              d* ≈ 19.6%. A rep who offered "our usual 25%" here would be selling below cost recovery — which is exactly
              why the engine uses role-level rates and why this deal is quoted at 15%.
            </p>
            <TileGrid tiles={SCENARIO_TILES} cols={3} />
            <p style={{ fontSize: 11, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.5 }}>
              Illustrative rates: onsite Japan $115/hr and offshore $30/hr loaded; Japan-market blended bill rate
              $105/hr. Replace with your own rate card — the point is the mix shift, not the exact numbers.
            </p>
          </Card>
        )}

        {/* Where everything lives */}
        {show("lives") && (
          <Card>
            <SectionTitle>{SECTIONS[6].title[locale]}</SectionTitle>
            <TileGrid tiles={LIVES_TILES} cols={2} />
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "12px 0 0", lineHeight: 1.6 }}>
              Golden rule (from the operating-model deck): the deck sets policy, this platform enforces it per deal, and
              the delivery workbook keeps both honest. No engine run attached — no quote leaves the building.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
