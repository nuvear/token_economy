// Deal workspace: quotes (PRD §2 row 2) + Markdown rendering + the
// customer proposal (PRD §2 row 5). The server ALWAYS re-runs the engine —
// clients send inputs, never outputs.
import { Router } from "express";
import type { Request, Response } from "express";
import type { Db } from "../db";
import { logEvent } from "../db";
import { requireAuth, requireRole } from "../auth";
import { compute, makePreset, ENGINE_VERSION } from "../../src/engine";
import type { EngineResult, PresetBaseInput, PresetInput } from "../../src/engine";
import { getQuoteRow, parseQuote, quoteMarkdown } from "../markdown";
import type { QuoteRow } from "../markdown";
import {
  buildCustomerView,
  renderProposalHtml,
  renderProposalMarkdown,
} from "../proposal";
import type { ProposalLocale } from "../proposal";

const snakeToCamel = (k: string): string => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** offerings.base_inputs_json is snake_case (schema rule); the engine is camelCase. */
function baseFromOffering(baseJson: string): PresetBaseInput {
  const raw = JSON.parse(baseJson) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (k === "key") continue;
    out[snakeToCamel(k)] = v;
  }
  return out as unknown as PresetBaseInput;
}

/** Merge client overrides into the engine input — only known keys, same shape. */
function applyOverrides(input: PresetInput, overrides: unknown): PresetInput {
  if (overrides === null || typeof overrides !== "object" || Array.isArray(overrides)) return input;
  const merged: Record<string, unknown> = { ...(input as unknown as Record<string, unknown>) };
  for (const [k, v] of Object.entries(overrides as Record<string, unknown>)) {
    if (!(k in merged)) continue;
    const current = merged[k];
    if (Array.isArray(current)) {
      if (Array.isArray(v)) merged[k] = v;
      continue;
    }
    if (typeof v === typeof current || current === null) merged[k] = v;
  }
  return merged as unknown as PresetInput;
}

function governanceState(result: EngineResult): "green" | "warning" | "blocked" {
  if (result.governance.level >= 2) return "blocked";
  if (result.governance.level === 1) return "warning";
  return "green";
}

/** §2: sales sees own quotes only; every other role reads all. */
function canSeeQuote(req: Request, quote: QuoteRow): boolean {
  const u = req.user!;
  return u.role !== "sales" || quote.author_user_id === u.id;
}

/** Non-green quotes route to the deal-desk queue (one open approval per quote). */
function ensureApprovalRow(db: Db, quote: QuoteRow, requestedBy: number): void {
  if (quote.governance_state === "green") return;
  const open = db
    .prepare("SELECT id FROM approvals WHERE quote_id = ? AND status = 'pending'")
    .get(quote.id);
  if (open) return;
  const info = db
    .prepare(
      `INSERT INTO approvals (quote_id, requested_by, rationale_md)
       VALUES (?, ?, ?)`,
    )
    .run(
      quote.id,
      requestedBy,
      `Auto-routed: quote #${quote.id} is **${quote.governance_state}** and needs deal-desk review.`,
    );
  logEvent(db, {
    actor_user_id: requestedBy,
    event_type: "approval_requested",
    entity_type: "approval",
    entity_id: Number(info.lastInsertRowid),
    details_md: `Approval requested for quote #${quote.id} (state: ${quote.governance_state}).`,
  });
}

