// Login — the one non-shell screen (mockup: DealSpine Login.dc.html).
// Solid navy brand panel + floating glass auth card over the navy page
// (entry chrome — the ONE place glass is allowed outside the shell).
// Pilot dev login: pick a seeded user → signed httpOnly cookie.
import { useEffect, useState } from "react";
import { auth, type User } from "../api";
import { useUi } from "../shell/Shell";
import { color, elevation, font, glass, radius } from "../tokens";
import type { Locale } from "../i18n";
import { lt } from "./parts/i18n-local";

const ROLE_KEY: Record<string, string> = {
  pricing_owner: "role.pricing_owner",
  sales: "role.sales",
  deal_desk: "role.deal_desk",
  delivery: "role.delivery",
  leadership: "role.leadership",
};

export default function Login({ onLoggedIn }: { onLoggedIn: (u: User) => void }) {
  const ui = useUi();
  const { locale } = ui;
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  useEffect(() => {
    auth
      .users()
      .then((r) => setUsers(r.users))
      .catch(() => setError(lt("login.api_error", locale)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(userId: number) {
    setBusy(userId);
    try {
      const r = await auth.login(userId);
      onLoggedIn(r.user);
    } catch {
      setError(lt("login.api_error", locale));
      setBusy(null);
    }
  }

  const trust = ["login.trust1", "login.trust2", "login.trust3"];

  return (
    <div
      lang={locale === "ja" ? "ja" : "en"}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
        flexWrap: "wrap",
        padding: 32,
        background: `radial-gradient(1100px 560px at 82% -8%, ${color.navy2}, #0d1830 62%)`,
        fontFamily: locale === "ja" ? font.ja : font.stack,
        position: "relative",
      }}
    >
      {/* Floating language pill */}
      <div
        role="group"
        aria-label="Language"
        style={{
          position: "absolute",
          top: 20,
          right: 24,
          display: "flex",
          gap: 2,
          borderRadius: radius.pill,
          padding: 3,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        {(["en", "ja"] as Locale[]).map((l) => {
          const active = l === locale;
          return (
            <button
              key={l}
              aria-pressed={active}
              onClick={() => ui.setLocale(l)}
              style={{
                font: "inherit",
                fontSize: 11,
                fontWeight: 700,
                padding: "4px 12px",
                borderRadius: radius.pill,
                border: "none",
                cursor: "pointer",
                background: active ? color.gold : "transparent",
                color: active ? color.navy : color.ice,
              }}
            >
              {l === "en" ? "EN" : "日本語"}
            </button>
          );
        })}
      </div>

      {/* Brand panel — solid */}
      <div style={{ maxWidth: 460, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 26 }}>
          <div
            aria-hidden
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: color.navy,
              fontSize: 18,
            }}
          >
            D
          </div>
          <div style={{ fontWeight: 800, fontSize: 19 }}>
            Deal<span style={{ color: color.gold }}>Spine</span>
          </div>
        </div>
        <div
          className="kicker"
          lang={locale === "ja" ? "ja" : undefined}
          style={{ color: color.gold }}
        >
          {lt("login.kicker", locale)}
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-.01em", margin: "12px 0 14px", lineHeight: 1.2 }}>
          {lt("login.headline", locale)}
        </h1>
        <p style={{ color: color.ice, fontSize: 14, lineHeight: 1.7, margin: 0, opacity: 0.9 }}>
          {lt("login.blurb", locale)}
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: "22px 0 0", display: "grid", gap: 10 }}>
          {trust.map((k) => (
            <li key={k} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: color.ice }}>
              <span
                aria-hidden
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: color.green,
                  flexShrink: 0,
                }}
              />
              {lt(k, locale)}
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 30, fontSize: 11, color: color.muted }}>
          {lt("login.tenant_foot", locale)}
        </div>
      </div>

      {/* Auth card — glass (entry chrome) */}
      <div
        className="glass"
        style={{
          backdropFilter: glass.full.backdropFilter,
          WebkitBackdropFilter: glass.full.backdropFilter,
          background: "rgba(255,255,255,0.10)",
          border: glass.full.border,
          borderRadius: 20,
          boxShadow: elevation.modal,
          padding: "30px 30px 26px",
          width: 400,
          maxWidth: "100%",
          color: color.ice,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: locale === "ja" ? "normal" : ".14em",
            textTransform: locale === "ja" ? "none" : "uppercase",
            color: color.gold,
          }}
        >
          {lt("login.workspace", locale)}
        </div>
        <h2 style={{ fontSize: 21, fontWeight: 800, color: "#fff", margin: "8px 0 4px" }}>
          {lt("login.sign_in", locale)}
        </h2>
        <p style={{ fontSize: 12.5, margin: "0 0 6px", opacity: 0.85 }}>{lt("login.tenant", locale)}</p>
        <p style={{ fontSize: 11.5, margin: "0 0 14px", color: color.gold }}>
          {lt("login.dev_note", locale)}
        </p>
        {error && (
          <p role="alert" style={{ color: "#F0A8A5", fontSize: 13 }}>
            {error}
          </p>
        )}
        <div style={{ display: "grid", gap: 7 }}>
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => void login(u.id)}
              disabled={busy !== null}
              style={{
                font: "inherit",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: radius.field,
                border: "1px solid rgba(255,255,255,0.18)",
                background: busy === u.id ? "rgba(232,163,61,0.25)" : "rgba(22,36,61,0.55)",
                color: color.ice,
                cursor: busy !== null ? "wait" : "pointer",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: `linear-gradient(135deg, ${color.navy2}, ${color.slate})`,
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#fff",
                }}
              >
                {u.full_name
                  .split(/\s+/)
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: "block", color: "#fff", fontSize: 13.5 }}>
                  {u.full_name}
                </strong>
                <span style={{ color: color.gold, fontSize: 11.5 }}>
                  {lt(ROLE_KEY[u.role] ?? u.role, locale)}
                  {u.is_builder ? ` · ${lt("login.builder", locale)}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
