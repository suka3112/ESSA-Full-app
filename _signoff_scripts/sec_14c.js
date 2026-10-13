const F = '14 Administration - SLA Management';
let k = 2;
for (const t of ['Reminder Rules', 'Escalation Rules', 'Business Calendar', /Simulation/, /SLA Instances/]) {
  await go('/sla', 2000);
  const loc = p.getByText(t, typeof t === 'string' ? { exact: true } : {}).first();
  if (!(await loc.count())) { log.push('  (not found ' + t + ')'); continue }
  const label = (await loc.innerText()).trim().replace(/[\/\\]/g, '-');
  await loc.click(); await settle(1500);
  await shot(F, `01-${k} ${label}`, { full: true }); k++;
}
