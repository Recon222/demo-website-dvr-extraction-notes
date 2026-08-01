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

// Camera flows (media capture, OCR capture) call getUserMedia. In plain headless
// Chromium that promise NEVER settles — the UI parks on "Opening… / Waiting for your
// browser's camera permission…" forever, and you get neither the live path nor the
// denied+sample path. These two flags give the context a synthetic camera and
// auto-accept the prompt, so the real viewfinder renders. Pass `camera: 'deny'` to
// exercise the denied/sample branch instead.
// Chromium's built-in fake device is a rolling colour pattern — the OCR surface reads
// nothing from it and honestly reports "Text recognition failed". FAKE_VIDEO_FILE points
// the fake camera at a generated .y4m showing a real DVR-style timestamp, so a LIVE OCR
// read actually succeeds. Regenerate with: ./mky4m dvrclock.y4m "2026-07-31 14:23:45"
const FAKE_VIDEO_FILE = path.resolve(__dirname, 'dvrclock.y4m');

const FAKE_MEDIA_ARGS = [
  '--use-fake-device-for-media-stream',
  '--use-fake-ui-for-media-stream',
  ...(fs.existsSync(FAKE_VIDEO_FILE)
    ? [`--use-file-for-fake-video-capture=${FAKE_VIDEO_FILE}`]
    : []),
];

async function open({ headless = true, slowMo = 0, camera = 'fake' } = {}) {
  const browser = await chromium.launch({
    headless,
    slowMo,
    args: camera === 'fake' ? FAKE_MEDIA_ARGS : [],
  });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce', // makes ScreenStage cross-slides instant
    permissions: camera === 'fake'
      ? ['camera', 'microphone', 'geolocation']
      : ['geolocation'],
    // The map needs PLOTTED locations, and the demo's address autocomplete returns nothing
    // without a Mapbox token — so coordinates can only come from "Use Current Location"
    // (GpsCaptureControl, mounted in the New Location modal). Seed a fix here and move it
    // per-location with `context.setGeolocation(...)` to lay out a cluster.
    geolocation: { latitude: 43.5890, longitude: -79.6441, accuracy: 8 },
  });
  // Headless Chromium quirk (measured, not guessed): with the fake-device flags,
  // getUserMedia({video:true}) resolves, but ANY request including audio — {video,audio}
  // or {audio} alone — NEVER SETTLES. The capture screen awaits that promise, so it parks
  // on "Opening… / Waiting for your browser's camera permission…" forever with only Cancel.
  // Serve audio from a WebAudio silent track so the live path proceeds normally.
  if (camera === 'fake') {
    await context.addInitScript(() => {
      const md = navigator.mediaDevices;
      if (!md || typeof md.getUserMedia !== 'function') return;
      const orig = md.getUserMedia.bind(md);
      md.getUserMedia = async (c) => {
        if (!c || !c.audio) return orig(c);
        const out = c.video ? await orig({ video: c.video, audio: false }) : new MediaStream();
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const dst = ctx.createMediaStreamDestination();
          const osc = ctx.createOscillator();
          osc.connect(dst);
          osc.start();
          for (const t of dst.stream.getAudioTracks()) out.addTrack(t);
        } catch { /* video-only stream is still usable */ }
        return out;
      };
    });
  }

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
