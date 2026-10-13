const F = '06 Timeline';
await go('/invoice-processing/timeline', 3000);
if (await clickText('Browse', { role: 'button' })) {
  await shot(F, '02 Browse invoices (Cmd+K)');
  const box = p.locator('input').filter({ hasNot: p.locator('[type=hidden]') });
  await p.keyboard.type('902/PT.ALE', { delay: 30 }); await sleep(1200);
  const item = p.getByText('902/PT.ALE-PAU/09/2026').first();
  if (await item.count()) { await item.click(); await settle(2500); } else { log.push('  (invoice not found in browse)'); await esc(); }
}
await shot(F, '01 Invoice timeline', { full: true });
if (await clickText('Open detail', { role: 'button', ms: 4000 })) { await shot(F, '03 Open invoice detail from timeline'); }
