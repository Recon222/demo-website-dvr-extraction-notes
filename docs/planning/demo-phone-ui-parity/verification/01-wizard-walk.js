// 01 — full hands-on walk: empty state -> New Case -> Add Location -> wizard 1..10.
// Screenshots every state into baselines/demo/.
const { open, phone, shot, step, tab, summary } = require('./lib');

const CASE_NUMBER = 'OCC2026-0731';
const LOCATION_NAME = 'Rear Loading Dock';

// Ordered from engine/content/screens.ts WIZARD_SCREENS. `header` is the
// WizardHeader title; `next` is the per-screen WizardNext label (NOT "Next").
const WIZARD = [
  { id: 'submission',        header: 'Submission Details',   next: 'Next: Requested Scope' },
  { id: 'requested-scope',   header: 'Requested Scope',      next: 'Continue' },
  { id: 'arrival-departure', header: 'Arrival / Departure',  next: 'Continue' },
  { id: 'time-offset',       header: 'Time Offset',          next: 'Continue' },
  { id: 'extracted-scope',   header: 'Extracted Scope',      next: 'Continue' },
  { id: 'dvr-info',          header: 'DVR Information',      next: 'Continue' },
  { id: 'cameras',           header: 'Cameras',              next: 'Continue' },
  { id: 'export-info',       header: 'Export Information',   next: 'Continue' },
  { id: 'notes',             header: 'Case Notes',           next: 'Continue' },
  { id: 'completion',        header: 'Completion & Review',  next: null },
];

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('demo entry (empty Cases screen)', async () => {
    await shot(page, 'entry-full-page', { full: true });
    await shot(page, 'cases-empty');
  });

  await step('open New Case modal', async () => {
    await p.getByRole('button', { name: 'New case', exact: true }).click();
    await p.getByRole('dialog', { name: 'New Case' }).waitFor();
    await shot(page, 'new-case-modal');
  });

  await step('fill + submit New Case', async () => {
    const dlg = p.getByRole('dialog', { name: 'New Case' });
    await dlg.getByLabel('Case Number').fill(CASE_NUMBER);
    await dlg.getByLabel('Display Name').fill('Kingsway Plaza');
    await dlg.getByLabel('Unit').fill('Video Forensics');
    // OIC / VC live inside collapsed <details> accordions.
    await dlg.getByText('Officer in Charge', { exact: true }).click();
    await dlg.getByLabel('OIC Name').fill('D/Cst. Rivera');
    await dlg.getByLabel('OIC Badge').fill('4471');
    await dlg.getByLabel('Business / Scene Name').fill('Kingsway Plaza');
    await dlg.getByLabel('City').fill('Mississauga');
    await shot(page, 'new-case-modal-filled');
    await dlg.getByRole('button', { name: 'Create Case' }).first().click();
    // Post-P4 confirm step: renders in an ALERT OVERLAY outside the dialog (see flows.js).
    await page.waitForTimeout(400);
    if (await p.getByText('Confirm Case Number', { exact: true }).count()) {
      await p.getByRole('button', { name: 'Create Case' }).last().click();
    }
    await p.getByText(CASE_NUMBER).first().waitFor();
    await shot(page, 'cases-with-case');
  });

  await step('expand case card', async () => {
    // The demo auto-expands a freshly created case — clicking again collapses it.
    const addLoc = p.getByRole('button', { name: 'Add Location' });
    if (!(await addLoc.count())) {
      await p.getByRole('button', { name: new RegExp(CASE_NUMBER) }).first().click();
      await addLoc.waitFor({ timeout: 10000 });
    }
    await shot(page, 'case-card-expanded');
  });

  await step('add a location', async () => {
    await p.getByRole('button', { name: 'Add Location' }).click();
    const dlg = p.getByRole('dialog', { name: 'New Location' });
    await dlg.waitFor();
    await shot(page, 'new-location-modal');
    await dlg.getByLabel('Location Name', { exact: true }).fill(LOCATION_NAME);
    await dlg.getByLabel('Business/Location Name').fill('Kingsway Plaza Management');
    await dlg.getByLabel('City').fill('Mississauga');
    // 'Contact Person' / 'Contact Phone' are NOT on this modal (they live on the
    // Submission wizard screen, SubmissionScreen.tsx:86-87) — fills here time out.
    await shot(page, 'new-location-modal-filled');
    await dlg.getByRole('button', { name: 'Create Location' }).click();
    await p.getByText(LOCATION_NAME).first().waitFor();
    await shot(page, 'case-card-with-location');
  });

  await step('enter the wizard via the location row', async () => {
    await p.getByRole('button', { name: new RegExp(LOCATION_NAME) }).first().click();
    await p.getByText('Submission Details').first().waitFor({ timeout: 15000 });
  });

  // Walk every wizard screen.
  for (let i = 0; i < WIZARD.length; i += 1) {
    const s = WIZARD[i];
    await step(`wizard ${i + 1}/10 — ${s.header}`, async () => {
      await p.getByText(s.header, { exact: true }).first().waitFor({ timeout: 15000 });
      await shot(page, `wizard-${String(i + 1).padStart(2, '0')}-${s.id}`);
      if (i === 0) {
        // Prove the wizard drawer (step navigator) once, from screen 1.
        await p.getByRole('button', { name: 'Menu' }).click();
        await p.getByRole('dialog', { name: 'Navigation' }).waitFor();
        await shot(page, 'wizard-drawer');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        // A couple of fields so later screens have data to echo.
        await p.getByLabel('Requester Name').fill('Sgt. A. Whitfield');
        await p.getByLabel('Requester Badge').fill('2210');
        await p.getByLabel('Requester Unit').fill('Major Crime');
      }
      if (s.next) {
        await p.getByRole('button', { name: new RegExp(`^${s.next}`) }).click();
        await page.waitForTimeout(600);
      }
    });
  }

  await step('completion — preview PDF overlay', async () => {
    const btn = p.getByRole('button', { name: /Preview \/ Export PDF/ });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(1200);
      await shot(page, 'completion-pdf-preview');
      // Without an extraction scope the preview is GATED by a 'Missing Required Fields'
      // alert whose only control is OK — so try that before the real preview's close.
      for (const name of ['Close preview', 'OK', 'Close']) {
        const b = p.getByRole('button', { name, exact: true });
        if (await b.count()) { await b.first().click(); break; }
      }
      await page.waitForTimeout(400);
    }
  });

  await step('back to Cases via tab bar', async () => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByText('Back to Cases', { exact: true }).click();
    await page.waitForTimeout(700);
    await shot(page, 'cases-after-wizard');
    await tab(page, 'Dashboard');
    await shot(page, 'dashboard');
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
