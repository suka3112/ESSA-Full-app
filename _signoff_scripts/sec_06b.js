const F = '06 Timeline';
await go('/invoice-processing/timeline', 3000);
if (await clickText('Open detail', { role: 'button', ms: 4000 })) { await shot(F, '03 Open invoice detail from timeline'); }
