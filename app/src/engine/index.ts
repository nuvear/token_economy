// DealSpine pricing engine — PURE module.
// BINDING: no imports beyond the TS stdlib / this directory.
// Verbatim port of the reference AI-SAP-Pricing-Calculator.jsx engine
// (reference case: revenue $1,197,000 · base AI cost $392,445.93 ·
// legacy d* 32.48% · risk-adjusted max safe discount ≈ 12.5%).

export {
  ENGINE_VERSION,
  TIERS,
  MODELS,
  MIN_PLATFORM_REINVESTMENT_PCT,
  makePreset,
  PRESETS,
  computeTokenEconomics,
  compute,
} from "./engine";

export type {
  PricingModelId,
  ComplexityTier,
  RoleRate,
  ModelRoute,
  PresetBaseInput,
  PresetInput,
  Adjustment,
  TierMetric,
  Gate,
  Scenario,
  Governance,
  TokenEconomics,
  EngineResult,
} from "./engine";

export { asMarkdownQuote } from "./asMarkdown";

export { PRESET_BASES, type PresetBase } from "./presets";
