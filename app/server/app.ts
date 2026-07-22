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

  // Error handler — never leak stack traces or filesystem paths to clients.
  // Malformed JSON bodies (body-parser) become a clean 400; everything else 500.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const e = err as { type?: string; status?: number; statusCode?: number };
    if (e?.type === "entity.parse.failed" || (err instanceof SyntaxError && "body" in (err as object))) {
      res.status(400).json({ error: "invalid_json" });
      return;
    }
    const status = e?.status ?? e?.statusCode ?? 500;
    res.status(status).json({ error: status === 500 ? "internal_error" : "request_error" });
  });

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
