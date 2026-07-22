// LOCAL screen-string dictionary for the screens owned by the screens agent
// (Login, Home, Proposal, Portfolio, Evidence, Engagements, Help).
// The shared src/i18n.ts is owned by another agent — we merge our keys at
// render time via lt(); shared t() stays the fallback for shell keys.
import { t as sharedT, type Locale } from "../../i18n";

type Dict = Record<string, string>;

const en: Dict = {
  // ——— Login ———
  "login.kicker": "AI-NATIVE PRICING",
  "login.headline": "Governed pricing, backed by evidence.",
  "login.blurb":
    "Price every SAP engagement against published bands, defend the floor automatically, and prove delivered value — one workspace.",
  "login.trust1": "SAP S/4HANA connected",
  "login.trust2": "SOC 2 · SSO enforced",
  "login.trust3": "Every price defensible",
  "login.tenant_foot": "nuvear.com · Tokyo region · pilot",
  "login.workspace": "WORKSPACE",
  "login.sign_in": "Sign in",
  "login.tenant": "You're signing in to nuvear.com",
  "login.dev_note": "Pilot dev login — pick a seeded user. SSO arrives with production.",
  "login.api_error": "API unreachable — is the server on :8791 running?",
  "login.builder": "builder",

  // ——— Roles ———
  "role.pricing_owner": "Pricing Owner",
  "role.sales": "Sales / Advisory",
  "role.deal_desk": "Deal Desk",
  "role.delivery": "Delivery / PMO",
  "role.leadership": "Leadership",

  // ——— Home ———
  "home.your_work": "YOUR WORK",
  "home.attention": "Needs attention",
  "home.attention_sub": "Signals routed to your role, most urgent first.",
  "home.jump_back": "Jump back in",
  "home.jump_back_sub": "The surfaces you use most.",
  "home.workspace_line": "DealSpine workspace",
  "home.tag_action": "Action",
  "home.tag_review": "Review",
  "home.tag_ontrack": "On track",
  "home.greeting": "Good morning",

  // ——— Proposal ———
  "proposal.kicker": "CUSTOMER OUTPUT",
  "proposal.title": "Proposal preview",
  "proposal.excluded_chip": "Internal figures excluded",
  "proposal.source_quote": "SOURCE QUOTE",
  "proposal.pick_quote": "Pick a quote",
  "proposal.no_quotes": "No quotes yet — create one in the Deal Workspace.",
  "proposal.language": "PROPOSAL LANGUAGE",
  "proposal.locale_note":
    "Renders in the customer's locale, independent of your UI language. Deal currency is preserved.",
  "proposal.deal_currency": "Deal currency",
  "proposal.assurance_title": "Structural exclusion",
  "proposal.assurance_body":
    "Cost, margin, and floor figures are absent from this template by construction — not by discipline. A CI test fails the build if any leak onto a customer surface.",
  "proposal.export_html": "Export HTML",
  "proposal.not_ready":
    "Only green or approved quotes can generate a customer proposal.",
  "proposal.state_label": "Governance state",
  "proposal.no_access":
    "Proposal generation is available to pricing owner, sales, and deal desk only (§2 access matrix).",
  "proposal.loading": "Assembling customer document…",
  "proposal.engine": "engine",

  // ——— Portfolio ———
  "portfolio.kicker": "LEADERSHIP",
  "portfolio.title": "Portfolio",
  "portfolio.scope_all": "All deals",
  "portfolio.scope_own": "Your deals only",
  "portfolio.kpi_quotes": "Quotes",
  "portfolio.kpi_revenue": "Selected revenue",
  "portfolio.kpi_floor": "Floor adherence",
  "portfolio.kpi_gp_delta": "GP vs. traditional",
  "portfolio.kpi_gp_delta_sub": "from governed value pricing",
  "portfolio.kpi_reinvest": "Reinvestment",
  "portfolio.rev_vs_floor": "Revenue vs. floor",
  "portfolio.rev_vs_floor_sub":
    "Contracted revenue against each deal's minimum-at-floor.",
  "portfolio.contracted": "Contracted",
  "portfolio.floor": "Floor",
  "portfolio.below_floor": "Below floor",
  "portfolio.disc_vs_band": "Discount distribution",
  "portfolio.disc_vs_band_sub": "Deals per discount band across the portfolio.",
  "portfolio.deals_table": "ALL DEALS",
  "portfolio.col_deal": "Deal",
  "portfolio.col_state": "State",
  "portfolio.col_rev": "Revenue",
  "portfolio.col_floor": "Floor",
  "portfolio.col_gp": "Gross profit",
  "portfolio.col_disc": "Discount",
  "portfolio.reinvest_title": "REINVESTMENT FUND",
  "portfolio.reinvest_sub": "Platform carve-out funded by signed deals.",
  "portfolio.deals_funding": "Deals funding",
  "portfolio.empty": "No priced quotes yet — the portfolio fills as quotes are saved.",
  "portfolio.error": "Could not load the portfolio.",
  "portfolio.governance": "Governance states",

  // ——— Evidence (Phase-2 placeholder) ———
  "evidence.kicker": "DELIVERY EVIDENCE",
  "evidence.title": "Evidence",
  "evidence.capture": "Capture unit",
  "evidence.tab_all": "All",
  "evidence.tab_verified": "Verified",
  "evidence.tab_pending": "Pending",
  "evidence.tab_disputed": "Disputed",
  "evidence.empty_title": "The evidence ledger arrives in Phase 2",
  "evidence.empty_body":
    "Unit capture replaces the delivery workbook: the Object_Log's 40 columns become a validated web form plus CSV/XLSX import, with logger ≠ countersigner enforced, token source recorded, and the config version stamped on every row. Measured c / e / q then calibrate every new quote.",
  "evidence.empty_note":
    "Until then, delivery keeps logging units in the offline workbook template.",
  "evidence.phase": "Phase 2",

  // ——— Engagements (Phase-2 placeholder) ———
  "engagements.kicker": "DELIVERY",
  "engagements.title": "Engagements",
  "engagements.new": "Link a won quote",
  "engagements.tab_active": "Active",
  "engagements.tab_complete": "Complete",
  "engagements.empty_title": "Sold-vs-actual arrives in Phase 2",
  "engagements.empty_body":
    "An engagement links a won quote (frozen snapshot) to rolling actuals: variance dashboard with named drivers (mix drift, rework, redeployment shortfall, tokens, delay), symmetric mix true-up and shared-improvement credit computed automatically, plus the warranty ledger.",
  "engagements.empty_note":
    "Won quotes stay visible in the Portfolio until engagements go live.",
  "engagements.phase": "Phase 2",

  // ——— Help ———
  "help.kicker": "HELP & TRAINING",
  "help.headline": "How can we help?",
  "help.search_ph": "Search help articles…",
  "help.no_results": "No articles match your search.",
  "help.ja_note": "",
  // (help article content itself lives in Help.tsx — reference copy ported
  //  from the calculator's Help view, EN authored.)

  // ——— Common ———
  "common.phase2_disabled": "Available in Phase 2",
  "common.view_help": "Read how this phase works in Help",
};

