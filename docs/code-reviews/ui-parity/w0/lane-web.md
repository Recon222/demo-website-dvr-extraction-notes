# Lane: web — W0 (phase U0), PR #39 @ 7099e54 vs master

Mode: code review. Shared worktree read at worktrees/u0-phase (read-only). Contrast arithmetic run
in the session scratchpad (WCAG 2.1 relative luminance + source-over compositing, independently
implemented and cross-checked against the U0.5 report's own published figures — onPrimary on the
two CTA stops reproduces **5.80 / 8.32** exactly, so the helper agrees with the shipped one). No
repo file was mutated; no probe worktree was cut.

Gates read, not re-run: _captures/w0/assembly-gates.log.build — /demo **107 kB** First Load, shared
**106 kB**, marketing routes unmoved. Playwright before/after captures under
_captures/w0/{before,after} (after: 6 of 10 groups present at review time).

---

## CRITICAL

None.

---

## HIGH

```
[HIGH] U0.3 re-based GLASS.accentFrom to a FILL shade, but six shipped sites spend it as a
       FOREGROUND MARK — every one falls below its WCAG floor, and the selected media tab is
       now darker than its unselected siblings
File: features/demo/ui/glass-tokens.ts:34 (the re-base) — consumers:
      features/demo/ui/screens/MediaLibrarySheet.tsx:221, :222, :240, :571
      features/demo/ui/screens/ExportModal.tsx:157
      features/demo/ui/screens/export/ExportCaseCard.tsx:127
Issue: ACCENT_FROM moved #35A0D6 -> #1F6B99 (= primaryDark). That is correct and sanctioned for the
  CTA FILL it was measured against — white ON the gradient goes 2.94 -> 5.80. But GLASS.accentFrom
  is also spent as label colour, badge colour, tab underline, selected-row rule, spinner arc and
  card outline. Those six read in the OPPOSITE direction: darkening the token darkens the mark
  against an unchanged (and, after U0.1, slightly LIGHTER) ground. The worst is the Media Library
  tab strip, where the ACTIVE tab's label is now dimmer than the inactive #7a9fc4 labels beside it
  — the selected state has become the least legible thing in the control. Nothing in the suite
  measures this direction: every accent/link-as-text row in palette-contrast.test.ts is it.todo
  pending U1.1, so the gate is green over it.
Evidence: measured, per site (old -> new, on the real composited ground):
  - MediaLibrarySheet.tsx:222  active tab label, 13px/700, on ModalShell colors.background
      **5.92 -> 2.54**   (WCAG 1.4.3 AA text = 4.5; 13px/700 is NOT large text)
  - MediaLibrarySheet.tsx:240  tab badge numeral, 10px/700, on rgba(43,140,193,0.16)
      **4.83 -> 2.05**   (1.4.3)
  - MediaLibrarySheet.tsx:221  active-tab 2px underline
      **5.92 -> 2.54**   (1.4.11 non-text = 3.0)
  - MediaLibrarySheet.tsx:571  selected-row 2px borderLeft
      **5.39 -> 2.29**   (1.4.11)
  - ExportModal.tsx:157  spinner arc vs its own track rgba(43,140,193,0.25)
      **4.79 -> 2.32**   (1.4.11) — arc-vs-ground is 6.59 -> 3.22, still over the line, but
      arc-vs-track is the signal, and under prefers-reduced-motion the ring does not rotate (the
      R-18 comment at :159-162 calls it "the only static signal that work is in flight"), so track
      separation is the ENTIRE affordance in reduced-motion mode.
  - ExportCaseCard.tsx:127  expanded-card accent outline on GLASS.gradientPanel
      **5.53 -> 2.74**   (1.4.11; expansion is also signalled by content, so this is the mildest of
      the six — listed for completeness, not as the driver)
  REPRODUCED VISUALLY, not just computed: _captures/w0/before/06-media/12-s4-library-tabs.png vs
  _captures/w0/after/06-media/12-s4-library-tabs.png. Before: "Photos" is a bright blue tab with a
  bright underline. After: "Photos" and its "1" badge are a dim navy, visibly darker than
  "Video"/"Audio", and the underline has nearly vanished into the sheet.
  The repo's own rule already names the fix: features/demo/ui/tokens/palette.ts:91-94 — "primary is
  a FILL ... Interactive labels and their 1px outlines take link; surfaces take primary."
  GLASS.accentFrom is now a shade DEEPER than primary, so the rule applies to it a fortiori. The
  PR's own foundation report (u0-foundation-implementation-report.md:71-72) caught exactly one
  member of this family — ExportCaseCard's glow, fixed with withAlpha — and then did not sweep for
  the other six.
Fix: keep GLASS.accentFrom for fills only, and re-point the six foreground uses at colors.link
  (#b8d4f0) — measured **9.60** on colors.background, **7.78** on the badge fill, **12.20** on the
  export scrim — or at colors.primaryLight (#4BA3D4, 5.24) if the design wants a saturated mark.
  Then convert one it.todo into a live row that measures the accent-as-MARK token against its
  grounds, so the next re-base cannot repeat this; today every accent row in
  palette-contrast.test.ts measures only white ON the stops.
```

