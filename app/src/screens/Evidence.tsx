// Delivery evidence ledger — mockup: design/mockups/DealSpine Evidence.dc.html.
// HONEST Phase-2 placeholder (PRD §3 phases the evidence loop after governed
// quoting): full screen frame, explanatory empty state, disabled CTAs.
import { useUi } from "../shell/Shell";
import { radius } from "../tokens";
import { lt } from "./parts/i18n-local";
import { EmptyState, GoldButton, PageHeader } from "./parts/ui";

export default function Evidence() {
  const { locale } = useUi();

  const tabs = [
    lt("evidence.tab_all", locale),
    lt("evidence.tab_verified", locale),
    lt("evidence.tab_pending", locale),
    lt("evidence.tab_disputed", locale),
  ];

  return (
    <div style={{ maxWidth: 980 }}>
      <PageHeader
        locale={locale}
        kicker={lt("evidence.kicker", locale)}
        title={lt("evidence.title", locale)}
        right={
          <GoldButton disabled title={lt("common.phase2_disabled", locale)}>
            + {lt("evidence.capture", locale)}
          </GoldButton>
        }
      />

      {/* Filter tabs — frame only, disabled until Phase 2 */}
      <div
        role="tablist"
        aria-label={lt("evidence.title", locale)}
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
        phase={lt("evidence.phase", locale)}
        title={lt("evidence.empty_title", locale)}
        body={lt("evidence.empty_body", locale)}
        note={lt("evidence.empty_note", locale)}
        action={
          <a
            href="#/help"
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
            {lt("common.view_help", locale)} →
          </a>
        }
      />
    </div>
  );
}
