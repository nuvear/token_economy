// Audit trail (append-only events table). Admin (pricing_owner) reads it;
// writes happen ONLY through logEvent() in db.ts.
import { Router } from "express";
import type { Db } from "../db";
import { requireRole } from "../auth";

export function eventsRouter(db: Db): Router {
  const router = Router();

  router.get("/events", requireRole("pricing_owner"), (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);
    const entityType = req.query.entity_type ? String(req.query.entity_type) : null;
    const rows = entityType
      ? db
          .prepare(
            `SELECT e.*, u.full_name AS actor_name
             FROM events e LEFT JOIN users u ON u.id = e.actor_user_id
             WHERE e.entity_type = ? ORDER BY e.id DESC LIMIT ?`,
          )
          .all(entityType, limit)
      : db
          .prepare(
            `SELECT e.*, u.full_name AS actor_name
             FROM events e LEFT JOIN users u ON u.id = e.actor_user_id
             ORDER BY e.id DESC LIMIT ?`,
          )
          .all(limit);
    res.json({ events: rows });
  });

  return router;
}
