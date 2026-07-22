// AI-native Insights (PRD §3 v1): prompt buttons everyone can click,
// authored by builder-flagged users, run through the provider adapters.
// Every run respects the caller's §2 data rights and is logged.
import { Router } from "express";
import type { Db } from "../db";
import { logEvent } from "../db";
import { requireAuth, requireBuilder, requireRole } from "../auth";
import { getProvider, encryptProviderKey } from "../providers";
import { getQuoteRow, portfolioMarkdown, portfolioSummary, quoteMarkdown } from "../markdown";

const DATA_SCOPES = [
  "current_quote",
  "portfolio_summary",
  "engagement_variance",
  "policy",
  "evidence_summary",
] as const;
const PROVIDERS = ["anthropic", "openai", "gemini", "grok", "local_gemma"] as const;
const ROLES = ["pricing_owner", "sales", "deal_desk", "delivery", "leadership"] as const;

interface ButtonRow {
  id: number;
  button_key: string;
  label: string;
  description_md: string | null;
  prompt_template_md: string;
  data_scope: string;
  allowed_roles: string;
  provider: string;
  model: string;
  output_language: string;
  created_by: number | null;
  is_published: number;
  created_at: string;
}

const roleList = (row: ButtonRow): string[] => row.allowed_roles.split(",").map((r) => r.trim());

