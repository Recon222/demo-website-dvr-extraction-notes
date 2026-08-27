import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

// Structural guard for the demo's font loading (P1.1, matrix G10). jsdom loads no CSS,
// so — like backdrop.test.ts — the source IS the invariant. Share Tech Mono + JetBrains
// Mono are self-hosted by next/font in app/layout.tsx (vars --font-stmono / --font-jbmono
// on <body>); nothing in the demo may re-fetch them from Google at runtime, and every
// inline fontFamily must consume the vars — a bare "'JetBrains Mono'" stack would silently
// render system monospace now that no runtime @import loads the family.
const root = process.cwd()
const uiDir = join(root, 'features', 'demo', 'ui')
// The PDF templates inject their own <style> into the print iframe (a separate document —
// it inherits nothing from the page), so they are the natural place a Google @import could
// sneak back in. Scanned alongside demo.css (R-28).
const pdfDir = join(root, 'features', 'demo', 'engine', 'logic', 'pdf')
const css = readFileSync(join(uiDir, 'demo.css'), 'utf8')

const sources = (dir: string): Array<{ file: string; text: string }> =>
  readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !f.includes('__tests__'))
    .map((f) => ({ file: f, text: readFileSync(join(dir, f), 'utf8') }))

/** Every quoted occurrence of `family` must be preceded by `var(<varName>),` (spaces ok). */
const bareOccurrences = (text: string, family: string, varName: string): number => {
  const quoted = `'${family}'`
  const prefixRe = new RegExp(`var\\(${varName}\\),\\s*$`)
  let count = 0
  let i = text.indexOf(quoted)
  while (i !== -1) {
    if (!prefixRe.test(text.slice(0, i))) count += 1
    i = text.indexOf(quoted, i + quoted.length)
  }
  return count
}

describe('demo fonts (next/font variables, P1.1 / G10)', () => {
  it('no runtime @import — demo.css and the PDF print-iframe templates stay Google-free', () => {
    for (const { file, text } of [{ file: 'demo.css', text: css }, ...sources(pdfDir)]) {
      expect(text, `${file}: runtime @import`).not.toContain('@import url(')
      expect(text, `${file}: Google Fonts reference`).not.toContain('fonts.googleapis.com')
    }
  })

  it('every inline Share Tech Mono / JetBrains Mono stack consumes the next/font vars', () => {
    for (const { file, text } of sources(uiDir)) {
      expect(
        bareOccurrences(text, 'Share Tech Mono', '--font-stmono'),
        `${file}: 'Share Tech Mono' used without var(--font-stmono) prefix`,
      ).toBe(0)
      expect(
        bareOccurrences(text, 'JetBrains Mono', '--font-jbmono'),
        `${file}: 'JetBrains Mono' used without var(--font-jbmono) prefix`,
      ).toBe(0)
    }
  })

  it('the root layout still supplies both vars (the demo inherits them from <body>)', () => {
    const layout = readFileSync(join(root, 'app', 'layout.tsx'), 'utf8')
    expect(layout).toContain('Share_Tech_Mono(')
    expect(layout).toContain('JetBrains_Mono(')
    expect(layout).toContain('--font-stmono')
    expect(layout).toContain('--font-jbmono')
  })
})

/**
 * SEAM(U7.3) — **THE MONO POLICY** (matrix A94, decision D13, owner-ratified 2026-08-27).
 * This block IS the codification the U7.3 row asks for; there is no token module to put it in,
 * because the policy is about WHICH SURFACE may spell a face, not about the value of the stack
 * (`fonts.test.ts` above already owns the stack). A file-level scan is the only mechanism that
 * can see a policy stated per surface, and it is the same shape `controls/__tests__/banner.test.tsx`
 * uses for its adoption ledger and `glass-tokens.test.ts` for `TOKEN_MODULES`.
 *
 * ## THE RULE
 *
 *   **Share Tech Mono** (`--font-stmono`) = SCANNER / TERMINAL / HUD / OCR-CAPTION chrome.
 *   **JetBrains Mono** (`--font-jbmono`)  = EVIDENTIARY VALUES — coordinates, case numbers,
 *                                           timestamps, durations, raw OCR text, export artifact
 *                                           lines, the notes panel.
 *
 * D13, verbatim: *"keep both, and codify the split the demo already practises."*
 *
 * ## REFUTATION — this is a PORT of the phone's split, not the divergence D13/A94 call it
 *
 * A94's Delta column states *"The phone has exactly **one** mono face and it is Share Tech Mono"*
 * and *"The demo's JetBrains Mono has no phone counterpart."* Measured at `dd5551ec`, the phone
 * declares **TWO** mono roles and both are live:
 *
 *   `src/constants/Typography.ts:12`  `mono: 'monospace'`
 *   `src/constants/Typography.ts:13`  `scannerMono: 'ShareTechMono-Regular'`
 *
 * `Typography.fontFamily.mono` is spelled at **18** sites and `scannerMono` at **11**, and the
 * split they draw is the demo's, role for role:
 *
 *   scannerMono -> `BiometricScannerHUD.tsx:539,633,638,647,655` (HUD) ·
 *                  `ImportTerminalProgress.tsx:45` + `TerminalLine.tsx:21` (terminal) ·
 *                  `DashboardCaseCard.tsx:266,305` · `LocationPill.tsx:194` ·
 *                  `ExportHub.tsx:324` · `app/(tabs)/home.tsx:243`
 *   mono        -> `CoordinateDisplay.tsx:254` (coordinates) · `CameraMarker.tsx:188` ·
 *                  `LocationDetailCard.tsx:942` · `TimerCard.tsx:208,228,241` +
 *                  `LevelMeter.tsx:188,205` + `SpectrumVisualizer.tsx:382,450` +
 *                  `RecorderScreen.tsx:378` + `AudioPreview.tsx:365` (durations, levels) ·
 *                  `MediaPreview.tsx:456` · `ImportResultBody.tsx:356,414,442` ·
 *                  `ImportFlowModal.tsx:674` · `BatchResultDetails.tsx:283` ·
 *                  `CaseActionsSheet.tsx:433` · `ErrorBoundary.tsx:150` ·
 *                  **`ocr-time-capture/components/ConfirmationScreen.tsx:380`** (the raw OCR text)
 *
 * So the demo's two families are the phone's two ROLES. What actually diverges is one step
 * smaller and the phone says so itself, at `app/(tabs)/home.tsx:238-242`, verbatim: *"The only
 * mono face this app bundles. `JetBrainsMono` was never loaded - app.config.js registers
 * ShareTechMono-Regular alone and there is no useFonts call anywhere - so this label has silently
 * rendered in the platform sans its whole life (D12b)."* The phone's `mono` role therefore falls
 * through to the platform generic; the demo LOADS a real face for the same role. **That** is the
 * deliberate divergence to record — not the existence of a second family.
 *
 * D13's ruling is unaffected and stands as written. Two of its named JetBrains roles (case
 * numbers, export artifact lines) are painted `scannerMono` on the phone, so on those two the
 * demo follows D13 rather than the phone, deliberately. The rule below is D13's, by role.
 *
 * ## THE THREE LISTS, and why a bare allow-list would not have been enough
 *
 * `SCANNER_ONLY` files are wholly chrome: they must spell Share Tech Mono AND must not spell
 * JetBrains. `MIXED` files legitimately carry both, and each names the site that earns the
 * scanner face. Every other file under `ui/` must not spell Share Tech Mono at all. A one-sided
 * allow-list ("these files may use stmono") would have been green over JetBrains creeping into
 * the terminal, which is the drift direction A94 actually found (`ImportModal.tsx` had the
 * mirror of it).
 *
 * A `toEqual` over the sorted scan result is the DEAD-EXEMPTION test as well as the violation
 * test: deleting a listed file's Share Tech Mono reds this just as loudly as adding one
 * elsewhere. There is no count to edit.
 *
 * The source scan is generalisation, not the whole proof. `OcrCaptureScreen.test.tsx`'s two
 * render pins are the behavioural anchor at the one surface A94 names for carrying both faces.
 */
