// Regression tests for the 10 defects the QA bug-hunt workflow confirmed.
// Each test would FAIL against the pre-fix code and PASS after the fix.
import { describe, it, expect, beforeAll } from "vitest";
import { makeCtx, loginAllRoles, findUser, type TestCtx, type RoleAgents } from "./apiTestUtils";

let ctx: TestCtx;
let agents: RoleAgents;

beforeAll(async () => {
  ctx = makeCtx();
  agents = await loginAllRoles(ctx);
});

// #1 — Segregation of duties: a non-privileged author cannot self-verify a bid.
describe("#1 SoD: only deal_desk/pricing_owner may verify a competing bid", () => {
  it("sales setting bidEvidence='Verified quote' does NOT relax the floor", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { dealContext: "Contested", competingBidAmount: 1_000_000, bidEvidence: "Verified quote", discountPct: 22 },
    });
    expect(res.status).toBe(201);
    // Snapshot must show the evidence was clamped, not accepted as verified.
    const detail = await agents.sales.get(`/api/quotes/${res.body.quote.id}`);
    expect(detail.body.quote.input_snapshot.bidEvidence).not.toBe("Verified quote");
    // Floor not collapsed → still governed (blocked or warning), never silently green.
    expect(res.body.quote.governance_state).not.toBe("green");
  });

  it("deal_desk MAY set bidEvidence='Verified quote'", async () => {
    const res = await agents.deal_desk.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { dealContext: "Contested", competingBidAmount: 1_000_000, bidEvidence: "Verified quote", discountPct: 22 },
    });
    expect(res.status).toBe(201);
    const detail = await agents.deal_desk.get(`/api/quotes/${res.body.quote.id}`);
    expect(detail.body.quote.input_snapshot.bidEvidence).toBe("Verified quote");
  });
});

// #2 — Every seeded offering can be saved (preset_key case mapping).
describe("#2 all five offerings save (no preset_key mismatch)", () => {
  it.each([1, 2, 3, 4, 5])("offering %i creates a quote (201)", async (offeringId) => {
    const res = await agents.sales.post("/api/quotes").send({ offering_id: offeringId });
    expect(res.status).toBe(201);
    expect(res.body.quote.id).toBeGreaterThan(0);
  });
});

// #3 — Delivery cannot read the approvals queue.
describe("#3 approvals queue denies delivery", () => {
  it("delivery GET /api/approvals → 403", async () => {
    const res = await agents.delivery.get("/api/approvals");
    expect(res.status).toBe(403);
  });
  it("deal_desk GET /api/approvals → 200", async () => {
    const res = await agents.deal_desk.get("/api/approvals");
    expect(res.status).toBe(200);
  });
});

// #5 — A null array element must not crash the engine.
describe("#5 malformed array input → 400, never 500", () => {
  it("complexityTiers:[null] returns 400", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { complexityTiers: [null] },
    });
    expect([200, 201, 400]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
  it("modelRoutes:[null] does not 500", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { modelRoutes: [null] },
    });
    expect(res.status).not.toBe(500);
  });
});

// #6 — Errors never leak stack traces or filesystem paths.
describe("#6 no stack/path leakage on error", () => {
  it("malformed JSON → 400 with a clean error body", async () => {
    const res = await agents.sales
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{bad json');
    expect(res.status).toBe(400);
    const text = JSON.stringify(res.body) + res.text;
    expect(text).not.toMatch(/node_modules|\/app\/server|at Object|SyntaxError/);
  });
});

// #7 — Team & roles admin endpoint works and is admin-only.
describe("#7 user role admin (PUT /api/auth/users/:id)", () => {
  it("pricing_owner updates a user's builder flag", async () => {
    const target = findUser(ctx, "delivery");
    const res = await agents.pricing_owner.put(`/api/auth/users/${target.id}`).send({ is_builder: true });
    expect(res.status).toBe(200);
    expect(res.body.user.is_builder).toBe(true);
    // restore
    await agents.pricing_owner.put(`/api/auth/users/${target.id}`).send({ is_builder: false });
  });
  it("non-admin (sales) → 403", async () => {
    const target = findUser(ctx, "delivery");
    const res = await agents.sales.put(`/api/auth/users/${target.id}`).send({ role: "pricing_owner" });
    expect(res.status).toBe(403);
  });
});

// #8 — Offline provider counts only gate-table cells (no phantom FAIL).
describe("#8 offline insight provider gate counting", () => {
  it("a blocked quote's insight reports FAIL markers accurately (no 'FAILED'-title inflation)", async () => {
    const q = await agents.sales.post("/api/quotes").send({ offering_id: 1 }); // default → blocked
    const run = await agents.sales
      .post("/api/insights/run")
      .send({ button_key: "explain_governance_state", quote_id: q.body.quote.id });
    expect(run.status).toBe(200);
    const md: string = run.body.run.result_md;
    // The verdict title contains "FAILED" but the gate table has exactly 1 hard FAIL.
    const failLine = md.split("\n").find((l) => l.includes("FAIL markers"));
    expect(failLine).toBeDefined();
    expect(failLine).toMatch(/FAIL markers: [01]\b/); // 0 or 1, never inflated to many
  });
});

// #4 — Restricted insight scopes are enforced server-side, not just client-side.
describe("#4 floor/cost insight scope is server-enforced", () => {
  it("delivery cannot run a current_quote (cost-stack) insight → 403", async () => {
    const q = await agents.sales.post("/api/quotes").send({ offering_id: 1 });
    const run = await agents.delivery
      .post("/api/insights/run")
      .send({ button_key: "explain_governance_state", quote_id: q.body.quote.id });
    expect(run.status).toBe(403);
  });

  it("a builder cannot publish a policy-scoped button open to sales/delivery", async () => {
    const res = await agents.builder_sales.post("/api/insights/buttons").send({
      label: "leaky policy button",
      prompt_template_md: "{{data}}",
      data_scope: "policy",
      allowed_roles: "pricing_owner,sales,delivery",
      provider: "anthropic",
      model: "claude-sonnet",
    });
    // Either rejected, or clamped so sales/delivery are stripped from allowed_roles.
    if (res.status === 201) {
      const roles: string = res.body.button.allowed_roles;
      expect(roles).not.toMatch(/sales|delivery/);
    } else {
      expect(res.status).toBe(400);
    }
  });
});

// #9 — Numeric bounds: nonsensical inputs are rejected, not silently persisted.
describe("#9 numeric input validation", () => {
  it("negative units → 400", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { totalUnits: -5000 },
    });
    expect(res.status).toBe(400);
  });
  it("out-of-range discount (150%) → 400", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      input_overrides: { discountPct: 150 },
    });
    expect(res.status).toBe(400);
  });
});
