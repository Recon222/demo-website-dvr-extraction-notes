// 04 — the Map tab: case picker, tokenless map fallback, bottom sheet.
// No NEXT_PUBLIC_MAPBOX_TOKEN in this environment, so MapCanvas renders
// [data-map-fallback] "Map preview unavailable" instead of mapbox-gl.
const { open, phone, shot, step, tab, summary, setShotSeq } = require('./lib');
const { createCase, expandCase, addLocation } = require('./flows');

const CASE_NUMBER = 'OCC2026-0734';

async function main() {
  setShotSeq(80);
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: case + two locations', async () => {
    await createCase(page, CASE_NUMBER, { city: 'Mississauga' });
    await expandCase(page, CASE_NUMBER);
    await addLocation(page, 'Front Entrance', { city: 'Mississauga', business: 'Kingsway Plaza' });
    await addLocation(page, 'Rear Loading Dock', { city: 'Mississauga' });
  });

  await step('Map tab — case picker opens non-dismissibly', async () => {
    await tab(page, 'Map');
    await p.locator('[data-testid="case-map-picker"]').waitFor({ timeout: 10000 });
    await shot(page, 'map-case-picker');
  });

  await step('pick the case — tokenless fallback + bottom sheet', async () => {
    await p.locator('[data-testid^="case-row-"]').first().click();
    await page.waitForTimeout(1200);
    await shot(page, 'map-fallback-and-sheet');
    const fallback = await p.locator('[data-map-fallback]').count();
    console.log(`  map fallback present: ${fallback > 0}`);
  });

  await step('bottom sheet — expand + location detail', async () => {
    const handle = p.locator('[data-testid="sheet-handle"]');
    if (await handle.count()) {
      const box = await handle.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y - 220, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(700);
        await shot(page, 'map-sheet-expanded');
      }
    }
    const row = p.locator('[data-testid="location-row"]').first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(700);
      await shot(page, 'map-location-detail');
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
