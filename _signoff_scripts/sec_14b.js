const F = '14 Administration - SLA Management';
await go('/sla', 2500);
// page-level SLA tabs (skip the first, already captured)
const tl = p.locator('[role=tablist]').first().locator('[role=tab]');
const n = await tl.count();
log.push('sla tabs ' + n);
for (let i = 1; i < n; i++) {
  const t = tl.nth(i); const label = (await t.innerText()).trim().replace(/\s+/g, ' ').replace(/[\/\\]/g, '-');
  await t.click(); await settle(1500);
  await shot(F, `01-${i + 1} ${label}`, { full: true });
}
await go('/sla', 2000);
if (await openFirstRow()) {
  const dt = p.locator('[role=tablist]').first().locator('[role=tab]');
  const m = await dt.count();
  for (let i = 1; i < m; i++) {
    const t = dt.nth(i); const label = (await t.innerText()).trim().replace(/\s+\d+$/, '').replace(/\s+/g, ' ').replace(/[\/\\]/g, '-');
    await t.click(); await settle(1200);
    await shot(F, `03-${i + 1} SLA detail - ${label}`);
  }
}
