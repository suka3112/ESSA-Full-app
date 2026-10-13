let F = '09 Inbound Email';
await go('/invoice-processing/inbound-emails', 2500);
await clickTabs(F, '01-', '.dx-page', { ms: 1200 });
await p.locator('[role=tab]').first().click(); await settle(800);
if (await clickText('Status guide', { role: 'button' })) { await shot(F, '02 Status guide'); await esc(); }
if (await openFirstRow()) { await shot(F, '03 Email detail panel'); await esc(); }
const failed = p.getByRole('tab', { name: /Failed/ }).first();
if (await failed.count()) { await failed.click(); await settle(1000); if (await openFirstRow()) { await shot(F, '04 Failed email detail panel'); await esc(); } }
F = '10 Inbound SharePoint';
await go('/invoice-processing/inbound-sharepoint', 2500);
await shot(F, '01 Inbound SharePoint');
for (const [i, t] of [['02', 'Failed (1)'], ['03', 'Processed (3)']]) {
  if (await clickText(t, { role: 'button' })) await shot(F, `${i} Filter - ${t.replace(/ \(\d+\)/, '')}`);
}
