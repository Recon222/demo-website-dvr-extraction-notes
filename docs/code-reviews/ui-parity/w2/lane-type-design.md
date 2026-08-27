# Lane: type-design — Wave 2 (U2 + U3 + U4), PR #42

Mode: **code review**, round 1. Fresh seat; the predecessor's `w0/lane-type-design.md` and
`w1/lane-type-design.md` were read in full and their rulings are treated as settled precedent.
Branch `feat/uiparity-w2` @ `7bcb553` vs `master` @ `43ccbad`; diff
`git diff master...HEAD -- . ':(exclude)docs'`. Read in the shared worktree `w2-wave`
(read-only). Probes ran in `probe/w2-types-recipes` (own worktree off `7bcb553`), torn down via
`tools/worktree-remove.ps1` — **"unlinked 549 junction(s) in 2 pass(es)"**, `.pnpm` 240 → 240,
exit 0; probe branch deleted.

Single question: **do the types in this change enforce the invariants the code depends on, or do
they let invalid states through?**

Baseline in the probe tree BEFORE any mutation: `rm -f tsconfig.tsbuildinfo && pnpm exec tsc
--noEmit --incremental false` → **EXIT 0**; `glass-tokens.test.ts` → **7 passed, exit 0**;
`button-recipe.test.tsx` → **19 passed**; the two together **26 passed, exit 0**. Every restore
below is proved with `git status --short` empty AND `git diff --stat` empty, the two suites green
again at 26/26, and `tsc` back to EXIT 0.

---

## What was verified rather than assumed (the brief's direct questions)

### 1. `fieldInputStyle` — RF-1 IS encoded, and a union here would be wrong

`tokens/field-input.ts:68-72`. The two facts are carried by two independent expressions:

```ts
const borderColor = disabled ? c.disabled : error ? c.error : focused ? c.primary : c.border
border: `${error ? 2 : 1}px solid ${borderColor}`
```

so `disabled && error` resolves to the **disabled colour** and the **error width** by
construction, not by a special case. `tokens/__tests__/field-input.test.ts:53` pins exactly that
cell (`2px solid ${c.disabled}`). **No finding, and deliberately none for the shape either:** all
eight states of the 2x2x2 are meaningful (`FieldInputState`'s three flags are genuinely
independent), so there is no correlated pair for the `RetentionView` pattern to collapse. Three
optional booleans is the correct type here; the precedence is behaviour and belongs in a pin.

### 2. `buttonStyle` — a sixth variant IS a compile error, without a `never` arm

`paint()` (`controls/button-recipe.ts:146-210`) has five `case` arms and **no `default:`**, and no
return-type annotation, so an unhandled variant widens its inferred return to include `undefined`
and the spread-then-destructure at `:226` fails.

```
MUTATION PROBE 1: a sixth ButtonVariant
Target: controls/button-recipe.ts:116 (the union) — CANONICAL file
Mutation: ButtonVariant += | 'tonal'   (paint() untouched)
Result: KILLED (from exit code 2) — three errors at button-recipe.ts(226,11/23/30):
  TS2339: Property 'background' / 'color' / 'edges' does not exist on type
  '{ boxShadow: string | undefined; textShadow: string | undefined; } | ...'
Restore: verified byte-identical (git checkout -- ; git diff --stat empty)
```

This meets `FallbackMode`'s bar — a new variant is a compile error, not a silently-missing
branch. Worth knowing that the guard is *structural* rather than the house
`const exhaustive: never = variant` idiom, so the error surfaces at the CONSUMER with a
property-does-not-exist message rather than at the switch with a type-name message. That is a
legibility difference, not a coverage one: the missing-`default` shape keeps the build red, and
so would an explicit return-type annotation (TS2366). **No finding.**

### 3. `SheetPhase` — the `closing` state is genuinely unreachable under reduced motion

`controls/GlassBottomSheet.tsx:113` + `:237`: the transition is
`setPhase((previous) => (previous === 'closed' || reducedMotion ? 'closed' : 'closing'))`, i.e.
the one invalid state the docblock names is excluded by the transition function, not by a type.
That is the right call — three states, no payload, so a discriminated union would add nothing,
and no `switch` consumes it. **No finding.**

### 4. `CentredDialogProps` — dead-prop hygiene is right, and the required/optional split holds

