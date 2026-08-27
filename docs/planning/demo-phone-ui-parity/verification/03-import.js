// 03 — the AI import flow: picker cards -> paste step -> progress -> result.
// This is the P1 parity surface (the phone shows a live terminal here).
// Runs with no OLLAMA_API_KEY: /api/extract returns 503 NOT_CONFIGURED and the
// demo falls back to SAMPLE_EXTRACTION with an amber "Live model not
// configured — imported the sample request instead." notice.
const { open, phone, shot, step, summary, setShotSeq } = require('./lib');
const { createCase, expandCase } = require('./flows');

const CASE_NUMBER = 'OCC2026-0733';

const REQUEST_TEXT = `From: Sgt. A. Whitfield <awhitfield@peelpolice.ca>
To: Video Forensics Unit
Subject: Video recovery request - OCC2026-0733 - Kingsway Plaza

Please attend Kingsway Plaza, 1250 Kingsway Drive, Mississauga and recover
CCTV covering the assault reported on 2026-07-28.

Requesting officer: Sgt. A. Whitfield, badge 2210, Major Crime, 905-555-0199.
On-site contact: S. Okafor, property manager, 905-555-0142.

Required footage:
  - 2026-07-28 21:30 to 2026-07-28 23:15, cameras 3, 4 and 7 (rear dock)
  - 2026-07-29 00:00 to 2026-07-29 01:00, camera 1 (front entrance)

The DVR is a Hikvision DS-7616, located in the manager's office, admin/admin,
approximately 21 days retention. A monitor is available on site.`;

async function main() {
  setShotSeq(60);
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  // Slow /api/extract so the progress stage is actually observable — without
  // this the keyless 503 returns instantly and the stage flashes past.
  await page.route('**/api/extract', async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.continue();
  });

  await step('setup: a case to import into', async () => {
    await createCase(page, CASE_NUMBER);
    await expandCase(page, CASE_NUMBER);
    await shot(page, 'import-entry-case-card');
  });

  await step('open the Import modal (picker stage)', async () => {
    await p.getByRole('button', { name: 'Import', exact: true }).click();
    await p.getByRole('dialog', { name: 'Import Recovery Request' }).waitFor();
    await shot(page, 'import-picker-cards');
  });

  await step('paste step', async () => {
    await p.getByText('Paste text', { exact: true }).click();
    await p.getByLabel('Request text').waitFor();
    await shot(page, 'import-paste-empty');
    await p.getByLabel('Request text').fill(REQUEST_TEXT);
    await shot(page, 'import-paste-filled');
  });

  await step('run the extraction — capture the progress stage', async () => {
    await p.getByRole('button', { name: /Extract & import/ }).click();
    await page.waitForTimeout(600);
    await shot(page, 'import-progress-early');   // stage 1 active
    await page.waitForTimeout(1800);
    await shot(page, 'import-progress-mid');     // mid-run dwell
    await page.waitForTimeout(3500);
    await shot(page, 'import-progress-late');
  });

  await step('result stage', async () => {
    await p.getByText('Import complete', { exact: true })
      .first()
      .waitFor({ timeout: 30000 });
    await shot(page, 'import-result-top');
    // Scroll the result body so the extracted-field sections are captured.
    const body = p.getByRole('dialog', { name: 'Import Recovery Request' });
    await body.getByText('Extraction scopes', { exact: true })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await shot(page, 'import-result-scopes');
    const openLoc = p.getByRole('button', { name: 'Open location' }).first();
    if (await openLoc.count()) {
      await openLoc.scrollIntoViewIfNeeded();
      await shot(page, 'import-result-actions');
      await openLoc.click();
      await page.waitForTimeout(1200);
      await shot(page, 'import-opened-location-submission');
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
