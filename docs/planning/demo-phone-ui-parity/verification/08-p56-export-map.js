// 08 — P5 (export surfaces) + P6 (map depth) on the demo, for the phase-boundary
// side-by-side against baselines/phone/p56/.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p56 node 08-p56-export-map.js
//
// Shape-only comparison. Downloads are captured to <SHOT_DIR>/downloads.
const path = require('path');
const fs = require('fs');
const { open, phone, shot, step, tab, summary } = require('./lib');
const { createCase, expandCase, addLocation, withMapFilters } = require('./flows');

const CASE_A = 'OCC-2026-P5A';   // armed case, several locations (clustering + export)
const CASE_B = 'OCC-2026-P5B';   // a second case, so the hub shows >1 card

// Enough locations, spread tightly, to force clustering at default zoom.
const LOCATIONS = [
  { name: 'Plaza North Entrance', city: 'Mississauga', business: 'Kingsway Plaza',   lat: 43.58900, lng: -79.64410 },
  { name: 'Plaza Rear Dock',      city: 'Mississauga', business: 'Kingsway Plaza',   lat: 43.58915, lng: -79.64395 },
  { name: 'Parkade Level 1',      city: 'Mississauga', business: 'Kingsway Parkade', lat: 43.58930, lng: -79.64380 },
  { name: 'Transit Shelter',      city: 'Mississauga',                               lat: 43.58945, lng: -79.64365 },
  { name: 'Corner Variety',       city: 'Mississauga', business: 'Corner Variety',   lat: 43.59600, lng: -79.63500 },
  { name: 'Gas Bar Forecourt',    city: 'Mississauga', business: 'Petro Stop',       lat: 43.60400, lng: -79.62600 },
];

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label}) ${e.message.split('\n')[0]}`);
  }
}

async function main() {
  const shotDir = process.env.SHOT_DIR || path.resolve(__dirname, '..', 'baselines', 'demo', 'p56');
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

  // ---- Surface 1: Export tab, empty state first --------------------------
  await safely('S1 — export hub EMPTY state', async () => {
    await tab(page, 'Export');
    await shot(page, 's1-export-empty');
  });

  await safely('setup: two cases, several locations', async () => {
    await tab(page, 'Cases');
    await createCase(page, CASE_A);
    await expandCase(page, CASE_A);
    for (const l of LOCATIONS) {
      await context.setGeolocation({ latitude: l.lat, longitude: l.lng, accuracy: 8 });
      await addLocation(page, l.name, { ...l, gps: true });
    }
    await createCase(page, CASE_B);
  });

  // ---- Surface 1: hub accordion / tri-state / lit-dimmed / footer --------
  await safely('S1 — export hub: cards, accordion, tri-state, footer', async () => {
    await tab(page, 'Export');
    await shot(page, 's1-export-hub-collapsed');
    await p.getByRole('button', { name: `Case ${CASE_A}` }).click();
    await page.waitForTimeout(600);
    await shot(page, 's1-export-hub-expanded');
    // Select-all -> tri-state checked; then clear one row -> indeterminate.
    await p.getByRole('checkbox', { name: `Select all locations in ${CASE_A}` }).click();
    await page.waitForTimeout(500);
    await shot(page, 's1-tristate-all-selected-lit-footer');
    await p.getByRole('checkbox', { name: `Select ${LOCATIONS[0].name}` }).click();
    await page.waitForTimeout(500);
    const tri = await p.getByRole('checkbox', { name: `Select all locations in ${CASE_A}` })
      .getAttribute('aria-checked');
    console.log('  >> select-all aria-checked after unticking one row:', tri);
    await shot(page, 's1-tristate-indeterminate');
    // Re-arm everything for the export run.
    await p.getByRole('checkbox', { name: `Select ${LOCATIONS[0].name}` }).click();
    await page.waitForTimeout(400);
    await shot(page, 's1-footer-artifact-lines');
  });

  // ---- Surface 2: export modals -----------------------------------------
  await safely('S2 — validation prompt (all-invalid arm = Export Anyway)', async () => {
    const go = p.getByRole('button', { name: /^Export Full Case/i }).first();
    await go.click();
    await p.locator('[data-testid="export-validation-modal"]').waitFor({ timeout: 15000 });
    await shot(page, 's2-validation-prompt');
    const info = await page.evaluate(() => {
      const m = document.querySelector('[data-testid="export-validation-modal"]');
      const cont = document.querySelector('[aria-label="Continue with export"]');
      return {
        continueLabel: cont ? cont.textContent.trim() : null,
        iconAll: !!document.querySelector('[data-testid="export-validation-icon-all"]'),
        iconSome: !!document.querySelector('[data-testid="export-validation-icon-some"]'),
        invalidCount: document.querySelectorAll('[data-testid="export-invalid-locations"] li').length,
        text: m ? m.textContent.slice(0, 240) : null,
      };
    });
    console.log('  >> validation:', JSON.stringify(info));
  });

  await safely('S2 — progress overlay stages + D4 download terminal', async () => {
    await p.getByRole('button', { name: 'Continue with export' }).click();
    const overlay = p.locator('[data-testid="export-progress-overlay"]');
    await overlay.waitFor({ timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(400);
    await shot(page, 's2-progress-early');
    await page.waitForTimeout(1200);
    await shot(page, 's2-progress-mid');
    await page.waitForTimeout(1800);
    await shot(page, 's2-progress-late');
    // The D4 blocking terminal.
    await p.getByText(/Downloads Aren.t Available in the Demo/i).waitFor({ timeout: 30000 });
    await shot(page, 's2-d4-download-terminal');
    const t = await p.innerText();
    console.log('  >> terminal text:', t.split('\n').filter(Boolean).slice(-6).join(' | '));
    const done = p.getByRole('button', { name: /Close|Done|OK|Got it/i }).first();
    if (await done.count()) { await done.click(); await page.waitForTimeout(700); }
  });

  // ---- Surface 4: map depth ----------------------------------------------
  await safely('S4 — map: clustering, count pill, filters', async () => {
    await tab(page, 'Map');
    const picker = p.locator('[data-testid="case-map-picker"]');
    if (await picker.count()) {
      await p.locator('[data-testid^="case-row-"]').first().click();
      await page.waitForTimeout(1800);
    }
    await shot(page, 's4-map-initial-clusters');
    const count = p.locator('[data-testid="map-location-count"]');
    if (await count.count()) console.log('  >> count pill:', (await count.innerText()).trim());
    await shot(page, 's4-map-count-pill');
  });

  await safely('S4 — status filter + text search + clear', async () => {
    // U5.3 moved the status chips into MapFiltersSheet — see flows.withMapFilters.
    const hit = await withMapFilters(page, async (isNew) => {
      const st = p.locator(isNew
        ? '[data-testid^="filter-status-"]:not([data-testid$="-dot"])'
        : '[data-testid^="status-toggle-"]').first();
      if (!(await st.count())) return false;
      await st.click(); await page.waitForTimeout(700);
      return true;
    });
    if (hit) await shot(page, 's4-status-filter-active');
    const search = p.locator('[data-testid="map-search-input"]');
    if (await search.count()) {
      await search.fill('Plaza');
      await page.waitForTimeout(900);
      await shot(page, 's4-text-filter-plaza');
      const c = p.locator('[data-testid="map-location-count"]');
      if (await c.count()) console.log('  >> filtered count:', (await c.innerText()).trim());
      await search.fill('zzzznomatch');
      await page.waitForTimeout(900);
      await shot(page, 's4-empty-state-no-match');
      await search.fill('');
      await page.waitForTimeout(600);
    }
    const cleared = await withMapFilters(page, async (isNew) => {
      const clear = p.locator(isNew
        ? '[data-testid="filter-clear-all"]' : '[data-testid="clear-filters-button"]');
      if (!(await clear.count())) return false;
      await clear.click(); await page.waitForTimeout(700);
      return true;
    });
    if (cleared) await shot(page, 's4-filters-cleared');
  });

  await safely('S4 — proximity ring + presets, camera markers', async () => {
    const armed = await withMapFilters(page, async (isNew) => {
      const prox = p.locator(isNew
        ? '[data-testid="filter-proximity"]' : '[data-testid="proximity-toggle-button"]');
      if (!(await prox.count())) return false;
      await prox.click(); await page.waitForTimeout(900);
      return true;
    });
    if (armed) {
      await shot(page, 's4-proximity-active');
      for (const preset of ['1', '2', '5']) {
        const done = await withMapFilters(page, async (isNew) => {
          const b = p.locator(isNew
            ? `[data-testid="filter-radius-${preset}"]` : `[data-testid="radius-preset-${preset}"]`);
          if (!(await b.count())) return false;
          await b.click(); await page.waitForTimeout(700);
          return true;
        });
        if (done) { await shot(page, `s4-proximity-radius-${preset}km`); break; }
      }
    }
    const cam = p.getByRole('button', { name: /camera/i }).first();
    if (await cam.count()) { await cam.click(); await page.waitForTimeout(800); await shot(page, 's4-camera-markers-toggled'); }
  });

  // ---- Surface 3: Case Map export (real download) ------------------------
  await safely('S3 — Case Map export download from the sheet footer', async () => {
    const list = p.locator('[data-testid="export-map-button"]');
    if (!(await list.count())) {
      // The action lives in the sheet's LIST mode — raise the sheet first.
      const handle = p.locator('[data-testid="sheet-handle"]');
      if (await handle.count()) { await handle.click(); await page.waitForTimeout(900); }
    }
    await shot(page, 's3-map-sheet-list-mode');
    const btn = p.locator('[data-testid="export-map-button"]');
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(6000);
      await shot(page, 's3-after-export-map');
    } else {
      console.log('  >> Export Map button not found in list mode');
    }
  });

  console.log('\ndownloads:', downloads.length ? downloads.join(', ') : '(none)');
  summary();
  await browser.close();
}

main().catch((e) => {
  console.error('DRIVER FAILED:', e.message);
  process.exit(1);
});