`controls/CentredDialog.tsx:186-220`. `onDismiss` is **required** (`:205`) with the reason stated
in-type ("a dismissal route with no handler is a dialog that cannot be closed"); `dismissOnScrim`
and `dismissOnEscape` are **required booleans**, not defaulted, which forces each of the three
callers to make the decision the shell refuses to unify; `z` is required (D14); `describedBy?`,
`testId?`, `scrimTestId?` are honestly optional. There is **no `open`/`visible` prop**, and
`:234-238` gives the reason (all three callers mount conditionally, so it would be permanently
`true`, and the focus hand-back is an unmount cleanup, so adding one would silently move the
moment focus returns). That is the `Feature.draft` reasoning applied correctly — a prop with one
honest value is worse than no prop. **No finding.**

### 5. `closeLabel?` (sheet) vs `closeAccessibilityLabel` (modal) — the split is correct

`GlassBottomSheet.tsx:144` `closeLabel?: string` labels the **scrim**, and the shell derives both
consumers of it from that one optional (`role={closeLabel ? 'button' : undefined}` +
`aria-label={closeLabel}`, `:391-392`) — one source, two attributes, no correlated pair to get
wrong. `screens/_shared.tsx:245` `closeAccessibilityLabel: string` is **required** and labels the
**button**. Both are lifted verbatim from two different phone components
(`GlassBottomSheet.tsx:105` and `ModalHeader.tsx:38`), the demo's names match the phone's names,
and the in-type note at `_shared.tsx:242-244` states the distinction. The required/optional
asymmetry is the honest one: a modal header always renders a close button, a sheet's scrim is
announced only when the caller has no visible close control. **No finding.**

### 6. The engine's colour extraction is a genuine tightening

`engine/logic/media/audio-levels.ts` replaces two hex-returning functions with `LevelFillBand` /
`RecorderStatusTone` unions; `recorderStatusTone` keeps its `assertNever` default arm; both
consumers are `Record<RecorderStatusTone, string>` / `Record<LevelFillBand, string>`
(`screens/AudioRecorderScreen.tsx:119`, `:126`), so a new band or tone is a compile error at the
paint site. `engine/logic/media/index.ts:132-135` re-exports both types with the `type` keyword
(`isolatedModules`-correct). The id-space precedent, applied well. **No finding.**

### 7. Registry-to-type linkage across the status family — closed in both directions

`tokens/status.ts:60` `STATUS_SEVERITY … as const satisfies Record<LocationMapStatus |
'incident', StatusSeverity>`; `:95` `STATUS_ACCENT … satisfies Record<LocationMapStatus |
'incident', PaletteToken>`; `:82` `SEVERITY_ACCENT … satisfies Record<StatusSeverity,
PaletteToken>`; `:153`/`:159` the two badge scales `satisfies Record<StatusBadgeSize, …>`.
`severityTone` reads the palette by TEMPLATE INDEX, so a fifth severity with no `*Light` /
`*OnLight` trio is a compile error rather than an `undefined` that paints transparent.
`screens/DvrInfoScreen.tsx:40` `satisfies Record<RetentionStatus, StatusSeverity>`.
`screens/screenData.ts:53` replaced an exhaustive hand-written switch with `STATUS_LABEL[status]`
+ `STATUS_SEVERITY[status]`, both `Record<LocationMapStatus, …>` — a strict improvement, because
a new `LocationMapStatus` member now reds at the table instead of falling into a `default`.
**No finding.**

### 8. The `.mjs` guard's new light-CTA reads

`.design-sync/check-rn-parity.mjs:508-517`: `webGradOpts` carries no `resolve`, so if the light
arm of `PrimaryButtonGradient` were ever converted from literals to identifier references,
`readStop` returns the identifier text and the row reports DRIFT or PARSE-FAILED — loud, not
silent. The `before: '} as const'` substring cut over a line that actually ends
`} as const satisfies Record<…>` is correct and is disclosed at `:511-512`. No type surface to
critique and both stale directions fail safe. **No finding.**

---

## HIGH

