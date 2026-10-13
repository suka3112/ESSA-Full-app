let F = '18 Administration - Users & Roles';
await go('/user-management', 3000);
const tabs = p.locator('[role=tablist]').first().locator('[role=tab]');
const n = await tabs.count();
for (let i = 0; i < n; i++) {
  const t = tabs.nth(i); const label = (await t.innerText()).trim().replace(/\s*\(\d+\)/, '').replace(/\s+/g, ' ');
  await t.click(); await settle(1500);
  const pre = String(i + 1).padStart(2, '0');
  await shot(F, `${pre}-1 ${label}`, i === 2 ? { full: true } : {});
}
await tabs.nth(0).click(); await settle(1000);
if (await clickText('Add user', { role: 'button' })) { await shot(F, '04 Add user'); await esc(); }
F = '19 Audit Logs';
await go('/audit-logs', 2500);
await shot(F, '01 Audit log', { full: true });
if (await openFirstRow()) { await shot(F, '02 Audit entry detail'); await esc(); }
F = '20 My Profile';
await go('/my-profile', 2500);
await shot(F, '01 My profile', { full: true });
