// 14 — P7 S4: form-customization toggles changing the wizard LIVE, and the Canvas profile
// removing a whole screen from the drawer.
//
// KEY NAVIGATION FACT: the settings gear lives on the Dashboard/Cases HEADERS only — there is
// no gear inside the wizard. Every settings round-trip from the wizard must exit to Cases
// first (drawer → "Back to Cases"), change the setting, then re-enter the location.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p7e node 14-p7-toggles-live.js
const { open, phone, shot, step, summary } = require('./lib');
const { createCase, expandCase, addLocation, gotoScreen } = require('./flows');

const CASE = 'OCC-2026-P7E';
const LOCATION = 'P7 Toggle Site';

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label}) ${e.message.split('\n')[0]}`);
  }
}
const openSettings = async (page) => {
  const p = phone(page);
  await p.getByRole('button', { name: 'Open settings' }).click();
  await p.locator('[data-testid="settings-modal"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(450);
};
const openPane = async (page, id) => {
  await phone(page).locator(`[data-testid="settings-row-${id}"]`).click();
  await page.waitForTimeout(650);
};
const closeSettings = async (page) => {
  const p = phone(page);
  const back = p.locator('[data-testid="settings-back-button"]');
  if (await back.count()) { await back.click(); await page.waitForTimeout(500); }
  const c = p.locator('[data-testid="settings-close-button"]');
  if (await c.count()) { await c.click(); await page.waitForTimeout(600); }
  await p.locator('[data-testid="settings-modal"]').waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
};
/** Leave the wizard back to the Cases list (the only place with a gear). */
const exitWizard = async (page) => {
  const p = phone(page);
  await p.getByRole('button', { name: 'Menu' }).click();
  await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
  await page.waitForTimeout(300);
  await p.getByText('Back to Cases', { exact: true }).click();
  await page.waitForTimeout(1000);
};
const enterWizard = async (page) => {
  const p = phone(page);
  await expandCase(page, CASE);
  await p.getByRole('button', { name: new RegExp(LOCATION) }).first().click();
  await p.getByText('Submission Details').first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
};
const drawerItems = (page) => page.evaluate(() => {
  const d = document.querySelector('[aria-label="Navigation"]');
  return d ? d.innerText.split('\n').filter(Boolean) : [];
});

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup', async () => {
    await createCase(page, CASE);
    await expandCase(page, CASE);
    await addLocation(page, LOCATION, { city: 'Mississauga' });
    await enterWizard(page);
  });

  let before = [];
  await safely('S4a — Submission BEFORE any toggle', async () => {
    await gotoScreen(page, 'Submission Details', 'Submission Details');
    before = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> BEFORE:', before.slice(1, 14).join(' | '));
    await shot(page, 's4-wizard-before');
  });

  await safely('S4b — turn three Submission field toggles OFF', async () => {
    await exitWizard(page);
    await openSettings(page);
    await openPane(page, 'form-customization');
    await p.locator('[data-testid="fc-group-submission"]').click();
    await page.waitForTimeout(700);
    await shot(page, 's4-submission-group-open');
    const res = await page.evaluate(() => {
      const body = document.querySelector('[data-testid="fc-body-submission"]');
      if (!body) return { err: 'no fc-body-submission' };
      const sw = [...body.querySelectorAll('[role="switch"]')];
      const on = sw.filter(n => n.getAttribute('aria-checked') === 'true');
      const picked = on.slice(0, 3);
      picked.forEach(n => n.click());
      return { switches: sw.length, wereOn: on.length, turnedOff: picked.map(n => n.getAttribute('aria-label')) };
    });
    console.log('  >> toggles:', JSON.stringify(res));
    await page.waitForTimeout(700);
    await shot(page, 's4-toggles-off');
    await closeSettings(page);
  });

  await safely('S4c — Submission AFTER: the fields are gone', async () => {
    await enterWizard(page);
    await gotoScreen(page, 'Submission Details', 'Submission Details');
    const after = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> AFTER:', after.slice(1, 14).join(' | '));
    console.log('  >> GONE from the wizard:', JSON.stringify(before.filter(b => !after.includes(b))));
    await shot(page, 's4-wizard-after');
  });

  await safely('S4d — Canvas profile removes a screen from the drawer', async () => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    const dBefore = await drawerItems(page);
    console.log('  >> drawer BEFORE:', JSON.stringify(dBefore));
    await shot(page, 's4-drawer-before');
    await p.getByText('Back to Cases', { exact: true }).click();
    await page.waitForTimeout(1000);

    await openSettings(page);
    await openPane(page, 'form-customization');
    await p.locator('[data-testid="fc-profile-canvas"]').click();
    await page.waitForTimeout(900);
    const red = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="fc-profile-reduction"]');
      return n ? n.innerText.trim() : null;
    });
    console.log('  >> canvas reduction:', JSON.stringify(red));
    await shot(page, 's4-canvas-profile');
    await closeSettings(page);

    await enterWizard(page);
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(500);
    const dAfter = await drawerItems(page);
    console.log('  >> drawer AFTER:', JSON.stringify(dAfter));
    console.log('  >> REMOVED from drawer:', JSON.stringify(dBefore.filter(b => !dAfter.includes(b))));
    await shot(page, 's4-drawer-after');
  });

  summary();
  await browser.close();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
