// Scaffold smoke tests: server boots against an in-memory DB, auth guard
// works, seed creates the users/offerings/buttons, audit log is append-only.
import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { openDb, type Db } from "../server/db";
import { createApp } from "../server/app";
import { seedDb } from "../server/seed";
import type express from "express";

let db: Db;
let app: express.Express;

beforeAll(() => {
  db = openDb(":memory:");
  seedDb(db);
  app = createApp(db);
});

describe("server boots", () => {
  it("answers /api/health", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 404 JSON for unknown api routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
});

describe("auth", () => {
  it("GET /api/auth/me is 401 unauthenticated", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("guarded routes are 401 unauthenticated", async () => {
    const res = await request(app).get("/api/offerings");
    expect(res.status).toBe(401);
  });

  it("login sets a signed httpOnly cookie and /me answers", async () => {
    const agent = request.agent(app);
    const users = await agent.get("/api/auth/users");
    const first = users.body.users[0];
    const login = await agent.post("/api/auth/login").send({ user_id: first.id });
    expect(login.status).toBe(200);
    const setCookie = login.headers["set-cookie"]?.[0] ?? "";
    expect(setCookie).toContain("HttpOnly");
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(first.id);
  });

  it("rejects unknown users at login", async () => {
    const res = await request(app).post("/api/auth/login").send({ user_id: 9999 });
    expect(res.status).toBe(400);
  });
});

describe("seed", () => {
  it("creates users covering all 5 roles", async () => {
    const roles = db
      .prepare("SELECT DISTINCT role FROM users ORDER BY role")
      .all()
      .map((r) => (r as { role: string }).role);
    expect(roles).toEqual([
      "deal_desk",
      "delivery",
      "leadership",
      "pricing_owner",
      "sales",
    ]);
  });

  it("includes one builder-flagged sales user", () => {
    const builders = db
      .prepare("SELECT role FROM users WHERE is_builder = 1")
      .all() as { role: string }[];
    expect(builders).toHaveLength(1);
    expect(builders[0].role).toBe("sales");
  });

  it("seeds the 5 offerings from the calculator presets", () => {
    const rows = db
      .prepare("SELECT preset_key, name, base_inputs_json FROM offerings ORDER BY id")
      .all() as { preset_key: string; name: string; base_inputs_json: string }[];
    expect(rows.map((r) => r.preset_key)).toEqual([
      "remediation",
      "test_automation",
      "data_migration",
      "interfaces",
      "custom",
    ]);
    const remediation = JSON.parse(rows[0].base_inputs_json);
    // Reference-case base numbers, verbatim from the calculator preset.
    expect(remediation.total_units).toBe(12000);
    expect(remediation.scope_pct).toBe(30);
    expect(remediation.hrs_per_unit).toBe(3.5);
    expect(remediation.bill_rate).toBe(95);
  });

  it("seeds the 6 insight buttons", () => {
    const n = (db.prepare("SELECT COUNT(*) AS n FROM insight_buttons").get() as { n: number }).n;
    expect(n).toBe(6);
  });

  it("is idempotent", () => {
    seedDb(db);
    const users = (db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n;
    expect(users).toBe(6);
  });
});

describe("audit log", () => {
  it("events table is append-only (UPDATE and DELETE abort)", () => {
    expect(() => db.prepare("UPDATE events SET event_type = 'x'").run()).toThrow(
      /append-only/,
    );
    expect(() => db.prepare("DELETE FROM events").run()).toThrow(/append-only/);
  });
});
