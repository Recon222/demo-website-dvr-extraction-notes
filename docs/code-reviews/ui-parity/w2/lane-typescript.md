# Lane: typescript — W2 (PR #42)

## Round 1 (fix delta)

Head `250e12f` (fix-merge). Delta read: `git diff addd03f..250e12f -- . ':(exclude)docs'` — 34
files. Authority: the round-1 mapping comment on PR #42. Warm seat — I re-read only the fix
commits' lines plus what they now depend on; `Banner.tsx` and `_shared.tsx`'s `Toggle` were
**restructured**, so those two were re-read in full.

Gates re-run cold in my own probe worktree (`probe-w2d-typescript-f26` off `250e12f`, solo):
`rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` -> **exit 0** ·
`node .design-sync/check-rn-parity.mjs` -> **exit 0, 135/135** ·
`pnpm test --silent` -> **290 files / 3,899 passed / 4 todo, exit 0**.

### Per-finding status

| # (r0) | Aggregator | Status | Evidence |
|---|---|---|---|
| HIGH — Banner builds the trio privately | **F26** (`7cf2caa`) | **FIXED** | probes r1-A / r1-B below |
| MEDIUM — `CheckboxBox` glyph cast | F45 (`44abc84`) | **FIXED** | cast gone, table closed |
| MEDIUM — five orphaned imports | F36 (`4391f77`) | **FIXED** | all five gone |
| LOW — dead style keys in `AlertDialog` | F47 (`0ed7b19`) | **FIXED** | only `flex: 1` left |

---

**F26 — FIXED.** `Banner.tsx:155` is now `const tone = severityTone(severity)`; the three private
palette reads are deleted and the fill / border / foreground all spend `tone.background`,
`tone.borderColor` and `tone.color` (`:179-183`, `:196`, `:204`). `BannerSeverity` is **deleted**,
not aliased — `grep -rn "BannerSeverity" features/demo app components lib` returns one hit, the
tombstone comment at `Banner.tsx:76` — and `SEVERITY_ICON` / `BannerProps.severity` now key on
`StatusSeverity`. My finding's third touch-point is closed too: `banner.test.tsx:8` imports
`SEVERITIES` from the seam instead of re-typing the four locally.

Re-probe at the merged head, both directions:

```
MUTATION PROBE (r1-A): the r0 survivor, re-run verbatim
Target: features/demo/ui/tokens/status.ts:121 -- severityTone().background
Claimed pin: features/demo/ui/controls/__tests__/banner.test.tsx (24 cases)
Mutation applied: background reads the *Light token -> reads the *Dark token
Result: SURVIVED       (from exit code 0) -- and this is now CORRECT, not a defect.
  The fix made the pin RELATIVE: banner.test.tsx:8 reads its expectation off severityTone as
  well, so component and oracle move together under this mutation. It is no longer a falsifying
  mutation for that suite. The seam's VALUES stay pinned where they belong -- same mutation,
  same run: tokens/__tests__/status.test.ts + screens/__tests__/status-owners.test.tsx
  = 4 FAILED / 21, unchanged from r0. So the mutation is still shipped, non-equivalent,
  covered, and observable on an arm that executed -- all four control clauses.

MUTATION PROBE (r1-B): the direction that now matters -- the F26 defect itself
Target: features/demo/ui/controls/Banner.tsx:155
Mutation applied: resurrect the private trio verbatim (three palette reads for fill / border /
  foreground, replacing the severityTone call), PLUS the r1-A seam re-point -- i.e. exactly the
  real-world scenario F26 named: the seam is re-tinted and Banner does not follow.
Result: KILLED       (from exit code 1)
  5 FAILED, e.g. "expected 'rgb(46, 95, 151)' to be 'rgb(122, 159, 196)'", across all four
  severities plus the fill case. This is the mapping's "probe B: 4 failed on the old shape",
  reproduced independently. The failure mode I filed is now caught.
Provenance: canonical source in probe worktree probe-w2d-typescript-f26 off 250e12f; no mirrored
  copy involved. Motion mode: default (motion-ON, vitest.setup.ts matchMedia stub) -- irrelevant
  to this target, stated per contract.
Restore: verified byte-identical (git checkout -- on both files, git diff --quiet clean;
  banner + status + status-owners 45/45 green). Worktree torn down with tools/worktree-remove.ps1
  -- "unlinked 549 junction(s) in 2 pass(es)", .pnpm 240 -> 240, exit 0.
```

