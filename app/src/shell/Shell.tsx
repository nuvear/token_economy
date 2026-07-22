// DealSpine shell — the glass chrome (navigation layer ONLY: app bar +
// nav rail + their controls). Content surfaces stay solid; numbers live
// on solid surfaces. Tokens come verbatim from src/tokens.ts.
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  color,
  elevation,
  font,
  glass,
  motion,
  radius,
  themeVars,
  type GlassStop,
  type Theme,
} from "../tokens";
import { t, type Locale } from "../i18n";
import type { Role, User } from "../api";

// ——— UI context (theme / glass intensity / locale / session user) ———

export interface Ui {
  theme: Theme;
  setTheme: (t: Theme) => void;
  glassStop: GlassStop;
  setGlassStop: (g: GlassStop) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
  user: User | null;
  setUser: (u: User | null) => void;
}

const UiContext = createContext<Ui | null>(null);

export function useUi(): Ui {
  const ui = useContext(UiContext);
  if (!ui) throw new Error("useUi must be used inside <UiProvider>");
  return ui;
}

function usePersisted<T extends string>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(
    () => (localStorage.getItem(key) as T | null) ?? initial,
  );
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  return [value, setValue];
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersisted<Theme>("dealspine.theme", "light");
  const [glassStop, setGlassStop] = usePersisted<GlassStop>("dealspine.glass", "full");
  const [locale, setLocale] = usePersisted<Locale>("dealspine.locale", "en");
  const [user, setUser] = useState<User | null>(null);
  return (
    <UiContext.Provider
      value={{ theme, setTheme, glassStop, setGlassStop, locale, setLocale, user, setUser }}
    >
      {children}
    </UiContext.Provider>
  );
}

// ——— Navigation (11 destinations, role-gated per PRD §2 access matrix) ———
// `roles` omitted = visible to every role. The server enforces the matrix
// regardless (one guard per route); hiding here is UX, not security.

export const NAV: { route: string; key: string; icon: string; roles?: Role[] }[] = [
  { route: "home", key: "nav.home", icon: "⌂" },
  { route: "deal", key: "nav.deal_workspace", icon: "◆" },
  // §2 "Approvals, overrides, exceptions": delivery = "—".
  {
    route: "approvals",
    key: "nav.approvals",
    icon: "✓",
    roles: ["pricing_owner", "sales", "deal_desk", "leadership"],
  },
  { route: "policy", key: "nav.policy_studio", icon: "§" },
  // §2 "Proposal generation": delivery and leadership = "—".
  {
    route: "proposal",
    key: "nav.proposal",
    icon: "▤",
    roles: ["pricing_owner", "sales", "deal_desk"],
  },
  { route: "portfolio", key: "nav.portfolio", icon: "▦" },
  { route: "insights", key: "nav.insights", icon: "✦" },
  { route: "evidence", key: "nav.evidence", icon: "◉" },
  { route: "engagements", key: "nav.engagements", icon: "⇄" },
  // Settings hosts admin-only sections (provider keys, user admin) gated
  // inside the screen; preferences + read-only §2 matrix are for everyone.
  { route: "settings", key: "nav.settings", icon: "⚙" },
  { route: "help", key: "nav.help", icon: "?" },
];

export function navForRole(role: Role | undefined): typeof NAV {
  if (!role) return NAV;
  return NAV.filter((item) => !item.roles || item.roles.includes(role));
}

export function routeAllowed(route: string, role: Role | undefined): boolean {
  const item = NAV.find((i) => i.route === route);
  if (!item) return true; // unknown routes fall back to Home in the router
  return !item.roles || !role || item.roles.includes(role);
}

function glassStyle(stop: GlassStop): CSSProperties {
  const g = glass[stop];
  return {
    backdropFilter: g.backdropFilter,
    WebkitBackdropFilter: g.backdropFilter,
    background: g.background,
    border: g.border,
  };
}

