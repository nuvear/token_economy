// Portfolio & analytics (PRD §2 row 8): read for every role;
// sales gets the own-deal view; leadership is the primary user.
import { Router } from "express";
import type { Db } from "../db";
import { requireAuth } from "../auth";
import { portfolioMarkdown, portfolioSummary } from "../markdown";

export function portfolioRouter(db: Db): Router {
  const router = Router();

  router.get("/portfolio", requireAuth, (req, res) => {
    const u = req.user!;
    const scope = u.role === "sales" ? { authorUserId: u.id } : {};
    const summary = portfolioSummary(db, scope);
    res.json({
      scope: u.role === "sales" ? "own_deals" : "all_deals",
      summary,
    });
  });

  router.get("/portfolio/markdown", requireAuth, (req, res) => {
    const u = req.user!;
    const scope = u.role === "sales" ? { authorUserId: u.id } : {};
    res.json({ markdown: portfolioMarkdown(portfolioSummary(db, scope)) });
  });

  return router;
}
