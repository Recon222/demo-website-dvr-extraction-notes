/**
 * 20-scheme-survey — one broad walk of the whole demo, in whichever scheme `SCHEME` names.
 *
 * Purpose: capture the SAME surface list in light and in dark so the two sets can be read
 * side by side. Drivers 01–15 each drill one flow deeply and several have drifted against
 * `master`; this one goes wide and shallow instead, and every step is individually survivable
 * so a stale selector costs one screenshot rather than the run.
 *
 *   SCHEME=light SHOT_DIR=<dir> DEMO_BASE=http://localhost:3009 node 20-scheme-survey.js
 *
 * `SCHEME` is read by `lib.js`'s `open()` and seeded into `sessionStorage` before the first
 * page evaluation — the demo's scheme is a once-per-load read (`tokens/palette.ts` SEAM(LM1)),
 * so this is exactly the state the Appearance switch leaves behind after its reload.
 *
 * MOTION is deliberately `no-preference`: under `reduce` the boot gate instant-completes and
 * the scan sweep never paints, and the boot gate is one of the surfaces most likely to be
 * dark-only art. The cost is that every cross-slide is real, hence the dwell timeouts.
 */
const { open, phone, shot, step, tab, summary } = require('./lib');
const F = require('./flows');

/**
 * `ONLY=<regex>` runs just the steps whose label matches — for re-cutting the tail of a run
 * without paying for the 40 shots before it. Steps that SET UP later ones (the boot gate, the
 * case, the location) have to be named in the regex too; nothing is inferred.
 */
const ONLY = process.env.ONLY ? new RegExp(process.env.ONLY, 'i') : null;

const safely = async (label, fn) => {
  if (ONLY && !ONLY.test(label)) return;
  try {
    await step(label, fn);
  } catch (e) {
    console.log(`  (skipped) ${e.message.split('\n')[0]}`);
  }
};

