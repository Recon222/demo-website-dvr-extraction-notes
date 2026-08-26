// 10 — P7 (Settings replica, real User Profile, real Form Customization) on the demo.
//
//   DEMO_BASE=http://localhost:3001 SHOT_DIR=<baselines>/demo/p7 node 10-p7-settings.js
//
// Category ids are shared verbatim with the phone (engine/content/settings-catalog.ts), so the
// row/pane testids are directly comparable: settings-row-<id> / settings-pane-<id>.
const { open, phone, shot, step, tab, summary } = require('./lib');
const { createCase, expandCase, addLocation, openWizard, gotoScreen } = require('./flows');

const CASE = 'OCC-2026-P7';
const LOCATION = 'P7 Settings Site';

const EXPECTED_ORDER = [
  'user-profile', 'appearance', 'media-capture', 'location', 'time-sync',
  'form-customization', 'security', 'export-security', 'cloud-sync', 'about',
];

async function safely(label, fn) {
  try { await step(label, fn); } catch (e) {
    console.log(`  (continuing past failed step: ${label}) ${e.message.split('\n')[0]}`);
  }
}

const openSettings = async (page) => {
  const p = phone(page);
  await p.getByRole('button', { name: 'Open settings' }).click();
  await p.locator('[data-testid="settings-modal"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
};

const openPane = async (page, id) => {
  const p = phone(page);
  await p.locator(`[data-testid="settings-row-${id}"]`).click();
  await page.waitForTimeout(700);
};

const backToList = async (page) => {
  const p = phone(page);
  const b = p.locator('[data-testid="settings-back-button"]');
  if (await b.count()) { await b.click(); await page.waitForTimeout(600); }
};

async function main() {
  const { browser, page } = await open({ headless: process.env.HEADED !== '1' });
  const p = phone(page);

  // ---- S1: entry + shell ---------------------------------------------------
  await safely('S1 — gear on Cases header → settings shell', async () => {
    await openSettings(page);
    await shot(page, 's1-settings-shell');
    const order = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="settings-row-"]')]
        .map(n => n.getAttribute('data-testid').replace('settings-row-', '')));
    console.log('  >> category order:', JSON.stringify(order));
    const groups = await page.evaluate(() => {
      const t = document.querySelector('[data-testid="settings-modal"]').innerText;
      return t.split('\n').filter(Boolean).slice(0, 30);
    });
    console.log('  >> shell text:', groups.join(' | '));
    const locks = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="settings-lock-"]')]
        .map(n => n.getAttribute('data-testid').replace('settings-lock-', '')));
    console.log('  >> padlocked rows:', JSON.stringify(locks));
  });

  await safely('S1 — gear on Dashboard header too', async () => {
    const close = p.locator('[data-testid="settings-close-button"]');
    if (await close.count()) { await close.click(); await page.waitForTimeout(600); }
    await tab(page, 'Dashboard');
    await openSettings(page);
    await shot(page, 's1-settings-from-dashboard');
    const close2 = p.locator('[data-testid="settings-close-button"]');
    if (await close2.count()) { await close2.click(); await page.waitForTimeout(500); }
    await tab(page, 'Cases');
  });

  // ---- S2: stub panes ------------------------------------------------------
  for (const id of ['appearance', 'time-sync', 'export-security', 'about']) {
    await safely(`S2 — pane: ${id}`, async () => {
      await openSettings(page);
      await openPane(page, id);
      await shot(page, `s2-pane-${id}`);
      const body = await page.evaluate(() => {
        const n = document.querySelector('[data-testid="settings-detail-body"]');
        return n ? n.innerText.split('\n').filter(Boolean).slice(0, 22) : [];
      });
      console.log(`  >> ${id}:`, body.join(' | ').slice(0, 700));
      await backToList(page);
      const close = p.locator('[data-testid="settings-close-button"]');
      if (await close.count()) { await close.click(); await page.waitForTimeout(400); }
    });
  }

  // ---- S3: User Profile (REAL) --------------------------------------------
  await safely('S3 — user profile: unconfigured, fields, save, preview', async () => {
    await openSettings(page);
    await openPane(page, 'user-profile');
    await shot(page, 's3-profile-unconfigured');
    const empty = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="settings-detail-body"]');
      return n ? n.innerText.split('\n').filter(Boolean).slice(0, 20) : [];
    });
    console.log('  >> profile pane (unconfigured):', empty.join(' | ').slice(0, 500));

    const edit = p.locator('[data-testid="user-profile-section-edit-button"]').first();
    if (await edit.count()) { await edit.click(); await page.waitForTimeout(700); }
    await shot(page, 's3-profile-editor-empty');

    const inputs = await page.evaluate(() =>
      [...document.querySelectorAll('input, select, textarea')]
        .filter(i => i.offsetParent !== null)
        .map(i => ({ label: i.getAttribute('aria-label'), ph: i.placeholder, tag: i.tagName })));
    console.log('  >> profile fields:', JSON.stringify(inputs));

    // Fill everything we can see.
    const vals = {
      'Full Name': 'D/Cst. Priya Raman',
      'Badge Number': '8815',
      'Rank': 'Detective Constable',
      'Unit': 'Video Forensics Unit',
      'Email': 'p.raman@peelpolice.ca',
      'Phone': '905-555-0123',
    };
    for (const [k, v] of Object.entries(vals)) {
      const f = p.getByLabel(k, { exact: true });
      if (await f.count()) await f.fill(v).catch(() => {});
    }
    await shot(page, 's3-profile-editor-filled');
    const save = p.locator('[data-testid="user-profile-save-button"]');
    if (await save.count()) { await save.click(); await page.waitForTimeout(900); }
    await shot(page, 's3-profile-configured');
    const after = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="settings-detail-body"]');
      return n ? n.innerText.split('\n').filter(Boolean).slice(0, 24) : [];
    });
    console.log('  >> profile pane (configured):', after.join(' | ').slice(0, 700));
    await backToList(page);
    const prev = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="settings-preview-user-profile"]');
      return n ? n.innerText.trim() : null;
    });
    console.log('  >> preview row now reads:', JSON.stringify(prev));
    await shot(page, 's3-preview-row-updated');
    const close = p.locator('[data-testid="settings-close-button"]');
    if (await close.count()) { await close.click(); await page.waitForTimeout(500); }
  });

  // ---- S4: Form Customization (REAL) --------------------------------------
  await safely('S4 — form customization: chips, reduction line, toggles', async () => {
    await openSettings(page);
    await openPane(page, 'form-customization');
    await shot(page, 's4-formfields-default');
    const chips = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="fc-profile-"]')]
        .map(n => ({ id: n.getAttribute('data-testid').replace('fc-profile-', ''),
                     text: n.innerText.trim(), pressed: n.getAttribute('aria-checked') || n.getAttribute('aria-pressed') })));
    console.log('  >> profile chips:', JSON.stringify(chips));
    const red = await page.evaluate(() => {
      const n = document.querySelector('[data-testid="fc-profile-reduction"]');
      return n ? n.innerText.trim() : null;
    });
    console.log('  >> reduction line:', JSON.stringify(red));
    const groups = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid^="fc-group-"]')]
        .map(n => n.getAttribute('data-testid').replace('fc-group-', '')));
    console.log('  >> toggle groups:', JSON.stringify(groups));

    for (const chip of chips.map(c => c.id)) {
      const c = p.locator(`[data-testid="fc-profile-${chip}"]`);
      if (await c.count()) {
        await c.click(); await page.waitForTimeout(700);
        const r = await page.evaluate(() => {
          const n = document.querySelector('[data-testid="fc-profile-reduction"]');
          return n ? n.innerText.trim() : null;
        });
        console.log(`  >> chip ${chip} -> reduction:`, JSON.stringify(r));
        await shot(page, `s4-profile-${chip}`);
      }
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => { console.error('DRIVER FAILED:', e.message); process.exit(1); });
