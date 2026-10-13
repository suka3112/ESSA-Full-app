const F = '13 Administration - Invoice Configuration';
await go('/settings/prompt-config', 2500);
await p.getByRole('tab', { name: 'N-Way Matching' }).first().click(); await settle(2000);
let k = 3;
for (const cat of ['Manpower Services', 'Camp Service and Catering', 'Non-PO']) {
  if (await clickText(cat, { exact: true })) { await shot(F, `04-${k} N-Way Matching - ${cat}`, { full: true }); k++; }
}
if (await clickText('Full view', { role: 'button' })) { await shot(F, `04-${k} N-Way Matching - Full view`); await esc(); }
