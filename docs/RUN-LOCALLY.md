# Run DealSpine locally (instructions for Cursor)

*Paste this to Cursor. Goal: run the app on this laptop for testing. **Do not modify, commit, or push any tracked files** — only run it.*

## Guardrails (read first)

- **Run only. Do not edit source.** You may create/refresh **gitignored runtime artifacts** (`app/node_modules/`, `app/data/*.db`, `app/dist/`) — those are expected. Do **not** change any tracked file.
- **No git operations.** Do not `git add`, `commit`, `push`, `checkout`, `switch`, `stash`, or change branches. Leave the working tree as you found it.
- **Do NOT run `node capture.mjs`** — it overwrites tracked screenshots in `guide/images/`. (`npm run seed` and the optional `node seed-demo.mjs` only touch the gitignored database and are fine.)
- If a step needs a code change to work, **stop and report it** instead of editing.
- Prerequisite: **Node.js 20+** (`node -v`). npm comes with it.

## Run it

```sh
cd app
npm install          # installs deps into app/node_modules (gitignored)
npm run seed         # creates app/data/dealspine.db (gitignored): users, offerings, insight buttons
npm run dev          # starts API on :8791 and web on :8790 (vite proxies /api)
```

Then open **http://localhost:8790** and sign in by picking a seeded user (dev login — no password). Try **Sam Alvarez** (Sales) to build a quote, **Dana Kimura** (Deal Desk) to approve, **Lee Novak** (Leadership) for the portfolio, **Bea Tanaka** (builder) for Insight Studio.

**Optional — richer demo data** (only writes to the gitignored DB; safe): with the dev server running, in a second terminal `cd app && node seed-demo.mjs`. This creates a few curated quotes (the case-example deal approved, others pending) so the Portfolio and Approvals screens have content.

## Verify it works

```sh
cd app
npm test             # expect: 161 tests passing
npm run build        # expect: clean tsc -b + vite build
```

In the browser, the ★ Code Remediation preset (Deal Workspace) should show the case-example numbers — traditional revenue **$1.2M**, gross profit **$415.8K**, and a **BLOCKED** governance verdict at a 25% discount (risk-adjusted max 12.5%). That blocked state is correct, not a bug.

## Notes

- **No API keys needed.** AI insights default to a built-in **offline mock** (labelled "fell back to offline mock"); the app is fully functional with zero keys.
- If **port 8790 or 8791 is busy**, stop whatever is using it (`lsof -ti tcp:8790 | xargs kill`) and retry — don't edit the port in config.
- **Stop the app** with Ctrl-C in the `npm run dev` terminal.
- **To reset data**, delete `app/data/dealspine.db*` and re-run `npm run seed` (these files are gitignored).

## When done

- Ctrl-C the dev server. No cleanup of `node_modules`/`data`/`dist` is required (all gitignored).
- Confirm the tracked working tree is unchanged: `git status` should show no modified tracked files. If it shows any, you edited something you shouldn't have — revert it.

*Repo orientation, if useful: `CLAUDE.md` (overview), `app/README.md` (app details), `guide/DealSpine-Guide.md` (what each screen does).*