describe('the mono policy (A94 / D13)', () => {
  const STMONO = '--font-stmono'
  const JBMONO = '--font-jbmono'

  /** Wholly scanner/terminal/HUD. Share Tech Mono REQUIRED, JetBrains Mono FORBIDDEN. */
  const SCANNER_ONLY: Readonly<Record<string, string>> = {
    'screens/BootSequence.tsx':
      'the boot console — the phone`s scanner HUD role (BiometricScannerHUD.tsx:539+)',
    'screens/SplashScreen.tsx':
      'the simulated biometric scan HUD — phone BiometricScannerHUD.tsx:633-655',
    'screens/import/ImportTerminalProgress.tsx':
      'the live import terminal — phone ImportTerminalProgress.tsx:45 (`MONO = scannerMono`)',
    'screens/import/TerminalLine.tsx': 'one terminal log row — phone TerminalLine.tsx:21',
  }

  /**
   * Both faces, legitimately. The value is the site that earns Share Tech Mono; everything else
   * mono in the file is an evidentiary value and takes JetBrains.
   */
  const MIXED: Readonly<Record<string, string>> = {
    'StoryRail.tsx':
      'the rail`s uppercase HUD chapter labels (:42, :75). Demo-only and D12-FROZEN — it sits ' +
      'OUTSIDE the phone frame and is the Case-File site`s voice, not the app`s.',
    'screens/OcrCaptureScreen.tsx':
      'the AIM AT THE DVR CLOCK viewfinder caption (:516) — a demo-originated HUD line; the ' +
      'phone`s CameraInstructions.tsx:57-62 renders its guidance in the platform sans, so there ' +
      'is no phone mono to follow here. The raw OCR text in the same file is JetBrains, which ' +
      'IS the phone`s (ConfirmationScreen.tsx:378-381 = `Typography.fontFamily.mono`).',
  }

  const uiSources = sources(uiDir)
  const rel = (f: string) => f.split(sep).join('/')

  it('spells Share Tech Mono on exactly the scanner, terminal, HUD and OCR-caption surfaces', () => {
    const found = uiSources
      .filter(({ text }) => text.includes(STMONO))
      .map(({ file }) => rel(file))
      .sort()
    expect(
      found,
      'a Share Tech Mono site appeared or vanished — D13 rules it scanner/terminal/HUD/OCR-caption ' +
        'chrome only. Add the file to SCANNER_ONLY or MIXED with its reason, or move the site to ' +
        'JetBrains Mono if it paints an evidentiary value.',
    ).toEqual([...Object.keys(SCANNER_ONLY), ...Object.keys(MIXED)].sort())
  })

  it('keeps JetBrains Mono out of the surfaces that are wholly chrome', () => {
    for (const [file, reason] of Object.entries(SCANNER_ONLY)) {
      const entry = uiSources.find(({ file: f }) => rel(f) === file)
      // The file must still EXIST: a rename would silently empty this guard, which is the
      // failure mode a path-keyed list has and a count-keyed one does not even notice.
      expect(entry, `${file} moved — re-anchor this row (${reason})`).toBeDefined()
      expect(
        entry!.text.includes(JBMONO),
        `${file} spells JetBrains Mono: it is ${reason}, so every mono run in it is chrome`,
      ).toBe(false)
    }
  })
})
