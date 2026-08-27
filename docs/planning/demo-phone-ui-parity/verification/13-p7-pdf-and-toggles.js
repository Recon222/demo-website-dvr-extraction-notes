// 13 — P7 leftovers on the demo: the Case Notes PDF's Completion Information section
// (gated behind "Required Fields Missing — at least one extraction scope", so a scope is
// filled first), plus the S4 live-toggle and hidden-screen checks.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p7d node 13-p7-pdf-and-toggles.js
const { open, phone, shot, step, summary } = require('./lib');
const { createCase, expandCase, addLocation, gotoScreen, fillDateTime } = require('./flows');

const CASE = 'OCC-2026-P7D';
const LOCATION = 'P7 PDF Site';

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
// IMPORTANT: in a DETAIL pane the nav bar shows "Back to settings" and there is NO close
// button — so a close-only helper silently does nothing and the modal stays open, after
// which every later click is intercepted by [data-testid="settings-detail-body"].
// Always go back to the list first, then close.
const closeSettings = async (page) => {
  const p = phone(page);
  const back = p.locator('[data-testid="settings-back-button"]');
  if (await back.count()) { await back.click(); await page.waitForTimeout(500); }
  const c = p.locator('[data-testid="settings-close-button"]');
  if (await c.count()) { await c.click(); await page.waitForTimeout(600); }
  await p.locator('[data-testid="settings-modal"]')
    .waitFor({ state: 'detached', timeout: 8000 }).catch(() => {});
};

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: profile + case + location', async () => {
    // Profile first, so Completed By autofills.
    await openSettings(page);
    await openPane(page, 'user-profile');
    await p.locator('[data-testid="user-profile-section-edit-button"]').first().click();
    await page.waitForTimeout(700);
    await p.getByLabel('Full Name', { exact: true }).fill('D/Cst. Priya Raman');
    await p.getByLabel('Badge / ID Number', { exact: true }).fill('8815');
    await p.getByLabel('Current Agency', { exact: true }).fill('Peel Regional Police');
    await p.getByLabel('Unit / Section Name', { exact: true }).fill('Forensic Video Unit');
    await p.locator('[data-testid="user-profile-save-button"]').click();
    await page.waitForTimeout(800);
    await closeSettings(page);

    await createCase(page, CASE);
    await expandCase(page, CASE);
    await addLocation(page, LOCATION, { city: 'Mississauga' });
    await p.getByRole('button', { name: new RegExp(LOCATION) }).first().click();
    await p.getByText('Submission Details').first().waitFor({ timeout: 15000 });
  });

  await safely('setup: a requested scope (ungates the PDF)', async () => {
    await gotoScreen(page, 'Requested Scope', 'Requested Scope');
    await p.getByRole('button', { name: /Add Scope/ }).click();
    await page.waitForTimeout(500);
    await fillDateTime(page, 0);
    await fillDateTime(page, 1);
    const cams = p.getByLabel('Cameras').first();
    if (await cams.count()) await cams.fill('3, 4, 7');
    await shot(page, 'setup-scope-filled');
  });

  await safely('S3 — Case Notes PDF: Completion Information', async () => {
    await gotoScreen(page, 'Completion', 'Completion & Review');
    const cb = await page.evaluate(() => {
      const el = [...document.querySelectorAll('input')]
        .find(i => /completed by/i.test(i.getAttribute('aria-label') || ''));
      return el ? el.value : null;
    });
    console.log('  >> Completed By autofill:', JSON.stringify(cb));
    await shot(page, 's3-completion');
    await p.getByRole('button', { name: /Preview \/ Export PDF/i }).first().click();
    await page.waitForTimeout(3000);
    const info = await page.evaluate(() => {
      const f = document.querySelector('iframe');
      const html = f ? (f.getAttribute('srcdoc') || f.contentDocument?.body?.innerHTML || '') : '';
      const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const i = plain.search(/COMPLETION INFORMATION/i);
      return {
        iframes: document.querySelectorAll('iframe').length,
        htmlLen: html.length,
        found: i >= 0,
        excerpt: i >= 0 ? plain.slice(i, i + 320) : plain.slice(0, 200),
      };
    });
    console.log('  >> PDF Completion Information:', JSON.stringify(info));
    await shot(page, 's3-case-notes-pdf', { full: true });
    // The preview closes on a click OUTSIDE the iframe (PdfPreview:145) — Escape is safer.
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(800);
  });

  await safely('S4 — field toggles change the wizard live', async () => {
    await gotoScreen(page, 'Submission Details', 'Submission Details');
    const before = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> BEFORE:', before.slice(1, 13).join(' | '));
    await shot(page, 's4-wizard-before');

    await openSettings(page);
    await openPane(page, 'form-customization');
    await p.locator('[data-testid="fc-group-submission"]').click();
    await page.waitForTimeout(700);
    await shot(page, 's4-submission-group');
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
    await page.waitForTimeout(800);
    await shot(page, 's4-toggles-off');
    await closeSettings(page);

    await page.waitForTimeout(700);
    const after = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> AFTER:', after.slice(1, 13).join(' | '));
    console.log('  >> GONE:', JSON.stringify(before.filter(b => !after.includes(b))));
    await shot(page, 's4-wizard-after');
  });

  await safely('S4 — Canvas profile removes a screen from the drawer', async () => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => {
      const d = document.querySelector('[aria-label="Navigation"]');
      return d ? d.innerText.split('\n').filter(Boolean) : [];
    });
    console.log('  >> drawer BEFORE:', JSON.stringify(before));
    await shot(page, 's4-drawer-before');
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(600);

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

    await p.getByRole('button', { name: 'Menu' }).click();
    await page.waitForTimeout(900);
    const after = await page.evaluate(() => {
      const d = document.querySelector('[aria-label="Navigation"]');
      return d ? d.innerText.split('\n').filter(Boolean) : [];
    });
    console.log('  >> drawer AFTER:', JSON.stringify(after));
    console.log('  >> REMOVED:', JSON.stringify(before.filter(b => !after.includes(b))));
    await shot(page, 's4-drawer-after');
  });

  summary();
  await browser.close();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
