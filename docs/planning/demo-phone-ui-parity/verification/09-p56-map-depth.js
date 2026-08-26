// 09 — P6 map depth + P5.4 case-map export, driven against a POPULATED case with a REAL
// Mapbox map (start the server with NEXT_PUBLIC_MAPBOX_TOKEN — without it MapCanvas renders
// the `[data-map-fallback]` panel and neither clustering nor long-press exists to test).
//
//   NEXT_PUBLIC_MAPBOX_TOKEN=pk... pnpm dev --port 3001
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p56-map node 09-p56-map-depth.js
const path = require('path');
const fs = require('fs');
const { open, phone, shot, step, tab, summary } = require('./lib');
const { createCase, expandCase, addLocation } = require('./flows');

const CASE = 'OCC-2026-P6';

// Four tight (cluster) + two far (separate pins) — enough to show clustering AND to prove
// the count pill / filters move.
const LOCATIONS = [
  { name: 'Plaza North Entrance', city: 'Mississauga', business: 'Kingsway Plaza',   lat: 43.58900, lng: -79.64410 },
  { name: 'Plaza Rear Dock',      city: 'Mississauga', business: 'Kingsway Plaza',   lat: 43.58915, lng: -79.64395 },
  { name: 'Parkade Level 1',      city: 'Mississauga', business: 'Kingsway Parkade', lat: 43.58930, lng: -79.64380 },
  { name: 'Transit Shelter',      city: 'Mississauga',                               lat: 43.58945, lng: -79.64365 },
  { name: 'Corner Variety',       city: 'Mississauga', business: 'Corner Variety',   lat: 43.61600, lng: -79.61500 },
  { name: 'Gas Bar Forecourt',    city: 'Mississauga', business: 'Petro Stop',       lat: 43.63400, lng: -79.59600 },
];

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label}) ${e.message.split('\n')[0]}`);
  }
}

const countOf = async (p) => {
  const c = p.locator('[data-testid="map-location-count"]');
  return (await c.count()) ? (await c.innerText()).trim().replace(/\s+/g, ' ') : '(none)';
};

async function main() {
  const shotDir = process.env.SHOT_DIR || path.resolve(__dirname, '..', 'baselines', 'demo', 'p56-map');
  const dlDir = path.join(shotDir, 'downloads');
  fs.mkdirSync(dlDir, { recursive: true });

  const { browser, context, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  const downloads = [];
  page.on('download', async (d) => {
    const dest = path.join(dlDir, d.suggestedFilename());
    try { await d.saveAs(dest); downloads.push(dest); console.log('  download ->', d.suggestedFilename()); }
    catch (e) { console.log('  download FAILED', e.message); }
  });

  await step('setup: one case, six plotted locations', async () => {
    await createCase(page, CASE);
    await expandCase(page, CASE);
    for (const l of LOCATIONS) {
      await context.setGeolocation({ latitude: l.lat, longitude: l.lng, accuracy: 8 });
      await addLocation(page, l.name, { ...l, gps: true });
    }
  });

  await step('open the map on the populated case', async () => {
    await tab(page, 'Map');
    await page.waitForTimeout(1200);
    if (await p.locator('[data-testid="case-map-picker"]').count()) {
      // Pick the row for THIS case — the first row is not necessarily it.
      const row = p.locator('[data-testid^="case-row-"]').filter({ hasText: CASE }).first();
      await (await row.count() ? row : p.locator('[data-testid^="case-row-"]').first()).click();
    }
    // Let mapbox actually paint before shooting.
    await p.locator('[data-testid="map-loading-cover"]').waitFor({ state: 'detached', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3500);
    const fallback = await p.locator('[data-map-fallback]').count();
    console.log('  >> tokenless fallback present:', fallback > 0, '| count pill:', await countOf(p));
    await shot(page, 'map-initial-clustered');
  });

  await safely('S4 — clustering', async () => {
    const clusters = await page.evaluate(() =>
      document.querySelectorAll('[data-cluster-id], .cluster, [data-marker-id]').length);
    console.log('  >> marker/cluster elements in DOM:', clusters);
    await shot(page, 's4-clusters');
  });

  await safely('S4 — status filter', async () => {
    const st = p.locator('[data-testid="status-toggle-working"]');
    if (await st.count()) {
      await st.click(); await page.waitForTimeout(1000);
      console.log('  >> after status filter:', await countOf(p));
      await shot(page, 's4-status-filter-working');
      await st.click(); await page.waitForTimeout(800);
    }
  });

  await safely('S4 — text filter + discriminated empty states', async () => {
    const s = p.locator('[data-testid="map-search-input"]');
    await s.fill('Plaza'); await page.waitForTimeout(1000);
    console.log('  >> text filter "Plaza":', await countOf(p));
    await shot(page, 's4-text-filter-plaza');
    await s.fill('zzzznomatch'); await page.waitForTimeout(1000);
    console.log('  >> no-match text:', (await p.innerText()).split('\n').filter(Boolean).slice(-3).join(' | '));
    await shot(page, 's4-empty-no-match');
    await s.fill(''); await page.waitForTimeout(800);
    const clear = p.locator('[data-testid="clear-filters-button"]');
    if (await clear.count()) { await clear.click(); await page.waitForTimeout(800); }
    await shot(page, 's4-filters-cleared');
  });

  await safely('S4 — proximity ring + radius presets', async () => {
    await p.locator('[data-testid="proximity-toggle-button"]').click();
    await page.waitForTimeout(1200);
    console.log('  >> proximity on:', await countOf(p));
    await shot(page, 's4-proximity-on');
    for (const preset of ['1', '2', '5', '10']) {
      const b = p.locator(`[data-testid="radius-preset-${preset}"]`);
      if (await b.count()) {
        await b.click(); await page.waitForTimeout(1000);
        console.log(`  >> radius ${preset}km:`, await countOf(p));
        await shot(page, `s4-proximity-${preset}km`);
      }
    }
  });

  // ---- Surface 5: long-press placement accuracy --------------------------
  await safely('S5 — long-press on the map canvas (placement accuracy)', async () => {
    // Turn proximity OFF so the long-press is what activates it.
    const prox = p.locator('[data-testid="proximity-toggle-button"]');
    const label = await prox.getAttribute('aria-label');
    if (label && /Deactivate/i.test(label)) { await prox.click(); await page.waitForTimeout(900); }

    const canvas = p.locator('.mapboxgl-canvas-container, [data-testid="map-canvas"]').first();
    const box = await canvas.boundingBox();
    if (!box) { console.log('  >> no canvas box — map did not render'); return; }
    // A deliberate, off-centre target so a scale error would be obvious.
    const tx = box.x + box.width * 0.35;
    const ty = box.y + box.height * 0.40;
    console.log('  >> pressing at viewport', Math.round(tx), Math.round(ty), 'in box', JSON.stringify(box));

    // PRIMARY BUTTON hold, no movement — the gate is isPrimary && button===0.
    await page.mouse.move(tx, ty);
    await page.mouse.down({ button: 'left' });
    await page.waitForTimeout(1400);                 // > LONG_PRESS_MS
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(1400);
    const after = await prox.getAttribute('aria-label');
    console.log('  >> proximity aria-label after long-press:', after, '| count:', await countOf(p));
    await shot(page, 's5-after-long-press');

    // Negative control: the RIGHT button must NOT arm it (R-5 follow-up).
    if (after && /Deactivate/i.test(after)) { await prox.click(); await page.waitForTimeout(800); }
    await page.mouse.move(tx + 30, ty + 20);
    await page.mouse.down({ button: 'right' });
    await page.waitForTimeout(1400);
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(900);
    console.log('  >> after RIGHT-button hold:', await prox.getAttribute('aria-label'));
    await shot(page, 's5-after-right-button-hold');
  });

  // ---- Surface 3: case map export from the sheet footer ------------------
  await safely('S3 — Export Map download', async () => {
    await shot(page, 's3-sheet-list-mode');
    const btn = p.locator('[data-testid="export-map-button"]');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(7000);
      await shot(page, 's3-after-export');
    } else console.log('  >> export-map-button not found');
  });

  console.log('\ndownloads:', downloads.length ? downloads.join(', ') : '(none)');
  summary();
  await browser.close();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