export function insightsRouter(db: Db): Router {
  const router = Router();

  // ————— Buttons: everyone sees the buttons their role may run —————

  router.get("/insights/buttons", requireAuth, (req, res) => {
    const rows = db
      .prepare("SELECT * FROM insight_buttons WHERE is_published = 1 ORDER BY id")
      .all() as ButtonRow[];
    const visible = rows.filter((b) => roleList(b).includes(req.user!.role));
    res.json({
      buttons: visible.map((b) => ({
        id: b.id,
        button_key: b.button_key,
        label: b.label,
        description_md: b.description_md,
        data_scope: b.data_scope,
        provider: b.provider,
        model: b.model,
        output_language: b.output_language,
      })),
    });
  });

  // ————— Insight Studio: builder flag (any role) or pricing_owner —————

  router.post("/insights/buttons", requireBuilder, (req, res) => {
    const b = (req.body ?? {}) as Partial<ButtonRow>;
    if (!b.label || !b.prompt_template_md || !b.data_scope || !b.provider || !b.model) {
      res.status(400).json({
        error: "missing_fields",
        required: ["label", "prompt_template_md", "data_scope", "provider", "model"],
      });
      return;
    }
    if (!DATA_SCOPES.includes(b.data_scope as (typeof DATA_SCOPES)[number])) {
      res.status(400).json({ error: "invalid_data_scope", allowed: DATA_SCOPES });
      return;
    }
    if (!PROVIDERS.includes(b.provider as (typeof PROVIDERS)[number])) {
      res.status(400).json({ error: "invalid_provider", allowed: PROVIDERS });
      return;
    }
    const allowedRoles = String(b.allowed_roles ?? ROLES.join(","))
      .split(",")
      .map((r) => r.trim())
      .filter((r) => (ROLES as readonly string[]).includes(r));
    if (allowedRoles.length === 0) {
      res.status(400).json({ error: "invalid_allowed_roles", allowed: ROLES });
      return;
    }
    const key =
      b.button_key ??
      b.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 60);
    const dup = db.prepare("SELECT id FROM insight_buttons WHERE button_key = ?").get(key);
    if (dup) {
      res.status(409).json({ error: "button_key_already_exists" });
      return;
    }
    const info = db
      .prepare(
        `INSERT INTO insight_buttons
           (button_key, label, description_md, prompt_template_md, data_scope,
            allowed_roles, provider, model, output_language, created_by, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .run(
        key, b.label, b.description_md ?? null, b.prompt_template_md, b.data_scope,
        allowedRoles.join(","), b.provider, b.model, b.output_language ?? "author",
        req.user!.id,
      );
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "insight_button_created",
      entity_type: "insight_button",
      entity_id: Number(info.lastInsertRowid),
      details_md: `Insight button **${b.label}** (\`${key}\`) created — scope: ${b.data_scope}, provider: ${b.provider}/${b.model}, roles: ${allowedRoles.join(", ")}.`,
    });
    res.status(201).json({
      button: db.prepare("SELECT * FROM insight_buttons WHERE id = ?").get(info.lastInsertRowid),
    });
  });

  // ————— Run a button: package scoped data AS MARKDOWN, call provider, store —————

  router.post("/insights/run", requireAuth, async (req, res) => {
    const u = req.user!;
    const body = (req.body ?? {}) as { button_id?: number; button_key?: string; quote_id?: number };
    const button = (
      body.button_id !== undefined
        ? db.prepare("SELECT * FROM insight_buttons WHERE id = ?").get(Number(body.button_id))
        : db.prepare("SELECT * FROM insight_buttons WHERE button_key = ?").get(String(body.button_key ?? ""))
    ) as ButtonRow | undefined;
    if (!button || !button.is_published) {
      res.status(404).json({ error: "insight_button_not_found" });
      return;
    }
    // §2: the run respects the caller's data-access rights.
    if (!roleList(button).includes(u.role)) {
      res.status(403).json({ error: "forbidden", reason: "role_not_allowed_for_button" });
      return;
    }

    let packaged: string;
    if (button.data_scope === "current_quote") {
      const quote = getQuoteRow(db, Number(body.quote_id));
      if (!quote) {
        res.status(400).json({ error: "quote_id_required_for_current_quote_scope" });
        return;
      }
      if (u.role === "sales" && quote.author_user_id !== u.id) {
        res.status(403).json({ error: "forbidden", reason: "sales_sees_own_quotes_only" });
        return;
      }
      packaged = quoteMarkdown(quote);
    } else if (button.data_scope === "portfolio_summary") {
      packaged = portfolioMarkdown(
        portfolioSummary(db, u.role === "sales" ? { authorUserId: u.id } : {}),
      );
    } else if (button.data_scope === "policy") {
      const sets = db
        .prepare(
          `SELECT o.name, p.version, p.parameters_json, p.published_at
           FROM parameter_sets p JOIN offerings o ON o.id = p.offering_id
           WHERE p.status = 'published' ORDER BY p.id`,
        )
        .all() as { name: string; version: string; parameters_json: string; published_at: string }[];
      packaged = [
        "# Published policy (parameter sets)",
        "",
        ...(sets.length === 0
          ? ["_No parameter sets published yet — offerings run on their seeded defaults._"]
          : sets.map(
              (s) =>
                `## ${s.name} — v${s.version} (published ${s.published_at})\n\n\`\`\`json\n${s.parameters_json}\n\`\`\``,
            )),
        "",
      ].join("\n");
    } else {
      // engagement_variance / evidence_summary arrive with Phase 2 capture.
      packaged = `# ${button.data_scope}\n\n_No ${button.data_scope.replace(/_/g, " ")} data captured yet (Phase 2)._\n`;
    }

    const prompt = button.prompt_template_md.includes("{{data}}")
      ? button.prompt_template_md.replace("{{data}}", packaged)
      : `${button.prompt_template_md}\n\n${packaged}`;

    const provider = getProvider(db, button.provider);
    const runInfo = db
      .prepare(
        `INSERT INTO insight_runs
           (insight_button_id, run_by, data_scope, packaged_markdown, provider, model, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      )
      .run(button.id, u.id, button.data_scope, packaged, provider.name, button.model);
    const runId = Number(runInfo.lastInsertRowid);

    try {
      const result = await provider.complete({ model: button.model, prompt });
      db.prepare("UPDATE insight_runs SET result_md = ?, status = 'done' WHERE id = ?").run(
        result,
        runId,
      );
      // Logged: who, which button, which data scope, which model.
      logEvent(db, {
        actor_user_id: u.id,
        event_type: "insight_run_completed",
        entity_type: "insight_run",
        entity_id: runId,
        details_md: `**${u.full_name}** ran insight **${button.label}** (scope: ${button.data_scope}, provider: ${provider.name}, model: ${button.model}).`,
      });
      res.json({
        run: {
          id: runId,
          button_key: button.button_key,
          data_scope: button.data_scope,
          provider: provider.name,
          model: button.model,
          status: "done",
          result_md: result,
        },
      });
    } catch (err) {
      db.prepare("UPDATE insight_runs SET status = 'failed', result_md = ? WHERE id = ?").run(
        `_Provider error: ${(err as Error).message}_`,
        runId,
      );
      logEvent(db, {
        actor_user_id: u.id,
        event_type: "insight_run_failed",
        entity_type: "insight_run",
        entity_id: runId,
        details_md: `Insight run #${runId} failed (${provider.name}): ${(err as Error).message}`,
      });
      res.status(502).json({ error: "provider_error", run_id: runId });
    }
  });

  router.get("/insights/runs", requireAuth, (req, res) => {
    const u = req.user!;
    const rows =
      u.role === "pricing_owner"
        ? db.prepare("SELECT * FROM insight_runs ORDER BY id DESC LIMIT 100").all()
        : db.prepare("SELECT * FROM insight_runs WHERE run_by = ? ORDER BY id DESC LIMIT 100").all(u.id);
    res.json({ runs: rows });
  });

  // ————— Provider keys: admin only, never returned after save —————

  router.get("/insights/providers", requireRole("pricing_owner"), (_req, res) => {
    const rows = db
      .prepare("SELECT provider, key_ciphertext IS NOT NULL AS has_key, default_model, updated_at FROM provider_keys ORDER BY provider")
      .all() as { provider: string; has_key: number; default_model: string | null; updated_at: string }[];
    const configured = new Map(rows.map((r) => [r.provider, r]));
    res.json({
      providers: PROVIDERS.map((p) => ({
        provider: p,
        has_key: (configured.get(p)?.has_key ?? 0) === 1,
        default_model: configured.get(p)?.default_model ?? null,
        updated_at: configured.get(p)?.updated_at ?? null,
      })),
    });
  });

  router.put("/insights/providers/:provider", requireRole("pricing_owner"), (req, res) => {
    const provider = String(req.params.provider);
    if (!PROVIDERS.includes(provider as (typeof PROVIDERS)[number])) {
      res.status(400).json({ error: "invalid_provider", allowed: PROVIDERS });
      return;
    }
    const body = (req.body ?? {}) as { api_key?: string; default_model?: string };
    const ciphertext = body.api_key ? encryptProviderKey(body.api_key) : null;
    db.prepare(
      `INSERT INTO provider_keys (provider, key_ciphertext, default_model, updated_by, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(provider) DO UPDATE SET
         key_ciphertext = COALESCE(excluded.key_ciphertext, provider_keys.key_ciphertext),
         default_model = COALESCE(excluded.default_model, provider_keys.default_model),
         updated_by = excluded.updated_by,
         updated_at = excluded.updated_at`,
    ).run(provider, ciphertext, body.default_model ?? null, req.user!.id);
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "provider_key_updated",
      entity_type: "provider_key",
      details_md: `Provider **${provider}** ${body.api_key ? "key updated" : "settings updated"} (key never logged).`,
    });
    // The key is never echoed back.
    res.json({ provider, has_key: ciphertext !== null || undefined, ok: true });
  });

  return router;
}
