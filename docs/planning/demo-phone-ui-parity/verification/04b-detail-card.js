// 04b — the map's LocationDetailCard: tap-to-call / tap-to-email rows and the "Go to Location" CTA.
//
// WHY THIS EXISTS SEPARATELY FROM 04-map.js. 04-map.js already ends with a `map-location-detail`
// step, and it has been shooting nothing since it was written — two silent gates, both data:
//
//   1. Its two locations are added WITHOUT `gps: true`, so they carry no coordinates. The sheet
//      reports "0 Locations", no `[data-testid="location-row"]` renders, the `if (await row.count())`
//      guard is false and the step passes having captured no file.
//   2. The contact rows are gated on `item.requesterPhone` / `item.requesterEmail`, which ONLY the
//      wizard's Submission Details screen can set. A location created through the New Location
//      dialog alone never has them, so even a plotted location renders the card without its
//      one affordance for reaching a requester.
//
// So this drives the full path: case -> GPS-plotted location -> wizard -> fill Requester Phone +
// Email -> out through the drawer -> Map -> expand the sheet -> select the row. Found during the
// W3 fix-round re-cut (F52 moved these rows colors.primary -> colors.link and nothing photographed
// them at either sha).
//
//   DEMO_BASE=http://localhost:3007 SHOT_DIR=<captures>/04b-detail-card node 04b-detail-card.js
//
// Works with or without NEXT_PUBLIC_MAPBOX_TOKEN — the sheet and card are chrome over the map, so
// the tokenless [data-map-fallback] panel does not block any of it.
const { open, phone, shot, step, tab, summary, setShotSeq } = require('./lib');
const { createCase, expandCase, addLocation, openWizard } = require('./flows');

const CASE_NUMBER = 'OCC2026-0734';
const LOCATION = 'Front Entrance';

// Kingsway Plaza — the same fix 09-p56-map-depth.js anchors its cluster on.
const FIX = { latitude: 43.5890, longitude: -79.6441, accuracy: 8 };

async function main() {
  setShotSeq(90); // after 04-map.js's 80s, so a shared baseline dir stays ordered
  const { browser, context, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  await step('setup: case + one PLOTTED location', async () => {
    await createCase(page, CASE_NUMBER, { city: 'Mississauga' });
    await expandCase(page, CASE_NUMBER);
    await context.setGeolocation(FIX);
    await addLocation(page, LOCATION, { city: 'Mississauga', business: 'Kingsway Plaza', gps: true });
  });

  await step('wizard — fill Requester Phone + Email (what gates the contact rows)', async () => {
    await openWizard(page, LOCATION);
    await p.getByLabel('Requester Phone').fill('905-555-0142');
    await p.getByLabel('Requester Email').fill('d.chen@peelpolice.ca');
    await page.waitForTimeout(500);
    // The drawer is the only exit from the wizard — there is no header Back to Cases.
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 8000 });
    await page.waitForTimeout(300);
    await p.getByText('Back to Cases', { exact: true }).click();
    await page.waitForTimeout(1000);
  });

  await step('Map — pick the case, expand the sheet, open the detail card', async () => {
    await tab(page, 'Map');
    const picker = p.locator('[data-testid="case-map-picker"]');
    if (await picker.count()) {
      // The selected row's title is F52's colors.link site; its 2px border stays colors.primary.
      await shot(page, 'map-case-picker-selected');
      await p.locator('[data-testid^="case-row-"]').first().click();
    }
    await page.waitForTimeout(1500);

    const drag = async (px) => {
      const h = p.locator('[data-testid="sheet-handle"]');
      if (!(await h.count())) return;
      const b = await h.boundingBox();
      if (!b) return;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2, b.y - px, { steps: 12 });
      await page.mouse.up();
      await page.waitForTimeout(800);
    };

    await drag(260);
    const rows = p.locator('[data-testid="location-row"]');
    console.log(`  >> location rows: ${await rows.count()} (0 means the location was not plotted)`);
    await rows.first().click();
    await page.waitForTimeout(900);
    console.log(`  >> detail card present: ${(await p.locator('[data-map-detail]').count()) > 0}`);
    await shot(page, 'map-location-detail');

    // The Requester card sits low; expand fully so the two contact rows are in frame.
    await drag(300);
    await shot(page, 'map-location-detail-full');
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