**Disclosed residual, not a finding.** Resurrecting the private trio *without* moving the seam is
invisible to any value pin, because the two produce byte-identical output — the defect was a
COUPLING defect, and a behaviourally-inert regression cannot be caught by a rendered-value
assertion. The relative pin catches the only version of it that can hurt anyone. I checked for a
source-text coupling pin and there is none; I am **not** asking for one — that is the
`mutation-testing` SKILL's string-presence trap, and it would stay green over a dead import.

**MEDIUM (glyph cast) — FIXED**, and better than I proposed. `choice-controls.tsx:236` now reads
the table through a template-literal index with no cast, and the table itself is closed by
`as const satisfies Record<...CheckboxChecked expansion..., ReactNode>`. Keying the record off the
union's own expansion makes widening `CheckboxChecked` a compile error at the DECLARATION rather
than at the read — strictly stronger than the ternary I suggested, and it matches the
"COMPILE ERROR rather than a runtime `undefined`" discipline in `status.ts:36-38` that I cited as
the in-repo contrast.

**MEDIUM (orphaned imports) — FIXED.** All five bindings I cited are gone (`AlertDialog.tsx`
`GLASS`; `ExportModal.tsx` `GLASS` and the `ExportModalMode` type; `_pane-chrome.tsx` `colors`;
`palette-contrast.test.ts` `GLASS`), verified by grep on the import blocks at `250e12f`. The
mapping discloses that 11 `TS6133` remain repo-wide with `noUnusedLocals` ledgered and its trigger
answered "not yet"; I re-ran `tsc --noUnusedLocals` and confirm **11**, and confirm **none of them
land on the five files I cited**. That residual is the integrator's disclosed scope with a ledger
entry — not re-filed.

**LOW (dead style keys) — FIXED.** `AlertDialog.tsx`'s action button now writes `flex: 1` and
nothing else before the `buttonStyle` spread; `padding: 12`, `fontSize: 14.5`, `fontWeight: 600`
and `cursor: 'pointer'` are gone.

### Fix fallout in my territory — checked, clean

- **F39 `disabled?: { reasonId: string }` (`_shared.tsx`, `18654fd`) — shipped shape is correct,
  and the `aria-disabled` friction the diagnostics stream showed is resolved.** The hazard in an
  object-valued flag is writing it straight through: `aria-disabled={disabled || undefined}` would
  emit the OBJECT. The shipped lines are `'aria-disabled': disabled ? true : undefined` and
  `'aria-describedby': disabled?.reasonId`, so the attribute is a real boolean and the reason can
  no longer be set on an enabled switch. `activate` still gates on `!disabled` (object
  truthiness), and `cursor` / `opacity` read it the same way. All eleven call sites pass the
  object form or omit it (`AppearancePane.tsx:43`, `CloudSyncPane.tsx:57`,
  `FormFieldsPane.tsx:239,265`; the rest omit) — tsc exit 0 is the proof the migration is
  exhaustive. This is a genuine invalid-state fix: the old `disabled: boolean` +
  `describedBy?: string` pair made "disabled with no reason" representable; one member carrying
  both facts does not.
