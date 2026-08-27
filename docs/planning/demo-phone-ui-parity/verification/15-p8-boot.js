// 15 — P8, the boot experience. The campaign's final surface set.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p8 node 15-p8-boot.js
//
// Runs with motion ON (`motion: 'no-preference'`) so the real beats exist — under the harness
// default (`reduce`) the gate instant-completes and there is nothing to observe.
const { open, phone, shot, step, summary, BASE } = require('./lib');
const { createCase, expandCase, addLocation } = require('./flows');

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label}) ${e.message.split('\n')[0]}`);
  }
}

const hud = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-testid="demo-boot"]');
  return b ? b.innerText.split('\n').map(s => s.trim()).filter(Boolean) : null;
});
const gateUp = (page) => page.evaluate(() => !!document.querySelector('[data-testid="demo-boot"]'));

async function main() {
  // ---------- S1 + S5: cold boot, beat by beat ----------
  const { browser, context, page } = await open({
    headless: process.env.HEADED !== '1', motion: 'no-preference', gotoDemo: false,
  });
  const p = phone(page);

  await safely('S1 — cold boot: the gate at rest (TAP TO SCAN)', async () => {
    await page.goto(`${BASE}/demo`, { waitUntil: 'domcontentloaded' });
    await p.waitFor({ timeout: 30000 });
    await page.locator('[data-testid="demo-boot"]').waitFor({ timeout: 15000 });
    await page.waitForTimeout(600);
    console.log('  >> HUD idle:', JSON.stringify(await hud(page)));
    await shot(page, 's1-boot-idle-tap-to-scan');

    // S5: the video slot is null — confirm the no-video route runs and nothing
    // references a missing asset.
    const video = await page.evaluate(() => {
      const el = document.querySelector('[data-testid="demo-boot-video"]');
      const vids = [...document.querySelectorAll('video')].map(v => ({ src: v.getAttribute('src'), currentSrc: v.currentSrc }));
      return { bootVideoEl: !!el, videoElements: vids };
    });
    console.log('  >> S5 video slot:', JSON.stringify(video));
  });

  await safely('S1 — disclosure line legibility', async () => {
    const d = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="boot-disclosure"]');
      if (!n) return null;
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      return {
        text: n.innerText.trim(),
        fontSize: cs.fontSize, color: cs.color, opacity: cs.opacity,
        letterSpacing: cs.letterSpacing,
        visible: r.width > 0 && r.height > 0,
        box: { w: Math.round(r.width), h: Math.round(r.height) },
      };
    });
    console.log('  >> disclosure:', JSON.stringify(d));
  });

  await safely('S1 — scan beat: SCANNING → AUTHORIZED → app', async () => {
    const scan = p.getByRole('button', { name: 'Run the simulated biometric scan' });
    await scan.click();
    await page.waitForTimeout(150);
    console.log('  >> HUD @150ms:', JSON.stringify(await hud(page)));
    await shot(page, 's1-boot-scanning');
    await page.waitForTimeout(400);
    console.log('  >> HUD @550ms:', JSON.stringify(await hud(page)));
    await shot(page, 's1-boot-authorized');
    await p.getByText('Cases', { exact: true }).first().waitFor({ timeout: 20000 });
    await page.waitForTimeout(500);
    console.log('  >> gate still up after landing?', await gateUp(page));
    await shot(page, 's1-app-after-boot');
  });

  // ---------- S2: returning visitor ----------
  await safely('S2 — build state, then reload: gate re-runs AND position survives', async () => {
    await createCase(page, 'OCC-2026-P8');
    await expandCase(page, 'OCC-2026-P8');
    await addLocation(page, 'Boot Site', { city: 'Mississauga' });
    // Move somewhere non-default so "restored position" is observable.
    await p.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(1200);
    const before = (await p.innerText()).split('\n').filter(Boolean).slice(0, 6);
    console.log('  >> position BEFORE reload:', JSON.stringify(before));
    await shot(page, 's2-position-before-reload');

    await page.reload({ waitUntil: 'domcontentloaded' });
    await p.waitFor({ timeout: 30000 });
    const gateAgain = await page.locator('[data-testid="demo-boot"]').count();
    console.log('  >> gate re-ran on reload?', gateAgain > 0);
    await shot(page, 's2-gate-reran-on-reload');
    const scan2 = p.getByRole('button', { name: 'Run the simulated biometric scan' });
    if (await scan2.count()) await scan2.click();
    await page.waitForTimeout(2000);
    const after = (await p.innerText()).split('\n').filter(Boolean).slice(0, 6);
    console.log('  >> position AFTER gate lifts:', JSON.stringify(after));
    console.log('  >> restored to the same screen?', JSON.stringify(before) === JSON.stringify(after));
    await shot(page, 's2-position-restored');
  });

  await browser.close();

  // ---------- S3: SKIP and Escape ----------
  for (const how of ['skip', 'escape']) {
    const s = await open({ headless: process.env.HEADED !== '1', motion: 'no-preference', gotoDemo: false });
    await safely(`S3 — ${how} lifts the gate cleanly`, async () => {
      const pg = s.page, ph = phone(pg);
      await pg.goto(`${BASE}/demo`, { waitUntil: 'domcontentloaded' });
      await ph.waitFor({ timeout: 30000 });
      await pg.locator('[data-testid="demo-boot"]').waitFor({ timeout: 15000 });
      await pg.waitForTimeout(500);
      if (how === 'skip') {
        const btn = ph.getByRole('button', { name: 'Skip the opening sequence' });
        console.log('  >> SKIP present:', await btn.count());
        await btn.click();
      } else {
        await pg.keyboard.press('Escape');
      }
      await ph.getByText('Cases', { exact: true }).first().waitFor({ timeout: 20000 });
      await pg.waitForTimeout(600);
      const st = await pg.evaluate(() => ({
        gate: !!document.querySelector('[data-testid="demo-boot"]'),
        active: document.activeElement ? {
          tag: document.activeElement.tagName,
          aria: document.activeElement.getAttribute('aria-label'),
          inPhone: !!document.activeElement.closest('[data-phone="frame"]'),
          isBody: document.activeElement === document.body,
        } : null,
      }));
      console.log(`  >> after ${how}:`, JSON.stringify(st));
      await shot(pg, `s3-${how}-lifted`);
    });
    await s.browser.close();
  }

  // ---------- S4: reduced motion ----------
  {
    const s = await open({ headless: process.env.HEADED !== '1', motion: 'reduce', gotoDemo: false });
    await safely('S4 — prefers-reduced-motion: instant complete, no sweep', async () => {
      const pg = s.page, ph = phone(pg);
      await pg.goto(`${BASE}/demo`, { waitUntil: 'domcontentloaded' });
      await ph.waitFor({ timeout: 30000 });
      // Sample fast and often: under reduce there should be no observable sweep.
      const seen = [];
      for (let i = 0; i < 12; i++) {
        seen.push(await pg.evaluate(() => {
          const b = document.querySelector('[data-testid="demo-boot"]');
          return b ? b.innerText.replace(/\s+/g, ' ').trim().slice(0, 40) : null;
        }));
        await pg.waitForTimeout(120);
      }
      console.log('  >> boot samples under reduce:', JSON.stringify(seen));
      const scan = ph.getByRole('button', { name: 'Run the simulated biometric scan' });
      if (await scan.count()) { await scan.click(); }
      await ph.getByText('Cases', { exact: true }).first().waitFor({ timeout: 20000 });
      await pg.waitForTimeout(400);
      console.log('  >> gate up after?', await pg.evaluate(() => !!document.querySelector('[data-testid="demo-boot"]')));
      await shot(pg, 's4-reduced-motion-landed');
    });
    await s.browser.close();
  }

  summary();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
