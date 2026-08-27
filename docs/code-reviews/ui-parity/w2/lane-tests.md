# Lane: tests — W2

## Round 1 (fix delta)

PR #42 `feat/uiparity-w2` @ **`250e12f`** · fix diff `addd03f..250e12f` · authority = the fix-mapping
comment on the PR. Warm seat: I re-read only the mapping, my own findings' entries in it, the fix
commits' lines and the code a changed line now depends on. Nothing below is confirmed from memory —
every disposition carries a probe run at `250e12f`.

**My findings in the mapping: F28, F30, F31, F32, F40, F48, F49. All seven FIXED.** No
fix-introduced regression found in their blast radius.

### Probe environment

Probe worktree `worktrees/probe-w2d-tests-scans` at **`250e12f`**, cut fresh; the shared `w2-wave`
tree was never mutated. **Which copy was mutated: the canonical source in the probe worktree**, in
every case. Baseline before any mutation: `pnpm test --silent` → **290 files / 3,899 passed | 4 todo
(3,903), exit 0** — matches the mapping comment's cold figure. Motion mode: default **motion-ON**;
no probe below sits on either side of the motion gate. Verdicts from the runner's **exit code**,
read from the child process return code — never from a report file. Every probe restored, restore
proven per probe (`git diff --stat` empty **and** `git status --porcelain` empty); tree clean before
teardown.

**Teardown, verified** (`tools/worktree-remove.ps1`): `unlinked 549 junction(s) in 2 pass(es)` ·
`node_modules/.pnpm entries BEFORE: 240` / `AFTER : 240` ·
`OK -- worktree removed, main checkout's .pnpm store intact (240 entries).` Branch
`probe/w2d-tests-scans` deleted; the directory is gone. Three `probe-*` worktrees remain registered
(`probe-u6.2-redgreen`, `probe-w2d-types-scan`, `probe-w2d-web-rendered`) — **not mine**, sibling
lanes'.

**17 mutations · 0 invalid · 17 KILLED · 0 SURVIVED.**

---

### F28 [HIGH] — five sheet fragments pinned on the rendered element · **FIXED**

Fix: `GlassBottomSheet.test.tsx` gains a `missing(el, fragment)` helper that renders the fragment
onto a reference div and reports which of ITS declarations the real element's `cssText` lacks, then
one case checking all five spread points at once (`:495-509`), a composition case
(`:511-524`), and `data-sheet-header` added to the header node. `sheet-chrome.test.tsx:369-383` now
renders `PickerSheet` first in the A46 case.

**All five of my surviving mutations now KILL**, each restored and proven:

| probe | mutation (canonical source) | r0 | r1 |
|---|---|---|---|
| F28-surface | delete `...sheetSurface,` from `panel` (`GlassBottomSheet.tsx:334`) | SURVIVED full suite | **KILLED** exit 1 — 2 files failed, 3 tests / 88 |
| F28-scrim | `:420` `...sheetScrim` -> bare position/inset | SURVIVED | **KILLED** exit 1 — 1 / 108 |
| F28-header | `:371` `sheetHeaderBand` -> layout keys only | SURVIVED | **KILLED** exit 1 — 1 / 104 |
| F28-handle | `:367` `sheetHandle` -> width/height only | SURVIVED | **KILLED** exit 1 — 1 / 59 |
| F28-strip | `:382` `sheetAccentStrip` -> height only | SURVIVED | **KILLED** exit 1 — 1 / 104 |

**The picker-sheet half is real, not a title edit.** `F28-surface` reds **two** files — the new
case in `GlassBottomSheet.test.tsx` and the A46 case in `sheet-chrome.test.tsx`, which now reaches
the shadow only through `GlassBottomSheet`'s spread. The title's third sheet is now rendered and
load-bearing.

**One probe of my own against the new helper, because `missing()` matches by substring**
(`have.includes(d)`, so a needle like `width: 40px` can be satisfied by `max-width: 40px`), and
because whole-fragment deletion is the easy half:

```
MUTATION PROBE: partial erosion of the surface, not deletion
Target:      features/demo/ui/controls/GlassBottomSheet.tsx:334 - `panel`
Claimed pin: GlassBottomSheet.test.tsx:495 "paints panel, scrim, header band, handle and
             accent strip from the seam"
Mutation:    keep `...sheetSurface` and add `borderTopWidth: 1` immediately after it
             (the 2px lit edge silently becomes 1px - the fragment is still spread)
Result:      KILLED  (from exit code 1) - 1 failed / 77, GlassBottomSheet.test.tsx
Restore:     verified byte-identical (git diff --stat empty; git status --porcelain empty)
```

The subset check therefore catches erosion as well as deletion. Disposition **FIXED**.

---

### F30 [MEDIUM] — the scrim's `+ elevation` · **FIXED**

Fix: `UserProfilePane.test.tsx:329-345` reads the editor's OWN scrim as
`dialog.previousElementSibling` (not "whichever `[data-modal-scrim]` comes first"), asserts
`MODAL_SCRIM_Z + MODAL_LAYER.overSheet`, and then asserts the ORDERING on both sides —
`> SETTINGS_SHEET_Z` and `< dialog.zIndex`. That is the shape I asked for, plus the sibling-node
disambiguation I did not.

```
MUTATION PROBE: re-run the r0 survivor
Target:      features/demo/ui/screens/_shared.tsx:277
Mutation:    `zIndex: MODAL_SCRIM_Z + elevation` -> `zIndex: MODAL_SCRIM_Z`
Result:      KILLED  (from exit code 1) - 1 failed / 70   [r0: SURVIVED, full suite exit 0]
Restore:     verified byte-identical
```

---

### F31 [MEDIUM] — recorder tones pinned where they render · **FIXED**

Fix: `AudioRecorderScreen.test.tsx:49-86` renders all three phases, reads the dot's `background`
and the label's `color` off the DOM, composes every expectation from `colors.*`, and adds the
distinctness guard. `status-owners.test.tsx:11-21` now names `AudioRecorderScreen.test.tsx` and
states explicitly that `audio-levels.test.ts` covers the tone vocabulary and sees no colour — the
false claim is corrected, not merely softened.