- **F44/F45 `satisfies` closers — no widening, no fallout.** Twelve `as const satisfies` closers
  added across `button-recipe.ts`, `sheet-chrome.ts` and `choice-controls.tsx`, including `SIZES`
  (`Record<ButtonSize, Pick<CSSProperties, 'padding' | 'minHeight' | 'fontSize'>>`, which an
  annotation had left MUTABLE), `PrimaryButtonGradient` / `ElevatedEdges` / `DangerFill`
  (`Record<ColorScheme, ...>`) and the ten `sheet-chrome` fragments (`CSSProperties`).
  `as const satisfies` rather than a bare annotation throughout, so no literal type was lost and
  no consumer's inferred type moved — tsc exit 0 over the whole tree confirms it.
- **Regression sweeps re-run at `250e12f`.** Zero new `any` / `as any` / `Date.now()` /
  `Math.random()` / `key={index}` / Tailwind `className` in the fix diff. Scripted
  border-shorthand-after-spread sweep across every `buttonStyle`, `glassWell`, `sheetSurface`,
  `dialogSurface` and `severityTone` spread consumer: zero code hits (the only three matches are
  the docblock prose at `glass-tokens.ts:304` that *documents* the forbidden shapes). Store bridge
  (`useStore` in `DemoExperience.tsx` only), engine purity, single barrel and marketing/demo
  isolation are all unmoved by the fix round; the only non-`features/` files the fix touches are
  `.design-sync/check-rn-parity.mjs` and `vitest.setup.ts`, neither an import edge.

### Round 1 summary

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0 — **all four r0 findings FIXED, zero new**.

Store-bridge integrity: preserved
Engine purity: preserved
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved

**Verdict: APPROVE**

Notes: F26's fix converts a value pin into a relative one, which is the right shape — the r0
survivor now survives *by construction*, and the mutation that reproduces the real failure mode
(seam re-tinted, Banner stale) KILLS with 5 reds. F39's object-valued `disabled` is the strongest
change in the round: it makes "disabled with no stated reason" unrepresentable rather than merely
discouraged.

Out-of-lane observations: none new.

---

# Lane: typescript — W2 (PR #42, `feat/uiparity-w2` @ `7bcb553` vs `master` @ `43ccbad`)

Mode: code review. Fresh seat; w0/w1 lane files and vetted docs read as inherited precedent, not
re-litigated.

Scope read: `git diff master...HEAD -- . ':(exclude)docs'` — 129 files, +9,149/−1,359. Nine new
production modules read in full (`tokens/field-input.ts`, `tokens/status.ts`,
`controls/button-recipe.ts`, `controls/choice-controls.tsx`, `controls/sheet-chrome.ts`,
`controls/CentredDialog.tsx`, `controls/GlassBottomSheet.tsx`, `controls/Banner.tsx`,
`controls/EmptyState.tsx`), plus `screens/_shared.tsx` (`ModalShell` / `Field` / `Toggle` /
`ModalActions`), the rewritten `controls/AlertDialog.tsx`, `inputs/PickerSheet.tsx`,
`glass-tokens.ts`'s `glassWell`, `screens/screenData.ts`, the one engine change
(`engine/logic/media/audio-levels.ts`) and `.design-sync/check-rn-parity.mjs`. Adoption sites swept
mechanically (61 `buttonStyle` call sites, 7 `fieldInputStyle`, 3 `glassWell`, 4 `Banner`).

Gates verified in this worktree / my own probe worktree:

- `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` -> **exit 0**
- `node .design-sync/check-rn-parity.mjs` -> **exit 0, 135/135** (41 palette keys + 24 tier keys,
  both halves, + 4 CTA stops + touchFloor)
- `pnpm test --silent` (probe worktree, solo) -> **290 files / 3,881 passed / 4 todo, exit 0**

---

## HIGH

