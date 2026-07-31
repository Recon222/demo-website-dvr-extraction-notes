// Shared harness helpers for driving the DVR Extraction Notes web demo.
// Standalone: lives outside the demo repo, drives it over HTTP only.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.DEMO_BASE || 'http://localhost:3000';
const SHOT_DIR =
  process.env.SHOT_DIR ||
  path.resolve(__dirname, '..', 'baselines', 'demo');

// Viewport height >= 840 pins usePhoneScale() to exactly 1.0 so the phone
// renders 1:1 and no coordinate math is needed.
const VIEWPORT = { width: 1440, height: 1000 };

fs.mkdirSync(SHOT_DIR, { recursive: true });

let shotSeq = 0;
const shotLog = [];

async function open({ headless = true, slowMo = 0 } = {}) {
  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce', // makes ScreenStage cross-slides instant
  });
  const page = await context.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('  [browser error]', m.text());
  });
  page.on('pageerror', (e) => console.log('  [pageerror]', e.message));
  await page.goto(`${BASE}/demo`, { waitUntil: 'domcontentloaded' });
  // The demo is next/dynamic({ ssr:false }) — wait for hydration.
  await page.locator('[data-phone="frame"]').waitFor({ timeout: 30000 });
  await page.getByText('Cases', { exact: true }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(400);
  return { browser, context, page };
}

// The whole on-screen device (frame + portalled modals/sheets live inside it).
const phone = (page) => page.locator('[data-phone="frame"]');

async function shot(page, name, { full = false } = {}) {
  shotSeq += 1;
  const file = path.join(
    SHOT_DIR,
    `${String(shotSeq).padStart(2, '0')}-${name}.png`
  );
  await page.waitForTimeout(250);
  if (full) {
    await page.screenshot({ path: file, fullPage: false });
  } else {
    await phone(page).screenshot({ path: file });
  }
  shotLog.push(path.basename(file));
  console.log(`  shot  ${path.basename(file)}`);
  return file;
}

function setShotSeq(n) {
  shotSeq = n;
}

async function step(label, fn) {
  process.stdout.write(`> ${label}\n`);
  try {
    await fn();
  } catch (e) {
    console.log(`  !! FAILED: ${label}\n     ${e.message.split('\n')[0]}`);
    throw e;
  }
}

// Tab bar buttons are icon-only; aria-label is the only handle.
async function tab(page, name) {
  await phone(page).getByRole('button', { name, exact: true }).click();
  await page.waitForTimeout(500);
}

function summary() {
  console.log(`\n${shotLog.length} screenshots -> ${SHOT_DIR}`);
  return shotLog;
}

module.exports = { BASE, SHOT_DIR, VIEWPORT, open, phone, shot, step, tab, summary, setShotSeq };
