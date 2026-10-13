const F = '02 Dashboard';
await go('/invoice-dashboard', 3000);
await shot(F, '01 Dashboard - Invoice Processing Monitor');
if (await clickText('Admin', { role: 'button' })) { await shot(F, '02 Header - user menu'); await esc(); }