```
[HIGH] `Banner` builds the `severityTone()` trio privately — the seam it was told to consume
File: features/demo/ui/controls/Banner.tsx:68, 146-150, 171-174
Issue: `tokens/status.ts` ships `severityTone()` as, in its own words, "THE severity recipe.
  Every badge, chip, pill, note and banner in the demo resolves here" (`status.ts:113`). `Banner`
  — the demo's ONE severity callout and the only *banner* in the product — does not resolve there.
  It re-derives all three parts of the trio inline: the *Light fill (:149), the *OnLight
  foreground (:150) and the saturated border on four longhands (:171-174), which is exactly
  `severityTone(severity)`'s `{ background, color, borderColor }`. It also re-declares the closed
  four-member set as a second union, `BannerSeverity` (:68), beside `StatusSeverity` /
  `SEVERITIES` (`status.ts:42,45`) and a third hand-typed copy in
  `controls/__tests__/banner.test.tsx:31`. Concrete failure mode: re-point the fill in
  `severityTone` — the single edit the seam exists to make possible ("a phone-side re-tint moves
  all of them at once") — and the badge, the retention pill and `PaneNote` move while all four
  Banner surfaces (`DateDisambiguationWarning.tsx:64`, `EditIncidentLocationModal.tsx:70`,
  `ExtractedScopeScreen.tsx:46`, `import/PickerStage.tsx:323`) silently keep the old trio. It gets
  worse on schedule, not better: U6.2 deletes `PaneNote` — today the ONLY `severityTone` callout
  consumer — onto `Banner` (`u3.2-implementation-report.md:419-422`), which takes the callout
  family off the seam entirely.
Evidence:
  - Plan §5 SEAM rule, twice: `01-master-ui-parity-plan.md:227` ("§5's SEAM rule forbids a
    consumer building a private copy") and `:236` ("stop and raise it, do not build a private
    copy").
  - U3.2's CONSUME-ME to U3.3, `reports/u3.2-implementation-report.md:410-417`, verbatim:
    "`severityTone(severity)` returns exactly `{ background: <sev>Light, borderColor: <sev>,
    color: <sev>OnLight, accent }`, which IS `Banner`'s recipe minus the geometry. If your branch
    built the trio privately, delete it and take the seam — the plan's SEAM rule forbids a
    consumer building a private copy, and U3.2 merges first."
  - It did NOT merge first. Actual order into `feat/uiparity-u3`: `ae87f9b` (U3.1+U3.4) ->
    `b336665` (U3.3 Banner) -> `63d21f9` (U3.2 status.ts), the inverse of §6.2's declared
    U3.2 -> U3.3 -> U3.4. The instruction was written for a merge that never happened, and
    `INTEGRATION-w2-assembly.md` does not name the residue (its U3 row lists 3 files / 3 hunks).
  - Sibling consumer on the seam for contrast: `settings/panes/_pane-chrome.tsx:9` imports and
    calls `severityTone`; `screens/__tests__/status-owners.test.tsx:91-103` pins `PaneNote`
    against it.
Mutation probe:
  MUTATION PROBE: Banner is not on the severity seam
  Target: features/demo/ui/tokens/status.ts:121 — severityTone().background
  Claimed pin: features/demo/ui/controls/__tests__/banner.test.tsx:103 —
    "paints %s from its own three tokens" (x4 severities)
  Mutation applied: background reads the *Light token -> reads the *Dark token
  Result: SURVIVED       (from exit code 0)
    banner.test.tsx: 24 passed / 24, exit 0 — the Banner suite cannot observe the seam moving,
    because `Banner` never calls it. Path the render actually took: Banner.tsx:149 reads the
    palette record directly, never `severityTone`.
  Negative control (same mutation, same run set): 4 FAILED across
    `tokens/__tests__/status.test.ts` (3) and `screens/__tests__/status-owners.test.tsx` (1,
    `PaneNote`). Mutation is shipped, non-equivalent, covered, and observable on an arm that
    executed — all four clauses.
  Provenance: canonical source in my own probe worktree `probe-w2-typescript-mjsguard` off
    `7bcb553`; no mirrored copy involved. Motion mode: default (motion-ON; `matchMedia.matches`
    hard-coded false, `vitest.setup.ts:47-60`) — irrelevant to this target, stated per contract.
  Restore: verified byte-identical (`git checkout --` + `git diff --quiet` clean; 45/45 green
    again). Worktree torn down with `tools/worktree-remove.ps1` — "unlinked 549 junction(s) in
    2 pass(es)", `.pnpm` 240 -> 240, exit 0.
Fix: in `Banner`, replace the three inline reads with `const tone = severityTone(severity)` and
  spend `tone.background` / `tone.color` / `tone.borderColor`; alias `BannerSeverity` to
  `StatusSeverity` (or drop it and take `StatusSeverity` directly), and have
  `banner.test.tsx:31` import `SEVERITIES` instead of re-typing the four. If the seat instead
  argues Banner should stay off the seam, that is a refutation the aggregator can accept — but
  then `status.ts:113`'s "…and banner…" sentence and U3.2's CONSUME-ME both have to change,
  because one of the three is currently false.
```