function Segmented<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={props.label} style={{ display: "flex", gap: 2 }}>
      {props.options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === props.value}
          onClick={() => props.onChange(o.value)}
          style={{
            font: "inherit",
            fontSize: 11,
            fontWeight: 600,
            padding: "3px 8px",
            borderRadius: radius.pill,
            border: "1px solid rgba(255,255,255,0.14)",
            cursor: "pointer",
            transition: `all ${motion.durationMs}ms ${motion.easing}`,
            background: o.value === props.value ? color.gold : "transparent",
            color: o.value === props.value ? color.navy : color.ice,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ——— The shell ———

export function Shell({ route, children }: { route: string; children: ReactNode }) {
  const ui = useUi();
  const { locale } = ui;

  return (
    <div
      lang={locale === "ja" ? "ja" : "en"}
      style={{
        ...themeVars(ui.theme),
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: locale === "ja" ? font.ja : font.stack,
        background: "var(--page-bg)",
        color: "var(--ink)",
      } as CSSProperties}
    >
      {/* App bar — glass chrome */}
      <header
        className="glass"
        style={{
          ...glassStyle(ui.glassStop),
          position: "sticky",
          top: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "10px 18px",
          boxShadow: elevation.chromeBar,
          color: color.ice,
        }}
      >
        <a
          href="#/home"
          style={{
            color: color.ice,
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: ".02em",
          }}
        >
          Deal<span style={{ color: color.gold }}>Spine</span>
        </a>
        <div style={{ flex: 1 }} />
        <Segmented
          label={t("shell.language", locale)}
          options={[
            { value: "en", label: "EN" },
            { value: "ja", label: "日本語" },
          ]}
          value={locale}
          onChange={ui.setLocale}
        />
        {ui.user && (
          <span style={{ fontSize: 12, color: color.ice }}>
            {ui.user.full_name}
            <span style={{ color: color.muted, marginLeft: 6 }}>{ui.user.role}</span>
          </span>
        )}
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Nav rail — glass chrome */}
        <nav
          className="glass ds-rail"
          aria-label="Primary"
          style={{
            ...glassStyle(ui.glassStop),
            width: 216,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 10,
            margin: 12,
            borderRadius: radius.sheet,
            boxShadow: elevation.rail,
            alignSelf: "flex-start",
            position: "sticky",
            top: 60,
          }}
        >
          {navForRole(ui.user?.role).map((item) => {
            const active = item.route === route;
            return (
              <a
                key={item.route}
                href={`#/${item.route}`}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: radius.field,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? color.navy : color.ice,
                  background: active ? color.gold : "transparent",
                  transition: `background ${motion.durationMs}ms ${motion.easing}`,
                }}
              >
                <span aria-hidden style={{ width: 16, textAlign: "center" }}>
                  {item.icon}
                </span>
                {t(item.key, locale)}
              </a>
            );
          })}
          <div style={{ flex: 1, minHeight: 12 }} />
          {/* Theme + glass-intensity controls (iOS-27 style stops) */}
          <div style={{ display: "grid", gap: 8, padding: "8px 6px 4px" }}>
            <Segmented
              label={t("shell.theme", locale)}
              options={[
                { value: "light", label: t("shell.theme.light", locale) },
                { value: "dark", label: t("shell.theme.dark", locale) },
              ]}
              value={ui.theme}
              onChange={ui.setTheme}
            />
            <Segmented
              label={t("shell.glass", locale)}
              options={[
                { value: "full", label: t("shell.glass.full", locale) },
                { value: "reduced", label: t("shell.glass.reduced", locale) },
                { value: "opaque", label: t("shell.glass.opaque", locale) },
              ]}
              value={ui.glassStop}
              onChange={ui.setGlassStop}
            />
          </div>
        </nav>

        {/* Content — SOLID surfaces only */}
        <main style={{ flex: 1, minWidth: 0, padding: "12px 20px 40px" }}>{children}</main>
      </div>
    </div>
  );
}
