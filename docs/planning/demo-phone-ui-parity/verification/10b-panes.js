// 10b — the settings panes that actually render a `PaneGroup` value readout.
//
// WHY THIS EXISTS SEPARATELY FROM 10-p7-settings.js. That driver opens four panes — appearance,
// time-sync, export-security, about — and NONE of them shows the right-aligned value readout in
// its default state:
//
//   * time-sync's `ntpRegion` paints as a <select>, not a PaneGroup value;
//   * export-security's two (`promptMode`, `encryptionStrength`) are nested under encryption
//     switches that ship OFF, so their groups do not render at all;
//   * appearance and about have no `value=` at all.
//
// The readout PANE_VALUE_TINT's own docblock names — "the 85% beside Photo Quality" — lives in
// media-capture, which no numbered driver opens. location carries two more (`gpsAccuracyMode`,
// `gpsTimeout`). Found during the W3 fix-round re-cut (F52 moved PANE_VALUE_TINT colors.primary ->
// colors.link and the numbered set could not see the change).
//
//   DEMO_BASE=http://localhost:3007 SHOT_DIR=<captures>/10b-panes node 10b-panes.js
const { open, phone, shot, step, summary, setShotSeq } = require('./lib');

// Panes whose default state renders at least one PaneGroup `value`.
const PANES = ['media-capture', 'location'];

async function main() {
  setShotSeq(0);
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('open settings and shoot the value-readout panes', async () => {
    await p.getByRole('button', { name: 'Open settings' }).click();
    await p.locator('[data-testid="settings-modal"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);

    for (const id of PANES) {
      await p.locator(`[data-testid="settings-row-${id}"]`).click();
      await page.waitForTimeout(800);
      await shot(page, `pane-${id}`);
      const body = await page.evaluate(() => {
        const n = document.querySelector('[data-testid="settings-detail-body"]');
        return n ? n.innerText.split('\n').filter(Boolean).slice(0, 14) : [];
      });
      console.log(`  >> ${id}: ${body.join(' | ').slice(0, 400)}`);
      // A detail pane has NO close button — the nav bar swaps it for "Back to settings".
      const back = p.locator('[data-testid="settings-back-button"]');
      if (await back.count()) { await back.click(); await page.waitForTimeout(600); }
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
