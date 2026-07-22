// Deal Workspace — floating action cluster (GLASS capsule; the actions are
// navigation-layer chrome). Save / Export / Generate proposal.
import type { CSSProperties, ReactNode } from "react";
import { color, elevation, glass, radius, type GlassStop } from "../../tokens";
import type { Locale } from "../../i18n";
import { tw } from "./strings";

function glassStyle(stop: GlassStop): CSSProperties {
  const g = glass[stop];
  return {
    backdropFilter: g.backdropFilter,
    WebkitBackdropFilter: g.backdropFilter,
    background: g.background,
    border: g.border,
  };
}

function FabButton(props: {
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  const base: CSSProperties = props.primary
    ? {
        background: color.gold,
        border: "none",
        color: color.navy,
        fontWeight: 800,
        padding: "10px 18px",
      }
    : {
        background: "rgba(255,255,255,.1)",
        border: "1px solid rgba(255,255,255,.16)",
        color: color.ice,
        fontWeight: 600,
        padding: "10px 16px",
      };
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        borderRadius: radius.capsule,
        cursor: props.disabled ? "default" : "pointer",
        fontFamily: "inherit",
        fontSize: 13,
        opacity: props.disabled ? 0.45 : 1,
        ...base,
      }}
    >
      {props.icon}
      {props.children}
    </button>
  );
}

export function ActionCluster(props: {
  locale: Locale;
  glassStop: GlassStop;
  canSave: boolean;
  canGenerate: boolean;
  busy: boolean;
  onSave: () => void;
  onExport: () => void;
  onGenerate: () => void;
}) {
  const T = (k: Parameters<typeof tw>[0]) => tw(k, props.locale);
  return (
    <div
      className="glass"
      style={{
        ...glassStyle(props.glassStop),
        position: "fixed",
        right: 26,
        bottom: 24,
        zIndex: 50,
        display: "flex",
        gap: 8,
        padding: 8,
        borderRadius: radius.capsule,
        boxShadow: elevation.cluster,
      }}
    >
      <FabButton
        disabled={!props.canSave || props.busy}
        onClick={props.onSave}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
          </svg>
        }
      >
        {T("save")}
      </FabButton>
      <FabButton
        disabled={props.busy}
        onClick={props.onExport}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        }
      >
        {T("export")}
      </FabButton>
      <FabButton
        primary
        disabled={!props.canGenerate || props.busy}
        onClick={props.onGenerate}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
            <path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" />
          </svg>
        }
      >
        {T("generate")}
      </FabButton>
    </div>
  );
}
