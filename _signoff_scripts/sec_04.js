const F = '04 Invoice Detail';
const SC = [
  ['ocr-2279', 'Draft - PO Camp Service & Catering (exceptions)', true],
  ['ocr-2188', 'In review - PO Manpower (mismatches)', true],
  ['ocr-1147', 'Draft - PO Manpower'],
  ['ocr-2221', 'Draft - PO Material Local'],
  ['ocr-2260', 'Validated - PO Manpower'],
  ['ocr-2268', 'Validated - PO Camp Service & Catering'],
  ['ocr-2241', 'Validated - PO Civil Contractor'],
  ['ocr-2250', 'Validated - PO Material Import'],
  ['ocr-2276', 'Validated - PO Material Local'],
  ['ocr-2227', 'Validated - PO Logistics'],
  ['ocr-1146', 'Approved - PO Manpower'],
  ['ocr-2214', 'Validated - Non-PO'],
  ['ocr-2273', 'Approved - Non-PO'],
  ['ocr-2001', 'Rejected - Non-PO']
];
let n = 0;
for (const [id, label, deep] of SC) {
  n += 1;
  const sub = `${F}/${String(n).padStart(2, '0')} ${label}`;
  await go(`/invoice-processing/invoices/${id}`, 3500);
  await shot(sub, '01 Extract & Validate');
  await shot(sub, '02 Extract & Validate - full length', { full: true, skipIfShort: true });
  if (deep) {
    await clickTabs(sub, '03-', '.dx-extract-doc-tabs', { ms: 1200, full: true });
    await p.locator('.dx-extract-doc-tabs [role=tab]').first().click(); await settle(800);
    const mm = p.locator('.nw-filter--fail');
    if (await mm.count()) { await mm.first().click(); await sleep(600); await shot(sub, '04 N-Way validation - Mismatch filter', { full: true }); await p.locator('.nw-filter--ALL').first().click(); await sleep(400); }
    if (await clickText('Edit', { role: 'button', exact: true })) {
      await shot(sub, '05 Extraction - edit mode');
      const cancel = p.getByRole('button', { name: /cancel|discard/i }).first();
      if (await cancel.count()) { await cancel.click(); await sleep(600); } else { await go(`/invoice-processing/invoices/${id}`, 2500); }
    }
    if (await clickText('Hide document', { role: 'button' })) { await shot(sub, '06 Document hidden - wide view'); await clickText('Show document', { role: 'button' }); }
  }
  if (await clickText('Timeline', { role: 'tab', exact: true })) await shot(sub, '07 Timeline', { full: true });
}
