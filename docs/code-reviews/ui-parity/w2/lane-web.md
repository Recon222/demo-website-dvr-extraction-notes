# Lane: web — W2 (phases U2 + U3 + U4), PR #42

## Round 2 (rider delta)

Head reviewed: `feat/uiparity-w2` @ `e511482`. Rider diff `fa76834..e511482`. Shared worktree
`worktrees/w2-wave`, read-only. Scoped to my two round-1 PARTIALs: **F29'** (`bb7182c`) and
**F34'** (`530aaf6`).

Read this round, and nothing more: the two commits in full including their bodies; the three
changed sources at the current SHA; the two precedents they cite, opened at source
(`RadioGroup.tsx:170-195` on the phone, `Layout.ts:155-172`); and `_captures/w2/DIFF.md` §f1-§f5,
which landed at 11:45 with the `after-fixed/` set and did not exist when I wrote round 1.

**Rendered proof, taken rather than waited for.** The coordinator said to judge the mechanism and
not to block on verification's re-cut. I did both: probe worktree `probe-w2r-web-f29` @ `e511482`
(cut + installed 7 s), `pnpm dev --port 3012`, the repo's own Playwright harness at the
verification seat's own settings (1440×1000, DSR 2, `reducedMotion: 'reduce'`, `usePhoneScale()`
pinned to 1.0). Two drivers. Probe tree `git status --short` empty at teardown; removed with
`tools/worktree-remove.ps1` — *"unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 → 240 · OK"*;
branch deleted; both driver scripts deleted from `_pw`.

---

### F29' [HIGH] — **FIXED.** Measured at `e511482`: the overflow is gone, to the pixel

`bb7182c` ships three declarations, and all three are live in the browser:

```
                      btn min-width   label min-width   label overflow-wrap
fc-profile-forensic       0px              0px              break-word
fc-profile-limited        0px              0px              break-word
fc-profile-canvas         0px              0px              break-word
```

The geometry, same pane and same measurement as my round-1 run:

| | round 1 (`250e12f`) | round 2 (`e511482`) |
|---|---|---|
| pane `clientW` / `scrollW` | 342 / **363** | 342 / **342** |
| group `clientW` / `scrollW` | 342 / **363** | 342 / **342** |
| group right vs pane content inset | 413 vs 413 | 413 vs 413 |
| `fc-profile-canvas` right edge | **433.8** (20.8px past) | **413.0** (flush) |
| option widths | 120.3 / 114.9 / 111.6 | **108.7 / 108.7 / 108.7** |
| option heights | 44 / 44 / 44 | **67.1 / 67.1 / 67.1** |
| label box / label `scrollW` | — / 58, 53, 50 | 46.7 / **47, 47, 47** |
| label height | 24.5 (one line) | **49.1 (two lines)** |

`scrollWidth − clientWidth = 0` on both the group and the pane. The third chip's right edge is
now **413.0**, exactly the pane's content inset, and the screenshot confirms every border is
inside the frame — the clipped "Canvas" chip of rounds 0/1 is gone. `scrollW == clientW` on every
label means nothing spills either: the word breaks *inside* its box rather than painting over the
neighbour's border, which is the specific failure mode declaration 3 exists to prevent. The three
cells are equal width and equal height, so `stretch` is doing what the docblock says it does.

**The mechanism argument is correct and the third declaration is load-bearing.** `min-width: auto`
is the default on *every* flex item and there are two nested here — releasing the inner span while
the `<button>` kept its own floor is exactly why F29 half-worked, and my round-1 measurement said
the same thing independently. `overflow-wrap: break-word` does not lower a min-content
contribution, so it could not have substituted for either `minWidth: 0`; equally, without it a
46.7px box against a 47px word would have spilled. Three, not one, and the commit body's own
arithmetic (~48.7px predicted against 46.7px actual — it did not count the 1px borders) was close
enough to be doing real work.

**Docblock honesty — checked at both cited sources, and it holds.**
- The phone precedent is verbatim. `RadioGroup.tsx:178-191` says *"~39px of text budget at 360dp"*,
  *"the overflow becomes a controlled two-line wrap"*, *"`optionsContainer` sets no `alignItems`,
  so the default `stretch` keeps the cells the same height"*, and *"Inert at the 2-up call site …
  where the label never exceeds its box"*. Every clause the docblock leans on is there.
- The verification citation resolves. `_captures/w2/DIFF.md` §f2 does say **x = 781** for the radio
  row against **x = 739** for a normal pane row, on all four settings shots, byte-identical between
  `7bcb553` and `250e12f`. (My first grep missed it only because the file spells it `x = 781`.)
- The capture gate was true when written and is now conservative. The note says *"no capture of
  this fix exists yet … this note claims a mechanism, not an outcome"*. That was correct at
  `bb7182c`; my run above is that outcome, and the next re-cut will be the seat's own. Under-claiming
  is the safe direction and I am not filing it — but the sentence can be retired when the re-cut lands.

This is the third note at these two sites and the first one that separates what was measured from
what was owed. Two rounds ago the comment asserted a fix that half-worked; this one asserted a
mechanism and the mechanism is right.

**Blast radius, checked.** `minWidth: 0` is added only inside the `direction === 'row'` branch, so
the `column` consumers are untouched by construction — and `_pane-chrome.tsx:211-222`'s
`PaneRadioGroup`, the demo's other settings radio, passes `direction="column"` explicitly. The only
other `row` consumer is `RequestedScopeScreen.tsx:57-58` at 2-up: (342−8)/2 = 167px per chip minus
60px of fixed chrome leaves a ~105px label box against "Real Time"/"DVR Time" at ~70px, and both
contain a space, so neither `break-word` nor the shrink ever engages — which is precisely what the
phone's own comment predicts for its 2-up site. No other file changed.

### F34' [MEDIUM] — **FIXED. F34 is now complete, 4 of 4**

`530aaf6` closes the fourth touch-point — the one the fix round left open because the vetted
Owner line assigned it to a seat whose dispatch never named it. Read at the current SHA
(`CentredDialog.tsx:71-77`):

```
export const DIALOG_SHADOWS = {
  dark:  '0 8px 40px rgba(0,0,0,0.5)',            // Layout.ts:165-171
  light: '0 8px 28px rgba(30, 58, 138, 0.15)',    // Layout.ts:158-163
} as const satisfies Record<ColorScheme, string>
export const DIALOG_SHADOW = DIALOG_SHADOWS[scheme]
```

**Verified against the phone at source, both halves, exactly** (`Layout.ts:157-172`):

