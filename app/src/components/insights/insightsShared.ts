// Shared (Insights-screen-local) types, API fetchers, provider/scope metadata,
// glass helper and the screen's own i18n dictionary. Screen-owned file — the
// shared api.ts / i18n.ts stay untouched (file-ownership rule).
import type { CSSProperties } from "react";
import { apiGet, apiPost } from "../../api";
import { glass, type GlassStop } from "../../tokens";
import { t as sharedT, type Locale } from "../../i18n";

// ——— API types (mirror server/routes/insights.ts responses) ———

export interface InsightButton {
  id: number;
  button_key: string;
  label: string;
  description_md: string | null;
  data_scope: string;
  provider: string;
  model: string;
  output_language: string;
}

export interface InsightRunResult {
  id: number;
  button_key: string;
  data_scope: string;
  provider: string;
  model: string;
  status: string;
  result_md: string;
}

export interface InsightRunRow {
  id: number;
  insight_button_id: number;
  run_by: number;
  data_scope: string;
  packaged_markdown: string | null;
  provider: string;
  model: string;
  status: string;
  result_md: string | null;
}

export interface QuoteSummary {
  id: number;
  title: string;
  governance_state: string;
  deal_currency: string;
  quote_stage: string;
}

export interface PublishPayload {
  label: string;
  description_md?: string;
  prompt_template_md: string;
  data_scope: string;
  allowed_roles: string;
  provider: string;
  model: string;
  output_language?: string;
}

export const insightsApi = {
  buttons: () => apiGet<{ buttons: InsightButton[] }>("/insights/buttons"),
  run: (payload: { button_id: number; quote_id?: number }) =>
    apiPost<{ run: InsightRunResult }>("/insights/run", payload),
  runs: () => apiGet<{ runs: InsightRunRow[] }>("/insights/runs"),
  publish: (payload: PublishPayload) =>
    apiPost<{ button: InsightButton }>("/insights/buttons", payload),
  quotes: () => apiGet<{ quotes: QuoteSummary[] }>("/quotes"),
  quoteMarkdown: (id: number) =>
    apiGet<{ quote_id: number; markdown: string }>(`/quotes/${id}/markdown`),
};

// ——— Provider metadata (labels only; server owns the adapters) ———

export const PROVIDER_META: Record<string, { label: string; privacy?: boolean }> = {
  anthropic: { label: "Claude" },
  openai: { label: "GPT" },
  gemini: { label: "Gemini" },
  grok: { label: "Grok" },
  local_gemma: { label: "Gemma · on-device", privacy: true },
  mock: { label: "Offline mock" },
};

export const PROVIDER_DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-sonnet",
  openai: "gpt-5",
  gemini: "gemini-pro",
  grok: "grok-4",
  local_gemma: "gemma",
};

export function providerLabel(provider: string): string {
  return PROVIDER_META[provider]?.label ?? provider;
}

// ——— Data scopes (server DATA_SCOPES) → wall category + restriction ———

export type Category = "deal" | "portfolio" | "delivery" | "strategy";

export const CATEGORY_ORDER: Category[] = ["deal", "portfolio", "delivery", "strategy"];

export interface ScopeMeta {
  id: string;
  category: Category;
  /** Contains floor / cost data → §2 role restriction forced on publish. */
  restricted: boolean;
  /** Prompt-template token the variable picker inserts for this scope. */
  token: string;
}

export const SCOPES: ScopeMeta[] = [
  { id: "current_quote", category: "deal", restricted: false, token: "{{quote}}" },
  { id: "evidence_summary", category: "deal", restricted: false, token: "{{evidence_summary}}" },
  { id: "portfolio_summary", category: "portfolio", restricted: false, token: "{{portfolio_summary}}" },
  { id: "engagement_variance", category: "delivery", restricted: false, token: "{{engagement_variance}}" },
  { id: "policy", category: "strategy", restricted: true, token: "{{policy}}" },
];

export const RESTRICTED_ROLES = "pricing_owner,deal_desk,leadership";
export const ALL_ROLES = "pricing_owner,sales,deal_desk,delivery,leadership";