---

## MEDIUM

```
[MEDIUM] `CheckboxBox` indexes its glyph table through an `as` cast, so a widened union becomes a
         runtime `undefined` instead of a compile error
File: features/demo/ui/controls/choice-controls.tsx:140, 146-150, 192
Issue: `GLYPH` is `Record<'true' | 'false' | 'mixed', ReactNode>` and is read at :192 as
  `GLYPH[String(checked) as keyof typeof GLYPH]`. The cast is correct today by construction
  (`String()` over `boolean | 'mixed'` yields exactly those three strings), but it is the one
  place in this new seam where the type checker is switched off. Add a member to
  `CheckboxChecked` (:140) — the natural next step the docblock itself contemplates when a demo
  surface needs a disabled or partial state — and neither the union nor `GLYPH` reds:
  `CheckboxBox` renders `undefined` and the box paints filled with no mark. The seam's own
  docblock is about making invalid states unrepresentable ("`checked x disabled` is
  UNREPRESENTABLE rather than pinned"), so the one representable hole in it is worth closing.
Evidence: the sibling module shipped in the same wave states the opposite discipline explicitly —
  `features/demo/ui/tokens/status.ts:36-38`: "`SEVERITIES` is closed at four for that reason: the
  template reads below are what make a fifth member a COMPILE ERROR rather than a runtime
  `undefined`." `status.ts` reaches that with `as const satisfies Record<StatusSeverity, …>` plus
  template-literal index reads; `choice-controls.tsx` reaches for a cast instead.
Fix: drop the cast — `GLYPH[checked === 'mixed' ? 'mixed' : checked ? 'true' : 'false']` is
  exhaustive by construction and reds on a widened union.
```

```
[MEDIUM] Five imports orphaned by the seam adoptions; no gate in this repo catches them
File: features/demo/ui/controls/AlertDialog.tsx:6
      features/demo/ui/screens/ExportModal.tsx:11, :18
      features/demo/ui/screens/settings/panes/_pane-chrome.tsx:8
      features/demo/ui/__tests__/palette-contrast.test.ts:7
Issue: each of these five bindings lost its last body reference when the file adopted a W2 seam,
  and each now survives only inside a COMMENT — which is why a grep-based census reads them as
  live. Verified individually:
    - `AlertDialog.tsx:6` `GLASS` — sole remaining occurrence is the prose at `:62` ("the colour
      half of `GLASS.borderError`"); `GLASS.borderSoft` / `GLASS.gradientPanel` went with the
      `CentredDialog` adoption.
    - `ExportModal.tsx:18` `GLASS` — sole remaining occurrence is the comment at `:176`.
    - `ExportModal.tsx:11` `type ExportModalMode` — zero occurrences after the import.
    - `_pane-chrome.tsx:8` `colors` — sole remaining occurrence is the comment at `:186`.
    - `palette-contrast.test.ts:7` `GLASS` — only `:44` and `:413`, both comments (test file, so
      lower stakes; listed for the completeness sweep, not as a separate issue).
  Nothing in the repo reds on these: `tsconfig.json` sets no `noUnusedLocals` /
  `noUnusedParameters` (verified — `pnpm exec tsc --noEmit --incremental false` exits 0 over all
  five), and the full suite is green over them. So the residue accumulates silently across a
  campaign whose whole method is deleting old fragments.
Evidence: the integrator applied exactly this check, by name, at ONE of the three hunks in the
  same commit — `docs/code-reviews/ui-parity/w2/INTEGRATION-w2-assembly.md:59-61`: "the *only*
  thing that needed deciding was the import block — where `PhoneOverlayPortal`, `GLASS` and
  `glassBtnSecondary` had all lost their last reference and go." The two siblings resolved in the
  same step (`AlertDialog.tsx`, `ExportModal.tsx`) did not get it, and the same report already
  recorded the class once before at `:32` (`ExtractedScopeScreen`: "HEAD's own side carried a dead
  import that U2.2's conversion had orphaned").
Fix: delete the five bindings. For the three whose only surviving mention is prose, keep the
  comment — it is the useful part — and drop the import.
```

