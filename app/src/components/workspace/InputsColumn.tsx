// Deal Workspace · Column A — the three input steps (solid cards),
// every field bound 1:1 to an engine PresetInput field.
import { color } from "../../tokens";
import { fmtPct, type Locale } from "../../i18n";
import { TIERS, MODELS } from "../../engine";
import type { EngineResult, PresetInput, PricingModelId } from "../../engine";
import { Card, Kicker, NumField, SliderField, hintStyle, lblStyle } from "./ui";
import { fill, tw } from "./strings";

export type SetField = <K extends keyof PresetInput>(key: K, value: PresetInput[K]) => void;

/** The three pricing choices shown in the mockup (subscription stays API-only). */
const MODEL_IDS: PricingModelId[] = ["tm", "premium", "value"];

const MODEL_COPY_JA: Record<PricingModelId, { label: string; note: string }> = {
  tm: { label: "T&M パススルー", note: "AI時間 × 旧単価 — マージンの罠" },
  premium: { label: "プレミアム T&M", note: "AI時間 × 単価 + プレミアム" },
  value: { label: "オブジェクト単位バリュー価格", note: "従来価格 − 顧客割引" },
  subscription: { label: "ソリューション・サブスクリプション", note: "導入 + 継続料金 + 超過分" },
};

export function InputsColumn(props: {
  input: PresetInput;
  result: EngineResult;
  locale: Locale;
  disabled: boolean;
  set: SetField;
}) {
  const { input: st, result: r, locale, disabled, set } = props;
  const T = (k: Parameters<typeof tw>[0]) => tw(k, locale);
  const ja = locale === "ja";

  const pickTier = (id: string) => {
    set("llmTier", id);
    const tier = TIERS[id as keyof typeof TIERS];
    if (tier && tier.pin !== null && tier.pout !== null) {
      set("priceIn", tier.pin);
      set("priceOut", tier.pout);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Step 1 · Baseline */}
      <Card>
        <Kicker locale={locale}>{T("step1")}</Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          <NumField label={T("population")} value={st.totalUnits} step={100} disabled={disabled} onChange={(v) => set("totalUnits", v)} />
          <SliderField
            label={T("scope")}
            value={st.scopePct}
            display={`${st.scopePct}%`}
            min={5}
            max={100}
            disabled={disabled}
            onChange={(v) => set("scopePct", v)}
            hint={fill(T("unitsInScope"), {
              "%n": new Intl.NumberFormat(ja ? "ja-JP" : "en-US").format(r.unitsInScope),
              "%u": ja ? "オブジェクト" : st.unitPlural,
            })}
          />
          <NumField label={T("hrsPerUnit")} value={st.hrsPerUnit} step={0.5} disabled={disabled} onChange={(v) => set("hrsPerUnit", v)} />
          <NumField label={T("billRate")} value={st.billRate} disabled={disabled} onChange={(v) => set("billRate", v)} />
          <NumField label={T("costRate")} value={st.costRate} disabled={disabled} onChange={(v) => set("costRate", v)} />
        </div>
      </Card>

      {/* Step 2 · AI cost of delivery */}
      <Card>
        <Kicker locale={locale}>{T("step2")}</Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          <SliderField label={T("coverage")} value={st.aiCoverage} display={`${st.aiCoverage}%`} min={0} max={100} disabled={disabled} onChange={(v) => set("aiCoverage", v)} />
          <SliderField label={T("effort")} value={st.effortReduction} display={`${st.effortReduction}%`} min={0} max={90} disabled={disabled} onChange={(v) => set("effortReduction", v)} />
          <SliderField label={T("qa")} value={st.qaAddBack} display={`${st.qaAddBack}%`} min={0} max={40} disabled={disabled} onChange={(v) => set("qaAddBack", v)} />

          {/* LLM assumptions sub-panel (solid alt surface) */}
          <div style={{ background: "var(--surface-alt)", borderRadius: 10, padding: 12 }}>
            <Kicker locale={locale} small>
              {T("llm")}
            </Kicker>
            <div style={{ marginTop: 8 }}>
              <label style={{ ...lblStyle, display: "block" }}>{T("tier")}</label>
              <select
                value={st.llmTier}
                disabled={disabled}
                onChange={(e) => pickTier(e.target.value)}
                aria-label={T("tier")}
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
                {Object.entries(TIERS).map(([id, tier]) => (
                  <option key={id} value={id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              {(
                [
                  ["tokIn", "tokensInK", 10] as const,
                  ["tokOut", "tokensOutK", 5] as const,
                ]
              ).map(([labelKey, field, step]) => (
                <div key={field} style={{ flex: 1 }}>
                  <label style={hintStyle}>{T(labelKey)}</label>
                  <input
                    type="number"
                    step={step}
                    value={st[field]}
                    disabled={disabled}
                    onChange={(e) => set(field, Number(e.target.value) || 0)}
                    aria-label={T(labelKey)}
                    style={{
                      width: "100%",
                      textAlign: "right",
                      border: "1px solid var(--border)",
                      borderRadius: 7,
                      padding: "5px 7px",
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "var(--ink)",
                      fontVariantNumeric: "tabular-nums",
                      background: "var(--surface)",
                      marginTop: 3,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>
              <SliderField
                label={T("overhead")}
                value={st.agentOverheadPct}
                display={`${st.agentOverheadPct}%`}
                min={0}
                max={200}
                small
                disabled={disabled}
                onChange={(v) => set("agentOverheadPct", v)}
              />
            </div>
            {/* Token cost readout — solid navy chip, tabular numerals */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: color.navy,
                border: "1px solid var(--panel-border)",
                borderRadius: 8,
                padding: "8px 11px",
                marginTop: 11,
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: ja ? 0 : ".08em", color: color.gold }}>
                {T("tokenCostLabel")}
              </span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
                {new Intl.NumberFormat(ja ? "ja-JP" : "en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(r.tokenPerUnit)}
              </span>
            </div>
          </div>

          <NumField label={T("platform")} value={st.platformCost} step={5000} disabled={disabled} onChange={(v) => set("platformCost", v)} />
        </div>
      </Card>

      {/* Step 3 · Pricing model */}
      <Card>
        <Kicker locale={locale}>{T("step3")}</Kicker>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {MODEL_IDS.map((id) => {
            const m = MODELS.find((x) => x.id === id)!;
            const active = st.pricingModel === id;
            const copy = ja ? MODEL_COPY_JA[id] : { label: m.label, note: m.note };
            return (
              <button
                key={id}
                aria-pressed={active}
                disabled={disabled}
                onClick={() => set("pricingModel", id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: `1px solid ${active ? color.gold : "var(--border)"}`,
                  background: active ? "rgba(232,163,61,.16)" : "var(--surface)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: disabled ? "default" : "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{copy.label}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{copy.note}</div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <SliderField
            label={T("discount")}
            value={st.discountPct}
            display={`${st.discountPct}%`}
            min={0}
            max={50}
            step={0.5}
            disabled={disabled}
            onChange={(v) => set("discountPct", v)}
            hint={fill(T("floorHint"), { "%s": fmtPct(r.maxSafeDiscount, locale) })}
          />
          <div style={{ marginTop: 12 }}>
            <SliderField
              label={T("band")}
              value={st.openingBandPct}
              display={`${st.openingBandPct}%`}
              min={0}
              max={40}
              step={0.5}
              disabled={disabled}
              onChange={(v) => set("openingBandPct", v)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