```
[HIGH] The new record-arm skip in the clause-12 scheme-half scan is a whole-LINE regex, and it
       re-opens two forms the scan caught before it — including the multi-line destructure that
       W1/F23 added the destructure alternative for
Type: SCHEME_HALF (readonly RegExp[]) and the line filter that now pre-processes its input
File: features/demo/ui/__tests__/glass-tokens.test.ts:312 —
      `.filter((line) => !/^\s*(?:light|dark)\s*:/.test(line))`
      inside the scan at :294-319; SCHEME_HALF declared at :132-140
Invariant violated / permitted invalid state: plan §9 clause 12 ("nothing hard-codes a scheme
  half"; the flip stays a one-site change in `palette.ts`). W1's ruling — restated by this test's
  own docblock at :288-292 — is that THIS SCAN IS THE ONLY MECHANISM for that claim: while the
  demo renders dark, `GLASS_TIER.dark` and `GLASS_TIER[scheme]` are the same object, so no
  behavioural pin can ever observe the difference and the source text is the whole invariant.
  The skip is NECESSARY — U2.2's `DangerFill` is the first production module that must name both
  halves — but it is applied to the whole LINE, and `light:` / `dark:` at line start is
  AMBIGUOUS between a record ARM and a destructuring RENAME. Two forms now fall through:
    (a) a read of the WRONG half inside an arm — the copy-paste that `DangerFill`'s own docblock
        says "every consumer gets this wrong once" (`button-recipe.ts:92-93`: the `*Light` /
        `*Dark` names INVERT between schemes, which is why it is a lookup and not two literals);
    (b) a multi-line destructure of a two-half record, whose arms each look like a record arm.
Construction site: any of the six later packages `tokens/glass-tiers.ts:2` names as consumers
  (U5.1 and U7.2 among them), and any future two-half record — this wave added three, all in
  `controls/button-recipe.ts` (`PrimaryButtonGradient`, `ElevatedEdges`, `DangerFill`).
Downstream consequence — TWO MUTATION PROBES, both SURVIVED. Mutated copies are the CANONICAL
  production files, in a private probe worktree off `7bcb553`. Claimed pin:
  `glass-tokens.test.ts:294`, "no production module hard-codes a scheme half (plan §9 clause 12)".
  Baseline before either mutation: 7 passed, exit 0.
  - PROBE 2 — cross-half read in an arm. Mutation: `button-recipe.ts:100`,
    `light: palette.light.errorDark` -> `light: palette.dark.errorDark` (one line, one file).
    Result: **SURVIVED, exit 0 — "Tests 7 passed (7)"**. It is killed only by a DIFFERENT gate,
    `controls/__tests__/button-recipe.test.tsx:63` (re-run: `1 failed | 18 passed`), which pins
    that one constant by identity. That pin is excellent and I am not asking for it back — but it
    protects `DangerFill` alone. The SCAN, which is what protects the other ~138 files under
    `ui/`, reported green.
  - PROBE 3 — multi-line destructure. Mutation: `controls/header-chrome.ts:72`,
    `const header = GLASS_TIER[scheme].header` -> a four-line
    `const {` / `dark: darkHalf,` / `light: lightHalf,` / `} = GLASS_TIER` plus `darkHalf.header`.
    Result: **SURVIVED, exit 0 — "Tests 7 passed (7)"**.
  - NEGATIVE CONTROL — the SAME mutation written on ONE line
    (`const { dark: darkHalf } = GLASS_TIER`): **KILLED, exit 1** —
    `AssertionError: expected [ 'controls/header-chrome.ts' ] to deeply equal []`. So the line
    filter, not chance, is what hides the multi-line spelling. (The one-line form is the exact
    shape I probe-killed in W1 round 2 against F23's fix, in this same file.)
  - CAUSE ISOLATED, not argued. The two shipped `SCHEME_HALF` regexes were evaluated verbatim
    against each snippet with and without the line filter — pure string work in a scratch dir, no
    repo tree touched:
        single-line destructure            pre-skip=CAUGHT  post-skip=CAUGHT
        multi-line destructure             pre-skip=CAUGHT  post-skip=MISSED
        cross-half read in a light arm     pre-skip=CAUGHT  post-skip=MISSED
        plain member access                pre-skip=CAUGHT  post-skip=CAUGHT
    Both survivors were CAUGHT before this wave's skip landed. (b) is therefore a fix-introduced
    regression against F23; (a) was previously caught by a scan that ALSO red-flagged the CORRECT
    `DangerFill`, so the skip fixed a real false positive and overshot.
  Net effect: a test titled "no production module hard-codes a scheme half" now reports green
  over a wrong-half read inside a two-half record — the single defect class this wave's own three
  new two-half records are most exposed to — and over the destructure form a previous round
  specifically closed. It carries D2's central claim for six more waves.
Fix: two independent narrowings; the cheap half is verified.
  1. **Run the DESTRUCTURE alternative against the UNFILTERED source**, keeping the line filter
     for the member-access alternative only. Measured over seven cells: the three correct record
     forms (`DangerFill`, `PrimaryButtonGradient`, `ElevatedEdges`) stay green and all four
     evasion forms — multi-line destructure, single-line destructure, dot access, bracket access
     — go RED. One line, no new mechanism, and PROBE 3 becomes its negative control.
  2. **Narrow the arm skip to the arm's OWN half**: a `light:` arm may name `light`, a `dark:`
     arm may name `dark`, and a cross-half read inside either still reds. A short sketch got 7 of
     8 cells right, so the direction is sound, but the exact spelling wants care — the record-arm
     / destructure-rename ambiguity above IS the difficulty, and resolving it is the fix author's
     call, not mine. If it is judged disproportionate, the honest alternative is a ledger row
     with the trigger "a two-half record lands whose halves are not both bare literals", since
     the scan's own comment at :306-307 already concedes that `PrimaryButtonGradient` and
     `ElevatedEdges` "escape only by holding literals, which is luck, not rigour".
```

