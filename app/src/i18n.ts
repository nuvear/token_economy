// i18n scaffold — EN keys are the source of truth (PRD §4).
// All formatting goes through Intl.*, never hand-formatted strings.
// Currency follows the DEAL, not the UI language.

export type Locale = "en" | "ja";

const INTL_LOCALE: Record<Locale, string> = { en: "en-US", ja: "ja-JP" };

type Dict = Record<string, string>;

const en: Dict = {
  "app.name": "DealSpine",
  "nav.home": "Home",
  "nav.deal_workspace": "Deal Workspace",
  "nav.approvals": "Approvals",
  "nav.policy_studio": "Policy Studio",
  "nav.proposal": "Proposal",
  "nav.portfolio": "Portfolio",
  "nav.insights": "Insights",
  "nav.evidence": "Evidence",
  "nav.engagements": "Engagements",
  "nav.settings": "Settings",
  "nav.help": "Help",
  "auth.login": "Log in",
  "auth.logout": "Log out",
  "auth.pick_user": "Pick a user (pilot dev login)",
  "shell.theme": "Theme",
  "shell.theme.light": "Light",
  "shell.theme.dark": "Dark",
  "shell.glass": "Glass",
  "shell.glass.full": "Full",
  "shell.glass.reduced": "Reduced",
  "shell.glass.opaque": "Opaque",
  "shell.language": "Language",
  "common.todo": "This screen is a scaffold stub — its build phase fills it in.",
};

const ja: Dict = {
  "app.name": "DealSpine",
  "nav.home": "ホーム",
  "nav.deal_workspace": "ディール・ワークスペース",
  "nav.approvals": "承認",
  "nav.policy_studio": "ポリシースタジオ",
  "nav.proposal": "提案書",
  "nav.portfolio": "ポートフォリオ",
  "nav.insights": "インサイト",
  "nav.evidence": "エビデンス",
  "nav.engagements": "エンゲージメント",
  "nav.settings": "設定",
  "nav.help": "ヘルプ",
  "auth.login": "ログイン",
  "auth.logout": "ログアウト",
  "auth.pick_user": "ユーザーを選択（パイロット用ログイン）",
  "shell.theme": "テーマ",
  "shell.theme.light": "ライト",
  "shell.theme.dark": "ダーク",
  "shell.glass": "ガラス",
  "shell.glass.full": "フル",
  "shell.glass.reduced": "抑えめ",
  "shell.glass.opaque": "不透明",
  "shell.language": "言語",
  "common.todo": "この画面はスキャフォールドのスタブです。実装フェーズで作り込みます。",
};

const dicts: Record<Locale, Dict> = { en, ja };

export function t(key: string, locale: Locale): string {
  return dicts[locale][key] ?? dicts.en[key] ?? key;
}

/**
 * Money follows the DEAL currency, not the UI language.
 * JPY renders with no decimals (Intl default); USD as $1,234,567.
 */
export function fmtMoney(
  value: number,
  dealCurrency: string,
  locale: Locale = "en",
): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: dealCurrency,
    maximumFractionDigits: dealCurrency === "JPY" ? 0 : 0,
  }).format(value);
}

/** Timestamps store UTC; display in the user's timezone via Intl. */
export function fmtDate(date: Date | string | number, locale: Locale = "en"): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium" }).format(d);
}

export function fmtDateTime(date: Date | string | number, locale: Locale = "en"): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function fmtNumber(value: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale]).format(value);
}

export function fmtPct(fraction: number, locale: Locale = "en", digits = 1): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(fraction);
}
