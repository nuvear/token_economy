// Pilot auth, kept deliberately trivial (PRD §4):
// seeded users + dev login (pick a user → signed httpOnly cookie),
// one role column, one guard per route.
import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import type { Db } from "./db";
import { logEvent } from "./db";

export const COOKIE_SECRET =
  process.env.DEALSPINE_COOKIE_SECRET ?? "dealspine-pilot-dev-secret";
const COOKIE_NAME = "dealspine_user";

export type Role =
  | "pricing_owner"
  | "sales"
  | "deal_desk"
  | "delivery"
  | "leadership";

export interface SessionUser {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  is_builder: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

function loadUser(db: Db, id: number): SessionUser | undefined {
  const row = db
    .prepare("SELECT id, full_name, email, role, is_builder FROM users WHERE id = ?")
    .get(id) as
    | { id: number; full_name: string; email: string; role: Role; is_builder: number }
    | undefined;
  if (!row) return undefined;
  return { ...row, is_builder: row.is_builder === 1 };
}

/** Attaches req.user when a valid signed cookie is present; never rejects. */
export function attachUser(db: Db) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const raw = req.signedCookies?.[COOKIE_NAME];
    const id = Number(raw);
    if (Number.isInteger(id) && id > 0) {
      req.user = loadUser(db, id);
    }
    next();
  };
}

/** Route guard: any authenticated user. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  next();
}

/** Route guard: authenticated AND role is one of the allowed roles (§2 matrix). */
export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "not_authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "forbidden", required_roles: roles });
      return;
    }
    next();
  };
}

/** Route guard: authenticated AND builder flag (Insight Studio authors). */
export function requireBuilder(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: "not_authenticated" });
    return;
  }
  if (!req.user.is_builder && req.user.role !== "pricing_owner") {
    res.status(403).json({ error: "forbidden", required: "builder_flag" });
    return;
  }
  next();
}

export function authRouter(db: Db): Router {
  const router = Router();

  // Dev login: pick a seeded user by id → signed httpOnly cookie.
  router.post("/login", (req, res) => {
    const userId = Number((req.body ?? {}).user_id);
    const user = Number.isInteger(userId) ? loadUser(db, userId) : undefined;
    if (!user) {
      res.status(400).json({ error: "unknown_user" });
      return;
    }
    res.cookie(COOKIE_NAME, String(user.id), {
      signed: true,
      httpOnly: true,
      sameSite: "lax",
    });
    logEvent(db, {
      actor_user_id: user.id,
      event_type: "user_logged_in",
      entity_type: "user",
      entity_id: user.id,
      details_md: `**${user.full_name}** logged in (dev login).`,
    });
    res.json({ user });
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ ok: true });
  });

  router.get("/me", (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: "not_authenticated" });
      return;
    }
    res.json({ user: req.user });
  });

  // Dev helper for the login screen's user picker (no secrets exposed).
  router.get("/users", (_req, res) => {
    const users = db
      .prepare("SELECT id, full_name, email, role, is_builder FROM users ORDER BY id")
      .all();
    res.json({ users });
  });

  return router;
}
