// Approvals queue (PRD §2 row 4): deal_desk approves/rejects; sales may only
// request (rows are auto-created by the quote flow); pricing_owner and
// leadership read. HARD RULE 2: a quote's author can never be its approver.
import { Router } from "express";
import type { Db } from "../db";
import { logEvent } from "../db";
import { requireRole } from "../auth";

interface ApprovalRow {
  id: number;
  quote_id: number;
  requested_by: number;
  approver_user_id: number | null;
  status: string;
  rationale_md: string | null;
  decision_md: string | null;
  expires_at: string | null;
  created_at: string;
  decided_at: string | null;
}

const DECISION_ACTIONS = ["approve", "re_scope", "no_bid"] as const;
type DecisionAction = (typeof DECISION_ACTIONS)[number];

export function approvalsRouter(db: Db): Router {
  const router = Router();

  // §2: delivery has no access to the approvals queue. Sales sees only its own
  // requested rows (narrowed below); everyone else on this allowlist reads all.
  router.get("/approvals", requireRole("pricing_owner", "deal_desk", "leadership", "sales"), (req, res) => {
    const u = req.user!;
    const rows = (
      u.role === "sales"
        ? db
            .prepare(
              `SELECT a.*, q.title AS quote_title, q.governance_state
               FROM approvals a JOIN quotes q ON q.id = a.quote_id
               WHERE a.requested_by = ? ORDER BY a.id DESC`,
            )
            .all(u.id)
        : db
            .prepare(
              `SELECT a.*, q.title AS quote_title, q.governance_state
               FROM approvals a JOIN quotes q ON q.id = a.quote_id
               ORDER BY a.id DESC`,
            )
            .all()
    ) as (ApprovalRow & { quote_title: string; governance_state: string })[];
    res.json({ approvals: rows });
  });

  router.post("/approvals/:id/decision", requireRole("deal_desk"), (req, res) => {
    const u = req.user!;
    const approval = db
      .prepare("SELECT * FROM approvals WHERE id = ?")
      .get(Number(req.params.id)) as ApprovalRow | undefined;
    if (!approval) {
      res.status(404).json({ error: "approval_not_found" });
      return;
    }
    if (approval.status !== "pending") {
      res.status(409).json({ error: "approval_already_decided", status: approval.status });
      return;
    }
    const quote = db
      .prepare("SELECT id, author_user_id, title FROM quotes WHERE id = ?")
      .get(approval.quote_id) as { id: number; author_user_id: number; title: string };

    // HARD RULE: author ≠ approver.
    if (quote.author_user_id === u.id) {
      res.status(403).json({
        error: "author_cannot_approve_own_quote",
        hint: "Route this approval to another deal-desk member.",
      });
      return;
    }

    const body = (req.body ?? {}) as {
      action?: string;
      rationale?: string;
      expires_at?: string;
    };
    const action = body.action as DecisionAction;
    if (!DECISION_ACTIONS.includes(action)) {
      res.status(400).json({ error: "invalid_action", allowed: DECISION_ACTIONS });
      return;
    }
    const rationale = String(body.rationale ?? "").trim();
    if (!rationale) {
      // Overrides need rationale + approver + expiry (PRD §3).
      res.status(400).json({ error: "rationale_required" });
      return;
    }
    if (action === "approve" && !body.expires_at) {
      res.status(400).json({
        error: "expiry_required_for_override",
        hint: "Approvals are time-boxed: pass expires_at (ISO date).",
      });
      return;
    }

    const approvalStatus = action === "approve" ? "approved" : "rejected";
    const quoteState = action === "approve" ? "approved" : "rejected";
    db.prepare(
      `UPDATE approvals SET status = ?, approver_user_id = ?, decision_md = ?,
         expires_at = ?, decided_at = datetime('now')
       WHERE id = ?`,
    ).run(
      approvalStatus,
      u.id,
      `**${action}** — ${rationale}`,
      body.expires_at ?? null,
      approval.id,
    );
    db.prepare("UPDATE quotes SET governance_state = ?, updated_at = datetime('now') WHERE id = ?")
      .run(quoteState, quote.id);

    // Every decision appends to the audit log.
    logEvent(db, {
      actor_user_id: u.id,
      event_type: "approval_decided",
      entity_type: "approval",
      entity_id: approval.id,
      details_md: `Approval #${approval.id} for quote #${quote.id} (“${quote.title}”): **${action}** by ${u.full_name}.\n\nRationale: ${rationale}${body.expires_at ? `\n\nExpires: ${body.expires_at}` : ""}`,
      payload_json: { action, quote_id: quote.id, expires_at: body.expires_at ?? null },
    });

    res.json({
      approval: db.prepare("SELECT * FROM approvals WHERE id = ?").get(approval.id),
      quote_governance_state: quoteState,
    });
  });

  return router;
}
