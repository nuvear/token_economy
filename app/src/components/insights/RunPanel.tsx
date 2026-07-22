// Run panel (morph #2): packaging → streaming-style progressive reveal on
// glass → finished result rendered as Markdown on a SOLID card, with
// copy / save / re-run actions and a "what was sent" disclosure showing
// the exact Markdown package stored with the run.
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { color, elevation, font, motion } from "../../tokens";
import type { Locale } from "../../i18n";
import { ApiError } from "../../api";
import {
  insightsApi,
  providerLabel,
  PROVIDER_META,
  scopeLabel,
  ti,
  type InsightButton,
  type InsightRunResult,
} from "./insightsShared";
import { MarkdownView } from "./Markdown";

type Phase = "packaging" | "streaming" | "done" | "error";

export interface RunPanelProps {
  button: InsightButton;
  quoteId: number | null;
  locale: Locale;
  glassStyle: CSSProperties;
  onClose: () => void;
}

export function RunPanel({ button, quoteId, locale, glassStyle, onClose }: RunPanelProps) {
  const [phase, setPhase] = useState<Phase>("packaging");
  const [streamed, setStreamed] = useState("");
  const [run, setRun] = useState<InsightRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSent, setShowSent] = useState(false);
  const [sentPackage, setSentPackage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const tokenRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    const token = ++tokenRef.current;
    stopTimer();
    setPhase("packaging");
    setStreamed("");
    setRun(null);
    setError(null);
    setShowSent(false);
    setSentPackage(null);
    setCopied(false);

    insightsApi
      .run({
        button_id: button.id,
        ...(button.data_scope === "current_quote" && quoteId !== null
          ? { quote_id: quoteId }
          : {}),
      })
      .then((r) => {
        if (tokenRef.current !== token) return;
        const full = r.run.result_md ?? "";
        setRun(r.run);
        setPhase("streaming");
        // Progressive reveal — same cadence as the mockup (22ms, ~70 steps).
        let i = 0;
        const step = Math.max(4, Math.round(full.length / 70));
        timerRef.current = setInterval(() => {
          if (tokenRef.current !== token) {
            stopTimer();
            return;
          }
          i += step;
          if (i >= full.length) {
            stopTimer();
            setStreamed(full);
            setPhase("done");
          } else {
            setStreamed(full.slice(0, i));
          }
        }, 22);
      })
      .catch((e: unknown) => {
        if (tokenRef.current !== token) return;
        if (e instanceof ApiError && e.status === 400) {
          setError(ti("ins.pick_quote_first", locale));
        } else {
          setError(ti("ins.run_failed", locale));
        }
        setPhase("error");
      });

    return () => {
      tokenRef.current++;
      stopTimer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [button.id, quoteId, attempt]);

  const toggleSent = useCallback(() => {
    setShowSent((v) => {
      const next = !v;
      if (next && sentPackage === null && run) {
        insightsApi
          .runs()
          .then((r) => {
            const row = r.runs.find((x) => x.id === run.id);
            setSentPackage(row?.packaged_markdown ?? "—");
          })
          .catch(() => setSentPackage("—"));
      }
      return next;
    });
  }, [run, sentPackage]);

  const copyResult = () => {
    if (!run) return;
    void navigator.clipboard?.writeText(run.result_md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  const saveResult = () => {
    if (!run) return;
    const blob = new Blob([run.result_md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${button.button_key}-run-${run.id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const solid = phase === "done" || phase === "error";
  const declared = button.provider;
  const fellBack = run !== null && run.provider !== declared;
  const privacy = PROVIDER_META[declared]?.privacy === true;

  const panelSurface: CSSProperties = solid
    ? {
        background: "var(--surface)",
        border: "1px solid var(--border)",
      }
    : glassStyle;

  const metaColor = solid ? "var(--muted)" : "#9FB1CC";
  const titleColor = solid ? "var(--ink)" : "#fff";
  const headerBorder = solid ? "var(--border)" : "rgba(255,255,255,.16)";

  const actSecondary: CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 9,
    padding: "9px 14px",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12.5,
    fontWeight: 600,
    color: "var(--ink-2)",
  };

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
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 61,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "56px 20px",
          overflow: "auto",
          pointerEvents: "none",
        }}
      >
        <div
          role="dialog"
          aria-label={button.label}
          style={{
            pointerEvents: "auto",
            width: "100%",
            maxWidth: 720,
            ...panelSurface,
            borderRadius: 18,
            padding: "20px 22px",
            boxShadow: elevation.modal,
            animation: `dsins-pop ${motion.durationMs}ms ${motion.easing}`,
          }}
        >
          {/* header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              paddingBottom: 14,
              borderBottom: `1px solid ${headerBorder}`,
            }}
          >
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: titleColor, lineHeight: 1.25 }}>
                {button.label}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 7,
                  flexWrap: "wrap",
                }}
              >
                <ProviderBadge provider={declared} onSolid={solid} />
                <span
                  style={{ fontSize: 11, color: metaColor, fontVariantNumeric: "tabular-nums" }}
                >
                  {button.model} ·{" "}
                  {new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date())}
                </span>
                {fellBack && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: color.goldDeep,
                      background: "rgba(232,163,61,.16)",
                      borderRadius: 99,
                      padding: "3px 8px",
                    }}
                  >
                    ↳ {providerLabel(declared)} → {providerLabel(run!.provider)} ·{" "}
                    {ti("ins.fallback", locale)}
                  </span>
                )}
                {privacy && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#8FD3A0",
                      background: "rgba(78,138,90,.18)",
                      border: "1px solid rgba(78,138,90,.4)",
                      borderRadius: 99,
                      padding: "3px 8px",
                    }}
                  >
                    {ti("ins.privacy", locale)}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label={ti("ins.close", locale)}
              style={{
                flex: "none",
                width: 30,
                height: 30,
                borderRadius: 8,
                border: `1px solid ${headerBorder}`,
                background: "transparent",
                cursor: "pointer",
                color: metaColor,
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* packaging */}
          {phase === "packaging" && (
            <div
              style={{
                padding: "34px 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  border: "3px solid rgba(217,230,247,.25)",
                  borderTopColor: color.gold,
                  borderRadius: "50%",
                  animation: "dsins-spin 1s linear infinite",
                }}
              />
              <div style={{ fontSize: 13, color: color.ice, fontWeight: 600 }}>
                {ti("ins.packaging", locale)}
              </div>
              <div style={{ fontSize: 11, color: "#9FB1CC", fontFamily: font.mono }}>
                {ti("ins.uses", locale)} {scopeLabel(button.data_scope, locale)}
              </div>
            </div>
          )}

          {/* streaming (still glass — text only, no figures asserted yet) */}
          {phase === "streaming" && (
            <div style={{ padding: "16px 2px", maxHeight: "52vh", overflow: "auto" }}>
              <div
                style={{
                  fontSize: 13.5,
                  lineHeight: 1.7,
                  color: "#EAF1FB",
                  whiteSpace: "pre-wrap",
                }}
              >
                {streamed}
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 16,
                    background: color.gold,
                    verticalAlign: -2,
                    marginLeft: 2,
                    animation: "dsins-blink 1s step-end infinite",
                  }}
                />
              </div>
            </div>
          )}

          {/* error (solid) */}
          {phase === "error" && (
            <div style={{ padding: "18px 4px 6px" }}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  background: "rgba(192,80,77,.10)",
                  border: `1px solid rgba(192,80,77,.35)`,
                  borderRadius: 10,
                  padding: "12px 14px",
                }}
              >
                <span style={{ color: color.red, fontWeight: 800 }}>!</span>
                <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.55 }}>{error}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => setAttempt((a) => a + 1)} style={actSecondary}>
                  {ti("ins.rerun", locale)}
                </button>
                <button onClick={onClose} style={actSecondary}>
                  {ti("ins.close", locale)}
                </button>
              </div>
            </div>
          )}

          {/* done (solid rendered markdown) */}
          {phase === "done" && run && (
            <>
              <div style={{ maxHeight: "56vh", overflow: "auto", padding: "16px 4px 4px" }}>
                <MarkdownView source={run.result_md} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  paddingTop: 14,
                  marginTop: 8,
                  borderTop: "1px solid var(--border)",
                }}
              >
                <button
                  onClick={copyResult}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    background: color.gold,
                    border: "none",
                    borderRadius: 9,
                    padding: "9px 15px",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 12.5,
                    fontWeight: 800,
                    color: color.navy,
                  }}
                >
                  {copied ? ti("ins.copied", locale) : ti("ins.copy", locale)}
                </button>
                <button onClick={saveResult} style={actSecondary}>
                  {ti("ins.save", locale)}
                </button>
                <button onClick={() => setAttempt((a) => a + 1)} style={actSecondary}>
                  {ti("ins.rerun", locale)}
                </button>
                <button
                  onClick={toggleSent}
                  aria-expanded={showSent}
                  style={{
                    marginLeft: "auto",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    font: "inherit",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--muted)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  {ti("ins.what_sent", locale)}
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      transition: "transform .2s",
                      transform: showSent ? "rotate(180deg)" : "none",
                    }}
                  >
                    ▾
                  </span>
                </button>
              </div>
              {showSent && (
                <pre
                  style={{
                    margin: "12px 0 0",
                    background: color.navy,
                    borderRadius: 10,
                    padding: 14,
                    overflow: "auto",
                    maxHeight: "32vh",
                    fontFamily: font.mono,
                    fontSize: 11.5,
                    lineHeight: 1.6,
                    color: "#C9D8EE",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {`### ${ti("ins.sent_prompt", locale)}\n${button.label}\n\n### ${ti(
                    "ins.sent_package",
                    locale,
                  )}\n${sentPackage ?? ti("ins.sent_loading", locale)}`}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function ProviderBadge({
  provider,
  onSolid,
}: {
  provider: string;
  onSolid: boolean;
}) {
  const meta = PROVIDER_META[provider];
  if (meta?.privacy) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 10.5,
          fontWeight: 700,
          color: "#8FD3A0",
          background: "rgba(78,138,90,.18)",
          border: "1px solid rgba(78,138,90,.4)",
          borderRadius: 99,
          padding: "3px 9px",
        }}
      >
        {meta.label}
      </span>
    );
  }
  return (
    <span
      style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: onSolid ? "var(--ink-2)" : "#EAF1FB",
        background: onSolid ? "var(--surface-alt)" : "rgba(217,230,247,.14)",
        border: onSolid ? "1px solid var(--border)" : "1px solid rgba(217,230,247,.2)",
        borderRadius: 99,
        padding: "3px 9px",
      }}
    >
      {providerLabel(provider)}
    </span>
  );
}
