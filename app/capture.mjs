// Headless screenshot capture for the DealSpine user guide (English screens).
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const EXE = `${process.env.HOME}/Library/Caches/ms-playwright/chromium-1228/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing`;
const BASE = 'http://localhost:8790';
const OUT = '/Users/rajkumarrajagobalan/Raj_Academy/Token_Economy/guide/images';

// [filename, user_id|null, route, {full, settle, action}] — names match DealSpine-Guide.md
const SHOTS = [
  ['01-login',          null, 'login',      { full: true }],
  ['03-workspace',      2,    'deal',        { full: true, settle: 1200 }],
  ['04-workspace-gates',2,    'deal',        { full: true, settle: 800, action: 'showGates' }],
  ['05-proposal',       2,    'proposal',    { full: true, settle: 1200 }],
  ['06-home-dealdesk',  3,    'home',        { full: false, settle: 700 }],
  ['07-approvals',      3,    'approvals',   { full: true, settle: 1000 }],
  ['08-insights',       2,    'insights',    { full: true, settle: 1000 }],
  ['09-insight-studio', 6,    'insights',    { full: false, settle: 600, action: 'openStudio' }],
  ['10-policy-studio',  1,    'policy',      { full: true, settle: 900 }],
  ['11-portfolio',      5,    'portfolio',   { full: true, settle: 1000 }],
  ['12-insight-result', 2,    'insights',    { full: false, settle: 400, action: 'runInsight' }],
  ['13-settings',       1,    'settings',    { full: true, settle: 900 }],
  ['14-home-leadership',5,    'home',        { full: false, settle: 700 }],
  ['15-evidence',       4,    'evidence',    { full: true, settle: 700 }],
  ['16-engagements',    4,    'engagements', { full: true, settle: 700 }],
  ['17-help',           2,    'help',        { full: true, settle: 700 }],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ executablePath: EXE, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
let curUser = null;

for (const [name, uid, route, opt] of SHOTS) {
  if (uid !== curUser) {
    if (uid === null) {
      await ctx.clearCookies();
      curUser = null;
    } else {
      // Log in from within the page origin so the httpOnly cookie is set on
      // the document context the SPA's auth.me() will actually use.
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
      const ok = await page.evaluate(async (id) => {
        const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: id }) });
        return r.status;
      }, uid);
      if (ok !== 200) console.log(`login ${uid} -> ${ok}`);
      curUser = uid;
    }
  }
  await page.goto(`${BASE}/#/${route}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  // force dark theme off? keep default (dark). Ensure EN.
  await sleep(opt.settle || 500);

  if (opt.action === 'showGates') {
    await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/gate detail/i.test(x.innerText)); if(b) b.click(); });
    await sleep(700);
  }
  if (opt.action === 'runInsight') {
    await page.evaluate(() => { const b=[...document.querySelectorAll('button,[role=button]')].find(x=>/Explain this quote/i.test(x.innerText)); if(b) b.click(); });
    await sleep(3500);
  }
  if (opt.action === 'openStudio') {
    await page.evaluate(() => { const b=[...document.querySelectorAll('button,[role=button]')].find(x=>/New button/i.test(x.innerText)); if(b) b.click(); });
    await sleep(700);
  }

  const path = `${OUT}/${name}.png`;
  await page.screenshot({ path, fullPage: !!opt.full });
  console.log(`saved ${name} (${route}, user ${uid ?? 'none'})`);
}

await browser.close();
console.log('DONE');
