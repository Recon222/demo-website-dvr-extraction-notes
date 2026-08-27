// Reusable sub-flows shared by the individual driver scripts.
const { phone } = require('./lib');

async function createCase(page, caseNumber, extra = {}) {
  const p = phone(page);
  await p.getByRole('button', { name: 'New case', exact: true }).click();
  const dlg = p.getByRole('dialog', { name: 'New Case' });
  await dlg.waitFor();
  await dlg.getByLabel('Case Number').fill(caseNumber);
  await dlg.getByLabel('Unit').fill(extra.unit || 'Video Forensics');
  if (extra.city) await dlg.getByLabel('City').fill(extra.city);
  await dlg.getByRole('button', { name: 'Create Case' }).first().click();
  // Post-P4 the modal gates on a "Confirm Case Number" step ('…can't be changed after
  // the case is created'). It renders a SECOND Cancel/Create Case pair inside the same
  // dialog, so the confirm button is the LAST match. Harmless if the step is absent.
  await page.waitForTimeout(400);
  // NOTE: the confirm renders in an ALERT OVERLAY above a [data-alert-scrim], OUTSIDE the
  // New Case dialog — a dlg-scoped locator resolves to the button behind the scrim and the
  // click is intercepted forever. Scope to the phone frame and take the last match.
  const confirm = p.getByText('Confirm Case Number', { exact: true });
  if (await confirm.count()) {
    await p.getByRole('button', { name: 'Create Case' }).last().click();
  }
  await p.getByText(caseNumber).first().waitFor();
}

// IDEMPOTENT. The demo AUTO-EXPANDS a freshly created case, so an unconditional
// click COLLAPSES it and every downstream 'Add Location' wait times out. Only
// click when the expanded actions are absent.
async function expandCase(page, caseNumber) {
  const p = phone(page);
  const addLoc = p.getByRole('button', { name: 'Add Location' });
  if (await addLoc.count()) return;
  await p.getByRole('button', { name: new RegExp(caseNumber) }).first().click();
  await addLoc.waitFor({ timeout: 10000 });
}

async function addLocation(page, name, extra = {}) {
  const p = phone(page);
  await p.getByRole('button', { name: 'Add Location' }).click();
  const dlg = p.getByRole('dialog', { name: 'New Location' });
  await dlg.waitFor();
  // exact:true is REQUIRED — 'Location Name' also substring-matches the dialog's
  // 'Business/Location Name' field, which is a strict-mode violation.
  await dlg.getByLabel('Location Name', { exact: true }).fill(name);
  if (extra.city) await dlg.getByLabel('City').fill(extra.city);
  // The field is 'Business/Location Name' (NOT 'Business Name' — that label does not exist
  // and silently times out at 30 s on fill).
  if (extra.business) await dlg.getByLabel('Business/Location Name').fill(extra.business);
  if (extra.address) await dlg.getByLabel('Street Address').fill(extra.address);
  // Plot the location so it appears on the map. The address autocomplete yields NO
  // suggestions without a Mapbox token, so "Use Current Location" is the only way to
  // attach coordinates. Caller moves the fix via context.setGeolocation() beforehand.
  if (extra.gps) {
    const gps = p.getByRole('button', { name: /Use Current Location/i }).first();
    if (await gps.count()) {
      await gps.click();
      await p.locator('[data-testid="gps-capture-spinner"]')
        .waitFor({ state: 'detached', timeout: 20000 })
        .catch(() => {});
      await page.waitForTimeout(900);
    }
  }
  await dlg.getByRole('button', { name: 'Create Location' }).click();
  await p.getByText(name).first().waitFor();
}

async function openWizard(page, locationName) {
  const p = phone(page);
  await p.getByRole('button', { name: new RegExp(locationName) }).first().click();
  await p.getByText('Submission Details').first().waitFor({ timeout: 15000 });
}

// Jump to any wizard screen through the drawer. `drawerLabel` is the
// DRAWER_DEFS label (differs from the header on 3 screens).
async function gotoScreen(page, drawerLabel, header) {
  const p = phone(page);
  await p.getByRole('button', { name: 'Menu' }).click();
  const drawer = p.getByRole('dialog', { name: 'Navigation' });
  await drawer.waitFor();
  // Drawer items get aria-label "<label>, complete" overriding the text,
  // so match on text, not role-name.
  await drawer.getByText(drawerLabel, { exact: true }).click();
  await p.getByText(header, { exact: true }).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(400);
}

// DateTimeField = two buttons: aria-label "Set date" + "Set time".
// Opening the date sheet with an empty value auto-fills today.
async function fillDateTime(page, nth) {
  const p = phone(page);
  await p.getByRole('button', { name: 'Set date' }).nth(nth).click();
  await p.getByRole('dialog', { name: 'Select Date' }).waitFor();
  await p.getByRole('button', { name: 'Done', exact: true }).click();
  await page.waitForTimeout(350);
  await p.getByRole('button', { name: 'Set time' }).nth(nth).click();
  await p.getByRole('dialog', { name: 'Select Time' }).waitFor();
  await p.getByRole('button', { name: 'Confirm', exact: true }).click();
  await page.waitForTimeout(350);
}

/**
 * U5.3 moved the map's status chips, the proximity switch and the radius presets OFF the map
 * surface and INTO `MapFiltersSheet`. The pre-W3 testids (`status-toggle-*`,
 * `proximity-toggle-button`, `radius-preset-*`, `clear-filters-button`) no longer exist, so the
 * old `safely()` steps silently shot nothing and the AFTER sets came back 8/14 and 17/21.
 *
 * Runs `fn(isNew)` with the sheet OPEN when the new UI is present, and closes it again, so a
 * post-sheet map shot is comparable with the pre-W3 one. `isNew === false` on any build that
 * still has the loose chips — this stays backward-compatible with master.
 */
async function withMapFilters(page, fn) {
  const p = phone(page);
  const opener = p.locator('[data-testid="map-open-filters"]');
  const isNew = (await opener.count()) > 0;
  if (isNew) {
    await opener.click();
    await p.locator('[data-testid="map-filters-sheet"]').waitFor({ timeout: 8000 });
    await page.waitForTimeout(350);
  }
  const out = await fn(isNew);
  if (isNew) {
    await p.locator('[data-testid="filter-done"]').click();
    await page.waitForTimeout(700);
  }
  return out;
}

/** Is the proximity ring armed? New UI answers with the chip; old UI with the button's label. */
async function proximityArmed(page) {
  const p = phone(page);
  if (await p.locator('[data-testid="proximity-chip"]').count()) return true;
  const old = p.locator('[data-testid="proximity-toggle-button"]');
  if (!(await old.count())) return false;
  return /Deactivate/i.test((await old.getAttribute('aria-label')) || '');
}

/** Disarm proximity by whichever affordance this build has. */
async function disarmProximity(page) {
  const p = phone(page);
  if (!(await proximityArmed(page))) return;
  const chip = p.locator('[data-testid="proximity-chip-dismiss"]');
  if (await chip.count()) { await chip.click(); await page.waitForTimeout(800); return; }
  await p.locator('[data-testid="proximity-toggle-button"]').click();
  await page.waitForTimeout(800);
}

module.exports = {
  createCase, expandCase, addLocation, openWizard, gotoScreen, fillDateTime,
  withMapFilters, proximityArmed, disarmProximity,
};