| | shadowColor | offset | opacity | radius | → CSS |
|---|---|---|---|---|---|
| `dialog.light` | `rgba(30, 58, 138, 0.15)` | `0 8` | 1 | 28 | `0 8px 28px rgba(30, 58, 138, 0.15)` ✓ |
| `dialog.dark` | `#000` | `0 8` | 0.5 | 40 | `0 8px 40px rgba(0,0,0,0.5)` ✓ |

The 0.15 × 1 fold is the same RN→CSS mapping `button-recipe.ts:167-174` documents and
`SHEET_SHADOWS` used. `DIALOG_SHADOW` keeps its name and its dark value, so `dialogSurface`'s
composed `boxShadow` (`:107`) is byte-identical and nothing the demo renders today moves.

Two claims in the commit body that I checked rather than took:
- **The radius differs between halves (40 dark / 28 light) and it is the phone's**, not a
  derivation — `Layout.ts:162` vs `:169`. Confirmed. It is also the one place `DIALOG_SHADOWS`
  could not have been copy-pasted from `SHEET_SHADOWS`, whose light half is also 28 but for its
  own reason.
- **The sign does not flip.** Both halves are `0 8px` (downward), where `SHEET_SHADOWS` is
  `0 -8px` in both. Confirmed at source. Pinning that rather than assuming it is the right call:
  phone §1.5 records the shipped bug where Phase 5 put `sheet` on a dialog and inverted the cast,
  and a `Record` that silently inherited the sheet's sign is exactly how that recurs.

The `as const satisfies Record<ColorScheme, string>` closer also matches the `SHADOW_CARD`
(W1/F19) and `SHEET_SHADOWS` (W2/F34) shape, so all three shadow records in the demo now read the
same way. My round-1 PARTIAL is discharged.

---

### Sanity on the three the re-cut settles — my round-1 browser reads and the captures agree

| Finding | My round 1 (Chromium at `250e12f`) | Re-cut `DIFF.md` | Agreement |
|---|---|---|---|
| **F27** | border vs card **4.35:1**, vs own fill 5.31 | §f3 — worst ground **4.34:1** (was 1.41) | ✓ to rounding, two independent implementations |
| **F43** | `[data-dialog-scrim]` = `rgba(0, 40, 83, 0.9)` | §f4 — deep navy `colors.overlay` on **all five** captured backdrops | ✓ and broader than mine |
| **F41** | action row `gap: 16px`, Cancel / Export Anyway | §f5 — 8 → 16 CSS px on both photographable rows | ✓ |

All three FIXED, confirmed twice by different methods. §f6 reports every non-target shot at or
under its same-sha control, which is the regression check I could not run.

---

## Web Summary (Round 2 — rider delta)

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0 — **no new findings**
Round-1 PARTIALs: **F29' FIXED** (rendered: 363 → 342 scrollWidth, third chip 433.8 → 413.0 flush,
two-line wrap at equal heights, nothing clipped and nothing spilling) · **F34' FIXED** (4/4;
light half exact at phone source, radius asymmetry and no-sign-flip both correct)
Also confirmed FIXED, twice over: **F27**, **F43**, **F41**

Verdict: **APPROVE**

Marketing<->demo isolation: **preserved** — the rider diff touches only `features/demo/ui/**`.
Bundle impact: **none** — no dependency, import-shape or lazy→static change in either commit.
Browser-resource cleanup: **n/a** — no effect, listener, timer or observer touched.
Accessibility: **no regression, one improvement.** The 3-up group no longer paints a control partly
off-frame; every chip is now fully within the phone screen and reachable, and the two-line labels
keep every character on screen rather than ellipsing a profile name.
Style-convention adherence: **correct half; lifted rules intact.** Both riders take the phone's own
values (`RadioGroup.tsx:178-191`'s wrap outcome, `Layout.ts:157-172`'s two shadow halves) rather
than restyling around them — notably, the cheaper alternative of narrowing the chips' lifted
`spacing.md` padding was correctly NOT taken.

Out-of-lane observations:
- The wrap breaks mid-word at 3-up — "Foren/sic", "Limite/d", "Canva/s". Cosmetically poor, and it
  is the phone's own outcome for the same three single-word labels, so I am not filing it. Worth an
  owner glance at the re-cut: if it reads badly, the lever is the label font size or the ring
  margin, not the lifted `spacing.md` padding.
- `_captures/w2/DIFF.md`'s method table flags that `06-p4-media.js`'s `\b` repair lives on
  `master` @ `07c7ec5` but **not** on `feat/uiparity-w2`, carried as the capture worktree's single
  uncommitted edit — *"land it on the wave branch or the next W2 re-cut regresses"*. Not my lane;
  surfacing it because it will fire silently at W3.
- Round 1's foreign stale worktree admin entry `probe-u6.2-redgreen` is still there — it printed
  the same prune error during this round's teardown too. It needs `tools/worktree-remove.ps1`.

---

## Round 1 (fix delta)

Head reviewed: `feat/uiparity-w2` @ `250e12f` (repo HEAD `c1892d1`, one docs-only commit past it).
Fix diff `addd03f..250e12f`. Shared worktree `worktrees/w2-wave`, read-only. Authority: the
**fix-mapping comment on PR #42**, which names all four of my findings —
**F27** (`uiparity/w2-fix-pickers`), **F34** + **F35** + **F46** (`uiparity/w2-fix-sheet`).

Read this round, and nothing more: the mapping comment; `VETTED-r1.md`'s F27/F29/F34/F35/F41/F43/F46
entries; the seven fix commits below in full including their bodies; the four changed sources at the
current SHA; and `u4.3-implementation-report.md:700-713`, which a changed line now depends on.

**Rendered evidence, because the re-cut captures had not landed.** `_captures/w2/` at read time holds
`after/` (still `7bcb553`), a `control-7bcb553/` noise-floor run and `DIFF.md` — **no `after-fixed/`**.
So I drove a real browser at the fix head instead: probe worktree `probe-w2d-web-rendered` @ `250e12f`
(cut + installed 3.8 s), `pnpm dev --port 3011`, and the repo's own Playwright harness
(`docs/planning/demo-phone-ui-parity/verification/lib.js` + `flows.js`, run from `worktrees/_pw`) at
the verification seat's own settings — **1440×1000, deviceScaleFactor 2, `reducedMotion: 'reduce'`**,
so `usePhoneScale()` pins to 1.0 and the phone renders 1:1. Chromium 1.60, real layout, real
compositing. Two drivers, one jsdom probe file, one build. Probe tree `git status --short` empty at
teardown; removed with `tools/worktree-remove.ps1` — *"unlinked 549 junction(s) in 2 pass(es) ·
.pnpm 240 → 240 · OK"*, exit 0; branch deleted; the two driver scripts deleted from `_pw`.