| probe | mutation | result |
|---|---|---|
| F31-collapse | all three tones -> `colors.textSecondary` (the r0 survivor) | **KILLED** exit 1 — 1 / 29 |
| F31-partial | `warning: colors.warning` -> `colors.error` (PAUSED reads as REC) | **KILLED** exit 1 — 1 / 23 |

**Tautology check on the fourth assertion, as asked.** `expect(new Set([rec.dot, paused.dot,
ready.dot]).size).toBe(3)` is *implied* by the three `toEqual`s above it **given distinct tokens** —
any collapse of the lookup reds an equality first (F31-partial confirms: the partial collapse is
caught, and the Set line is not what catches it). It is therefore redundant for lookup mutations
but **not vacuous**: its one independent bit is that `colors.error`, `colors.warning` and
`colors.textSecondary` are themselves three different values, which no other assertion in that file
states. Harmless and cheap; I would keep it. Not a finding.

---

### F32 [MEDIUM] — exemptions keyed `<role>:<path>`, dead-exemption predicate inverted · **FIXED**

Fix: `choice-controls.test.tsx:185-200` keys `EXEMPT` by `` `${Role}:${string}` ``, a single
`reported(role, text)` predicate now serves both the scan and the backstop (`:243-260`,
`:326-338`), and the dead-exemption question became *"would this file be reported were the entry
removed?"* — exactly the inversion I proposed. The fix round also found the **worse** half I had
only noted in passing: the file-keyed exemption excused those files from the RADIO scan too.

| probe | mutation | result |
|---|---|---|
| F32-radio | plant a hand-rolled `<button role="radio">` in the exempt `DvrInfoScreen.tsx` | **KILLED** exit 1 — 1 / 15 |
| F32-dead | `DvrInfoScreen.tsx` adopts `<CheckboxBox` while KEEPING its exemption (my r0 survivor) | **KILLED** exit 1 — 1 / 15 |

Deferral §100's close condition now rests on a test that actually fires.

---

### F40 [MEDIUM] — `deltaE` throws instead of returning NaN · **FIXED**

Fix: `glass-well-recipe.test.tsx:189-197` throws from `lab()` when any channel is non-finite —
inside the helper, so a future caller cannot undo it, which is what I asked for. `:212-221` also
asserts finiteness and length BEFORE the band filter, closing the "`.toEqual([])` over an empty
input" shape.

```
MUTATION PROBE: re-run the r0 survivor
Target:      features/demo/ui/__tests__/glass-well-recipe.test.tsx:185 (the disclosed hex ground)
Mutation:    `const PANEL = normColor(colors.backgroundSecondary)` -> `= colors.backgroundSecondary`
Result:      KILLED  (from exit code 1) - 1 failed / 9   [r0: SURVIVED, 9 passed]
Restore:     verified byte-identical
```

---

### F48 / F49 [LOW] — **FIXED**

- `banner.test.tsx:252` now reads *"SIX entries over SEVEN files"* with the pairing explained, and
  `:302`'s title carries no number. The loop was always derived; the prose no longer misdirects.
- `check-rn-parity.mjs:287` now reads *"41 palette keys / 65 anchor keys / 135 rows, MEASURED"*.
  Verified by importing the module at `250e12f`: `PALETTE_KEYS.length` = **41**, derived rows =
  **135**.

---

## Sampled probes of OTHER lanes' fixes

Not my findings; probed because a new pin that cannot fail is the fix round's characteristic
failure mode.

### F27 — the unchecked-mark ratio bounded AT the constant

`UNCHECKED_MARK_EDGE` is exported from `choice-controls.tsx:69` and consumed by both controls
(`:116`, `:224`); `choice-controls.test.tsx` composes its expectations from it AND names the
rejected value explicitly (`not.toBe(jsdomColor(colors.border))`, `:65-68`) — the anti-tautology
shape, and the file says why (a composed-only pin moves both sides).

```
MUTATION PROBE: the control revert
Target:      features/demo/ui/controls/choice-controls.tsx:69
Mutation:    `UNCHECKED_MARK_EDGE = colors.textTertiary` -> `= colors.border` (the shipped
             1.33:1 value the finding measured)
Result:      KILLED  (from exit code 1) - 2 files failed, 2 tests / 44
             (choice-controls.test.tsx AND palette-contrast.test.ts - the value pin and the
             RATIO bound fire independently, which is the point of bounding at the constant)
Restore:     verified byte-identical
```

### F47 — the resurrection pin pair

```
MUTATION PROBE 1: resurrect the four dead keys AFTER the spread
Target:      features/demo/ui/controls/AlertDialog.tsx:117-118
Mutation:    re-insert padding 12 / fontSize 14.5 / fontWeight 600 / cursor after
             `...buttonStyle(...)` - the exact regression the pin names
Result:      KILLED  (from exit code 1) - 1 failed / 45
```

```
MUTATION PROBE 2 (anti-tautology control): move the RECIPE instead
Target:      features/demo/ui/controls/button-recipe.ts:137 - SIZES.medium
Mutation:    `fontSize: 16` -> `fontSize: 14.5`
Result:      KILLED  (from exit code 1) - 3 failed / 53, across CentredDialog.test.tsx AND
             button-recipe.test.tsx
Reading:     the pin composes its expectation from `buttonStyle()`, so this control matters -
             it fires only because the file also names the rejected literals
             (`not.toBe('14.5px')`, `not.toBe('12px')`). Composed pin + named literal: sound.
Restore:     both verified byte-identical
```

### F37 vs the U6.1 mechanism — the refutation holds under measurement

The fix refutes the tripwire half of my sibling-lane concern and replaces it with a border-VALUE
pin (`field-input-recipe.test.tsx:132-158`), claiming React logs nothing at all for this defect
shape. **Measured, and it is correct:**

