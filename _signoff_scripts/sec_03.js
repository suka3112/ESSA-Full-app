const F = '03 Invoice Workbench';
await go('/invoice-processing/invoices', 3000);
await clickTabs(F, '', '.dx-page', { ms: 1500 });
await p.locator('[role=tab]').first().click(); await settle(1000);
await shot(F, '04 All invoices - full list', { full: true });
