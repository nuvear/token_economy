// Deal-desk queue — mockup: design/mockups/DealSpine Approvals.dc.html
// Queue cards with quantified context · detail panel · approve / re-scope /
// no-bid with mandatory rationale (+expiry for overrides) · audit trail.
// HARD RULE (server-enforced, surfaced here): author ≠ approver.
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError, auth, type User } from "../api";
import { fmtDate, fmtMoney, fmtPct, type Locale } from "../i18n";
import { color, radius } from "../tokens";
import { useUi } from "../shell/Shell";
import { tx } from "./govern/i18n";
import {
  btnGhost,
  btnPrimary,
  cardStyle,
  compactMoney,
  Markdown,
  MetricTile,
  parseUtc,
  Pill,
  Sheet,
  sheetCancelBtn,
  sheetLabel,
  useToast,
  type Tone,
} from "./govern/ui";

// ——— API shapes ———

interface ApprovalRow {
  id: number;
  quote_id: number;
  requested_by: number;
  approver_user_id: number | null;
  status: "pending" | "approved" | "rejected";
  rationale_md: string | null;
  decision_md: string | null;
  expires_at: string | null;
  created_at: string;
  decided_at: string | null;
  quote_title: string;
  governance_state: string;
}

interface GateOut {
  label: string;
  pass: boolean;
  severity: "hard" | "warning";
}

interface QuoteDetail {
  id: number;
  author_user_id: number;
  title: string;
  deal_currency: string;
  governance_state: string;
  input_snapshot: { discountPct: number; openingBandPct: number };
  outputs: {
    selected: { revenue: number; profit: number; marginPct: number };
    legacyBreakevenDiscount: number;
    maxSafeDiscount: number;
    gates: GateOut[];
    governance: { title: string; message: string };
  } | null;
}

interface EventRow {
  id: number;
  actor_user_id: number | null;
  actor_name: string | null;
  event_type: string;
  entity_type: string;
  entity_id: number | null;
  details_md: string | null;
  created_at: string;
}

type SheetKind = "approve" | "re_scope" | "no_bid";

const SLA_HOURS = 24;

function slaOf(a: ApprovalRow, locale: Locale): { label: string; tone: Tone } {
  if (a.status !== "pending") return { label: tx("appr.resolved", locale), tone: "neutral" };
  const left = SLA_HOURS - (Date.now() - parseUtc(a.created_at).getTime()) / 3600e3;
  if (left <= 0) return { label: tx("appr.overdue", locale), tone: "red" };
  const h = Math.max(1, Math.round(left));
  return { label: `${h}h`, tone: left <= 6 ? "red" : left <= 12 ? "gold" : "green" };
}

function stateTone(state: string): Tone {
  if (state === "blocked" || state === "rejected") return "red";
  if (state === "warning") return "gold";
  if (state === "green" || state === "approved") return "green";
  return "neutral";
}

function statusLabel(status: ApprovalRow["status"], locale: Locale): string {
  return tx(`appr.status_${status}`, locale);
}

