// 05 — the NEW P1 import experience on the demo: 3-card picker -> paste step ->
// LIVE TERMINAL (mid-run) -> terminal DWELL (outcome badge + "Review import →")
// -> result screens. Mirrors the phone capture set in baselines/phone/import/.
//
// Run against the parity-p1 worktree dev server (master lacks P1):
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/import node 05-import-p1.js
//
// With no OLLAMA_API_KEY, /api/extract returns 503 NOT_CONFIGURED and run-import.ts
// falls back to SAMPLE_EXTRACTION ("sample mode") — the terminal logs the fallback.
const { open, phone, shot, step, summary, setShotSeq } = require('./lib');
const { createCase } = require('./flows');

// The demo AUTO-EXPANDS a freshly created case (unlike the phone, where you tap the
// card). Clicking it again collapses it — so only click when the actions are hidden.
async function ensureExpanded(page, caseNumber) {
  const p = phone(page);
  const addLoc = p.getByRole('button', { name: 'Add Location' });
  if (await addLoc.count()) return;
  await p.getByRole('button', { name: new RegExp(caseNumber) }).first().click();
  await addLoc.waitFor({ timeout: 10000 });
}

const CASE_NUMBER = 'OCC-2026-SIM01';

// Same shape of request the phone run used, so the two capture sets are comparable.
const REQUEST_TEXT = `Please recover CCTV for occurrence 2026-451122. Location is Riverside Variety, 4120 Lakeshore Blvd West, Toronto. Incident occurred Tuesday March 3 2026 between 21:15 and 23:45 hours. Requested by D/Cst M. Alvarez, badge 7742, Video Services Unit.`;

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  // Hold /api/extract open so the live terminal is genuinely observable mid-run —
  // the keyless 503 otherwise returns instantly and the stage flashes past.
  await page.route('**/api/extract', async (route) => {
    await new Promise((r) => setTimeout(r, 6000));
    await route.continue();
  });

  await step('setup: a case to import into', async () => {
    await createCase(page, CASE_NUMBER);
    await ensureExpanded(page, CASE_NUMBER);
  });

  await step('open Import — 3-card picker', async () => {
    await p.getByRole('button', { name: 'Import', exact: true }).click();
    await p.getByText('Pick File', { exact: true }).waitFor({ timeout: 15000 });
    await p.getByText('Paste from Clipboard', { exact: true }).waitFor();
    await p.getByText('Paste Text', { exact: true }).waitFor();
    await shot(page, 'picker-3-cards');
  });

  await step('paste-text step', async () => {
    await p.getByText('Paste Text', { exact: true }).click();
    const input = p.getByLabel('Pasted request text');
    await input.waitFor({ timeout: 10000 });
    await shot(page, 'paste-text-empty');
    await input.fill(REQUEST_TEXT);
    await shot(page, 'paste-text-filled');
  });

  await step('run the import — capture the LIVE terminal mid-run', async () => {
    await p.getByRole('button', { name: /Import with AI/i }).click();
    await p.locator('[data-testid="import-terminal"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(900);
    await shot(page, 'terminal-midrun-init');
    await page.waitForTimeout(2600);
    await shot(page, 'terminal-midrun-progress');
    await page.waitForTimeout(2600);
    await shot(page, 'terminal-midrun-late');
  });

  await step('the DWELL — outcome badge + "Review import →"', async () => {
    const cta = p.locator('[data-testid="terminal-review-cta"]');
    await cta.waitFor({ timeout: 45000 });
    await page.waitForTimeout(700);
    await shot(page, 'terminal-dwell-review-cta');
    // Terminal persists until the CTA is tapped — prove it does not auto-advance.
    await page.waitForTimeout(2500);
    await shot(page, 'terminal-dwell-persists');
    await cta.click();
  });

  await step('result screens', async () => {
    await page.waitForTimeout(1200);
    await shot(page, 'import-result');
    const dlg = phone(page);
    for (const label of ['Recovery location', 'Extraction scopes', 'Extraction Scopes']) {
      const el = dlg.getByText(label, { exact: false }).first();
      if (await el.count()) {
        await el.scrollIntoViewIfNeeded().catch(() => {});
        break;
      }
    }
    await shot(page, 'import-result-scrolled');
    // Scroll to the bottom action row.
    await page.mouse.wheel(0, 900).catch(() => {});
    await page.waitForTimeout(500);
    await shot(page, 'import-result-actions');
  });

  summary();
  await browser.close();
}

main().catch(async (e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
