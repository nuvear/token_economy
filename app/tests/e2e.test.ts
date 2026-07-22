// End-to-end sanity (integration gate, task 4): boots the seeded server
// (in-memory SQLite + seedDb, same code path as `npm run seed` + server/index.ts)
// and drives the FULL pilot flow over HTTP via supertest, in order:
//
//   login sales → create remediation quote (expect governance NON-GREEN)
//   → login deal_desk → approve
//   → fetch proposal en + ja (expect 200, NO internal figures)
//   → run "Explain this quote" insight with the mock provider (expect Markdown)
//   → portfolio as leadership (expect aggregates).
//
// Unlike the per-area suites, this file is one strictly sequential script —
// each step depends on the state left by the previous one.
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { openDb, type Db } from "../server/db";
import { createApp } from "../server/app";
import { seedDb } from "../server/seed";
import { ENGINE_VERSION } from "../src/engine";

type Agent = ReturnType<typeof request.agent>;

let db: Db;
let app: ReturnType<typeof createApp>;
let sales: Agent;
let dealDesk: Agent;
let leadership: Agent;
let quoteId: number;
let approvalId: number;
let outputs: Record<string, any>;

const fmt = (v: number): string => Math.round(v).toLocaleString("en-US");

async function loginRole(role: string): Promise<Agent> {
  const user = db
    .prepare("SELECT id FROM users WHERE role = ? ORDER BY id LIMIT 1")
    .get(role) as { id: number } | undefined;
  if (!user) throw new Error(`no seeded ${role} user`);
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ user_id: user.id });
  expect(res.status).toBe(200);
  return agent;
}

beforeAll(() => {
  db = openDb(":memory:");
  seedDb(db); // seeded server: users + 5 offerings + insight buttons
  app = createApp(db);
});

describe("e2e: sales creates a remediation quote", () => {
  it("sales logs in via dev login (seeded user, signed cookie)", async () => {
    sales = await loginRole("sales");
    const me = await sales.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.role).toBe("sales");
  });

  it("creates a quote on the remediation offering — governance is NON-GREEN", async () => {
    const offerings = await sales.get("/api/offerings");
    expect(offerings.status).toBe(200);
    const remediation = offerings.body.offerings.find(
      (o: { preset_key: string }) => o.preset_key === "remediation",
    );
    expect(remediation).toBeTruthy();

    const res = await sales.post("/api/quotes").send({
      offering_id: remediation.id,
      title: "E2E — ECC to S/4 custom-code remediation",
    });
    expect(res.status).toBe(201);
    quoteId = res.body.quote.id;
    expect(res.body.quote.engine_version).toBe(ENGINE_VERSION);
    // Attestations default false → the pilot remediation preset is not green.
    expect(["warning", "blocked"]).toContain(res.body.quote.governance_state);
    expect(res.body.quote.governance_state).not.toBe("green");
  });

  it("the non-green quote sits in the deal-desk approval queue", async () => {
    dealDesk = await loginRole("deal_desk");
    const res = await dealDesk.get("/api/approvals");
    expect(res.status).toBe(200);
    const pending = res.body.approvals.filter(
      (a: { quote_id: number; status: string }) =>
        a.quote_id === quoteId && a.status === "pending",
    );
    expect(pending).toHaveLength(1);
    approvalId = pending[0].id;
  });
});

describe("e2e: deal desk approves", () => {
  it("deal desk (not the author) approves with rationale + expiry", async () => {
    const res = await dealDesk.post(`/api/approvals/${approvalId}/decision`).send({
      action: "approve",
      rationale: "E2E pilot exception — evidence gates tracked offline until Phase 2.",
      expires_at: "2026-09-30",
    });
    expect(res.status).toBe(200);
    expect(res.body.approval.status).toBe("approved");
    expect(res.body.quote_governance_state).toBe("approved");

    const detail = await dealDesk.get(`/api/quotes/${quoteId}`);
    expect(detail.status).toBe(200);
    outputs = detail.body.quote.outputs;
  });
});

describe("e2e: proposal in en + ja, no internal figures", () => {
  it.each(["en", "ja"])("proposal %s returns 200 with customer copy", async (locale) => {
    const res = await sales.get(`/api/quotes/${quoteId}/proposal?locale=${locale}`);
    expect(res.status).toBe(200);
    expect(res.body.markdown.length).toBeGreaterThan(200);
    expect(res.body.markdown).toContain(locale === "ja" ? "ご提案書" : "# Proposal —");
  });

  it.each(["en", "ja"])("proposal %s leaks no internal figures", async (locale) => {
    const res = await sales.get(`/api/quotes/${quoteId}/proposal?locale=${locale}`);
    const body = JSON.stringify(res.body);
    // Internal dollar amounts (floors, cost stack) must not appear in any form.
    for (const amount of [
      outputs.requiredRevenue,
      outputs.baseAiCost,
      outputs.tradCost,
      outputs.selected.cost,
      outputs.selected.profit,
    ].filter((v: number) => Number.isFinite(v) && Math.abs(v) > 0.5)) {
      expect(body).not.toContain(fmt(amount));
      expect(body).not.toContain(String(Math.round(amount)));
    }
    // Internal percentages (risk-adjusted floor discount, margins).
    for (const pct of [outputs.maxSafeDiscount, outputs.selected.marginPct].filter(
      (v: number) => Number.isFinite(v),
    )) {
      expect(body).not.toContain(`${(pct * 100).toFixed(1)}%`);
    }
    // Engine field names must never surface on customer output.
    for (const field of ["requiredRevenue", "maxSafeDiscount", "baseAiCost", "marginPct"]) {
      expect(body).not.toContain(field);
    }
  });
});

describe("e2e: 'Explain this quote' insight via mock provider", () => {
  it("returns a completed run with a Markdown result", async () => {
    const res = await sales.post("/api/insights/run").send({
      button_key: "explain_governance_state",
      quote_id: quoteId,
    });
    expect(res.status).toBe(200);
    expect(res.body.run.provider).toBe("mock"); // no provider key stored → mock default
    expect(res.body.run.status).toBe("done");
    expect(res.body.run.result_md).toMatch(/^#|\n#/); // Markdown headings present
    expect(res.body.run.result_md).toContain("Governance verdict");

    // The scoped data was packaged as Markdown (markdown-first rule).
    const stored = db
      .prepare("SELECT packaged_markdown FROM insight_runs WHERE id = ?")
      .get(res.body.run.id) as { packaged_markdown: string };
    expect(stored.packaged_markdown).toContain("# Quote");
  });
});

describe("e2e: portfolio as leadership", () => {
  it("returns the aggregate view", async () => {
    leadership = await loginRole("leadership");
    const res = await leadership.get("/api/portfolio");
    expect(res.status).toBe(200);
    const s = res.body.summary;
    expect(s.quote_count).toBeGreaterThanOrEqual(1);
    expect(s.total_selected_revenue).toBeGreaterThan(0);
    expect(s.total_required_revenue).toBeGreaterThan(0);
    expect(s.governance_counts.approved).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(s.discount_distribution)).toBe(true);
  });
});