export default function Approvals() {
  const ui = useUi();
  const { locale, user } = ui;
  const { toastNode, showToast } = useToast();

  const [approvals, setApprovals] = useState<ApprovalRow[] | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [quotes, setQuotes] = useState<Record<number, QuoteDetail | null>>({});
  const [events, setEvents] = useState<EventRow[]>([]);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const [form, setForm] = useState({ rationale: "", expiry: "", error: "", busy: false });

  const isDesk = user?.role === "deal_desk";

  const reload = useCallback(() => {
    apiGet<{ approvals: ApprovalRow[] }>("/approvals")
      .then((r) => {
        setApprovals(r.approvals);
        setSelectedId((cur) => cur ?? r.approvals[0]?.id ?? null);
      })
      .catch(() => setApprovals([]));
  }, []);

  useEffect(() => {
    reload();
    auth.users().then((r) => setUsers(r.users)).catch(() => undefined);
    if (user?.role === "pricing_owner") {
      apiGet<{ events: EventRow[] }>("/events?limit=500")
        .then((r) => setEvents(r.events))
        .catch(() => undefined);
    }
  }, [reload, user?.role]);

  const sel = useMemo(
    () => approvals?.find((a) => a.id === selectedId) ?? null,
    [approvals, selectedId],
  );

  // Lazy-load quantified context for the selected approval's quote.
  useEffect(() => {
    if (!sel || sel.quote_id in quotes) return;
    apiGet<{ quote: QuoteDetail }>(`/quotes/${sel.quote_id}`)
      .then((r) => setQuotes((q) => ({ ...q, [sel.quote_id]: r.quote })))
      .catch(() => setQuotes((q) => ({ ...q, [sel.quote_id]: null })));
  }, [sel, quotes]);

  const userName = useCallback(
    (id: number | null) => users.find((u) => u.id === id)?.full_name ?? (id ? `#${id}` : "system"),
    [users],
  );

  const openSheet = (kind: SheetKind) => {
    setForm({ rationale: "", expiry: "", error: "", busy: false });
    setSheet(kind);
  };

  const confirm = async () => {
    if (!sel || !sheet) return;
    const needExpiry = sheet === "approve";
    if (!form.rationale.trim() || (needExpiry && !form.expiry)) {
      setForm((f) => ({
        ...f,
        error: tx(needExpiry ? "appr.err_rationale_expiry" : "appr.err_rationale", locale),
      }));
      return;
    }
    setForm((f) => ({ ...f, busy: true, error: "" }));
    try {
      await apiPost(`/approvals/${sel.id}/decision`, {
        action: sheet,
        rationale: form.rationale.trim(),
        expires_at: form.expiry || undefined,
      });
      setSheet(null);
      showToast(`${sel.quote_title} — ${tx("appr.decided_toast", locale)}`);
      reload();
    } catch (e) {
      const msg =
        e instanceof ApiError &&
        (e.body as { error?: string } | null)?.error === "author_cannot_approve_own_quote"
          ? tx("appr.err_own_quote", locale)
          : tx("common.error", locale);
      setForm((f) => ({ ...f, busy: false, error: msg }));
    }
  };

  // ——— Derived detail ———

  const quote = sel ? quotes[sel.quote_id] : undefined;
  const outputs = quote?.outputs ?? null;
  const currency = quote?.deal_currency ?? "USD";
  const pendingCount = approvals?.filter((a) => a.status === "pending").length ?? 0;

  const audit = useMemo(() => {
    if (!sel) return [];
    const rows: { event: string; actor: string; time: string; note: string }[] = [];
    rows.push({
      event: tx("appr.event_requested", locale),
      actor: userName(sel.requested_by),
      time: sel.created_at,
      note: sel.rationale_md ?? "",
    });
    for (const e of events) {
      if (e.entity_type === "approval" && e.entity_id === sel.id && e.event_type !== "approval_requested") {
        rows.push({
          event: e.event_type.replace(/_/g, " "),
          actor: e.actor_name ?? "system",
          time: e.created_at,
          note: e.details_md ?? "",
        });
      }
    }
    if (sel.decided_at && !events.some((e) => e.entity_type === "approval" && e.entity_id === sel.id && e.event_type === "approval_decided")) {
      rows.push({
        event: tx("appr.event_decided", locale),
        actor: userName(sel.approver_user_id),
        time: sel.decided_at,
        note: sel.decision_md ?? "",
      });
    }
    return rows;
  }, [sel, events, locale, userName]);

  const sheetMeta = sheet
    ? {
        approve: {
          kicker: tx("appr.approve_kicker", locale),
          accent: color.gold,
          title: tx("appr.approve_title", locale),
          placeholder: tx("appr.approve_placeholder", locale),
          expiryLabel: tx("appr.approve_expiry", locale),
          expiryHint: tx("appr.approve_expiry_hint", locale),
          confirm: tx("appr.approve_confirm", locale),
          confirmBg: color.gold,
          confirmColor: color.navy,
          needExpiry: true,
        },
        re_scope: {
          kicker: tx("appr.rescope_kicker", locale),
          accent: color.gold,
          title: tx("appr.rescope_title", locale),
          placeholder: tx("appr.rescope_placeholder", locale),
          expiryLabel: tx("appr.rescope_expiry", locale),
          expiryHint: tx("appr.rescope_expiry_hint", locale),
          confirm: tx("appr.rescope_confirm", locale),
          confirmBg: color.gold,
          confirmColor: color.navy,
          needExpiry: false,
        },
        no_bid: {
          kicker: tx("appr.nobid_kicker", locale),
          accent: color.red,
          title: tx("appr.nobid_title", locale),
          placeholder: tx("appr.nobid_placeholder", locale),
          expiryLabel: "",
          expiryHint: "",
          confirm: tx("appr.nobid_confirm", locale),
          confirmBg: color.red,
          confirmColor: "#fff",
          needExpiry: false,
        },
      }[sheet]
    : null;

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* Header */}
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
          <div className="kicker" lang={locale === "ja" ? "ja" : undefined}>
            {tx("appr.kicker", locale)}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em" }}>
            {tx("appr.title", locale)}
          </h1>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
            {tx("appr.subtitle", locale)}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: radius.pill,
            padding: "7px 14px",
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color.gold }} />
          <span style={{ fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {pendingCount} {tx("appr.pending_n", locale)}
          </span>
        </div>
      </div>

      {!isDesk && (
        <div
          style={{
            ...cardStyle,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 12,
            color: "var(--muted)",
          }}
        >
          {tx("appr.read_only_role", locale)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,372px) minmax(0,1fr)", gap: 20, alignItems: "start" }}>
        {/* Queue list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="kicker" lang={locale === "ja" ? "ja" : undefined} style={{ fontSize: 10 }}>
            {tx("appr.queue", locale)} · {approvals?.length ?? 0}
          </div>
          {approvals === null && (
            <div style={{ ...cardStyle, color: "var(--muted)", fontSize: 12.5 }}>
              {tx("common.loading", locale)}
            </div>
          )}
          {approvals?.length === 0 && (
            <div style={{ ...cardStyle, color: "var(--muted)", fontSize: 12.5 }}>
              {tx("appr.empty", locale)}
            </div>
          )}
          {approvals?.map((a) => {
            const selected = a.id === selectedId;
            const sla = slaOf(a, locale);
            const q = quotes[a.quote_id];
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                aria-pressed={selected}
                style={{
                  textAlign: "left",
                  width: "100%",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  background: selected ? "var(--surface)" : "var(--surface-alt)",
                  border: `1.5px solid ${selected ? color.gold : "var(--border)"}`,
                  borderRadius: 13,
                  padding: 14,
                  boxShadow: selected ? "0 6px 20px rgba(11,18,32,.12)" : "0 1px 2px rgba(11,18,32,.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)", lineHeight: 1.3 }}>
                      {a.quote_title}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                      Q-{a.quote_id} · {userName(a.requested_by)}
                    </div>
                  </div>
                  <Pill tone={a.status === "pending" ? "blue" : a.status === "approved" ? "green" : "red"}>
                    {statusLabel(a.status, locale)}
                  </Pill>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
                  <Pill tone={stateTone(a.governance_state)}>{a.governance_state.toUpperCase()}</Pill>
                  {q?.outputs && (
                    <span style={{ fontSize: 11, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                      d {q.input_snapshot.discountPct}% · {compactMoney(q.outputs.selected.profit, q.deal_currency, locale)}
                    </span>
                  )}
                  <span style={{ marginLeft: "auto" }}>
                    {a.status === "pending" ? (
                      <Pill tone={sla.tone}>
                        {tx("appr.sla", locale)} {sla.label}
                      </Pill>
                    ) : (
                      <span style={{ fontSize: 10.5, color: "var(--faint)" }}>—</span>
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {sel && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                boxShadow: "0 1px 2px rgba(11,18,32,.06)",
                overflow: "hidden",
              }}
            >
              {/* Navy hero header (solid dark panel) */}
              <div
                style={{
                  padding: 18,
                  background: `linear-gradient(135deg, ${color.navy}, ${color.navy2})`,
                  borderBottom: `3px solid ${
                    stateTone(sel.governance_state) === "red"
                      ? color.red
                      : stateTone(sel.governance_state) === "green"
                        ? color.green
                        : color.goldDeep
                  }`,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: ".12em",
                        textTransform: "uppercase",
                        color:
                          stateTone(sel.governance_state) === "red"
                            ? "#E89B99"
                            : stateTone(sel.governance_state) === "green"
                              ? "#8FD3A0"
                              : color.gold,
                      }}
                    >
                      {outputs?.governance.title ?? sel.governance_state}
                    </div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "#fff", marginTop: 5 }}>
                      {sel.quote_title}
                    </div>
                    <div style={{ fontSize: 12, color: "#9FB1CC", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      Q-{sel.quote_id} · {tx("appr.requested_by", locale)} {userName(sel.requested_by)} ·{" "}
                      {fmtDate(parseUtc(sel.created_at), locale)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9, letterSpacing: ".1em", color: "#9FB1CC", textTransform: "uppercase" }}>
                      {tx("appr.sla_left", locale)}
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        fontVariantNumeric: "tabular-nums",
                        color:
                          sel.status !== "pending"
                            ? "#9FB1CC"
                            : slaOf(sel, locale).tone === "red"
                              ? "#E89B99"
                              : slaOf(sel, locale).tone === "gold"
                                ? color.gold
                                : "#8FD3A0",
                      }}
                    >
                      {slaOf(sel, locale).label}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 18 }}>
                {/* Quantified metric grid */}
                {outputs ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(112px,1fr))", gap: 10 }}>
                    <MetricTile
                      label={tx("appr.metric_revenue", locale)}
                      value={fmtMoney(outputs.selected.revenue, currency, locale)}
                    />
                    <MetricTile
                      label={tx("appr.metric_gp", locale)}
                      value={fmtMoney(outputs.selected.profit, currency, locale)}
                      tone={outputs.selected.profit < 0 ? "red" : "accent"}
                    />
                    <MetricTile
                      label={tx("appr.metric_discount", locale)}
                      value={fmtPct(quote!.input_snapshot.discountPct / 100, locale, 0)}
                    />
                    <MetricTile
                      label={tx("appr.metric_floor", locale)}
                      value={fmtPct(outputs.legacyBreakevenDiscount, locale)}
                    />
                    <MetricTile
                      label={tx("appr.metric_band", locale)}
                      value={fmtPct(quote!.input_snapshot.openingBandPct / 100, locale, 0)}
                    />
                    <MetricTile
                      label={tx("appr.metric_risk", locale)}
                      value={fmtPct(outputs.maxSafeDiscount, locale)}
                      sub={tx("appr.engine_bound", locale)}
                    />
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{tx("common.loading", locale)}</div>
                )}

                {/* Gate flags */}
                {outputs && (
                  <div style={{ marginTop: 16 }}>
                    <div className="kicker" lang={locale === "ja" ? "ja" : undefined} style={{ fontSize: 10 }}>
                      {tx("appr.gate_flags", locale)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {outputs.gates
                        .filter((g) => !g.pass)
                        .map((g) => (
                          <Pill key={g.label} tone={g.severity === "hard" ? "red" : "gold"}>
                            {g.severity === "hard" ? "FAIL" : "WARN"} · {g.label}
                          </Pill>
                        ))}
                      <Pill tone="green">
                        {outputs.gates.filter((g) => g.pass).length} {tx("appr.gates_pass", locale)}
                      </Pill>
                    </div>
                  </div>
                )}

                {/* Requester rationale */}
                <div style={{ marginTop: 16 }}>
                  <div className="kicker" lang={locale === "ja" ? "ja" : undefined} style={{ fontSize: 10 }}>
                    {tx("appr.rationale", locale)}
                  </div>
                  <div
                    style={{
                      background: "var(--surface-alt)",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      padding: "10px 16px",
                      marginTop: 8,
                    }}
                  >
                    <Markdown src={sel.rationale_md ?? ""} />
                  </div>
                </div>

                {/* Decision (resolved approvals) */}
                {sel.decision_md && (
                  <div style={{ marginTop: 16 }}>
                    <div className="kicker" lang={locale === "ja" ? "ja" : undefined} style={{ fontSize: 10 }}>
                      {tx("appr.decision", locale)}
                    </div>
                    <div
                      style={{
                        background:
                          sel.status === "approved" ? "rgba(78,138,90,.10)" : "rgba(192,80,77,.08)",
                        border: `1px solid ${sel.status === "approved" ? "rgba(78,138,90,.35)" : "rgba(192,80,77,.3)"}`,
                        borderRadius: 10,
                        padding: "10px 16px",
                        marginTop: 8,
                      }}
                    >
                      <Markdown src={sel.decision_md} />
                      {sel.expires_at && (
                        <div style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
                          {tx("appr.expires", locale)}: {fmtDate(sel.expires_at, locale)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Audit trail (append-only) */}
            <section style={{ ...cardStyle, borderRadius: 14 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <div className="kicker" lang={locale === "ja" ? "ja" : undefined}>
                  {tx("appr.audit_trail", locale)}
                </div>
                <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{tx("appr.append_only", locale)}</span>
              </div>
              <div style={{ marginTop: 14, display: "flex", flexDirection: "column" }}>
                {audit.map((a, i) => {
                  const isLast = i === audit.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", gap: 12 }}>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <span
                          style={{
                            width: 11,
                            height: 11,
                            borderRadius: "50%",
                            flexShrink: 0,
                            marginTop: 3,
                            background: isLast && sel.status !== "pending" ? color.gold : "#B7C6DD",
                          }}
                        />
                        {!isLast && <span style={{ width: 2, flex: 1, background: "var(--border)", margin: "2px 0" }} />}
                      </div>
                      <div style={{ paddingBottom: 16, flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink)" }}>{a.event}</span>
                          <span style={{ fontSize: 11, color: "var(--muted)" }}>{a.actor}</span>
                          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtDate(parseUtc(a.time), locale)}
                          </span>
                        </div>
                        {a.note && (
                          <div style={{ fontSize: 12, marginTop: 4 }}>
                            <Markdown src={a.note} />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Action bar — deal desk only, pending only */}
            {isDesk && sel.status === "pending" && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  position: "sticky",
                  bottom: 16,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: "0 8px 30px rgba(11,18,32,.12)",
                }}
              >
                <button onClick={() => openSheet("approve")} style={{ ...btnPrimary, flex: 1, minWidth: 140, padding: 12 }}>
                  ✓ {tx("appr.approve", locale)}
                </button>
                <button
                  onClick={() => openSheet("re_scope")}
                  style={{ ...btnGhost, flex: 1, minWidth: 140, padding: 12, border: "1.5px solid #3A5F94", color: "#3A5F94" }}
                >
                  ↻ {tx("appr.rescope", locale)}
                </button>
                <button
                  onClick={() => openSheet("no_bid")}
                  style={{ ...btnGhost, flex: 1, minWidth: 140, padding: 12, border: `1.5px solid ${color.red}`, color: color.red }}
                >
                  ✕ {tx("appr.nobid", locale)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Decision sheet (glass — navigation layer) */}
      {sheet && sheetMeta && sel && (
        <Sheet
          glassStop={ui.glassStop}
          kicker={sheetMeta.kicker}
          accent={sheetMeta.accent}
          title={sheetMeta.title}
          subtitle={`Q-${sel.quote_id} · ${sel.quote_title}`}
          onClose={() => setSheet(null)}
          footer={
            <>
              <button onClick={() => setSheet(null)} style={sheetCancelBtn}>
                {tx("common.cancel", locale)}
              </button>
              <button
                onClick={() => void confirm()}
                disabled={form.busy}
                style={{
                  flex: 1,
                  background: sheetMeta.confirmBg,
                  border: "none",
                  borderRadius: 10,
                  padding: 12,
                  cursor: form.busy ? "wait" : "pointer",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 800,
                  color: sheetMeta.confirmColor,
                }}
              >
                {sheetMeta.confirm}
              </button>
            </>
          }
        >
          <div>
            <label style={sheetLabel}>
              {tx("appr.decision_rationale", locale)} <span style={{ color: "#E89B99" }}>*</span>
            </label>
            <div style={{ fontSize: 11, color: "#9FB1CC", margin: "3px 0 6px" }}>
              {tx("appr.markdown_ok", locale)}
            </div>
            <textarea
              value={form.rationale}
              onChange={(e) => setForm((f) => ({ ...f, rationale: e.target.value, error: "" }))}
              rows={5}
              placeholder={sheetMeta.placeholder}
              style={{
                width: "100%",
                background: "#fff",
                border: `1px solid ${form.error && !form.rationale.trim() ? color.red : "#C9D6EA"}`,
                borderRadius: 10,
                padding: 11,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12.5,
                lineHeight: 1.6,
                color: color.navy,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
          {sheetMeta.expiryLabel && (
            <div>
              <label style={sheetLabel}>
                {sheetMeta.expiryLabel}{" "}
                {sheetMeta.needExpiry && <span style={{ color: "#E89B99" }}>*</span>}
              </label>
              <input
                type="date"
                value={form.expiry}
                onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value, error: "" }))}
                style={{
                  width: "100%",
                  marginTop: 6,
                  background: "#fff",
                  border: `1px solid ${form.error && sheetMeta.needExpiry && !form.expiry ? color.red : "#C9D6EA"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 600,
                  color: color.navy,
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 11, color: "#9FB1CC", marginTop: 6 }}>{sheetMeta.expiryHint}</div>
            </div>
          )}
          {form.error && (
            <div
              style={{
                display: "flex",
                gap: 8,
                background: "rgba(192,80,77,.16)",
                border: "1px solid rgba(192,80,77,.35)",
                borderRadius: 9,
                padding: "10px 12px",
              }}
            >
              <span style={{ color: "#E89B99", fontWeight: 800 }}>!</span>
              <div style={{ fontSize: 12, color: "#EAD3D2", lineHeight: 1.5 }}>{form.error}</div>
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 9,
              padding: "10px 12px",
            }}
          >
            <span style={{ color: "#9FB1CC", fontWeight: 800 }}>i</span>
            <div style={{ fontSize: 11.5, color: "#C9D8EE", lineHeight: 1.5 }}>
              {tx("appr.audit_note", locale)}
            </div>
          </div>
        </Sheet>
      )}

      {toastNode}
    </div>
  );
}
