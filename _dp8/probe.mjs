// DP-8 probe. Two independent questions, because the first regression got through by only
// asking the first:
//
//   1. IN VIEW  — is the phone fully inside the viewport at every scroll depth?
//   2. INTACT   — does the screen stay inside the bezel? The bezel is the titanium shell
//                 (`[data-phone="frame"]`); the screen is `[data-phone-screen]`. If the shell is
//                 shorter than its own content the app spills past the rounded corner, which is
//                 what the DP-8 regression looked like — and the original probe could not see it,
//                 because it measured the screen alone and the screen was positioned correctly.
//
// Run from the Playwright scratch (ESM ignores NODE_PATH):
//   cd worktrees/_pw && node dp8-probe.mjs <label>
// Exit 0 = every check passed. Screenshots land beside this file and are not committed.
import { chromium } from 'playwright'

const LABEL = process.argv[2] || 'run'
const URL = process.env.DP8_URL || 'http://localhost:3009/demo'
const SHOT_DIR = process.env.DP8_SHOTS || '.'

// 900 and 700 were the original two. 820/768/740 bracket the owner's window, which sat between
// them and is where the regression showed; 560 is the shortest case that still has to hold.
const VIEWPORTS = [
  { name: 'h900', width: 1440, height: 900 },
  { name: 'h820', width: 1440, height: 820 },
  { name: 'h768', width: 1366, height: 768 },
  { name: 'h740', width: 1440, height: 740 },
  { name: 'h700', width: 1440, height: 700 },
  { name: 'h560', width: 1280, height: 560 },
]

const rows = []
const browser = await chromium.launch()

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-phone-screen]', { timeout: 20000 })
  await page.waitForTimeout(2000)

  const docH = await page.evaluate(() => document.documentElement.scrollHeight)
  const depths = [0, Math.round((docH - vp.height) * 0.5), Math.max(0, docH - vp.height)]

  for (const y of depths) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(350)
    const m = await page.evaluate(() => {
      const bezel = document.querySelector('[data-phone="frame"]').getBoundingClientRect()
      const screen = document.querySelector('[data-phone-screen]').getBoundingClientRect()
      return {
        bezel: { top: bezel.top, bottom: bezel.bottom, left: bezel.left, right: bezel.right },
        screen: { top: screen.top, bottom: screen.bottom, left: screen.left, right: screen.right },
        innerH: window.innerHeight,
        scrollY: Math.round(window.scrollY),
      }
    })
    const T = 1 // sub-pixel tolerance
    // INTACT: the screen must sit inside the shell on all four sides.
    const spill = Math.round(m.screen.bottom - m.bezel.bottom)
    const intact =
      m.screen.top >= m.bezel.top - T &&
      m.screen.bottom <= m.bezel.bottom + T &&
      m.screen.left >= m.bezel.left - T &&
      m.screen.right <= m.bezel.right + T
    // IN VIEW: the whole shell inside the viewport.
    const inView = m.bezel.top >= -T && m.bezel.bottom <= m.innerH + T

    rows.push({
      vp: vp.name,
      innerH: m.innerH,
      scrollY: m.scrollY,
      bezelTop: Math.round(m.bezel.top),
      bezelBottom: Math.round(m.bezel.bottom),
      spill,
      intact,
      inView,
    })
    await page.screenshot({ path: `${SHOT_DIR}/${LABEL}-${vp.name}-y${m.scrollY}.png` })
  }
  await page.close()
}
await browser.close()

console.log(`\n=== DP-8 ${LABEL} ===`)
for (const r of rows) {
  console.log(
    `${r.vp} scrollY=${String(r.scrollY).padStart(5)} | bezel ${String(r.bezelTop).padStart(5)}..${String(r.bezelBottom).padStart(5)} | screen spills ${String(r.spill).padStart(4)}px past bezel | ${r.intact ? 'INTACT ' : 'SPILLED'} | ${r.inView ? 'IN VIEW' : 'OUT OF VIEW'}`,
  )
}
const bad = rows.filter((r) => !r.intact || !r.inView)
console.log(
  `\n${bad.length === 0 ? `PASS — ${rows.length}/${rows.length} intact and in view` : `FAIL — ${bad.length}/${rows.length} bad (${bad.filter((b) => !b.intact).length} spilled, ${bad.filter((b) => !b.inView).length} out of view)`}`,
)
process.exit(bad.length === 0 ? 0 : 1)