---

## LOW

```
[LOW] Four dead style keys survive the `AlertDialog` split, overridden by the recipe spread
File: features/demo/ui/controls/AlertDialog.tsx:105-108
Issue: `padding: 12`, `fontSize: 14.5`, `fontWeight: 600` and `cursor: 'pointer'` are written
  BEFORE `...buttonStyle({ … })` (:113), which returns `padding: '16px 24px'`, `fontSize: 16`,
  `fontWeight: 600` and `cursor: 'pointer'` from `SIZES.medium` — so all four are inert. They are
  pre-U2.2 residue that the integrator's hand-split carried across. Harmless today; misleading to
  the next reader, who will reasonably assume the alert's buttons are 12px-padded 14.5px text.
Evidence: a scripted sweep of all 61 `buttonStyle` call sites for recipe-owned keys written before
  the spread returns exactly ONE site — this one. Every other adoption writes only layout keys
  (`flex`, `width`, `flexBasis`) before the spread, e.g. `_shared.tsx:519,533`,
  `CaseActionsSheet.tsx:147-190`, `PdfPreview.tsx:170-171`.
Fix: delete lines 105-108; keep `flex: 1`.
```

---

## What I checked and found clean

- **Store bridge.** `grep -rn "useStore" features/demo/ui` returns hits in `DemoExperience.tsx`
  ONLY (lines 4, 441-459). No new component holds or subscribes to a store instance. The one
  cross-layer read this wave adds is type-only plus a pure lookup: `tokens/status.ts:3` imports
  `type LocationMapStatus` from `engine/store/selectors`, the established `mapData.ts` /
  `screenData.ts` shape. U3.2's course-correction **held**.
- **Engine purity.** Zero `from 'react'`, `'use client'` or module-scope `window` / `document`
  under `features/demo/engine/**`. The one engine change moves the opposite way:
  `audio-levels.ts` now returns `LevelFillBand` / `RecorderStatusTone` instead of three hexes
  each, so `engine/` holds no colour and imports nothing from `ui/`; the two maps land at
  `AudioRecorderScreen.tsx:120-131`. `assertNever` retained on both switches.
- **`isolatedModules`.** Every type re-export uses the type form —
  `engine/logic/media/index.ts:133,135` (`type LevelFillBand`, `type RecorderStatusTone`),
  `AudioRecorderScreen.tsx:12-13`, `status.ts:3-4`. `PickerSheet.tsx:13`'s
  `export { PICKER_SHEET_Z } from …` is a value (a number), correctly value-form.
- **Barrel + marketing/demo isolation.** `features/demo/index.ts` unchanged (two exports).
  `grep -rn "features/demo" components lib "app/(default)"` returns only the guard test and a
  prose comment. The only file changed outside `features/` is `.design-sync/check-rn-parity.mjs`,
  which reads `button-recipe.ts` as a **path string** via `readFileSync`, not an import — no new
  module edge, no bundle reach.
