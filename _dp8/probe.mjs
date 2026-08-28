// DP-8 probe: is the phone frame fully in the viewport at every scroll depth?
// Run: NODE_PATH=<pw>/node_modules node probe.mjs <label>
import { chromium } from 'playwright'

const LABEL = process.argv[2] || 'run'
const URL = 'http://localhost:3009/demo'
const VIEWPORTS = [
  { name: 'tall', width: 1440, height: 900 },
  { name: 'short', width: 1440, height: 700 },
]

const rows = []

const browser = await chromium.launch()
for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  await page.goto(URL, { waitUntil: 'networkidle' })
  // Let the client-only island mount and the boot gate settle.
  await page.waitForSelector('[data-demo-root]', { timeout: 20000 })
  await page.waitForTimeout(2500)

  const docH = await page.evaluate(() => document.documentElement.scrollHeight)
  const depths = [0, Math.round((docH - vp.height) * 0.5), Math.max(0, docH - vp.height)]

  for (const y of depths) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(400)
    const m = await page.evaluate(() => {
      // The phone frame is the sticky column's PhoneFrame; find the screen node's frame ancestor.
      const screen = document.querySelector('[data-phone-screen]') || document.querySelector('[data-demo-root] > div')
      const r = screen.getBoundingClientRect()
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        height: Math.round(r.height),
        innerH: window.innerHeight,
        scrollY: Math.round(window.scrollY),
      }
    })
    // "Fully in the viewport" = the frame's box lies within [0, innerHeight].
    const fully = m.top >= -1 && m.bottom <= m.innerH + 1
    const visible = Math.max(0, Math.min(m.bottom, m.innerH) - Math.max(m.top, 0))
    const pct = m.height ? Math.round((visible / m.height) * 100) : 0
    rows.push({ vp: vp.name, innerH: m.innerH, scrollY: m.scrollY, top: m.top, bottom: m.bottom, h: m.height, visiblePct: pct, fully })
    await page.screenshot({ path: `_dp8/${LABEL}-${vp.name}-y${m.scrollY}.png` })
  }
  await page.close()
}
await browser.close()

console.log(`\n=== DP-8 ${LABEL} ===`)
for (const r of rows) {
  console.log(
    `${r.vp} innerH=${r.innerH} scrollY=${String(r.scrollY).padStart(5)} | frame top=${String(r.top).padStart(6)} bottom=${String(r.bottom).padStart(6)} h=${r.h} | visible=${String(r.visiblePct).padStart(3)}% | ${r.fully ? 'FULLY IN VIEW' : 'CLIPPED/OFFSCREEN'}`,
  )
}
const bad = rows.filter((r) => !r.fully)
console.log(`\n${bad.length === 0 ? 'PASS — fully in view at every depth' : `FAIL — ${bad.length}/${rows.length} depths not fully in view`}`)
process.exit(bad.length === 0 ? 0 : 1)
