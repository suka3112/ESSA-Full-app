let F = '13 Administration - Invoice Configuration';
await go('/settings/prompt-config', 2500);
const tabs = p.locator('[role=tablist]').first().locator('[role=tab]');
const n = await tabs.count();
for (let i = 0; i < n; i++) {
  const t = tabs.nth(i); const label = (await t.innerText()).trim().replace(/\s+/g, ' ');
  await t.click(); await settle(1800);
  const pre = String(i + 1).padStart(2, '0');
  await shot(F, `${pre}-1 ${label}`, { full: true });
  // inner view toggles (e.g. N-Way By rule / Matrix)
  const inner = p.locator('.nw-view [role=tab], .nw-view button');
  const m = await inner.count();
  for (let j = 1; j < m; j++) { const b = inner.nth(j); const l = (await b.innerText()).trim(); if (!l) continue; await b.click(); await settle(1000); await shot(F, `${pre}-${j + 1} ${label} - ${l}`, { full: true }); }
  if (m > 1) { await inner.nth(0).click(); await settle(800); }
  if (i > 0 && await openFirstRow()) { await shot(F, `${pre}-9 ${label} - detail panel`); await esc(); }
}