```
MUTATION PROBE: re-apply the border split the W1 fix removed
Target:      features/demo/ui/tokens/field-input.ts:72
Mutation:    `border: \`${error ? 2 : 1}px solid ${borderColor}\`` -> error branch declaring
             borderWidth/borderStyle/borderColor, non-error branch keeping the shorthand
Result:      KILLED  (from exit code 1) - 1 failed / 19 across field-input-recipe + shared
             AssertionError: expected '' to be '2px solid rgb(255, 71, 87)'
             at field-input-recipe.test.tsx:152 - i.e. the BORDER VALUE, on the rerender.
             The trailing `expect(conflictingStyleWarnings).toEqual([])` never ran and the
             setup's afterEach did not throw: React logged nothing.
Restore:     verified byte-identical
```

So `vitest.setup.ts:41-67`'s rewritten docblock is accurate: for this shape the hook does not
merely go undriven, it never fires. Both branches (U2.1's and U6.1's) assert the same contract by
the same mechanism, so the W3 merge has no conflicting claim to reconcile.

**One thing I checked because it would have made F37's fix vacuous:** the pin imports
`conflictingStyleWarnings` from `@/vitest.setup` — the only test in the repo that imports the setup
module. If Vite loaded that as a second instance, the imported array would not be the one the
`afterEach` inspects and the assertion would be decoration.

```
MUTATION PROBE: module identity
Mutation:    push a sentinel into the IMPORTED array inside that test
Result:      KILLED (exit 1) - the SETUP's afterEach threw on the sentinel, so the test file and
             the setup hold the SAME array instance. The assertion is live.
Restore:     verified byte-identical
```

---

## Fix-introduced regressions

**None found in the blast radius of the fixes I own or sampled.** Checked specifically:

- The full suite at `250e12f` is green — 290 files / **3,899 passed | 4 todo**, exit 0. Todo count
  unchanged at 4; no `.skip`/`xit` introduced.
- `missing()` renders an extra reference div per call (five per case). RTL's `cleanup()` in
  `vitest.setup.ts` unmounts them; `panel()` still resolves a single `dialog`. No leakage.
- `sheet-chrome.test.tsx:107-112`'s two new `@ts-expect-error` directives are load-bearing rather
  than suppressive: F38 narrowed `sheetSurface` with `as const satisfies`, so re-adding either
  bottom-radius key makes the directive unused and reds `tsc --noEmit`, which is in the gate set.
- No new inline fixture displaced a canonical factory; no clock or entropy entered a test; no
  snapshot introduced.

## Tests Summary (Round 1 — fix delta)

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0
Verdict: **APPROVE**

Per finding: **F28 FIXED · F30 FIXED · F31 FIXED · F32 FIXED · F40 FIXED · F48 FIXED · F49 FIXED.**
Sampled: F27 pin has teeth (constant bound + control revert both red) · F47 pin pair has teeth and
survives its anti-tautology control · F37's refutation is measurement-backed and its mechanism
matches U6.1's.

Probes: **17 applied · 0 invalid · 17 KILLED · 0 SURVIVED** · restores proven per probe · teardown
verified (`unlinked 549 junction(s) in 2 pass(es)`, `.pnpm` 240 -> 240).

Out-of-lane observations: none new.

**Pipeline note (contract §6):** while staging this section I briefly created
`docs/code-reviews/ui-parity/w2/lane-tests.new.md` in the review directory — a second path, which
the output contract forbids. I deleted it within the same minute, re-staged outside the repository,
and no sibling lane's file was touched. Reporting it because a shared review directory with no lock
is exactly where that mistake compounds.

---

Seat: fresh `test-analyzer` (predecessor retired; its W0/W1 lane files read for precedent).
Mode: code review. Single question: **would these tests catch a realistic regression, or do they
pass for the wrong reasons?**

## Probe environment and provenance

All mutations were applied in a dedicated probe worktree, **never** the shared W2 tree:
`git worktree add <...>/worktrees/probe-w2-tests-scans -b probe/w2-tests-scans 7bcb553`, then
`pnpm install --prefer-offline`.

**Which copy was mutated: the canonical source in `probe-w2-tests-scans` at `7bcb553`, in every
case.** No mirrored duplicates exist for any target below.

- **Baseline, before any mutation:** `pnpm test --silent` -> **290 files / 3,881 passed | 4 todo
  (3,885), exit 0**, 46.7 s. Matches the PR body exactly. `pnpm test:coverage` -> exit 0,
  statements 98.29 / branches 93.33 / functions 99.84 / lines 99.06 against the 80 % gate.
- **The RN drift guard RAN — it did not skip.** The baseline reports 0 skipped, so
  `rnAvailable()` resolved and `rn-token-parity.test.ts`'s six `it.skipIf` cases executed. Every
  verdict quoted from that file below is a real verdict, not the `skipIf` non-verdict the hazard
  doc warns about twice.
- **Motion mode:** default = **motion-ON** (`vitest.setup.ts:47-60` hard-codes
  `matchMedia().matches` false). No probe below targets code on the far side of the motion gate;
  the suites that DO exercise reduced motion (`GlassBottomSheet.test.tsx`,
  `CentredDialog.test.tsx`, `modal-chrome.reduced-motion.test.tsx`) install their own `matchMedia`
  override and restore it in `afterEach`.
- **Verdicts are taken from the runner's exit code**, captured directly from the child process
  return code. **No verdict anywhere in this file was read from a report file** — the false-KILL
  harness failure mode the skill records twice.
- **Every probe restored and the restore proven**: `git checkout -- <file>` then
  `git diff --stat` empty **and** `git status --porcelain` empty, asserted per probe by the
  harness. Final tree state before teardown: both empty.
- **Teardown, verified** (`tools/worktree-remove.ps1`, exit 0):
  `unlinked 549 junction(s) in 2 pass(es)` · `node_modules/.pnpm entries BEFORE: 240` /
  `AFTER : 240` · `OK -- worktree removed, main checkout's .pnpm store intact (240 entries).`
  `git worktree list | grep -c probe` -> **0**; branch `probe/w2-tests-scans` deleted; no
  `probe*` directory remains under `worktrees/`.

