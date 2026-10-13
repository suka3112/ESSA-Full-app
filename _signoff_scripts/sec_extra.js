let F = '17 Administration - Email Templates';
await go('/email-templates', 2500);
if (await clickText('Preview Approval escalated', { role: 'button', exact: true })) { await shot(F, '03 Template preview'); await esc(); await go('/email-templates', 1500); }
if (await clickText('Edit Approval escalated', { role: 'button', exact: true })) { await shot(F, '04 Edit template'); await esc(); }
F = '18 Administration - Users & Roles';
await go('/user-management', 3000);
if (await clickText('Edit SIT Admin', { role: 'button', exact: true })) { await shot(F, '05 Edit user'); await esc(); }
