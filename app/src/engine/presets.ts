// Offering preset BASE numbers, copied verbatim from the reference
// AI-SAP-Pricing-Calculator.jsx PRESETS (the arguments to makePreset).
// PURE data module — no imports. The seed script turns these into the
// five seeded offerings; the engine phase's makePreset() expands them
// into full parameter sets.

export interface PresetBase {
  key: string;
  name: string;
  tagline: string;
  unit: string;
  unit_plural: string;
  population_label: string;
  scope_label: string;
  total_units: number;
  scope_pct: number;
  hrs_per_unit: number;
  bill_rate: number;
  cost_rate: number;
  ai_coverage: number;
  effort_reduction: number;
  qa_add_back: number;
  platform_cost: number;
  team_ftes: number;
  opening_band_pct: number;
  llm_tier: string;
  price_in: number;
  price_out: number;
  tokens_in_k: number;
  tokens_out_k: number;
  agent_overhead_pct: number;
  token_discount_pct: number;
  pricing_model: string;
  premium_pct: number;
  discount_pct: number;
}

export const PRESET_BASES: PresetBase[] = [
  {
    key: "remediation",
    name: "Custom Code Remediation — ECC → S/4HANA",
    tagline: "Case example from the framework deck",
    unit: "object",
    unit_plural: "objects",
    population_label: "Custom objects in ECC estate",
    scope_label: "Objects needing remediation",
    total_units: 12000,
    scope_pct: 30,
    hrs_per_unit: 3.5,
    bill_rate: 95,
    cost_rate: 62,
    ai_coverage: 85,
    effort_reduction: 70,
    qa_add_back: 10,
    platform_cost: 25000,
    team_ftes: 8,
    opening_band_pct: 25,
    llm_tier: "workhorse",
    price_in: 3,
    price_out: 15,
    tokens_in_k: 200,
    tokens_out_k: 30,
    agent_overhead_pct: 50,
    token_discount_pct: 5,
    pricing_model: "value",
    premium_pct: 15,
    discount_pct: 25,
  },
  {
    key: "test_automation",
    name: "Test Script Automation — S/4 Regression Suite",
    tagline: "Manual test cases converted to automated scripts",
    unit: "test case",
    unit_plural: "test cases",
    population_label: "Test cases in regression suite",
    scope_label: "Test cases worth automating",
    total_units: 4000,
    scope_pct: 70,
    hrs_per_unit: 2.5,
    bill_rate: 85,
    cost_rate: 55,
    ai_coverage: 90,
    effort_reduction: 75,
    qa_add_back: 8,
    platform_cost: 20000,
    team_ftes: 6,
    opening_band_pct: 25,
    llm_tier: "efficient",
    price_in: 1,
    price_out: 5,
    tokens_in_k: 250,
    tokens_out_k: 60,
    agent_overhead_pct: 60,
    token_discount_pct: 10,
    pricing_model: "value",
    premium_pct: 15,
    discount_pct: 25,
  },
  {
    key: "data_migration",
    name: "Data Migration Objects — ECC → S/4HANA",
    tagline: "Extraction, mapping, cleansing and load per data object",
    unit: "data object",
    unit_plural: "data objects",
    population_label: "Data objects identified",
    scope_label: "Data objects in migration scope",
    total_units: 250,
    scope_pct: 80,
    hrs_per_unit: 40,
    bill_rate: 100,
    cost_rate: 65,
    ai_coverage: 70,
    effort_reduction: 55,
    qa_add_back: 15,
    platform_cost: 40000,
    team_ftes: 6,
    opening_band_pct: 20,
    llm_tier: "workhorse",
    price_in: 3,
    price_out: 15,
    tokens_in_k: 1500,
    tokens_out_k: 250,
    agent_overhead_pct: 60,
    token_discount_pct: 10,
    pricing_model: "value",
    premium_pct: 15,
    discount_pct: 20,
  },
  {
    key: "interfaces",
    name: "Interface Development — BTP / CPI",
    tagline: "Legacy interfaces rebuilt as clean-core integrations",
    unit: "interface",
    unit_plural: "interfaces",
    population_label: "Interfaces in landscape",
    scope_label: "Interfaces to rebuild",
    total_units: 120,
    scope_pct: 100,
    hrs_per_unit: 60,
    bill_rate: 110,
    cost_rate: 70,
    ai_coverage: 75,
    effort_reduction: 50,
    qa_add_back: 12,
    platform_cost: 35000,
    team_ftes: 8,
    opening_band_pct: 20,
    llm_tier: "frontier",
    price_in: 5,
    price_out: 25,
    tokens_in_k: 1200,
    tokens_out_k: 300,
    agent_overhead_pct: 60,
    token_discount_pct: 7,
    pricing_model: "value",
    premium_pct: 15,
    discount_pct: 20,
  },
  {
    key: "custom",
    name: "Custom Offering",
    tagline: "Define your own unit of work and parameters",
    unit: "unit",
    unit_plural: "units",
    population_label: "Units in total population",
    scope_label: "Units in scope",
    total_units: 1000,
    scope_pct: 50,
    hrs_per_unit: 8,
    bill_rate: 100,
    cost_rate: 65,
    ai_coverage: 70,
    effort_reduction: 60,
    qa_add_back: 10,
    platform_cost: 25000,
    team_ftes: 5,
    opening_band_pct: 25,
    llm_tier: "workhorse",
    price_in: 3,
    price_out: 15,
    tokens_in_k: 600,
    tokens_out_k: 100,
    agent_overhead_pct: 60,
    token_discount_pct: 5,
    pricing_model: "value",
    premium_pct: 15,
    discount_pct: 25,
  },
];
