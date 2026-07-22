// Offerings + versioned parameter sets (PRD §2 row 1):
// read for every role; edit + publish for pricing_owner only.
// Published parameter sets are IMMUTABLE — edits require a new version.
import { Router } from "express";
import type { Db } from "../db";
import { logEvent } from "../db";
import { requireAuth, requireRole } from "../auth";

interface OfferingBody {
  preset_key?: string;
  name?: string;
  tagline?: string;
  unit?: string;
  unit_plural?: string;
  population_label?: string;
  scope_label?: string;
  deal_currency?: string;
  base_inputs_json?: unknown;
  status?: string;
}

export function offeringsRouter(db: Db): Router {
  const router = Router();

  // ————— Offerings —————

  router.get("/offerings", requireAuth, (_req, res) => {
    const offerings = db
      .prepare(
        `SELECT id, preset_key, name, tagline, unit, unit_plural, population_label,
                scope_label, deal_currency, status, created_at
         FROM offerings ORDER BY id`,
      )
      .all();
    res.json({ offerings });
  });

  router.get("/offerings/:id", requireAuth, (req, res) => {
    const offering = db
      .prepare("SELECT * FROM offerings WHERE id = ?")
      .get(Number(req.params.id)) as Record<string, unknown> | undefined;
    if (!offering) {
      res.status(404).json({ error: "offering_not_found" });
      return;
    }
    const parameter_sets = db
      .prepare(
        `SELECT id, offering_id, version, status, notes_md, published_by, published_at, created_at
         FROM parameter_sets WHERE offering_id = ? ORDER BY id`,
      )
      .all(offering.id);
    res.json({ offering, parameter_sets });
  });

  router.post("/offerings", requireRole("pricing_owner"), (req, res) => {
    const b = (req.body ?? {}) as OfferingBody;
    if (!b.preset_key || !b.name || !b.unit || !b.unit_plural || b.base_inputs_json === undefined) {
      res.status(400).json({
        error: "missing_fields",
        required: ["preset_key", "name", "unit", "unit_plural", "base_inputs_json"],
      });
      return;
    }
    const exists = db.prepare("SELECT id FROM offerings WHERE preset_key = ?").get(b.preset_key);
    if (exists) {
      res.status(409).json({ error: "preset_key_already_exists" });
      return;
    }
    const info = db
      .prepare(
        `INSERT INTO offerings
           (preset_key, name, tagline, unit, unit_plural, population_label, scope_label,
            deal_currency, base_inputs_json, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        b.preset_key, b.name, b.tagline ?? null, b.unit, b.unit_plural,
        b.population_label ?? null, b.scope_label ?? null, b.deal_currency ?? "USD",
        JSON.stringify(b.base_inputs_json), b.status ?? "draft", req.user!.id,
      );
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "offering_created",
      entity_type: "offering",
      entity_id: Number(info.lastInsertRowid),
      details_md: `Offering **${b.name}** (\`${b.preset_key}\`) created.`,
    });
    res.status(201).json({
      offering: db.prepare("SELECT * FROM offerings WHERE id = ?").get(info.lastInsertRowid),
    });
  });

  router.put("/offerings/:id", requireRole("pricing_owner"), (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM offerings WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!existing) {
      res.status(404).json({ error: "offering_not_found" });
      return;
    }
    const b = (req.body ?? {}) as OfferingBody;
    db.prepare(
      `UPDATE offerings SET
         name = ?, tagline = ?, unit = ?, unit_plural = ?, population_label = ?,
         scope_label = ?, deal_currency = ?, base_inputs_json = ?, status = ?
       WHERE id = ?`,
    ).run(
      b.name ?? existing.name,
      b.tagline ?? existing.tagline,
      b.unit ?? existing.unit,
      b.unit_plural ?? existing.unit_plural,
      b.population_label ?? existing.population_label,
      b.scope_label ?? existing.scope_label,
      b.deal_currency ?? existing.deal_currency,
      b.base_inputs_json !== undefined
        ? JSON.stringify(b.base_inputs_json)
        : existing.base_inputs_json,
      b.status ?? existing.status,
      id,
    );
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "offering_updated",
      entity_type: "offering",
      entity_id: id,
      details_md: `Offering #${id} updated.`,
    });
    res.json({ offering: db.prepare("SELECT * FROM offerings WHERE id = ?").get(id) });
  });

  // ————— Parameter sets (versioned; published = immutable) —————

  router.get("/parameter-sets/:id", requireAuth, (req, res) => {
    const row = db
      .prepare("SELECT * FROM parameter_sets WHERE id = ?")
      .get(Number(req.params.id));
    if (!row) {
      res.status(404).json({ error: "parameter_set_not_found" });
      return;
    }
    res.json({ parameter_set: row });
  });

  router.post("/offerings/:id/parameter-sets", requireRole("pricing_owner"), (req, res) => {
    const offeringId = Number(req.params.id);
    const offering = db.prepare("SELECT id FROM offerings WHERE id = ?").get(offeringId);
    if (!offering) {
      res.status(404).json({ error: "offering_not_found" });
      return;
    }
    const b = (req.body ?? {}) as { version?: string; parameters_json?: unknown; notes_md?: string };
    if (!b.version || b.parameters_json === undefined) {
      res.status(400).json({ error: "missing_fields", required: ["version", "parameters_json"] });
      return;
    }
    const dup = db
      .prepare("SELECT id FROM parameter_sets WHERE offering_id = ? AND version = ?")
      .get(offeringId, b.version);
    if (dup) {
      res.status(409).json({ error: "version_already_exists" });
      return;
    }
    const info = db
      .prepare(
        `INSERT INTO parameter_sets (offering_id, version, status, parameters_json, notes_md)
         VALUES (?, ?, 'draft', ?, ?)`,
      )
      .run(offeringId, b.version, JSON.stringify(b.parameters_json), b.notes_md ?? null);
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "parameter_set_created",
      entity_type: "parameter_set",
      entity_id: Number(info.lastInsertRowid),
      details_md: `Parameter set v${b.version} drafted for offering #${offeringId}.`,
    });
    res.status(201).json({
      parameter_set: db.prepare("SELECT * FROM parameter_sets WHERE id = ?").get(info.lastInsertRowid),
    });
  });

  router.put("/parameter-sets/:id", requireRole("pricing_owner"), (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM parameter_sets WHERE id = ?").get(id) as
      | { id: number; status: string; parameters_json: string; notes_md: string | null }
      | undefined;
    if (!row) {
      res.status(404).json({ error: "parameter_set_not_found" });
      return;
    }
    if (row.status !== "draft") {
      // BINDING: published parameter sets are immutable — create a new version.
      res.status(409).json({
        error: "published_parameter_sets_are_immutable",
        hint: "Create a new draft version instead.",
      });
      return;
    }
    const b = (req.body ?? {}) as { parameters_json?: unknown; notes_md?: string };
    db.prepare("UPDATE parameter_sets SET parameters_json = ?, notes_md = ? WHERE id = ?").run(
      b.parameters_json !== undefined ? JSON.stringify(b.parameters_json) : row.parameters_json,
      b.notes_md ?? row.notes_md,
      id,
    );
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "parameter_set_updated",
      entity_type: "parameter_set",
      entity_id: id,
      details_md: `Draft parameter set #${id} updated.`,
    });
    res.json({ parameter_set: db.prepare("SELECT * FROM parameter_sets WHERE id = ?").get(id) });
  });

  router.post("/parameter-sets/:id/publish", requireRole("pricing_owner"), (req, res) => {
    const id = Number(req.params.id);
    const row = db.prepare("SELECT * FROM parameter_sets WHERE id = ?").get(id) as
      | { id: number; offering_id: number; version: string; status: string }
      | undefined;
    if (!row) {
      res.status(404).json({ error: "parameter_set_not_found" });
      return;
    }
    if (row.status !== "draft") {
      res.status(409).json({ error: "only_draft_parameter_sets_can_be_published" });
      return;
    }
    db.prepare(
      `UPDATE parameter_sets
       SET status = 'published', published_by = ?, published_at = datetime('now')
       WHERE id = ?`,
    ).run(req.user!.id, id);
    // Retire previously published versions of the same offering.
    db.prepare(
      `UPDATE parameter_sets SET status = 'retired'
       WHERE offering_id = ? AND status = 'published' AND id != ?`,
    ).run(row.offering_id, id);
    logEvent(db, {
      actor_user_id: req.user!.id,
      event_type: "parameter_set_published",
      entity_type: "parameter_set",
      entity_id: id,
      details_md: `Parameter set v${row.version} published for offering #${row.offering_id}; prior published versions retired.`,
    });
    res.json({ parameter_set: db.prepare("SELECT * FROM parameter_sets WHERE id = ?").get(id) });
  });

  return router;
}
