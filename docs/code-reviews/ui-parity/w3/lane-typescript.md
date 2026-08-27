# Lane: typescript — W3

## Round 1 (fix delta)

**Head:** `feat/uiparity-w3` @ `eb98295` · fix-merge `3dc8676` · fix diff `7d0bf57..3dc8676`.
**Authority:** the fix-mapping comment on PR #43. My two IDs appear there: **F55** (`w3-fix-u64a`
"pins → `severityTone`, split opacity half" + `w3-fix-u64b` "F55 lines") and **F71** (`w3-fix-u62`).
**Mode:** warm — delta only. Nothing re-read in full; no fix confirmed from memory, every one probed
or read at the current SHA.
**Probe worktree:** `probe-w3d-ts-f55` @ `3dc8676`, own install, all mutations restored with
`git status` proven empty, torn down (549 junctions unlinked, main `.pnpm` store intact, branch
deleted). Provenance: canonical source in every probe.

**Cold gates at `3dc8676`, reproduced in my own tree:**

| Gate | Exit | Result |
|---|---|---|
| `npx tsc --noEmit --incremental false` | **0** | clean |
| `npx vitest run` | **0** | **307 files, 4,235 passed + 2 todo** |

---

### Prior findings — status

| F | r1 sev | Commit | Status | Evidence |
|---|---|---|---|---|
| **F55** | MEDIUM | `121a82c` (u6.4a) + `d7f6a06` (u6.4b) | **FIXED** | probe below — census 4 files → 2 |
| **F71** | LOW | `6fddebf` (u6.2) | **FIXED** | probe below — r1's SURVIVED mutation now KILLS |

#### F55 — FIXED (probed, not read)

Re-ran **the identical r1 mutation** on the canonical source: `features/demo/ui/tokens/status.ts:121`,
`severityTone`'s `background` re-pointed to the literal `'#101820'`. Full suite:

```
r1 (13827de)                                    r1-fix (3dc8676)
FAIL tokens/__tests__/status.test.ts            FAIL tokens/__tests__/status.test.ts
FAIL __tests__/palette-contrast.test.ts         FAIL __tests__/palette-contrast.test.ts
FAIL __tests__/field-recipe-sweep.test.tsx      -- follows the seam --
FAIL screens/__tests__/status-owners.test.tsx   -- follows the seam --
Tests  6 failed | 4188 passed                   Tests  4 failed | 4231 passed
```

Both of my touch-points dropped out of the absolute-anchor set; the only two files left holding an
absolute value for this seam are the two that should (`status.test.ts`, `palette-contrast.test.ts`).
That is exactly the end state my Fix line prescribed.

**And the fix did not trade protection away** — I probed the half that the palette spelling used to
carry. `_pane-chrome.tsx:249` `backgroundColor: t.background` → `withAlpha(colors.warning, 0.09)`
(the retired translucent recipe): **3 tests failed across `status-owners.test.tsx` and
`pane-chrome.test.tsx`. KILLED.** The "split opacity half" the mapping claims is real — `d7f6a06`
added a standalone `expect(box().getAttribute('style')).not.toContain('rgba')` so the anti-wash
guarantee now has its own line instead of riding on the fill pin.