export function scopeMeta(id: string): ScopeMeta {
  return SCOPES.find((s) => s.id === id) ?? SCOPES[0];
}

export function categoryOf(dataScope: string): Category {
  return scopeMeta(dataScope).category;
}

/**
 * The server substitutes only {{data}} (or appends the package). Scope tokens
 * from the variable picker are sugar — normalize them to {{data}} on publish.
 */
export function normalizeTemplate(template: string): string {
  let out = template;
  for (const s of SCOPES) out = out.split(s.token).join("{{data}}");
  return out;
}

// ——— Glass (navigation-layer material: capsules / run-bar / sheets / scrims) ———

export function glassCss(stop: GlassStop): CSSProperties {
  const g = glass[stop];
  return {
    backdropFilter: g.backdropFilter,
    WebkitBackdropFilter: g.backdropFilter,
    background: g.background,
    border: g.border,
  };
}

// ——— Screen-local i18n (merged over shared t(); shared files untouched) ———

type Dict = Record<string, string>;

const en: Dict = {
  "ins.kicker": "AI-Native",
  "ins.sub": "A wall of prompt buttons. A builder authors one; anyone clicks it forever.",
  "ins.new_button": "New button",
  "ins.seed_title": "This is a prompt. Duplicate it. Make it yours.",
  "ins.seed_body": "Seed buttons ship with every install — all editable in Insight Studio.",
  "ins.for_this_deal": "Insights for this deal",
  "ins.no_quotes": "No quotes visible yet — create one in Deal Workspace.",
  "ins.no_buttons": "No insight buttons are visible for your role yet.",
  "ins.cat.deal": "Deal",
  "ins.cat.portfolio": "Portfolio",
  "ins.cat.delivery": "Delivery",
  "ins.cat.strategy": "Strategy",
  "ins.scope.current_quote": "Current quote",
  "ins.scope.portfolio_summary": "Portfolio summary",
  "ins.scope.engagement_variance": "Engagement variance",
  "ins.scope.policy": "Published policy (floors & costs)",
  "ins.scope.evidence_summary": "Evidence summary",
  "ins.packaging": "Gathering data…",
  "ins.uses": "uses:",
  "ins.copy": "Copy",
  "ins.copied": "Copied",
  "ins.save": "Save",
  "ins.rerun": "Re-run",
  "ins.close": "Close",
  "ins.what_sent": "What was sent",
  "ins.sent_prompt": "PROMPT TEMPLATE",
  "ins.sent_package": "PACKAGED DATA (exact Markdown sent)",
  "ins.sent_loading": "Loading the stored package…",
  "ins.fallback": "fell back to offline mock",
  "ins.privacy": "on-device — data never leaves the machine",
  "ins.run_failed": "The provider call failed. The run was logged; try again or pick another provider.",
  "ins.pick_quote_first": "This button needs a quote — pick one in the run bar first.",
  "studio.kicker": "Insight Studio",
  "studio.title": "New button",
  "studio.name": "Button name",
  "studio.name_ph": "Explain this quote's risk posture",
  "studio.desc": "Description (optional)",
  "studio.desc_ph": "One line shown under the button name",
  "studio.provider": "Provider & model",
  "studio.model": "Model",
  "studio.prompt": "Prompt template",
  "studio.scope": "Data scope",
  "studio.preview": "Packaged preview",
  "studio.role_locked": "ROLE-LOCKED",
  "studio.role_warn":
    "This scope contains floor / cost data. The button will be restricted to roles allowed to see it (§2 access matrix): pricing owner, deal desk, leadership.",
  "studio.test_run": "Test run",
  "studio.testing": "Running local dry-run…",
  "studio.test_note": "Local dry-run — assembled on this machine, nothing sent to a provider.",
  "studio.cancel": "Cancel",
  "studio.publish": "Publish",
  "studio.publishing": "Publishing…",
  "studio.need_name": "Give the button a name first",
  "studio.need_prompt": "Write a prompt template first",
  "studio.dup_key": "A button with this name already exists — rename it",
  "studio.published": "Published to the wall",
  "studio.packaged_at_run": "(packaged from live data at run time)",
};