---

## MEDIUM

```
[MEDIUM] The colors.background re-base pushed the 14 #2B8CC1-as-text sites from a passing 4.66 to
         a failing 3.94 — a sanctioned change moved an inherited ceiling across the AA line
File: features/demo/ui/tokens/palette.ts:53 (the ground) — worst-lit consumers:
      features/demo/ui/screens/SplashScreen.tsx:61, :63, :96
      features/demo/ui/screens/settings/SettingsNavBar.tsx:93
      features/demo/ui/screens/settings/SettingsCategoryList.tsx:112
      features/demo/ui/StoryRail.tsx:75
      (+ AboutPane.tsx:88, _pane-chrome.tsx:56, FormFieldsPane.tsx:228, ExportCaseCard.tsx:161,
       ExportLocationRow.tsx:74 — 14 sites in all)
Issue: #2B8CC1 (colors.primary) is used as a TEXT colour at those sites, directly on the app
  background. That background went #0d1b2a -> #002853, which is LIGHTER, so accent-on-background
  contrast fell. It crossed the AA line in this diff: **4.66 -> 3.94** on the flat background (on
  gradientCard it was already failing: 4.35 -> 4.25). "TAP TO SCAN" on the splash, the "Settings"
  nav label at 16px/500 and the StoryRail chapter label are all real text at normal size.
Evidence: the class is a documented inheritance (DEF-UI-018, restated at palette.ts:91-94 and in
  palette-contrast.test.ts:22) and its sweep belongs to a later wave under D3 — so this is NOT a
  request to sweep 14 literals in W0. It IS a request to record that W0 moved the baseline: the
  later wave can no longer assume "accent-as-text on the app background passes today". Nothing in
  the suite observes it — the link row is it.todo (palette-contrast.test.ts:293-295).
Fix: ledger it in docs/code-reviews/deferred.md with the measured pair (4.66 -> 3.94) and a trigger
  naming the wave that sweeps #2B8CC1 to colors.link, so the number arrives with the work instead
  of being re-derived. No code change required in W0.
```

```
[MEDIUM] Two hand-typed rgba() copies of colors.border survive in the token modules — the exact
         drift class this PR's own withAlpha fix was written to kill
File: features/demo/ui/glass-tokens.ts:51-52
      features/demo/ui/inputs/input-theme.ts:15-16
Issue: both spell rgba(28,78,132,0.5) by hand with the comment "kept as a literal because CSS has
  no alpha-on-hex". That reason expired in this same commit: withAlpha (SEAM(U0.2)) landed here and
  withAlpha(colors.border, 0.5) returns rgba(28, 78, 132, 0.5) — the same colour, derived. Leaving
  them typed means the next colors.border move silently splits the hairline from its own 50% wash,
  which is precisely what ExportCaseCard's glow did before this PR fixed it by derivation.
Evidence: features/demo/ui/screens/export/ExportCaseCard.tsx:129-132 and
  docs/planning/demo-phone-ui-parity/reports/u0-foundation-implementation-report.md:71-72 —
  "Re-basing only the token ships a deep-blue border with a light-blue glow. Fixed by derivation,
  not transcription." Two sites in the token layer were not given the same treatment.
Fix: build both borders with withAlpha(colors.border, 0.5) instead of the typed literal (and the
  T.borderSoft mirror), then update the two string pins in glass-tokens.test.ts to the spaced form
  that withAlpha and jsdom both produce. The spacing difference is real — the pins currently assert
  the unspaced literal.
```

---

## LOW

