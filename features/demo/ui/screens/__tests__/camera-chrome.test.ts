import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { CAMERA_CHROME } from '@/features/demo/ui/screens/camera-chrome'

/**
 * SEAM(U7.2) guard — matrix A91, decision D17.
 *
 * Two invariants, and they are different in kind:
 *
 * 1. **Anti-re-drift, SCOPED.** The camera-native blacks and the iOS red must not reappear as
 *    literals in the two camera screens (`onCamera` is excluded — see `SWEPT`). Same mechanism as
 *    `glass-tokens.test.ts`'s banned-literal sweep but scoped to two files instead of all of
 *    `ui/`, because the values are generic: a bare 50% black is live at ten further sites under
 *    `ui/` (drop shadows, a map halo, light's `overlay`/`scrim`) and a repo-wide ban would
 *    misfile every one of them as camera re-drift. `camera-chrome.ts` is therefore NOT added to
 *    `TOKEN_MODULES` — nothing it owns is banned globally.
 * 2. **The D17 FREEZE.** The values themselves are pinned. D17's ruling is that the camera
 *    chrome does not move, and a constant nobody asserts is a constant anyone can retune.
 *
 * jsdom is irrelevant here: like `glass-tokens.test.ts` and `backdrop.test.ts`, the SOURCE is
 * the invariant.
 */

const SCREENS = ['MediaCaptureScreen.tsx', 'OcrCaptureScreen.tsx'] as const
const SCREENS_DIR = join(process.cwd(), 'features', 'demo', 'ui', 'screens')

/** Whitespace-stripped and lower-cased on BOTH sides — §4.7's case-insensitive rule, plus the
 *  demo/phone `rgba()` spacing split `glass-tokens.test.ts`'s own `norm` closes. */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

const read = (file: string): string => readFileSync(join(SCREENS_DIR, file), 'utf8')
const MODULE_SOURCE = readFileSync(join(SCREENS_DIR, 'camera-chrome.ts'), 'utf8')

/**
 * The keys the anti-re-drift sweep covers — everything except `onCamera`.
 *
 * `onCamera` is `#fff`, and unlike the blacks and the iOS red it is a GENERIC value that both
 * screens also spend on surfaces which are not over a camera feed at all: `MediaCaptureScreen`'s
 * permission stage paints its title and its row label white on the opaque shell, and that stage
 * is not a surface this package opens. Banning it here would either force a sweep outside the
 * row or report a false offender forever — the same judgement `glass-tokens.test.ts` makes for
 * `nestedCard.border` and for the generic drop-shadow blacks. The key still EXISTS so the seam
 * (`chrome/OverlayHeader.tsx`'s `cameraScrim` variant) has a name to reach for instead of
 * hardcoding white, which is what A91 is actually about.
 */
const SWEPT = (Object.keys(CAMERA_CHROME) as (keyof typeof CAMERA_CHROME)[]).filter(
  (key) => key !== 'onCamera',
)

describe('camera chrome (A91 / D17)', () => {
  it('pins the frozen values — D17 says the camera chrome does not move', () => {
    expect(CAMERA_CHROME).toEqual({
      controlScrim: 'rgba(0,0,0,0.4)',
      modePillScrim: 'rgba(0,0,0,0.5)',
      indicatorScrim: 'rgba(0,0,0,0.6)',
      guideMask: 'rgba(0,0,0,0.6)',
      controlBarFade: 'rgba(0,0,0,0.88)',
      instructionShadow: 'rgba(0,0,0,0.9)',
      onCamera: '#fff',
      recording: '#FF3B30',
    })
  })

  /**
   * `guideMask` and `indicatorScrim` are the SAME string today and are deliberately two keys,
   * for the reason `palette.ts` gives about `infoLight`/`borderLight`: they answer to different
   * phone components (`BoundingBoxOverlay` vs `RecordingIndicator`) and re-pointing one must not
   * silently move the other. The mask is also the one value that does NOT match its phone
   * counterpart's colour — see the module docblock and the U7.2 report's deferral proposal.
   */
  it('keeps the guide mask and the indicator scrim as separate keys', () => {
    expect(MODULE_SOURCE).toContain('guideMask:')
    expect(MODULE_SOURCE).toContain('indicatorScrim:')
    // Not an alias of each other: `guideMask: CAMERA_CHROME.indicatorScrim` would collapse them.
    expect(MODULE_SOURCE).not.toMatch(/^\s*(?:guideMask|indicatorScrim): CAMERA_CHROME/m)
  })

  it.each(SCREENS)('%s reaches for CAMERA_CHROME, never the raw literals', (file) => {
    const text = norm(read(file))
    const offenders = SWEPT.filter((key) => text.includes(norm(CAMERA_CHROME[key]))).map(
      (key) => `${file} re-inlines CAMERA_CHROME.${key} (${CAMERA_CHROME[key]})`,
    )
    expect(
      offenders,
      `import CAMERA_CHROME from ui/screens/camera-chrome instead:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  /**
   * POSITIVE CONTROL for the scan above. A source-text assertion that can only ever pass is the
   * anti-pattern the mutation-testing skill calls "the string-presence trap"; this proves the
   * matcher fires on the exact shape it claims to catch, in both `rgba()` spacings and both hex
   * cases, without needing a probe worktree to demonstrate it.
   */
  it('the scan actually fires — every frozen value, in every spelling a re-inline arrives in', () => {
    for (const key of SWEPT) {
      const literal = CAMERA_CHROME[key]
      const spaced = literal.replace(/,/g, ', ')
      for (const spelling of [literal, spaced, literal.toUpperCase(), literal.toLowerCase()]) {
        expect(norm(`background: '${spelling}'`)).toContain(norm(literal))
      }
    }
  })

  /**
   * A91's rider, mechanised: this is a NAMED CONSTANT BLOCK, not a theme token set. The white
   * and the red are the two values a "tidy-up" reaches for first — `#fff` looks like it should
   * be `colors.text`, `#FF3B30` looks like it should be `colors.error` — and both are wrong:
   * these surfaces are phone-camera-native, and the phone's own camera screens are still
   * hardcoded-dark with raw literals at `dd5551ec`.
   *
   * The assertion is on IMPORTS, not on the word `colors`, and deliberately so: the module's
   * docblock spells `colors.*` and `palette[...]` in prose precisely in order to forbid them,
   * so a raw-text scan would red on its own documentation. Same failure `glass-tokens.test.ts`
   * and U3.4's keep-list census both had to strip comments for; an import scan needs no stripping
   * because a constant block that resolves nothing imports nothing.
   */
  it('imports nothing — a named constant block, never a theme token set (A91)', () => {
    expect(MODULE_SOURCE).not.toMatch(/^\s*import\b/m)
  })
})
