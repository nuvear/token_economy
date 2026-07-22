// Express app factory — separated from index.ts so tests can boot the
// app against an in-memory database with supertest (no port binding).
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cookieParser from "cookie-parser";
import type { Db } from "./db";
import { COOKIE_SECRET, attachUser, authRouter } from "./auth";
import { offeringsRouter } from "./routes/offerings";
import { quotesRouter } from "./routes/quotes";
import { approvalsRouter } from "./routes/approvals";
import { insightsRouter } from "./routes/insights";
import { portfolioRouter } from "./routes/portfolio";
import { eventsRouter } from "./routes/events";

const APP_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export function createApp(db: Db): express.Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser(COOKIE_SECRET));
  app.use(attachUser(db));

  const api = express.Router();
  api.use("/auth", authRouter(db));

  api.get("/health", (_req, res) => {
    res.json({ ok: true, service: "dealspine" });
  });

  // Feature routers — each route carries its own §2 guard.
  api.use(offeringsRouter(db)); // /offerings, /parameter-sets
  api.use(quotesRouter(db)); //    /quotes (+ /markdown, /proposal)
  api.use(approvalsRouter(db)); // /approvals
  api.use(insightsRouter(db)); //  /insights (buttons, run, providers)
  api.use(portfolioRouter(db)); // /portfolio
  api.use(eventsRouter(db)); //    /events (admin audit)

  api.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });
  app.use("/api", api);

  // Production: serve the built web app from ../dist.
  if (process.env.NODE_ENV === "production") {
    const dist = path.join(APP_DIR, "dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  return app;
}
