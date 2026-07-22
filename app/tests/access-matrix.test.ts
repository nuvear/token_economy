// One access test per cell of the PRD §2 matrix (the rows this phase serves),
// plus the two hard rules: (2) a quote's author can never be its approver.
// (Hard rule 1 — floor leakage — is proven in floor-leakage.test.ts.)
import { beforeAll, describe, expect, it } from "vitest";
import {
  makeCtx,
  loginAllRoles,
  findUser,
  ROLES,
  type RoleAgents,
  type RoleName,
  type TestCtx,
} from "./apiTestUtils";

let ctx: TestCtx;
let agents: RoleAgents;
let salesQuoteId: number; // authored by the plain sales user, then approved
let ownerQuoteId: number; // authored by pricing_owner (pending approval fixture)
let ownerApprovalId: number;

beforeAll(async () => {
  ctx = makeCtx();
  agents = await loginAllRoles(ctx);

  // Fixture 1: sales creates a quote (defaults are BLOCKED) → deal desk approves it.
  const created = await agents.sales
    .post("/api/quotes")
    .send({ offering_id: 1, title: "Matrix fixture — sales quote" });
  expect(created.status).toBe(201);
  salesQuoteId = created.body.quote.id;
  const approval = ctx.db
    .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
    .get(salesQuoteId) as { id: number };
  const decided = await agents.deal_desk
    .post(`/api/approvals/${approval.id}/decision`)
    .send({
      action: "approve",
      rationale: "Matrix fixture: time-boxed exception for testing.",
      expires_at: "2026-08-31",
    });
  expect(decided.status).toBe(200);

  // Fixture 2: pricing_owner quote with a still-pending approval.
  const owner = await agents.pricing_owner
    .post("/api/quotes")
    .send({ offering_id: 2, title: "Matrix fixture — owner quote" });
  expect(owner.status).toBe(201);
  ownerQuoteId = owner.body.quote.id;
  ownerApprovalId = (
    ctx.db
      .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
      .get(ownerQuoteId) as { id: number }
  ).id;
});

function agentFor(role: RoleName) {
  return agents[role];
}

describe("§2 row: offerings / rate cards / parameter sets", () => {
  it.each(ROLES)("%s can read offerings (200)", async (role) => {
    const res = await agentFor(role).get("/api/offerings");
    expect(res.status).toBe(200);
    expect(res.body.offerings.length).toBeGreaterThanOrEqual(5);
  });

  const editExpectation: Record<RoleName, number> = {
    pricing_owner: 201,
    sales: 403,
    deal_desk: 403,
    delivery: 403,
    leadership: 403,
  };
  it.each(ROLES)("%s POST /api/offerings → expected status", async (role) => {
    const res = await agentFor(role).post("/api/offerings").send({
      preset_key: `matrix_${role}`,
      name: `Matrix offering (${role})`,
      unit: "unit",
      unit_plural: "units",
      base_inputs_json: { total_units: 10 },
    });
    expect(res.status).toBe(editExpectation[role]);
  });

  it.each(ROLES)("%s POST parameter set → pricing_owner only", async (role) => {
    const res = await agentFor(role)
      .post("/api/offerings/1/parameter-sets")
      .send({ version: `m-${role}`, parameters_json: { minGrossMarginPct: 35 } });
    expect(res.status).toBe(role === "pricing_owner" ? 201 : 403);
  });

  it("published parameter sets are immutable (409); new version required", async () => {
    const created = await agents.pricing_owner
      .post("/api/offerings/1/parameter-sets")
      .send({ version: "1.1.0", parameters_json: { minGrossMarginPct: 40 } });
    expect(created.status).toBe(201);
    const id = created.body.parameter_set.id;
    const published = await agents.pricing_owner.post(`/api/parameter-sets/${id}/publish`);
    expect(published.status).toBe(200);
    const edit = await agents.pricing_owner
      .put(`/api/parameter-sets/${id}`)
      .send({ parameters_json: { minGrossMarginPct: 20 } });
    expect(edit.status).toBe(409);
    expect(edit.body.error).toBe("published_parameter_sets_are_immutable");
    const republish = await agents.pricing_owner.post(`/api/parameter-sets/${id}/publish`);
    expect(republish.status).toBe(409);
  });
});

