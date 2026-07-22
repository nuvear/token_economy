// Shared primitives for the governance screens (Approvals / Policy Studio /
// Settings). Design rules: glass = navigation layer ONLY (sheets, toasts);
// every number sits on a SOLID surface with tabular numerals.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { color, elevation, font, glass, motion, radius, type GlassStop } from "../../tokens";
import type { Locale } from "../../i18n";

// ——— Solid surfaces ———

export const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: radius.card,
  boxShadow: elevation.card,
  padding: 18,
};

export const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "9px 12px",
  background: "var(--th)",
  color: "var(--ink)",
  fontWeight: 700,
  fontSize: 10.5,
  letterSpacing: ".03em",
  borderBottom: "2px solid var(--border)",
  whiteSpace: "nowrap",
};

export const tdStyle: CSSProperties = {
  textAlign: "left",
  padding: "11px 12px",
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums",
};

export type Tone = "gold" | "green" | "red" | "blue" | "neutral";

const TONES: Record<Tone, { c: string; bg: string }> = {
  gold: { c: color.goldDeep, bg: "rgba(232,163,61,.16)" },
  green: { c: color.green, bg: "rgba(78,138,90,.14)" },
  red: { c: color.red, bg: "rgba(192,80,77,.14)" },
  blue: { c: "#3A5F94", bg: "rgba(120,150,190,.16)" },
  neutral: { c: "var(--muted)", bg: "rgba(107,122,147,.14)" },
};