---

### F27 [HIGH, mine] — **FIXED.** Re-sampled from real pixels: 1.33:1 → **5.31:1**

`4b03874` exports `UNCHECKED_MARK_EDGE = colors.textTertiary` (`choice-controls.tsx:69`) and both
controls read it — the ring at `:116`, the box at `:224`. That is the root-cause shape my finding
asked for: one constant, four consumers, one edit.

Measured at `250e12f` on the live Export Hub, same scan line as round 0, same card ground pixel:

```
x=155..175  card          rgb(13,55,99)      <- identical to the round-0 sample
x=176..179  box border    rgb(122,159,196)   <- #7a9fc4, 4 device px = 2 CSS px
x=180..219  box fill      rgb(0,40,83)
x=220..223  box border    rgb(122,159,196)
```

| | border vs card | border vs its own fill | best carrier | floor |
|---|---|---|---|---|
| `7bcb553` (round 0) | 1.18 | 1.33 | **1.33 FAIL** | 3.0 |
| `250e12f` (this round) | **4.35** | **5.31** | **5.31 PASS** | 3.0 |

`getComputedStyle` at the element agrees: `borderTopColor rgb(122, 159, 196)`, `borderTopWidth 2px`,
`backgroundColor rgb(0, 40, 83)`, `aria-checked="false"`. The opaque fill is deliberately kept, and
it no longer has to carry the boundary alone.

