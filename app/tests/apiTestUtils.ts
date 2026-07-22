// Shared test rig: in-memory DB + seeded users + supertest agents per role.
import request from "supertest";
import type express from "express";

export type Agent = ReturnType<typeof request.agent>;
import { openDb, type Db } from "../server/db";
import { createApp } from "../server/app";
import { seedDb } from "../server/seed";

export interface SeededUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_builder: number;
}

export interface TestCtx {
  db: Db;
  app: express.Express;
  users: SeededUser[];
}

export function makeCtx(): TestCtx {
  const db = openDb(":memory:");
  seedDb(db);
  const app = createApp(db);
  const users = db
    .prepare("SELECT id, full_name, email, role, is_builder FROM users ORDER BY id")
    .all() as SeededUser[];
  return { db, app, users };
}

export function findUser(ctx: TestCtx, role: string, opts: { builder?: boolean } = {}): SeededUser {
  const u = ctx.users.find(
    (x) => x.role === role && (opts.builder === undefined || x.is_builder === (opts.builder ? 1 : 0)),
  );
  if (!u) throw new Error(`no seeded user for role ${role}`);
  return u;
}

export async function loginAs(ctx: TestCtx, user: SeededUser): Promise<Agent> {
  const agent = request.agent(ctx.app);
  const res = await agent.post("/api/auth/login").send({ user_id: user.id });
  if (res.status !== 200) throw new Error(`login failed for ${user.email}`);
  return agent;
}

export const ROLES = ["pricing_owner", "sales", "deal_desk", "delivery", "leadership"] as const;
export type RoleName = (typeof ROLES)[number];

export interface RoleAgents {
  pricing_owner: Agent;
  sales: Agent;
  deal_desk: Agent;
  delivery: Agent;
  leadership: Agent;
  builder_sales: Agent;
}

export async function loginAllRoles(ctx: TestCtx): Promise<RoleAgents> {
  return {
    pricing_owner: await loginAs(ctx, findUser(ctx, "pricing_owner")),
    sales: await loginAs(ctx, findUser(ctx, "sales", { builder: false })),
    deal_desk: await loginAs(ctx, findUser(ctx, "deal_desk")),
    delivery: await loginAs(ctx, findUser(ctx, "delivery")),
    leadership: await loginAs(ctx, findUser(ctx, "leadership")),
    builder_sales: await loginAs(ctx, findUser(ctx, "sales", { builder: true })),
  };
}
