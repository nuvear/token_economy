// Curated demo data for the user-guide screenshots — created through the real
// API so governance states are authentic. Run against the live server.
import { request } from 'playwright-core';

const BASE = 'http://localhost:8790';

async function asUser(uid) {
  const ctx = await request.newContext({ baseURL: BASE });
  const r = await ctx.post('/api/auth/login', { data: { user_id: uid } });
  if (!r.ok()) throw new Error(`login ${uid} failed ${r.status()}`);
  return ctx;
}

const sales = await asUser(2);
const desk = await asUser(3);

// The case-example deal + a few for portfolio texture. Realistic customer names.
const DEALS = [
  { offering_id: 1, title: 'Custom Code Remediation — ECC → S/4HANA', overrides: { discountPct: 25 }, approve: true },
  { offering_id: 2, title: 'Fabrikam — Test Automation, S/4 Regression', overrides: { discountPct: 20 } },
  { offering_id: 3, title: 'Northwind — Data Migration, ECC → S/4HANA', overrides: { discountPct: 18 } },
  { offering_id: 4, title: 'Contoso — Interface Development, BTP / CPI', overrides: { discountPct: 15 } },
];

const created = [];
for (const d of DEALS) {
  const r = await sales.post('/api/quotes', { data: { offering_id: d.offering_id, title: d.title, input_overrides: d.overrides } });
  const body = await r.json();
  created.push({ id: body.quote.id, title: d.title, state: body.quote.governance_state, approve: d.approve });
  console.log(`created #${body.quote.id} ${d.title} → ${body.quote.governance_state}`);
}

// Deal desk approves the case-example deal so its proposal can be generated.
const queue = await (await desk.get('/api/approvals')).json();
for (const c of created.filter((x) => x.approve)) {
  const appr = queue.approvals.find((a) => a.quote_id === c.id && a.status === 'pending');
  if (!appr) { console.log(`no pending approval for #${c.id}`); continue; }
  const dec = await desk.post(`/api/approvals/${appr.id}/decision`, {
    data: {
      action: 'approve',
      rationale: 'Strategic account; customer alternative validated at an incumbent quote above our floor. Time-boxed exception approved by the deal desk.',
      expires_at: '2026-12-31',
    },
  });
  console.log(`approved #${c.id} → ${dec.status()}`);
}

console.log('DEMO DATA DONE');