export function toneColor(tone: Tone): { c: string; bg: string } {
  return TONES[tone];
}

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: ".04em",
        padding: "3px 9px",
        borderRadius: radius.pill,
        color: t.c,
        background: t.bg,
        whiteSpace: "nowrap",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {children}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "red";
}) {
  const accent = tone === "accent";
  return (
    <div
      style={{
        borderRadius: 11,
        padding: 12,
        background: accent
          ? `linear-gradient(135deg, ${color.navy}, ${color.navy2})`
          : "var(--surface-alt)",
        border: accent ? "1px solid var(--panel-border)" : "1px solid var(--border)",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: ".06em",
          textTransform: "uppercase",
          color: accent ? color.gold : color.goldDeep,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          marginTop: 3,
          color: accent ? "#fff" : tone === "red" ? color.red : "var(--ink)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: accent ? "#9FB1CC" : "var(--faint)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ——— Buttons (solid) ———

export const btnPrimary: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`,
  border: "none",
  borderRadius: 10,
  padding: "10px 18px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 800,
  color: color.navy,
};

export const btnGhost: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  padding: "10px 16px",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 700,
  color: "var(--ink-2)",
};

export const btnDisabled: CSSProperties = {
  ...btnPrimary,
  background: "var(--surface-alt)",
  color: "var(--faint)",
  cursor: "not-allowed",
};

// ——— Segmented pill group on a solid surface (tabs, toggles) ———

export function Segmented<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={props.label}
      style={{
        display: "inline-flex",
        gap: 4,
        background: "var(--surface-alt)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 4,
        maxWidth: "100%",
        overflowX: "auto",
      }}
    >
      {props.options.map((o) => {
        const a = o.value === props.value;
        return (
          <button
            key={o.value}
            aria-pressed={a}
            onClick={() => props.onChange(o.value)}
            style={{
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              fontSize: 12.5,
              fontWeight: a ? 800 : 600,
              padding: "8px 16px",
              borderRadius: 9,
              color: a ? color.navy : "var(--muted)",
              background: a ? "var(--surface)" : "transparent",
              boxShadow: a ? "0 1px 3px rgba(11,18,32,.16)" : undefined,
              transition: `all ${motion.durationMs}ms ${motion.easing}`,
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ——— Glass sheet (navigation-layer material) ———

function glassSurface(stop: GlassStop): CSSProperties {
  const g = glass[stop];
  return {
    backdropFilter: g.backdropFilter,
    WebkitBackdropFilter: g.backdropFilter,
    background: g.background,
    border: g.border,
  };
}

export function Sheet(props: {
  glassStop: GlassStop;
  kicker: string;
  accent: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <>
      <div
        onClick={props.onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          background: "rgba(11,18,32,.55)",
        }}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        className="glass"
        style={{
          ...glassSurface(props.glassStop),
          position: "fixed",
          top: 0,
          right: 0,
          zIndex: 61,
          height: "100vh",
          width: "min(460px, 94vw)",
          display: "flex",
          flexDirection: "column",
          padding: 20,
          boxShadow: elevation.sheet,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
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
                letterSpacing: ".12em",
                textTransform: "uppercase",
                color: props.accent,
              }}
            >
              {props.kicker}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginTop: 3 }}>
              {props.title}
            </div>
            {props.subtitle && (
              <div
                style={{
                  fontSize: 12,
                  color: "#9FB1CC",
                  marginTop: 4,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {props.subtitle}
              </div>
            )}
          </div>
          <button
            onClick={props.onClose}
            aria-label="Close"
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
          className="ds-scroll"
          style={{
            overflow: "auto",
            padding: "16px 2px 2px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
            flex: 1,
          }}
        >
          {props.children}
        </div>
        <div
          style={{
            display: "flex",
            gap: 10,
            paddingTop: 14,
            borderTop: "1px solid rgba(255,255,255,.14)",
          }}
        >
          {props.footer}
        </div>
      </aside>
    </>
  );
}

export const sheetLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "#9FB1CC",
  letterSpacing: ".04em",
  textTransform: "uppercase",
};

export const sheetCancelBtn: CSSProperties = {
  flex: 1,
  background: "rgba(255,255,255,.08)",
  border: "1px solid rgba(255,255,255,.18)",
  borderRadius: 10,
  padding: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 13,
  fontWeight: 600,
  color: color.ice,
};

// ——— Toast (glass pill) ———

export function useToast(): { toastNode: ReactNode; showToast: (m: string) => void } {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const showToast = useCallback((m: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(m);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  const toastNode = msg ? (
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
        borderRadius: radius.pill,
        padding: "11px 20px",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: "0 12px 40px rgba(11,18,32,.4)",
      }}
    >
      {msg}
    </div>
  ) : null;
  return { toastNode, showToast };
}

// ——— Mini Markdown renderer (bold / code / list / blockquote / paragraphs) ———

function inlineMd(txt: string, keyBase: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(txt))) {
    if (m.index > last) parts.push(txt.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`${keyBase}-b${k++}`} style={{ fontWeight: 800, color: "var(--ink)" }}>
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={`${keyBase}-c${k++}`}
          style={{
            fontFamily: font.mono,
            fontSize: 12,
            background: "var(--track)",
            padding: "1px 5px",
            borderRadius: 5,
            color: color.goldDeep,
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < txt.length) parts.push(txt.slice(last));
  return parts;
}

export function Markdown({ src }: { src: string }) {
  const lines = (src || "").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^#{1,3} /.test(l)) {
      out.push(
        <div
          key={key++}
          style={{ fontWeight: 800, color: "var(--ink)", fontSize: 13, margin: "8px 0 4px" }}
        >
          {inlineMd(l.replace(/^#{1,3} /, ""), `h${key}`)}
        </div>,
      );
      i++;
      continue;
    }
    if (/^> /.test(l)) {
      out.push(
        <blockquote
          key={key++}
          style={{
            borderLeft: `3px solid ${color.gold}`,
            background: "var(--surface)",
            padding: "8px 12px",
            margin: "8px 0",
            borderRadius: "0 8px 8px 0",
            color: "var(--ink-2)",
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          {inlineMd(l.slice(2), `q${key}`)}
        </blockquote>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\s*[-*] /.test(lines[i])) {
        items.push(
          <li key={key++} style={{ margin: "3px 0" }}>
            {inlineMd(lines[i].replace(/^\s*[-*] /, ""), `li${key}`)}
          </li>,
        );
        i++;
      }
      out.push(
        <ul
          key={key++}
          style={{
            margin: "6px 0",
            paddingLeft: 18,
            color: "var(--ink-2)",
            fontSize: 12.5,
            lineHeight: 1.55,
          }}
        >
          {items}
        </ul>,
      );
      continue;
    }
    if (l.trim() === "") {
      i++;
      continue;
    }
    out.push(
      <p
        key={key++}
        style={{ margin: "6px 0", color: "var(--ink-2)", fontSize: 12.5, lineHeight: 1.6 }}
      >
        {inlineMd(l, `p${key}`)}
      </p>,
    );
    i++;
  }
  return <>{out}</>;
}

// ——— Formatting helpers (all through Intl — PRD §4) ———

const INTL: Record<Locale, string> = { en: "en-US", ja: "ja-JP" };

/** SQLite datetime('now') is UTC without a zone marker. */
export function parseUtc(s: string): Date {
  return new Date(s.includes("T") ? s : `${s.replace(" ", "T")}Z`);
}

export function compactMoney(value: number, currency: string, locale: Locale): string {
  return new Intl.NumberFormat(INTL[locale], {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}