describe("§2 row: deal workspace (simulate, save quotes)", () => {
  const saveExpectation: Record<RoleName, number> = {
    pricing_owner: 201,
    sales: 201,
    deal_desk: 201,
    delivery: 403,
    leadership: 403,
  };
  it.each(ROLES)("%s POST /api/quotes → expected status", async (role) => {
    const res = await agentFor(role)
      .post("/api/quotes")
      .send({ offering_id: 1, title: `matrix save ${role}` });
    expect(res.status).toBe(saveExpectation[role]);
  });

  it.each(ROLES)("%s can list quotes (200)", async (role) => {
    const res = await agentFor(role).get("/api/quotes");
    expect(res.status).toBe(200);
  });

  it("sales list is scoped to own quotes", async () => {
    const salesUser = findUser(ctx, "sales", { builder: false });
    const res = await agents.sales.get("/api/quotes");
    expect(res.body.quotes.length).toBeGreaterThan(0);
    for (const q of res.body.quotes) {
      expect(q.author_user_id).toBe(salesUser.id);
    }
  });

  it("a different sales user cannot read or edit another's quote", async () => {
    const read = await agents.builder_sales.get(`/api/quotes/${salesQuoteId}`);
    expect(read.status).toBe(403);
    const edit = await agents.builder_sales
      .put(`/api/quotes/${salesQuoteId}`)
      .send({ title: "hijack" });
    expect(edit.status).toBe(403);
  });
});

