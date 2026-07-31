const { open, phone } = require('./lib');
const { createCase } = require('./flows');
(async () => {
  const { browser, page } = await open({ headless: true });
  const p = phone(page);
  await createCase(page, 'OCC-2026-SIM01');
  await page.waitForTimeout(600);
  console.log('--- after create ---\n' + (await p.innerText()).split('\n').filter(Boolean).slice(0,20).join(' | '));
  const btns = await p.getByRole('button').all();
  for (const b of btns.slice(0, 25)) {
    const n = ((await b.getAttribute('aria-label')) || (await b.innerText().catch(()=>''))||'').trim().replace(/\n/g,'/');
    if (n) console.log('  btn:', n.slice(0,60));
  }
  // click the case card
  await p.getByRole('button', { name: /OCC-2026-SIM01/ }).first().click();
  await page.waitForTimeout(900);
  console.log('--- after card click ---\n' + (await p.innerText()).split('\n').filter(Boolean).slice(0,25).join(' | '));
  await browser.close();
})();
