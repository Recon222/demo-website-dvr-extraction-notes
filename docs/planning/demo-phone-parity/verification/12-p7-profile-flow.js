// 12 — P7 S3 end-to-end + S4 live effects on the demo.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p7c node 12-p7-profile-flow.js
//
// Career-date note: the picker only steps by month ("Previous month"/"Next month"), and
// confirming an EMPTY date defaults to TODAY — which yields a zero span and NO duration line.
// To exercise the duration lines you must actually walk back; done here with a fast DOM click
// loop rather than 30 Playwright round-trips.
const { open, phone, shot, step, summary } = require('./lib');
const { createCase, expandCase, addLocation, gotoScreen } = require('./flows');

const CASE = 'OCC-2026-P7C';
const LOCATION = 'P7 Flow Site';

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

/** Open a career date field and pick a date `monthsBack` months before today. */
async function setCareerDate(page, testId, monthsBack) {
  const p = phone(page);
  await p.locator(`[data-testid="${testId}"] button`).first().click();
  await page.waitForTimeout(600);
  await page.evaluate((n) => {
    const prev = document.querySelector('[aria-label="Previous month"]');
    for (let i = 0; i < n; i++) prev?.click();
  }, monthsBack);
  await page.waitForTimeout(500);
  // Pick the 15th — always exists in every month.
  const day = p.getByRole('button', { name: '15', exact: true }).first();
  if (await day.count()) { await day.click(); await page.waitForTimeout(350); }
  const done = p.getByRole('button', { name: 'Done', exact: true }).first();
  if (await done.count()) { await done.click(); await page.waitForTimeout(500); }
}

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: case + location', async () => {
    await createCase(page, CASE);
    await expandCase(page, CASE);
    await addLocation(page, LOCATION, { city: 'Mississauga' });
  });

  await safely('S3 — profile: 7 fields with REAL career dates → duration lines', async () => {
    await openSettings(page);
    await openPane(page, 'user-profile');
    await p.locator('[data-testid="user-profile-section-edit-button"]').first().click();
    await page.waitForTimeout(700);
    for (const [k, v] of Object.entries({
      'Full Name': 'D/Cst. Priya Raman',
      'Badge / ID Number': '8815',
      'Current Agency': 'Peel Regional Police',
      'Unit / Section Name': 'Forensic Video Unit',
      'Qualifications & Education': 'BSc Computer Science; IAI Certified Forensic Video Technician; LEVA Level 3.',
    })) {
      const f = p.getByLabel(k, { exact: true });
      if (await f.count()) await f.fill(v); else console.log('  !! missing field', k);
    }
    await setCareerDate(page, 'profile-time-in-field', 100);   // ~8y4m in the field
    await setCareerDate(page, 'profile-time-at-agency', 40);   // ~3y4m at agency
    await shot(page, 's3-editor-all-7-fields');
    const dur = await page.evaluate(() =>
      [...document.querySelectorAll('[role="note"]')].map(n => n.getAttribute('aria-label')));
    console.log('  >> career duration lines:', JSON.stringify(dur));
    await p.locator('[data-testid="user-profile-save-button"]').click();
    await page.waitForTimeout(900);
    await shot(page, 's3-profile-configured');
    const pane = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="settings-detail-body"]');
      return n ? n.innerText.split('\n').filter(Boolean) : [];
    });
    console.log('  >> configured pane:', pane.slice(-8).join(' | '));
    const back = p.locator('[data-testid="settings-back-button"]');
    if (await back.count()) { await back.click(); await page.waitForTimeout(600); }
    const prev = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="settings-preview-user-profile"]');
      return n ? n.innerText.trim() : null;
    });
    console.log('  >> preview row:', JSON.stringify(prev));
    await shot(page, 's3-preview-row');
    await closeSettings(page);
  });

  await safely('S3 — Completion "Completed By" autofill', async () => {
    // Re-expand: the settings round-trip can leave the card collapsed.
    await expandCase(page, CASE);
    await p.getByRole('button', { name: new RegExp(LOCATION) }).first().click();
    await p.getByText('Submission Details').first().waitFor({ timeout: 15000 });
    await gotoScreen(page, 'Completion', 'Completion & Review');
    await shot(page, 's3-completion-autofill');
    const cb = await page.evaluate(() => {
      const el = [...document.querySelectorAll('input')]
        .find(i => /completed by/i.test(i.getAttribute('aria-label') || ''));
      return el ? { label: el.getAttribute('aria-label'), value: el.value } : null;
    });
    console.log('  >> Completed By:', JSON.stringify(cb));
  });

  await safely('S3 — Case Notes PDF: Completion Information section', async () => {
    const btn = p.getByRole('button', { name: /Preview \/ Export PDF/i }).first();
    if (!(await btn.count())) { console.log('  >> PDF button not found'); return; }
    await btn.click();
    await page.waitForTimeout(2800);
    await shot(page, 's3-case-notes-pdf', { full: true });
    const info = await page.evaluate(() => {
      let html = '';
      for (const f of document.querySelectorAll('iframe')) {
        try { html += f.contentDocument?.body?.innerHTML || ''; } catch {}
        html += f.getAttribute('srcdoc') || '';
      }
      const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const i = plain.search(/COMPLETION INFORMATION/i);
      return { found: i >= 0, excerpt: i >= 0 ? plain.slice(i, i + 260) : plain.slice(0, 160) };
    });
    console.log('  >> PDF completion section:', JSON.stringify(info));
    const close = p.getByRole('button', { name: /Close|Done|✕/i }).first();
    if (await close.count()) { await close.click(); await page.waitForTimeout(700); }
  });

  await safely('S4 — field toggles change the wizard live', async () => {
    await gotoScreen(page, 'Submission Details', 'Submission Details');
    const before = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> Submission BEFORE:', before.slice(1, 12).join(' | '));
    await shot(page, 's4-wizard-before');

    await openSettings(page);
    await openPane(page, 'form-customization');
    await p.locator('[data-testid="fc-group-submission"]').click();
    await page.waitForTimeout(700);
    await shot(page, 's4-submission-group');
    const offed = await page.evaluate(() => {
      const body = document.querySelector('[data-testid="fc-body-submission"]');
      if (!body) return { err: 'no body' };
      const sw = [...body.querySelectorAll('[role="switch"]')];
      const on = sw.filter(n => n.getAttribute('aria-checked') === 'true');
      const picked = on.slice(0, 3);
      picked.forEach(n => n.click());
      return { total: sw.length, on: on.length, turnedOff: picked.map(n => n.getAttribute('aria-label')) };
    });
    console.log('  >> toggles:', JSON.stringify(offed));
    await page.waitForTimeout(800);
    await shot(page, 's4-toggles-off');
    await closeSettings(page);

    await gotoScreen(page, 'Submission Details', 'Submission Details').catch(() => {});
    await page.waitForTimeout(800);
    const after = (await p.innerText()).split('\n').filter(Boolean);
    console.log('  >> Submission AFTER:', after.slice(1, 12).join(' | '));
    console.log('  >> lines GONE:', JSON.stringify(before.filter(b => !after.includes(b))));
    await shot(page, 's4-wizard-after');
  });

  await safely('S4 — Canvas profile hides a whole screen from the drawer', async () => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(400);
    const before = await page.evaluate(() => {
      const d = document.querySelector('[aria-label="Navigation"]');
      return d ? d.innerText.split('\n').filter(Boolean) : [];
    });
    console.log('  >> drawer BEFORE:', JSON.stringify(before));
    await shot(page, 's4-drawer-before');
    const closeDrawer = p.getByRole('button', { name: 'Close' }).first();
    if (await closeDrawer.count()) { await closeDrawer.click(); await page.waitForTimeout(600); }

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
    console.log('  >> REMOVED from drawer:', JSON.stringify(before.filter(b => !after.includes(b))));
    await shot(page, 's4-drawer-after');
  });

  summary();
  await browser.close();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