- **Determinism seam.** Zero new `Date.now()` / `Math.random()` anywhere in the diff (`.ts`,
  `.tsx`, `.mjs`). Zero `key={index}`. Zero `any` / `as any` / new non-null assertions in the
  changed surface.
- **RSC / `'use client'`.** All five new files that export a component or use hooks carry
  `'use client'` (`Banner`, `CentredDialog`, `EmptyState`, `GlassBottomSheet`, `choice-controls`);
  the four new pure-value modules omit it (`button-recipe.ts`, `sheet-chrome.ts`,
  `field-input.ts`, `status.ts`), matching the established `input-theme.ts` / `mapTokens.ts`
  pattern. Nothing new is reachable from a server component. `CentredDialog`'s module-scope
  `trackDialogActivationOrigin()` (:163-170) is correctly SSR-guarded on `typeof document`.
- **The `.mjs` guard boundary.** Both new `gradientTop.light` / `gradientBot.light` rows read the
  right file through the right slice, and they red:

```
MUTATION PROBE: the new light CTA anchor rows are real
Target: features/demo/ui/controls/button-recipe.ts:70 — PrimaryButtonGradient.light[0]
Claimed pin: .design-sync/check-rn-parity.mjs — anchor row `gradientTop.light`
Mutation applied: light: ['#2563eb', …] -> light: ['#123456', …]
Result: KILLED       (from exit code 1; baseline exit 0)
  "DRIFT  gradientTop.light  RN=#2563eb  web=#123456" — exactly one row moved, isolation intact.
Restore: verified byte-identical (git checkout + git diff --quiet clean; re-run exit 0, 135/135).
Provenance: canonical source, my probe worktree off 7bcb553.
```

  The `webGradOpts` slice (`after: 'export const PrimaryButtonGradient = {'`,
  `before: '} as const'`) survives the web record's `} as const satisfies Record<…>` tail as
  claimed, and the reader takes the literal arm of `value()`, so no resolver is needed on the web
  side. `warningAccent` is anchored as a key distinct from `warningDark` despite the identical
  dark hex, as its comment claims.
- **`fieldInputStyle`'s state precedence** — the subtlest line in U2.1 — is really pinned:

```
MUTATION PROBE: the disabled foreground branch
Target: features/demo/ui/tokens/field-input.ts:74 — color: disabled ? c.textSecondary : c.text
Mutation applied: -> color: c.text
Result: KILLED       (from exit code 1)
  2 FAILED: tokens/__tests__/field-input.test.ts "spends textSecondary on a disabled field,
  deliberately NOT disabledText" and ui/__tests__/field-input-recipe.test.tsx "takes the phone
  disabled path when readOnly, and stops fading the LABEL".
Restore: verified byte-identical; full suite 290 files / 3,881 passed, exit 0.
Provenance: canonical source, probe worktree off 7bcb553. Motion mode: default (motion-ON).
```

- **THE LIT-EDGE RULE, mechanically.** Scripted sweep of every `...buttonStyle(` and every
  `...glassWell` consumer for a border shorthand written after the spread: **zero hits**. All
  three `glassWell` consumers spread last or follow with non-border keys only
  (`Calendar.tsx:67`, `Dropdown.tsx:176`, `TimeWheel.tsx:169-170`). `sheetSurface`,
  `dialogSurface`, `modalHeaderBar` and `banner` all carry longhands only. `fieldInputStyle`'s
  `border` SHORTHAND (`field-input.ts:72`) is the correct exception and is reasoned in place
  (:66-67): it is a whole-object recipe, both branches declare the same key, so an update is an
  in-place rewrite — the shape the old `_shared.tsx` comment demanded.
- **`ModalShell`'s newly REQUIRED `closeAccessibilityLabel`** is threaded at all eight callers
  (tsc exit 0 is the proof) and lands on the button's `aria-label` (`_shared.tsx:303`), not the
  scrim — correctly distinct from `GlassBottomSheet`'s `closeLabel`, which does label the scrim
  (`GlassBottomSheet.tsx:391-392`).
