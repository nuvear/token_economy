// The heart: simulate + governance — mockup: design/mockups/DealSpine Deal Workspace.dc.html
// 3-col workspace: inputs (A) · live results (B) · governance (C).
// Client-side compute() for instant sliders; the server re-runs the engine on save.
import { useEffect, useMemo, useState } from "react";
import { useUi } from "../shell/Shell";
import { apiGet, apiPost, ApiError, offerings as offeringsApi, type Offering, type Role } from "../api";
import { fmtDate, fmtNumber, type Locale } from "../i18n";
import { PRESETS, asMarkdownQuote, compute } from "../engine";
import type { EngineResult, PresetInput } from "../engine";
import { InputsColumn, type SetField } from "../components/workspace/InputsColumn";
import { ResultsColumn } from "../components/workspace/ResultsColumn";
import { GovernancePanel } from "../components/workspace/GovernancePanel";
import { ActionCluster } from "../components/workspace/ActionCluster";
import { fill, tw } from "../components/workspace/strings";

// §2: pricing_owner / deal_desk edit; sales edits own quotes; delivery & leadership read.
const EDIT_ROLES: Role[] = ["pricing_owner", "sales", "deal_desk"];
// §2 row 5: proposal generation excludes delivery and leadership.
const PROPOSAL_ROLES: Role[] = ["pricing_owner", "sales", "deal_desk"];

const PRESET_NAME_JA: Record<string, string> = {
  remediation: "カスタムコード改修 — ECC → S/4HANA",
  testAutomation: "テストスクリプト自動化 — S/4 回帰スイート",
  dataMigration: "データ移行オブジェクト — ECC → S/4HANA",
  interfaces: "インターフェース開発 — BTP / CPI",
  custom: "カスタムオファリング",
};

/** PUT helper — api.ts (shared, not editable here) only exposes GET/POST. */
async function apiPut<T>(path: string, payload: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as T;
}

interface SavedQuote {
  quote: { id: number; governance_state: string; governance_title: string | null };
}

const WORKSPACE_CSS = `
.ws-grid{display:grid;grid-template-columns:322px minmax(0,1fr) 330px;gap:20px;align-items:start}
.ws-gov{position:sticky;top:76px}
@media(max-width:1280px){
  .ws-grid{grid-template-columns:300px minmax(0,1fr)}
  .ws-gov{grid-column:1 / -1;position:static}
}
@media(max-width:860px){.ws-grid{grid-template-columns:1fr}}
.ws-root input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:99px;background:var(--track);outline:none;border:none;padding:0}
.ws-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#E8A33D;border:2px solid #fff;box-shadow:0 1px 3px rgba(22,36,61,.35);cursor:pointer}
.ws-root input[type=range]:disabled::-webkit-slider-thumb{cursor:default}
@keyframes ws-pop{0%{transform:translateY(8px) scale(.98);opacity:0}100%{transform:none;opacity:1}}
.ws-pop{animation:ws-pop .28s cubic-bezier(.2,.7,.2,1)}
@media(prefers-reduced-motion:reduce){.ws-pop{animation:none}}
`;

