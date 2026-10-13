let F = '05 Upload Invoice';
await go('/invoice-processing/upload', 2500);
await shot(F, '01 Upload invoice', { full: true });
F = '06 Timeline';
await go('/invoice-processing/timeline', 3000);
await shot(F, '01 Invoice timeline', { full: true });
if (await clickText('Browse', { role: 'button' })) { await shot(F, '02 Browse invoices (Cmd+K)'); await esc(); }
F = '07 Approvals';
await go('/invoice-processing/approvals', 2500);
await shot(F, '01 Approvals queue');
F = '08 Exception Workbench';
await go('/invoice-processing/exception-workbench', 2500);
await shot(F, '01 Exception workbench');
if (await openFirstRow()) { await shot(F, '02 Exception - opens linked invoice'); }