---

## MEDIUM

```
[MEDIUM] 22 exported/module-level style fragments are `: CSSProperties`-ANNOTATED and therefore
         MUTABLE, where the sibling fragments in `glass-tokens.ts` are `as const satisfies
         CSSProperties` and readonly — including four that every sheet, dialog and modal in the
         demo spreads on every render
Type: sheetSurface / sheetScrim / sheetHeaderBand (+10 siblings), dialogSurface / dialogScrim,
      modalScrim / modalSheet / modalSheetEnter / modalHeaderBar
File: features/demo/ui/controls/sheet-chrome.ts:108, 135, 148, 163, 182, 192, 208, 222, 238, 257,
      270, 273, 276
      features/demo/ui/controls/CentredDialog.tsx:76, 108
      features/demo/ui/screens/_shared.tsx:97, 108, 137, 174 (+ module-local :55, :200)
      features/demo/ui/controls/Banner.tsx:114, 134 (module-local)
      features/demo/ui/controls/EmptyState.tsx:56, 65, 77 (module-local)
      features/demo/ui/controls/button-recipe.ts:135 (`SIZES`, module-local, spread per call)
Invariant violated / permitted invalid state: PR #8's shared-catalog finding, restated as this
  repo's precedent 7 — module-level shared data is `readonly`, because a mutable shared reference
  can be corrupted through any one consumer. A `: CSSProperties` annotation over an object
  literal keeps excess-property checking (a typo'd CSS key is still a compile error) but produces
  a MUTABLE type; `as const satisfies CSSProperties` produces a readonly one. This wave's own
  `glass-tokens.ts` gets it right — `glassWell` landed this wave at `:294` as
  `as const satisfies CSSProperties`, beside `glassCard` / `glassCardNested` — and W1/F20 was
  filed and FIXED for exactly this shape on `controls/header-chrome.ts`. `sheet-chrome.ts:188`
  then spreads that repaired `glassHeaderBar` into a `: CSSProperties`-annotated const,
  re-widening it one wave later.
Construction site: any consumer of the four EXPORTED surface fragments. `sheetSurface` is spread
  by `GlassBottomSheet.tsx:334` on every render of every sheet (the seven `PickerSheet`
  consumers plus the media library, the export action sheet and the map filters);
  `dialogSurface` by `CentredDialog.tsx:313` for all three centred dialogs; `modalSheet` by
  `_shared.tsx:281` for `ModalShell`'s eight callers plus the Settings sheet. A single stray
  `sheetSurface.background = x` anywhere persists for the process lifetime and repaints every
  sheet in the demo.
Downstream consequence — MUTATION PROBE 4, with an in-run negative control. Mutated copy: a
  throwaway `features/demo/ui/zz-probe-mutability.ts` created inside the probe worktree and
  deleted afterwards (`git status --short` empty). Five assignments, one typecheck:
      sheetSurface.background = 'red'      COMPILES        <- no error
      dialogSurface.padding = 999          COMPILES        <- no error
      modalSheet.top = 0                   COMPILES        <- no error
      glassCard.borderRadius = 1           TS2540 readonly <- CONTROL, killed
      glassWell.borderRadius = 1           TS2540 readonly <- CONTROL, killed
  The control is on shipped, live, covered code in the same file and the same compiler run, so
  the annotation is the only difference. Nothing mutates these today — every docblock instructs
  consumers to SPREAD, and I grepped: no site writes to any of them. That is why this is MEDIUM
  and not HIGH; it is the same standing the PR #8 finding had when it was filed, and the same
  shape W1/F20 was fixed for.
Fix: `} as const satisfies CSSProperties` on the fragments, matching `glassCard` /
  `glassCardNested` / `glassWell` and the repaired `header-chrome.ts` trio. Purely additive —
  every consumer spreads, so no usage changes. It also restores the compile-time identity device
  (`satisfies typeof X`) that W0/F7 introduced and that a `: CSSProperties` annotation erases,
  measured by my predecessor at W1/F20 with the exact TS2322 text. `SIZES` is the same one-token
  change; the `Record<…>` lookup tables in `AudioRecorderScreen` / `Banner` / `choice-controls`
  are in the same class if the sweep is done at all.
```