const openSettings = async (page) => {
  const p = phone(page);
  if (await p.locator('[data-testid="settings-modal"]').count()) return;
  await p.locator('[data-testid="header-settings-button"]').click();
  await p.locator('[data-testid="settings-modal"]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(400);
};
const closeSettings = async (page) => {
  const c = phone(page).locator('[data-testid="settings-close-button"]');
  if (await c.count()) {
    await c.click();
    await page.waitForTimeout(500);
  }
};
const backToList = async (page) => {
  const b = phone(page).locator('[data-testid="settings-back-button"]');
  if (await b.count()) {
    await b.click();
    await page.waitForTimeout(500);
  }
};

const PANES = [
  'appearance',
  'user-profile',
  'media-capture',
  'location',
  'time-sync',
  'form-customization',
  'export-security',
  'security',
  'cloud-sync',
  'about',
];

async function main() {
  const { browser, page } = await open({ motion: 'no-preference', gotoDemo: false });
  const p = phone(page);

  // ---- boot gate -----------------------------------------------------------
  await safely('boot gate (splash + scan HUD)', async () => {
    await page.goto(`${process.env.DEMO_BASE || 'http://localhost:3000'}/demo`, {
      waitUntil: 'domcontentloaded',
    });
    await p.waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    await shot(page, 'boot-gate');
    await shot(page, 'boot-gate-page', { full: true });
    const scan = p.getByRole('button', { name: 'Run the simulated biometric scan' });
    if (await scan.count()) {
      await scan.click();
      await page.waitForTimeout(900);
      await shot(page, 'boot-scan-running');
    }
    await p.getByText('Cases', { exact: true }).first().waitFor({ timeout: 30000 });
    await page.waitForTimeout(700);
  });

  // ---- shell ---------------------------------------------------------------
  await safely('cases (empty) + the page around the phone', async () => {
    await shot(page, 'cases-empty');
    await shot(page, 'page-full', { full: true });
  });

  await safely('New Case modal — top and scrolled', async () => {
    await p.getByRole('button', { name: 'New case', exact: true }).click();
    const dlg = p.getByRole('dialog', { name: 'New Case' });
    await dlg.waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shot(page, 'modal-new-case');
    await dlg.getByLabel('Case Number').fill('OCC2026-014');
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    await shot(page, 'modal-new-case-scrolled');
    const cancel = p.getByRole('button', { name: 'Cancel' }).first();
    if (await cancel.count()) await cancel.click();
    await page.waitForTimeout(500);
  });

  await safely('create a case', async () => {
    await F.createCase(page, 'OCC2026-014', { unit: 'Video Forensics', city: 'Mississauga' });
    await page.waitForTimeout(500);
    await shot(page, 'cases-with-case');
  });

  await safely('New Location modal — top and scrolled', async () => {
    await F.expandCase(page, 'OCC2026-014');
    await p.getByRole('button', { name: 'Add Location' }).click();
    const dlg = p.getByRole('dialog', { name: 'New Location' });
    await dlg.waitFor({ timeout: 10000 });
    await page.waitForTimeout(500);
    await shot(page, 'modal-new-location');
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    await shot(page, 'modal-new-location-scrolled');
    const cancel = p.getByRole('button', { name: 'Cancel' }).first();
    if (await cancel.count()) await cancel.click();
    await page.waitForTimeout(500);
  });

  await safely('add a plotted location', async () => {
    await F.expandCase(page, 'OCC2026-014');
    await F.addLocation(page, 'Northside Variety', {
      business: 'Northside Variety',
      address: '2200 Dundas St W',
      city: 'Mississauga',
      gps: true,
    });
    await page.waitForTimeout(600);
    await shot(page, 'cases-with-location');
  });

  await safely('dashboard tab', async () => {
    await tab(page, 'Dashboard');
    await page.waitForTimeout(700);
    await shot(page, 'dashboard');
  });

  await safely('map tab + bottom sheet', async () => {
    await tab(page, 'Map');
    await page.waitForTimeout(3500);
    await shot(page, 'map');
    await F.withMapFilters(page, async (isNew) => {
      if (isNew) await shot(page, 'map-filters-sheet');
    });
    await page.waitForTimeout(500);
    await shot(page, 'map-after-filters');
  });

  await safely('map location detail card', async () => {
    const row = p.getByText('Northside Variety').first();
    if (await row.count()) {
      await row.click();
      await page.waitForTimeout(1200);
      await shot(page, 'map-detail-card');
    }
  });

  // ---- settings ------------------------------------------------------------
  await safely('settings shell', async () => {
    await tab(page, 'Cases');
    await page.waitForTimeout(600);
    await openSettings(page);
    await shot(page, 'settings-shell');
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    await shot(page, 'settings-shell-scrolled');
    await page.mouse.wheel(0, -900);
    await page.waitForTimeout(300);
  });

  for (const id of PANES) {
    await safely(`settings pane: ${id}`, async () => {
      await openSettings(page);
      await p.locator(`[data-testid="settings-row-${id}"]`).click();
      await page.waitForTimeout(700);
      await shot(page, `settings-${id}`);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(350);
      await shot(page, `settings-${id}-scrolled`);
      await backToList(page);
    });
  }
  await safely('close settings', async () => closeSettings(page));

  // ---- wizard --------------------------------------------------------------
  await safely('open the wizard', async () => {
    await tab(page, 'Cases');
    await page.waitForTimeout(500);
    await F.expandCase(page, 'OCC2026-014');
    await F.openWizard(page, 'Northside Variety');
    await page.waitForTimeout(700);
    await shot(page, 'wizard-submission');
  });

  await safely('wizard drawer', async () => {
    await p.getByRole('button', { name: 'Menu' }).click();
    await p.getByRole('dialog', { name: 'Navigation' }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot(page, 'wizard-drawer');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  });

  const SCREENS = [
    ['Requested Scope', 'Requested Scope'],
    // Three drawer labels differ from their screen HEADER — `gotoScreen` waits on the header.
    ['Arrival/Departure', 'Arrival / Departure'],
    ['Time Offset', 'Time Offset'],
    ['Extracted Video Scope', 'Extracted Scope'],
    ['DVR Information', 'DVR Information'],
    ['Cameras', 'Cameras'],
    ['Export Information', 'Export Information'],
    ['Notes', 'Notes'],
    ['Completion', 'Completion'],
  ];
  for (const [label, header] of SCREENS) {
    await safely(`wizard screen: ${label}`, async () => {
      await F.gotoScreen(page, label, header);
      await page.waitForTimeout(500);
      await shot(page, `wizard-${label.replace(/[^a-z]+/gi, '-').toLowerCase()}`);
      await page.mouse.wheel(0, 700);
      await page.waitForTimeout(350);
      await shot(page, `wizard-${label.replace(/[^a-z]+/gi, '-').toLowerCase()}-scrolled`);
    });
  }

  await safely('date + time pickers', async () => {
    await F.gotoScreen(page, 'Arrival/Departure', 'Arrival / Departure');
    await p.getByRole('button', { name: 'Set date' }).first().click();
    await p.getByRole('dialog', { name: 'Select Date' }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot(page, 'picker-date');
    await p.getByRole('button', { name: 'Done', exact: true }).click();
    await page.waitForTimeout(500);
    await p.getByRole('button', { name: 'Set time' }).first().click();
    await p.getByRole('dialog', { name: 'Select Time' }).waitFor({ timeout: 10000 });
    await page.waitForTimeout(600);
    await shot(page, 'picker-time');
    await p.getByRole('button', { name: 'Confirm', exact: true }).click();
    await page.waitForTimeout(500);
  });

  await safely('OCR capture (time offset launchable)', async () => {
    await F.gotoScreen(page, 'Time Offset', 'Time Offset');
    const btn = p.getByRole('button', { name: /Scan|Capture|Camera/i }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(2500);
      await shot(page, 'ocr-capture');
      const cancel = p.getByRole('button', { name: /Cancel|Close|Back/i }).first();
      if (await cancel.count()) await cancel.click();
      await page.waitForTimeout(700);
    }
  });

  await safely('media capture + library', async () => {
    await F.gotoScreen(page, 'Cameras', 'Cameras');
    const media = p.getByRole('button', { name: /Photo|Video|Media/i }).first();
    if (await media.count()) {
      await media.click();
      await page.waitForTimeout(2000);
      await shot(page, 'media-capture');
      const cancel = p.getByRole('button', { name: /Cancel|Close|Back/i }).first();
      if (await cancel.count()) await cancel.click();
      await page.waitForTimeout(700);
    }
  });

  /**
   * The wizard HIDES the tab bar, so every remaining surface is unreachable from inside it.
   * A reload is the cheap way out and it costs nothing: the case and its location live in the
   * sessionStorage snapshot, and so does the scheme choice — both survive.
   */
  const backToShell = async () => {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await p.waitFor({ timeout: 30000 });
    // SKIP, not the scan: under `motion: 'no-preference'` the simulated scan runs its full
    // beat sequence and the shell can take many seconds to arrive. SKIP is instant and the
    // gate's own affordance.
    const skip = p.getByRole('button', { name: /^Skip/i });
    if (await skip.count()) {
      await skip.first().click();
    } else {
      const scan = p.getByRole('button', { name: 'Run the simulated biometric scan' });
      if (await scan.count()) await scan.click();
    }
    await p.getByText('Cases', { exact: true }).first().waitFor({ timeout: 45000 });
    await page.waitForTimeout(900);
  };

  await safely('import modal + terminal', async () => {
    await backToShell();
    await F.expandCase(page, 'OCC2026-014');
    await p.getByRole('button', { name: 'Import', exact: true }).first().click();
    await page.waitForTimeout(1000);
    await shot(page, 'modal-import');
    const start = p
      .getByRole('button', { name: /Sample|Run import|Start|Import request/i })
      .first();
    if (await start.count()) {
      await start.click();
      await page.waitForTimeout(2500);
      await shot(page, 'import-terminal');
      await page.waitForTimeout(5000);
      await shot(page, 'import-terminal-late');
    }
  });

  await safely('export tab + progress', async () => {
    await backToShell();
    await tab(page, 'Export');
    await page.waitForTimeout(1500);
    await shot(page, 'export-tab');
    await page.mouse.wheel(0, 700);
    await page.waitForTimeout(400);
    await shot(page, 'export-tab-scrolled');
  });

  await safely('delete confirmation dialog', async () => {
    await backToShell();
    await F.expandCase(page, 'OCC2026-014');
    const del = p.getByRole('button', { name: /^Delete/i }).first();
    if (await del.count()) {
      await del.click();
      await page.waitForTimeout(1000);
      await shot(page, 'dialog-delete-confirm');
    }
  });

  summary();
  await browser.close();
}

main().catch((e) => {
  console.log('DRIVER FAILED:', e.message);
  process.exit(1);
});
