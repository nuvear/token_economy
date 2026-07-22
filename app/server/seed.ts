// Seed: 5 users (one per role) + 1 builder-flagged sales user,
// 5 offerings from the reference calculator presets' base numbers,
// and the 6 PRD seed insight buttons. Idempotent (INSERT OR IGNORE-style).
import { openDb, logEvent } from "./db";
import type { Db } from "./db";
import { PRESET_BASES } from "../src/engine/presets";
import { pathToFileURL } from "node:url";

interface SeedUser {
  full_name: string;
  email: string;
  role: string;
  is_builder: number;
}

const SEED_USERS: SeedUser[] = [
  { full_name: "Priya Owens", email: "priya.owens@example.com", role: "pricing_owner", is_builder: 0 },
  { full_name: "Sam Alvarez", email: "sam.alvarez@example.com", role: "sales", is_builder: 0 },
  { full_name: "Dana Kimura", email: "dana.kimura@example.com", role: "deal_desk", is_builder: 0 },
  { full_name: "Devi Larsson", email: "devi.larsson@example.com", role: "delivery", is_builder: 0 },
  { full_name: "Lee Novak", email: "lee.novak@example.com", role: "leadership", is_builder: 0 },
  // Builder flag: any role, granted by admin (PRD §2) — here a sales engineer.
  { full_name: "Bea Tanaka", email: "bea.tanaka@example.com", role: "sales", is_builder: 1 },
];

// PRD §3 Phase 1 seed library (4 named buttons) + 2 more drawn from the
// PRD's Phase-2 loop (variance, evidence gates).
const SEED_INSIGHT_BUTTONS = [
  {
    button_key: "explain_governance_state",
    label: "Explain this quote's governance state",
    description_md: "Plain-language walkthrough of why the quote is green, warned, or blocked.",
    prompt_template_md:
      "You are the DealSpine pricing-governance explainer. Using the quote data below, explain the quote's governance state (green / warning / blocked), which gates fired and why, and what would change the verdict. Be concise and concrete.\n\n{{data}}",
    data_scope: "current_quote",
    allowed_roles: "pricing_owner,sales,deal_desk,delivery,leadership",
    provider: "anthropic",
    model: "claude-sonnet",
    output_language: "author",
  },
  {
    button_key: "where_below_policy",
    label: "Where is this deal below policy?",
    description_md:
      "Gap analysis vs published bands and floors. Restricted: includes internal floor data.",
    prompt_template_md:
      "Compare this quote against the published policy (bands, floors, defense margin, reinvestment floor). List every place the deal sits below policy, quantify each gap, and note which require deal-desk approval.\n\n{{data}}",
    data_scope: "current_quote",
    // Includes floor/cost figures → restricted to roles that may see them (§2).
    allowed_roles: "pricing_owner,deal_desk,leadership",
    provider: "anthropic",
    model: "claude-sonnet",
    output_language: "author",
  },
  {
    button_key: "portfolio_floor_adherence_exec",
    label: "Summarize portfolio floor adherence for the exec meeting",
    description_md: "One-slide summary of revenue vs floors across live deals.",
    prompt_template_md:
      "Write an executive summary (5 bullets max) of portfolio floor adherence: deals at or above floor, exceptions in flight, discount posture vs bands, and reinvestment funded. Audience: leadership meeting.\n\n{{data}}",
    data_scope: "portfolio_summary",
    allowed_roles: "pricing_owner,deal_desk,leadership",
    provider: "anthropic",
    model: "claude-sonnet",
    output_language: "author",
  },
  {
    button_key: "objection_talking_points",
    label: "Draft the objection-handling talking points for this contested bid",
    description_md: "Sanctioned answers for the hard moments in a contested negotiation.",
    prompt_template_md:
      "This is a contested bid. Draft objection-handling talking points grounded in the anchor evidence, the validated alternative, and the defense floor. Never reveal internal cost, margin, or floor figures in customer-facing wording.\n\n{{data}}",
    data_scope: "current_quote",
    allowed_roles: "pricing_owner,sales,deal_desk",
    provider: "openai",
    model: "gpt-5",
    output_language: "author",
  },
  {
    button_key: "engagement_variance_drivers",
    label: "Explain this engagement's sold-vs-actual variance",
    description_md: "Named variance drivers (mix drift, rework, tokens, delay) vs reserves.",
    prompt_template_md:
      "Analyze the sold-vs-actual variance for this engagement. Name each driver (mix drift, rework, redeployment shortfall, tokens, delay), quantify it, and say which reserve did or did not cover it.\n\n{{data}}",
    data_scope: "engagement_variance",
    allowed_roles: "pricing_owner,sales,deal_desk,delivery,leadership",
    provider: "gemini",
    model: "gemini-pro",
    output_language: "author",
  },
  {
    button_key: "evidence_gate_readiness_ja",
    label: "この見積のエビデンス充足状況を要約",
    description_md:
      "Evidence-gate readiness summary, answered in Japanese (output language declared per PRD i18n).",
    prompt_template_md:
      "Summarize this quote's evidence-gate readiness: sample counts vs minimums, data recency, baseline confidence, and which gates still block Production stage. 日本語で回答してください。\n\n{{data}}",
    data_scope: "current_quote",
    allowed_roles: "pricing_owner,sales,deal_desk,delivery,leadership",
    provider: "anthropic",
    model: "claude-sonnet",
    output_language: "ja",
  },
];