```
[MEDIUM] `BannerSeverity` is a verbatim re-declaration of `StatusSeverity`, and `Banner`
         re-derives the three-token trio `severityTone()` exists to own — contradicting
         `tokens/status.ts:113`'s own claim that "every badge, chip, pill, note AND BANNER in the
         demo resolves here"
Type: BannerSeverity vs StatusSeverity
File: features/demo/ui/controls/Banner.tsx:68 —
        export type BannerSeverity = 'info' | 'warning' | 'error' | 'success'
      features/demo/ui/tokens/status.ts:42 —
        export type StatusSeverity = 'info' | 'warning' | 'success' | 'error'
      Same four members, different order, no type-level link.
      Trio re-derivation, Banner.tsx:149-150 + :171-174 against status.ts:120-125:
        background = colors[`${severity}Light`]    ==  severityTone(severity).background
        foreground = colors[`${severity}OnLight`]  ==  severityTone(severity).color
        border     = colors[severity]              ==  severityTone(severity).borderColor
      Third touch-point — controls/__tests__/banner.test.tsx:31:
        const SEVERITIES: BannerSeverity[] = ['info', 'warning', 'error', 'success']
      re-types the union in a MUTABLE array, where status.ts:45 exports
        export const SEVERITIES = [...] as const satisfies readonly StatusSeverity[]
      with the doc comment "The four, enumerable. A pin loops this rather than re-typing the
      union." Two other suites loop the exported one (`ui/__tests__/palette-contrast.test.ts:11`,
      `tokens/__tests__/status.test.ts:70`); the Banner suite loops its own copy.
Invariant violated / permitted invalid state: `tokens/status.ts` declares itself "the demo's ONE
  status severity recipe" and `SEVERITIES` "closed at four" (`:36-38`). Two structurally
  identical unions with no link can diverge silently in the direction that matters: a fifth
  severity added to `StatusSeverity` + `SEVERITIES` — which the palette permits the moment a
  fifth `*Light` / `*OnLight` trio lands — leaves `BannerSeverity` and `banner.test.tsx`'s local
  list at four, so THE demo's one severity callout silently refuses a severity every other status
  surface accepts, and its own contrast sweep never measures it. Nothing reds.
Construction site: not reachable today — the two unions are mutually assignable, every current
  call site compiles either way, and `severityTone` and `Banner` produce identical values for all
  four. `PaneNote` shows the intended shape: `settings/panes/_pane-chrome.tsx:105` takes a
  three-member subset and calls `severityTone(tone)`, with the reason stated in-type at :82-83.
Downstream consequence: the duplication itself. Two independent transcriptions of the D8a pairing
  rule (`*Light` fill / `*` border / `*OnLight` text) now exist, both quoting the phone's Banner
  docblock as their source, and only one of them is named as the owner. A re-tint or a rule
  change has to land in both.
Fix: `import type { StatusSeverity } from '@/features/demo/ui/tokens/status'` and either alias
  (`export type BannerSeverity = StatusSeverity`) or drop the alias; have `Banner` read
  `severityTone(severity)` for the trio; have `banner.test.tsx` loop the exported `SEVERITIES`.
  The precedent is the wave's own — `screenData.ts:53` and `_pane-chrome.tsx:105` both route
  through `severityTone`. U3.3's report explains WHY it happened (D19 deliberately kept U3.3 out
  of U3.2's files, `u3.3-implementation-report.md:183`); that is a good reason for the package
  boundary and not a reason for the WAVE HEAD to carry two vocabularies. If the owning seat is
  out of scope now, this is a clean ledger row with the trigger "a fifth `*Light`/`*OnLight` trio
  lands, or U6.2 replaces `PaneNote` with the Banner component".
```

