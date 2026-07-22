// Admin — mockup: design/mockups/DealSpine Settings.dc.html
// Sections: access-matrix (read-only §2 view) · team & roles (admin) ·
// LLM provider keys (admin, write-only fields) · preferences
// (language / glass intensity / theme defaults via the shell).
import { useEffect, useMemo, useState } from "react";
import { apiGet, ApiError, auth, type Role, type User } from "../api";
import { fmtDate, type Locale } from "../i18n";
import { color, radius, type GlassStop, type Theme } from "../tokens";
import { useUi } from "../shell/Shell";
import { tx } from "./govern/i18n";
import {
  btnPrimary,
  cardStyle,
  parseUtc,
  Pill,
  Segmented,
  tdStyle,
  thStyle,
  toneColor,
  useToast,
  type Tone,
} from "./govern/ui";

type Section = "access" | "team" | "providers" | "prefs";

// ——— §2 access matrix (read-only; enforced per route, proven by tests) ———

type Lv = "none" | "read" | "edit" | "publish" | "builder";

interface MatrixRow {
  label: { en: string; ja: string };
  perms: [Lv, Lv, Lv, Lv, Lv]; // pricing_owner, sales, deal_desk, delivery, leadership
  note?: { en: string; ja: string };
}

const MATRIX: MatrixRow[] = [
  {
    label: { en: "Offerings, rate cards, parameter sets, bands & floors", ja: "オファリング・レート・パラメータ・バンドとフロア" },
    perms: ["publish", "read", "read", "read", "read"],
  },
  {
    label: { en: "Deal workspace (simulate, save quotes)", ja: "案件ワークスペース（シミュレーション・見積保存）" },
    perms: ["edit", "edit", "edit", "read", "read"],
    note: { en: "Sales: own quotes only", ja: "営業は自分の見積のみ" },
  },
  {
    label: { en: "Contested-bid entry & evidence", ja: "競争入札の登録とエビデンス" },
    perms: ["edit", "edit", "publish", "none", "read"],
    note: { en: "Deal desk verifies", ja: "デスクが検証" },
  },
  {
    label: { en: "Approvals, overrides, exceptions", ja: "承認・オーバーライド・例外" },
    perms: ["read", "read", "publish", "none", "read"],
    note: { en: "Sales: request only · author ≠ approver", ja: "営業は申請のみ · 起票者は承認不可" },
  },
  {
    label: { en: "Proposal generation (customer PDF)", ja: "提案書生成（顧客向けPDF）" },
    perms: ["edit", "edit", "edit", "none", "none"],
    note: { en: "Sales: green/approved quotes only", ja: "営業はグリーン/承認済みのみ" },
  },
  {
    label: { en: "Evidence log (unit records)", ja: "エビデンスログ（ユニット記録）" },
    perms: ["read", "read", "read", "edit", "read"],
    note: { en: "Delivery: create + countersign (logger ≠ countersigner)", ja: "デリバリー: 記録＋副署（記録者≠副署者）" },
  },
  {
    label: { en: "Engagements, sold-vs-actual, true-ups", ja: "エンゲージメント・売実差異・トゥルーアップ" },
    perms: ["read", "read", "read", "edit", "read"],
    note: { en: "Sales: own deals", ja: "営業は自分の案件" },
  },
  {
    label: { en: "Portfolio & analytics", ja: "ポートフォリオ・分析" },
    perms: ["read", "read", "read", "read", "read"],
    note: { en: "Leadership: primary user", ja: "リーダーシップが主要ユーザー" },
  },
  {
    label: { en: "Insights page (run prompt buttons)", ja: "インサイト（ボタン実行）" },
    perms: ["edit", "edit", "edit", "edit", "edit"],
  },
  {
    label: { en: "Insight Studio (author prompt buttons)", ja: "インサイトスタジオ（ボタン作成）" },
    perms: ["edit", "builder", "builder", "builder", "none"],
    note: { en: "Builder flag: any role, granted by admin", ja: "ビルダーフラグは管理者が付与" },
  },
  {
    label: { en: "LLM provider keys & model routing", ja: "LLMプロバイダキー・モデルルーティング" },
    perms: ["edit", "none", "none", "none", "none"],
  },
  {
    label: { en: "User & role admin", ja: "ユーザー・ロール管理" },
    perms: ["edit", "none", "none", "none", "none"],
  },
];

const LV_META: Record<Lv, { chip: string; tone: Tone }> = {
  none: { chip: "—", tone: "neutral" },
  read: { chip: "R", tone: "blue" },
  edit: { chip: "E", tone: "gold" },
  publish: { chip: "P", tone: "green" },
  builder: { chip: "B", tone: "gold" },
};

