// Engine smoke test — module surface and preset-base data integrity.
// The full invariant suite lives in engine.test.ts.
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, compute, PRESETS, PRESET_BASES } from "../src/engine/index";

describe("engine module surface", () => {
  it("exposes a version", () => {
    expect(typeof ENGINE_VERSION).toBe("string");
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });

  it("compute() is ported and pure of throw on the reference preset", () => {
    expect(() => compute(PRESETS.remediation)).not.toThrow();
  });

  it("carries the five preset bases verbatim", () => {
    expect(PRESET_BASES).toHaveLength(5);
    const remediation = PRESET_BASES.find((p) => p.key === "remediation")!;
    expect(remediation.name).toContain("Custom Code Remediation");
    expect(remediation.total_units).toBe(12000);
    expect(remediation.cost_rate).toBe(62);
    expect(remediation.ai_coverage).toBe(85);
    expect(remediation.effort_reduction).toBe(70);
  });
});