**The integrator's positive/negative split held the merge**, checked at source in both files: POSITIVE
assertions read `severityTone(...)` (`field-recipe-sweep.test.tsx:471,481`; `status-owners.test.tsx:95,251,253`);
NEGATIVE assertions stay in palette terms and say why (`status-owners.test.tsx:92` "a seam re-point
must not silently redefine what *wrong* means"); the opacity assertions are palette-independent.
My r1 second-order point is also addressed rather than dropped — `field-recipe-sweep.test.tsx:473-477`
now credits the `not.toContain('rgba')` line as the anti-wash guard, which is what my finding said the
old comment had mis-attributed to its neighbour.

#### F71 — FIXED (probed)

`pane-chrome.test.tsx:158-162` now reads `querySelector('svg')!.innerHTML` on both sides, with the
reason recorded. Re-ran **the identical r1 mutation** — `Banner.tsx:126` `BannerIcon` returns `null`,
so both glyphs vanish:

- r1: `1 passed` — **SURVIVED**
- r1-fix: `1 failed` — **KILLED**

The one direction the pin was blind in is now covered, and the isolating direction (only `PaneNote`
loses its glyph) still kills, as it did in r1.

---

### Type fallout in the fixes' blast radius (coordinator's four asks)

**F65 — engine `ConfidenceLevel` signature. Clean, zero remaining `color: string` consumers.**
`engine/logic/ocr.ts` dropped `color` from `getConfidenceLevel`'s return, moving a presentation
decision out of the engine (correct direction for engine purity). I swept every consumer:
`DemoExperience.tsx:2002`, `OcrCaptureScreen.tsx:13,30,132`, plus three test files — **no `.color`
read survives anywhere** (`grep` for `getConfidenceLevel(...).color` / `conf.color` / `confidence.color`
returns nothing), and cold `tsc` is exit 0, so no consumer reads a property the type no longer has.
The band→colour map now lives at `OcrCaptureScreen.tsx:132` as
`CONFIDENCE_COLOR: Record<ConfidenceLevel, string>` — an annotated `Record`, so a fifth band is a
`TS2741` at the table. Five fixtures updated consistently; `ocr.test.ts:90` and
`OcrCaptureScreen.test.tsx:142` both pin `Object.keys(...).sort()` to `['level','message']`, which is
what stops the colour creeping back in.

**F61 — ~50 new closers. All correct; readonly is self-verifying.**
72 `as const satisfies` added across non-test source in the fix range, and **zero** bare `satisfies`
without `as const` (the five diff hits matching that pattern are all comment prose, checked line by
line). The one shape that needed care is `OverlayHeader.tsx:142-145`, where an annotated
`Record<OverlayHeaderVariant, {...}>` became a Record-FORM closer — it kept exhaustiveness
(`as const satisfies Record<OverlayHeaderVariant, {...}>`), so a missing variant is still a compile
error, and gained readonly. No probe needed for the readonly half: `overlay-header.test.tsx:207-208`
already carries `@ts-expect-error CONTROL is readonly`, so dropping `as const` would turn that into an
unused `@ts-expect-error` (`TS2578`) and red the typecheck — and cold `tsc` is exit 0.

**F74 — discriminated pair. Correct shape, and it bites. Probed.**
`OverlayHeaderProps` is now `OverlayHeaderBase & OverlayHeaderControl` with
`{ onBack(): void; backLabel: string } | { onBack?: undefined; backLabel?: undefined }`. The
`onBack?: undefined` arm is the part that makes it **exhaustive rather than merely additive** —
without it `{ onBack: fn }` still matches the no-control arm by width subtyping, and the docblock
says so. Probe: deleted `backLabel` from `MediaCaptureScreen.tsx:520-524`, a caller that passes
`onBack` → **`TS2322` at `:521`. KILLED.** This closes the exact latent hole I filed as an r1
out-of-lane observation (an icon-only button with `aria-label={undefined}` — no accessible name),
so that observation is discharged, not carried.

**§119 — cold `tsc --noEmit --noUnusedLocals` at `3dc8676`: 6 diagnostics. All pre-existing; 0 fix-introduced.**

| File:line | Code | Symbol | Provenance |
|---|---|---|---|
| `engine/store/create-store.ts:20` | TS6196 | `MediaKind` | `9f4810f`, 2026-06-27 (file still at `lib/demo/store/`) |
| `engine/logic/__tests__/boot.test.ts:28` | TS6196 | `_PosterAloneIsNotAVideo` | untouched in fix range |
| `ui/controls/__tests__/banner.test.tsx:8` | TS6133 | `StatusSeverity` | `7cf2caa` — **W2's own F26 fix**, on master |
| `ui/controls/__tests__/banner.test.tsx:107` | TS6133 | `icon` | `cb6e606` |
| `ui/controls/__tests__/header-chrome.test.tsx:45` | TS6133 | `_f20` | untouched in fix range |
| `ui/screens/__tests__/CaseActionsSheet.test.tsx:5` | TS6133 | `blankLocationForm` | untouched in fix range |

Blamed each line individually rather than inferring from the diff. Five of six are in `__tests__`; the
only source hit is a two-month-old unused type import. The single fix-range commit touching
`banner.test.tsx` is `209648d` (F69 docblock prose) and it introduced neither of that file's two.
Two are `_`-prefixed deliberate placeholders, which `noUnusedLocals` does not exempt without
`noUnusedParameters` conventions — worth knowing before anyone proposes turning the flag on.

---

### Fix-introduced regressions in my lane: none found

- **Architecture, re-swept at `3dc8676`** (not carried from r1): `useStore` outside `DemoExperience`
  **0** · React / `'use client'` under `engine/` **0** · `features/demo/index.ts` +
  `engine/index.ts` diff vs `master` **0 lines** (public barrel still unwidened after ~50 fix commits)
  · demo imports in `components/` + `app/(default)/` + `lib/` **0** (the two `grep` hits are a
  docblock reference and the guard test's own title, neither an import).
- **New smells in the fix range** (non-test source): zero `as any`, `@ts-ignore`, `Date.now()`,
  `Math.random()`, `console.log`, `forEach(async)`.
- **F64's new `useOpenerFocusReturn`** (`ui/primitives/useOpenerFocusReturn.ts`) is new shared logic in
  the blast radius, so I read it in full. It is sound: the module-scope tracker is SSR-guarded
  (`typeof document === 'undefined'`) and idempotent (`tracking` latch), so it installs exactly two
  capture listeners for the app's lifetime rather than leaking per mount; the stale-singleton risk is
  closed at both ends (`activationOrigin?.isConnected` at capture-read AND `canTakeFocus` at restore);
  the `[focusRef, enabled]` deps are justified at the site and `focusRef` is a stable ref object; the
  one cast, `(el as Partial<HTMLButtonElement>).disabled`, is a legal overlap narrowing that yields
  `boolean | undefined`, not an `any` escape. No finding.
- **F73** touches `MapControls`' proximity live region, not `MapFiltersSheet`'s `useEffect` that I
  cleared in r1; the change is the same mount-before-change idiom I approved there. No regression.

### New findings this round

None.

---

## TypeScript Lane Summary (Round 1 — fix delta)
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0 (new)
Prior: **F55 FIXED · F71 FIXED** — 2 of 2, both proven by re-running the r1 mutation.
Verdict: **APPROVE**

Store-bridge integrity: preserved · Engine purity: preserved (F65 moved a colour OUT of the engine)
Barrel + marketing/demo isolation: preserved · Determinism seam: preserved

§119 cold `tsc --noUnusedLocals`: **6** — all pre-existing, 0 fix-introduced (table above).
Probes this round: 4 — F55 seam re-tint (census 4→2), F55 anti-wash re-roll (KILLED), F71
`BannerIcon`→null (SURVIVED in r1 → **KILLED** now), F74 dropped `backLabel` (**KILLED**, TS2322).
All restored, `git status` proven empty; worktree torn down.
Ledger rows proposed: none.
Out-of-lane observations: **r1's OverlayHeader `backLabel` observation is DISCHARGED by F74.** The
`CompletionScreen.tsx:203-205` Export-Zip `title`-only reason remains open and is web's, not mine.

---

## Round 0 (initial review) — retained for reference

**Scope:** `git diff master...13827de` — 167 files, +16,514/−1,582, 12 packages.
**Mode:** code review. **Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`.
**My question:** does this TS code introduce a real bug, a type-safety hole, an error-swallowing
path, an RSC boundary violation, or a breach of the demo's architectural contract?

**Gates reproduced independently** (probe worktree `probe-w3r-typescript-f26` @ `13827de`, own
`pnpm install --prefer-offline`, torn down via `tools/worktree-remove.ps1` — 549 junctions unlinked,
main `.pnpm` store intact at 240 entries, branch deleted):

| Gate | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit --incremental false` | **0** | clean, whole repo |
| Tests | `npx vitest run` | **0** | 305 files, 4,188 passed + 2 todo |
| RN parity | `node .design-sync/check-rn-parity.mjs` | **0** | 143 anchor rows |

---

## CRITICAL

None.

## HIGH

None.

---

## MEDIUM

### [MEDIUM] Two W3-new pins spell a `severityTone()` fill as a raw `*Light` palette token — the F26 shape the integrator declared a recurring class and fixed three siblings of, in this same wave

**File:**
- `features/demo/ui/__tests__/field-recipe-sweep.test.tsx:471` (and its foreground twin `:478`) — new file, `833bc86` (U6.4a)
- `features/demo/ui/screens/__tests__/status-owners.test.tsx:186` — new pin, `2cd4957` (U6.2)

**Issue.** Both assert a rendered `Banner` / `PaneNote` fill in *palette* terms rather than through
the seam the component actually reads. `Banner.tsx:203` resolves `const tone = severityTone(severity)`
and spends `tone.background`; `_pane-chrome.tsx:225`'s `PaneNote` does the same. Spelling the expected
value as `colors.errorLight` / `colors.warningLight` re-derives the seam's output at the assertion
site, so a re-point of `severityTone` — the single edit the seam exists to make possible, and D2's
one-site scheme flip — reds these two files with messages that blame the wrong component. Neither
test's stated claim becomes false under that edit.

**Evidence.**

*Probe 1 (mine; canonical source; dedicated probe worktree; one mutation):*
`features/demo/ui/tokens/status.ts:121` — the `background` line changed from the
`${severity}Light` palette read to the literal `'#101820'` (a legitimate seam re-tint).
Full suite, exit **1**, and the complete census of files holding an absolute value for this
seam is exactly four:

```
FAIL features/demo/ui/tokens/__tests__/status.test.ts          <- the INTENDED anchor (by design)
FAIL features/demo/ui/__tests__/palette-contrast.test.ts       <- must measure the real fill (correct)
FAIL features/demo/ui/__tests__/field-recipe-sweep.test.tsx    <- this finding
FAIL features/demo/ui/screens/__tests__/status-owners.test.tsx <- this finding
Tests  6 failed | 4188 passed | 2 todo
```

`controls/__tests__/banner.test.tsx` **passed** under the same mutation — its pins read
`severityTone(severity)` on both sides and move with the seam, which is the shape W2's
`VETTED-r1-delta.md:18` recorded as correct ("the pin is now RELATIVE — component and oracle move
together"). Restored; `git diff` empty; 4 files / 80 tests green again.

*The two already-fixed siblings are absent from that failing set*, which is the direct confirmation
that these two are the misses. `INTEGRATION-w3-assembly.md` §2 hazard #3 fixed
`AudioPreviewScreen.test.tsx:271,289` on the criterion "no seam-consuming sibling anywhere in the
file" — `field-recipe-sweep.test.tsx` contains **zero** occurrences of `severityTone`. It fixed
`time-offset-advisories.test.tsx:103` on the criterion "the primary pin at `:84` already reads
`severityTone('warning')`; the opacity witness beside it spelled the same fill as
`colors.warningLight`" — `status-owners.test.tsx` is byte-for-byte that shape: the primary pin at
`:164` reads `severityTone(tone)` and **accepted** my mutation, while the witness at `:186` red.
§5.3 of that report states the rule in the general: *"Any new pin that spells a Banner fill as a
`*Light` palette token is the same defect."*

**Second-order, same finding.** `field-recipe-sweep.test.tsx:469-470`'s comment overclaims:
*"The demo's retired recipe was rgba(255,71,87,0.08), so this is the assertion that fails if
anyone re-rolls it locally."* It fails only for a **translucent** re-roll — and the very next line,
`expect(...).not.toContain('rgba')`, already covers that on its own. An *opaque* local re-roll
spelled `colors.errorLight` (which A71's own opacity rule pushes an author toward) passes `:471`
untouched.

**Fix.** Import `severityTone` in `field-recipe-sweep.test.tsx` and assert
`probeColor(severityTone('error').background)` / `severityTone('error').color`; at
`status-owners.test.tsx:186` use `rgb(severityTone('warning').background)`, matching `:164`'s own
idiom ten lines above. Correct the `:469-470` comment to credit the `not.toContain('rgba')` line as
the anti-wash guard. Leave `status.test.ts` and `palette-contrast.test.ts` alone — those two are
where the seam's absolute values belong.

---

## LOW

### [LOW] The PaneNote-vs-Banner glyph-agreement pin uses optional chaining on both sides of a `toBe`, so it passes when BOTH glyphs are absent — on the file the integration report named residual risk #1

**File:** `features/demo/ui/screens/settings/__tests__/pane-chrome.test.tsx:151`

```tsx
expect(noteHost.querySelector('svg')?.innerHTML).toBe(bannerHost.querySelector('svg')?.innerHTML)
```

**Issue.** Optional chaining on both operands makes `undefined === undefined` a pass. This is the
pin written to close `INTEGRATION-w3-assembly.md` §5.1 (*"Nothing pins that PaneNote's rendered
severity glyph and Banner's agree… they share BannerIcon by construction"*), and that shared
dependency is exactly the correlated-failure direction the `?.` pair admits.

**Evidence (probes; canonical source; dedicated probe worktree).**
- *Mutation A* — `Banner.tsx:126` `BannerIcon` returns `null` (glyph gone from **both** consumers):
  `pane-chrome.test.tsx -t "draws the SAME severity glyph"` → **1 passed. SURVIVED.**
- *Negative control, all four clauses satisfied* — same mutation, full suite: **9 failed** across
  `banner.test.tsx`, `field-recipe-sweep.test.tsx`, `DateDisambiguationWarning.test.tsx`. The
  mutation is shipped code, non-equivalent, covered by the suite, and on an arm that executed.
  `pane-chrome.test.tsx` — the one file whose job this is — is **not** in that list.
- *Mutation B (isolating)* — `_pane-chrome.tsx:225` renders `<BannerIcon>` under `{false && ...}`
  so that only `PaneNote` loses its glyph: full suite → **1 failed, `pane-chrome.test.tsx`. KILLED.**

**So the drift direction genuinely holds and the repo is not exposed** — three other files catch a
`BannerIcon` break. This is a weak assertion, not a coverage hole, which is why it is LOW rather than
the HIGH a bare SURVIVED would carry. It earns its row because the fix is one character and the
correct pattern sits ten lines above it in the same file (`:141-142` uses
`firstElementChild!.lastElementChild!`).

**Fix.** Replace both `?.` with `!` (or assert one side `toBeTruthy()` first), so an absent glyph on
either surface reds.

---

## What I verified clean (so the aggregator need not re-derive it)

**Architecture — all four of my beats preserved.**

| Rule | Check | Result |
|---|---|---|
| Store bridge | `grep -rn "useStore" features/demo/ui` minus `DemoExperience.tsx` | **0 hits** |
| Engine purity | `from 'react'` / `'use client'` under `features/demo/engine` | **0 hits** |
| Single barrel | diff of `features/demo/index.ts` + `engine/index.ts` | **empty** — public surface unwidened |
| Marketing/demo wall | W3 touches **no** `app/`, `components/` or `lib/` source at all (only `.design-sync/*.mjs` + `docs/`) | trivially preserved |

**Type safety.** Zero `as any`, zero `@ts-ignore` / `@ts-expect-error`, zero non-null-assertion
introductions and zero unrelated-type `as` casts in added non-test lines. `tsc --noEmit` exit 0 cold.
No `tsconfig.json` change.

**W2 case law followed by W3's new code.** F45 (`satisfies` closers): `mapTokens.ts:96` closes with
`as const satisfies Record<ColorScheme, ...>`, `terminal-palette.ts:64` with `satisfies ColorScheme`,
`:121` with `satisfies Record<ImportLogLevel, string>`. F39 (the `aria-disabled` PAIR): the wave makes
exactly two `disabled` to `aria-disabled` conversions (`CompletionScreen.tsx:203`, `:213`), **both**
carrying the guarded handler the idiom requires, and the Complete CTA carries the `aria-describedby`
half at `:214`. Because `canExport = !!currentLocation && !exportBusy`, the double-submit the removed
`disabled` attribute used to suppress for free is correctly refused by the guard.

**Determinism seam.** Zero `Date.now()` / `Math.random()` added anywhere in the diff. The `importGen`
generation-token pattern in `DemoExperience.tsx` is untouched — that file's 44 changed lines are
**entirely** A93 em-dash copy edits, including around the post-geocode re-check at `:1740`.

**Async / hooks.** No new timers, listeners, `AbortController`s, object URLs or map instances anywhere
in the diff. One new `useEffect` (`MapFiltersSheet.tsx:265-267`) — deliberate, not derived-state
misuse: an `aria-live` region only announces changes *after* mount, and the reset-on-close half is
`ExportModal.tsx:124-139`'s established idiom. `SettingsCategoryList.tsx:149-161`'s new `pressed`
state releases on `pointerup`, `pointerleave` **and** `pointercancel` — no stuck-wash leak. No
`forEach(async)`, no `key={index}`, no unhandled floating promise added.

**U5.2's own predicted defect 1 did not land.** `MapScreen.tsx:277` reads
`filters.statuses.length + (proximityActive ? 1 : 0)`, **not** the adjacent `countActiveFilters`, and
`MapScreen.test.tsx:376-397` ships the three-status fixture asserting `'4'` that separates the two
expressions. That was the report's "single highest-value un-todo"; it is closed.

**The new parity-gate rows are falsifiable, not decorative.** `check-rn-parity.mjs` gained 115 lines
and 8 map-chrome anchors. Probe: `mapTokens.ts` dark `border` alpha `0.45` to `0.55` → gate exit **1**,
`DRIFT mapGlass.border.dark`. **KILLED.** Restored, 143/143.

**Styling conventions.** Zero Tailwind `className` added under `features/demo/ui/**`. Both new
components (`MapFiltersSheet.tsx`, `OverlayHeader.tsx`) open `'use client'`; the four new pure data
modules (`camera-chrome.ts`, `terminal-palette.ts`, `field-input.ts`, `sample-badge.ts`) omit it,
which is the verified-correct inherited-boundary pattern. Zero relative `../` climbing added.

**Security.** No `dangerouslySetInnerHTML` / `srcdoc` / `innerHTML` writes added; no
`engine/logic/pdf/**` or `app/api/**` change in the diff. `PdfPreview.tsx`, `DemoErrorBoundary.tsx`
and `ExitDialog.tsx` changes are copy-only (verified line by line).

**Dead exports.** Every new exported symbol has a consumer except `OverlayHeaderProps` — exporting a
component's props interface alongside it is conventional here and not worth a row.

---

## Out-of-lane observations

- **type-design:** `OverlayHeader.tsx:87-94` — `backLabel?: string` is optional while its own docblock
  says *"REQUIRED whenever `onBack` is given"*; `aria-label={backLabel}` with `undefined` yields a
  button with no accessible name. All four current callers pass it, so it is latent. Same shape as
  U6.4a's self-declared Defect 1, `_shared.tsx:386` `FieldError`'s `role?: 'alert'`. A discriminated
  pair would make both unrepresentable — `type-design-analyzer`'s call, not mine.
- **web/a11y:** `CompletionScreen.tsx:203-205` — the blocked Export Zip's reason lives only in `title`,
  while the docblock 15 lines above argues a `title` *"is a pointer affordance the accessibility tree
  does not surface here"*. `NO_CASE_BANNER_ID` is already on screen carrying that reason whenever
  `!canExport` is caused by `!currentLocation`. Separately, when `exportBusy` is the cause, that
  `title` reads "Open a location first" while a location *is* open (pre-existing string, now reachable
  by keyboard because the control stays focusable).

---

## TypeScript Lane Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 1
Verdict: **APPROVE with comments**

Store-bridge integrity: preserved
Engine purity: preserved
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved

Probes run: 4 (1 SURVIVED, 2 KILLED, 1 invalid-and-discarded). All restored with `git diff` proven
empty; all in a dedicated worktree, since torn down. Provenance: canonical source in every case, no
mirrored copies. The one invalid probe introduced an undefined identifier rather than a behaviour
change and was discarded, not reported.
Ledger rows proposed: none.
Out-of-lane observations: 2 (listed above).

---

**END OF FILE.** The operative verdict for this round is the **Round 1 (fix delta)** summary above
(line ~156): F55 FIXED, F71 FIXED, 0 new findings, **APPROVE**. Everything from "Round 0" down is the
initial review, retained unaltered as the evidence base for those two findings.
