// Pricing-owner studio — mockup: design/mockups/DealSpine Policy Studio.dc.html
// Offerings table · versioned parameter sets (draft → diff → publish, published
// = immutable server-side) · rate-card editor · staleness (reprice) indicator.
// Read-only for every role except pricing_owner (§2 row 1).
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, apiPost, ApiError, type Offering } from "../api";
import { fmtDate, fmtNumber, type Locale } from "../i18n";
import { color, radius } from "../tokens";
import { useUi } from "../shell/Shell";
import { tx } from "./govern/i18n";
import {
  btnDisabled,
  btnGhost,
  btnPrimary,
  cardStyle,
  parseUtc,
  Pill,
  Segmented,
  Sheet,
  sheetCancelBtn,
  sheetLabel,
  tdStyle,
  thStyle,
  useToast,
  type Tone,
} from "./govern/ui";

// ——— API shapes ———

type Params = Record<string, unknown>;

interface OfferingFull extends Offering {
  population_label: string | null;
  scope_label: string | null;
  base_inputs_json: string;
  created_at: string;
}

interface PsRow {
  id: number;
  offering_id: number;
  version: string;
  status: "draft" | "published" | "retired";
  notes_md: string | null;
  published_by: number | null;
  published_at: string | null;
  created_at: string;
}

interface PsFull extends PsRow {
  parameters_json: string;
}

interface Bundle {
  offering: OfferingFull;
  sets: PsRow[];
  published: { row: PsRow; params: Params } | null;
  draft: { row: PsRow; params: Params } | null;
}

type Tab = "offerings" | "rates" | "versions";

interface EditorState {
  offeringId: number;
  draftId: number | null;
  version: string;
  baseParams: Params;
  values: Record<string, string>;
  note: string;
  error: string;
  busy: boolean;
}

// ——— Helpers ———

function parseParams(json: string): Params {
  try {
    return JSON.parse(json) as Params;
  } catch {
    return {};
  }
}

