// 07 — P4 surfaces 5 & 6 in their LIVE-camera form:
//   S5  the OCR capture LANDSCAPE viewfinder with a real stream (not the permission card)
//   S6  the Time-Offset Calibration PDF, checking whether the OCR image block fills
//
// The demo's own comment (DemoExperience.previewTimeOffset) says the strip image exists
// ONLY for a live camera read — a sample commit renders no image block. This script exists
// to verify that empirically both ways: it runs LIVE first, then SAMPLE, and previews the
// PDF after each.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p4-live node 07-p4-ocr-pdf.js
const { open, phone, shot, step, summary } = require('./lib');
const { createCase, expandCase, addLocation, openWizard, gotoScreen } = require('./flows');

async function toOcr(page) {
  const p = phone(page);
  await gotoScreen(page, 'Time Offset', 'Time Offset');
  await p.getByRole('button', { name: 'Capture from DVR' }).click();
  await page.waitForTimeout(1500);
}

/** Walk the drawer to Completion and open the Time-Offset PDF. */
async function previewTimeOffsetPdf(page, tag) {
  const p = phone(page);
  await gotoScreen(page, 'Completion', 'Completion & Review').catch(async () => {
    await gotoScreen(page, 'Completion', 'Completion');
  });
  const btn = p.getByRole('button', { name: 'Preview Time-Offset Calibration' });
  await btn.waitFor({ timeout: 15000 });
  await btn.click();
  await page.waitForTimeout(2500);
  await shot(page, tag, { full: true });
  // Does the rendered PDF actually carry an <img> evidence block?
  const info = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'))
      .filter((i) => (i.getAttribute('src') || '').startsWith('data:image'));
    const titles = Array.from(document.querySelectorAll('.image-evidence-title')).map((n) => n.textContent);
    const html = document.body.innerHTML;
    return {
      dataImgCount: imgs.length,
      evidenceTitles: titles,
      hasCapturedDvrDisplay: html.includes('Captured DVR Display'),
    };
  });
  console.log(`  >> PDF check [${tag}]:`, JSON.stringify(info));
  const close = p.getByRole('button', { name: /Close|Done|✕/i }).first();
  if (await close.count()) { await close.click(); await page.waitForTimeout(800); }
  return info;
}

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  // ---------------- LIVE camera run ----------------
  await step('setup A (live): case + location + wizard', async () => {
    await createCase(page, 'OCC-P4-LIVE');
    await expandCase(page, 'OCC-P4-LIVE');
    await addLocation(page, 'Live OCR Site', { city: 'Mississauga' });
    await openWizard(page, 'Live OCR Site');
  });

  await step('S5 — grant camera, capture the LANDSCAPE viewfinder live', async () => {
    await toOcr(page);
    await shot(page, 's5-ocr-permission-card');
    await p.getByRole('button', { name: 'Grant Camera Permission' }).click();
    await page.waitForTimeout(3000);
    await shot(page, 's5-ocr-viewfinder-LIVE-landscape');
    const cap = p.getByRole('button', { name: /^Capture$/i }).first();
    if (await cap.count()) {
      await cap.click();
      await page.waitForTimeout(5000);
      await shot(page, 's5-ocr-result-LIVE');
    }
  });

  await step('S6 — commit the live read, then preview the Time-Offset PDF', async () => {
    const use = p.getByRole('button', { name: /Use this|Apply|Accept|Confirm|Looks good/i }).first();
    if (await use.count()) { await use.click(); await page.waitForTimeout(1500); }
    await shot(page, 's6-time-offset-after-LIVE-ocr');
    await previewTimeOffsetPdf(page, 's6-pdf-after-LIVE-ocr');
  });

  // ---------------- SAMPLE run ----------------
  await step('setup B (sample): second location', async () => {
    await gotoScreen(page, 'Back to Cases', 'Cases').catch(() => {});
    await page.waitForTimeout(800);
    await expandCase(page, 'OCC-P4-LIVE').catch(() => {});
    await addLocation(page, 'Sample OCR Site', { city: 'Mississauga' });
    await openWizard(page, 'Sample OCR Site');
  });

  await step('S6b — sample OCR read, then preview the Time-Offset PDF', async () => {
    await toOcr(page);
    await p.getByRole('button', { name: 'Use sample DVR clock' }).click();
    await page.waitForTimeout(4000);
    await shot(page, 's6-ocr-result-SAMPLE');
    const use = p.getByRole('button', { name: /Use this|Apply|Accept|Confirm|Looks good/i }).first();
    if (await use.count()) { await use.click(); await page.waitForTimeout(1500); }
    await previewTimeOffsetPdf(page, 's6-pdf-after-SAMPLE-ocr');
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
