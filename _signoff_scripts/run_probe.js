async (page) => {
const ROOT = '/Users/suka_3112/Documents/Avensys AI/ESSA/Full App/UIUX_SignOff_2026-10-12';
const BASE = 'http://localhost:9080/admin';
const log = [];
const state = await page.context().storageState();
const ctx2 = await page.context().browser().newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, storageState: state });
const p = await ctx2.newPage();
const sleep = (ms) => p.waitForTimeout(ms);
const settle = async (ms = 1800) => {
  await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await sleep(ms);
  // wait while loaders are visible
  for (let i = 0; i < 20; i++) {
    const busy = await p.evaluate(() => [...document.querySelectorAll('[class*=loader], [class*=Loader], [class*=skeleton], [role=progressbar]')].some((e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 20 }));
    if (!busy) break;
    await sleep(500);
  }
};
const go = async (path, ms) => { await p.goto(path.startsWith('http') ? path : BASE + path); await settle(ms); };
const setH = async (h) => p.setViewportSize({ width: 1600, height: Math.round(h) });
const shot = async (folder, name, opts = {}) => {
  const file = `${ROOT}/${folder}/${name}.png`;
  if (opts.full) {
    const extra = await p.evaluate((sel) => {
      const cands = [...document.querySelectorAll(sel || '.main-content, .dx-id-panel .card-body, [class*=scroll]')];
      let best = 0; cands.forEach((e) => { const d = e.scrollHeight - e.clientHeight; if (d > best && getComputedStyle(e).overflowY.match(/auto|scroll/)) best = d });
      return Math.max(best, document.documentElement.scrollHeight - innerHeight);
    }, opts.sel || null);
    if (extra > 40) { await setH(Math.min(1000 + extra + 20, 7000)); await sleep(900); }
    await p.screenshot({ path: file });
    if (extra > 40) { await setH(1000); await sleep(400); }
  } else if (opts.el) {
    await p.locator(opts.el).first().screenshot({ path: file });
  } else {
    await p.screenshot({ path: file });
  }
  log.push(`${folder}/${name}`);
};
const clickText = async (text, opts = {}) => {
  const loc = (opts.role ? p.getByRole(opts.role, { name: text, exact: !!opts.exact }) : p.getByText(text, { exact: !!opts.exact })).first();
  if (!(await loc.count())) { log.push(`  (not found: ${text})`); return false }
  await loc.click({ timeout: 5000 }).catch((e) => log.push(`  (click failed: ${text})`));
  await settle(opts.ms || 1200);
  return true;
};
const esc = async () => { await p.keyboard.press('Escape'); await sleep(600); };
const openFirstRow = async (sel = 'tbody tr') => {
  const row = p.locator(sel).first();
  if (!(await row.count())) { log.push('  (no rows)'); return false }
  // first cell only — never a toggle / action button in the row
  const cell = row.locator('td').first();
  const box = await cell.boundingBox().catch(() => null);
  if (!box) { log.push('  (row not visible)'); return false }
  const url0 = p.url();
  await p.mouse.click(box.x + Math.min(24, box.width / 2), box.y + box.height / 2);
  log.push('  (row opened' + (p.url() !== url0 ? ' -> ' + p.url() : '') + ')');
  await settle(1500);
  return true;
};
const clickTabs = async (folder, prefix, tablistSel, opts = {}) => {
  const tabs = p.locator(`${tablistSel} [role=tab]`);
  const n = await tabs.count();
  for (let i = 0; i < n; i++) {
    const t = tabs.nth(i);
    const label = (await t.innerText()).trim().replace(/\s+\d+$/, '').replace(/\s+/g, ' ').replace(/[\/\\:*?"<>|]/g, '-');
    await t.click(); await settle(opts.ms || 1200);
    await shot(folder, `${prefix}${String(i + 1).padStart(2, '0')} ${label}`, opts);
  }
};
try {
for (const path of ['/invoice-processing/approvals', '/invoice-processing/inbound-sharepoint', '/settings/prompt-config', '/exception-codes', '/email-templates', '/user-management', '/invoice-processing/timeline', '/purchase-order']) {
  await go(path, 2000);
  const info = await p.evaluate(() => {
    const row = document.querySelector('tbody tr');
    const rowCtl = row ? [...row.querySelectorAll('a,button,[role=button],input,[role=switch]')].map(e => e.tagName + ':' + (e.getAttribute('aria-label') || e.innerText || e.type || '').trim().slice(0, 30)) : [];
    const cards = [...document.querySelectorAll('[class*=card] button, [class*=card] a')].slice(0, 8).map(e => (e.getAttribute('aria-label') || e.innerText).trim().slice(0, 30));
    const btns = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => (b.getAttribute('aria-label') || b.innerText).trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean);
    return { rowCtl, btns: [...new Set(btns)].slice(0, 30) };
  });
  log.push(path + ' :: ROW ' + info.rowCtl.join(' | ') + ' :: BTNS ' + info.btns.join(' | '));
}
} catch (e) { log.push('ERROR: ' + e.message) }
await ctx2.close(); return log.join('\n');
}