```
[MEDIUM] `Toggle`'s `disabled` / `describedBy` is exactly the split-optional pair the SAME props
         type collapsed into one member two properties earlier, and the docblock states the
         invariant in words instead of in the type
Type: Toggle's inline props object
File: features/demo/ui/screens/_shared.tsx:667 (`disabled?: boolean`), :685 (`describedBy?:
      string`), consumed at :722 (`'aria-describedby': disabled ? describedBy : undefined`)
Invariant violated / permitted invalid state: the type permits `disabled` with no `describedBy`.
  The doc comment at :672-684 says the quiet part out loud — "**required in practice whenever
  `disabled` is set (R-6)**" — and then explains that this is the half P7.1 shipped and got
  wrong: "`aria-disabled` announces a STATE ('dimmed'); it carries no reason, and in focus mode a
  screen reader reads only the focused node's name/role/state — never an unlabelled sibling. So
  'hear WHY from the copy beside it' was true of the pixels and false of the accessibility tree,
  and a visitor could not tell 'deliberately locked' from 'broken'." Constructing
  `<Toggle disabled … />` without `describedBy` re-creates that exact defect, silently: the
  render path degrades to `aria-describedby={undefined}` rather than failing.
  The counter-example is TWO PROPERTIES BELOW, in the same type — `disclosure?: { controls:
  string; expanded: boolean }` (:686-698), with the rationale "**ONE member, not two optionals
  (FD-4). The split pair permitted `controls` without `expanded` … The two facts arrive together
  or not at all, so the type says so.**" That is the `RetentionView` house pattern applied
  correctly, immediately adjacent to a pair that did not get it.
Construction site: any new inert switch. I grepped all four current `disabled` call sites —
  `settings/panes/AppearancePane.tsx:42-43`, `CloudSyncPane.tsx:56-57`, `FormFieldsPane.tsx:236-237`
  and `:263-264` — and all four pass `describedBy`. Consumers are coping, which is why this is
  MEDIUM and not HIGH. `Toggle.test.tsx:71` and `:87` also always pass the pair, so no pin fails
  on the bad shape either.
Downstream consequence: the R-6 accessibility fix this wave just landed is enforced by convention
  only, on the control the wave made THE single switch renderer for the whole demo —
  `screens/__tests__/one-switch-renderer.test.ts` guarantees a fifth implementation cannot
  appear, which concentrates every future inert switch on this one type.
Fix: the FD-4 move, one property up. Either `disabled?: { reasonId: string }`, or — keeping both
  names — the `RetentionView` union `({ disabled?: false; describedBy?: never } | { disabled:
  true; describedBy: string })` intersected with the rest of the props. All four call sites
  already pass both, so the migration is a rename at most. Naming FD-4 in the fix's comment is
  what keeps the two properties consistent for the next reader.
```

---

## LOW

```
[LOW] Two of the wave's three new two-half records carry no `satisfies Record<ColorScheme, …>`,
      and the third spells `'light' | 'dark'` inline instead of importing the discriminant
Type: ElevatedEdges, DangerFill, PrimaryButtonGradient
File: features/demo/ui/controls/button-recipe.ts:83-86 (`ElevatedEdges … as const`, no satisfies),
      :99-102 (`DangerFill … as const`, no satisfies),
      :69-72 (`PrimaryButtonGradient … as const satisfies Record<'light' | 'dark', readonly
      [string, string]>`)
Invariant violated / permitted invalid state: W1/F19's shipped fix and my predecessor's ruling on
  it set the shape — `SHADOW_CARD … as const satisfies Record<ColorScheme, string>`, because
  "`Record<ColorScheme, string>` is the same discriminant `palette.ts` and `glass-tiers.ts` use,
  so a half added to or dropped from this record is a compile error the same way theirs are".
  Neither `ElevatedEdges` nor `DangerFill` references `ColorScheme` at all, and
  `PrimaryButtonGradient` restates its two members as literals.
Construction site: dropping a half (probe below), adding a third key, or letting the two halves'
  inner shapes diverge — `ElevatedEdges` is the only one with a nested object.
Downstream consequence — MUTATION PROBE 5. Mutated copy: canonical `controls/button-recipe.ts`.
  Mutation: delete `ElevatedEdges`'s `light:` line.
  Result: **KILLED (exit 2) — but by a TEST file, not by the constant's own type**:
  `controls/__tests__/button-recipe.test.tsx(51,26): TS2339: Property 'light' does not exist on
  type '{ readonly dark: { … } }'`. The production module compiles clean. All three records ARE
  pinned at the constant, by identity AND by value, at `button-recipe.test.tsx:36-41`, `:47-53`
  and `:62-66` — a genuinely good set of pins — so every direction of this class is caught today.
  Restore: verified byte-identical.
  LOW rather than MEDIUM because no invalid state is reachable and the flip direction also fails
  safe: on the day `scheme` becomes `'light'`, a missing arm is a hard compile error at
  `paint()`'s `ElevatedEdges[scheme]`. Filed only because the wave's own scan comment already
  concedes the point — `glass-tokens.test.ts:306-307`: "`PrimaryButtonGradient` and
  `ElevatedEdges` beside it escape only by holding literals, which is luck, not rigour."
Fix: `as const satisfies Record<ColorScheme, { top: string; bottom: string }>` on
  `ElevatedEdges`, `as const satisfies Record<ColorScheme, string>` on `DangerFill`, and swap
  `Record<'light' | 'dark', …>` for `Record<ColorScheme, …>` on `PrimaryButtonGradient`.
  `ColorScheme` is already exported from `tokens/palette.ts:222` and `button-recipe.ts:4` already
  imports from that module. Three type arguments.
```