const ja: Dict = {
  "ins.kicker": "AIネイティブ",
  "ins.sub": "プロンプトボタンの壁。ビルダーが一度作れば、誰でも何度でもクリック。",
  "ins.new_button": "新規ボタン",
  "ins.seed_title": "これはプロンプトです。複製して、あなた仕様に。",
  "ins.seed_body": "シードボタンを標準搭載 — すべてInsight Studioで編集可能。",
  "ins.for_this_deal": "この案件のインサイト",
  "ins.no_quotes": "表示できる見積がまだありません — ディール・ワークスペースで作成してください。",
  "ins.no_buttons": "このロールで実行できるインサイトボタンはまだありません。",
  "ins.cat.deal": "案件",
  "ins.cat.portfolio": "ポートフォリオ",
  "ins.cat.delivery": "デリバリー",
  "ins.cat.strategy": "戦略",
  "ins.scope.current_quote": "現在の見積",
  "ins.scope.portfolio_summary": "ポートフォリオ概況",
  "ins.scope.engagement_variance": "エンゲージメント差異",
  "ins.scope.policy": "公開ポリシー（フロア・コスト）",
  "ins.scope.evidence_summary": "エビデンス概況",
  "ins.packaging": "データ収集中…",
  "ins.uses": "使用データ:",
  "ins.copy": "コピー",
  "ins.copied": "コピーしました",
  "ins.save": "保存",
  "ins.rerun": "再実行",
  "ins.close": "閉じる",
  "ins.what_sent": "送信内容",
  "ins.sent_prompt": "プロンプトテンプレート",
  "ins.sent_package": "パッケージ済みデータ（送信されたMarkdown）",
  "ins.sent_loading": "保存されたパッケージを読み込み中…",
  "ins.fallback": "オフラインモックにフォールバック",
  "ins.privacy": "オンデバイス — データは端末外に出ません",
  "ins.run_failed": "プロバイダ呼び出しに失敗しました。実行は記録済みです。再試行するか別のプロバイダをお試しください。",
  "ins.pick_quote_first": "このボタンには見積が必要です — 先にランバーで選択してください。",
  "studio.kicker": "インサイトスタジオ",
  "studio.title": "新規ボタン",
  "studio.name": "ボタン名",
  "studio.name_ph": "この見積のリスク姿勢を説明",
  "studio.desc": "説明（任意）",
  "studio.desc_ph": "ボタン名の下に表示される一行",
  "studio.provider": "プロバイダ & モデル",
  "studio.model": "モデル",
  "studio.prompt": "プロンプトテンプレート",
  "studio.scope": "データスコープ",
  "studio.preview": "パッケージプレビュー",
  "studio.role_locked": "ロール制限",
  "studio.role_warn":
    "このスコープにはフロア／コストデータが含まれます。閲覧可能なロール（§2アクセス表：プライシングオーナー、ディールデスク、リーダーシップ）に制限されます。",
  "studio.test_run": "テスト実行",
  "studio.testing": "ローカルドライラン実行中…",
  "studio.test_note": "ローカルドライラン — この端末で組み立て。プロバイダには送信されません。",
  "studio.cancel": "キャンセル",
  "studio.publish": "公開",
  "studio.publishing": "公開中…",
  "studio.need_name": "先にボタン名を入力してください",
  "studio.need_prompt": "先にプロンプトテンプレートを入力してください",
  "studio.dup_key": "同名のボタンが既に存在します — 名前を変更してください",
  "studio.published": "ウォールに公開しました",
  "studio.packaged_at_run": "（実行時にライブデータからパッケージ）",
};

const dicts: Record<Locale, Dict> = { en, ja };

/** Screen-local t(): local keys first, then the shared dictionary. */
export function ti(key: string, locale: Locale): string {
  return dicts[locale][key] ?? dicts.en[key] ?? sharedT(key, locale);
}

export function scopeLabel(id: string, locale: Locale): string {
  return ti(`ins.scope.${id}`, locale);
}

export function categoryLabel(cat: Category, locale: Locale): string {
  return ti(`ins.cat.${cat}`, locale);
}