describe("§2 row: approvals / overrides / exceptions", () => {
  it.each(ROLES)("%s POST decision → deal_desk only", async (role) => {
    if (role === "deal_desk") {
      // Exercised for real below (against the pending owner approval).
      return;
    }
    const res = await agentFor(role)
      .post(`/api/approvals/${ownerApprovalId}/decision`)
      .send({ action: "approve", rationale: "should be forbidden", expires_at: "2026-09-01" });
    expect(res.status).toBe(403);
  });

  it("deal_desk can decide (200) with rationale + expiry", async () => {
    const res = await agents.deal_desk
      .post(`/api/approvals/${ownerApprovalId}/decision`)
      .send({ action: "approve", rationale: "Matrix cell check.", expires_at: "2026-09-01" });
    expect(res.status).toBe(200);
    expect(res.body.quote_governance_state).toBe("approved");
  });

  it("rationale is mandatory", async () => {
    const q = await agents.deal_desk
      .post("/api/quotes")
      .send({ offering_id: 3, title: "rationale check" });
    const approvalId = (
      ctx.db
        .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
        .get(q.body.quote.id) as { id: number }
    ).id;
    // dana authored this quote — use another deal-desk path: rationale check fires
    // before the author check? No: author check first. So verify with rationale
    // missing on a quote dana did NOT author.
    const q2 = await agents.sales
      .post("/api/quotes")
      .send({ offering_id: 3, title: "rationale check 2" });
    const approval2 = (
      ctx.db
        .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
        .get(q2.body.quote.id) as { id: number }
    ).id;
    const res = await agents.deal_desk
      .post(`/api/approvals/${approval2}/decision`)
      .send({ action: "re_scope" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("rationale_required");
    expect(approvalId).toBeGreaterThan(0);
  });

  it("HARD RULE: a quote's author can never approve it", async () => {
    // deal_desk (dana) authors a quote → its approval lands in her own queue.
    const q = await agents.deal_desk
      .post("/api/quotes")
      .send({ offering_id: 4, title: "self-approval attempt" });
    expect(q.status).toBe(201);
    const approvalId = (
      ctx.db
        .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
        .get(q.body.quote.id) as { id: number }
    ).id;
    const res = await agents.deal_desk
      .post(`/api/approvals/${approvalId}/decision`)
      .send({ action: "approve", rationale: "approving my own quote", expires_at: "2026-09-01" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("author_cannot_approve_own_quote");
    const still = ctx.db
      .prepare("SELECT status FROM approvals WHERE id = ?")
      .get(approvalId) as { status: string };
    expect(still.status).toBe("pending");
  });
});

describe("§2 row: proposal generation (customer document)", () => {
  const proposalExpectation: Record<RoleName, number> = {
    pricing_owner: 200,
    sales: 200, // author of the approved fixture quote
    deal_desk: 200,
    delivery: 403,
    leadership: 403,
  };
  it.each(ROLES)("%s GET proposal on approved quote → expected status", async (role) => {
    const res = await agentFor(role).get(`/api/quotes/${salesQuoteId}/proposal?locale=en`);
    expect(res.status).toBe(proposalExpectation[role]);
  });

  it("blocked quotes cannot generate a proposal (409)", async () => {
    const q = await agents.sales
      .post("/api/quotes")
      .send({ offering_id: 5, title: "blocked proposal attempt" });
    expect(q.body.quote.governance_state).toBe("blocked");
    const res = await agents.sales.get(`/api/quotes/${q.body.quote.id}/proposal`);
    expect(res.status).toBe(409);
  });
});

describe("§2 row: portfolio & analytics", () => {
  it.each(ROLES)("%s can read the portfolio (200)", async (role) => {
    const res = await agentFor(role).get("/api/portfolio");
    expect(res.status).toBe(200);
    if (role === "sales") {
      expect(res.body.scope).toBe("own_deals");
    } else {
      expect(res.body.scope).toBe("all_deals");
    }
  });
});

describe("§2 row: insights page (every role) vs Insight Studio (builder flag)", () => {
  it.each(ROLES)("%s can list buttons (200)", async (role) => {
    const buttons = await agentFor(role).get("/api/insights/buttons");
    expect(buttons.status).toBe(200);
  });

  it.each(ROLES)("%s runs an OPEN-scope button (engagement variance) — 200", async (role) => {
    const run = await agentFor(role)
      .post("/api/insights/run")
      .send({ button_key: "engagement_variance_drivers", quote_id: salesQuoteId });
    expect(run.status).toBe(200);
    expect(run.body.run.provider).toBe("mock");
    expect(run.body.run.result_md).toContain("deterministic");
  });

  it.each(ROLES)("%s on a current-quote insight: allowed for floor-seeing roles, 403 for delivery", async (role) => {
    const run = await agentFor(role)
      .post("/api/insights/run")
      .send({ button_key: "explain_governance_state", quote_id: salesQuoteId });
    if (role === "delivery") {
      // current_quote carries the cost stack; delivery has no quote access (§2).
      expect(run.status).toBe(403);
    } else {
      expect(run.status).toBe(200);
      expect(run.body.run.provider).toBe("mock");
    }
  });

  it("role-restricted buttons refuse roles outside allowed_roles", async () => {
    // where_below_policy is restricted to pricing_owner, deal_desk, leadership.
    const salesRun = await agents.sales
      .post("/api/insights/run")
      .send({ button_key: "where_below_policy", quote_id: salesQuoteId });
    expect(salesRun.status).toBe(403);
    const deliveryRun = await agents.delivery
      .post("/api/insights/run")
      .send({ button_key: "where_below_policy", quote_id: salesQuoteId });
    expect(deliveryRun.status).toBe(403);
    const leadershipRun = await agents.leadership
      .post("/api/insights/run")
      .send({ button_key: "where_below_policy", quote_id: salesQuoteId });
    expect(leadershipRun.status).toBe(200);
  });

  const authorExpectation: Record<RoleName, number> = {
    pricing_owner: 201, // admin authors too
    sales: 403, // plain sales has no builder flag
    deal_desk: 403,
    delivery: 403,
    leadership: 403,
  };
  it.each(ROLES)("%s POST /api/insights/buttons → builder flag required", async (role) => {
    const res = await agentFor(role).post("/api/insights/buttons").send({
      label: `Matrix button ${role}`,
      prompt_template_md: "Analyze: {{data}}",
      data_scope: "portfolio_summary",
      provider: "anthropic",
      model: "claude-sonnet",
    });
    expect(res.status).toBe(authorExpectation[role]);
  });

  it("a builder-flagged sales user CAN author buttons", async () => {
    const res = await agents.builder_sales.post("/api/insights/buttons").send({
      label: "Builder-authored matrix button",
      prompt_template_md: "Review the portfolio: {{data}}",
      data_scope: "portfolio_summary",
      provider: "grok",
      model: "grok-4",
    });
    expect(res.status).toBe(201);
  });
});

describe("§2 rows: LLM provider keys & user/role admin surface", () => {
  it.each(ROLES)("%s PUT provider key → pricing_owner only", async (role) => {
    const res = await agentFor(role)
      .put("/api/insights/providers/anthropic")
      .send({ api_key: "sk-matrix-test", default_model: "claude-sonnet" });
    expect(res.status).toBe(role === "pricing_owner" ? 200 : 403);
  });

  it.each(ROLES)("%s GET audit events → pricing_owner only", async (role) => {
    const res = await agentFor(role).get("/api/events");
    expect(res.status).toBe(role === "pricing_owner" ? 200 : 403);
  });

  it("saved keys are never returned to any client", async () => {
    const res = await agents.pricing_owner.get("/api/insights/providers");
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("sk-matrix-test");
    const anthropic = res.body.providers.find((p: { provider: string }) => p.provider === "anthropic");
    expect(anthropic.has_key).toBe(true);
  });
});
