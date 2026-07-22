// Deal Workspace — shared solid-surface primitives (content layer).
// Glass is reserved for the governance banner and the action cluster.
import type { CSSProperties, ReactNode } from "react";
import { color, radius } from "../../tokens";
import type { Locale } from "../../i18n";

export const cardStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: radius.card,
  padding: 18,
  boxShadow: "0 1px 2px rgba(11,18,32,0.06)",
};

export const lblStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 500,
  color: "var(--ink-2)",
  lineHeight: 1.4,
};

export const hintStyle: CSSProperties = {
  fontSize: 11,
  color: "var(--muted)",
  marginTop: 5,
  lineHeight: 1.5,
};

export const valNumStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums",
};

export const numInputStyle: CSSProperties = {
  width: 110,
  textAlign: "right",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 9px",
  fontSize: 12.5,
  fontWeight: 700,
  color: "var(--ink)",
  fontVariantNumeric: "tabular-nums",
  background: "var(--surface)",
  fontFamily: "inherit",
};

export function Card(props: { children: ReactNode; style?: CSSProperties }) {
  return <section style={{ ...cardStyle, ...props.style }}>{props.children}</section>;
}

export function Kicker(props: { children: ReactNode; locale: Locale; small?: boolean }) {
  return (
    <div
      className="kicker"
      lang={props.locale === "ja" ? "ja" : undefined}
      style={props.small ? { fontSize: 10, letterSpacing: ".12em" } : undefined}
    >
      {props.children}
    </div>
  );
}

/** Label + right-aligned number input on one row. */
export function NumField(props: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
      <label style={lblStyle}>{props.label}</label>
      <input
        type="number"
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value) || 0)}
        style={{
          ...numInputStyle,
          ...(props.small ? { width: "100%", fontSize: 11.5, padding: "5px 7px", marginTop: 3 } : null),
        }}
        aria-label={props.label}
      />
    </div>
  );
}

/** Label + live value + range slider (instant client-side compute). */
export function SliderField(props: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  hint?: string;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <label style={props.small ? hintStyle : lblStyle}>{props.label}</label>
        <span
          style={
            props.small
              ? { ...valNumStyle, fontSize: 11.5, fontWeight: 700 }
              : valNumStyle
          }
        >
          {props.display}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Number(e.target.value))}
        style={{ width: "100%", marginTop: props.small ? 6 : 8 }}
        aria-label={props.label}
      />
      {props.hint ? <div style={hintStyle}>{props.hint}</div> : null}
    </div>
  );
}

/** Small labeled select on a solid surface. */
export function SelectField(props: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ ...lblStyle, display: "block" }}>{props.label}</label>
      <select
        value={props.value}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.value)}
        aria-label={props.label}
        style={{
          width: "100%",
          marginTop: 5,
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "7px 9px",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--ink)",
          background: "var(--surface)",
          fontFamily: "inherit",
        }}
      >
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Gold/green/red status pill (solid). */
export function Pill(props: { tone: "green" | "gold" | "red"; children: ReactNode }) {
  const map = {
    green: { c: "var(--pass-ink)", bg: "rgba(78,138,90,.14)" },
    gold: { c: "var(--warn-ink)", bg: "rgba(232,163,61,.16)" },
    red: { c: color.red, bg: "rgba(192,80,77,.14)" },
  } as const;
  const { c, bg } = map[props.tone];
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: ".06em",
        padding: "3px 7px",
        borderRadius: radius.pill,
        color: c,
        background: bg,
        minWidth: 44,
        textAlign: "center",
        display: "inline-block",
      }}
    >
      {props.children}
    </span>
  );
}