**The refutation I asked for is answered better than I asked.** I offered `textTertiary` as "the
smallest change"; the commit takes it and adds the reason I did not have — lifting further would
make an UNSELECTED option louder than the `link` edge of the selected one (6.83). And the pin moved
the way the finding required: `palette-contrast.test.ts` now bounds the RATIO at
`UNCHECKED_MARK_EDGE` against `DARK_GROUNDS`/`LIGHT_GROUNDS`, not the hex. The author then found,
with probe W-F27b, that a constant-composed equality pin moves with the control and **SURVIVED** a
revert to `colors.border` — and shipped `f2303ed` to name the failing value explicitly
(`expect(...).not.toBe(jsdomColor(colors.border))`). That is the same class of self-catch my probe 4
reported, found independently and closed. Divergence from the phone is recorded at the site with
both citations (C.3 rule 4, D5's `primaryDark` precedent) and a phone-side follow-up named for §8.

### F34 [MEDIUM, mine] — **PARTIAL.** Three of four touch-points; `DIALOG_SHADOW` is still a lone dark literal

`18a7033` fixes the three in `sheet-chrome.ts`, exactly as the finding prescribed. Read at the
current SHA and probed:

```
SHEET_SHADOWS.dark   = 0 -8px 40px rgba(0,0,0,0.5)              (unchanged)
SHEET_SHADOWS.light  = 0 -8px 28px rgba(30, 58, 138, 0.15)      (Layout.ts:176-182, folded 0.15 x 1)
SHEET_SHADOW         = SHEET_SHADOWS[scheme]                     (:85 — consumed, not spelled)
accentDot.boxShadow  = scheme === 'dark' ? 0 0 4px rgba(43,140,193,0.4) : undefined   (:227)
title.textShadow     = scheme === 'dark' ? 0 1px 2px rgba(0,0,0,0.3)    : undefined   (:242)
DIALOG_SHADOW        = 0 8px 40px rgba(0,0,0,0.5)                <- STILL A SINGLE DARK LITERAL
```

Nothing the demo renders today moved — every dark value is byte-identical, which is the fix's own
claim and it holds.

**The fourth touch-point is open, and it is a dispatch gap rather than a silent miss.**
`VETTED-r1.md`'s F34 Owner line assigns it explicitly: *"the `DIALOG_SHADOW` touch-point lands with
`aacd7de1d0b63642a` (U4.3 seat, same one-line shape, its file)"*. That seat shipped F41/F43/F47 and
says so in its own report (`u4.3-implementation-report.md:707-713`): *"my dispatch named F41/F43/F47
only. `DIALOG_SHADOW` is the half I own if it comes back … it wants to land in the same commit as
F34's `Record<ColorScheme, …>` rework, which is also not mine."* I accept that as honest disclosure
and hold no fault against either seat — but the value is unfixed and nothing covers it: ledger §95's
row is discharged by **F42**'s guard exclusion (`dd680f6`), which is the ANCHOR, not the missing
light half. `Layout.ts:157-163` supplies it: `0 8px 28px rgba(30, 58, 138, 0.15)`.

I also accept the disclosed **non-kill** on the two `scheme === 'dark' ?` gates. H2/H3 SURVIVED
because the demo renders `dark`, so the gated and bare expressions are identical until a scheme flip
— the same class U1.4 (P10) and U4.1 (P2) already recorded. The light-half value pin (H1) is real and
KILLED. Deleting the deliberately-not-shipped `rgba(0,0,0` blanket scan was the right call for the
reason given: it cannot tell a hard-coded half from one correctly resolved through `SHEET_SHADOWS[scheme]`.

### F35 [MEDIUM, mine] — **FIXED.** Probed in both arms at the fix head

`b9c14f6` takes the exact shape the finding named — `useReducedMotion()` from
`@/lib/hooks/use-reduced-motion`, `animation: reducedMotion ? undefined : 'screenIn 0.3s ease'`
(`PdfPreview.tsx:29,138`). Re-probed at `250e12f`, `matchMedia` stubbed to `matches: true`, one run,
five components:

```
CentredDialog ""  ·  sheet panel ""  ·  sheet scrim ""  ·  ModalShell ""  ·  PdfPreview ""
```

That is the last cell of the table filled in — the same table that read `"screenIn 0.3s ease"` in
round 0. The commit also ships the motion-ON arm positively beside the negative one, citing the
`ExportModal.reduced-motion.test.tsx:44-46` precedent where a negative-only pin stayed green through
a `spin 3s` mutation. Correct, and a stronger pin than the finding asked for.

### F46 [LOW, mine] — **FIXED**, and my suggested alternative is correctly REFUTED

`36a8438` makes the role, the tab stop and the key handler arrive together, all three gated on
`closeLabel` (`GlassBottomSheet.tsx:404-419`): `tabIndex={closeLabel ? 0 : undefined}` and an inlined
Enter/Space handler with `preventDefault()`.

I offered two remedies; the author took the second and rejected the first on evidence I did not have:
`ModalShell` and `CentredDialog` each render a labelled close button elsewhere, so a bare scrim costs
them nothing, whereas **A82's map-filters sheet renders no close control of its own** — for that
caller the scrim IS the announced exit, and dropping the role would have been a loss, not parity.
That is right and I withdraw the alternative. Inlining `switchKeyDown` rather than importing it is
also correct: `controls/` importing `screens/` would close a cycle, since `_shared.tsx` already
imports `controls/header-chrome` — verified at head. No double-fire: a `div` is not a native button,
so Enter/Space reach only the explicit handler, and `preventDefault()` stops Space scrolling.

---

## Coordinator-assigned rendered checks on three findings that are not mine

### F43 [MEDIUM] — **FIXED**, rendered

Live `ExportModal` validation prompt at the fix head, `getComputedStyle` on the shell's own nodes:

```
[data-dialog-scrim]  backgroundColor  rgba(0, 40, 83, 0.9)     <- colors.overlay; was rgba(4,8,14,0.66)
[data-dialog-panel]  role alertdialog · padding 16px · borderRadius 12px
                     boxShadow  rgba(0,0,0,0.25) 0 1px 0 inset,  rgba(0,0,0,0.5) 0 8px 40px
allScrims on screen  exactly one, and it is the dialog's
```

`CentredDialog.tsx:117` reads `background: colors.overlay` at head, so all three centred dialogs move
together. The near-black behind them is now the demo's deep navy, as the finding ruled and as the
phone paints (`DeleteConfirmationModal.tsx:229`, `export/ExportModal.tsx:325,360`).

### F41 [MEDIUM] — **FIXED**, rendered

Same dialog, same read: the action row is `display: flex`, **`gap: 16px`** (`spacing.md`), two
buttons — `Cancel` / `Export Anyway`. Was 8. The phone's value, at the rendered element.

### F29 [HIGH] — **PARTIAL, and this is the round's one open regression.** The 3-up group still overflows, and the third chip is still clipped

`dff6ce2` lands `minWidth: 0` and it is live — `getComputedStyle` on every label reads
`min-width: 0px`, `flex-shrink: 1`. It halved the overflow. **It did not close it.** Measured on the
real Form Fields pane, 378-frame at scale 1.0:

```
pane   settings-pane-form-customization   clientW 342   scrollW 363   contentRight 413
group  role=radiogroup                    clientW 342   scrollW 363   right       413

option              width   right    label scrollW/clientW   label height
fc-profile-forensic 120.3   191.3    58 / 58                 24.5   (selected)
fc-profile-limited  114.9   314.2    53 / 53                 24.5
fc-profile-canvas   111.6   433.8    50 / 50                 24.5   <- 20.8px PAST the pane
```

`scrollW − clientW = 21px` on both the group and the pane, and the screenshot confirms it visually:
**the "Canvas" chip's right border is cut off at the phone frame edge.**

The labels are no longer the constraint — each renders at its natural width on one line
(`scrollW == clientW`, height 24.5), so `minWidth: 0` did release the label floor. What still does not
fit is the BUTTON's own automatic minimum: each option carries `padding: 8px 16px` (32) + a 20px ring
+ 8px ring margin = 60px of fixed chrome before any text, so three options plus two 8px gaps need
≈ 60×3 + 58 + 53 + 50 + 16 = **357** against 342 available. `min-width: 0` on the label does not
lower the `<button>` flex item's own `min-width: auto`.

The docblocks now assert the fix works — `choice-controls.tsx:100-108` (*"`minWidth: 0` is what
releases that floor"*) and `FormFieldsPane.tsx:152-157` (*"this row shipped ~42px past the pane's
right padding"*, past tense). At the fix head it ships ~21px past, so both comments are now half
true in the same way the pre-fix ones were: a comment describing the right idiom over code shipping
part of it. **F29 should not be closed on this evidence.**

Remedies, cheapest first — all one line, none of them a restyle: `minWidth: 0` on the `<button>` too
(the option is itself a flex item of the radiogroup, and that is the floor actually binding); or drop
the ring's 8px `marginRight` to `spacing.xs` at 3-up; or let the row wrap, which the component's own
docblock already says the phone does (*"a controlled two-line wrap"*, `RadioGroup.tsx:184-187`) — the
demo row sets no `flexWrap`, so today it cannot. The two-up and column consumers are unaffected by
any of the three.

---

## Fix-introduced regressions in the blast radii — none found

| Check | Result at `250e12f` |
|---|---|
| Lit-edge scan (comment/string-stripped, all non-test files under `features/demo/ui`) | 16 hits, the **same set** as round 0 — `choice-controls` moved 94 → 131 only because the new constant and docblock sit above it. No new post-spread border shorthand from any of the eleven fix branches. |
| `vitest run` a11y + `controls/__tests__` + `palette-contrast` + `PdfPreview` + `screens/settings` | 20 files, **395 passed / 4 todo, 0 failed** |
| `pnpm build` | exit 0 · `/demo` **107 kB** · `/` 121 · `/beta` 111 · `/features` 110 · `/features/[slug]` 120 · shared 106 — every route identical to round 0 and to `43ccbad` |
| Marketing↔demo wall | fix diff touches no `components/`, `lib/` or `app/` file |
| New listeners / timers | one: F46's `onKeyDown` on the sheet scrim, a React prop on a mounted node — no manual teardown owed |
| F46's new tab stop | first focusable inside the sheet, which is where a close affordance belongs; it does not shadow the panel, which has no `tabIndex` |

---

## Web Summary (Round 1 — fix delta)

CRITICAL: 0 · HIGH: 0 new · MEDIUM: 0 new · LOW: 0 new
My round-0 findings: **F27 FIXED** (measured 1.33 → 5.31 on real pixels) · **F34 PARTIAL** (3/4;
`DIALOG_SHADOW` open, disclosed) · **F35 FIXED** (probed both arms) · **F46 FIXED** (my alternative
refuted on the merits, withdrawn)
Coordinator-assigned rendered checks: **F43 FIXED** · **F41 FIXED** · **F29 PARTIAL — still ~21px of
overflow, third chip clipped at the frame edge**

Verdict: **REVISE** — on F29's residual and F34's fourth touch-point, both one-liners; nothing new
and nothing regressed.

Marketing<->demo isolation: **preserved.**
Bundle impact: **none** — build exit 0, every route byte-identical to round 0.
Browser-resource cleanup: **complete** — no new listener, timer or observer owes a teardown.
Accessibility: **F27's regression closed and re-measured on pixels; F46 now operable from a keyboard.**
F29's clipped chip remains a rendered defect (a control partly off-frame), not a contrast one.
Style-convention adherence: **correct half; lifted rules intact; lit-edge rule unchanged.**

Out-of-lane observations:
- `_captures/w2/after-fixed/` still did not exist when I read; `after/` is `7bcb553`. Every rendered
  figure above is my own browser run at `250e12f`, and F29's overflow is exactly the kind of thing the
  re-cut is for — the verification seat should be able to reproduce the clipped "Canvas" chip directly.
- `tools/worktree-remove.ps1` printed `failed to delete '.git/worktrees/probe-u6.2-redgreen': Directory
  not empty` during MY teardown's `git worktree prune`. That is a **foreign, pre-existing** stale
  admin entry, not mine; my own tree unlinked 549 junctions cleanly and the store stayed 240 → 240.
  Someone should run the script against `probe-u6.2-redgreen`.

---
## Round 0 (initial review)

Head reviewed: `feat/uiparity-w2` @ `00a96c7` (assembly head `7bcb553` + one docs-only commit).
Base: `master` @ `43ccbad`, confirmed an ancestor of HEAD. Diff `43ccbad...HEAD` excluding `docs/`
= **129 files, +9,149 / −1,359**, entirely under `features/demo/` plus `.design-sync/check-rn-parity.mjs`.
Shared worktree `worktrees/w2-wave`, read-only. `gh pr view 42`: `MERGEABLE` / `mergeStateStatus CLEAN`,
no status checks configured.

Fresh seat. Read first: `reviewer-contract.md`, `web-reviewer.md`, `mutation-testing/SKILL.md`,
predecessor lanes `w0/lane-web.md` + `w1/lane-web.md`, `w2/INTEGRATION-u2-assembly.md` +
`INTEGRATION-w2-assembly.md`, the PR body, and the u2.2 / u2.4 / u3.2 / u3.3 / u4.1 / u4.3 / u4.4
implementation reports for the surfaces below. Phone source read at
`extraction_case_notes_react_native_expo` (read-only): `constants/Layout.ts`, `constants/Typography.ts`,
`components/common/Button.tsx`, `TextInput.tsx`, `GlassBottomSheet.tsx`.

**Probe worktree:** `probe-w2-web-recipes` @ `00a96c7`, cut + installed (7.2 s). Four probe files
added and deleted; one source mutation applied and reverted; `git status --short` empty at teardown.
Removed with `tools/worktree-remove.ps1` — *"unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 → 240
· OK"*, exit 0. Branch deleted. jsdom 29.1.1, react-dom 19.2, **both motion modes exercised and
labelled below**.

---

## Gates I ran myself

| Gate | Result |
|---|---|
| `pnpm build` @ HEAD | exit 0. `/demo` First Load **107 kB** — matches the PR body. Marketing unmoved: `/` 121 kB, `/beta` 111 kB, `/features` 110 kB, `/features/[slug]` 120 kB, shared 106 kB. |
| `pnpm build` @ `43ccbad` (same tree, `.next` wiped between) | exit 0, byte-for-byte the same route table. Demo async chunk **559,651 → 561,014 B (+1,363 B, +0.24 %)**; all `static/chunks` **3,995,177 → 3,996,703 B (+1,526 B)**. |
| `vitest run` a11y + `controls/__tests__` + `palette-contrast` @ HEAD | 15 files / 246 passed / 4 todo, 0 failed. |
| The wall (grep for `features/demo` under `components` `app` `lib`) | Only `components/marketing/phone-frame.tsx` (a comment), the guard test itself, and the pre-existing server-side `app/api/extract/route.ts`. **Preserved.** |

Bundle verdict: **no regression**, measured against master in the same tree. This is the first W2
build figure I have seen independently confirmed — `_captures/w2/` carries an `after/` set but no
`before/`, no `DIFF.md` and no build log at the time I read.

---

## Probes run (all verdicts from the runner's exit code)

```
PROBE 1  lit edge across two paints — sheetSurface / dialogSurface / buttonStyle / fieldInputStyle
Target:  features/demo/ui/controls/sheet-chrome.ts:108, controls/CentredDialog.tsx:76,
         controls/button-recipe.ts:232, tokens/field-input.ts:69   (canonical sources, not mirrors)
Method:  one component, four consumers, a state flip between paint 1 and paint 2; six border
         longhands read back per node. Motion mode: ON (harness default, matchMedia.matches=false).
Result:  lit edge HELD on both paints, zero React "conflicting property" warnings (the W1
         vitest.setup tripwire is armed, so a warning would have RED the file).

  paint1  s: rgba(184,212,240,0.14) | rgba(28,78,132,0.6) x3 | 2px | solid
  paint2  s: rgba(184,212,240,0.14) | rgba(28,78,132,0.6) x3 | 2px | solid   <- sheetSurface
  paint1  d: rgba(184,212,240,0.12) | rgba(43,140,193,0.25) x3 | 1px | solid
  paint2  d: rgba(184,212,240,0.12) | rgba(43,140,193,0.25) x3 | 1px | solid <- dialogSurface
  paint1  b: rgba(255,255,255,0.14) | transparent | rgba(0,0,0,0.3) | transparent
  paint2  b: rgb(46,95,151) x2 | transparent x2                              <- buttonStyle disabled
  paint1  f: rgb(28,78,132) x4 | 1px      paint2  f: rgb(255,71,87) x4 | 2px <- fieldInputStyle error

PROBE 2  reduced-motion gate on every new/changed overlay entrance
Method:  window.matchMedia stubbed to matches=true for prefers-reduced-motion, restored in
         afterAll. Motion mode: REDUCED.
Result:  CentredDialog ""  ·  GlassBottomSheet panel ""  ·  its scrim ""  ·  ModalShell ""
         PdfPreview "screenIn 0.3s ease"   <- the one that does not gate; see MEDIUM 2.
         Motion-ON control arm: "screenIn 0.2s ease" / "sheetUp 260ms ease" / "termFadeIn 260ms ease".

PROBE 3  CentredDialog focus restore
Method:  host with a real opener; pointerdown + click to arm the capture-phase tracker, Escape to
         dismiss. Motion mode: ON.
Result:  after open activeElement = the dialog panel; after Escape activeElement = the opener.
         The capture-phase mechanism works as documented.

PROBE 4  MUTATION — is the unchecked checkbox's border colour pinned by VALUE or by CONTRAST?
Target:  features/demo/ui/controls/choice-controls.tsx:180 (canonical source)
Claimed pin: features/demo/ui/controls/__tests__/choice-controls.test.tsx:145
Mutation:    borderColor: filled ? colors.primary : colors.border
          -> borderColor: filled ? colors.primary : 'rgba(1, 2, 3, 0.9)'
Result:  **KILLED** — 1 failed / 41. AssertionError: expected 'rgba(1, 2, 3, 0.9)' to be
         'rgb(28, 78, 132)'. The HEX is pinned. **Nothing pins the RATIO**, which is the whole of
         HIGH 1 below.
Restore: git checkout -- + git status --short empty, suite green.

PROBE 5  cost of the new per-render recipe functions (the brief asked me to measure, not assume)
Method:  200k iterations after a 20k warm-up, in-suite.
Result:  buttonStyle() 0.156 us/call (6,410/ms) · disabled danger/small 0.128 us · fieldInputStyle()
         0.039 us · severityTone+statusBadgeStyle 0.033 us · a bare 20-key object literal 0.019 us.
         The densest demo screen renders ~10 buttons -> ~1.6 us per render, ~0.01 % of a 16.7 ms
         frame. **Not a finding.** buttonStyle() returning a fresh object is also harmless to
         react-dom, which diffs style objects per property, not by identity; no React.memo child
         in this diff receives one.
```

Zero unexplained survivors. Probe 4's KILL is reported because it is *evidence for* a finding, not
against one.

---

## Findings

```
[HIGH] The unchecked / unselected selection mark lost its only visual carrier — measured
       4.35:1 -> 1.33:1 against the surface it sits on (WCAG 2.1 SC 1.4.11)
File: features/demo/ui/controls/choice-controls.tsx:180-181 (CheckboxBox), :79 + :94 + :111 (RadioOption)
Consumers: features/demo/ui/screens/export/ExportCaseCard.tsx:161 ·
           features/demo/ui/screens/RequestedScopeScreen.tsx:57-58 ·
           features/demo/ui/screens/settings/panes/FormFieldsPane.tsx:158 ·
           features/demo/ui/screens/settings/panes/_pane-chrome.tsx:216
Issue: CheckboxBox paints its UNCHECKED state as an opaque colors.background (#002853) square
  with a 2px colors.border (#1c4e84) ring and NO glyph (GLYPH.false = null). On the Export Hub
  card that square is the entire visual existence of the "Select all locations in <case>" control —
  it has no visible label, and aria-label is not a pixel. Both of its edges now measure ~1.2-1.4:1
  against the glass card behind it, i.e. effectively invisible to a low-vision visitor on /demo
  -> Export tab. Master rendered the same control with a TRANSPARENT fill and a #7a9fc4 ring at
  3.87-4.41:1, so this is a regression from PASS to FAIL, not an inherited gap.
Evidence: MEASURED TWICE, and the two agree.
  (a) Pixels sampled from THIS WAVE OWN capture,
      worktrees/_captures/w2/after/08-export/02-s1-export-hub-collapsed.png, row y=230 (2x scale):
        x=92..95   card       rgb(13,55,99)
        x=96..99   box border rgb(20,66,116)   <- colors.border, composited
        x=100..139 box fill   rgb(6,46,91)     <- colors.background
        x=140..143 box border rgb(20,66,116)
      border vs card 1.18:1 · border vs its own fill 1.33:1 · fill vs card 1.13:1.
      Best available carrier = **1.33:1**, floor 3.0.
      The same card pixel against MASTER #7a9fc4 ring = **4.35:1**.
  (b) Independent arithmetic on the composited tiers (card rgba(14,57,101,0.85) ->
      rgba(23,65,110,0.92) and elevated rgba(23,65,110,0.88) -> rgba(14,57,101,0.95) over
      #002853): head 1.20-1.44 on all four stops, master 3.87-4.41 on all four.
  The rule is already written INSIDE this wave, at controls/button-recipe.ts:190-192:
  "link and not primary: the 1px outline is the ONLY mark of a control here, so 1.4.11 3:1
  bites" — and the phone repeats it verbatim at Button.tsx:145-152. The outline BUTTON got that
  reasoning applied (7.65:1); the checkbox and the radio ring, which are the same shape of argument,
  did not. ui/__tests__/palette-contrast.test.ts grew 237 lines this wave and has rows for the
  four status accents (22-25) and every text-on-fill pairing, but no row for a selection control
  boundary — and PROBE 4 shows the only pin on this value asserts the HEX, so it stayed green
  through a 3.3x contrast drop.
  RadioOption is the same root cause with one mitigation: its unselected edge is colors.border
  at 1.26-1.44 where master used #7a9fc4, but each option carries a visible 16px label at 10.60:1
  and the SELECTED option is unambiguous at 6.83:1, so the option remains findable. Folded here
  rather than filed separately because one edit to choice-controls.tsx settles both.
Fix: give the unchecked/unselected edge a token that clears 3:1 on the demo dark grounds —
  colors.textTertiary (#7a9fc4, the value master shipped, 3.87-4.41) is the smallest change and
  is already the demo ring colour elsewhere; colors.borderLight (#2e5f97) does NOT clear it
  (~1.9). Move the pin at choice-controls.test.tsx:145 with the value, and add a 1.4.11 row to
  palette-contrast.test.ts bounding the unchecked mark against the card and elevated tiers so the
  next re-point cannot repeat this silently. If the owner rules that the phone colors.border is
  binding, that is a deliberate divergence that needs a ledger row with a trigger — not the current
  state, where nothing records it and nothing observes it.
```

```
[MEDIUM] Four new sheet/dialog chrome values ship the phone DARK-ONLY treatment unconditionally,
         against D2 and against the both-halves precedent this same wave follows for buttons
File: features/demo/ui/controls/sheet-chrome.ts:74 (SHEET_SHADOW), :214 (sheetAccentDot.boxShadow),
      :228 (sheetTitle.textShadow) · features/demo/ui/controls/CentredDialog.tsx:60 (DIALOG_SHADOW)
Issue: each of the four is a single hard-coded dark value on a fragment that otherwise resolves
  through GLASS_TIER[scheme] / colors. Flipping tokens/palette.ts one `scheme` site — the
  documented one-line light switch — repaints the gradients and borders and leaves every sheet and
  dialog casting a pure-black rgba(0,0,0,0.5) 40px shadow, a black title text-shadow and a dark
  accent glow onto a pale surface. That is a config flip on a path with no reviewer on the day it
  fires.
Evidence: the phone gates two of them explicitly — GlassBottomSheet.tsx:326-332 and :339-343
  are both inside `isDark && {...}` — and ships light halves for the other two:
  Layout.ts:157-163 shadow.dialog.light = rgba(30,58,138,0.15) offset 0 8 radius 28, and
  Layout.ts:175-181 shadow.sheet.light = the same colour at offset 0 -8.
  The repo already ruled on this shape: W1/F19 gave SHADOW_CARD both halves
  (glass-tokens.ts:125-128, `as const satisfies Record<ColorScheme, string>`) for exactly this
  reason, and controls/button-recipe.ts:170-179 — landed in THIS wave — branches its boxShadow
  and textShadow on `scheme` correctly. The PR body lists D2 ("both halves throughout") as applied.
  Ledger §95 covers the absence of a drift anchor on the hand-ported shadows; it does not cover a
  missing light half, so this is not a re-file.
Fix: make the four Record<ColorScheme, ...> and read [scheme], exactly as SHADOW_CARD and
  buttonStyle do — dark values unchanged, so nothing the demo renders today moves. The two
  `isDark &&` ones become `scheme === 'dark' ? ... : undefined`.
```

```
[MEDIUM] PdfPreview is the one `screenIn` entrance the U4.2 reduced-motion sweep left behind, and
         after this wave it is the only ungated animation in the demo
File: features/demo/ui/chrome/PdfPreview.tsx:136
Issue: `animation: 'screenIn 0.3s ease'` is written unconditionally. `screenIn` translates 8px
  (ui/demo.css:92-95), ui/demo.css carries no prefers-reduced-motion block at all, and
  app/css/style.css:248-258 block is class-matched (attribute-substring class selectors plus the
  .animate-* utilities) so it cannot reach an inline `style`. A visitor with the OS preference set
  gets the translate on the PDF preview and on nothing else in the demo.
Evidence: PROBE 2, reduced-motion arm, one run, four components:
    CentredDialog ""  ·  GlassBottomSheet panel ""  ·  GlassBottomSheet scrim ""  ·  ModalShell ""
    PdfPreview "screenIn 0.3s ease"
  The line itself is untouched by this diff, so this is a sweep residual rather than a new defect —
  but the file IS in the diff (it adopts buttonStyle at :170-171), the PR body claims U4.2
  "gated screenIn", and the two packages that could have taken it each pointed at the other:
  reports/u4.3-implementation-report.md:135 marks PdfPreview "no — U4.4 file", and
  reports/u4.4-implementation-report.md only reaches its close chip (R-4/A90). It fell in the gap,
  it is now a singleton, and it is a one-line fix in a file the wave already opens.
Fix: `const reducedMotion = useReducedMotion()` from @/lib/hooks/use-reduced-motion (the hook the
  other three shells in this wave took), then
  `animation: reducedMotion ? undefined : 'screenIn 0.3s ease'` — the identical shape as
  CentredDialog.tsx:320. Alternatively a ledger row with a trigger; the current state (neither) is
  what makes it a finding.
```

```
[LOW] GlassBottomSheet scrim becomes role="button" with no tabIndex and no key handler the
      moment a caller passes `closeLabel`
File: features/demo/ui/controls/GlassBottomSheet.tsx:391-393
Issue: `role={closeLabel ? 'button' : undefined}` puts a button in the accessibility tree that no
  keyboard visitor can focus or activate — AT announces a control that is not operable from the
  keyboard. Today nothing reaches it: `closeLabel` has ZERO production callers (only
  controls/__tests__/GlassBottomSheet.test.tsx:483), so this is latent, not live. It is filed
  because the docblock at :135-143 explicitly invites matrix A82 map-filters sheet to pass
  it — a sheet the same docblock says has no visible close control — and that adoption lands in a
  later package where nobody will be re-reading this line.
Evidence: WCAG 2.1 SC 4.1.2 (name / role / VALUE, i.e. operability of the exposed role) and the
  in-repo idiom: every other dismiss affordance in the demo is a real `button type="button"`
  (inputs/PickerSheet.tsx:50, screens/_shared.tsx:308). Escape does close the sheet (:250-251),
  so nobody is trapped — hence LOW, not HIGH.
Fix: either drop the `role` and keep aria-label off the scrim entirely (a click-only backdrop with
  no role is what master PickerSheet shipped and what nothing announces wrongly), or give it
  tabIndex={0} plus the repo switchKeyDown equivalent when `closeLabel` is set. Decide it at the
  seam now rather than in A82 diff.
```

---

## What I checked and found clean

- **The wall.** No `components/`, `lib/` or `app/(default)/` file in the diff at all. No new
  @/features/demo import anywhere in marketing. `app/layout.tsx` untouched — no chrome hoist.
- **Lazy heavy deps.** mapbox-gl and pdfjs-dist are still `await import`ed inside their
  effect/function; nothing in this diff moves either to a static top-level import. `package.json`
  unchanged — no new dependency, no barrel import.
- **THE LIT-EDGE RULE, swept repo-wide, not sampled.** I wrote a comment/string-stripped brace-depth
  scanner over every non-test file under features/demo/ui and listed every border-family SHORTHAND
  written after a spread in the same object literal. Sixteen hits; **five are in this diff** and
  none of them spreads a lit-edge fragment:
  choice-controls.tsx:94 (the spread is a flex/width ternary), TimeWheel.tsx:184-185 (`overlay` =
  position keys only), AudioRecorderScreen.tsx:156 (`pillButton`, whose `border` shorthand precedes
  the override and neither value ever changes), ExportCaseCard.tsx:134 (`wrapper` carries no border
  key), ExportLocationRow.tsx:90 (`indicatorBase` carries borderWidth/borderStyle longhands and no
  side colour). The other eleven are pre-existing files this diff does not touch. PROBE 1 then
  confirmed the four new recipes hold their edges across a real update.
- **glassWell composition.** Dropdown.tsx:172 writes `{ padding: 5, ...glassWell }` — spread LAST.
  glassWell (glass-tokens.ts:324-333) carries no `padding` key, so the phone Picker.tsx:363 value
  survives, and the fragment is longhands-only.
- **Resource cleanup.** Five listeners/timers added, all accounted for. CentredDialog two
  capture-phase document listeners are installed once at module scope behind
  `typeof document === 'undefined' || tracking` — SSR-safe, idempotent, page-lifetime by design, not
  a per-mount leak. GlassBottomSheet setTimeout clears on re-open and unmount (:245); both Escape
  listeners remove (:263, :254); setPointerCapture is implicitly released on pointerup/pointercancel
  and both are wired. No createObjectURL, no observer, no new fetch.
- **Render cost / store discipline.** DemoExperience.tsx changed by 3 lines (one button adopting the
  recipe). No new state lifted into the bridge, no new useStore subscription, no whole-state
  selector, no selector returning a fresh reference. PROBE 5 priced the recipe functions at noise.
  GlassBottomSheet keeps the drag in a ref and only setDragY once the pointer is claimed, which is
  the right call. endDrag reads getBoundingClientRect() once, on pointerup — no thrash. Every
  animation in the diff is transform or opacity.
- **Recipe fidelity vs the phone, read at source.** Layout.spacing / borderRadius / touchTarget /
  iconSize are value-identical to constants/Layout.ts. buttonStyle three sizes match
  Button.tsx:96-110 exactly (8px 16px / 44, 16px 24px / 48, 24px 32px / 56), label sizes match
  Typography.fontSize.sm/base/lg (14/16/18), borderRadius.control and borderWidth 1 on the base
  match :90-91, all five variants fills and edges match :114-161, and both the primary boxShadow
  and its textShadow fold RN five-prop form correctly in BOTH halves (0 6px 20px rgba(0,0,0,0.45)
  and rgba(30,58,138,0.22); 0 1px 1px rgba(255,255,255,0.06) and rgba(0,0,0,0.1)). fieldInputStyle
  matches TextInput.tsx:165-175 (radius 8, 16/16 padding, fontSize 16, minHeight 44, error
  borderWidth 2). Sheet chrome matches GlassBottomSheet.tsx:491-551 (radius 22 top-only,
  borderWidth 1 + borderTopWidth 2, handle 40x4 at radius full, header 8/16/12, dot 6x6, title
  14/700/0.3/uppercase, subtitle 12/400/mt2). Dialog and sheet shadows match Layout.ts:165-190 in
  the dark half. The maxWidth non-port is arithmetically correct: 378 minus 2x24 = 330, under both
  the 340 and 380 caps.
- **Contrast of everything else the wave introduced.** Independently recomputed (WCAG 2.1,
  source-over composited, my own implementation) — every figure the implementers claimed reproduces
  to the hundredth: badge text on the four *Light fills 5.94 / 5.40 / 5.93 / 5.79 (floor 4.5);
  primary CTA label 5.80 top stop and 8.32 bottom; secondary label 10.60; danger label on DangerFill
  6.39; outline/ghost label link 7.65 on card and 6.80 on modal; checkbox glyph onPrimary on primary
  3.73 (non-text floor 3.0); selected radio label and ring 6.83 on the composited 8 percent wash;
  SAMPLE_TINT outline label 6.47. The disabled label (disabledText on colors.disabled, 1.59) is
  correctly left alone — WCAG 1.4.3 exempts inactive components and button-recipe.ts:149-151 says
  so, citing the phone declining the same branches.
- **A11y idioms.** Toggle (_shared.tsx:716-728) keeps role="switch" + aria-checked + aria-label +
  tabIndex 0 + Enter/Space through switchKeyDown, and the three hand-rolled copies it replaces
  (GpsCaptureControl, TimeOffsetScreen DVR-DST, FormFieldsPane) all had strictly less. The three
  consolidated dialogs were role="alertdialog" aria-modal="true" at master and still are. Banner
  carries role="alert" plus an explicit aria-live plus aria-hidden on its icon.
  RequestedScopeScreen segmented pair GAINS role="radiogroup"/role="radio" where it had none. The
  ModalShell and GlassBottomSheet shells have no focus move/restore — **and neither did the
  _shared.tsx ModalShell or PickerSheet at 43ccbad**, verified by grep at both SHAs, so that is
  inherited, not introduced. CentredDialog is a strict improvement: the two mount-time
  document.activeElement reads its own docblock calls broken are gone, and PROBE 3 shows the
  capture-phase survivor restores focus correctly.
- **Style-convention half.** Zero `className=` added anywhere under features/demo. ui/demo.css is
  not in the diff — no new global rule, no new keyframe, no unscoped selector. Frame math,
  PhoneFrame and the marketing copy untouched. No new img element.
- **Escape stacking.** CentredDialog openDialogs mount-order stack correctly answers Escape on the
  topmost dialog only. It does not make deferred §19 (an Escape closing a modal and its picker
  together) worse: GlassBottomSheet and CentredDialog still listen on document independently, which
  is the same shape master shipped with PickerSheet + AlertDialog. Not re-filed.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 1 |

Marketing<->demo isolation: **preserved** — no marketing file in the diff; the wall grep is clean at
both SHAs; app/layout.tsx untouched.

Bundle impact: **none, measured.** /demo First Load 107 kB at HEAD and at 43ccbad; the demo async
chunk grew 1,363 B (+0.24 %) and all static/chunks 1,526 B, across a +9,149-line diff. No dependency,
import-shape or lazy-to-static change.

Browser-resource cleanup: **complete.** Every effect-scoped listener and timer added has a matching
teardown; the two module-scope capture listeners are idempotent, SSR-guarded and page-lifetime by
design.

Accessibility: **one regression found** — HIGH 1, the unchecked selection mark 4.35 -> 1.33 non-text
contrast drop. Everything else is neutral-or-better; the dialog focus consolidation is a real
improvement.

Style-convention adherence: **correct half; lifted rules intact.** Inline CSSProperties throughout,
no Tailwind entered features/demo/ui, no lifted pixel value or frame math moved, demo.css untouched.
The lit-edge rule holds on every new consumer, probed.

Verdict: **REVISE**

Notes: the recipes are a high-fidelity port — every geometry and every contrast figure I re-derived
from the phone source reproduces exactly. The one thing the wave own arithmetic did not cover is the
boundary of the control that has no other carrier.

Out-of-lane observations:
- Captures at _captures/w2/ are `after/` only (6 of 9 groups); no `before/`, no DIFF.md, no build
  log. My bundle figures above are the first independently-run ones for this wave; the pixel evidence
  in HIGH 1 comes from the `after/` set and would be twice as strong with a `before/` beside it.
- `closeLabel` (GlassBottomSheet.tsx:144) has no production caller — a prop shipped for a future
  package. Type-design call whether that is worth naming; I only judged its a11y consequence.
- ExportCaseCard.tsx:147 uses the real `disabled` attribute where the demo stated house rule
  (_shared.tsx:663-667) is aria-disabled plus an inert handler so focus is never stranded. It is
  byte-identical to master, so out of scope for this diff — noting it for whichever package reopens
  that file.
- RadioOption groups are Tab-navigable but not arrow-navigable (no roving tabIndex), which is an APG
  deviation rather than a WCAG one. Master already shipped that shape at two sites and the third had
  no radio role at all, so the diff is a net improvement; not filed.