```
[LOW] The marketing device shell's copied screen backdrop no longer matches the demo's
File: components/marketing/phone-frame.tsx:48
Issue: screenStyle.background is still #0d1b2a; the demo shell it documents itself as copying moved
  to colors.background (#002853) at features/demo/ui/PhoneFrame.tsx:60. Cosmetically near-invisible
  — the slot is filled edge-to-edge by <AppDemo/> — so this is a maintenance note, not a visual bug.
Evidence: components/marketing/phone-frame.tsx:6-11 states the constants are COPIED from
  features/demo/ui/PhoneFrame.tsx and deliberately not imported (the wall). The wall test
  (components/marketing/__tests__/phone-frame.test.tsx:56-66) guards the IMPORT, not the values, so
  nothing notices when the copy drifts. Correctly out of palette.test.ts's scan root, which is
  features/demo/ui/** only.
Fix: either update the literal to #002853 with a comment naming the demo line it mirrors, or state
  in the docblock that only the geometry is mirrored and colour is marketing's own.
```

```
[LOW] withAlpha runs on every render of every expanded export card
File: features/demo/ui/screens/export/ExportCaseCard.tsx:130-132
Issue: the derived glow is computed inside the JSX style object, so a regex parse + string build
  runs per card per render. It is a module-constant expression — nothing in it depends on props.
  Immaterial at the demo's list sizes; listed only because the repo has an explicit
  hoist-static-styles convention (components/marketing/phone-frame.tsx:30-31).
Evidence: a module-scope const holding withAlpha(GLASS.accentFrom, 0.35) is the same one line and
  keeps the derivation, which is the point of the fix.
Fix: hoist it to a module constant.
```

---

## Web Summary

CRITICAL: 0 · HIGH: 1 · MEDIUM: 2 · LOW: 2
Verdict: REVISE

Marketing<->demo isolation: **preserved.** No file under components/, lib/ or app/(default)/ imports
@/features/demo or the new ui/tokens/* modules (grepped, all three import forms). The @theme mirrors
--color-demo-accent-from/-to moved with the token and are consumed only by app/demo/error.tsx:45,
which is on the /demo route; its white-on-gradient CTA IMPROVES (2.94 -> 5.80). Root layout
untouched; no 'use client' added to any server component.

Bundle impact: **none.** Build log: /demo 107 kB First Load, shared-by-all 106 kB, every marketing
route unchanged. The two new modules are plain `as const` object literals plus four pure functions —
no runtime getters, no Proxy, no barrel re-export, no new dependency, no heavy import made static
(mapbox-gl and pdfjs-dist remain await-imported inside their effect/function).

Browser-resource cleanup: **n/a** — no effects, listeners, timers, object URLs or observers added or
altered by this diff.

Accessibility: **gaps found** — one HIGH (six accent-as-foreground sites below their WCAG floor,
reproduced in the before/after captures) and one MEDIUM (14 accent-as-text sites crossed the AA line
when the ground lightened). No new dialog, focus-management, live-region, landmark or keyboard
regressions: ModalShell, role="switch" + switchKeyDown, aria-pressed, role="progressbar" and its
sr-only role="status" mirror are all untouched.

Style-convention adherence: **correct half.** Every changed demo file stays on inline CSSProperties;
no Tailwind class entered features/demo/ui/**; the only app/css/style.css edit is the two
demo-scoped @theme mirrors. Lifted rules intact — radius.lg / radius.control substitute 12 and 10
for the identical literals, and the 404 = 378 + 13x2 frame math, the 0.62 -> 251x504 / 0.78 ->
316x634 ceil contract and [data-demo-root]'s box-sizing are untouched in both halves. No new
keyframes, no new global CSS, no new animation needing a prefers-reduced-motion gate. withAlpha
returns a literal rgba(r, g, b, a) as documented — never color-mix() — which is what keeps every
derived value visible to the contrast gate.

Out-of-lane observations:
- Pipeline hygiene: a scratch file I created in my own session scratchpad (.../scratchpad/c.mjs)
  came back on a later read holding a DIFFERENT agent's contrast-table output. Nothing of mine was
  lost (I re-ran under unique filenames and every figure above is reproduced), and my lane file was
  written once, to this path only — but the session scratchpad is evidently not isolated per-lane
  this round. Worth the orchestrator's attention.
- parseColor (tokens/scale.ts:85) leaves its rgb() branch unanchored (no trailing $) and does not
  accept 8-digit hex; withAlpha silently passes gradient strings through unchanged. All documented,
  none reachable today — typescript-reviewer / silent-failure-hunter territory.
