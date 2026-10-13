for (const path of ['/invoice-processing/approvals', '/invoice-processing/inbound-sharepoint', '/settings/prompt-config', '/exception-codes', '/email-templates', '/user-management', '/invoice-processing/timeline', '/purchase-order']) {
  await go(path, 2000);
  const info = await p.evaluate(() => {
    const row = document.querySelector('tbody tr');
    const rowCtl = row ? [...row.querySelectorAll('a,button,[role=button],input,[role=switch]')].map(e => e.tagName + ':' + (e.getAttribute('aria-label') || e.innerText || e.type || '').trim().slice(0, 30)) : [];
    const cards = [...document.querySelectorAll('[class*=card] button, [class*=card] a')].slice(0, 8).map(e => (e.getAttribute('aria-label') || e.innerText).trim().slice(0, 30));
    const btns = [...document.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 0).map(b => (b.getAttribute('aria-label') || b.innerText).trim().replace(/\s+/g, ' ').slice(0, 30)).filter(Boolean);
    return { rowCtl, btns: [...new Set(btns)].slice(0, 30) };
  });
  log.push(path + ' :: ROW ' + info.rowCtl.join(' | ') + ' :: BTNS ' + info.btns.join(' | '));
}
