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
  await dlg.getByRole('button', { name: 'Create Case' }).click();
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
  await dlg.getByLabel('Location Name').fill(name);
  if (extra.city) await dlg.getByLabel('City').fill(extra.city);
  if (extra.business) await dlg.getByLabel('Business Name').fill(extra.business);
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

module.exports = { createCase, expandCase, addLocation, openWizard, gotoScreen, fillDateTime };
