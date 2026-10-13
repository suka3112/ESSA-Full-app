async (page) => {
  const ROOT = '/Users/suka_3112/Documents/Avensys AI/ESSA/Full App/QA_DevComplete_2026-10-13/shots';
  const state = await page.context().storageState();
  const ctx = await page.context().browser().newContext({ viewport: { width: 1600, height: 900 }, storageState: state });
  const p = await ctx.newPage();
  const routes = [
    ['dashboard','/admin/dashboard'],['invoice-dashboard','/admin/invoice-dashboard'],['invoices','/admin/invoice-processing/invoices'],
    ['upload','/admin/invoice-processing/upload'],['approvals','/admin/invoice-processing/approvals'],['exceptions','/admin/invoice-processing/exception-workbench'],
    ['inbound-emails','/admin/invoice-processing/inbound-emails'],['inbound-sharepoint','/admin/invoice-processing/inbound-sharepoint'],
    ['timeline','/admin/invoice-processing/timeline'],['approval-matrix','/admin/approval-matrix'],['audit-logs','/admin/audit-logs'],
    ['exception-codes','/admin/exception-codes'],['email-templates','/admin/email-templates'],['sla','/admin/sla'],['prompt-config','/admin/settings/prompt-config'],
    ['user-management','/admin/user-management'],['purchase-order','/admin/purchase-order'],['vendors','/admin/vendors'],['my-profile','/admin/my-profile'],
    ['sla-reminders','/admin/sla/reminders'],['sla-escalations','/admin/sla/escalations'],['sla-monitor','/admin/sla/monitor'],['wht','/admin/wht-configuration']
  ];
  const out = [];
  for (const [k, path] of routes) {
    const errs = [], bad = [];
    const onC = (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); };
    const onR = (r) => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 100)); };
    p.on('console', onC); p.on('response', onR);
    await p.goto('http://localhost:9080' + path).catch(() => {});
    await p.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(1500);
    let info = null; for (let t=0;t<4 && !info;t++){ try { info = await p.evaluate(() => ({ url: location.pathname, rows: document.querySelectorAll('tbody tr').length, txt: (document.body?.innerText||'').slice(0, 160).replace(/\s+/g, ' ') })); } catch(e){ await p.waitForTimeout(2500) } } info = info || {url:'?',rows:-1,txt:'EVAL FAILED (navigation loop?)'};
    await p.screenshot({ path: `${ROOT}/${k}.png` });
    p.off('console', onC); p.off('response', onR);
    out.push({ k, ...info, bad: [...new Set(bad)].slice(0, 5), errs: [...new Set(errs)].slice(0, 3) });
  }
  await ctx.close();
  return JSON.stringify(out, null, 1);
}
