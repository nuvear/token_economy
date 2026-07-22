// Deal Workspace · Column C — governance. The verdict banner is GLASS
// (navigation-layer material: it directs what happens next); the gate list
// and contested-bid inputs land on SOLID surfaces (content layer).
// Expand animation is a simple morph honoring prefers-reduced-motion
// (global styles.css kills animation; local rule repeats it for safety).
import { useState, type CSSProperties } from "react";
import { color, elevation, glass, radius, type GlassStop } from "../../tokens";
import { fmtPct, type Locale } from "../../i18n";
import type { EngineResult, Gate, PresetInput } from "../../engine";
import type { SetField } from "./InputsColumn";
import { Card, Kicker, NumField, Pill, SelectField, hintStyle } from "./ui";
import { fill, tw } from "./strings";

type VerdictState = "within" | "review" | "blocked" | "nobid";

/** Four tint states for the glass banner. */
const VERDICT_TINT: Record<VerdictState, { tint: string; bg: string; title: string }> = {
  within: { tint: color.green, bg: "rgba(78,138,90,0.16)", title: "#8FD3A0" },
  review: { tint: color.gold, bg: "rgba(232,163,61,0.16)", title: color.gold },
  blocked: { tint: color.red, bg: "rgba(192,80,77,0.18)", title: "#E89B99" },
  nobid: { tint: color.red, bg: "rgba(192,80,77,0.34)", title: "#F2B8B5" },
};

function verdictState(r: EngineResult): VerdictState {
  if (r.governance.level >= 2) return r.governance.noBid ? "nobid" : "blocked";
  if (r.governance.level === 1) return "review";
  return "within";
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

function usd(v: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ja" ? "ja-JP" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(v));
}

function GateRow({ gate, locale }: { gate: Gate; locale: Locale }) {
  const tone = gate.pass ? "green" : gate.severity === "hard" ? "red" : "gold";
  const label = gate.pass ? tw("gatePass", locale) : gate.severity === "hard" ? tw("gateFail", locale) : tw("gateWarn", locale);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 6px",
        borderBottom: "1px solid var(--hairline)",
      }}
    >
      <Pill tone={tone}>{label}</Pill>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)", flex: 1 }}>{gate.label}</span>
    </div>
  );
}

export function GovernancePanel(props: {
  input: PresetInput;
  result: EngineResult;
  locale: Locale;
  glassStop: GlassStop;
  disabled: boolean;
  set: SetField;
}) {
  const { input: st, result: r, locale, glassStop, disabled, set } = props;
  const T = (k: Parameters<typeof tw>[0]) => tw(k, locale);
  const ja = locale === "ja";
  const [open, setOpen] = useState(false);

  const state = verdictState(r);
  const v = VERDICT_TINT[state];
  // EN shows the engine's exact governance copy; JA maps state → local strings.
  const title = ja ? T(state === "within" ? "within" : state === "review" ? "review" : state === "nobid" ? "nobid" : "blocked") : r.governance.title;
  const message = ja
    ? T(state === "within" ? "msgWithin" : state === "review" ? "msgReview" : state === "nobid" ? "msgNobid" : "msgBlocked")
    : r.governance.message;

  const passCount = r.gates.filter((g) => g.pass).length;
  const summary = fill(T("gateSummary"), {
    "%p": String(passCount),
    "%w": String(r.warnings.length),
    "%f": String(r.hardFailures.length),
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ——— Verdict banner (GLASS, 4 tint states) ——— */}
      <section
        className="glass"
        aria-live="polite"
        style={{
          ...glassStyle(glassStop),
          borderRadius: radius.sheet,
          padding: 18,
          boxShadow: "0 14px 44px rgba(11,18,32,.24)",
          borderTop: `3px solid ${v.tint}`,
          backgroundImage: `linear-gradient(180deg, ${v.bg}, transparent 120px)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            aria-hidden
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: v.tint,
              boxShadow: `0 0 0 4px ${v.bg}`,
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ja ? 0 : ".14em", color: "rgba(255,255,255,.7)" }}>
            {T("governance")}
          </span>
        </div>
        <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10, lineHeight: 1.2, color: v.title }}>{title}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.6, color: color.ice, marginTop: 8 }}>{message}</div>

        <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.14)" }}>
          {(
            [
              [T("floor"), fmtPct(r.legacyBreakevenDiscount, locale), "#fff"],
              [
                T("current"),
                fmtPct(st.discountPct / 100, locale),
                state === "blocked" || state === "nobid" ? "#E89B99" : state === "review" ? color.gold : "#fff",
              ],
              [T("riskMax"), fmtPct(r.maxSafeDiscount, locale), color.gold],
            ] as [string, string, string][]
          ).map(([label, value, ink]) => (
            <div key={label}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: ja ? 0 : ".1em",
                  color: "rgba(217,230,247,.6)",
                  textTransform: ja ? "none" : "uppercase",
                }}
              >
                {label}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: ink, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            </div>
          ))}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            marginTop: 14,
            background: "rgba(255,255,255,.1)",
            border: "1px solid rgba(255,255,255,.2)",
            borderRadius: 10,
            padding: 9,
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#fff",
          }}
        >
          {open ? T("hideGates") : T("showGates")}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden
            style={{ transition: "transform .2s", transform: open ? "rotate(180deg)" : "none" }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </section>

      {/* ——— Gate list morph target (SOLID surface) ——— */}
      {open ? (
        <section
          className="ws-pop"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: radius.sheet,
            padding: 16,
            boxShadow: elevation.rail,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <Kicker locale={locale}>{fill(T("gates"), { "%n": String(r.gates.length) })}</Kicker>
            <span style={{ fontSize: 11, color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>{summary}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 12, maxHeight: 420, overflowY: "auto" }}>
            {r.gates.map((g) => (
              <GateRow key={g.label} gate={g} locale={locale} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ——— Contested-bid block (SOLID surface) ——— */}
      <Card>
        <Kicker locale={locale}>{T("contestedTitle")}</Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
          <SelectField
            label={T("dealContext")}
            value={st.dealContext}
            disabled={disabled}
            options={[
              { value: "Uncontested", label: T("uncontested") },
              { value: "Contested", label: T("contestedOpt") },
            ]}
            onChange={(val) => set("dealContext", val)}
          />
          {st.dealContext === "Contested" ? (
            <>
              <NumField label={T("competingBid")} value={st.competingBidAmount} step={10000} disabled={disabled} onChange={(val) => set("competingBidAmount", val)} />
              <SelectField
                label={T("bidEvidence")}
                value={st.bidEvidence}
                disabled={disabled}
                options={[
                  { value: "None", label: T("evNone") },
                  { value: "Claimed verbally", label: T("evClaimed") },
                  { value: "Verified quote", label: T("evVerified") },
                ]}
                onChange={(val) => set("bidEvidence", val)}
              />
              <NumField label={T("switching")} value={st.switchingPremiumPct} step={1} disabled={disabled} onChange={(val) => set("switchingPremiumPct", val)} />
              <div
                style={{
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                {(
                  [
                    [T("defenseFloor"), usd(r.defenseFloorRevenue, locale)],
                    [T("requiredRevenue"), usd(r.requiredRevenue, locale)],
                    [
                      T("competitorCeiling"),
                      Number.isFinite(r.competitorCeiling) ? usd(r.competitorCeiling, locale) : "—",
                    ],
                    [T("willingnessCeiling"), usd(r.willingnessCeiling, locale)],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: "var(--muted)" }}>{label}</div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <div style={hintStyle}>{T("contestedHint")}</div>
        </div>
      </Card>
    </div>
  );
}
