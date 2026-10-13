let F = '11 Vendors';
await go('/vendors', 2500);
await shot(F, '01 Vendor master');
if (await openFirstRow()) { await shot(F, '02 Vendor detail');
  const tabs = p.locator('.dx-page [role=tab]'); if (await tabs.count() > 1) await clickTabs(F, '05-', '.dx-page', { full: true }); }
F = '12 Purchase Orders';
await go('/purchase-order', 2500);
await shot(F, '01 Purchase orders');
if (await openFirstRow()) { await shot(F, '02 PO - opens linked invoices in workbench'); }