```
[LOW] `CheckboxBox`'s glyph lookup bridges `CheckboxChecked` to a hand-written key space with an
      `as` cast, which silences the check the wave's own template-literal idiom would keep
Type: GLYPH (Record<'true' | 'false' | 'mixed', ReactNode>) and CheckboxChecked
File: features/demo/ui/controls/choice-controls.tsx:146 (the record), :140 (the union),
      :192 (`{GLYPH[String(checked) as keyof typeof GLYPH]}`)
Invariant violated / permitted invalid state: the record's key space is a hand-written
  stringification of the union, and the `as keyof typeof GLYPH` cast is the only thing joining
  them. A member added to `CheckboxChecked` gets no glyph entry and no compile error.
Construction site: widening `CheckboxChecked`. Not far-fetched — the type's own doc comment at
  :139 is "Exactly what `aria-checked` takes, so a consumer needs no second vocabulary for
  tri-state", and ARIA's `aria-checked` also admits `"undefined"`.
Downstream consequence — MUTATION PROBE 6. Mutated copy: canonical
  `controls/choice-controls.tsx`. Mutation: `CheckboxChecked` += `| 'pending'`.
  Result: **SURVIVED at compile time — `tsc --noEmit --incremental false` EXIT 0.** At runtime
  `GLYPH['pending']` is `undefined`, and `filled` (:172) is false for the new member, so the box
  renders as plain-unchecked with no glyph — silently, with no error anywhere.
  Restore: verified byte-identical, tsc back to EXIT 0.
  LOW because the union mirrors ARIA and is unlikely to move, the failure is cosmetic, and the
  component has one consumer today.
Fix: type the record to the union instead of casting through it —
  ``const GLYPH = { … } as const satisfies Record<`${CheckboxChecked}`, ReactNode>`` (checked:
  `` `${boolean | 'mixed'}` `` is exactly `'true' | 'false' | 'mixed'`), and drop the `as` at
  :192. This is the SAME template-literal indexing device the wave already uses twice and relies
  on for exactly this guarantee — `status.ts:121-123` and `Banner.tsx:148-150`, where the in-code
  comment says it out loud: "the three reads are template-indexed so a renamed token is a compile
  error rather than an `undefined` that paints transparent."
```

---

## Considered and dropped

- **`NoBorderShorthand` on `sheetSurface` / `dialogSurface` / `glassWell` / the Banner fragment.**
  My predecessor ruled this a PROPOSAL and deliberately did not file it in W1 round 2, on three
  grounds I re-checked and agree with: it would guard the DECLARATION (a handful of static
  literals, one author) and not the CONSUMER spread where the hazard actually lives;
  `deferred.md` §27 is the ratified precedent for test-over-type on static single-author literals
  and its trigger has not fired; and the consumer half is now covered by two real mechanisms —
  the per-consumer DOM loops (`ui/__tests__/glass-well-recipe.test.tsx` renders both violating
  shapes as negative controls) and React's conflicting-property warning promoted to a repo-wide
  test failure. Not relitigated.
- **`caseStatusTheme`'s `default:` arm** (`screens/screenData.ts:36`). A `default` over
  `DemoCase['status']` is the `FallbackMode` anti-pattern, but the arm is PRE-EXISTING — this
  diff changed the label inside it ('Draft' -> 'Active') and the tone, not the shape. Per the
  contract, pre-existing drift is context. Worth knowing that its sibling `locationStatusTheme`
  moved the OTHER way this wave (exhaustive switch -> a `satisfies Record<union, …>` table), so
  the two now disagree about how a new status is caught.
- **Three test files each re-declare `const SCHEMES = ['light','dark'] as const`** — in two
  different orders — rather than deriving from `ColorScheme`
  (`controls/__tests__/banner.test.tsx:32`, `tokens/__tests__/status.test.ts:15`,
  `ui/__tests__/palette-contrast.test.ts:231`, the last aliasing it as
  `type GlassScheme = (typeof SCHEMES)[number]`, a local duplicate of the exported `ColorScheme`).
  A typo'd member is still a compile error at `palette[s]`, and the only uncaught direction is a
  MISSING half — which cannot happen while `ColorScheme = keyof typeof palette` and D2 is a
  two-half decision. Residual, not a finding.
- **`openDialogs: object[]`** (`CentredDialog.tsx:184`) — a mutable module-level array, but it is
  a runtime LIFO stack whose mutation IS the mechanism, not a registry, and its elements are only
  ever compared by identity. Correct as written.
