// 06 — P4 surfaces (media capture, audio, media library, OCR camera, time-offset PDF)
// on the demo, for the phase-boundary side-by-side against baselines/phone/p4/.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p4 node 06-p4-media.js
//
// SHAPE-ONLY comparison — never compare field values against the phone.
// lib.js supplies a fake camera + a WebAudio shim (headless Chromium hangs forever on any
// getUserMedia that asks for audio), so the LIVE capture path renders here.
const { open, phone, shot, step, summary } = require('./lib');
const { createCase, expandCase, addLocation, openWizard, gotoScreen } = require('./flows');

const CASE_NUMBER = 'OCC-2026-P4';
const LOCATION_NAME = 'P4 Media Site';

async function openDrawer(page) {
  const p = phone(page);
  const menu = p.getByRole('button', { name: 'Menu' });
  await menu.click();
  await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(350);
}

/** Open the drawer and pick a Media accordion row, expanding the accordion if needed. */
async function mediaRow(page, ariaLabel) {
  const p = phone(page);
  await openDrawer(page);
  const row = p.getByRole('button', { name: ariaLabel });
  if (!(await row.count())) {
    await p.getByRole('button', { name: 'Media section' }).click();
    await page.waitForTimeout(350);
  }
  await row.click();
  await page.waitForTimeout(1200);
}

/** Push through the demo's "… Access Required" gate onto the live path. */
async function grantIfAsked(page) {
  const p = phone(page);
  const grant = p.getByRole('button', { name: /^Grant$/i }).first();
  if (await grant.count()) {
    await grant.click();
    await page.waitForTimeout(2500);
  }
}

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label})`);
  }
}

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: case + location + wizard', async () => {
    await createCase(page, CASE_NUMBER);
    await expandCase(page, CASE_NUMBER);
    await addLocation(page, LOCATION_NAME, { city: 'Mississauga' });
    await openWizard(page, LOCATION_NAME);
  });

  // ---- S1: drawer Media accordion ----------------------------------------
  await safely('S1 — drawer Media accordion', async () => {
    await openDrawer(page);
    await shot(page, 's1-drawer-media-collapsed');
    await p.getByRole('button', { name: 'Media section' }).click();
    await page.waitForTimeout(400);
    await p.getByRole('button', { name: 'Open camera to capture media' }).waitFor();
    await shot(page, 's1-drawer-media-expanded');
    // Close the drawer again.
    await p.getByRole('button', { name: 'Close' }).first().click().catch(() => {});
    await page.waitForTimeout(500);
  });

  // ---- S2: photo/video capture -------------------------------------------
  await safely('S2 — media capture: gate, live viewfinder + mode pill, review', async () => {
    await mediaRow(page, 'Open camera to capture media');
    await shot(page, 's2-capture-access-gate');
    await grantIfAsked(page);
    await p.getByRole('button', { name: 'Take photo' }).waitFor({ timeout: 15000 });
    await shot(page, 's2-capture-live-photo-mode');
    await p.getByRole('button', { name: 'Video mode' }).click();
    await page.waitForTimeout(700);
    await shot(page, 's2-capture-live-video-mode');
    await p.getByRole('button', { name: 'Photo mode' }).click();
    await page.waitForTimeout(500);
    await p.getByRole('button', { name: 'Take photo' }).click();
    await p.getByRole('button', { name: 'Save image' }).waitFor({ timeout: 15000 });
    await shot(page, 's2-capture-review-image');
    await p.getByRole('button', { name: 'Save image' }).click();
    await page.waitForTimeout(1500);
    await shot(page, 's2-capture-after-save');
  });

  // ---- S3: audio recorder -------------------------------------------------
  await safely('S3 — audio recorder: CRT/waveform/timer, preview', async () => {
    await mediaRow(page, 'Record audio note');
    await shot(page, 's3-audio-gate-or-idle');
    await grantIfAsked(page);
    await page.waitForTimeout(800);
    await shot(page, 's3-audio-idle');
    const rec = p.getByRole('button', { name: 'Start recording' });
    await rec.waitFor({ timeout: 15000 });
    await rec.click();
    await page.waitForTimeout(2600);
    await shot(page, 's3-audio-recording-live');   // CRT + waveform + running timer
    await p.getByRole('button', { name: 'Stop recording' }).click();
    await page.waitForTimeout(1800);
    await shot(page, 's3-audio-preview');
    const save = p.getByRole('button', { name: /Save audio|Save Audio/i }).first();
    if (await save.count()) { await save.click(); await page.waitForTimeout(1500); }
  });

  // ---- S4: media library --------------------------------------------------
  await safely('S4 — media library: tabs, rows, item info, delete confirm', async () => {
    await mediaRow(page, 'Open media library');
    await shot(page, 's4-library-tabs');
    const row = p.locator('[data-testid="media-library-content"] button').first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(900);
      await shot(page, 's4-library-item-preview-info');
    }
    const del = p.getByRole('button', { name: /Delete/i }).first();
    if (await del.count()) {
      await del.click();
      await page.waitForTimeout(800);
      await shot(page, 's4-library-delete-confirm');
      const cancel = p.getByRole('button', { name: /Cancel|Keep/i }).first();
      if (await cancel.count()) await cancel.click();
      await page.waitForTimeout(500);
    }
    const close = p.getByRole('button', { name: /^(Close|Done)$/i }).first();
    if (await close.count()) { await close.click(); await page.waitForTimeout(800); }
  });

  // ---- S5: OCR capture (LANDSCAPE viewfinder) -----------------------------
  await safely('S5 — OCR capture landscape viewfinder', async () => {
    await gotoScreen(page, 'Time Offset', 'Time Offset');
    const cap = p.getByRole('button', { name: /Capture from DVR|Scan|OCR/i }).first();
    if (await cap.count()) { await cap.click(); await page.waitForTimeout(1500); }
    await shot(page, 's5-ocr-gate-or-viewfinder');
    await grantIfAsked(page);
    await page.waitForTimeout(1200);
    await shot(page, 's5-ocr-viewfinder-landscape');
    const snap = p.getByRole('button', { name: /Capture sample frame|^Capture$/i }).first();
    if (await snap.count()) {
      await snap.click();
      await page.waitForTimeout(4000);
      await shot(page, 's5-ocr-result');
    }
  });

  // ---- S6: time-offset PDF OCR image block --------------------------------
  await safely('S6 — time-offset PDF preview (OCR image block filled)', async () => {
    const apply = p.getByRole('button', { name: /Use this|Apply|Accept|Confirm/i }).first();
    if (await apply.count()) { await apply.click(); await page.waitForTimeout(1500); }
    await shot(page, 's6-time-offset-after-ocr');
    const pdf = p.getByRole('button', { name: /Time Offset Report|Preview|PDF/i }).first();
    if (await pdf.count()) {
      await pdf.click();
      await page.waitForTimeout(3000);
      await shot(page, 's6-time-offset-pdf-preview');
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