function quoteSummary(row: QuoteRow): Record<string, unknown> {
  const { input, result } = parseQuote(row);
  return {
    id: row.id,
    offering_id: row.offering_id,
    author_user_id: row.author_user_id,
    title: row.title,
    deal_currency: row.deal_currency,
    quote_stage: row.quote_stage,
    governance_state: row.governance_state,
    engine_version: row.engine_version,
    pricing_model: input.pricingModel,
    selected_revenue: result?.selected?.revenue ?? null,
    governance_title: result?.governance?.title ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function quotesRouter(db: Db): Router {
  const router = Router();
  const editRoles = requireRole("sales", "deal_desk", "pricing_owner");

  router.get("/quotes", requireAuth, (req, res) => {
    const u = req.user!;
    const rows = (
      u.role === "sales"
        ? db.prepare("SELECT * FROM quotes WHERE author_user_id = ? ORDER BY id DESC").all(u.id)
        : db.prepare("SELECT * FROM quotes ORDER BY id DESC").all()
    ) as QuoteRow[];
    res.json({ quotes: rows.map(quoteSummary) });
  });

  router.get("/quotes/:id", requireAuth, (req, res) => {
    const row = getQuoteRow(db, Number(req.params.id));
    if (!row) {
      res.status(404).json({ error: "quote_not_found" });
      return;
    }
    if (!canSeeQuote(req, row)) {
      res.status(403).json({ error: "forbidden", reason: "sales_sees_own_quotes_only" });
      return;
    }
    const { input, result } = parseQuote(row);
    res.json({
      quote: { ...quoteSummary(row), input_snapshot: input, outputs: result },
    });
  });

  router.get("/quotes/:id/markdown", requireAuth, (req, res) => {
    const row = getQuoteRow(db, Number(req.params.id));
    if (!row) {
      res.status(404).json({ error: "quote_not_found" });
      return;
    }
    if (!canSeeQuote(req, row)) {
      res.status(403).json({ error: "forbidden", reason: "sales_sees_own_quotes_only" });
      return;
    }
    res.json({ quote_id: row.id, markdown: quoteMarkdown(row) });
  });

  const createOrUpdate = (req: Request, res: Response, existing?: QuoteRow): void => {
    const u = req.user!;
    const body = (req.body ?? {}) as {
      offering_id?: number;
      title?: string;
      input_overrides?: unknown;
    };

    let baseInput: PresetInput;
    let offeringId: number;
    if (existing) {
      baseInput = JSON.parse(existing.input_snapshot_json) as PresetInput;
      offeringId = existing.offering_id;
    } else {
      offeringId = Number(body.offering_id);
      const offering = db
        .prepare("SELECT id, base_inputs_json, deal_currency FROM offerings WHERE id = ?")
        .get(offeringId) as { id: number; base_inputs_json: string; deal_currency: string } | undefined;
      if (!offering) {
        res.status(400).json({ error: "unknown_offering" });
        return;
      }
      baseInput = makePreset(baseFromOffering(offering.base_inputs_json));
    }

    const input = applyOverrides(baseInput, body.input_overrides);
    // The server re-runs the engine; client-supplied outputs are ignored.
    const result = compute(input);
    const state = governanceState(result);
    const outputsJson = JSON.stringify(result);

    if (existing) {
      db.prepare(
        `UPDATE quotes SET title = ?, quote_stage = ?, input_snapshot_json = ?,
           outputs_json = ?, engine_version = ?, governance_state = ?,
           updated_at = datetime('now')
         WHERE id = ?`,
      ).run(
        body.title ?? existing.title,
        input.quoteStage,
        JSON.stringify(input),
        outputsJson,
        ENGINE_VERSION,
        state,
        existing.id,
      );
      const row = getQuoteRow(db, existing.id)!;
      logEvent(db, {
        actor_user_id: u.id,
        event_type: "quote_updated",
        entity_type: "quote",
        entity_id: row.id,
        details_md: `Quote #${row.id} recomputed — governance: **${state}** (${result.governance.title}).`,
        payload_json: { engine_version: ENGINE_VERSION, governance_state: state },
      });
      ensureApprovalRow(db, row, u.id);
      res.json({ quote: { ...quoteSummary(row), outputs: result } });
      return;
    }

    const info = db
      .prepare(
        `INSERT INTO quotes
           (offering_id, author_user_id, title, deal_currency, quote_stage,
            input_snapshot_json, outputs_json, engine_version, governance_state)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        offeringId,
        u.id,
        body.title ?? input.name,
        "USD",
        input.quoteStage,
        JSON.stringify(input),
        outputsJson,
        ENGINE_VERSION,
        state,
      );
    const id = Number(info.lastInsertRowid);
    // Stamp the quote id into the stored snapshot (reproducibility metadata).
    const stamped = { ...input, quoteId: `Q-${id}` };
    db.prepare("UPDATE quotes SET input_snapshot_json = ? WHERE id = ?").run(
      JSON.stringify(stamped),
      id,
    );
    const row = getQuoteRow(db, id)!;
    logEvent(db, {
      actor_user_id: u.id,
      event_type: "quote_created",
      entity_type: "quote",
      entity_id: id,
      details_md: `Quote #${id} created — governance: **${state}** (${result.governance.title}).`,
      payload_json: { engine_version: ENGINE_VERSION, governance_state: state },
    });
    ensureApprovalRow(db, row, u.id);
    res.status(201).json({ quote: { ...quoteSummary(row), outputs: result } });
  };

  router.post("/quotes", editRoles, (req, res) => createOrUpdate(req, res));

  router.put("/quotes/:id", editRoles, (req, res) => {
    const row = getQuoteRow(db, Number(req.params.id));
    if (!row) {
      res.status(404).json({ error: "quote_not_found" });
      return;
    }
    // §2: sales edits OWN quotes only.
    if (req.user!.role === "sales" && row.author_user_id !== req.user!.id) {
      res.status(403).json({ error: "forbidden", reason: "sales_edits_own_quotes_only" });
      return;
    }
    createOrUpdate(req, res, row);
  });

  // ————— Customer proposal (§2 row 5: pricing_owner, sales, deal_desk; NOT delivery/leadership) —————

  router.get(
    "/quotes/:id/proposal",
    requireRole("pricing_owner", "sales", "deal_desk"),
    (req, res) => {
      const row = getQuoteRow(db, Number(req.params.id));
      if (!row) {
        res.status(404).json({ error: "quote_not_found" });
        return;
      }
      if (!canSeeQuote(req, row)) {
        res.status(403).json({ error: "forbidden", reason: "sales_sees_own_quotes_only" });
        return;
      }
      // Green/approved quotes only — blocked or pending quotes cannot leave the building.
      if (!["green", "approved", "won"].includes(row.governance_state)) {
        res.status(409).json({
          error: "quote_not_customer_ready",
          governance_state: row.governance_state,
          hint: "Only green or approved quotes can generate a customer proposal.",
        });
        return;
      }
      const locale: ProposalLocale = req.query.locale === "ja" ? "ja" : "en";
      const { input, result } = parseQuote(row);
      // The renderer receives ONLY the whitelist object — internal figures
      // (rates, margins, floors) have no field to appear in.
      const view = buildCustomerView(input, result);
      logEvent(db, {
        actor_user_id: req.user!.id,
        event_type: "proposal_generated",
        entity_type: "quote",
        entity_id: row.id,
        details_md: `Customer proposal generated for quote #${row.id} (locale: ${locale}).`,
      });
      res.json({
        quote_id: row.id,
        locale,
        customer_view: view,
        markdown: renderProposalMarkdown(view, locale),
        html: renderProposalHtml(view, locale),
      });
    },
  );

  return router;
}