const ROLES: Role[] = ["pricing_owner", "sales", "deal_desk", "delivery", "leadership"];

function roleLabel(r: Role, locale: Locale): string {
  return tx(`set.role_${r}`, locale);
}

// ——— Provider keys ———

interface ProviderRow {
  provider: string;
  has_key: boolean;
  default_model: string | null;
  updated_at: string | null;
}

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

export default function Settings() {
  const ui = useUi();
  const { locale, user } = ui;
  const isAdmin = user?.role === "pricing_owner";
  const { toastNode, showToast } = useToast();

  const [section, setSection] = useState<Section>("access");
  const [users, setUsers] = useState<User[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [provForm, setProvForm] = useState<Record<string, { key: string; model: string }>>({});

  useEffect(() => {
    auth.users().then((r) => setUsers(r.users)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    apiGet<{ providers: ProviderRow[] }>("/insights/providers")
      .then((r) => {
        setProviders(r.providers);
        setProvForm((f) => {
          const next = { ...f };
          for (const p of r.providers) {
            if (!next[p.provider]) next[p.provider] = { key: "", model: p.default_model ?? "" };
          }
          return next;
        });
      })
      .catch(() => undefined);
  }, [isAdmin]);

  const menu = useMemo(() => {
    const items: { id: Section; icon: string; label: string }[] = [
      { id: "access", icon: "▦", label: tx("set.m_access", locale) },
      { id: "team", icon: "◎", label: tx("set.m_team", locale) },
    ];
    if (isAdmin) items.push({ id: "providers", icon: "⚿", label: tx("set.m_providers", locale) });
    items.push({ id: "prefs", icon: "⚒", label: tx("set.m_prefs", locale) });
    return items;
  }, [locale, isAdmin]);

  // ——— Team admin (role select + builder flag) ———

  const changeUser = (u: User, patch: { role?: Role; is_builder?: boolean }) => {
    if (!isAdmin) return;
    const prev = users;
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...patch } : x)));
    // No user-admin endpoint exists yet in the pilot backend; probe and revert.
    fetch(`/api/auth/users/${u.id}`, {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
      .then((res) => {
        if (!res.ok) throw new Error("user_admin_unavailable");
        showToast(`${u.full_name} — ${tx("common.save", locale)}`);
      })
      .catch(() => {
        setUsers(prev);
        showToast(tx("set.team_api_pending", locale));
      });
  };

  const saveProvider = async (p: ProviderRow) => {
    const f = provForm[p.provider] ?? { key: "", model: "" };
    try {
      await apiPut(`/insights/providers/${p.provider}`, {
        api_key: f.key || undefined,
        default_model: f.model || undefined,
      });
      // Write-only: clear the key field immediately after save.
      setProvForm((forms) => ({ ...forms, [p.provider]: { ...f, key: "" } }));
      setProviders((rows) =>
        rows.map((r) =>
          r.provider === p.provider
            ? { ...r, has_key: r.has_key || !!f.key, default_model: f.model || r.default_model }
            : r,
        ),
      );
      showToast(`${p.provider} — ${tx("set.prov_saved", locale)}`);
    } catch {
      showToast(tx("common.error", locale));
    }
  };

  // ——— Render ———

  const sectionTitle = (title: string, sub: string) => (
    <div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)" }}>{title}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, maxWidth: 560 }}>{sub}</div>
    </div>
  );

  const inputStyle = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontFamily: "inherit",
    color: "var(--ink)",
    fontWeight: 600 as const,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ maxWidth: 1100 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="kicker" lang={locale === "ja" ? "ja" : undefined}>
          {tx("set.kicker", locale)}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em" }}>
          {tx("set.title", locale)}
        </h1>
        <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>
          {tx("set.subtitle", locale)}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
        {/* Settings menu (solid card) */}
        <nav style={{ ...cardStyle, padding: 8 }} aria-label={tx("set.title", locale)}>
          {menu.map((m) => {
            const a = m.id === section;
            return (
              <button
                key={m.id}
                onClick={() => setSection(m.id)}
                aria-current={a ? "true" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 12.5,
                  fontWeight: a ? 800 : 600,
                  padding: "10px 12px",
                  borderRadius: 9,
                  color: a ? color.navy : "var(--muted)",
                  background: a ? "rgba(232,163,61,.12)" : "transparent",
                }}
              >
                <span aria-hidden style={{ width: 18, display: "flex", justifyContent: "center" }}>
                  {m.icon}
                </span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </nav>

        <div>
          {/* ——— ACCESS MATRIX (read-only) ——— */}
          {section === "access" && (
            <section style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                {sectionTitle(tx("set.access_title", locale), tx("set.access_sub", locale))}
                <Pill tone="neutral">{tx("common.read_only", locale)}</Pill>
              </div>
              <div style={{ marginTop: 16, overflowX: "auto" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px,1.6fr) repeat(5, minmax(64px, 1fr))",
                    gap: 6,
                    minWidth: 720,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      color: "var(--faint)",
                      padding: "8px 6px",
                    }}
                  >
                    {tx("set.surface_role", locale)}
                  </div>
                  {ROLES.map((r) => (
                    <div
                      key={r}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10.5,
                        fontWeight: 800,
                        color: "var(--ink)",
                        padding: "8px 6px",
                        background: "var(--th)",
                        borderRadius: 7,
                        textAlign: "center",
                      }}
                    >
                      {roleLabel(r, locale)}
                    </div>
                  ))}
                  {MATRIX.map((row) => (
                    <MatrixGridRow key={row.label.en} row={row} locale={locale} />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 16, flexWrap: "wrap" }}>
                {(["none", "read", "edit", "publish", "builder"] as Lv[]).map((lv) => {
                  const m = LV_META[lv];
                  const t = toneColor(m.tone);
                  return (
                    <div key={lv} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "var(--muted)" }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 800,
                          color: t.c,
                          background: t.bg,
                        }}
                      >
                        {m.chip}
                      </span>
                      {tx(`set.lv_${lv}`, locale)}
                    </div>
                  );
                })}
              </div>
              <div
                style={{
                  marginTop: 14,
                  fontSize: 11.5,
                  color: "var(--ink-2)",
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: 9,
                  padding: "10px 12px",
                  lineHeight: 1.6,
                }}
              >
                {tx("set.hard_rules", locale)}
              </div>
            </section>
          )}

          {/* ——— TEAM ——— */}
          {section === "team" && (
            <section style={cardStyle}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                {sectionTitle(tx("set.team_title", locale), tx("set.team_sub", locale))}
                {!isAdmin && <Pill tone="neutral">{tx("common.read_only", locale)}</Pill>}
              </div>
              {!isAdmin && (
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                  {tx("set.team_admin_only", locale)}
                </div>
              )}
              <div style={{ marginTop: 14, overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 640 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>{tx("set.c_member", locale)}</th>
                      <th style={thStyle}>{tx("set.c_role", locale)}</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>{tx("set.c_builder", locale)}</th>
                      <th style={{ ...thStyle, textAlign: "center" }}>{tx("set.c_status", locale)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr
                        key={u.id}
                        style={{
                          borderBottom: "1px solid var(--hairline)",
                          background: i % 2 ? "var(--row-alt)" : "var(--row)",
                        }}
                      >
                        <td style={tdStyle}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 30,
                                height: 30,
                                flexShrink: 0,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#fff",
                                background: color.navy2,
                              }}
                            >
                              {u.full_name
                                .split(" ")
                                .map((p) => p[0])
                                .slice(0, 2)
                                .join("")}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, color: "var(--ink)" }}>{u.full_name}</div>
                              <div style={{ fontSize: 10.5, color: "var(--faint)" }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <select
                            value={u.role}
                            disabled={!isAdmin}
                            aria-label={`${u.full_name} — ${tx("set.c_role", locale)}`}
                            onChange={(e) => changeUser(u, { role: e.target.value as Role })}
                            style={{ ...inputStyle, width: "auto", cursor: isAdmin ? "pointer" : "not-allowed" }}
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {roleLabel(r, locale)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={u.is_builder}
                            disabled={!isAdmin}
                            aria-label={`${u.full_name} — ${tx("set.lv_builder", locale)}`}
                            onChange={(e) => changeUser(u, { is_builder: e.target.checked })}
                            style={{ width: 16, height: 16, accentColor: color.gold, cursor: isAdmin ? "pointer" : "not-allowed" }}
                          />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <Pill tone="green">{tx("set.st_active", locale)}</Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* ——— PROVIDER KEYS (admin only) ——— */}
          {section === "providers" && isAdmin && (
            <section style={cardStyle}>
              {sectionTitle(tx("set.prov_title", locale), tx("set.prov_sub", locale))}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginTop: 16 }}>
                {providers.map((p) => {
                  const f = provForm[p.provider] ?? { key: "", model: "" };
                  const isLocal = p.provider === "local_gemma";
                  return (
                    <div
                      key={p.provider}
                      style={{
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 16,
                        background: "var(--surface-alt)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", fontFamily: "'JetBrains Mono', monospace" }}>
                          {p.provider}
                        </span>
                        <Pill tone={p.has_key ? "green" : "neutral"}>
                          {p.has_key ? tx("set.prov_configured", locale) : tx("set.prov_missing", locale)}
                        </Pill>
                      </div>
                      {isLocal ? (
                        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 10, lineHeight: 1.5 }}>
                          {tx("set.prov_local", locale)}
                        </div>
                      ) : (
                        <label style={{ display: "block", marginTop: 12 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>
                            {tx("set.prov_key", locale)}
                          </span>
                          <input
                            type="password"
                            autoComplete="off"
                            value={f.key}
                            placeholder={tx("set.prov_key_placeholder", locale)}
                            onChange={(e) =>
                              setProvForm((forms) => ({
                                ...forms,
                                [p.provider]: { ...f, key: e.target.value },
                              }))
                            }
                            style={{ ...inputStyle, marginTop: 4 }}
                          />
                        </label>
                      )}
                      <label style={{ display: "block", marginTop: 10 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--muted)" }}>
                          {tx("set.prov_model", locale)}
                        </span>
                        <input
                          type="text"
                          value={f.model}
                          onChange={(e) =>
                            setProvForm((forms) => ({
                              ...forms,
                              [p.provider]: { ...f, model: e.target.value },
                            }))
                          }
                          style={{ ...inputStyle, marginTop: 4 }}
                        />
                      </label>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
                        {p.updated_at ? (
                          <span style={{ fontSize: 10.5, color: "var(--faint)", fontVariantNumeric: "tabular-nums" }}>
                            {fmtDate(parseUtc(p.updated_at), locale)}
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          onClick={() => void saveProvider(p)}
                          style={{ ...btnPrimary, padding: "8px 16px", fontSize: 12, borderRadius: radius.field }}
                        >
                          {tx("common.save", locale)}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ——— PREFERENCES ——— */}
          {section === "prefs" && (
            <section style={cardStyle}>
              {sectionTitle(tx("set.prefs_title", locale), tx("set.prefs_sub", locale))}
              <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
                    {tx("set.pref_lang", locale)}
                  </div>
                  <Segmented<Locale>
                    label={tx("set.pref_lang", locale)}
                    options={[
                      { value: "en", label: "English" },
                      { value: "ja", label: "日本語" },
                    ]}
                    value={locale}
                    onChange={ui.setLocale}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
                    {tx("set.pref_theme", locale)}
                  </div>
                  <Segmented<Theme>
                    label={tx("set.pref_theme", locale)}
                    options={[
                      { value: "light", label: tx("shell.theme.light", locale) },
                      { value: "dark", label: tx("shell.theme.dark", locale) },
                    ]}
                    value={ui.theme}
                    onChange={ui.setTheme}
                  />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)", marginBottom: 8 }}>
                    {tx("set.pref_glass", locale)}
                  </div>
                  <Segmented<GlassStop>
                    label={tx("set.pref_glass", locale)}
                    options={[
                      { value: "full", label: tx("shell.glass.full", locale) },
                      { value: "reduced", label: tx("shell.glass.reduced", locale) },
                      { value: "opaque", label: tx("shell.glass.opaque", locale) },
                    ]}
                    value={ui.glassStop}
                    onChange={ui.setGlassStop}
                  />
                  <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8, maxWidth: 460, lineHeight: 1.55 }}>
                    {tx("set.a11y_note", locale)}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>

      {toastNode}
    </div>
  );
}

// ——— Access-matrix grid row (label cell + 5 permission cells) ———

function MatrixGridRow({ row, locale }: { row: MatrixRow; locale: Locale }) {
  const label = locale === "ja" ? row.label.ja : row.label.en;
  const note = row.note ? (locale === "ja" ? row.note.ja : row.note.en) : null;
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
          color: "var(--ink)",
          padding: "9px 8px",
          background: "var(--surface-alt)",
          borderRadius: 7,
        }}
      >
        {label}
        {note && (
          <span style={{ fontSize: 10, fontWeight: 500, color: "var(--faint)", marginTop: 2 }}>{note}</span>
        )}
      </div>
      {row.perms.map((lv, i) => {
        const m = LV_META[lv];
        const t = toneColor(m.tone);
        return (
          <div
            key={i}
            aria-label={`${label} · ${ROLES[i]} · ${tx(`set.lv_${lv}`, locale)}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              padding: "10px 6px",
              borderRadius: 7,
              color: t.c,
              background: t.bg,
            }}
          >
            {m.chip}
          </div>
        );
      })}
    </>
  );
}