export default function DealWorkspace() {
  const ui = useUi();
  const locale: Locale = ui.locale;
  const T = (k: Parameters<typeof tw>[0]) => tw(k, locale);
  const ja = locale === "ja";

  const role = ui.user?.role ?? "leadership";
  const canEdit = EDIT_ROLES.includes(role);
  const canProposal = PROPOSAL_ROLES.includes(role);

  const [presetKey, setPresetKey] = useState<string>("remediation");
  const [input, setInput] = useState<PresetInput>(() => ({ ...PRESETS.remediation }));
  const [offeringList, setOfferingList] = useState<Offering[]>([]);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>("");

  const result: EngineResult = useMemo(() => compute(input), [input]);

  useEffect(() => {
    offeringsApi
      .list()
      .then((r) => setOfferingList(r.offerings))
      .catch(() => setOfferingList([]));
  }, []);

  const set: SetField = (key, value) => setInput((s) => ({ ...s, [key]: value }));

  const pickPreset = (key: string) => {
    if (!PRESETS[key]) return;
    setPresetKey(key);
    setInput({ ...PRESETS[key] });
    setQuoteId(null);
    setNote("");
  };

  // ——— Actions ———

  const saveQuote = async (): Promise<number | null> => {
    // PRESETS keys are camelCase (testAutomation); DB preset_key is snake_case
    // (test_automation). Normalize so every offering resolves an offering_id.
    const presetSnake = presetKey.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    const offering = offeringList.find((o) => o.preset_key === presetSnake);
    setBusy(true);
    try {
      const res = quoteId
        ? await apiPut<SavedQuote>(`/quotes/${quoteId}`, { title: input.name, input_overrides: input })
        : await apiPost<SavedQuote>("/quotes", {
            offering_id: offering?.id,
            title: input.name,
            input_overrides: input,
          });
      setQuoteId(res.quote.id);
      setNote(fill(T("saved"), { "%s": res.quote.governance_title ?? res.quote.governance_state }));
      return res.quote.id;
    } catch {
      setNote(T("saveFailed"));
      return null;
    } finally {
      setBusy(false);
    }
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(asMarkdownQuote(input, result));
      setNote(T("copied"));
    } catch {
      setNote(T("copyFailed"));
    }
  };

  const exportMarkdown = () => {
    const md = asMarkdownQuote(input, result);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${input.quoteId || "quote"}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setNote(T("exported"));
  };

  const generateProposal = async () => {
    setNote(T("generating"));
    let id = quoteId;
    if (!id) id = await saveQuote();
    if (!id) return;
    setBusy(true);
    try {
      const res = await apiGet<{ html: string }>(`/quotes/${id}/proposal?locale=${locale}`);
      const blob = new Blob([res.html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setNote("");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setNote(T("proposalBlocked"));
      else setNote(T("proposalFailed"));
    } finally {
      setBusy(false);
    }
  };

  const dealName = ja ? (PRESET_NAME_JA[presetKey] ?? input.name) : input.name;
  const dealRef = quoteId ? `${T("savedQuote")} Q-${quoteId}` : T("draft");

  return (
    <div className="ws-root" style={{ padding: "10px 6px 120px" }}>
      <style>{WORKSPACE_CSS}</style>

      {/* ——— Header (solid) ——— */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 18,
        }}
      >
        <div>
          <div className="kicker" lang={ja ? "ja" : undefined}>
            {T("dealWorkspace")} · {dealRef}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em", color: "var(--ink)" }}>
            {dealName}
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 6,
              color: "var(--muted)",
              fontSize: 12.5,
              flexWrap: "wrap",
            }}
          >
            <span>
              {T("owner")}: {ui.user?.full_name ?? "—"}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>
              {T("updated")} {fmtDate(new Date(), locale)}
            </span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {fill(T("unitsInScope"), {
                "%n": fmtNumber(result.unitsInScope, locale),
                "%u": ja ? "オブジェクト" : input.unitPlural,
              })}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Offering picker */}
          <label style={{ fontSize: 11, color: "var(--muted)" }} htmlFor="ws-offering">
            {T("offering")}
          </label>
          <select
            id="ws-offering"
            value={presetKey}
            onChange={(e) => pickPreset(e.target.value)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 99,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--ink-2)",
              background: "var(--surface)",
              fontFamily: "inherit",
              maxWidth: 280,
            }}
          >
            {Object.keys(PRESETS).map((key) => (
              <option key={key} value={key}>
                {ja ? (PRESET_NAME_JA[key] ?? PRESETS[key].name) : PRESETS[key].name}
              </option>
            ))}
          </select>

          <button
            onClick={copyMarkdown}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 99,
              padding: "8px 14px",
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--ink-2)",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 12h6M9 16h6M9 8h6" />
              <rect x="4" y="3" width="16" height="18" rx="2" />
            </svg>
            {T("copyMd")}
          </button>
        </div>
      </div>

      {/* Status line (also mirrors action feedback) */}
      <div aria-live="polite" style={{ minHeight: 18, marginBottom: 8, fontSize: 12, color: "var(--muted)" }}>
        {!canEdit ? T("readOnly") : note}
        {canEdit && !note ? " " : ""}
      </div>

      {/* ——— 3-column workspace ——— */}
      <div className="ws-grid">
        <InputsColumn input={input} result={result} locale={locale} disabled={!canEdit} set={set} />
        <ResultsColumn input={input} result={result} locale={locale} />
        <div className="ws-gov">
          <GovernancePanel
            input={input}
            result={result}
            locale={locale}
            glassStop={ui.glassStop}
            disabled={!canEdit}
            set={set}
          />
        </div>
      </div>

      {/* ——— Floating action cluster (glass) ——— */}
      <ActionCluster
        locale={locale}
        glassStop={ui.glassStop}
        canSave={canEdit}
        canGenerate={canProposal}
        busy={busy}
        onSave={() => void saveQuote()}
        onExport={exportMarkdown}
        onGenerate={() => void generateProposal()}
      />
    </div>
  );
}