- **`CentredDialog`'s async / lifecycle mechanics.** LIFO Escape stack keyed on the stable ref
  OBJECT (:184, :259, :269, :279-280) — not a fresh `{}` per effect run; both effects clean up;
  the capture-phase tracker is idempotent (:164) and connectivity-checked at BOTH capture (:274)
  and restore (:147-149). `GlassBottomSheet`'s `closing` timer is cleared on re-open and on
  unmount (:245); the `SheetPhase` machine makes `closing`-under-reduced-motion unreachable by
  construction (:237). No new `setState`-after-unmount path, no new un-awaited async handler, no
  new `forEach(async …)`, no new `Promise.all` where `allSettled` was wanted.
- **`ExportModal`'s double-portal** was correctly avoided: the progress branch keeps
  `PhoneOverlayPortal`, the validation branch returns `CentredDialog` bare (`:346-360`).
- **`SubmissionScreen.tsx:154`** (`{ ...fieldInputStyle(), opacity: 0.6 }`) reads like the D10
  "never fade data" breach and is NOT one — two sibling divs, label outside the faded box, and the
  deviation is measured and argued in place (`:145-152`). Correctly handled.
- **`MEDIA_CLOSE_CHIP = 'rgba(0, 40, 83, 0.9)'`** (`MediaLibrarySheet.tsx:366`) reads like a
  re-inline of `colors.overlay` (byte-identical value) and is NOT — the phone declares the same
  constant, deliberately un-tokenised, at
  `src/features/media/media-library/components/MediaPreviewFullscreen.tsx:63`. Verified in the
  read-only phone repo. Correct port.

## Out-of-lane observations

- U4.4's scrim collapse leaves three distinct backdrop values shipped, two still as literals:
  `sheetScrim` / `WizardDrawer` / `CallConfirmSheet` / `ExportActionSheet` on `colors.scrim`
  (0.32), `_shared.tsx:112`'s `modalScrim` on `rgba(4,8,14,0.55)`, and `CentredDialog.tsx:111`'s
  `dialogScrim` on `rgba(4,8,14,0.66)` — the last with a docblock (`:100-106`) arguing the phone
  actually paints `colors.overlay` there. Design/token judgement, `web-reviewer`'s lane; noting
  only that the two remaining literals are un-tokenised, not that either value is wrong.
- `GlassBottomSheet` has exactly one consumer today (`PickerSheet`), so `fillHeight`,
  `showHandle`, `enableSwipeToDismiss`, `maxHeightRatio`, `subtitle` and `closeLabel` are unused
  API. Scheduled for U5.1 / U7.2, so out of scope for this phase — noted, not filed.
- Adopting `GlassBottomSheet` gives the three pickers swipe-to-dismiss they did not have on
  `master` (`enableSwipeToDismiss` defaults true and `PickerSheet` does not opt out), and moves
  their cap from `maxHeight: 92%` to `90%`. Behaviour addition rather than a defect — the phone's
  shell behaves this way — but no package row names it; it belongs in the wave's behaviour ledger
  if one is kept.

---

## TypeScript Reviewer Summary

CRITICAL: 0 · HIGH: 1 · MEDIUM: 2 · LOW: 1

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 1 |

Store-bridge integrity: preserved
Engine purity: preserved (improved — the engine gave up its last two colour tables)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved

Verdict: REVISE

Notes: One HIGH, proved by a SURVIVED probe with a clean four-clause negative control — the demo's
one severity callout is not on the severity seam that claims it, and the scheduled U6.2 fold makes
that worse rather than better. Everything else in a 9k-line wave is sound: tsc exit 0, drift guard
135/135, suite 290 files / 3,881 green, zero `any`, zero determinism regressions, zero
architecture-rule breaches.