export function seedDb(db: Db): void {
  const insertUser = db.prepare(
    `INSERT INTO users (full_name, email, role, is_builder)
     SELECT ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = ?)`,
  );
  for (const u of SEED_USERS) {
    insertUser.run(u.full_name, u.email, u.role, u.is_builder, u.email);
  }

  const insertOffering = db.prepare(
    `INSERT INTO offerings
       (preset_key, name, tagline, unit, unit_plural, population_label, scope_label,
        deal_currency, base_inputs_json, status)
     SELECT ?, ?, ?, ?, ?, ?, ?, 'USD', ?, 'published'
     WHERE NOT EXISTS (SELECT 1 FROM offerings WHERE preset_key = ?)`,
  );
  for (const p of PRESET_BASES) {
    insertOffering.run(
      p.key, p.name, p.tagline, p.unit, p.unit_plural,
      p.population_label, p.scope_label, JSON.stringify(p), p.key,
    );
  }

  const builder = db
    .prepare("SELECT id FROM users WHERE is_builder = 1 ORDER BY id LIMIT 1")
    .get() as { id: number } | undefined;

  const insertButton = db.prepare(
    `INSERT INTO insight_buttons
       (button_key, label, description_md, prompt_template_md, data_scope,
        allowed_roles, provider, model, output_language, created_by, is_published)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1
     WHERE NOT EXISTS (SELECT 1 FROM insight_buttons WHERE button_key = ?)`,
  );
  for (const b of SEED_INSIGHT_BUTTONS) {
    insertButton.run(
      b.button_key, b.label, b.description_md, b.prompt_template_md, b.data_scope,
      b.allowed_roles, b.provider, b.model, b.output_language,
      builder?.id ?? null, b.button_key,
    );
  }

  logEvent(db, {
    event_type: "database_seeded",
    entity_type: "database",
    details_md:
      "Seeded users (5 roles + builder), 5 offerings from calculator presets, 6 insight buttons.",
  });
}

const isMain =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const db = openDb();
  seedDb(db);
  const users = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  const offerings = db.prepare("SELECT COUNT(*) AS n FROM offerings").get() as { n: number };
  const buttons = db.prepare("SELECT COUNT(*) AS n FROM insight_buttons").get() as { n: number };
  console.log(
    `[dealspine] seeded: ${users.n} users, ${offerings.n} offerings, ${buttons.n} insight buttons`,
  );
}
