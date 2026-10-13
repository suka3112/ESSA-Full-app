let F = '08 Exception Workbench';
await go('/invoice-processing/exception-workbench', 2500);
if (await openFirstRow()) { await settle(2500); await shot(F, '02 Exception - opens linked invoice'); }
F = '06 Timeline';
await go('/invoice-processing/timeline', 3000);
if (await clickText('Open detail', { role: 'button', ms: 4000 })) { await shot(F, '03 Open invoice detail from timeline'); }