function humanize(key: string): string {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function numericEntries(p: Params): [string, number][] {
  return Object.entries(p).filter((e): e is [string, number] => typeof e[1] === "number");
}

function effectiveParams(b: Bundle): Params {
  return b.published?.params ?? parseParams(b.offering.base_inputs_json);
}

function staleness(b: Bundle, locale: Locale): { label: string; tone: Tone; days: number } {
  const at = b.published?.row.published_at ?? b.offering.created_at;
  const days = Math.round((Date.now() - parseUtc(at).getTime()) / 86400e3);
  if (days > 180) return { label: tx("pol.stale_overdue", locale), tone: "red", days };
  if (days >= 90) return { label: tx("pol.stale_due", locale), tone: "gold", days };
  return { label: tx("pol.stale_current", locale), tone: "green", days };
}

function fmtVal(v: unknown, locale: Locale): string {
  return typeof v === "number" ? fmtNumber(v, locale) : String(v ?? "—");
}

/** PUT helper (shared api.ts exposes only GET/POST — inlined locally per file ownership). */
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

export default function PolicyStudio() {
  const ui = useUi();
  const { locale, user } = ui;
  const isOwner = user?.role === "pricing_owner";
  const { toastNode, showToast } = useToast();

  const [bundles, setBundles] = useState<Record<number, Bundle>>({});
  const [offerings, setOfferings] = useState<Offering[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("offerings");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);

  const loadBundle = useCallback(async (offeringId: number) => {
    const detail = await apiGet<{ offering: OfferingFull; parameter_sets: PsRow[] }>(
      `/offerings/${offeringId}`,
    );
    const sets = detail.parameter_sets.slice().sort((a, b) => b.id - a.id);
    const pubRow = sets.find((s) => s.status === "published") ?? null;
    const draftRow = sets.find((s) => s.status === "draft") ?? null;
    const fetchFull = async (row: PsRow | null) => {
      if (!row) return null;
      const r = await apiGet<{ parameter_set: PsFull }>(`/parameter-sets/${row.id}`);
      return { row, params: parseParams(r.parameter_set.parameters_json) };
    };
    const [published, draft] = await Promise.all([fetchFull(pubRow), fetchFull(draftRow)]);
    setBundles((b) => ({
      ...b,
      [offeringId]: { offering: detail.offering, sets, published, draft },
    }));
  }, []);

  useEffect(() => {
    apiGet<{ offerings: Offering[] }>("/offerings")
      .then((r) => {
        setOfferings(r.offerings);
        setSelectedId((cur) => cur ?? r.offerings[0]?.id ?? null);
        r.offerings.forEach((o) => void loadBundle(o.id).catch(() => undefined));
      })
      .catch(() => setOfferings([]));
  }, [loadBundle]);

  const list = useMemo(
    () => (offerings ?? []).map((o) => bundles[o.id]).filter((b): b is Bundle => !!b),
    [offerings, bundles],
  );
  const sel = selectedId !== null ? (bundles[selectedId] ?? null) : null;
  const staleCount = list.filter((b) => staleness(b, locale).days >= 90).length;

  // ——— Editor ———

  const openEditor = (b: Bundle) => {
    if (!isOwner) return;
    const seed = b.draft?.params ?? effectiveParams(b);
    const values: Record<string, string> = {};
    for (const [k, v] of numericEntries(seed)) values[k] = String(v);
    setSelectedId(b.offering.id);
    setEditor({
      offeringId: b.offering.id,
      draftId: b.draft?.row.id ?? null,
      version: b.draft?.row.version ?? `v${b.sets.length + 1}`,
      baseParams: seed,
      values,
      note: b.draft?.row.notes_md ?? "",
      error: "",
      busy: false,
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    const merged: Params = { ...editor.baseParams };
    for (const [k, v] of Object.entries(editor.values)) {
      const n = parseFloat(v);
      merged[k] = Number.isFinite(n) ? n : 0;
    }
    setEditor((e) => (e ? { ...e, busy: true, error: "" } : e));
    try {
      if (editor.draftId !== null) {
        await apiPut(`/parameter-sets/${editor.draftId}`, {
          parameters_json: merged,
          notes_md: editor.note,
        });
      } else {
        await apiPost(`/offerings/${editor.offeringId}/parameter-sets`, {
          version: editor.version,
          parameters_json: merged,
          notes_md: editor.note,
        });
      }
      await loadBundle(editor.offeringId);
      setEditor(null);
      showToast(tx("pol.draft_saved", locale));
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 409
          ? tx("pol.immutable_err", locale)
          : tx("common.error", locale);
      setEditor((ed) => (ed ? { ...ed, busy: false, error: msg } : ed));
    }
  };

  const publish = async (b: Bundle) => {
    if (!isOwner || !b.draft) return;
    try {
      await apiPost(`/parameter-sets/${b.draft.row.id}/publish`);
      await loadBundle(b.offering.id);
      setDiffOpen(false);
      showToast(`${b.draft.row.version} ${tx("pol.published_toast", locale)}`);
    } catch {
      showToast(tx("common.error", locale));
    }
  };

  // ——— Diff (draft vs published, changed scalar fields) ———

  const diffRows = useMemo(() => {
    if (!sel?.draft) return [];
    const before = sel.published?.params ?? parseParams(sel.offering.base_inputs_json);
    const after = sel.draft.params;
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
    const rows: { field: string; old: string; new: string; delta: string | null }[] = [];
    for (const k of keys) {
      const a = before[k];
      const b = after[k];
      if (typeof a === "object" || typeof b === "object") continue;
      if (a === b) continue;
      const delta =
        typeof a === "number" && typeof b === "number"
          ? `${b - a > 0 ? "+" : ""}${fmtNumber(Math.round((b - a) * 100) / 100, locale)}`
          : null;
      rows.push({ field: humanize(k), old: fmtVal(a, locale), new: fmtVal(b, locale), delta });
    }
    return rows;
  }, [sel, locale]);

  // ——— Render ———

  const badgeTone: Record<PsRow["status"], Tone> = {
    draft: "gold",
    published: "green",
    retired: "neutral",
  };

  const num = (p: Params, key: string): string => {
    const v = p[key];
    return typeof v === "number" ? fmtNumber(v, locale) : "—";
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      {/* Header */}
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
          <div className="kicker" lang={locale === "ja" ? "ja" : undefined}>
            {tx("pol.kicker", locale)}
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em" }}>
            {tx("pol.title", locale)}
          </h1>
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
            {tx("pol.subtitle", locale).replace("{n}", String(offerings?.length ?? 0))}
          </div>
        </div>
        {/* Quarterly reprice (staleness) clock */}
        <div
          style={{
            borderRadius: 11,
            padding: "10px 15px",
            maxWidth: 320,
            background: staleCount > 0 ? "rgba(232,163,61,.12)" : "var(--surface-alt)",
            border: staleCount > 0 ? "1px solid rgba(199,127,26,.34)" : "1px solid var(--border)",
            color: staleCount > 0 ? "var(--warn-ink)" : "var(--ink-2)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase" }}>
            ◷ {tx("pol.clock_label", locale)}
          </div>
          <div style={{ fontSize: 12.5, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
            {tx("pol.clock_note", locale).replace("{n}", String(staleCount))}
          </div>
        </div>
      </div>

      {!isOwner && (
        <div
          style={{
            ...cardStyle,
            padding: "10px 14px",
            marginBottom: 14,
            fontSize: 12,
            color: "var(--muted)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Pill tone="neutral">{tx("common.read_only", locale)}</Pill>
          {tx("pol.readonly_banner", locale)}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <Segmented<Tab>
          label={tx("pol.title", locale)}
          options={[
            { value: "offerings", label: tx("pol.tab_offerings", locale) },
            { value: "rates", label: tx("pol.tab_rates", locale) },
            { value: "versions", label: tx("pol.tab_versions", locale) },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* ——— OFFERINGS ——— */}
      {tab === "offerings" && (
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>
                {tx("pol.off_title", locale)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                {tx("pol.off_sub", locale)}
              </div>
            </div>
            <span style={{ fontSize: 11, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
              {offerings?.length ?? 0}
            </span>
          </div>
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{tx("pol.col_offering", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_band", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_bill", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_cost", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_in", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_out", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "center" }}>{tx("pol.col_status", locale)}</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {list.map((b) => {
                  const p = effectiveParams(b);
                  const hasDraft = !!b.draft;
                  const st = staleness(b, locale);
                  return (
                    <tr
                      key={b.offering.id}
                      onClick={() => setSelectedId(b.offering.id)}
                      style={{
                        borderBottom: "1px solid var(--hairline)",
                        background: hasDraft ? "rgba(232,163,61,.12)" : "var(--row)",
                        boxShadow: hasDraft ? `inset 3px 0 0 ${color.gold}` : undefined,
                        cursor: "pointer",
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700 }}>{b.offering.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
                          {b.published
                            ? `${b.published.row.version} · ${fmtDate(parseUtc(b.published.row.published_at ?? b.published.row.created_at), locale)}`
                            : tx("pol.no_published", locale)}
                          {hasDraft && ` · ${tx("pol.badge_draft", locale)} ${b.draft!.row.version}`}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600 }}>{num(p, "opening_band_pct")}%</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "bill_rate")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "cost_rate")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "price_in")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "price_out")}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Pill tone={st.tone}>{st.label}</Pill>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {isOwner ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditor(b);
                            }}
                            style={{ ...btnGhost, padding: "6px 13px", fontSize: 11.5, borderRadius: radius.pill }}
                          >
                            {hasDraft ? tx("pol.edit_draft", locale) : tx("pol.edit", locale)}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--faint)" }}>{tx("common.read_only", locale)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: color.gold }} />
              {tx("pol.badge_draft", locale)}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: "#3A5F94" }} />
              {tx("pol.badge_published", locale)}
            </div>
          </div>
        </section>
      )}

      {/* ——— RATE CARDS ——— */}
      {tab === "rates" && (
        <section style={cardStyle}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>
            {tx("pol.rate_title", locale)}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
            {tx("pol.rate_sub", locale)}
          </div>
          <div style={{ marginTop: 14, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 680 }}>
              <thead>
                <tr>
                  <th style={thStyle}>{tx("pol.col_offering", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_bill", locale)} $/h</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_cost", locale)} $/h</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_in", locale)}</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>{tx("pol.col_out", locale)}</th>
                  <th style={thStyle} />
                </tr>
              </thead>
              <tbody>
                {list.map((b, i) => {
                  const p = effectiveParams(b);
                  return (
                    <tr
                      key={b.offering.id}
                      style={{
                        borderBottom: "1px solid var(--hairline)",
                        background: i % 2 ? "var(--row-alt)" : "var(--row)",
                      }}
                    >
                      <td style={{ ...tdStyle, fontWeight: 700 }}>{b.offering.name}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "bill_rate")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "cost_rate")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "price_in")}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>${num(p, "price_out")}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        {isOwner && (
                          <button
                            onClick={() => openEditor(b)}
                            style={{ ...btnGhost, padding: "6px 13px", fontSize: 11.5, borderRadius: radius.pill }}
                          >
                            {tx("pol.edit", locale)}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ——— VERSIONS & DIFF ——— */}
      {tab === "versions" && (
        <section style={cardStyle}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)" }}>
                {tx("pol.versions_title", locale)}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, maxWidth: 520 }}>
                {tx("pol.versions_sub", locale)}
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
              {tx("pol.select_offering", locale)}
              <select
                value={selectedId ?? undefined}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  fontSize: 12,
                  fontFamily: "inherit",
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                {(offerings ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {sel && (
            <>
              <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                {isOwner && (
                  <button onClick={() => openEditor(sel)} style={btnGhost}>
                    {sel.draft ? tx("pol.edit_draft", locale) : tx("pol.new_draft", locale)}
                  </button>
                )}
                <button
                  onClick={() => setDiffOpen(true)}
                  disabled={!sel.draft}
                  style={sel.draft ? btnGhost : { ...btnGhost, color: "var(--faint)", cursor: "not-allowed" }}
                >
                  ⎇ {tx("pol.view_diff", locale)} ({diffRows.length})
                </button>
                {isOwner && (
                  <button
                    onClick={() => void publish(sel)}
                    disabled={!sel.draft}
                    style={sel.draft ? btnPrimary : btnDisabled}
                  >
                    {tx("pol.publish", locale)} {sel.draft ? sel.draft.row.version : ""}
                  </button>
                )}
              </div>

              <div style={{ marginTop: 18, display: "flex", flexDirection: "column" }}>
                {sel.sets.length === 0 && (
                  <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{tx("pol.no_published", locale)}</div>
                )}
                {sel.sets.map((v, i) => (
                  <div key={v.id} style={{ display: "flex", gap: 14 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: "50%",
                          flexShrink: 0,
                          marginTop: 3,
                          background: v.status === "published" ? color.gold : "var(--surface)",
                          border: `2px solid ${v.status === "published" ? color.goldDeep : "var(--border)"}`,
                        }}
                      />
                      {i < sel.sets.length - 1 && (
                        <span style={{ flex: 1, width: 2, background: "var(--border)", margin: "2px 0" }} />
                      )}
                    </div>
                    <div style={{ paddingBottom: 20, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 800, color: "var(--ink)", fontSize: 14, fontVariantNumeric: "tabular-nums" }}>
                          {v.version}
                        </span>
                        <Pill tone={badgeTone[v.status]}>{tx(`pol.badge_${v.status}`, locale)}</Pill>
                        <span style={{ fontSize: 11.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
                          {fmtDate(parseUtc(v.published_at ?? v.created_at), locale)}
                        </span>
                      </div>
                      {v.notes_md && (
                        <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 6, lineHeight: 1.6, maxWidth: 640 }}>
                          {v.notes_md}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ——— EDIT DRAFT SHEET (glass — navigation layer) ——— */}
      {editor && (
        <Sheet
          glassStop={ui.glassStop}
          kicker={tx("pol.edit_kicker", locale)}
          accent={color.gold}
          title={bundles[editor.offeringId]?.offering.name ?? ""}
          subtitle={tx("pol.edit_sub", locale)}
          onClose={() => setEditor(null)}
          footer={
            <>
              <button onClick={() => setEditor(null)} style={sheetCancelBtn}>
                {tx("common.cancel", locale)}
              </button>
              <button
                onClick={() => void saveEditor()}
                disabled={editor.busy}
                style={{ ...btnPrimary, flex: 1, cursor: editor.busy ? "wait" : "pointer" }}
              >
                {tx("pol.save_draft", locale)}
              </button>
            </>
          }
        >
          <div>
            <label style={sheetLabel}>{tx("pol.version_label", locale)}</label>
            <input
              type="text"
              value={editor.version}
              disabled={editor.draftId !== null}
              onChange={(e) => setEditor((ed) => (ed ? { ...ed, version: e.target.value } : ed))}
              style={{
                width: "100%",
                marginTop: 6,
                background: "#fff",
                border: "1px solid #C9D6EA",
                borderRadius: 9,
                padding: "9px 12px",
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 700,
                color: color.navy,
                boxSizing: "border-box",
                opacity: editor.draftId !== null ? 0.7 : 1,
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {Object.keys(editor.values).map((k) => {
              const pub = bundles[editor.offeringId]?.published?.params[k];
              const cur = parseFloat(editor.values[k]);
              const delta =
                typeof pub === "number" && Number.isFinite(cur)
                  ? Math.round((cur - pub) * 100) / 100
                  : 0;
              return (
                <label key={k} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: "#C9D8EE" }}>{humanize(k)}</span>
                  <input
                    type="number"
                    value={editor.values[k]}
                    onChange={(e) =>
                      setEditor((ed) =>
                        ed ? { ...ed, values: { ...ed.values, [k]: e.target.value } } : ed,
                      )
                    }
                    style={{
                      background: "#fff",
                      border: "1px solid #C9D6EA",
                      borderRadius: 9,
                      padding: "8px 10px",
                      fontSize: 13.5,
                      fontWeight: 700,
                      fontFamily: "inherit",
                      color: color.navy,
                      fontVariantNumeric: "tabular-nums",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: delta !== 0 ? color.gold : "rgba(201,216,238,.7)",
                    }}
                  >
                    {delta !== 0 ? `${delta > 0 ? "+" : ""}${delta} vs published` : "—"}
                  </span>
                </label>
              );
            })}
          </div>
          <div>
            <label style={sheetLabel}>{tx("pol.change_note", locale)}</label>
            <textarea
              value={editor.note}
              onChange={(e) => setEditor((ed) => (ed ? { ...ed, note: e.target.value } : ed))}
              placeholder={tx("pol.note_placeholder", locale)}
              style={{
                width: "100%",
                minHeight: 84,
                resize: "vertical",
                marginTop: 6,
                background: "#fff",
                border: "1px solid #C9D6EA",
                borderRadius: 9,
                padding: "10px 12px",
                fontSize: 13,
                fontFamily: "inherit",
                color: color.navy,
                lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
            <div style={{ fontSize: 10.5, color: "#9FB1CC", marginTop: 4 }}>{tx("pol.note_hint", locale)}</div>
          </div>
          {editor.error && (
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
              <div style={{ fontSize: 12, color: "#EAD3D2", lineHeight: 1.5 }}>{editor.error}</div>
            </div>
          )}
        </Sheet>
      )}

      {/* ——— DIFF SHEET (glass — navigation layer) ——— */}
      {diffOpen && sel && (
        <Sheet
          glassStop={ui.glassStop}
          kicker={tx("pol.diff_kicker", locale)}
          accent={color.gold}
          title={
            sel.draft
              ? `${sel.draft.row.version} ← ${sel.published?.row.version ?? "base"}`
              : sel.offering.name
          }
          subtitle={tx("pol.diff_sub", locale)}
          onClose={() => setDiffOpen(false)}
          footer={
            <>
              <button onClick={() => setDiffOpen(false)} style={sheetCancelBtn}>
                {tx("common.close", locale)}
              </button>
              {isOwner && sel.draft && (
                <button onClick={() => void publish(sel)} style={{ ...btnPrimary, flex: 1 }}>
                  {tx("pol.publish", locale)} {sel.draft.row.version}
                </button>
              )}
            </>
          }
        >
          {diffRows.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 12px", color: "#C9D8EE", fontSize: 13 }}>
              {tx("pol.diff_none", locale)}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {diffRows.map((d) => (
                <div
                  key={d.field}
                  style={{
                    background: "rgba(255,255,255,.94)",
                    border: "1px solid rgba(255,255,255,.5)",
                    borderLeft: `3px solid ${color.gold}`,
                    borderRadius: 10,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: color.goldDeep }}>
                    {sel.offering.name}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: color.navy, marginTop: 3 }}>{d.field}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#9AA9C0", textDecoration: "line-through" }}>
                      {d.old}
                    </span>
                    <span style={{ color: "#6B7A93" }}>→</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: color.navy }}>{d.new}</span>
                    {d.delta && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: "2px 8px",
                          borderRadius: radius.pill,
                          color: color.goldDeep,
                          background: "rgba(232,163,61,.16)",
                        }}
                      >
                        {d.delta}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Sheet>
      )}

      {toastNode}
    </div>
  );
}
