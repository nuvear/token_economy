// THE INVARIANT SUITE — hard merge gate. Exact numbers from the reference
// case in AI-SAP-Pricing-Calculator.jsx (Custom Code Remediation preset).
// If any of these move, the engine port has drifted from the deck's economics.
import { describe, expect, it } from "vitest";
import {
  compute,
  computeTokenEconomics,
  makePreset,
  PRESETS,
  MIN_PLATFORM_REINVESTMENT_PCT,
  type PresetInput,
} from "../src/engine/index";

const remediation = (): PresetInput => ({ ...PRESETS.remediation });

describe("engine invariants — remediation reference case", () => {
  const r = compute(PRESETS.remediation);

  it("traditional revenue is exactly $1,197,000", () => {
    expect(r.tradRevenue).toBe(1197000);
  });

  it("base AI cost is ~$392,445.93 (±0.01)", () => {
    expect(r.baseAiCost).toBeCloseTo(392445.93, 1);
    expect(Math.abs(r.baseAiCost - 392445.93)).toBeLessThanOrEqual(0.01);
  });

  it("legacy breakeven discount is ~32.477% (±0.0001)", () => {
    expect(Math.abs(r.legacyBreakevenDiscount - 0.32477)).toBeLessThanOrEqual(0.0001);
  });

  it("risk-adjusted max safe discount is ~12.50% (±0.0005)", () => {
    expect(Math.abs(r.maxSafeDiscount - 0.125)).toBeLessThanOrEqual(0.0005);
  });

  it("default governance verdict is BLOCKED (25% default discount exceeds the risk-adjusted floor)", () => {
    expect(r.governance.title).toBe("BLOCKED — POLICY OR ECONOMIC FLOOR FAILED");
    expect(r.governance.level).toBe(2);
    expect(r.governance.noBid).toBe(false);
  });

  it("published tier prices follow the deck's rate card: $120 / $260 / $520", () => {
    const prices = PRESETS.remediation.complexityTiers.map((t) => t.publishedPrice);
    expect(prices).toEqual([120, 260, 520]);
  });

  it("returns every field the reference UI copy maps to", () => {
    expect(r.dStarProjected).toBeGreaterThan(r.legacyBreakevenDiscount);
    expect(r.value.gpPerTotalHour).toBeGreaterThan(0);
    expect(r.reinvestmentFunded).toBeCloseTo(r.selected.revenue * 0.03, 6);
    expect(r.gates.length).toBe(33);
    expect(r.selected.model).toBe("value");
  });
});

describe("contested-deal path", () => {
  it("a VERIFIED $490K rival bid swaps in the defense floor (requiredRevenue < uncontestedFloorRevenue)", () => {
    const p: PresetInput = {
      ...remediation(),
      dealContext: "Contested",
      competingBidAmount: 490000,
      bidEvidence: "Verified quote",
    };
    const r = compute(p);
    expect(r.contested).toBe(true);
    expect(r.contestedValid).toBe(true);
    expect(r.requiredRevenue).toBe(r.defenseFloorRevenue);
    expect(r.requiredRevenue).toBeLessThan(r.uncontestedFloorRevenue);
    expect(r.competitorCeiling).toBeCloseTo(490000 * 1.1, 6);
  });

  it("an UNVERIFIED bid keeps the uncontested floor (procurement bluffing must not collapse it)", () => {
    for (const evidence of ["None", "Rumor", "Procurement claim"]) {
      const p: PresetInput = {
        ...remediation(),
        dealContext: "Contested",
        competingBidAmount: 490000,
        bidEvidence: evidence,
      };
      const r = compute(p);
      expect(r.contested).toBe(true);
      expect(r.contestedValid).toBe(false);
      expect(r.requiredRevenue).toBe(r.uncontestedFloorRevenue);
      expect(r.competitorCeiling).toBe(Infinity);
      const bidGate = r.gates.find((g) => g.label === "Competing-bid evidence verified before floor relief")!;
      expect(bidGate.pass).toBe(false);
      expect(bidGate.severity).toBe("hard");
    }
  });
});

