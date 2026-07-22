// PRD §2 HARD RULE 1: internal cost, margin, and floor figures never render
// on any proposal output, regardless of role or locale. Proven against the
// seeded quote's actual engine outputs (en + ja).
import { beforeAll, describe, expect, it } from "vitest";
import { makeCtx, loginAllRoles, type RoleAgents, type TestCtx } from "./apiTestUtils";

let ctx: TestCtx;
let agents: RoleAgents;
let quoteId: number;
let outputs: Record<string, any>;
let inputs: Record<string, any>;
let proposals: { locale: string; markdown: string; html: string; body: string }[];

const fmt = (v: number): string => Math.round(v).toLocaleString("en-US");

beforeAll(async () => {
  ctx = makeCtx();
  agents = await loginAllRoles(ctx);

  const created = await agents.sales
    .post("/api/quotes")
    .send({ offering_id: 1, title: "Leakage probe quote" });
  expect(created.status).toBe(201);
  quoteId = created.body.quote.id;

  const approvalId = (
    ctx.db
      .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
      .get(quoteId) as { id: number }
  ).id;
  const approved = await agents.deal_desk.post(`/api/approvals/${approvalId}/decision`).send({
    action: "approve",
    rationale: "Leakage-test fixture approval.",
    expires_at: "2026-08-31",
  });
  expect(approved.status).toBe(200);

  const detail = await agents.deal_desk.get(`/api/quotes/${quoteId}`);
  outputs = detail.body.quote.outputs;
  inputs = detail.body.quote.input_snapshot;

  proposals = [];
  for (const locale of ["en", "ja"]) {
    const res = await agents.deal_desk.get(`/api/quotes/${quoteId}/proposal?locale=${locale}`);
    expect(res.status).toBe(200);
    proposals.push({
      locale,
      markdown: res.body.markdown,
      html: res.body.html,
      body: JSON.stringify(res.body),
    });
  }
});

describe("proposal floor-leakage (en + ja, markdown + html + full response body)", () => {
  it("reference-case sanity: the internal figures exist and are non-trivial", () => {
    expect(outputs.requiredRevenue).toBeGreaterThan(0);
    expect(outputs.maxSafeDiscount).toBeGreaterThan(0);
    expect(outputs.baseAiCost).toBeGreaterThan(100000);
  });

  it("never contains the internal dollar figures (cost stack, floors, Rc)", () => {
    const forbiddenAmounts = [
      outputs.requiredRevenue, // the floor
      outputs.marginFloorRevenue,
      outputs.profitFloorRevenue,
      outputs.uncontestedFloorRevenue,
      outputs.defenseFloorRevenue,
      outputs.baseAiCost,
      outputs.fixedRiskAdjustedCost,
      outputs.tradCost,
      outputs.laborCost,
      outputs.tokenCost,
      outputs.selected.cost, // risk-adjusted cost (Rc)
      outputs.selected.profit,
      outputs.targetProfit,
    ].filter((v: number) => Number.isFinite(v) && Math.abs(v) > 0.5);

    for (const p of proposals) {
      for (const amount of forbiddenAmounts) {
        expect(p.body).not.toContain(fmt(amount)); // "1,234,567"
        expect(p.body).not.toContain(String(Math.round(amount))); // "1234567"
      }
    }
  });

  it("never contains the internal percentages (margins, floor discounts)", () => {
    const forbiddenPcts = [
      outputs.maxSafeDiscount, // risk-adjusted floor discount
      outputs.legacyBreakevenDiscount, // naive floor d*
      outputs.riskBreakevenDiscount,
      outputs.dStarProjected,
      outputs.tradMarginPct,
      outputs.selected.marginPct,
    ].filter((v: number) => Number.isFinite(v));

    for (const p of proposals) {
      for (const pct of forbiddenPcts) {
        expect(p.body).not.toContain(`${(pct * 100).toFixed(1)}%`); // "12.5%"
        expect(p.body).not.toContain(`${(pct * 100).toFixed(2)}%`);
      }
    }
  });

  it("never contains the internal cost rate or engine field names", () => {
    for (const p of proposals) {
      expect(p.body).not.toMatch(new RegExp(`\\$${inputs.costRate}\\b`)); // "$62"
      for (const fieldName of [
        "requiredRevenue",
        "maxSafeDiscount",
        "baseAiCost",
        "costRate",
        "marginFloorRevenue",
        "legacyBreakevenDiscount",
      ]) {
        expect(p.body).not.toContain(fieldName);
      }
    }
  });

  it("English copy never uses internal vocabulary", () => {
    const en = proposals.find((p) => p.locale === "en")!;
    expect(en.markdown).not.toMatch(/\bcost\b|\bmargin\b|\bfloor\b|\bdiscount\b|\binternal\b/i);
    expect(en.html).not.toMatch(/\bcost\b|\bmargin\b|\bfloor\b|\bdiscount\b|\binternal\b/i);
  });

  it("Japanese copy never uses internal vocabulary", () => {
    const ja = proposals.find((p) => p.locale === "ja")!;
    for (const word of ["コスト", "原価", "マージン", "利益率", "フロア", "下限価格"]) {
      expect(ja.markdown).not.toContain(word);
      expect(ja.html).not.toContain(word);
    }
  });

  it("does contain exactly the whitelisted customer figures", () => {
    const en = proposals.find((p) => p.locale === "en")!;
    expect(en.markdown).toContain(fmt(outputs.selected.revenue)); // customer price
    expect(en.markdown).toContain(fmt(outputs.validatedAlternative));
    expect(en.markdown).toContain(fmt(outputs.selected.customerSavings));
    expect(en.markdown).toContain("Warranty");
    expect(en.markdown).toContain("Telemetry commitment");
    expect(en.markdown).toContain("Evidence grade");
  });

  it("customer_view carries no cost/margin/floor-shaped fields", () => {
    const res = proposals[0];
    const view = JSON.parse(res.body).customer_view as Record<string, unknown>;
    for (const key of Object.keys(view)) {
      expect(key).not.toMatch(/cost|margin|floor|rate|profit|reinvest|breakeven/i);
    }
  });
});
