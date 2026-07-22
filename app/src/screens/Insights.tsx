// Insights — the AI-native prompt-button wall (mockup:
// design/mockups/DealSpine Insights.dc.html). Category-grouped glass
// capsules with provider badge + data-scope chip; click → run panel
// (packaging → streaming reveal → solid Markdown card + what-was-sent);
// Insight Studio sheet for builder-flagged users.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUi } from "../shell/Shell";
import { t } from "../i18n";
import { color, elevation } from "../tokens";
import {
  categoryLabel,
  categoryOf,
  CATEGORY_ORDER,
  glassCss,
  insightsApi,
  scopeLabel,
  ti,
  type Category,
  type InsightButton,
  type QuoteSummary,
} from "../components/insights/insightsShared";
import { ProviderBadge, RunPanel } from "../components/insights/RunPanel";
import { InsightStudio } from "../components/insights/InsightStudio";

const CATEGORY_ICON: Record<Category, string> = {
  deal: "⚖",
  portfolio: "▦",
  delivery: "◎",
  strategy: "✦",
};

export default function Insights() {
  const { locale, glassStop, user } = useUi();
  const gb = useMemo(() => glassCss(glassStop), [glassStop]);
  const ja = locale === "ja";

  const [buttons, setButtons] = useState<InsightButton[]>([]);
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [active, setActive] = useState<InsightButton | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isBuilder = user !== null && (user.is_builder || user.role === "pricing_owner");

  const loadButtons = useCallback(() => {
    insightsApi
      .buttons()
      .then((r) => setButtons(r.buttons))
      .catch(() => setButtons([]));
  }, []);

  useEffect(() => {
    loadButtons();
    insightsApi
      .quotes()
      .then((r) => {
        setQuotes(r.quotes);
        setQuoteId((cur) => cur ?? r.quotes[0]?.id ?? null);
      })
      .catch(() => setQuotes([]));
  }, [loadButtons]);

  useEffect(
    () => () => {
      if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    },
    [],
  );

  const showToast = (msg: string) => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(""), 2200);
  };

  const grouped = useMemo(
    () =>
      CATEGORY_ORDER.map((cat) => ({
        cat,
        buttons: buttons.filter((b) => categoryOf(b.data_scope) === cat),
      })).filter((g) => g.buttons.length > 0),
    [buttons],
  );

  const dealButtons = useMemo(
    () => buttons.filter((b) => b.data_scope === "current_quote").slice(0, 3),
    [buttons],
  );

  const selectedQuote = quotes.find((q) => q.id === quoteId) ?? null;

  const kickerStyle = ja
    ? { color: color.goldDeep, fontSize: 11.5, fontWeight: 700 }
    : {
        color: color.goldDeep,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: ".14em",
        textTransform: "uppercase" as const,
      };

  return (
    <div style={{ maxWidth: 1160 }}>
      {/* screen-scoped keyframes + capsule hover (no shared css edits) */}
      <style>{`
        @keyframes dsins-pop{0%{transform:translateY(14px) scale(.97);opacity:0}100%{transform:none;opacity:1}}
        @keyframes dsins-scrim{0%{opacity:0}100%{opacity:1}}
        @keyframes dsins-blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes dsins-spin{100%{transform:rotate(360deg)}}
        @keyframes dsins-sheet{0%{transform:translateX(30px);opacity:0}100%{transform:none;opacity:1}}
        .dsins-cap{transition:transform .18s cubic-bezier(.2,.7,.2,1),box-shadow .18s}
        .dsins-cap:hover{transform:translateY(-3px);box-shadow:0 14px 40px rgba(11,18,32,.30)}
        .dsins-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(268px,1fr));gap:14px}
      `}</style>

      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={kickerStyle}>{ti("ins.kicker", locale)}</div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              margin: "6px 0 0",
              letterSpacing: "-.01em",
              color: "var(--ink)",
            }}
          >
            {t("nav.insights", locale)}
          </h1>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
            {ti("ins.sub", locale)}
          </div>
        </div>
        {isBuilder && (
          <button
            onClick={() => setStudioOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
              background: color.navy,
              border: "none",
              borderRadius: 99,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              color: "#fff",
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span aria-hidden style={{ color: color.gold, fontWeight: 800 }}>
              +
            </span>
            {ti("ins.new_button", locale)}
          </button>
        )}
      </div>

      {/* builder seed hint — solid surface */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "var(--surface-alt)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <span aria-hidden style={{ fontSize: 18, color: color.goldDeep }}>
          ✦
        </span>
        <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--ink)" }}>{ti("ins.seed_title", locale)}</strong> —{" "}
          {ti("ins.seed_body", locale)}
        </div>
      </div>

      {/* context run-bar — glass chrome capsule */}
      <div
        style={{
          ...gb,
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
          borderRadius: 14,
          padding: "12px 16px",
          boxShadow: "0 8px 28px rgba(11,18,32,.16)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            paddingRight: 6,
            borderRight: "1px solid rgba(255,255,255,.16)",
          }}
        >
          <span
            aria-hidden
            style={{ width: 7, height: 7, borderRadius: "50%", background: color.gold }}
          />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
            {ti("ins.for_this_deal", locale)}
          </span>
          {quotes.length > 0 ? (
            <select
              value={quoteId ?? ""}
              onChange={(e) => setQuoteId(Number(e.target.value))}
              aria-label={ti("ins.for_this_deal", locale)}
              style={{
                background: "rgba(255,255,255,.1)",
                border: "1px solid rgba(255,255,255,.18)",
                borderRadius: 99,
                color: "#EAF1FB",
                fontSize: 11,
                fontWeight: 600,
                padding: "4px 10px",
                font: "inherit",
                maxWidth: 220,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {quotes.map((q) => (
                <option key={q.id} value={q.id} style={{ color: color.navy }}>
                  Q-{q.id} · {q.title}
                </option>
              ))}
            </select>
          ) : (
            <span style={{ fontSize: 11, color: "#9FB1CC" }}>{ti("ins.no_quotes", locale)}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {dealButtons.map((b) => (
            <button
              key={b.id}
              onClick={() => setActive(b)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                background: "rgba(255,255,255,.08)",
                border: "1px solid rgba(255,255,255,.14)",
                borderRadius: 99,
                padding: "6px 12px",
                cursor: "pointer",
                font: "inherit",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#EAF1FB",
                  whiteSpace: "nowrap",
                }}
              >
                {b.label.length > 34 ? `${b.label.slice(0, 32)}…` : b.label}
              </span>
              <ProviderBadge provider={b.provider} onSolid={false} />
            </button>
          ))}
        </div>
      </div>

      {/* category sections — glass capsule wall */}
      {buttons.length === 0 && (
        <div style={{ marginTop: 26, color: "var(--muted)", fontSize: 13 }}>
          {ti("ins.no_buttons", locale)}
        </div>
      )}
      {grouped.map((g) => (
        <section key={g.cat} style={{ marginTop: 26 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 }}>
            <div className="kicker" lang={ja ? "ja" : undefined}>
              {categoryLabel(g.cat, locale)}
            </div>
            <span
              className="num"
              style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}
            >
              {g.buttons.length}
            </span>
          </div>
          <div className="dsins-grid">
            {g.buttons.map((b) => (
              <button
                key={b.id}
                className="dsins-cap"
                onClick={() => setActive(b)}
                style={{
                  ...gb,
                  borderRadius: 16,
                  padding: 16,
                  cursor: "pointer",
                  font: "inherit",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: elevation.card,
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1.3,
                    }}
                  >
                    {b.label}
                  </div>
                  <span aria-hidden style={{ fontSize: 15, opacity: 0.9, flex: "none", color: "#EAF1FB" }}>
                    {CATEGORY_ICON[g.cat]}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#AEC0DA",
                    lineHeight: 1.5,
                    marginTop: 7,
                    minHeight: 34,
                  }}
                >
                  {b.description_md ?? ""}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    marginTop: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <ProviderBadge provider={b.provider} onSolid={false} />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "#9FB1CC",
                      background: "rgba(217,230,247,.1)",
                      border: "1px solid rgba(217,230,247,.14)",
                      borderRadius: 99,
                      padding: "3px 9px",
                    }}
                  >
                    <span aria-hidden>▣</span>
                    {scopeLabel(b.data_scope, locale)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}

      {/* run overlay */}
      {active && (
        <RunPanel
          button={active}
          quoteId={active.data_scope === "current_quote" ? (selectedQuote?.id ?? null) : null}
          locale={locale}
          glassStyle={gb}
          onClose={() => setActive(null)}
        />
      )}

      {/* Insight Studio (builder only) */}
      {studioOpen && isBuilder && (
        <InsightStudio
          locale={locale}
          glassStyle={gb}
          quotes={quotes}
          selectedQuoteId={quoteId}
          onClose={() => setStudioOpen(false)}
          onPublished={(b) => {
            setStudioOpen(false);
            loadButtons();
            showToast(`${ti("studio.published", locale)} · ${categoryLabel(categoryOf(b.data_scope), locale)}`);
          }}
        />
      )}

      {/* toast */}
      {toast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 80,
            background: color.navy,
            color: "#fff",
            border: "1px solid rgba(255,255,255,.16)",
            borderRadius: 99,
            padding: "11px 20px",
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 12px 40px rgba(11,18,32,.4)",
            animation: "dsins-pop .3s",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
