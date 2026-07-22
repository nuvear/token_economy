// Customer paper document — mockup: design/mockups/DealSpine Proposal Preview.dc.html.
// The paper is SOLID WHITE in both themes (it is a document); serif type.
// Content comes from GET /quotes/:id/proposal — the server builds it from the
// CustomerView whitelist, so internal cost/margin/floor figures are
// STRUCTURALLY absent (CI floor-leakage test guards this output).
// Proposal locale (EN/JA) is independent of the UI language; the deal
// currency is preserved either way.
import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet } from "../api";
import { useUi } from "../shell/Shell";
import { color, font, radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { Card, Kicker, PageHeader, SolidSegmented, GoldButton, StateChip } from "./parts/ui";

interface QuoteSummary {
  id: number;
  title: string;
  deal_currency: string;
  governance_state: string;
  engine_version: string;
  selected_revenue: number | null;
}

interface ProposalResponse {
  quote_id: number;
  locale: "en" | "ja";
  markdown: string;
  html: string;
}

const CUSTOMER_READY = new Set(["green", "approved", "won"]);

/** Serif document styles — shared by the live preview and the exported file. */
const PAPER_CSS = `
.ds-paper { font-family: ${font.serifProposal}; color: #16243D; line-height: 1.7; }
.ds-paper h1 { font-size: 24px; font-weight: 700; margin: 0 0 18px; letter-spacing: -.01em; }
.ds-paper h2 { font-size: 15px; font-weight: 700; margin: 26px 0 8px; border-bottom: 1px solid #E4E9F2; padding-bottom: 6px; }
.ds-paper p { font-size: 13.5px; margin: 8px 0; }
.ds-paper table { border-collapse: collapse; width: 100%; margin: 10px 0; font-variant-numeric: tabular-nums; }
.ds-paper th, .ds-paper td { border: 1px solid #E4E9F2; padding: 7px 12px; font-size: 13px; text-align: left; }
.ds-paper th { background: #EEF4FC; font-weight: 700; }
.ds-paper td:last-child, .ds-paper th:last-child { text-align: right; }
.ds-paper hr { border: none; border-top: 1px dashed #D9E6F7; margin: 24px 0 12px; }
.ds-paper strong { font-weight: 700; }
.ds-paper [lang="ja"], .ds-paper[lang="ja"] { line-height: 1.9; }
`;

function exportHtml(p: ProposalResponse, quote: QuoteSummary): void {
  const doc = `<!doctype html>
<html lang="${p.locale}">
<head>
<meta charset="utf-8">
<title>Proposal Q-${p.quote_id}</title>
<style>
body { margin: 0; padding: 48px 24px; background: #EEF4FC; }
.ds-sheet { max-width: 720px; margin: 0 auto; background: #fff; border-radius: 6px;
  box-shadow: 0 1px 2px rgba(22,36,61,.05); padding: 56px 60px; }
${PAPER_CSS}
</style>
</head>
<body>
<div class="ds-sheet ds-paper">
${p.html}
</div>
</body>
</html>
`;
  const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `proposal-Q${p.quote_id}-${quote.deal_currency}-${p.locale}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Proposal() {
  const { locale, user } = useUi();
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [quoteId, setQuoteId] = useState<number | null>(null);
  const [propLocale, setPropLocale] = useState<"en" | "ja">("en");
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canGenerate =
    user !== null && ["pricing_owner", "sales", "deal_desk"].includes(user.role);

  useEffect(() => {
    if (!canGenerate) return;
    apiGet<{ quotes: QuoteSummary[] }>("/quotes")
      .then((r) => {
        setQuotes(r.quotes);
        const ready = r.quotes.find((q) => CUSTOMER_READY.has(q.governance_state));
        setQuoteId((prev) => prev ?? ready?.id ?? r.quotes[0]?.id ?? null);
      })
      .catch(() => setQuotes([]));
  }, [canGenerate]);

  const load = useCallback(
    (id: number, loc: "en" | "ja") => {
      setLoading(true);
      setError(null);
      apiGet<ProposalResponse>(`/quotes/${id}/proposal?locale=${loc}`)
        .then((r) => setProposal(r))
        .catch((e: unknown) => {
          setProposal(null);
          if (e instanceof ApiError && e.status === 409) {
            setError(lt("proposal.not_ready", locale));
          } else if (e instanceof ApiError && e.status === 403) {
            setError(lt("proposal.no_access", locale));
          } else {
            setError(String(e));
          }
        })
        .finally(() => setLoading(false));
    },
    [locale],
  );

  useEffect(() => {
    if (quoteId !== null) load(quoteId, propLocale);
  }, [quoteId, propLocale, load]);

  const selected = quotes.find((q) => q.id === quoteId) ?? null;

  const excludedChip = (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: radius.pill,
        fontSize: 11,
        fontWeight: 700,
        color: "var(--pass-ink)",
        background: "rgba(78,138,90,.14)",
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden>✓</span>
      {lt("proposal.excluded_chip", locale)}
    </span>
  );

  if (!canGenerate) {
    return (
      <div style={{ maxWidth: 860 }}>
        <PageHeader
          locale={locale}
          kicker={lt("proposal.kicker", locale)}
          title={lt("proposal.title", locale)}
        />
        <Card>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 13.5 }}>
            {lt("proposal.no_access", locale)}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1120 }}>
      <style>{PAPER_CSS}</style>
      <PageHeader
        locale={locale}
        kicker={lt("proposal.kicker", locale)}
        title={lt("proposal.title", locale)}
        right={excludedChip}
      />

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        {/* Control column — solid */}
        <div style={{ width: 300, flexShrink: 0, display: "grid", gap: 14 }}>
          <Card>
            <Kicker locale={locale} style={{ fontSize: 10 }}>
              {lt("proposal.source_quote", locale)}
            </Kicker>
            {quotes.length === 0 ? (
              <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 0" }}>
                {lt("proposal.no_quotes", locale)}
              </p>
            ) : (
              <>
                <label style={{ display: "block", marginTop: 10 }}>
                  <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                    {lt("proposal.pick_quote", locale)}
                  </span>
                  <select
                    value={quoteId ?? ""}
                    onChange={(e) => setQuoteId(Number(e.target.value))}
                    style={{
                      font: "inherit",
                      fontSize: 13,
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: radius.field,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--ink)",
                    }}
                  >
                    {quotes.map((q) => (
                      <option key={q.id} value={q.id}>
                        Q-{q.id} · {q.title}
                      </option>
                    ))}
                  </select>
                </label>
                {selected && (
                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {lt("proposal.state_label", locale)}
                      </span>
                      <StateChip state={selected.governance_state} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {lt("proposal.deal_currency", locale)}
                      </span>
                      <span className="num" style={{ fontSize: 11.5, fontWeight: 700 }}>
                        {selected.deal_currency}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {lt("proposal.engine", locale)}
                      </span>
                      <span className="num" style={{ fontSize: 11.5, fontWeight: 700 }}>
                        {selected.engine_version}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <Card>
            <Kicker locale={locale} style={{ fontSize: 10 }}>
              {lt("proposal.language", locale)}
            </Kicker>
            <div style={{ marginTop: 10 }}>
              <SolidSegmented
                label={lt("proposal.language", locale)}
                options={[
                  { value: "en", label: "EN" },
                  { value: "ja", label: "日本語" },
                ]}
                value={propLocale}
                onChange={setPropLocale}
              />
            </div>
            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "10px 0 0", lineHeight: 1.6 }}>
              {lt("proposal.locale_note", locale)}
            </p>
          </Card>

          {/* Structural-exclusion assurance — solid, green-tinted */}
          <div
            style={{
              borderRadius: radius.card,
              padding: 16,
              background: "rgba(78,138,90,.10)",
              border: "1px solid rgba(78,138,90,.25)",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--pass-ink)" }}>
              {lt("proposal.assurance_title", locale)}
            </div>
            <p style={{ fontSize: 11.5, color: "var(--ink-2)", margin: "6px 0 0", lineHeight: 1.6 }}>
              {lt("proposal.assurance_body", locale)}
            </p>
          </div>

          <GoldButton
            disabled={!proposal || !selected}
            onClick={() => proposal && selected && exportHtml(proposal, selected)}
          >
            ⬇ {lt("proposal.export_html", locale)}
          </GoldButton>
        </div>

        {/* Paper — solid white in BOTH themes (it's a document) */}
        <div style={{ flex: 1, minWidth: 340 }}>
          {loading && (
            <Card>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
                {lt("proposal.loading", locale)}
              </p>
            </Card>
          )}
          {!loading && error && (
            <div
              style={{
                borderRadius: radius.card,
                padding: 18,
                background: "rgba(232,163,61,.12)",
                border: "1px solid rgba(232,163,61,.35)",
              }}
            >
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--warn-ink)" }}>
                {error}
              </p>
              {selected && (
                <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                  Q-{selected.id} · {selected.title} — {selected.governance_state}
                </p>
              )}
            </div>
          )}
          {!loading && !error && proposal && (
            <div
              className="ds-paper"
              lang={proposal.locale}
              style={{
                background: "#fff",
                borderRadius: radius.paper,
                boxShadow: "0 1px 2px rgba(22,36,61,.05), 0 12px 40px rgba(11,18,32,.10)",
                border: `1px solid ${color.gridline}`,
                padding: "52px 56px",
                maxWidth: 760,
              }}
              // Server-rendered proposal HTML: built exclusively from the
              // CustomerView whitelist and escaped server-side.
              dangerouslySetInnerHTML={{ __html: proposal.html }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
