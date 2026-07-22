// Single SQLite database (app/data/dealspine.db).
// Plain-English snake_case schema; audit = append-only events table
// (INSERT only — triggers reject UPDATE/DELETE).
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Db = Database.Database;

const APP_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const DEFAULT_DB_PATH = path.join(APP_DIR, "data", "dealspine.db");

export function openDb(dbPath: string = DEFAULT_DB_PATH): Db {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  return db;
}

export function migrate(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY,
      full_name     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      role          TEXT NOT NULL CHECK (role IN
                      ('pricing_owner','sales','deal_desk','delivery','leadership')),
      is_builder    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS offerings (
      id                 INTEGER PRIMARY KEY,
      preset_key         TEXT NOT NULL UNIQUE,
      name               TEXT NOT NULL,
      tagline            TEXT,
      unit               TEXT NOT NULL,
      unit_plural        TEXT NOT NULL,
      population_label   TEXT,
      scope_label        TEXT,
      deal_currency      TEXT NOT NULL DEFAULT 'USD',
      base_inputs_json   TEXT NOT NULL,
      status             TEXT NOT NULL DEFAULT 'published',
      created_by         INTEGER REFERENCES users(id),
      created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS parameter_sets (
      id               INTEGER PRIMARY KEY,
      offering_id      INTEGER NOT NULL REFERENCES offerings(id),
      version          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','published','retired')),
      parameters_json  TEXT NOT NULL,
      notes_md         TEXT,
      published_by     INTEGER REFERENCES users(id),
      published_at     TEXT,
      created_at       TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (offering_id, version)
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id                   INTEGER PRIMARY KEY,
      offering_id          INTEGER NOT NULL REFERENCES offerings(id),
      author_user_id       INTEGER NOT NULL REFERENCES users(id),
      title                TEXT NOT NULL,
      deal_currency        TEXT NOT NULL DEFAULT 'USD',
      quote_stage          TEXT NOT NULL DEFAULT 'Pilot',
      input_snapshot_json  TEXT NOT NULL,
      outputs_json         TEXT,
      engine_version       TEXT NOT NULL,
      governance_state     TEXT NOT NULL DEFAULT 'draft'
                             CHECK (governance_state IN
                               ('draft','green','warning','blocked','exception_requested',
                                'approved','rejected','won','lost')),
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approvals (
      id                INTEGER PRIMARY KEY,
      quote_id          INTEGER NOT NULL REFERENCES quotes(id),
      requested_by      INTEGER NOT NULL REFERENCES users(id),
      approver_user_id  INTEGER REFERENCES users(id),
      status            TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','expired')),
      rationale_md      TEXT,
      decision_md       TEXT,
      expires_at        TEXT,
      created_at        TEXT NOT NULL DEFAULT (datetime('now')),
      decided_at        TEXT
    );

    -- Append-only audit log. Never UPDATE or DELETE (triggers enforce it).
    CREATE TABLE IF NOT EXISTS events (
      id             INTEGER PRIMARY KEY,
      actor_user_id  INTEGER REFERENCES users(id),
      event_type     TEXT NOT NULL,
      entity_type    TEXT NOT NULL,
      entity_id      INTEGER,
      details_md     TEXT,
      payload_json   TEXT,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TRIGGER IF NOT EXISTS events_are_append_only_no_update
      BEFORE UPDATE ON events
      BEGIN SELECT RAISE(ABORT, 'events table is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS events_are_append_only_no_delete
      BEFORE DELETE ON events
      BEGIN SELECT RAISE(ABORT, 'events table is append-only'); END;

    CREATE TABLE IF NOT EXISTS insight_buttons (
      id                 INTEGER PRIMARY KEY,
      button_key         TEXT NOT NULL UNIQUE,
      label              TEXT NOT NULL,
      description_md     TEXT,
      prompt_template_md TEXT NOT NULL,
      data_scope         TEXT NOT NULL
                           CHECK (data_scope IN
                             ('current_quote','portfolio_summary','engagement_variance',
                              'policy','evidence_summary')),
      allowed_roles      TEXT NOT NULL DEFAULT 'pricing_owner,sales,deal_desk,delivery,leadership',
      provider           TEXT NOT NULL DEFAULT 'anthropic'
                           CHECK (provider IN ('anthropic','openai','gemini','grok','local_gemma')),
      model              TEXT NOT NULL,
      output_language    TEXT NOT NULL DEFAULT 'author',
      created_by         INTEGER REFERENCES users(id),
      is_published       INTEGER NOT NULL DEFAULT 1,
      created_at         TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS insight_runs (
      id                    INTEGER PRIMARY KEY,
      insight_button_id     INTEGER NOT NULL REFERENCES insight_buttons(id),
      run_by                INTEGER NOT NULL REFERENCES users(id),
      data_scope            TEXT NOT NULL,
      packaged_markdown     TEXT,
      provider              TEXT NOT NULL,
      model                 TEXT NOT NULL,
      result_md             TEXT,
      status                TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','streaming','done','failed')),
      created_at            TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_keys (
      id             INTEGER PRIMARY KEY,
      provider       TEXT NOT NULL UNIQUE
                       CHECK (provider IN ('anthropic','openai','gemini','grok','local_gemma')),
      key_ciphertext TEXT,
      default_model  TEXT,
      updated_by     INTEGER REFERENCES users(id),
      updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** Append one audit event (the ONLY sanctioned way to write to events). */
export function logEvent(
  db: Db,
  event: {
    actor_user_id?: number | null;
    event_type: string;
    entity_type: string;
    entity_id?: number | null;
    details_md?: string | null;
    payload_json?: unknown;
  },
): void {
  db.prepare(
    `INSERT INTO events (actor_user_id, event_type, entity_type, entity_id, details_md, payload_json)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    event.actor_user_id ?? null,
    event.event_type,
    event.entity_type,
    event.entity_id ?? null,
    event.details_md ?? null,
    event.payload_json === undefined ? null : JSON.stringify(event.payload_json),
  );
}