describe("token economics", () => {
  it("loopCap caps the agent-overhead retry factor", () => {
    const base = remediation(); // agentOverheadPct 50 → uncapped retry factor 1.5
    const uncapped = computeTokenEconomics({ ...base, loopCap: 5 });
    const capped = computeTokenEconomics({ ...base, loopCap: 1.2 });
    expect(uncapped.tokenPerUnit).toBeCloseTo((0.6 * 0.95 + 0.45 * 0.95) * 1.5, 10);
    expect(capped.tokenPerUnit).toBeCloseTo((0.6 * 0.95 + 0.45 * 0.95) * 1.2, 10);
    expect(capped.tokenPerUnit).toBeLessThan(uncapped.tokenPerUnit);
    // loopCap below 1 clamps to 1, never below.
    const floored = computeTokenEconomics({ ...base, loopCap: 0.5 });
    expect(floored.tokenPerUnit).toBeCloseTo(0.6 * 0.95 + 0.45 * 0.95, 10);
  });
});

describe("value-anchor clamp", () => {
  it("empty baselineSource + factor 130% clamps the anchor to the internal baseline (tradRevenue)", () => {
    const p: PresetInput = {
      ...remediation(),
      baselineSource: "",
      customerAlternativeFactorPct: 130,
    };
    const r = compute(p);
    expect(r.validatedAlternative).toBe(r.tradRevenue);
    expect(r.anchorUnvalidated).toBe(true);
    const anchorGate = r.gates.find((g) => g.label === "Value anchor has a recorded evidence source")!;
    expect(anchorGate.pass).toBe(false);
  });

  it("an unsourced dollar override is ignored", () => {
    const p: PresetInput = {
      ...remediation(),
      baselineSource: "   ",
      customerAlternativeValue: 2500000,
    };
    const r = compute(p);
    expect(r.validatedAlternative).toBe(r.tradRevenue);
    expect(r.anchorUnvalidated).toBe(true);
  });

  it("a sourced dollar override is honored", () => {
    const p: PresetInput = { ...remediation(), customerAlternativeValue: 1500000 };
    const r = compute(p);
    expect(r.validatedAlternative).toBe(1500000);
    expect(r.anchorUnvalidated).toBe(false);
  });
});

describe("policy constants and presets", () => {
  it("platform-reinvestment policy floor is 3%", () => {
    expect(MIN_PLATFORM_REINVESTMENT_PCT).toBe(0.03);
  });

  it("makePreset reproduces the PRESETS entry from its base numbers", () => {
    const rebuilt = makePreset({
      name: "Custom Code Remediation — ECC → S/4HANA",
      tagline: "Case example from the framework deck",
      unit: "object", unitPlural: "objects",
      populationLabel: "Custom objects in ECC estate", scopeLabel: "Objects needing remediation",
      totalUnits: 12000, scopePct: 30, hrsPerUnit: 3.5, billRate: 95, costRate: 62,
      aiCoverage: 85, effortReduction: 70, qaAddBack: 10, platformCost: 25000,
      teamFtes: 8, openingBandPct: 25,
      llmTier: "workhorse", priceIn: 3, priceOut: 15, tokensInK: 200, tokensOutK: 30,
      agentOverheadPct: 50, tokenDiscountPct: 5,
      pricingModel: "value", premiumPct: 15, discountPct: 25,
    });
    expect(rebuilt).toEqual(PRESETS.remediation);
    expect(rebuilt.minimumEngagementFee).toBe(Math.round(1197000 * 0.2));
  });

  it("all five presets compute without error and preserve the savings pool identity", () => {
    for (const key of Object.keys(PRESETS)) {
      const r = compute(PRESETS[key]);
      expect(r.tradRevenue).toBeGreaterThan(0);
      expect(r.baseAiCost).toBeGreaterThan(0);
      expect(r.grossProductivitySavings).toBeCloseTo(r.tradCost - r.baseAiCost, 6);
      expect(r.gates.length).toBe(33);
    }
  });
});
