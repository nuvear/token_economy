// Shared SOLID-surface primitives for the owned screens.
// Design rule: glass is navigation-layer only — every component here renders
// on solid theme surfaces (var(--surface) etc. set by the Shell).
import type { CSSProperties, ReactNode } from "react";
import { color, elevation, radius } from "../../tokens";
import type { Locale } from "../../i18n";

export const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: radius.card,
  padding: 18,
  boxShadow: elevation.card,
};

export const navyPanelStyle: CSSProperties = {
  background: `linear-gradient(135deg, ${color.navy}, ${color.navy2})`,
  border: "1px solid var(--panel-border)",
  borderRadius: radius.sheet,
  color: "#fff",
  position: "relative",
  overflow: "hidden",
};

export function Card(props: { style?: CSSProperties; children: ReactNode }) {
  return <section style={{ ...cardStyle, ...props.style }}>{props.children}</section>;
}

export function Kicker(props: { locale: Locale; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      className="kicker"
      lang={props.locale === "ja" ? "ja" : undefined}
      style={props.style}
    >
      {props.children}
    </div>
  );
}

export function PageHeader(props: {
  locale: Locale;
  kicker: string;
  title: string;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
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
        <Kicker locale={props.locale}>{props.kicker}</Kicker>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 0", letterSpacing: "-.01em" }}>
          {props.title}
        </h1>
        {props.sub && (
          <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 6 }}>{props.sub}</div>
        )}
      </div>
      {props.right && <div>{props.right}</div>}
    </div>
  );
}

/** KPI tile — numbers on a solid surface, tabular numerals. */
export function KpiTile(props: {
  label: string;
  value: string;
  sub?: string;
  navy?: boolean;
  accent?: boolean;
}) {
  const { navy } = props;
  return (
    <div
      style={{
        borderRadius: radius.card,
        padding: 16,
        ...(navy
          ? { background: `linear-gradient(135deg, ${color.navy}, ${color.navy2})`, border: "1px solid var(--panel-border)" }
          : { background: "var(--surface-alt)", border: "1px solid var(--border)" }),
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: navy ? color.gold : color.goldDeep,
        }}
      >
        {props.label}
      </div>
      <div
        className="num"
        style={{
          marginTop: 6,
          fontSize: 23,
          fontWeight: 800,
          color: props.accent ? color.gold : navy ? "#fff" : "var(--ink)",
        }}
      >
        {props.value}
      </div>
      {props.sub && (
        <div style={{ marginTop: 4, fontSize: 11, color: navy ? color.ice : "var(--muted)" }}>
          {props.sub}
        </div>
      )}
    </div>
  );
}

/** Governance / status chip on a solid surface. */
export function StateChip(props: { state: string; label?: string }) {
  const meta: Record<string, [string, string]> = {
    green: [color.green, "rgba(78,138,90,.14)"],
    approved: [color.green, "rgba(78,138,90,.14)"],
    won: [color.green, "rgba(78,138,90,.14)"],
    warning: [color.goldDeep, "rgba(232,163,61,.16)"],
    pending: [color.goldDeep, "rgba(232,163,61,.16)"],
    blocked: [color.red, "rgba(192,80,77,.14)"],
    lost: [color.muted, "rgba(107,122,147,.18)"],
  };
  const [ink, bg] = meta[props.state] ?? [color.muted, "rgba(107,122,147,.18)"];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: radius.pill,
        fontSize: 11,
        fontWeight: 700,
        color: ink,
        background: bg,
        whiteSpace: "nowrap",
      }}
    >
      {props.label ?? props.state}
    </span>
  );
}

/** Gold primary action (solid, capsule). */
export function GoldButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      style={{
        font: "inherit",
        fontSize: 13,
        fontWeight: 800,
        padding: "10px 20px",
        borderRadius: radius.capsule,
        border: "none",
        cursor: props.disabled ? "not-allowed" : "pointer",
        background: props.disabled
          ? "var(--track)"
          : `linear-gradient(135deg, ${color.gold}, ${color.goldDeep})`,
        color: props.disabled ? "var(--faint)" : color.navy,
        boxShadow: props.disabled ? "none" : "0 4px 14px rgba(199,127,26,.34)",
      }}
    >
      {props.children}
    </button>
  );
}

/** Quiet secondary action (solid). */
export function QuietButton(props: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      style={{
        font: "inherit",
        fontSize: 13,
        fontWeight: 700,
        padding: "9px 18px",
        borderRadius: radius.capsule,
        border: "1px solid var(--border)",
        cursor: props.disabled ? "not-allowed" : "pointer",
        background: "var(--surface)",
        color: props.disabled ? "var(--faint)" : "var(--ink-2)",
      }}
    >
      {props.children}
    </button>
  );
}

/** Segmented pill group on a solid surface (e.g. proposal locale toggle). */
export function SolidSegmented<T extends string>(props: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
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
        borderRadius: radius.pill,
        padding: 4,
      }}
    >
      {props.options.map((o) => {
        const active = o.value === props.value;
        return (
          <button
            key={o.value}
            aria-pressed={active}
            disabled={props.disabled}
            onClick={() => props.onChange(o.value)}
            style={{
              font: "inherit",
              fontSize: 12,
              fontWeight: active ? 800 : 600,
              padding: "5px 14px",
              borderRadius: radius.pill,
              border: "none",
              cursor: props.disabled ? "not-allowed" : "pointer",
              background: active ? color.gold : "transparent",
              color: active ? color.navy : "var(--muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Empty state for phased-out features — honest, with a phase badge. */
export function EmptyState(props: {
  phase: string;
  title: string;
  body: string;
  note?: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        padding: "40px 32px",
        textAlign: "center",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <span
        style={{
          display: "inline-block",
          padding: "3px 12px",
          borderRadius: radius.pill,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: ".06em",
          color: color.goldDeep,
          background: "rgba(232,163,61,.16)",
        }}
      >
        {props.phase}
      </span>
      <h2 style={{ fontSize: 19, fontWeight: 800, margin: "14px 0 10px" }}>{props.title}</h2>
      <p style={{ color: "var(--ink-2)", fontSize: 13.5, lineHeight: 1.65, margin: "0 auto", maxWidth: 560 }}>
        {props.body}
      </p>
      {props.note && (
        <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>{props.note}</p>
      )}
      {props.action && <div style={{ marginTop: 18 }}>{props.action}</div>}
    </div>
  );
}

/** Compact money for chart labels ($1.2M / $898K) — deal currency aware. */
export function shortMoney(v: number, currency: string): string {
  const sign = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const sym = currency === "JPY" ? "¥" : "$";
  if (a >= 1e6) return `${sign}${sym}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sign}${sym}${Math.round(a / 1e3)}K`;
  return `${sign}${sym}${Math.round(a)}`;
}
