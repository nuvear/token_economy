// Role-aware hub — mockup: design/mockups/DealSpine Home.dc.html.
// Switches on me.role (§2: pricing_owner / sales / deal_desk / delivery /
// leadership) and deep-links into the shell routes. Hero metric + work cards
// are fed live from the portfolio API where cheap; copy follows the mockup.
import { useEffect, useMemo, useState } from "react";
import { apiGet, type Role } from "../api";
import { useUi } from "../shell/Shell";
import { fmtDate, type Locale } from "../i18n";
import { color, radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { Card, Kicker, navyPanelStyle, shortMoney } from "./parts/ui";

// ——— Portfolio API shape (read-only slice we need) ———
interface PortfolioLine {
  id: number;
  title: string;
  governance_state: string;
  selected_revenue: number;
  required_revenue: number;
  at_or_above_floor: boolean;
}
interface PortfolioSummary {
  quote_count: number;
  total_selected_revenue: number;
  quotes_at_or_above_floor: number;
  gp_delta_vs_traditional: number;
  total_reinvestment_funded: number;
  governance_counts: Record<string, number>;
  quotes: PortfolioLine[];
}

type Tint = "neutral" | "gold" | "green" | "red";
type Tone = "red" | "gold" | "green";
interface Bi {
  en: string;
  ja: string;
}
interface RoleContent {
  hero: { kicker: Bi; metric: Bi; sub: Bi };
  ctas: { label: Bi; route: string; primary?: boolean }[];
  cards: { label: Bi; value: string; sub: Bi; tint: Tint; route: string }[];
}

const bi = (en: string, ja: string): Bi => ({ en, ja });

function buildContent(role: Role, s: PortfolioSummary | null): RoleContent {
  const priced = s?.quotes ?? [];
  const rev = s ? shortMoney(s.total_selected_revenue, "USD") : "—";
  const n = s?.quote_count ?? 0;
  const pending = s?.governance_counts["warning"] ?? 0;
  const blocked = s?.governance_counts["blocked"] ?? 0;
  const green = s?.governance_counts["green"] ?? 0;
  const holding = pending + blocked;
  const floorPct =
    priced.length > 0
      ? `${Math.round(((s?.quotes_at_or_above_floor ?? 0) / priced.length) * 100)}%`
      : "—";
  const gpDelta = s ? `+${shortMoney(Math.max(0, s.gp_delta_vs_traditional), "USD")}` : "—";
  const reinvest = s ? shortMoney(s.total_reinvestment_funded, "USD") : "—";

  switch (role) {
    case "sales":
      return {
        hero: {
          kicker: bi("IN FLIGHT", "進行中"),
          metric: bi(`${n} deals in flight · ${rev}`, `進行中${n}案件 · ${rev}`),
          sub: bi(
            "Your pipeline this quarter, priced against the published bands.",
            "公開バンドに基づいて価格設定された今四半期のパイプライン。",
          ),
        },
        ctas: [
          { label: bi("Start a new deal", "新規案件を作成"), route: "deal", primary: true },
          { label: bi("Preview a proposal", "提案書をプレビュー"), route: "proposal" },
        ],
        cards: [
          { label: bi("My deals", "担当案件"), value: String(n), sub: bi(`${green} green · ${holding} in review`, `グリーン${green} · 審査中${holding}`), tint: "neutral", route: "deal" },
          { label: bi("Awaiting review", "審査待ち"), value: String(holding), sub: bi("with the deal desk", "ディールデスク審査中"), tint: holding > 0 ? "gold" : "green", route: "approvals" },
          { label: bi("Customer-ready", "顧客送付可"), value: String(green), sub: bi("green — cleared to send", "グリーン — 送付可能"), tint: "green", route: "proposal" },
          { label: bi("Pipeline revenue", "パイプライン売上"), value: rev, sub: bi("selected prices, your deals", "選択価格・担当案件"), tint: "neutral", route: "portfolio" },
        ],
      };
    case "deal_desk":
      return {
        hero: {
          kicker: bi("APPROVAL QUEUE", "承認キュー"),
          metric: bi(`${holding} deals holding · ${rev} priced`, `保留${holding}案件 · 価格計算済み ${rev}`),
          sub: bi(
            "Deals holding for a governance decision from the desk.",
            "デスクのガバナンス判断を待っている案件。",
          ),
        },
        ctas: [
          { label: bi("Open approvals queue", "承認キューを開く"), route: "approvals", primary: true },
          { label: bi("Review policy bands", "ポリシーバンドを確認"), route: "policy" },
        ],
        cards: [
          { label: bi("Pending review", "承認待ち"), value: String(holding), sub: bi(`${blocked} blocked below floor`, `フロア未満のブロック${blocked}件`), tint: holding > 0 ? "gold" : "green", route: "approvals" },
          { label: bi("Blocked", "ブロック"), value: String(blocked), sub: bi("hard-gated by the engine", "エンジンによるハードゲート"), tint: blocked > 0 ? "red" : "green", route: "approvals" },
          { label: bi("Green quotes", "グリーン見積"), value: String(green), sub: bi("no desk action needed", "デスク対応不要"), tint: "green", route: "deal" },
          { label: bi("Floor adherence", "フロア遵守"), value: floorPct, sub: bi("across priced quotes", "価格計算済み見積全体"), tint: "green", route: "portfolio" },
        ],
      };
    case "delivery":
      return {
        hero: {
          kicker: bi("EVIDENCE", "エビデンス"),
          metric: bi("Evidence loop opens in Phase 2", "エビデンスループはフェーズ2で開始"),
          sub: bi(
            "Unit capture, live calibration and sold-vs-actual land here; until then the workbook stays the template.",
            "ユニット記録・実測校正・受注対実績はここに実装されます。それまではワークブックが原本です。",
          ),
        },
        ctas: [
          { label: bi("See the evidence plan", "エビデンス計画を見る"), route: "evidence", primary: true },
          { label: bi("View engagements", "エンゲージメントを見る"), route: "engagements" },
        ],
        cards: [
          { label: bi("Portfolio deals", "ポートフォリオ案件"), value: String(n), sub: bi("read-only view", "閲覧のみ"), tint: "neutral", route: "portfolio" },
          { label: bi("Evidence ledger", "エビデンス台帳"), value: "P2", sub: bi("Phase 2 — planned", "フェーズ2 — 計画済み"), tint: "gold", route: "evidence" },
          { label: bi("Engagements", "エンゲージメント"), value: "P2", sub: bi("sold-vs-actual, true-ups", "受注対実績・精算"), tint: "gold", route: "engagements" },
          { label: bi("Training", "トレーニング"), value: "?", sub: bi("you are the evidence engine", "あなたがエビデンスエンジン"), tint: "neutral", route: "help" },
        ],
      };
    case "pricing_owner":
      return {
        hero: {
          kicker: bi("POLICY", "ポリシー"),
          metric: bi(`${n} quotes on published parameters`, `公開パラメータ上の見積 ${n}件`),
          sub: bi(
            "Offerings, parameter sets, bands and floors — versioned, published by you.",
            "オファリング・パラメータセット・バンド・フロア — あなたがバージョン管理し公開します。",
          ),
        },
        ctas: [
          { label: bi("Open Policy Studio", "ポリシースタジオを開く"), route: "policy", primary: true },
          { label: bi("Open portfolio", "ポートフォリオを開く"), route: "portfolio" },
        ],
        cards: [
          { label: bi("Floor adherence", "フロア遵守"), value: floorPct, sub: bi("across priced quotes", "価格計算済み見積全体"), tint: "green", route: "portfolio" },
          { label: bi("Blocked quotes", "ブロック見積"), value: String(blocked), sub: bi("engine-gated", "エンジンによるゲート"), tint: blocked > 0 ? "red" : "green", route: "approvals" },
          { label: bi("GP vs. traditional", "GP対従来型"), value: gpDelta, sub: bi("from governed value pricing", "ガバナンス価格設定による"), tint: "green", route: "portfolio" },
          { label: bi("Reinvestment", "再投資"), value: reinvest, sub: bi("platform carve-out funded", "プラットフォーム積立"), tint: "gold", route: "portfolio" },
        ],
      };
    case "leadership":
      return {
        hero: {
          kicker: bi("PORTFOLIO", "ポートフォリオ"),
          metric: bi(`${rev} priced · floor adherence ${floorPct}`, `価格計算済み ${rev} · フロア遵守 ${floorPct}`),
          sub: bi(
            "Governed value pricing is holding the floor and lifting margin.",
            "ガバナンス下の価値ベース価格がフロアを維持し、マージンを押し上げています。",
          ),
        },
        ctas: [
          { label: bi("Open portfolio", "ポートフォリオを開く"), route: "portfolio", primary: true },
          { label: bi("Ask Insights", "インサイトに質問"), route: "insights" },
        ],
        cards: [
          { label: bi("Priced revenue", "契約売上"), value: rev, sub: bi(`${n} quotes`, `見積${n}件`), tint: "neutral", route: "portfolio" },
          { label: bi("Floor adherence", "フロア遵守"), value: floorPct, sub: bi("no leakage tolerated", "漏れゼロが基準"), tint: "green", route: "portfolio" },
          { label: bi("Reinvestment", "再投資"), value: reinvest, sub: bi("funded by signed deals", "成約案件が拠出"), tint: "gold", route: "portfolio" },
          { label: bi("Exceptions", "例外"), value: String(blocked), sub: bi("blocked, below floor", "ブロック・フロア未満"), tint: blocked > 0 ? "red" : "green", route: "approvals" },
        ],
      };
  }
}

function buildSignals(
  s: PortfolioSummary | null,
  locale: Locale,
): { text: string; tone: Tone; route: string }[] {
  if (!s) return [];
  const ja = locale === "ja";
  const out: { text: string; tone: Tone; route: string }[] = [];
  for (const q of s.quotes.filter((q) => !q.at_or_above_floor).slice(0, 2)) {
    out.push({
      text: ja
        ? `Q-${q.id} ${q.title} — 選択価格がフロア未満`
        : `Q-${q.id} ${q.title} — selected price below the floor`,
      tone: "red",
      route: "approvals",
    });
  }
  const pending = (s.governance_counts["warning"] ?? 0) + (s.governance_counts["blocked"] ?? 0);
  if (pending > 0) {
    out.push({
      text: ja
        ? `${pending}件の見積がディールデスクの判断待ち`
        : `${pending} quote${pending === 1 ? "" : "s"} awaiting a deal-desk decision`,
      tone: "gold",
      route: "approvals",
    });
  }
  const green = s.governance_counts["green"] ?? 0;
  if (green > 0) {
    out.push({
      text: ja
        ? `${green}件のグリーン見積 — 提案書を生成できます`
        : `${green} green quote${green === 1 ? "" : "s"} — cleared to generate proposals`,
      tone: "green",
      route: "proposal",
    });
  }
  if (out.length === 0) {
    out.push({
      text: ja ? "すべて順調 — 対応が必要なシグナルはありません" : "All clear — no signals need your attention",
      tone: "green",
      route: "portfolio",
    });
  }
  return out.slice(0, 3);
}

const JUMP: { route: string; key: string }[] = [
  { route: "deal", key: "nav.deal_workspace" },
  { route: "portfolio", key: "nav.portfolio" },
  { route: "insights", key: "nav.insights" },
  { route: "help", key: "nav.help" },
];

const TONE_META: Record<Tone, { ink: string; bg: string; tagKey: string }> = {
  red: { ink: color.red, bg: "rgba(192,80,77,.12)", tagKey: "home.tag_action" },
  gold: { ink: color.goldDeep, bg: "rgba(232,163,61,.14)", tagKey: "home.tag_review" },
  green: { ink: color.green, bg: "rgba(78,138,90,.12)", tagKey: "home.tag_ontrack" },
};

const TINT_INK: Record<Tint, string> = {
  neutral: "var(--ink)",
  gold: color.goldDeep,
  green: color.green,
  red: color.red,
};

export default function Home() {
  const { locale, user } = useUi();
  const ja = locale === "ja";
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);

  useEffect(() => {
    apiGet<{ scope: string; summary: PortfolioSummary }>("/portfolio")
      .then((r) => setSummary(r.summary))
      .catch(() => setSummary(null));
  }, []);

  const role: Role = user?.role ?? "sales";
  const content = useMemo(() => buildContent(role, summary), [role, summary]);
  const signals = useMemo(() => buildSignals(summary, locale), [summary, locale]);
  const firstName = (user?.full_name ?? "").split(/\s+/)[0] || "there";
  const L = (b: Bi) => (ja ? b.ja : b.en);

  return (
    <div style={{ maxWidth: 1080 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 18 }}>
        <Kicker locale={locale}>{fmtDate(new Date(), locale)}</Kicker>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em" }}>
          {ja ? `こんにちは、${firstName}さん` : `${lt("home.greeting", locale)}, ${firstName}`}
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
          {lt(`role.${role}`, locale)} · {lt("home.workspace_line", locale)}
        </div>
      </div>

      {/* Hero — solid navy panel */}
      <section style={{ ...navyPanelStyle, padding: "26px 28px" }}>
        <div
          aria-hidden
          style={{
            position: "absolute",
            right: -40,
            top: -40,
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232,163,61,.24), transparent 70%)",
          }}
        />
        <div style={{ position: "relative", maxWidth: 680 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: ja ? "normal" : ".14em",
              textTransform: ja ? "none" : "uppercase",
              color: color.gold,
            }}
          >
            {L(content.hero.kicker)}
          </div>
          <div
            className="num"
            style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-.01em", marginTop: 10, lineHeight: 1.2 }}
          >
            {L(content.hero.metric)}
          </div>
          <div style={{ fontSize: 13.5, color: "#C9D8EE", marginTop: 8, lineHeight: 1.6 }}>
            {L(content.hero.sub)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 20, flexWrap: "wrap" }}>
            {content.ctas.map((c) => (
              <a
                key={c.route + c.label.en}
                href={`#/${c.route}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  borderRadius: radius.capsule,
                  padding: "11px 22px",
                  fontSize: 13,
                  fontWeight: 800,
                  ...(c.primary
                    ? {
                        background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`,
                        color: color.navy,
                        boxShadow: "0 4px 14px rgba(199,127,26,.34)",
                      }
                    : {
                        background: "rgba(255,255,255,.1)",
                        border: "1px solid rgba(255,255,255,.24)",
                        color: "#fff",
                      }),
                }}
              >
                {L(c.label)}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Work cards — solid */}
      <Kicker locale={locale} style={{ margin: "24px 0 12px" }}>
        {lt("home.your_work", locale)}
      </Kicker>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
        }}
      >
        {content.cards.map((k) => (
          <a
            key={k.label.en}
            href={`#/${k.route}`}
            style={{
              display: "block",
              textDecoration: "none",
              borderRadius: radius.card,
              padding: 16,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 1px 2px rgba(11,18,32,0.06)",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "block",
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: TINT_INK[k.tint],
              }}
            />
            <div className="num" style={{ marginTop: 12, fontSize: 26, fontWeight: 800, color: TINT_INK[k.tint] }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
              {L(k.label)}
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{L(k.sub)}</div>
          </a>
        ))}
      </div>

      {/* Needs attention + jump back in — solid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginTop: 24,
        }}
      >
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{lt("home.attention", locale)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {lt("home.attention_sub", locale)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
            {signals.map((s) => {
              const m = TONE_META[s.tone];
              return (
                <a
                  key={s.text}
                  href={`#/${s.route}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    textDecoration: "none",
                    padding: "12px 14px",
                    borderRadius: 11,
                    background: m.bg,
                  }}
                >
                  <span
                    aria-hidden
                    style={{ width: 4, alignSelf: "stretch", borderRadius: 99, background: m.ink }}
                  />
                  <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.4 }}>
                    {s.text}
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: m.ink,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lt(m.tagKey, locale)}
                  </span>
                </a>
              );
            })}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13.5, fontWeight: 800 }}>{lt("home.jump_back", locale)}</div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {lt("home.jump_back_sub", locale)}
          </div>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {JUMP.map((j) => (
              <a
                key={j.route}
                href={`#/${j.route}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  textDecoration: "none",
                  padding: "11px 14px",
                  borderRadius: 11,
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  color: "var(--ink)",
                  fontSize: 12.5,
                  fontWeight: 700,
                }}
              >
                {lt(j.key, locale)}
                <span aria-hidden style={{ color: color.goldDeep }}>
                  →
                </span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