- **`hideLabel?: boolean` rather than `?: true`** (`_shared.tsx:709`). Six call sites pass the
  bare attribute or omit it, so the `Feature.draft` precedent looks like it applies — except
  `Toggle.test.tsx:116` legitimately parameterises it (`hideLabel={hidden}`) to run the same
  assertions across both modes, which is the case `?: true` forbids. Correct as written.
- **`SEVERITY_ICON: Record<BannerSeverity, JSX.Element>`, `Edges`, `RadioOptionProps`,
  `EmptyStateProps`, `StatusBadgeSize`, `SeverityTone`, `StatusTheme extends SeverityTone`,
  `ButtonRecipeOptions`, `GlassBottomSheetProps`, `PaneNoteTone`** — all read; all honest.
  `EmptyState`'s `action?: ReactNode` guarded with `action !== undefined` rather than truthiness
  is the right call for a `ReactNode`. `choice-controls.tsx:32-39` reasons `checked x disabled`
  into UNREPRESENTABILITY by not taking the prop at all, and names the trigger for adding it —
  that is the strongest form of this lane's answer and it deserves the aggregator's notice as a
  positive, not just an absence of findings.

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 2 |

Canonical homes preserved (no parallel entity declarations): **no** — `BannerSeverity` duplicates
`StatusSeverity`, and `banner.test.tsx` re-types the exported `SEVERITIES` (MEDIUM 2)
Discriminated unions well-formed: **yes** — `SheetPhase`, `ButtonVariant` / `ButtonSize`,
`StatusSeverity`, `LevelFillBand`, `RecorderStatusTone`, `CheckboxChecked` are all closed and
payload-free
Exhaustiveness enforced (never-checked switches): **yes** — `recorderStatusTone` keeps
`assertNever`; `paint()`'s five-arm switch is compile-enforced structurally (PROBE 1, KILLED)
Correlated state modelled as a union: **partial** — `disclosure` yes (FD-4, exemplary);
`disabled` / `describedBy` no (MEDIUM 3)
Id spaces typed (no bare-string registries/keys): **yes** — every new lookup is
`Record<Union, …>` or `as const satisfies Record<Union, …>`; the one cast-bridged space is LOW 2
readonly discipline on shared data: **gap found** — 22 mutable `: CSSProperties` fragments
against `glass-tokens.ts`'s readonly siblings (MEDIUM 1; PROBE 4 with an in-run control)
Boundary types honest about untrusted input: **n/a** — no new boundary type this wave; the
`.mjs` guard's new reads fail loud in both stale directions
Two-scheme discipline (D2 / plan §9 clause 12): **gap** — the scan that is the only mechanism for
it now reports green over a wrong-half read in an arm and over a multi-line destructure (HIGH)

| Check | Result |
|---|---|
| Mutation probes this round | **6 run — 3 KILLED, 3 SURVIVED**, plus an in-run negative control on shipped code (PROBE 4's two `TS2540`s) and a single-line negative control for PROBE 3. Restores proved byte-identical (`git status --short` and `git diff --stat` both empty; the two suites 26/26; `tsc` EXIT 0) |
| Probe provenance | every mutation was applied to the **canonical** production file, never a mirrored copy; the one exception is PROBE 4's throwaway `zz-probe-mutability.ts`, created and deleted inside the probe worktree |
| Motion mode | n/a — no probe touched motion-gated code |
| Prescriptions checked before writing | W1's `sourceFiles` / `SCHEME_DECLARERS` ruling (holds — no finding), §27's test-over-type precedent (not relitigated), W1's `NoBorderShorthand` proposal (not re-raised), `deferred.md` §4/§5/§16/§27 and §89-§98 (none fired) |
| Probe worktree teardown | `tools/worktree-remove.ps1` — "unlinked 549 junction(s) in 2 pass(es)", `.pnpm` 240 -> 240, exit 0; branch `probe/w2-types-recipes` deleted |

Verdict: **REVISE**

Out-of-lane observations:
- `.design-sync/check-rn-parity.mjs:508-517` reads the light CTA stops out of
  `controls/button-recipe.ts` with a `before: '} as const'` substring cut over a line that now
  ends `} as const satisfies Record<…>`. Correct today and disclosed, but it is a text cut over a
  type annotation — a guard-fragility question for the test lane, not a type one.
- `screenData.ts`'s `StatusTheme` widened from four keys to five (`accent` arrived) and its
  consumers now spread `severityTone()` wholesale. Whether every consumer that reads `.color`
  should instead read `.accent` is a rendering-correctness question the web lane owns;
  `screens/__tests__/status-owners.test.tsx` appears to be the pin for it and I did not evaluate
  its coverage.