const ja: Dict = {
  "login.kicker": "AIネイティブ価格設定",
  "login.headline": "ガバナンスされた価格を、エビデンスで裏付ける。",
  "login.blurb":
    "すべてのSAP案件を公開バンドに照らして価格設定し、フロアを自動で防衛し、提供価値を証明する — ひとつのワークスペースで。",
  "login.trust1": "SAP S/4HANA 連携済み",
  "login.trust2": "SOC 2 · SSO 必須",
  "login.trust3": "すべての価格に根拠",
  "login.tenant_foot": "nuvear.com · 東京リージョン · パイロット",
  "login.workspace": "ワークスペース",
  "login.sign_in": "サインイン",
  "login.tenant": "nuvear.com にサインインします",
  "login.dev_note": "パイロット用ログイン — シードユーザーを選択してください。SSOは本番から。",
  "login.api_error": "APIに接続できません — :8791 のサーバーは起動していますか？",
  "login.builder": "ビルダー",

  "role.pricing_owner": "プライシングオーナー",
  "role.sales": "営業・アドバイザリー",
  "role.deal_desk": "ディールデスク",
  "role.delivery": "デリバリー / PMO",
  "role.leadership": "リーダーシップ",

  "home.your_work": "あなたの作業",
  "home.attention": "要対応",
  "home.attention_sub": "あなたのロール向けのシグナル、緊急度順。",
  "home.jump_back": "作業に戻る",
  "home.jump_back_sub": "よく使う画面。",
  "home.workspace_line": "DealSpine ワークスペース",
  "home.tag_action": "要対応",
  "home.tag_review": "確認",
  "home.tag_ontrack": "良好",
  "home.greeting": "こんにちは",

  "proposal.kicker": "顧客向け出力",
  "proposal.title": "提案書プレビュー",
  "proposal.excluded_chip": "社内数値は除外済み",
  "proposal.source_quote": "元となる見積",
  "proposal.pick_quote": "見積を選択",
  "proposal.no_quotes": "見積がまだありません — ディール・ワークスペースで作成してください。",
  "proposal.language": "提案書の言語",
  "proposal.locale_note":
    "UIの言語に関わらず、顧客のロケールで生成されます。案件通貨は維持されます。",
  "proposal.deal_currency": "案件通貨",
  "proposal.assurance_title": "構造的除外",
  "proposal.assurance_body":
    "コスト・マージン・フロアの数値は、規律ではなくテンプレート構造として存在しません。顧客面に漏れた場合はCIテストがビルドを失敗させます。",
  "proposal.export_html": "HTML書き出し",
  "proposal.not_ready": "グリーンまたは承認済みの見積のみ提案書を生成できます。",
  "proposal.state_label": "ガバナンス状態",
  "proposal.no_access":
    "提案書の生成はプライシングオーナー・営業・ディールデスクのみ利用できます（§2 アクセスマトリクス）。",
  "proposal.loading": "顧客向け文書を生成中…",
  "proposal.engine": "エンジン",

  "portfolio.kicker": "リーダーシップ",
  "portfolio.title": "ポートフォリオ",
  "portfolio.scope_all": "全案件",
  "portfolio.scope_own": "担当案件のみ",
  "portfolio.kpi_quotes": "見積数",
  "portfolio.kpi_revenue": "契約売上",
  "portfolio.kpi_floor": "フロア遵守",
  "portfolio.kpi_gp_delta": "GP 対 従来型",
  "portfolio.kpi_gp_delta_sub": "ガバナンス価格設定による",
  "portfolio.kpi_reinvest": "再投資",
  "portfolio.rev_vs_floor": "売上 対 フロア",
  "portfolio.rev_vs_floor_sub": "各案件の契約売上とフロア最小売上の比較。",
  "portfolio.contracted": "契約売上",
  "portfolio.floor": "フロア",
  "portfolio.below_floor": "フロア未満",
  "portfolio.disc_vs_band": "割引の分布",
  "portfolio.disc_vs_band_sub": "割引バンドごとの案件数。",
  "portfolio.deals_table": "全案件",
  "portfolio.col_deal": "案件",
  "portfolio.col_state": "状態",
  "portfolio.col_rev": "売上",
  "portfolio.col_floor": "フロア",
  "portfolio.col_gp": "粗利",
  "portfolio.col_disc": "割引",
  "portfolio.reinvest_title": "再投資ファンド",
  "portfolio.reinvest_sub": "成約案件が拠出するプラットフォーム積立。",
  "portfolio.deals_funding": "拠出案件",
  "portfolio.empty": "価格計算済みの見積がまだありません — 見積の保存とともに表示されます。",
  "portfolio.error": "ポートフォリオを読み込めませんでした。",
  "portfolio.governance": "ガバナンス状態",

  "evidence.kicker": "デリバリーエビデンス",
  "evidence.title": "エビデンス",
  "evidence.capture": "ユニットを記録",
  "evidence.tab_all": "すべて",
  "evidence.tab_verified": "検証済み",
  "evidence.tab_pending": "保留中",
  "evidence.tab_disputed": "係争中",
  "evidence.empty_title": "エビデンス台帳はフェーズ2で提供されます",
  "evidence.empty_body":
    "ユニット記録がデリバリーワークブックを置き換えます。Object_Log の40列は検証付きWebフォームとCSV/XLSXインポートになり、記録者≠副署名者の強制、トークンソースの記録、全行への構成バージョンのスタンプを備えます。実測の c / e / q が新しい見積を校正します。",
  "evidence.empty_note": "それまでは、デリバリーはオフラインのワークブックテンプレートで記録を続けます。",
  "evidence.phase": "フェーズ2",

  "engagements.kicker": "デリバリー",
  "engagements.title": "エンゲージメント",
  "engagements.new": "受注見積をリンク",
  "engagements.tab_active": "稼働中",
  "engagements.tab_complete": "完了",
  "engagements.empty_title": "受注 対 実績はフェーズ2で提供されます",
  "engagements.empty_body":
    "エンゲージメントは受注見積（凍結スナップショット）を実績と結び付けます。名前付き要因（構成ドリフト・手戻り・再配置不足・トークン・遅延）の差異ダッシュボード、対称的な構成精算と改善クレジットの自動計算、保証台帳を備えます。",
  "engagements.empty_note": "エンゲージメント提供までは、受注案件はポートフォリオで確認できます。",
  "engagements.phase": "フェーズ2",

  "help.kicker": "ヘルプ・トレーニング",
  "help.headline": "どんなことでお困りですか？",
  "help.search_ph": "ヘルプ記事を検索…",
  "help.no_results": "検索に一致する記事はありません。",
  "help.ja_note": "詳細な記事本文は現時点では英語のみです（パイロット）。",

  "common.phase2_disabled": "フェーズ2で提供予定",
  "common.view_help": "この段階の詳細はヘルプをご覧ください",
};

const local: Record<Locale, Dict> = { en, ja };

/** Local-first translate; falls back to the shared dictionary, then the key. */
export function lt(key: string, locale: Locale): string {
  const hit = local[locale][key] ?? local.en[key];
  if (hit !== undefined && hit !== "") return hit;
  return sharedT(key, locale);
}