**38 mutations applied · 1 invalid (a no-op: probe keys spread before the real ones and lost the
override) · 24/24 re-run claimed kills re-confirmed KILLED · 3 controls KILLED · 9 SURVIVED.**

### Stratified re-run of the implementers' claimed kills — 2 per package, 12 packages

All twenty-four KILLED, exit 1.

| id | package | mutation (canonical source) | scoped suites | verdict |
|---|---|---|---|---|
| U2.1-a | U2.1 | `field-input.ts:68` drop the `focused` arm | field-input + field-input-recipe | KILLED |
| U2.1-b | U2.1 | `field-input.ts:74` disabled fg -> `disabledText` | same | KILLED |
| U2.2-a | U2.2 | `button-recipe.ts:101` `DangerFill.dark` -> `palette.dark.error` | button-recipe + palette-contrast | KILLED |
| U2.2-b | U2.2 | `button-recipe.ts:194` disabled `outline` takes the fill | button-recipe | KILLED (1 failed / 19) |
| U2.3-a | U2.3 | `_shared.tsx:734` track fill -> literal `rgba(9,9,9,0.9)` | Toggle + a11y | KILLED (2 failed / 15) |
| U2.3-b | U2.3 | inject a 4th `role: 'switch'` + 46x28 track into `CamerasScreen.tsx` | one-switch-renderer | KILLED (2 failed / 3) |
| U2.4-a | U2.4 | `_pane-chrome.tsx:216` `RadioOption` -> hand-rolled `button role="radio"`, **import left dead** (P7's exact shape) | choice-controls | KILLED — the JSX-open-tag needle holds |
| U2.4-b | U2.4 | `glass-tiers.ts:176` dark `recessed.gradient` -> the shipped near-black | glass-well-recipe + palette-contrast | KILLED |
| U3.1-a | U3.1 | `palette.ts` `successLight` -> the old `#1a8754` (4.10:1) | palette-contrast + banner **only** (the value pin deliberately out of scope) | KILLED (2 failed / 46) |
| U3.1-b | U3.1 | delete `warningAccent` from `check-rn-parity.mjs` `PALETTE_KEYS` | rn-token-parity | KILLED — the UNGATED membership pin fires |
| U3.2-a | U3.2 | `status.ts:187` badge fg `tone.color` -> `tone.accent` | status + DashboardScreen | KILLED |
| U3.2-b | U3.2 | `DvrInfoScreen.tsx:39` `OVERWRITTEN: error` -> `warning` | status-owners | KILLED |
| U3.3-a | U3.3 | `Banner.tsx:187` `stroke={foreground}` -> `stroke={colors[severity]}` | banner | KILLED (4 failed / 24) |
| U3.3-b | U3.3 | `TimeOffsetScreen.tsx` imports `Banner` (a hand-back adopts early) | banner | KILLED — the adoption map names U6.4b |
| U3.4-a | U3.4 | `SyncStatusCard.tsx:81` de-italicised (a blanket sweep) | empty-state | KILLED |
| U3.4-b | U3.4 | `CasesScreen.tsx:81` header padding -> `8px 18px 18px` | header-geometry | KILLED |
| U4.1-a | U4.1 | `sheet-chrome.ts:117` lit edge -> `sheet.border` | sheet-chrome | KILLED (4 failed / 28) |
| U4.1-b | U4.1 | `SHEET_SHADOW` sign flipped to the dialog cast | sheet-chrome + CentredDialog | KILLED — incl. "declared in exactly one UI source" |
| U4.2-a2 | U4.2 | `_shared.tsx:285` sheet drops `+ elevation` | UserProfilePane + SettingsModal + ModalShell | KILLED |
| U4.2-b | U4.2 | `_shared.tsx:270` `ModalShell`'s Escape key never matches | ModalShell | KILLED |
| U4.3-a | U4.3 | `CentredDialog.tsx:259` delete the topmost-only Escape guard | CentredDialog | KILLED |
| U4.3-b | U4.3 | `CentredDialog.tsx:276` re-introduce the `activeElement`-at-mount read | CentredDialog + AlertDialog + DeleteConfirmationModal + ExportModal | KILLED (4 failed / 74, all four files) |
| U4.4-a | U4.4 | `MediaLibrarySheet.tsx:424` close glyph -> `textTertiary` (V6's shape) | MediaLibrarySheet + palette-contrast | KILLED |
| U4.4-b | U4.4 | `palette.ts` dark `scrim` 0.32 -> 0.9 (the "resync") | palette-contrast **only** | KILLED (3 failed / 22) |

The U2.4 report's two self-disclosed survivors are both genuinely closed: `U2.4-a` replays P7's
dead-import shape and now KILLS, and the `recessed` retune (`U2.4-b`) now reds
`glass-well-recipe.test.tsx` as well as `palette-contrast.test.ts` row 33. **I found no sibling of
the dead-import class** — `one-switch-renderer.test.ts` anchors on a role regex and a geometry
regex (never a bare identifier), `empty-state.test.tsx` and `banner.test.tsx` strip comments
before matching, `field-input.test.ts` matches a two-declaration needle, and
`CentredDialog.test.tsx` skips comment lines. `banner.test.tsx`'s adoption map additionally
`existsSync`-checks each hand-back path, closing the rename hole a path-keyed list otherwise has.
The **ΔE class does have a live sibling** — see MEDIUM 2.

---

# Findings

## [HIGH] `GlassBottomSheet` mounts five `sheet-chrome` fragments and NOT ONE is pinned on the rendered element — deleting `...sheetSurface` is invisible to all 3,881 tests

**File:** `features/demo/ui/controls/GlassBottomSheet.tsx:334` (`...sheetSurface`), `:367`
(`sheetHandle`), `:371` (`sheetHeaderBand`), `:382` (`sheetAccentStrip`), `:394` (`...sheetScrim`)

**Tests covering it:** `features/demo/ui/controls/__tests__/sheet-chrome.test.tsx` asserts every
fragment **as a constant**; `features/demo/ui/controls/__tests__/GlassBottomSheet.test.tsx` (45
cases) and `features/demo/ui/inputs/__tests__/PickerSheet.test.tsx` (12 cases) assert phase,
motion, z-index, drag, close routes, slots and a11y — and **read no colour, no gradient, no border
and no shadow off the panel at all**.

**Issue:** U4.1's thesis is "one mountable shell". `sheet-chrome.test.tsx` proves the fragments are
correct; `GlassBottomSheet.test.tsx` proves the shell behaves. Nothing joins the two. A shell that
stops spreading its own surface — the exact regression `field-input-recipe.test.tsx:18-21` was
written to catch for U2.1's seam — is green everywhere. Seven picker consumers plus the media
library, the map filters sheet and the export action sheet ride on this shell.

**Evidence — mutation probe (canonical source, probe worktree at `7bcb553`):**

```
MUTATION PROBE: the sheet shell stops painting the sheet tier
Target:      features/demo/ui/controls/GlassBottomSheet.tsx:333-334 - `panel`
Claimed pin: sheet-chrome.test.tsx:340-366 "is the SAME shadow on the picker sheet, the export
             action sheet and the map sheet" + the whole GlassBottomSheet/PickerSheet suites
Mutation:    delete the single line `...sheetSurface,` from `panel`
Result:      SURVIVED  (from exit code 0)
             scoped (GlassBottomSheet + sheet-chrome + PickerSheet): 3 files, 84 passed
             FULL SUITE:  290 files, 3,881 passed | 4 todo - exit 0
             cold `tsc --noEmit --incremental false`: exit 0 (the import merely goes dead; this
             repo sets no `noUnusedLocals` - integration finding I-5)
Path taken:  the panel keeps position/z/animation/maxHeight, which is all any pin reads. The
             gradient, the 1px sides, the 2px lit top edge, radius 22, SHEET_SHADOW,
             `overflow: hidden` and the safe-area padding all vanish unobserved.
Restore:     verified byte-identical (git checkout -- <file>; git diff --stat empty;
             git status --porcelain empty; GlassBottomSheet.test.tsx 45 passed)
```

Four sibling probes, same file, each restored and proven, scoped to GlassBottomSheet + PickerSheet
+ MediaLibrarySheet + a11y:

| probe | mutation | result |
|---|---|---|
| H1-scrim | `:394` `...sheetScrim` -> bare position/inset (drops `colors.scrim`, A22's one backdrop token) | **SURVIVED** exit 0 — 4 files, 105 passed |
| H1-header | `:371` `sheetHeaderBand` -> the layout keys only (drops the `header` tier gradient + hairline) | **SURVIVED** exit 0 — 3 files, 101 passed |
| H1-handle | `:367` `sheetHandle` -> width/height only (drops the radius and the tint) | **SURVIVED** exit 0 — 2 files, 56 passed |
| H1-strip | `:382` `sheetAccentStrip` -> height only (drops the whole tapering gradient) | **SURVIVED** exit 0 — 3 files, 101 passed |

**Two controls prove this is a gap and not a house limitation** — the sibling shell that landed in
the same wave IS pinned:

| probe | mutation | result |
|---|---|---|
| H1-modalsheet | `_shared.tsx:285` `...modalSheet` -> bare position | **KILLED** exit 1 — 1 failed / 73 |
| H1-modalscrim | `_shared.tsx:277` `...modalScrim` -> bare position/inset | **KILLED** exit 1 — 1 failed / 69 |

U4.2's `SettingsModal.test.tsx` compares the rendered declaration STRING against the fragment, so
`ModalShell` is covered on exactly the axis `GlassBottomSheet` is not.

**Second touch-point, same finding:** `sheet-chrome.test.tsx:341` is titled *"is the SAME shadow on
the picker sheet, the export action sheet and the map sheet"* and its body renders only
`ExportActionSheet` (`:346-353`) and `MapBottomSheet` (`:356-365`). **The picker sheet is named and
never rendered** — the one of the three that was restructured onto a new shell in this very
package. That title is what the next reader will take as coverage.

**Fix:** one case in `GlassBottomSheet.test.tsx` that renders the shell and asserts the panel
carries the fragments' values, composed from `sheet-chrome` / `GLASS_TIER[scheme]` rather than
retyped — `panel().style.backgroundImage` equals the sheet gradient jsdom stores,
`panel().style.borderTopColor` equals `sheet.highlightTop` normalised (the four-longhand read at
`sheet-chrome.test.tsx:64-71` already exists), `panel().style.boxShadow` is `SHEET_SHADOW`, and
`scrim().style.backgroundColor` is `colors.scrim`. The declaration-string form
`SettingsModal.test.tsx` uses would cover all five spread points in one assertion. Separately,
either render `PickerSheet` in `sheet-chrome.test.tsx:341` or drop it from the title.

---

## [HIGH] `ModalShell`'s SCRIM drops `+ elevation` silently — the panel's half of D14's layering is pinned, the scrim's is not, so the one elevated modal can paint its dim UNDER the sheet it dims

**File:** `features/demo/ui/screens/_shared.tsx:277` — `zIndex: MODAL_SCRIM_Z + elevation`

**Tests covering it:** `features/demo/ui/screens/settings/__tests__/UserProfilePane.test.tsx:310-327`
pins **the panel** (`:326`, `dialog.style.zIndex` against `SETTINGS_SHEET_Z + MODAL_LAYER.overSheet`).
`settings/__tests__/SettingsModal.test.tsx:255` pins the scrim at `MODAL_SCRIM_Z`, i.e. at
`elevation = 0`, where the term is inert. `ModalShell.test.tsx` (18 cases) contains no occurrence
of `zIndex`, `elevation` or `MODAL_` at all.

**Issue:** `MODAL_SCRIM_Z = 21`, `MODAL_SHEET_Z = 22`, `SETTINGS_SHEET_Z = MODAL_SHEET_Z` (22),
`MODAL_LAYER.overSheet = 4`; `UserProfileModal.tsx:102` is the sole consumer of `overSheet`. With
the term dropped, the profile editor paints its panel at 26 and its scrim at **21** — below the
Settings sheet at 22. The dim then sits behind the surface it exists to dim, and because the scrim
is also the dismiss target, the Settings sheet's controls stay visible and hit-testable under a
"modal" dialog. The PR body claims *"D14 (z-index frozen; pins unchanged)"* and U4.2's report lists
**P20 — `ModalShell` drops `+ elevation` (D14 layering) — KILLED**. P20 evidently mutated `:285`;
its sibling eight lines above is unprotected. This is the partial-finding shape the reviewer
contract's completeness sweep exists for.

**Evidence — mutation probe (canonical source):**

```
MUTATION PROBE: the elevated modal's scrim stops rising with its panel
Target:      features/demo/ui/screens/_shared.tsx:277 - ModalShell scrim zIndex
Claimed pin: U4.2 report P20 ("KILLED"); UserProfilePane.test.tsx:310-327 "the editor's layer"
Mutation:    `zIndex: MODAL_SCRIM_Z + elevation` -> `zIndex: MODAL_SCRIM_Z`
Result:      SURVIVED  (from exit code 0)
             scoped (UserProfilePane + SettingsModal + ModalShell): 3 files, 69 passed
             FULL SUITE: 290 files, 3,881 passed | 4 todo - exit 0
Path taken:  UserProfilePane.test.tsx:326 reads the DIALOG's z, never the scrim's;
             SettingsModal.test.tsx:255 reads the scrim at elevation 0, where +4 is invisible.
Control:     the same mutation on the PANEL (`:285`) is KILLED (exit 1, 1 failed / 69) - the two
             lines are asymmetrically covered, which is the finding.
Restore:     verified byte-identical (git diff --stat empty; git status --porcelain empty)
```

**Fix:** one assertion beside `UserProfilePane.test.tsx:326` reading the editor's OWN scrim node
(the second `[data-modal-scrim]` in the tree) against `MODAL_SCRIM_Z + MODAL_LAYER.overSheet` —
and, because the invariant is an ORDERING, assert it is greater than `SETTINGS_SHEET_Z` rather than
only equal to a number.

---

## [HIGH] A69's recorder status colours moved from a covered engine function into an uncovered UI lookup, and `status-owners.test.tsx` states they are covered

**File:** `features/demo/ui/screens/AudioRecorderScreen.tsx:119-123` — `STATUS_TONE_COLOR`,
consumed at `:204` (the status dot) and `:219` (the REC / PAUSED / READY label)

**Tests covering it:** none. The claim is at
`features/demo/ui/screens/__tests__/status-owners.test.tsx:12-15`: *"Six are covered where they
render — … the recorder's two in `audio-levels.test.ts`."*
`features/demo/engine/logic/media/__tests__/audio-levels.test.ts:119-141` covers
`recorderStatusTone()`'s **vocabulary** (the three tone strings plus the `assertNever` arm). It is
an engine test; it renders nothing and never sees a colour.

**Issue:** before this PR the colour lived in `recorderStatusColor()` inside `engine/`, under the
80 % coverage gate and pinned at three hexes. U3.2 correctly moved paint out of the engine — but
the destination lookup got no pin, and `features/demo/ui/**` is deliberately outside the coverage
gate, so nothing else notices. The refactor's net effect on this owner is a **loss** of protection,
asserted otherwise by the test's own docblock. The sibling lookup three lines below
(`LEVEL_BAND_COLOR`, `:126-130`) IS pinned, which is what makes this an oversight rather than a
policy.

**Evidence — mutation probe (canonical source):**

```
MUTATION PROBE: the recorder's status colour code collapses to one grey
Target:      features/demo/ui/screens/AudioRecorderScreen.tsx:120-122
Claimed pin: status-owners.test.tsx:12-15 ("the recorder's two in audio-levels.test.ts")
Mutation:    error: colors.error / warning: colors.warning -> both colors.textSecondary
             (REC loses its red, PAUSED loses its gold; all three tones read identical)
Result:      SURVIVED  (from exit code 0)
             scoped (AudioRecorderScreen + status-owners + audio-levels): 3 files, 52 passed
             FULL SUITE: 290 files, 3,881 passed | 4 todo - exit 0
Path taken:  audio-levels.test.ts asserts the TONE string, which is unchanged; AudioRecorderScreen
             .test.tsx queries the dot and the label by role/text and never reads their colour.
Control:     the sibling lookup - LEVEL_BAND_COLOR `hot: colors.error` -> `colors.primary`
             (`:129`) - is KILLED (exit 1, 1 failed / 52). One of the two is pinned.
Restore:     verified byte-identical (git diff --stat empty; git status --porcelain empty)
```

**Fix:** three assertions in `status-owners.test.tsx` (which already owns "the remaining two"):
render `AudioRecorderScreen` at each phase and assert the dot's `background` and the label's
`color` against the tokens using the file's own `rgb()` helper — `rgb(colors.error)` /
`rgb(colors.warning)` / `rgb(colors.textSecondary)` — plus a not-equal between the recording and
paused reads so a collapse cannot pass. Then correct `:12-15`: `audio-levels.test.ts` covers the
tone, not the paint.

---

## [MEDIUM] The adoption scan's "carries no dead exemptions" test does not enforce the cleanup deferral D-1 says it enforces — an exemption outlives its reason and becomes a permanent licence

**File:** `features/demo/ui/controls/__tests__/choice-controls.test.tsx:248-257`; exemption at
`:182-188` (`screens/DvrInfoScreen.tsx`)

**The claim:** U2.4's report §9 D-1 — *"Trigger: U6.4b … Its close condition: delete the exemption
entry in `choice-controls.test.tsx` — the 'carries no dead exemptions' test enforces the cleanup."*

**What the test actually checks (`:252-255`):** that the exempted file still contains
`role="radio"` OR `role="checkbox"`. An adoption does not remove the role — `ExportCaseCard`'s
pressable legitimately keeps `role="checkbox"` while `CheckboxBox` paints beneath it, and the
docblock at `:214-217` names that as the intended shape. So "adopted" and "still declares the role"
are orthogonal, and the test cannot distinguish them.

**Evidence — mutation probe (canonical source):**

```
MUTATION PROBE: the exempted file adopts the recipe and keeps its exemption
Target:      features/demo/ui/screens/DvrInfoScreen.tsx:209-211 - the hand-rolled 16px box
Claimed pin: choice-controls.test.tsx:248 "carries no dead exemptions"
Mutation:    replace the hand-rolled span box with `<CheckboxBox checked={on} />` plus its import
             (a faithful U6.4b adoption); leave the EXEMPT entry at :182-188 untouched
Result:      SURVIVED  (from exit code 0) - 1 file, 13 passed
Path taken:  choice-controls.test.tsx:254 - the wrapping button's role="checkbox" is untouched by
             an adoption, so `dead` is empty and the exemption stays "live" forever.
Restore:     verified byte-identical (git checkout --; git status --porcelain empty)
```

Consequence beyond the trigger: once `DvrInfoScreen.tsx` adopts, its exemption still suppresses
BOTH scans for that whole file, so a later hand-rolled radio or checkbox added there is invisible
permanently.

**Fix:** make the dead-exemption predicate the negation of the offender predicate rather than a
role check — an entry is dead when the file would NOT be reported were it removed (declares the
role AND already renders the component). That reds on adoption, which is what D-1's trigger
promises. Either fix it or amend D-1's close condition before the aggregator writes the ledger row:
a trigger naming a non-existent enforcement is worse than a bare one.

---

## [MEDIUM] The disclosed ΔE defect was fixed at the CALL SITE, not in the helper — `deltaE` still turns an unparseable colour into NaN, and NaN passes the two-sided band

**File:** `features/demo/ui/__tests__/glass-well-recipe.test.tsx:187-201` (`deltaE` / `lab`),
`:203-208` (the row), `:185` (`PANEL`, the fix)

**Issue:** U2.4 found and disclosed this exact defect (report §3 SURVIVED #1: the digit regex read
`#0e3965` as two numbers). The fix was `PANEL = normColor(...)` — correct, and the docblock at
`:174-184` explains it well. But `lab()` at `:189` is unchanged: any non-`rgb()` input still yields
NaN channels, `deltaE` returns NaN, and the row's filter `dE < 3 || dE > 12` is **false for NaN**,
so the offender list stays empty. The row is green AND vacuous for any input that is not already
normalised. `palette-contrast.test.ts:71` next door does this correctly — its `parse` THROWS on
anything it cannot read, which is why that file's helpers cannot go quietly wrong.

**Evidence — mutation probe (canonical source; the mutated file is the TEST, deliberately, because
the claim under test is the test's own falsifiability):**

```
MUTATION PROBE: re-introduce the disclosed hex-ground shape
Target:      features/demo/ui/__tests__/glass-well-recipe.test.tsx:185
Claimed pin: :203 "holds row 33s two-sided 3-12 dE per stop against PickerSheets panel"
Mutation:    `const PANEL = normColor(colors.backgroundSecondary)` -> `= colors.backgroundSecondary`
Result:      SURVIVED  (from exit code 0) - 1 file, 9 passed
Path taken:  lab() on a hex yields non-finite channels -> dE NaN; `NaN < 3` is false and
             `NaN > 12` is false, so the filter drops it and the row asserts [] toEqual [].
Restore:     verified byte-identical (git diff --stat empty)
```

**Fix:** two lines inside the helper, so a caller cannot undo it — throw from `lab()` when any
channel is not finite, and assert the measured dE values (or `Number.isFinite(dE)`) in the row
rather than only an empty offender list. As written the row cannot tell "in band" from
"unmeasurable".

---

## [LOW] `banner.test.tsx`'s adoption map says "six" hand-backs over a seven-entry table

**File:** `features/demo/ui/controls/__tests__/banner.test.tsx:240` (*"The six D19 hand-backs"*),
`:288` (test title *"leaves all six hand-back sites unadopted"*); `HANDED_BACK` at `:246-254` holds
**seven** rows (`TimeOffsetScreen`, `CompletionScreen`, `NewCaseModal`, `_pane-chrome`,
`AudioRecorderScreen`, `AudioPreviewScreen`, `OcrCaptureScreen`). The PR body repeats "six".
**Only LOW** because the assertion loops the table's own entries, so all seven ARE checked — the
count is prose, not logic. It still misdirects the next reader into thinking one row is spare.
**Fix:** say "the D19 hand-backs" in both places, or correct the number to seven.

## [LOW] The drift guard's schedule comment states a key/row count the table no longer produces

**File:** `.design-sync/check-rn-parity.mjs:287` — *"-> 40 palette keys / 131 rows HERE, which is
what this table produces today"*. Measured at `7bcb553` by importing the module:
`PALETTE_KEYS.length` = **41** and the derived row count = **135** — U4.4 added `scrim` in this same
PR and the U3.1 block above it was not re-totalled. The PR body, the guard's own footer (`:594`)
and `rn-token-parity.test.ts:214`'s DERIVED cardinality all agree on 135, so no gate is at risk;
this comment is the only thing that disagrees. **Fix:** add a `+ U4.4 scrim x 2` line and re-total
to 41 / 135.

---

## What I checked and found sound (no finding)

- **The guard's 135-row union table.** `rn-token-parity.test.ts:214` DERIVES the cardinality from
  the two key lists — no hand-typed total. Both MEMBERSHIP pins (`:108-112` palette, `:114-137`
  tiers) sit in the **ungated** `local invariants` describe, so they run on a box without the phone
  repo; probe U3.1-b confirms the palette one has teeth. Both halves are asserted per key
  (`:197-215`, `:217-236`), the `stuck` reader-collapse check is taken off `checkParity()`'s own
  result rather than re-derived (F17), and `SCHEME_INVARIANT` is imported and typed at
  `PaletteToken` rather than restated.
- **`it.todo` hygiene.** Exactly **4** in the repo, all in
  `palette-contrast.test.ts:740,756,764,770`, each naming its owner in the title (rows 38-40 -> the
  U4.4 report's deferral proposal, with the refuted premise written out at `:723-739`; rows 41 /
  42-44 / 45 -> U5.2). No `.skip`, no `xit`, no `describe.skip` anywhere. The only `skipIf` is the
  RN guard's, and it resolved on this box.
- **The engine coverage gate.** `pnpm test:coverage` exit 0 — 98.29 / 93.33 / 99.84 / 99.06 against
  80 %. The one engine change (`levelFillColor` -> `levelFillBand`, `recorderStatusColor` ->
  `recorderStatusTone`) keeps both band edges, all four phases and the `assertNever` arm pinned
  (`audio-levels.test.ts:105-141`). The PAINT it handed to the UI is HIGH 3 above; the engine half
  is clean, and moving colour out of `engine/` is the right direction, not coverage-boundary gaming.
- **The tripwire's "transitive coverage" claim.** `vitest.setup.ts:41-48` is the only place in the
  tree that claims transitive coverage, it names its four dependents explicitly, and it is
  unchanged by this PR (I-7 is ledger-proposed — not re-filed). I grepped every file in the diff
  for `transitive` and "already driven by" and found **no second claim of the kind**, false or
  otherwise. The one adjacent claim I did find is `status-owners.test.tsx:12-15`, which is HIGH 3.
- **Adoption-scan predicates.** All ARIA-role based or two-declaration needles, never a bare
  identifier; `one-switch-renderer.test.ts:55-59` carries an anti-empty-walk positive control
  (file count > 100 AND the renderer path present), which is the guard a source scan most often
  lacks. Every exemption carries a reason and an owning package.
- **Motion-gate discipline.** Every reduced-motion assertion installs its own `matchMedia` and
  restores it in `afterEach`; `modal-chrome.reduced-motion.test.tsx:65-71` ships POSITIVE CONTROLS
  so "no motion for anyone" cannot masquerade as a fix — the most common way this gate is tested
  wrongly.
- **Style-pin liveness.** Not the weak kind the hazard doc warns about: colours go through a real
  jsdom declaration (`normColor` / `jsdomColor`) and border families are read per-side because
  jsdom does not synthesize the shorthand back — `sheet-chrome.test.tsx:138` proves that with an
  explicit empty-string assertion on `borderColor`. The lit-edge fragments carry three-paint
  consumer cells and negative controls.
- **Determinism.** No `Date.now()` / `Math.random()` in any changed test; no new `toMatchSnapshot`;
  no new module-level mutable mock state; `GlassBottomSheet.test.tsx:126-127` scopes its fake
  timers to one describe and restores them.
- **No tautologies of the U1.2 shape.** Every new recipe suite composes expectations from
  `palette` / `scale` / `GLASS_TIER` and says so (`field-input.test.ts:11-17`,
  `field-input-recipe.test.tsx:23-26`, `sheet-chrome.test.tsx:34-43`, `CentredDialog.test.tsx:17-24`,
  `glass-well-recipe.test.tsx:29-31`). `STATUS_ACCENT` is pinned at literals and `SEVERITY_ACCENT`
  is cross-checked through it (`status.test.ts:25-45`), so neither hand table validates itself.
- **`buttonStyle`'s light-scheme branches** (`button-recipe.ts:172-179`) are unreachable from any
  test because the function reads the module-level `scheme` and takes no parameter, unlike
  `severityTone(severity, s)`. NOT filed: the per-scheme CONSTANTS are pinned in both halves
  (`button-recipe.test.tsx:29-67`), the demo renders only `dark`, and this is the same
  `GLASS_TIER[scheme]` -> `GLASS_TIER.dark` hole U4.1 / U4.2 / U4.3 already carried to the ledger.
  It gets no worse here; recorded so the aggregator can see it is the same family.

## Test Analyzer Summary

CRITICAL: 0 · HIGH: 3 · MEDIUM: 2 · LOW: 2
Verdict: **REVISE**

Behaviorally meaningful coverage: **strong** — ~305 new tests, behaviour-named, with real
assertions, comments citing the finding each pins, positive controls where a guard could go blind,
and 24/24 of the implementers' claimed kills re-confirmed. The three HIGHs are seams between two
correct halves, not weak tests.
Engine coverage gate (80 % on `lib/**` + `engine/**`): **met** — 98.29 / 93.33 / 99.84 / 99.06,
exit 0.
Mock strategy: **at the IO edge** — `@mapbox/search-js-core` in `field-input-recipe.test.tsx:35-41`
is the only new module mock in the diff and it exists solely so the module imports.
Factory usage: **mixed, acceptably** — the new fixtures are UI props (`ExportCaseCardProps`,
`NewCaseFields`, `IncidentLocationValues`) for which no canonical factory exists;
`status-owners.test.tsx:35` uses `blankLocationForm()` where one does. No engine/store literal was
hand-built beside an existing factory.
Setup-shim traps: **none found** — no test claims a live camera / canvas / media path, and every
reduced-motion claim overrides `matchMedia` itself.
Determinism (clock/entropy injected): **yes** — no clock or entropy reaches any new test.

Probes: **38 applied · 1 invalid · 27 KILLED · 9 SURVIVED · restores proven per probe · teardown
verified (`unlinked 549 junction(s) in 2 pass(es)`, `.pnpm` 240 -> 240, exit 0).**

Out-of-lane observations:
- `GlassBottomSheet.tsx:310-314` swallows a `setPointerCapture` failure with an empty catch; the
  comment names jsdom as the reason. Silent-failure lane's call, not mine.
- `buttonStyle` cannot take a scheme parameter while `severityTone` can — a type-design asymmetry
  that makes D2's "both halves" unreachable for one of the two recipes.
