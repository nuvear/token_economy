// Sold-vs-actual — mockup: design/mockups/DealSpine Engagements.dc.html.
// HONEST Phase-2 placeholder (PRD §3: engagements/sold-vs-actual arrive with
// the evidence loop): screen frame, explanatory empty state, disabled CTAs.
import { useUi } from "../shell/Shell";
import { radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { EmptyState, GoldButton, PageHeader } from "./parts/ui";

export default function Engagements() {
  const { locale } = useUi();

  const tabs = [lt("engagements.tab_active", locale), lt("engagements.tab_complete", locale)];

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        locale={locale}
        kicker={lt("engagements.kicker", locale)}
        title={lt("engagements.title", locale)}
        right={
          <GoldButton disabled title={lt("common.phase2_disabled", locale)}>
            + {lt("engagements.new", locale)}
          </GoldButton>
        }
      />

      {/* Filter tabs — frame only, disabled until Phase 2 */}
      <div
        role="tablist"
        aria-label={lt("engagements.title", locale)}
        style={{
          display: "inline-flex",
          gap: 4,
          background: "var(--surface-alt)",
          border: "1px solid var(--border)",
          borderRadius: radius.pill,
          padding: 4,
          marginBottom: 20,
        }}
      >
        {tabs.map((label, i) => (
          <button
            key={label}
            role="tab"
            aria-selected={i === 0}
            disabled
            title={lt("common.phase2_disabled", locale)}
            style={{
              font: "inherit",
              fontSize: 12,
              fontWeight: i === 0 ? 800 : 600,
              padding: "5px 14px",
              borderRadius: radius.pill,
              border: "none",
              cursor: "not-allowed",
              background: i === 0 ? "var(--surface)" : "transparent",
              color: "var(--faint)",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <EmptyState
        phase={lt("engagements.phase", locale)}
        title={lt("engagements.empty_title", locale)}
        body={lt("engagements.empty_body", locale)}
        note={lt("engagements.empty_note", locale)}
        action={
          <a
            href="#/portfolio"
            style={{
              display: "inline-block",
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 700,
              padding: "9px 18px",
              borderRadius: radius.capsule,
              border: "1px solid var(--border)",
              background: "var(--surface)",
              color: "var(--ink-2)",
            }}
          >
            {lt("nav.portfolio", locale)} →
          </a>
        }
      />
    </div>
  );
}
