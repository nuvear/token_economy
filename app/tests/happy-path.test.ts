// End-to-end happy path (PRD §4 test strategy):
// login → create quote (blocked) → deal desk approves → proposal (en+ja) →
// insight run (offline mock provider) → portfolio → audit trail.
import { beforeAll, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../src/engine";
import {
  makeCtx,
  loginAllRoles,
  findUser,
  type RoleAgents,
  type TestCtx,
} from "./apiTestUtils";

let ctx: TestCtx;
let agents: RoleAgents;
let quoteId: number;
let approvalId: number;

beforeAll(async () => {
  ctx = makeCtx();
  agents = await loginAllRoles(ctx);
});

describe("quote lifecycle", () => {
  it("sales sees the seeded offerings", async () => {
    const res = await agents.sales.get("/api/offerings");
    expect(res.status).toBe(200);
    expect(res.body.offerings).toHaveLength(5);
    expect(res.body.offerings[0].preset_key).toBe("remediation");
  });

  it("creating a quote re-runs the engine server-side and stores the snapshot", async () => {
    const res = await agents.sales.post("/api/quotes").send({
      offering_id: 1,
      title: "ACME ECC → S/4 remediation",
      // Client-sent outputs must be ignored; only inputs count.
      outputs: { governance: { level: 0 } },
    });
    expect(res.status).toBe(201);
    quoteId = res.body.quote.id;
    expect(res.body.quote.engine_version).toBe(ENGINE_VERSION);
    // Attestations default false → the reference preset is BLOCKED at creation.
    expect(res.body.quote.governance_state).toBe("blocked");
    expect(res.body.quote.outputs.governance.title).toContain("BLOCKED");
    // Reference case: traditional revenue $1,197,000 recomputed on the server.
    expect(res.body.quote.outputs.tradRevenue).toBe(1197000);

    const row = ctx.db
      .prepare("SELECT input_snapshot_json, outputs_json, engine_version FROM quotes WHERE id = ?")
      .get(quoteId) as { input_snapshot_json: string; outputs_json: string; engine_version: string };
    expect(row.engine_version).toBe(ENGINE_VERSION);
    expect(JSON.parse(row.input_snapshot_json).quoteId).toBe(`Q-${quoteId}`);
    expect(JSON.parse(row.outputs_json).tradRevenue).toBe(1197000);
  });

  it("a blocked quote auto-creates a pending deal-desk approval", async () => {
    const res = await agents.deal_desk.get("/api/approvals");
    expect(res.status).toBe(200);
    const mine = res.body.approvals.filter(
      (a: { quote_id: number; status: string }) => a.quote_id === quoteId,
    );
    expect(mine).toHaveLength(1);
    expect(mine[0].status).toBe("pending");
    approvalId = mine[0].id;
  });

  it("proposal is refused (409) while the quote is blocked", async () => {
    const res = await agents.sales.get(`/api/quotes/${quoteId}/proposal`);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe("quote_not_customer_ready");
  });

  it("quote updates recompute the engine (sales edits own quote)", async () => {
    const res = await agents.sales.put(`/api/quotes/${quoteId}`).send({
      input_overrides: { discountPct: 12 },
    });
    expect(res.status).toBe(200);
    expect(res.body.quote.outputs.customerDiscount).toBeGreaterThan(0);
    // 12% sits below the 12.5% risk-adjusted floor, so the economic block clears;
    // Pilot-stage attestation gates remain as warnings → deal-desk review still required.
    expect(res.body.quote.governance_state).toBe("warning");
  });

  it("deal desk approves with rationale and expiry; author cannot", async () => {
    const salesUser = findUser(ctx, "sales", { builder: false });
    const quote = ctx.db
      .prepare("SELECT author_user_id FROM quotes WHERE id = ?")
      .get(quoteId) as { author_user_id: number };
    expect(quote.author_user_id).toBe(salesUser.id); // author is sales, approver is deal desk

    const res = await agents.deal_desk.post(`/api/approvals/${approvalId}/decision`).send({
      action: "approve",
      rationale: "Pilot-stage exception: evidence gates tracked in workbook; expires end of Q3.",
      expires_at: "2026-09-30",
    });
    expect(res.status).toBe(200);
    expect(res.body.approval.status).toBe("approved");
    expect(res.body.approval.expires_at).toBe("2026-09-30");
    expect(res.body.quote_governance_state).toBe("approved");
  });

  it("approved quote renders the customer proposal in en and ja", async () => {
    const en = await agents.sales.get(`/api/quotes/${quoteId}/proposal?locale=en`);
    expect(en.status).toBe(200);
    expect(en.body.markdown).toContain("# Proposal —");
    expect(en.body.markdown).toContain("Savings versus your validated alternative");
    expect(en.body.html).toContain("<article");

    const ja = await agents.sales.get(`/api/quotes/${quoteId}/proposal?locale=ja`);
    expect(ja.status).toBe(200);
    expect(ja.body.markdown).toContain("ご提案書");
    expect(ja.body.markdown).toContain("テレメトリのお約束");
  });

  it("the quote's canonical Markdown rendering is served", async () => {
    const res = await agents.deal_desk.get(`/api/quotes/${quoteId}/markdown`);
    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain("## Governance verdict");
    expect(res.body.markdown).toContain("## Policy gates");
  });
});

describe("insights (offline mock provider)", () => {
  it("runs a seeded button against the quote and stores the run", async () => {
    const res = await agents.sales.post("/api/insights/run").send({
      button_key: "explain_governance_state",
      quote_id: quoteId,
    });
    expect(res.status).toBe(200);
    expect(res.body.run.provider).toBe("mock"); // no key stored → offline mock
    expect(res.body.run.status).toBe("done");
    expect(res.body.run.result_md).toContain("Governance verdict");

    const stored = ctx.db
      .prepare("SELECT status, packaged_markdown, result_md FROM insight_runs WHERE id = ?")
      .get(res.body.run.id) as { status: string; packaged_markdown: string; result_md: string };
    expect(stored.status).toBe("done");
    expect(stored.packaged_markdown).toContain("# Quote"); // data packaged AS MARKDOWN
    expect(stored.result_md).toBe(res.body.run.result_md);
  });

  it("portfolio-scope buttons package the portfolio markdown", async () => {
    const res = await agents.leadership.post("/api/insights/run").send({
      button_key: "portfolio_floor_adherence_exec",
    });
    expect(res.status).toBe(200);
    const stored = ctx.db
      .prepare("SELECT packaged_markdown FROM insight_runs ORDER BY id DESC LIMIT 1")
      .get() as { packaged_markdown: string };
    expect(stored.packaged_markdown).toContain("# Portfolio summary");
  });
});

describe("portfolio", () => {
  it("aggregates revenue vs floors, GP vs traditional, discounts, reinvestment", async () => {
    const res = await agents.leadership.get("/api/portfolio");
    expect(res.status).toBe(200);
    const s = res.body.summary;
    expect(s.quote_count).toBe(1);
    expect(s.total_selected_revenue).toBeGreaterThan(0);
    expect(s.total_required_revenue).toBeGreaterThan(0);
    expect(s.total_reinvestment_funded).toBeGreaterThan(0);
    expect(s.discount_distribution.map((d: { band: string }) => d.band)).toContain("10–15%");
    expect(s.governance_counts.approved).toBe(1);
  });

  it("sales portfolio is the own-deal view", async () => {
    const res = await agents.builder_sales.get("/api/portfolio");
    expect(res.status).toBe(200);
    expect(res.body.scope).toBe("own_deals");
    expect(res.body.summary.quote_count).toBe(0); // bea authored nothing
  });
});

describe("audit trail", () => {
  it("every step appended an event (admin can read the trail)", async () => {
    const res = await agents.pricing_owner.get("/api/events?limit=500");
    expect(res.status).toBe(200);
    const types = res.body.events.map((e: { event_type: string }) => e.event_type);
    for (const expected of [
      "quote_created",
      "quote_updated",
      "approval_requested",
      "approval_decided",
      "proposal_generated",
      "insight_run_completed",
    ]) {
      expect(types).toContain(expected);
    }
  });
});
