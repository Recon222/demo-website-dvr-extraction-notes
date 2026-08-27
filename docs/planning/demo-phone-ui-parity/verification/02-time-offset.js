// 02 — the time-offset Calculate flow (NTP sync card, offset result,
// adjusted ranges, DST switch) + the OCR launch screen.
const { open, phone, shot, step, summary, setShotSeq } = require('./lib');
const { createCase, expandCase, addLocation, openWizard, gotoScreen, fillDateTime } = require('./flows');

const CASE_NUMBER = 'OCC2026-0732';
const LOCATION_NAME = 'Time Offset Site';

async function main() {
  setShotSeq(40); // keep this script's shots in their own numeric band
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: case + location + wizard', async () => {
    await createCase(page, CASE_NUMBER);
    await expandCase(page, CASE_NUMBER);
    await addLocation(page, LOCATION_NAME, { city: 'Mississauga' });
    await openWizard(page, LOCATION_NAME);
  });

  // A requested scope gives Calculate something to adjust.
  await step('add a requested scope', async () => {
    await gotoScreen(page, 'Requested Scope', 'Requested Scope');
    await p.getByRole('button', { name: /Add Scope/ }).click();
    await page.waitForTimeout(400);
    await fillDateTime(page, 0); // Start
    await fillDateTime(page, 1); // End
    await p.getByLabel('Cameras').first().fill('3, 4, 7');
    await shot(page, 'timeoffset-requested-scope-filled');
  });

  await step('open Time Offset', async () => {
    await gotoScreen(page, 'Time Offset', 'Time Offset');
    await shot(page, 'timeoffset-empty');
  });

  await step('Use Current Time (simulated NTP sync)', async () => {
    await p.getByRole('button', { name: 'Use Current Time' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'timeoffset-syncing');       // "Synchronizing…"
    await page.waitForTimeout(1400);
    await shot(page, 'timeoffset-synced');        // "✓ Synchronized" + NTP card
  });

  await step('fill DVR time, then Calculate', async () => {
    await fillDateTime(page, 0); // DVR Date / Time
    const calc = p.getByRole('button', { name: 'Calculate', exact: true });
    if (await calc.isDisabled()) {
      await fillDateTime(page, 1); // Actual Date / Time, if sync did not fill it
    }
    await shot(page, 'timeoffset-ready-to-calculate');
    await calc.click();
    await page.waitForTimeout(900);
    await shot(page, 'timeoffset-result');
  });

  await step('scroll to adjusted ranges + DST switch', async () => {
    const dst = p.getByRole('switch', { name: 'DVR Applies DST' });
    if (await dst.count()) {
      await dst.scrollIntoViewIfNeeded();
      await shot(page, 'timeoffset-adjusted-ranges');
    }
  });

  await step('extracted scope is auto-generated from the offset', async () => {
    await gotoScreen(page, 'Extracted Video Scope', 'Extracted Scope');
    const regen = p.getByRole('button', { name: /Regenerate from offset/ });
    if (await regen.count()) {
      await regen.click();
      await page.waitForTimeout(600);
    }
    await shot(page, 'timeoffset-extracted-scope');
  });

  await step('OCR capture launch screen (Capture from DVR)', async () => {
    await gotoScreen(page, 'Time Offset', 'Time Offset');
    await p.getByRole('button', { name: 'Capture from DVR' }).click();
    await page.waitForTimeout(700);
    await shot(page, 'ocr-capture-aim');
    const sample = p.getByRole('button', { name: /Use sample DVR clock/ });
    if (await sample.count()) {
      await sample.click();
      await page.waitForTimeout(1800);
      await shot(page, 'ocr-capture-result');
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
