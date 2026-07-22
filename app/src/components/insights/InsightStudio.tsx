// Insight Studio — builder-only sheet (glass, navigation-layer material).
// Prompt editor with typed variable picker, data-scope checkboxes (the
// floor/cost scope forces a §2 role restriction), provider + model select,
// local dry-run test, publish via POST /api/insights/buttons.
import { useMemo, useState, type CSSProperties } from "react";
import { color, elevation, font, motion } from "../../tokens";
import type { Locale } from "../../i18n";
import { ApiError } from "../../api";
import {
  ALL_ROLES,
  insightsApi,
  normalizeTemplate,
  PROVIDER_DEFAULT_MODEL,
  PROVIDER_META,
  RESTRICTED_ROLES,
  SCOPES,
  scopeLabel,
  scopeMeta,
  ti,
  type InsightButton,
  type QuoteSummary,
} from "./insightsShared";

export interface InsightStudioProps {
  locale: Locale;
  glassStyle: CSSProperties;
  quotes: QuoteSummary[];
  selectedQuoteId: number | null;
  onClose: () => void;
  onPublished: (button: InsightButton) => void;
}

const PROVIDERS = ["anthropic", "openai", "gemini", "grok", "local_gemma"] as const;

export function InsightStudio({
  locale,
  glassStyle,
  quotes,
  selectedQuoteId,
  onClose,
  onPublished,
}: InsightStudioProps) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [provider, setProvider] = useState<string>("anthropic");
  const [model, setModel] = useState<string>(PROVIDER_DEFAULT_MODEL.anthropic);
  const [prompt, setPrompt] = useState("Given {{quote}}, ");
  const [scope, setScope] = useState<string>("current_quote");
  const [testOut, setTestOut] = useState<string | null>(null);
  const [testBusy, setTestBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restricted = scopeMeta(scope).restricted;

  const varTokens = useMemo(() => {
    const scoped = scopeMeta(scope).token;
    const rest = SCOPES.map((s) => s.token).filter((t) => t !== scoped);
    return ["{{data}}", scoped, ...rest];
  }, [scope]);

  const packagedPreview = useMemo(() => {
    return [
      "### PROMPT",
      normalizeTemplate(prompt.trim()) || "(empty)",
      "",
      "### DATA SCOPE",
      `- ${scopeLabel(scope, locale)}${restricted ? "  [ROLE-LOCKED]" : ""}`,
      "",
      "### PROVIDER",
      `${PROVIDER_META[provider]?.label ?? provider} · ${model}`,
    ].join("\n");
  }, [prompt, scope, provider, model, locale, restricted]);

  const runTest = async () => {
    setTestBusy(true);
    setError(null);
    try {
      let packaged = ti("studio.packaged_at_run", locale);
      if (scope === "current_quote") {
        const qid = selectedQuoteId ?? quotes[0]?.id ?? null;
        if (qid !== null) {
          const r = await insightsApi.quoteMarkdown(qid);
          packaged = r.markdown;
        }
      }
      const template = normalizeTemplate(prompt.trim() || "(empty)");
      const assembled = template.includes("{{data}}")
        ? template.replace("{{data}}", packaged)
        : `${template}\n\n${packaged}`;
      const headings = (assembled.match(/^#{1,3} .+$/gm) ?? []).length;
      const tableRows = (assembled.match(/^\| /gm) ?? []).length;
      setTestOut(
        [
          `> ${ti("studio.test_note", locale)}`,
          "",
          `chars: ${assembled.length} · headings: ${headings} · table rows: ${tableRows}`,
          "",
          "---",
          assembled.length > 4000 ? `${assembled.slice(0, 4000)}\n…` : assembled,
        ].join("\n"),
      );
    } catch {
      setTestOut(`> ${ti("ins.run_failed", locale)}`);
    } finally {
      setTestBusy(false);
    }
  };

  const publish = async () => {
    if (!name.trim()) {
      setError(ti("studio.need_name", locale));
      return;
    }
    if (!prompt.trim()) {
      setError(ti("studio.need_prompt", locale));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await insightsApi.publish({
        label: name.trim(),
        description_md: desc.trim() || undefined,
        prompt_template_md: normalizeTemplate(prompt.trim()),
        data_scope: scope,
        // §2: floor/cost scope forces the role restriction.
        allowed_roles: restricted ? RESTRICTED_ROLES : ALL_ROLES,
        provider,
        model: model.trim() || PROVIDER_DEFAULT_MODEL[provider] || "default",
        output_language: locale === "ja" ? "ja" : "author",
      });
      onPublished(r.button);
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 409) {
        setError(ti("studio.dup_key", locale));
      } else {
        setError(ti("ins.run_failed", locale));
      }
    } finally {
      setBusy(false);
    }
  };

  const lbl: CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    color: "#9FB1CC",
    letterSpacing: ".04em",
    textTransform: "uppercase",
  };
  const input: CSSProperties = {
    width: "100%",
    marginTop: 6,
    background: "#fff",
    border: "1px solid #C9D6EA",
    borderRadius: 10,
    padding: "10px 12px",
    font: "inherit",
    fontSize: 13.5,
    color: color.navy,
  };
  const select: CSSProperties = { ...input, fontSize: 13, fontWeight: 600 };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(11,18,32,.55)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
          animation: "dsins-scrim .25s",
        }}
      />
      <aside
        role="dialog"
        aria-label={ti("studio.kicker", locale)}
        style={{
          ...glassStyle,
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 61,
          height: "100vh",
          width: "min(480px, 94vw)",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          boxShadow: elevation.sheet,
          animation: `dsins-sheet ${motion.durationMs}ms ${motion.easing}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottom: "1px solid rgba(255,255,255,.14)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: locale === "ja" ? "normal" : ".14em",
                color: color.gold,
                textTransform: locale === "ja" ? "none" : "uppercase",
              }}
            >
              {ti("studio.kicker", locale)}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginTop: 3 }}>
              {ti("studio.title", locale)}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={ti("ins.close", locale)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,.18)",
              background: "transparent",
              cursor: "pointer",
              color: color.ice,
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{
            overflow: "auto",
            padding: "16px 2px 2px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}
        >
          <div>
            <label style={lbl}>{ti("studio.name", locale)}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ti("studio.name_ph", locale)}
              style={input}
            />
          </div>
          <div>
            <label style={lbl}>{ti("studio.desc", locale)}</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={ti("studio.desc_ph", locale)}
              style={input}
            />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{ti("studio.provider", locale)}</label>
              <select
                value={provider}
                onChange={(e) => {
                  const p = e.target.value;
                  setProvider(p);
                  setModel(PROVIDER_DEFAULT_MODEL[p] ?? "");
                }}
                style={select}
              >
                {PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_META[p]?.label ?? p}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>{ti("studio.model", locale)}</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                style={{ ...input, fontFamily: font.mono, fontSize: 12.5 }}
              />
            </div>
          </div>

          <div>
            <label style={lbl}>{ti("studio.prompt", locale)}</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 8px" }}>
              {varTokens.map((tok) => (
                <button
                  key={tok}
                  onClick={() => setPrompt((p) => `${p}${p.endsWith(" ") || p === "" ? "" : " "}${tok} `)}
                  style={{
                    fontFamily: font.mono,
                    fontSize: 11,
                    fontWeight: 600,
                    color: color.navy,
                    background: color.gold,
                    border: "none",
                    borderRadius: 7,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  {tok}
                </button>
              ))}
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              style={{
                width: "100%",
                background: "#fff",
                border: "1px solid #C9D6EA",
                borderRadius: 10,
                padding: 11,
                fontFamily: font.mono,
                fontSize: 12.5,
                lineHeight: 1.6,
                color: color.navy,
                resize: "vertical",
              }}
            />
          </div>

          <div>
            <label style={lbl}>{ti("studio.scope", locale)}</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 6 }}>
              {SCOPES.map((s) => {
                const on = scope === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setScope(s.id)}
                    role="checkbox"
                    aria-checked={on}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "7px 4px",
                      textAlign: "left",
                      font: "inherit",
                      width: "100%",
                    }}
                  >
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        flex: "none",
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: color.navy,
                        border: `1.5px solid ${on ? color.gold : "rgba(217,230,247,.35)"}`,
                        background: on ? color.gold : "transparent",
                      }}
                    >
                      {on ? "✓" : ""}
                    </span>
                    <span style={{ fontSize: 12.5, color: "#EAF1FB", flex: 1 }}>
                      {scopeLabel(s.id, locale)}
                    </span>
                    {s.restricted && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 800,
                          color: "#E89B99",
                          background: "rgba(192,80,77,.2)",
                          borderRadius: 99,
                          padding: "2px 7px",
                        }}
                      >
                        {ti("studio.role_locked", locale)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {restricted && (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  background: "rgba(192,80,77,.14)",
                  border: "1px solid rgba(192,80,77,.3)",
                  borderRadius: 9,
                  padding: "10px 12px",
                  marginTop: 8,
                }}
              >
                <span style={{ color: "#E89B99", fontWeight: 800 }}>!</span>
                <div style={{ fontSize: 11.5, color: "#EAD3D2", lineHeight: 1.5 }}>
                  {ti("studio.role_warn", locale)}
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={lbl}>{ti("studio.preview", locale)}</label>
            <pre
              style={{
                margin: "6px 0 0",
                background: color.navy,
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 10,
                padding: 12,
                fontFamily: font.mono,
                fontSize: 11,
                lineHeight: 1.6,
                color: "#9FB1CC",
                whiteSpace: "pre-wrap",
                maxHeight: 140,
                overflow: "auto",
              }}
            >
              {testOut ?? packagedPreview}
            </pre>
            <button
              onClick={() => void runTest()}
              disabled={testBusy}
              style={{
                marginTop: 8,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 9,
                padding: "8px 14px",
                cursor: "pointer",
                font: "inherit",
                fontSize: 12.5,
                fontWeight: 600,
                color: color.ice,
              }}
            >
              {testBusy ? ti("studio.testing", locale) : ti("studio.test_run", locale)}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: "#E89B99",
                background: "rgba(192,80,77,.14)",
                border: "1px solid rgba(192,80,77,.3)",
                borderRadius: 9,
                padding: "9px 12px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,.14)",
          }}
        >
          <button
            onClick={onClose}
            style={{
              flex: 1,
              background: "rgba(255,255,255,.08)",
              border: "1px solid rgba(255,255,255,.18)",
              borderRadius: 10,
              padding: 11,
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
              fontWeight: 600,
              color: color.ice,
            }}
          >
            {ti("studio.cancel", locale)}
          </button>
          <button
            onClick={() => void publish()}
            disabled={busy}
            style={{
              flex: 1,
              background: color.gold,
              border: "none",
              borderRadius: 10,
              padding: 11,
              cursor: "pointer",
              font: "inherit",
              fontSize: 13,
              fontWeight: 800,
              color: color.navy,
            }}
          >
            {busy ? ti("studio.publishing", locale) : ti("studio.publish", locale)}
          </button>
        </div>
      </aside>
    </>
  );
}
