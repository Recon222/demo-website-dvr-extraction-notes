# Vetted Review — W2 (phases U2+U3+U4, PR #42 `feat/uiparity-w2` @ `7bcb553` vs `master` @ `43ccbad`) — Round 1

**Verdict:** REVISE
**Lanes read:** typescript 0/1/2/1 REVISE · web 0/1/2/1 REVISE · tests 0/3/2/2 REVISE · silent-failures 0/2/1/0 REVISE · type-design 0/1/3/2 REVISE · verification seat `_captures/w2/DIFF.md` (no labels — 109/117 changed, 13:1 signal:noise vs a same-sha control, 1 regression §5.1, 5 unphotographable surfaces §4.2, checkpoint-2 list §7)
**After dedupe:** 0 critical · 4 high · 14 medium · 6 low — **F26–F49** (25 raw lane items + 1 verification regression + 2 refused deferral-proposals + 1 TRIGGER-LAPSED ledger row → 24 findings)
**Unsettled (operator escalation):** 0
**Aggregator:** `ab0635173e8414282` (Fable) — **rotation successor, not a fresh reset**; first aggregation of this seat. F-IDs continue from W1's F25; ledger §-numbering continues at 99.

Cold gates at `7bcb553`, reproduced independently by three lanes and the integrator: tsc 0 · 290 files / 3,881 passed | 4 todo · guard 135/135 (41 palette + 24 tier keys × both halves + 4 CTA stops + touchFloor) · `/demo` First Load 107 kB (web measured master and HEAD in the same tree: demo async chunk +1,363 B on a +9,149-line diff).

## Unsettled — for the operator (never affects the verdict)

None. Two disputes settled empirically this round:

