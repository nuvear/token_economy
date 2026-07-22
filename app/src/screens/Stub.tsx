// Shared placeholder for scaffold route stubs. Content surfaces are
// SOLID (design rule: glass is navigation-layer only).
import { useUi } from "../shell/Shell";
import { t } from "../i18n";
import { elevation, radius } from "../tokens";

export function ScreenStub({ titleKey, todo }: { titleKey: string; todo: string }) {
  const { locale } = useUi();
  return (
    <section
      style={{
        maxWidth: 860,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: radius.card,
        boxShadow: elevation.card,
        padding: "20px 24px",
      }}
    >
      <div className="kicker" lang={locale === "ja" ? "ja" : undefined}>
        {t("app.name", locale)}
      </div>
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: "6px 0 10px" }}>
        {t(titleKey, locale)}
      </h1>
      <p style={{ color: "var(--muted)", margin: "0 0 12px" }}>{t("common.todo", locale)}</p>
      <p style={{ color: "var(--ink-2)", margin: 0, fontSize: 13 }}>
        <strong>TODO:</strong> {todo}
      </p>
    </section>
  );
}
