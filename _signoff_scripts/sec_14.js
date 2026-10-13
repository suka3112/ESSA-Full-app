let F = '14 Administration - SLA Management';
await go('/sla', 2500);
await shot(F, '01 SLA management', { full: true });
if (await clickText('Create SLA', { role: 'button' })) { await shot(F, '02 Create SLA'); await esc(); await go('/sla', 1500); }
if (await openFirstRow()) { await shot(F, '03 SLA detail'); await esc(); }
F = '15 Administration - Exception Codes';
await go('/exception-codes', 2500);
await shot(F, '01 Exception codes', { full: true });
F = '16 Administration - Workflows & Approval';
await go('/approval-matrix', 2500);
await shot(F, '01 Workflows & approval hierarchy');
await shot(F, '02 Workflows & approval hierarchy - full', { full: true });
F = '17 Administration - Email Templates';
await go('/email-templates', 2500);
await shot(F, '01 Email templates', { full: true });
if (await clickText('New template', { role: 'button' })) { await shot(F, '02 New template'); await esc(); await go('/email-templates', 1500); }