1. **A22 dialog backdrops (U4.3's correction #6 vs the matrix text vs the verification seat's reading).** Settled at phone source (precedent: source beats prose). The phone paints **two** backdrop values, not one: `colors.scrim` (0.32) for the sheet family, `colors.overlay` (0.9) behind both centred dialogs (`DeleteConfirmationModal.tsx:229`, `export/ExportModal.tsx:325,360` — U4.3's citations, re-opened and confirmed). A22's "three darknesses collapse into one" is refuted for the dialog subset; its own "scrim and overlay are deliberately not interchangeable" sentence is the half that survives. The shipped `dialogScrim` (`rgba(4,8,14,0.66)`) matches **neither** phone token → F43. The verification seat's "dialogs keep darker exceptions — exactly what A22 specifies" is a misreading of A22 (pipeline notes).
2. **Severity of the sheet-shell pin gap** (tests HIGH-1) vs the single-site pin gaps (tests HIGH-2/HIGH-3) — split by precedent, not averaged: the shell-wide gap is HIGH (F28), the single-site gaps are MEDIUM (F30, F31). Reasoning in Dropped/demoted.

## Findings

### F26 [HIGH] `Banner` builds `severityTone()`'s trio privately — the demo's ONE severity callout is off the seam whose docblock names it
Lanes: typescript — original label: HIGH (SURVIVED probe + 4-clause negative control); type-design — original label: MEDIUM (its M2: `BannerSeverity` re-declares `StatusSeverity`; `banner.test.tsx:31` re-types `SEVERITIES` mutable). Cross-lane independent identification from opposite ends of the same defect.
File: `features/demo/ui/controls/Banner.tsx:68` (`BannerSeverity`), `:146-150` (inline `colors[`${severity}Light`]` / `OnLight` reads), `:171-174` (four accent longhands) — vs `features/demo/ui/tokens/status.ts:113` ("Every badge, chip, pill, note **and banner** in the demo resolves here") and `:118-126` (`severityTone`). Third touch-point: `controls/__tests__/banner.test.tsx:31`.
Issue: spot-checked at source — confirmed. Re-tinting the seam (the single edit it exists to make possible) moves the badge, the retention pill and `PaneNote` while all four Banner surfaces silently keep the old trio; ts probe: seam mutated → `banner.test.tsx` 24/24 green (SURVIVED), negative control 4 FAILED in `status.test.ts` + `status-owners.test.tsx`. Root cause is a merge-order artifact — U3 assembled U3.3 *before* U3.2, the inverse of §6.2, so U3.2's CONSUME-ME ("delete the private trio and take the seam — U3.2 merges first") was written for a merge that never happened. It gets worse on schedule: U6.2 deletes `PaneNote`, today the only `severityTone` callout consumer, onto `Banner`. Plan §5's SEAM rule ("a consumer never builds a private copy") is the documented convention violated; unlike the scheme-half class, no scheduled check ever observes this divergence.
Fix: `const tone = severityTone(severity)`; spend `tone.background` / `tone.color` / `tone.borderColor` (accent stays the four longhands per the lit-edge rule); alias or replace `BannerSeverity` with `StatusSeverity`; `banner.test.tsx:31` imports the exported `SEVERITIES`. Re-run the ts lane's seam probe and confirm the kill.
Owner: `ae5212edcaf8ada66` (U3.3 seat — `Banner.tsx` author)

### F27 [HIGH] The unchecked/unselected selection mark lost its only visual carrier — 4.35:1 → 1.33:1 against a 3.0 floor (WCAG 1.4.11), measured twice
Lanes: web — original label: HIGH (pixel-sampled from this wave's own capture + independent composite arithmetic; probe 4 KILLED proves the pin asserts the HEX, not the ratio)
File: `features/demo/ui/controls/choice-controls.tsx:180-181` (`CheckboxBox` unchecked: `colors.border` ring on `colors.background` fill), `:79` (`RadioOption` unselected edge `colors.border`). Consumers: `export/ExportCaseCard.tsx:161` (the "Select all" box — no visible label, the box IS the control), `RequestedScopeScreen.tsx:57-58`, `settings/panes/FormFieldsPane.tsx:158`, `_pane-chrome.tsx:216`.
Issue: spot-checked at source — confirmed, with one material fact the lane's fix line anticipated and my check settles: **the shipped value is the phone's own recipe** (`Checkbox.tsx:61`, `borderColor: filled ? colors.primary : colors.border`), so this is a faithful transcription that fails the port's own contrast contract. Matrix C.3 rule 4 — owner-ratified case law — names this exact case: *"a sole-boundary input border at 1.26 is not [correct]"*. Master shipped `#7a9fc4` (3.87–4.41, passing), so on the demo this is a PASS→FAIL regression. D5's amendment establishes the house shape for exactly this (the map badge took `primaryDark` instead of the phone's failing value). The only pin on the value is a hex equality that stayed green through a 3.3× contrast drop.
Fix: unchecked/unselected edge → `colors.textTertiary` (`#7a9fc4`, 3.87–4.41 on the tiers — master's value); move the hex pin with it; add a 1.4.11 row to `palette-contrast.test.ts` bounding the unchecked mark against the card + elevated tiers. Record the divergence-from-phone at the site with the C.3 rule-4 citation, and list the phone's own 1.33 as a plan-§8 phone-side follow-up candidate. If the owner instead rules the phone value binding, that is a D5 fifth-ceiling ledger row — not the current unrecorded state.
Owner: `ae2d7a1139ac951d1` (U2.4 seat)

### F28 [HIGH] `GlassBottomSheet` mounts five `sheet-chrome` fragments and not one is pinned on the rendered element — deleting `...sheetSurface` survives all 3,881 tests
Lanes: tests — original label: HIGH (five SURVIVED probes full-suite; two KILLED controls on the sibling shell prove it is a gap, not a house limitation)
File: `features/demo/ui/controls/GlassBottomSheet.tsx:334` (`...sheetSurface`), `:367` / `:371` / `:382` / `:394` (handle, header band, accent strip, scrim). Second touch-point: `controls/__tests__/sheet-chrome.test.tsx:341` — titled "is the SAME shadow on the picker sheet, the export action sheet and the map sheet" and never renders the picker sheet (spot-checked: the body renders `ExportActionSheet` + `MapBottomSheet` only).
Issue: spot-checked at source — the panel spread is real and nothing joins fragment-correctness (`sheet-chrome.test.tsx`, constants) to shell-behaviour (`GlassBottomSheet.test.tsx`, 45 cases, zero paint reads). The whole paint contract of the wave's headline component is unfalsifiable: gradient, sides, 2px lit edge, radius 22, `SHEET_SHADOW`, `overflow:hidden`, safe-area padding and `colors.scrim` all vanish unobserved (5× SURVIVED, full suite exit 0). U4.2's `ModalShell` — the sibling shell in the same wave — is KILLED on the identical mutation, which is the house bar this shell missed. Use-day: U5.3 and U7.2 mount this shell with nobody re-running these probes. Held HIGH per W0/F11's precedent (silent survivor on the load-bearing surface of the package's own thesis, no compensating gate) — distinct from the single-site pin gaps below.
Fix: one case in `GlassBottomSheet.test.tsx` asserting the panel/scrim carry the fragments' values composed from `sheet-chrome` / `GLASS_TIER[scheme]` (the declaration-string idiom `SettingsModal.test.tsx` already uses covers all five spread points in one assertion; per-side longhand reads per the jsdom `borderColor` rule). Separately: render `PickerSheet` in `sheet-chrome.test.tsx:341` or retitle it. Re-run all five probes and confirm kills.
Owner: `a182220a9c6c7b4a9` (U4.1 seat)

### F29 [HIGH] The 3-up profile radio group overflows its pane ~42px — `flexShrink: 1` without `minWidth: 0` is a no-op, and two docblocks assert the opposite
Lanes: verification seat (§5.1 REGRESSION — root cause pinned by the coordinator's dispatch; on-screen on all four settings shots, `Canvas` clipped at the frame edge)
File: `features/demo/ui/controls/choice-controls.tsx:122-129` (the label span: `flexShrink: 1`, no `minWidth`), docblock `:74-76` ("`flexShrink: 1` on the label is load-bearing at three-up") — refuted by the captures; `FormFieldsPane.tsx:151-155` repeats the claim.
Issue: spot-checked at source — the span carries `flexShrink: 1` and no `minWidth`, so its default `min-width: auto` resolves to the min-content width of an unbreakable word (`Forensic`/`Limited`/`Canvas`) and the shrink can never engage. Captures `10-settings/12–15`: the row overflows the pane's right padding ~42px; the **selected** `Canvas` state is the one clipped. The docblock's own arithmetic (~39px text budget at 360dp) says this is worse on hardware than in the 1440×1000 harness. Live, visitor-visible, shipped — not a pin gap.
Fix: `minWidth: 0` on the label span (plus `overflow: hidden; textOverflow: 'ellipsis'; whiteSpace: 'nowrap'` if the design wants truncation over wrap — the fix owner decides against the phone's own 3-up rendering and says which). Correct both docblocks in the same commit; add one render pin if a falsifiable observation exists in jsdom (layout is not observable there — the honest pin may be the capture, so say so). Verification re-cut of the four settings shots is the merge evidence.
Owner: `ae2d7a1139ac951d1` (U2.4 seat)

### F30 [MEDIUM] `ModalShell`'s scrim drops `+ elevation` silently — the panel's half of D14's layering is pinned, the scrim's is not
Lanes: tests — original label: HIGH (DEMOTED, see Dropped/demoted)
File: `features/demo/ui/screens/_shared.tsx:277` (scrim `zIndex: MODAL_SCRIM_Z + elevation` — spot-checked, the term is present and correct today); pins: `UserProfilePane.test.tsx:326` (panel only), `SettingsModal.test.tsx:255` (scrim at elevation 0, where the term is inert).
Issue: tests probe — term dropped → full suite green (SURVIVED); same mutation on the panel (`:285`) KILLED. If regressed, the profile editor's dim paints at 21 under the Settings sheet at 22 and the sheet's controls stay hit-testable under a "modal" dialog. U4.2's report lists P20 "ModalShell drops `+ elevation` — KILLED"; P20 mutated the panel line only — the claim covers half the invariant (the false-coverage-claim class, recorded in pipeline notes, not a severity multiplier per W1 precedent).
Fix: one assertion beside `UserProfilePane.test.tsx:326` reading the editor's own scrim node against `MODAL_SCRIM_Z + MODAL_LAYER.overSheet`, plus an ordering assertion (`> SETTINGS_SHEET_Z`) since the invariant is an ordering. Re-run the probe.
Owner: `a285e52f0befce2f2` (U4.2 seat)

### F31 [MEDIUM] The recorder's status colours moved from a covered engine function to an uncovered UI lookup, and `status-owners.test.tsx` claims the coverage still exists
Lanes: tests — original label: HIGH (DEMOTED, see Dropped/demoted)
File: `features/demo/ui/screens/AudioRecorderScreen.tsx:119-123` (`STATUS_TONE_COLOR`, consumed `:204`/`:219`); the false claim: `screens/__tests__/status-owners.test.tsx:12-15` ("the recorder's two in `audio-levels.test.ts`" — that file covers the tone *vocabulary*, renders nothing, sees no colour).
Issue: tests probe — REC's red and PAUSED's gold both collapsed to `textSecondary` → full suite green (SURVIVED); the sibling `LEVEL_BAND_COLOR` three lines below is KILLED (control). Net protection **loss** through a correct refactor (the engine hexes were pinned under the 80% gate at master), asserted otherwise by a shipped docblock — the W1/F18 "claims a coverage it does not have" shape, which was MEDIUM.
Fix: three assertions in `status-owners.test.tsx` (render per phase; dot `background` + label `color` via the file's own `rgb()` helper; one not-equal between recording and paused so a collapse cannot pass), and correct `:12-15` to "the tone, not the paint". Re-run the probe.
Owner: `ae1c1cc2c29908306` (U3.2 seat — `status-owners.test.tsx` author; the lookup landed with its A69 move)

### F32 [MEDIUM] The choice-control exemption is FILE-scoped for a role-scoped ruling, and the "carries no dead exemptions" backstop cannot see an adoption — a planted radio in an exempt file survives the full suite
Lanes: silent-failures — original labels: HIGH ×2 (DEMOTED, see Dropped/demoted); tests — original label: MEDIUM (its M1, the adoption-shape probe). Three raw items, one root; cross-lane confirmation from both directions (sfh planted a NEW radio, tests performed a faithful ADOPTION — both survived).
File: `features/demo/ui/controls/__tests__/choice-controls.test.tsx:174-189` (`EXEMPT` — two checkbox rulings), `:223` (role-agnostic skip), `:248-257` (the dead-exemption test ORs the two roles). Touch-points per sfh's completeness sweep: `:223`, `:230-242`, `:252-255` — all three take the fix.
Issue: both exemption entries are CHECKBOX rulings whose mechanism exempts the whole file from the RADIO scan too (sfh probe: hand-rolled radio appended to `DvrInfoScreen.tsx` → 290 files/3,881 green; identical block in a non-exempt file → KILLED, naming the file). The dead-exemption test asks "does the file still declare either role", which an adoption never changes (`ExportCaseCard` keeps `role="checkbox"` on its pressable while `CheckboxBox` paints — the design, per the module's own docblock), so an exemption outlives its reason permanently and U2.4's D-1 deferral wording ("the test enforces the cleanup") is false. The aggravating consequence — a ledger row closing on a mechanism that never runs — is prevented at this desk (§100 is written with a corrected close condition), leaving the hand-maintained-carve-out class, graded MEDIUM three rounds running (F16/F23/F24).
Fix: key `EXEMPT` by `<role>:<rel>` (or store the role in the value) and compare it in `offenders()`; make the dead-exemption predicate "the file would NOT be reported were the entry removed" rather than a role check. Two entries, one predicate, all three touch-points. Re-run sfh's planted-radio probe and tests' adoption probe; keep both as negative controls.
Owner: `ae2d7a1139ac951d1` (U2.4 seat)

### F33 [MEDIUM] The clause-12 scan's whole-LINE record-arm skip re-opens two forms — a wrong-half read inside an arm, and the multi-line destructure W1/F23 specifically closed
Lanes: type-design — original label: HIGH (DEMOTED, see Dropped/demoted); silent-failures — original label: MEDIUM. Independent probes, same three survivors, negative controls isolating the line filter as the cause. Also refutes integration I-8's "fixed as a class" framing (its INFO status is re-scored: the skip removed the arms from coverage, it did not make them safe).
File: `features/demo/ui/__tests__/glass-tokens.test.ts:312` (`.filter((line) => !/^\s*(?:light|dark)\s*:/.test(line))`); the live construct: `controls/button-recipe.ts:99-102` (`DangerFill`, whose arms ARE cross-half reads by design — the `*Light`/`*Dark` names invert).
Issue: probes (both lanes): `light: palette.light.errorDark → palette.dark.errorDark` — scan green; td: multi-line destructure of `GLASS_TIER` — scan green, single-line form KILLED (the filter, not chance, hides it). The multi-line destructure is a fix-introduced regression against F23 with **no** compensating pin anywhere; the arm-read is compensated today only by `button-recipe.test.tsx`'s per-constant identity pin (sfh probed the kill), which is the hand-written-pin-per-record dependency the roster class warns about. The skip itself was NECESSARY (DangerFill is a legitimate two-half record) — the scope is the defect. Held MEDIUM for consistency with F18/F23/F24 (same scan, same use-day, same silent class; the flip day has a scheduled check).
Fix: td's verified half first — run the DESTRUCTURE alternative against the UNFILTERED source (one line; measured: three correct records stay green, all four evasion forms red; probe 3 becomes its negative control). Then narrow the arm skip to the arm's own half (a `light:` arm may name `light` only) — the fix author resolves the record-arm/destructure-rename ambiguity, or falls back to a ledger row with td's stated trigger. PRESCRIPTION-UNVERIFIED on the second half only (td's sketch got 7 of 8 cells). Re-run both lanes' probes + sfh's probe (c).
Owner: `a9f135565ce43133b` (U1.4 seat — the scan's author of record across F18/F23/F24; the skip landed at the integrator's U2 W1-carry, noted, but the file has one owner and it is warm)

### F34 [MEDIUM] Four new sheet/dialog chrome values ship the phone's DARK-ONLY treatment unconditionally — against D2, against the phone's own `isDark &&` gates, and against this wave's own `buttonStyle`
Lanes: web — original label: MEDIUM
File: `features/demo/ui/controls/sheet-chrome.ts:74` (`SHEET_SHADOW`), `:214` (accent-dot glow), `:228` (title text-shadow); `controls/CentredDialog.tsx:60` (`DIALOG_SHADOW`).
Issue: each is a hard-coded dark value on a fragment that otherwise resolves through `GLASS_TIER[scheme]`/`colors`; the phone gates two inside `isDark && {...}` (`GlassBottomSheet.tsx:326-343`) and ships light halves for the other two (`Layout.ts:157-181`). On the flip day every sheet and dialog casts a pure-black 40px shadow onto a pale surface. W1/F19 (`SHADOW_CARD`) is the settled house shape; `button-recipe.ts:170-179` in this same wave branches correctly. Not a §95 re-file (§95 is the anchor gap; this is the missing light half) — but the two fixes share files, see F42.
Fix: `Record<ColorScheme, …>` read via `[scheme]` for the two Layout-sourced shadows (light values from `Layout.ts:157-181`); `scheme === 'dark' ? … : undefined` for the two `isDark`-gated ones. Dark values unchanged — nothing rendered today moves.
Owner: `a182220a9c6c7b4a9` (U4.1 seat — `sheet-chrome.ts`); the `DIALOG_SHADOW` touch-point lands with `aacd7de1d0b63642a` (U4.3 seat, same one-line shape, its file)

### F35 [MEDIUM] `PdfPreview` is the demo's one remaining ungated `screenIn` entrance after the U4.2/U4.3 sweep — it fell in the gap between two packages that each pointed at the other
Lanes: web — original label: MEDIUM (probe 2, reduced-motion arm: four shells "" · PdfPreview "screenIn 0.3s ease")
File: `features/demo/ui/chrome/PdfPreview.tsx:136`.
Issue: `screenIn` translates 8px; `demo.css` has no reduced-motion block and the marketing block cannot reach inline styles; a reduce-preference visitor gets the translate here and nowhere else. Pre-existing line, but the file is in the diff (buttonStyle adoption), the PR body claims the sweep, and u4.3 marked it "U4.4 file" while u4.4 only reached the close chip.
Fix: the identical shape as `CentredDialog.tsx:320` — `useReducedMotion()` from `@/lib/hooks/use-reduced-motion`, `animation: reducedMotion ? undefined : 'screenIn 0.3s ease'`.
Owner: `a182220a9c6c7b4a9` (U4.1/U4.4 seat — its file)

### F36 [MEDIUM] Five merge-orphaned imports survive only inside comments — no gate in this repo catches the class, and grep censuses read them as live
Lanes: typescript — original label: MEDIUM (each verified individually; integrator I-5 recorded the class)
File: `controls/AlertDialog.tsx:6` (`GLASS`) · `screens/ExportModal.tsx:11` (`ExportModalMode`), `:18` (`GLASS`) · `settings/panes/_pane-chrome.tsx:8` (`colors`) · `__tests__/palette-contrast.test.ts:7` (`GLASS`).
Issue: no `noUnusedLocals`, no ESLint in the gate set; the campaign's method is deletion + grep censuses, which these five poison. The integrator applied exactly this check by name at one of three hunks and not the two siblings resolved in the same step.
Fix: delete the five bindings; keep the comments (they are the useful part). One mechanical commit.
Owner: `aace40599f45bd260` (integrator — merge-created class, disjoint from every other seat's fix files)

### F37 [MEDIUM] The conflicting-property tripwire never drives the `Field` error path — its "coverage is transitive" claim is false for one of the four fixes it is the sole guard for (I-7's row REFUSED; filed as a finding instead)
Lanes: aggregator (from integration I-7 — probe W1 SURVIVED: the W1 defect re-introduced into `fieldInputStyle`, 1,036 passed)
File: `vitest.setup.ts:41-48` (the claim — spot-checked, verbatim: "IT IS THE SOLE GUARD FOR FOUR PRODUCTION FIXES … coverage is transitive"); the unguarded path: `tokens/field-input.ts` border precedence.
Issue: the tripwire fires only when a test toggles `error` on a mounted `Field`; no suite does. The integrator's deferral reasoning ("the right owner should write it rather than the integrator bolting it on at merge") was true at merge time and is not true at this fix round — the right owner (U2.1's seat) is warm and dispatched at zero extra cost. W0 F9/F12 precedent: a deferral whose reason does not survive the fix round is a fix.
Fix: the integrator's own prescription — render a `Field`, rerender with `error` set then cleared, assert `conflictingStyleWarnings` empty and the border present, in the `field-input-recipe` suite; correct `vitest.setup.ts`'s docblock to name the new pin. PRESCRIPTION-UNVERIFIED (re-run integration probe W1 against it and confirm the kill).
Owner: `acfeda2f7cd15b91a` (U2.1 seat)

### F38 [MEDIUM] 22 exported/module-level style fragments are `: CSSProperties`-annotated and mutable, one wave after W1/F20 fixed the identical shape — including the four surfaces every sheet, dialog and modal spreads
Lanes: type-design — original label: MEDIUM (probe: three assignments compile; `glassCard`/`glassWell` controls TS2540 in the same run)
File: `controls/sheet-chrome.ts` (13 sites) · `controls/CentredDialog.tsx:76,108` · `screens/_shared.tsx:97,108,137,174 (+:55,:200)` · `controls/Banner.tsx:114,134` · `controls/EmptyState.tsx:56,65,77` · `controls/button-recipe.ts:135` (`SIZES`).
Issue: `sheet-chrome.ts:188` even spreads the F20-repaired `glassHeaderBar` into a re-widened const. Nothing mutates them today (grepped); the convention was established and fixed in this exact file family one wave ago, which is what lifts it above style.
Fix: `} as const satisfies CSSProperties` (or the `Record` equivalent on the lookup tables). Purely additive; every consumer spreads. Per-file, landing with the seat already opening each file this round: sheet-chrome + EmptyState → U4.1 seat & U3-family per below; `_shared.tsx` → U4.2 seat (with F30); `CentredDialog.tsx` → U4.3 seat (with F41/F43); `Banner.tsx` → U3.3 seat (with F26); `button-recipe.ts` `SIZES` → U2.2 seat (with F45); `EmptyState.tsx` → U3.3 seat as a declared one-line cross-territory rider (its author seat has no other findings).
Owner: primary `a182220a9c6c7b4a9` (U4.1 — 13 of 22 sites); touch-points as listed

### F39 [MEDIUM] `Toggle`'s `disabled`/`describedBy` is the split-optional pair the same props type collapses correctly two properties below — the R-6 a11y fix is enforced by convention only, on the demo's single switch renderer
Lanes: type-design — original label: MEDIUM
File: `screens/_shared.tsx:667` / `:685`, consumed `:722`; the in-file counter-example: `disclosure` at `:686-698` (FD-4, one member).
Issue: the docblock says "required in practice whenever `disabled` is set (R-6)" — the type permits the defect the docblock narrates. All four current call sites pass the pair (consumers coping), and `one-switch-renderer.test.ts` concentrates every future inert switch on this one type.
Fix: the FD-4 move — `({ disabled?: false; describedBy?: never } | { disabled: true; describedBy: string })` intersected with the rest, or `disabled?: { reasonId: string }`. Migration is a rename at most.
Owner: `a22c8bac1dd03a700` (U2.3 seat — `Toggle`'s author)

### F40 [MEDIUM] `deltaE` still turns an unparseable colour into NaN, and NaN passes the two-sided band — the disclosed defect was fixed at the call site, not in the helper
Lanes: tests — original label: MEDIUM (probe: revert `PANEL` to the bare hex → 9 passed, row green and vacuous)
File: `ui/__tests__/glass-well-recipe.test.tsx:187-201` (`lab`/`deltaE`), `:203-208` (the row), `:185` (the call-site fix).
Issue: `NaN < 3 || NaN > 12` is false, so the offender filter drops unmeasurable rows silently — the row cannot tell "in band" from "unmeasurable". `palette-contrast.test.ts:71` next door throws, which is the house shape.
Fix: throw from `lab()` on a non-finite channel; assert `Number.isFinite(dE)` (or the measured values) in the row. Two lines in the helper so a caller cannot undo it. Re-run the probe.
Owner: `ae2d7a1139ac951d1` (U2.4 seat)

### F41 [MEDIUM] All three dialog action rows sit at `gap: 8` where the phone spells `spacing.md` (16) in two files — u4.3's deferral-6 trigger (U2.2's pass on these files) fired inside this PR
Lanes: aggregator (from u4.3 report §10 deferral 6 — a proposed deferral whose named trigger fired in the same PR; refused as a row per W1 F18/F22 precedent)
File: `controls/AlertDialog.tsx:97` · `screens/DeleteConfirmationModal.tsx:167` · `screens/ExportModal.tsx:311` — spot-checked at `7bcb553`, all three still `gap: 8`. Phone: `DeleteConfirmationModal.tsx:313-316`, `export/ExportModal.tsx:439-442`.
Issue: a visible 8px divergence on all three centred dialogs, phone-agreed twice; §2's bar is "values AND geometry". The proposal's own reasoning (a U2.2 collision) expired when the wave assembled both packages.
Fix: `gap: spacing.md` at the three rows, with the two phone citations.
Owner: `aacd7de1d0b63642a` (U4.3 seat — owns all three dialog files this round)

### F42 [MEDIUM · TRIGGER-LAPSED §95] U4 landed the second and third shadow tiers with neither the composing anchor nor the recorded ruling §95's trigger required
Lanes: aggregator (ledger check — §95's trigger: "U4 landing `shadow.dialog`/`shadow.sheet` — that package adds the composing reader to the guard or records the gap once for all three")
File: `controls/sheet-chrome.ts:74` (`SHEET_SHADOW`, hand-composed from `Layout.shadow.sheet.dark`) · `controls/CentredDialog.tsx:60` (`DIALOG_SHADOW` ~ `Layout.shadow.dialog.dark`); the guard's shadow text (`check-rn-parity.mjs:372-373`) still covers only `innerShadow` — spot-checked, no update landed.
Issue: this is the only mechanism by which a suppressed issue reopens, so it is filed even though the code is dark-byte-correct today: three hand-ported shadow families now ship with only literal shape pins and no drift anchor on either side. F34's `Record<ColorScheme,…>` fix creates exactly the composed per-scheme values a reader can anchor.
Fix: in the same commits as F34, either add composed shadow anchors to the guard (a `shadowFor`-style reader over the five RN props, per §95's own sketch) **or** extend the guard's documented exclusion to name all three tiers with the §95 citation — either satisfies the row; then §95 is struck as resolved. One of the two, not neither.
Owner: `a182220a9c6c7b4a9` (U4.1 seat), CentredDialog half with `aacd7de1d0b63642a`

### F43 [MEDIUM] The centred dialogs' backdrop is `rgba(4,8,14,0.66)` — the phone paints `colors.overlay` there, and A22's fold-to-scrim text is refuted at phone source (adjudicated this round)
Lanes: aggregator (U4.3 correction #6 requested the ruling; `dialogScrim`'s docblock records the finding; verification §5.2/§2 measured the shipped state)
File: `controls/CentredDialog.tsx:108-114` (`dialogScrim`, the 0.66 literal — spot-checked); `screens/ExportModal.tsx` progress-branch scrim if separate (DIFF.md counts it among the five surviving literals). Touch-point: `_shared.tsx:108-112` (`modalScrim` 0.55).
Issue: ruling, settled at phone source (see Unsettled §1): sheet family → `colors.scrim` (shipped, correct); centred dialogs → **`colors.overlay`** (`rgba(0,40,83,0.9)`), per the phone's own two dialog files; the shipped 0.66 black matches neither token and is the last A22 work item. `modalScrim` (page sheets) has NO phone value — phone page sheets are native `pageSheet` presentations, the OS draws the dim — so 0.55 stays as a documented demo-only stand-in, ruled here.
Fix: `dialogScrim.background = colors.overlay` (and the ExportModal progress scrim with it); one docblock sentence on `modalScrim` recording the native-dim rationale and this ruling. Visual change is real (black → deep navy behind the delete confirm) — device-pass checkpoint 6 will see it; verification re-cuts the two dialog shots. A22's Delta correction goes to the orchestrator's plan-edit list.
Owner: `aacd7de1d0b63642a` (U4.3 seat); `modalScrim` docblock sentence with `a285e52f0befce2f2` (U4.2 seat)

### F44 [LOW] `CheckboxBox` indexes its glyph table through an `as` cast — a widened `CheckboxChecked` becomes a silent `undefined` glyph
Lanes: typescript — original label: MEDIUM (DEMOTED); type-design — original label: LOW (independent, with the compile-probe). Same finding, td's grade.
File: `controls/choice-controls.tsx:140,146,192`.
Fix: ``as const satisfies Record<`${CheckboxChecked}`, ReactNode>`` on `GLYPH`, drop the cast — the wave's own template-literal idiom (`status.ts:121-123`).
Owner: `ae2d7a1139ac951d1` (U2.4 seat)

### F45 [LOW] The three two-half records in `button-recipe.ts` do not name `ColorScheme` — two carry no `satisfies` at all
Lanes: type-design — original label: LOW (probe KILLED by the test file's pins, so no direction is uncaught today)
File: `controls/button-recipe.ts:69-72, :83-86, :99-102`.
Fix: `as const satisfies Record<ColorScheme, …>` ×3 (the W1/F19 shape). Three type arguments.
Owner: `aa98c67e1b8a92570` (U2.2 seat)

### F46 [LOW] The sheet scrim becomes `role="button"` with no `tabIndex` and no key handler the moment a caller passes `closeLabel`
Lanes: web — original label: LOW (latent — zero production callers today; the docblock invites A82's adoption)
File: `controls/GlassBottomSheet.tsx:391-393`.
Fix: decide at the seam now — drop the role (click-only backdrop, nothing announced) or add `tabIndex={0}` + the `switchKeyDown` equivalent when `closeLabel` is set.
Owner: `a182220a9c6c7b4a9` (U4.1 seat)

### F47 [LOW] Four dead style keys precede the `buttonStyle` spread in `AlertDialog` — recipe-owned keys the spread overrides
Lanes: typescript — original label: LOW (scripted sweep of all 61 call sites: exactly one offender)
File: `controls/AlertDialog.tsx:105-108`.
Fix: delete the four lines; keep `flex: 1`.
Owner: `aacd7de1d0b63642a` (U4.3 seat — its file this round)

### F48 [LOW] `banner.test.tsx` says "six" hand-backs over a seven-entry table (the loop checks all seven; the prose misdirects)
Lanes: tests — original label: LOW
File: `controls/__tests__/banner.test.tsx:240,288`; the PR body repeats it.
Fix: "the D19 hand-backs", or seven.
Owner: `ae5212edcaf8ada66` (U3.3 seat)

### F49 [LOW] The guard's schedule comment says 40 keys / 131 rows; the table produces 41 / 135 — U4.4's `scrim` key was not re-totalled
Lanes: tests — original label: LOW (measured by importing the module; every derived gate agrees on 135, only this comment disagrees)
File: `.design-sync/check-rn-parity.mjs:287`.
Fix: add the `+ U4.4 scrim × 2` line and re-total.
Owner: `a182220a9c6c7b4a9` (U4.4 half of the seat)

## Dropped / demoted lane findings

| Lane item | Lane · label | Disposition | Reason |
|---|---|---|---|
| `ModalShell` scrim `+ elevation` unpinned | tests · HIGH | DEMOTED → F30 MEDIUM | W0/F12 is the exact precedent: a pin gap on shipped-correct code, one line, one consumer, no live misrender. The false P20 claim is a pipeline fact, not a severity multiplier (W1 F23 ruling). F28 stays HIGH because it is not one site's pin — it is the entire paint contract of the wave's headline shell plus a falsely-titled suite, with three later packages mounting it unreviewed (W0/F11's silent-survivor-on-the-load-bearing-surface precedent). |
| Recorder tone colours unpinned + false docblock | tests · HIGH | DEMOTED → F31 MEDIUM | Same F12/F18 class: protection loss with no live defect, one-test fix. The false claim is corrected in the same commit. |
| Choice-control exemption + D-1's false close condition | silent-failures · HIGH ×2 | MERGED + DEMOTED → F32 MEDIUM | One root cause. The HIGH hinged on a ledger row entering with an unenforceable trigger — prevented at this desk (§100 written with a corrected close condition), so what remains is the hand-maintained-carve-out class, MEDIUM three rounds running (F16/F23/F24). sfh's probe pair (planted radio + negative control) is exemplary and carries the finding. |
| Record-arm skip re-opens F23's forms | type-design · HIGH | DEMOTED → F33 MEDIUM | Consistency with F18/F23/F24 — same scan, same silent class, same flip-day use-day with a scheduled check. "Fix-introduced regression" does not outrank the class's use-day; F23 itself was MEDIUM. sfh's MEDIUM concurs (2 of 2 lanes at MEDIUM after this demotion). |
| `GLYPH` cast | typescript · MEDIUM | DEMOTED, merged → F44 LOW | td's bounding facts hold: ARIA-mirrored union, cosmetic failure, one consumer. Kept because the fix teaches the house idiom. |
| I-8 "arm skip fixed the class uniformly" | integrator · INFO | REFUTED, folded into F33 | The skip removed the arms from coverage; it did not make them safe (sfh probes a/c). |
| Verification "dialogs keep darker exceptions — exactly what A22 specifies" | verification · no label | Corrected in F43 | A22 specifies the collapse; the exceptions come from U4.3's phone-source finding, which this round ratifies. The measurement itself (11→5 consolidation) is confirmed and used. |
| `buttonStyle` cannot take a scheme parameter (D2 unreachable for one recipe) | tests · out-of-lane note | folded into §99 | Same scheme-half family; the row names it. |
| `GlassBottomSheet` pickers gain swipe-dismiss + 92%→90% cap | typescript · out-of-lane | not filed | Phone-shell behaviour, disclosed; recorded in §107's row text so the behaviour has a written home. |
| `CentredDialog:141-145` comment says "left where it is" (really `<body>`) | sfh · out-of-lane | routed to F43's owner as a one-line docblock rider | Same file, same seat, zero-cost. |
| `setPointerCapture` empty catch | tests · out-of-lane | not filed | sfh cleared it (documented, backed by the `e.buttons === 0` net). |

**Deferral-proposal dispositions (default FIX or REFUTE; the full ruling set):**
- Integration **I-7** → REFUSED as a row → **F37** (the "wrong owner at merge time" reason expired at the fix round; W0 F9/F12 precedent). **I-4** → already withdrawn by U2.4's measurement; residual absorbed by **§101**. **I-8** → refuted (F33).
- u2.4 **D-1** → **§100**, with the close condition corrected (the "enforces the cleanup" sentence is false until F32 lands; the row says so). **D-2** → **§101**. **D-3** → **§102**. **D-4** → MOOT — its trigger (U4.1) fired and was satisfied inside this wave; `PickerSheet.tsx:5` imports `GlassBottomSheet` (spot-checked). No row.
- u4.3 **deferrals 1+2+3+4** → consolidated into **§103** (one mechanism, one row; deferral 2's "U4.4 opening either file" trigger technically fired in-wave, but the prescribed action depended on a hook that cannot exist until first adoption — re-cut, not refused). **Deferral 5** → folded into **§99**. **Deferral 6** → trigger fired in-PR → **F41**.
- u4.1 **proposal 1** / u4.2 **proposal 1** / u3.3 **D-3** / tests' `buttonStyle` note → consolidated into **§99**. u4.1 **proposal 2** → **§107** (re-cut: U2.4 opened the files but sheet behaviour was outside its D20 authority — the trigger named the wrong actor). u4.1 **proposal 3** / u4.2 **proposal 4** → **§104** (the U4.5 cut). u4.2 **proposal 2** → **§105**. u4.2 **proposal 3** → **§106**.
- u4.4 **deferral 1** (PdfPreview rows 38–40) → stands as the `it.todo` text in-file; no new row needed (the todo carries the trigger — reaffirmed). **Deferral 2** → **§111** (re-cut to U8.1; the "only two remain" premise did not come true — F43's fix and the ruled `modalScrim` change the survivor set; the row names the final exemption list). **Deferral 3** (tripwire) → MOOT — landed in W1's rider `7fc126b` before this round.
- u3.1-u3.4 **D-1** → **§108**. **D-2** → **§109**. **D-3** → REFUSED as a row, ACCEPTED as a ruling (declining per-site change-detectors is a decision, not a deferral; recorded here). **D-4** (type scale) → REFUSED: its first trigger arm fired twice in this wave (U3.2, U2.1/U4.2 moved sizes; nobody built the seam) but plan §4.9 itself prescribes commented literals — the refusal to build is the plan's own text, and the scheduled arbiter is the U8 exit review (the proposal's second arm). No row; no finding.
- u3.2 **D-1/D-2** (engine OCR colour + `#ff7a45`) → stand as written on the U3 branch review? They were proposed pre-wave and never written: both are real with concrete triggers (U7.3) → **§112** (one row for the pair — same file, same trigger). **D-3** (`#ff4757`-as-text sweep) → **§113** (the C.3 rule-1 sweep has no owning package — exactly the boundary-the-plan-does-not-own case). **D-4** (badge per-site pins) → REFUSED as a row (a declined change-detector, same as u3.1-4 D-3).
- u3.3 **D-1** → **§110**. **D-2** → folded into the **§96 amendment**. **D-4** → no row (U6.4a's Tests column already owns the pin — plan-scheduled work is never a ledger row).
- u2.2 **§D1** (Button spinner/loading) → REFUSED as a row — recorded at source in `button-recipe.ts`'s docblock ("not ported, with reasons"), which is where the next reader looks; a ledger row would duplicate it. **§D2** (AlertDialog red-as-text) → the U4.3 rewrite kept `destructiveTint` and the relational pin; residual folds into **§113**'s sweep. **§D3** (MediaLibrarySheet `ElevatedEdges` copy) → **§114** (trigger U7.2, byte-identical values, zero visual change — verified premise). **§D4** (`ModalActions.submitBlocked` untested) → **§115** (trigger U6.1, the `_shared.tsx` owner).
- u2.1 **D-1** (placeholder `::placeholder` → U8.2) / **D-2** (textarea 76 vs 100 → U6.1) / **D-3** (focus 2.87 vs card) / **D-4** (resting border 1.26) → all four premise-verified in orientation; **§116** (D-1), **§117** (D-2), **§118** (one row for D-3+D-4 — the same C.3-rule-4 family as F27, owner checkpoint + U0.5 rows as trigger). Note D-4's 1.26 is the same number F27 adjudicates; the rows cross-reference.

## Owner routing summary

| Owner | Finding IDs |
|---|---|
| `ae2d7a1139ac951d1` — U2.4 seat | **F27, F29**, F32, F40, F44 |
| `a182220a9c6c7b4a9` — U4.1/U4.4 seat | **F28**, F34, F35, F38 (primary), F42, F46, F49 |
| `ae5212edcaf8ada66` — U3.3 seat | **F26**, F48 (+F38 Banner/EmptyState touch-points) |
| `aacd7de1d0b63642a` — U4.3 seat | F41, F43, F47 (+F34/F38/F42 CentredDialog touch-points) |
| `a285e52f0befce2f2` — U4.2 seat | F30 (+F43 modalScrim docblock, +F38 `_shared` touch-points) |
| `ae1c1cc2c29908306` — U3.2 seat | F31 |
| `a9f135565ce43133b` — U1.4 seat | F33 |
| `acfeda2f7cd15b91a` — U2.1 seat | F37 |
| `a22c8bac1dd03a700` — U2.3 seat | F39 |
| `aa98c67e1b8a92570` — U2.2 seat | F45 (+F38 `SIZES`) |
| `aace40599f45bd260` — integrator | F36 |

One writer per file holds: every F38 touch-point lands with the seat already opening that file this round. `ExportModal.tsx` is touched by F36 (imports, integrator) and F43 (scrim, U4.3 seat) — different lines; integrator commits first, U4.3 rebases its branch on it, or the orchestrator serialises the two.

## Lanes to resume for the fix-delta

All five, scoped to their own findings plus the fix diff: web (F27, F29's re-cut evidence, F34, F35, F46), tests (F28, F30, F31, F40, F48, F49 — re-run all SURVIVED probes), silent-failures (F32 — planted-radio probe; F37's kill), type-design (F26, F33, F38, F39, F44, F45), typescript (F26 seam probe, F36, F44, F47). Verification seat: re-cut the four settings shots (F29), the two dialog shots (F43), and the Export Hub checkbox (F27) after fixes. Not a resume-nobody round.

## Ledger interaction

**Triggers this diff satisfies:** §90 (U2.2 landed the light CTA pair, rows 12L/13L, and both light anchors — verified by the integrator's table and the ts lane's `gradientTop.light` probe) → **struck ✅ RESOLVED — PR #42**. §94 (U4.2 recorded why the modal ground stays `colors.background`: zero `colors.modal` consumers in the phone repo, ten of ten page sheets on `background`, pinned at `dbe422b`; corroborated on-screen by verification §5.2) → **struck ✅ RESOLVED — PR #42 (trigger's "or records why" arm; refuted at phone source)**. §89 → **annotated**: button half closed by U2.2 (A66 sites + tinted-fill trio + CaseActionsSheet on `colors.link`); the U6 adoption clause stays open. §98 -> **annotated**: the U2.4 arm fired and the recessed rows landed mid-band with real margin; the numeric arm remains the live trigger (no action owed).
**Trigger-lapsed findings:** **F42** (§95 — U4 landed `shadow.dialog`/`sheet` with neither the composing anchor nor the recorded ruling; row annotated, closes when F42 lands).
**Amended:** §96 — trigger re-cut per U3.3's source refutation (the Banner half of its plan row is refuted at `RouteErrorFallback.tsx`; the card half is glass-tier work in `ui/glass-tokens.ts`): new trigger = the next package that opens `ui/glass-tokens.ts` or `chrome/DemoErrorBoundary.tsx` (U8.1 first scheduled); backstop unchanged (D1 checkpoint 1).
**Rows written this round (§99–§118):**
§99 scheme-half blindness class (all seam modules incl. `button-recipe`'s module-scheme read; honest kill = §9 clause 12's U8-exit flip — consolidates five proposals) · §100 `DvrInfoScreen` checkbox pill → U6.4b (close condition corrected: hand-delete the exemption; the dead-exemption test enforces it only after F32) · §101 button-adoption render pins → U6.4a/b (absorbs I-4; U2.4's 179-vs-61 measurement recorded) · §102 `T.textDim` form-label family → U6.4a · §103 the focus-restore family (five mount-time `activeElement` blocks + sheet `aria-modal` with no trap + the `useOpenerFocusReturn` extraction; trigger: first of U5.3 mounting the sheet / U7.2 opening `MediaLibrarySheet` — the mover extracts the hook) · §104 `ExportActionSheet` fold → an explicit **U4.5 before U8 exit** (§9 clause 7's one-sheet-ground census is the acceptance) · §105 `ModalHeader` leading icon → U6.1/U6.2, hard stop U8 (A60 Tier-A) · §106 `useReducedMotion` first-frame gap → any opener of `lib/hooks/use-reduced-motion.ts` or U8's motion pass (`useSyncExternalStore` rewrite named) · §107 picker exit animation → next package with behaviour authority over `DateField`/`TimeField`/`Dropdown` (U6.4a or U7.x; U2.4's window closed without that authority — original trigger named the wrong actor; also records the shell's swipe-dismiss/90% behaviour deltas) · §108 three em-dashed empty-state strings → U7.3 A93 · §109 Cases/Dashboard header icon targets ~24×24 vs A49's 44 floor → A49's implementing package or first opener · §110 `ImportModal`'s three off-tier notice blocks (incl. the uncited `:285` sibling) → U7.3 · §111 the `rgba(4,8,14,*)` ban → U8.1's `BootSequence` re-base, shipping with the final exemption list (ExitDialog 0.72 permanent per D12; `modalScrim` 0.55 per F43's ruling) · §112 engine OCR confidence colours + the unnamed `#ff7a45` fifth hue → U7.3 (u3.2 D-1+D-2, one row) · §113 the `#ff4757`/red-as-text C.3-rule-1 sweep (~20 sites, no owning package; incl. AlertDialog's `destructiveTint` residual and `CoordinateDisplay:196`) → the package that takes the sweep or the U8 exit review · §114 `MediaLibrarySheet`'s byte-identical `ElevatedEdges` copy → U7.2 · §115 `ModalActions.submitBlocked` untested → U6.1 · §116 placeholder colour (`::placeholder`, unpinnable in jsdom) → U8.2 opening `demo.css`, asserted from Playwright · §117 `Field` textarea `minHeight` 76 vs phone 100 → U6.1 · §118 the input-boundary contrast family (focus 2.87 / resting 1.26 vs C.3 rule 4, both phone-verbatim values) → D1 owner checkpoint or a U0.5 1.4.11 row; cross-references F27.

Twenty rows for a three-phase wave (≈ the five-per-wave honest count, ×3 phases, plus consolidations). Every row carries a greppable trigger; six proposals were refused (recorded above) and two were moot.

## Agent IDs

| Seat | Agent ID | Note |
|---|---|---|
| typescript / web / tests / silent-failures / type-design lanes | *(fresh W2 seats — IDs in the orchestrator's r1 dispatch record; not printed in any lane file — the W0 pipeline ask stands for the third round)* | fix-delta resumes THESE |
| verification seat v2 | `a6ddd2310b9caabc9` | warm |
| aggregator (this seat) | `ab0635173e8414282` | Fable; rotation successor, warm from here |
| U2.1 / U2.2 / U2.3 / U2.4 | `acfeda2f7cd15b91a` / `aa98c67e1b8a92570` / `a22c8bac1dd03a700` / `ae2d7a1139ac951d1` | warm |
| U3.1+U3.4 / U3.2 / U3.3 | `a29c3ecd7bdf86f63` / `ae1c1cc2c29908306` / `ae5212edcaf8ada66` | warm |
| U4.1+U4.4 / U4.2 / U4.3 | `a182220a9c6c7b4a9` (ROTATION WATCH ~493k — this fix round only) / `a285e52f0befce2f2` / `aacd7de1d0b63642a` | warm |
| integrator | `aace40599f45bd260` | warm — F36 |

## Pipeline notes

- **This seat is a rotation successor** (predecessor `a0a927cee97a72c8d` retired at ~600k after W1). Its nine-ruling successor brief (w1/VETTED-r2.md pipeline notes) was applied throughout: rulings 1–3 set F28-vs-F30/F31 and the F32/F33 demotions; ruling 4 settled A22 and F27's phone-parity tension; ruling 5 produced F37/F41 and six refused rows; ruling 6 marked the P20 and `status-owners` claims.
- **Cross-lane confirmations (strong signal):** F26 — ts and td from opposite ends (runtime seam probe vs type duplication). F32 — sfh and tests probed the same hole with different mutations (a planted radio vs a faithful adoption). F33 — td and sfh, independent probes, matching negative controls, and both isolated the line filter as the cause. 24/24 of the implementers' claimed kills re-confirmed by the tests lane's stratified re-run — the reports' probe tables are trustworthy.
- **The wave's one theme, stated once (sfh said it first):** three new source scans shipped and each one's exemption mechanism is broader than the reason written beside it (file-keyed for a role ruling — F32; line-keyed for an arm ruling — F33). `one-switch-renderer.test.ts` — no exemption list, an anti-vacuity control — is the shape to brief future scan authors on.
- **False-coverage-claim class, third round running** (predecessor's PRESCRIPTION-UNVERIFIED precedent): U4.2's P20 "KILLED" covers the panel line only (F30); `status-owners.test.tsx:12-15` claims engine coverage for UI paint (F31); `sheet-chrome.test.tsx:341`'s title names a component its body never renders (F28); the mapping/report claims were again asserted without the receiving probe. Fix owners: treat every coverage sentence you write as a claim a lane will probe.
- **Integrator quality:** the 12-hunk assembly is excellent (the AlertDialog split was probed from both directions, W2-1/W2-2 are the load-bearing pair and both killed) — and it repeated the W0/W1 record error for the third time: §7.4 cites "A's PR-3, A's PR-1" as open ledger rows; both were REFUSED in `w0/VETTED-r1-delta.md` and never written. Integrators: take ledger state from `deferred.md` and the VETTED docs, never from prior proposals. I-5 was also applied at one hunk and not its two siblings (F36).
- **Merge-order artifact class (new this wave, worth one §6.2 sentence from the orchestrator):** F26 exists because U3 assembled in inverse §6.2 order and a CONSUME-ME written for the declared order silently became false. A cross-package consumption instruction is PRESCRIPTION-UNVERIFIED until the consuming commit exists — same family as W1's F19→F23 handoff.
- **Verification:** the 13:1 signal:noise control run is the strongest verification evidence any wave has produced; §5.1 (F29) is its first regression catch at source-pinned root cause. The five unphotographable surfaces (§4.2: picker sheet open, Field error, DangerFill, Banner warning/error/success, disabled button) each need the named driver step — routed to U6's harness-repair batch per the HANDOFF; the `06-p4-media.js` matcher fix is committed on master per the coordinator. W3's BEFORE set must be re-cut under `.env.local` (the standing §4 rule).
- **Housekeeping for the orchestrator:** plan/matrix corrections owed at merge are collected in the twelve reports' §-correction lists plus this round's: A22's Delta (F43's ruling), C.3-rule-4's checkbox case (F27), §6.2's U3 assembly-order note (F26), A69's "eight→two" wording (U3.2 R-1), the `closeLabel`/`closeAccessibilityLabel` split (U4.1 R-1 applies to U4.1's row ONLY — U4.2's row and A60 were already correct, per U4.2 R-1's convergent measurement).
