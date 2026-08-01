import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Structural guard for P8's production activation (review R-3).
 *
 * The whole boot sequence is delivered by ONE optional prop that the bridge deliberately defaults
 * to `false` — so the ~30 suites mounting `DemoExperience` directly don't wait out a splash, and
 * so the decision lives where the phone keeps it (`app/_layout.tsx:137`, the ROOT LAYOUT). The
 * cost of that design is that deleting the prop is silent and total: `/demo` stops booting, `tsc`
 * stays clean, and every P8 test stays green because all of them pass `boot` explicitly. The
 * review's aggregator deleted it and ran all 3451 tests: green.
 *
 * Which file mounts what, with which flag, is a *source* invariant — the same class as the
 * marketing-chrome guard (`app/(default)/__tests__/chrome-scope.test.tsx`), and asserted the same
 * way, for the same reason its own comment gives: the JSX form, never the bare word. A bare-word
 * positive would stay green on a leftover `boot` in a comment or an import line after the prop
 * itself was removed, which is the exact silent regression this exists for.
 */
const page = readFileSync(join(process.cwd(), 'app', 'demo', 'page.tsx'), 'utf8')

describe('/demo route activation', () => {
  it('mounts DemoExperience WITH the boot prop — the phase is off without it', () => {
    expect(page).toMatch(/<DemoExperience\b[^>]*\bboot\b/)
  })

  it('mounts it exactly once, so the guard above cannot be satisfied by a second render site', () => {
    expect(page.match(/<DemoExperience\b/g)).toHaveLength(1)
  })

  it('rejects the one silent variant the word-match still admits: an explicit boot={false}', () => {
    // A debugging leftover reads as satisfying the guard above while turning the phase off — the
    // exact silent regression this file exists for, wearing the right word (review S4).
    expect(page).not.toMatch(/\bboot=\{false\}/)
  })
})
