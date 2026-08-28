# Light-flip objector manifest — plan §9 clause 12

**Produced by:** W4 fix round, F85 (`uiparity/w4-fix-u84`).
**The flip:** `features/demo/ui/tokens/palette.ts` — `export const scheme = 'dark' satisfies ColorScheme`
→ `'light'`. One line, one site. Run in a throwaway probe worktree; never committed.

## Result

> ### ⚠ MEASURED AT `c081a51` — re-cut this table at every merge that touches its subject.
>
> `c081a51` is the last commit at which any file the flip MEASURES changed. Commits after it on
> this branch touch only this document, which is not in the test program — so the stamp is the
> honest one to check against, and it is deliberately not bumped by its own write-up. If a commit
> lands that touches source, tests or config, this table is stale and must be re-run.
>
> **This document is EVIDENCE, and evidence is stale the moment a parallel branch lands.** The
> first cut measured `3f9bad3` and claimed "no unexplained objectors"; F87's row-49 pin was on a
> parallel branch (`merge-base --is-ancestor c7e82fe 3f9bad3` → NO), so at the merged head there
> were THREE objectors and the claim was FALSE at the SHA that would have shipped — W4/F90. A
> falsifiable claim over a measurement must carry the SHA it was measured at, and must be re-run
> like a gate, not quoted like a conclusion.

| leg | at `def2aec` (VETTED-r1) | at `c081a51` (this branch) |
|---|---|---|
| `pnpm typecheck` (app + previews) | **exit 2** — six TS2367 | **exit 0** |
| `pnpm test` | **75 failed / 28 files** | **2 failed / 2 files** |

```
$ git rev-parse --short HEAD
c081a51
> tsc --noEmit && tsc -p tsconfig.previews.json
FLIP_TYPECHECK_EXIT=0

 Test Files  2 failed | 308 passed (310)
      Tests  2 failed | 4333 passed | 2 todo (4337)

❯ features/demo/ui/__tests__/glass-well-recipe.test.tsx (9 tests | 1 failed)
❯ features/demo/ui/controls/__tests__/CentredDialog.test.tsx (37 tests | 1 failed)
```

**Both remaining reds are accounted for below. There are no unexplained objectors at `c081a51`.**

Clause 12 promised "exactly three objectors" and the observed set is **two**, of which only one is
a deliberate pin — so the clause's arithmetic was wrong in both directions and a **plan correction
is still owed** (VETTED-r1 §3 of the clause-12 ruling). This desk does not edit the plan.

---

## 1. THE OBJECTORS — pins that RED under the flip, deliberately

### O1 · `controls/__tests__/CentredDialog.test.tsx:552-557`
> `dialogScrim paints colors.overlay and owns no layering of its own`
> `AssertionError: expected 'rgba(0, 0, 0, 0.5)' not to be 'rgba(0, 0, 0, 0.5)'`

**Why it must stay.** The assertion is a NEGATIVE: it pins that the dialog scrim takes
`colors.overlay` and *not* `colors.scrim`, which is the one place W2/F43 is enforced. In **dark**
those two tokens differ (`rgba(0,40,83,0.9)` vs `rgba(0,40,83,0.32)`) so the distinction is
observable. In **light** the phone defines them as the SAME value — `Colors.ts:116` and
`Colors.ts:121` are both `rgba(0, 0, 0, 0.5)`, verbatim — so a `not.toBe` between two identical
strings cannot hold. The red is a property of the phone's own light palette, not of the demo.

Making it green would mean either deleting the only enforcement of F43, or re-spelling light's
`scrim` to differ from `overlay` — inventing a divergence from the source of truth. Marked
`// F85 objector` at the assertion. **Legitimate resident.**

---

## 2. THE REAL LIGHT-HALF DEFECT — found by the triage, NOT papered over

### D1 · `__tests__/glass-well-recipe.test.tsx:221` — the recessed well goes flat in light
> `holds row 33s two-sided 3-12 dE per stop against PickerSheets panel`
> `expected [ { "dE": 2.5021648078202277, "index": 1 } ] to deeply equal []`

**This is a genuine perceptual defect, not convention debt.** The recessed well's SECOND gradient
stop measures **dE 2.50** against the panel it sits in — below the row's 3.0 floor. A visitor in
light mode would see a well that is very nearly invisible against its own ground. The first stop
passes; only stop 1 (0-indexed) fails, which is why the row's per-stop shape caught it and an
aggregate would not have.

- **Ground:** `PickerSheet`'s panel, `colors.backgroundSecondary` = `#f9fafb` (light, Gray 50).
- **Offending stop:** `GLASS_TIER.light.recessed.gradient[1]` = `rgba(226,232,240,0.35)`.
- **Provenance:** lifted VERBATIM from the phone — `tokens/glass-tiers.ts:114` cites
  `Colors.ts:339`. **The defect is inherited, not demo-introduced.**

**Not fixed here, deliberately.** The value is phone-verbatim; re-tinting it would invent a
divergence from the source of truth on a surface the demo does not render today (light is closed
by ABSENCE — `palette.ts`'s own note). Fixing it is a phone-side design decision. Ledger-proposed
below rather than silently converted or suppressed.

> **Deferral proposal — `light.recessed` stop 2 fails row 33's dE floor against `backgroundSecondary`**
> **Source:** W4/F85 triage, `glass-well-recipe.test.tsx:221` under the clause-12 flip.
> **What:** `GLASS_TIER.light.recessed.gradient[1]` (`rgba(226,232,240,0.35)`, phone
> `Colors.ts:339`) measures dE 2.50 against `colors.backgroundSecondary` (`#f9fafb`), under the
> 3.0 floor contrast row 33 sets. The light well reads flat against its panel.
> **Why deferred:** the value is phone-verbatim and the demo renders no light surface, so the
> honest fix is a phone-side re-tint, not a web-side divergence. Converting the pin would hide a
> real defect; suppressing it would defeat the row.
> **Trigger:** **the day light mode is opened for any demo surface** (the `scheme` switch moves,
> or a per-surface light branch lands) — or the phone re-tinting `recessed.light`, whichever
> first. Until then this row is expected to red under the flip and is named here.

---

## 3. DELIBERATE DARK-SPELLED PINS — marked, and GREEN under the flip

Four assertions carry `// F85 objector` markers but do **not** red, because what they assert is a
scheme-INVARIANT or historical fact that happens to be spelled with a dark value. They are listed
so a future reader does not "fix" them into scheme-relative form and destroy what they pin.

| site | why it is spelled dark |
|---|---|
| `screens/map/__tests__/mapTokens.test.ts:253` | `MAP_SURFACE_COLORS` is scheme-INVARIANT by construction — it paints marks onto satellite tiles, which have no theme. Reads `palette.dark` on purpose. |
| `__tests__/palette-contrast.test.ts:861` | A DARK-HALF historical fact: records the ratio a specific dark ground measured. |
| `__tests__/palette-contrast.test.ts:992` | The failure F52 diverged from is dark's; the row is about that dark measurement. |
| `__tests__/palette-contrast.test.ts:1057` | Both lines are dark-half facts and form one pair. |
| `__tests__/palette-contrast.test.ts:1063` (row 49, W4/F90) | The tab bar's perceptual INVERSION — active 3.14 vs inactive 5.82, the selection cue being the dimmest mark in a label-less bar. A dark-half measurement, and the figure behind the owner device-pass item. Ungated it red on the flip **when the product improved**: in light the inversion corrects (active 10.36, inactive 7.56). Now `if (activeScheme === 'dark')`. |

## 4. FORCED-DARK SURFACES — checked, and NOT objectors

The triage was warned that the import terminal, the camera chrome (D17) and the D12-frozen
surfaces would be legitimate objectors. **They are not, and that is a refutation worth recording:**

- **The import terminal is correct already.** `ImportTerminalProgress`'s four reds were **not** on
  terminal chrome. `terminal-palette.ts:52-56` says so in its own docblock: the outcome badge and
  CTA sit OUTSIDE the phone's forced-dark subtree and read APP chrome (`colors.warning`,
  `colors.error`). The genuinely forced-dark chrome reads `palette[TERMINAL_SCHEME]` and stayed
  **green through the flip** — it is scheme-independent by construction, so it never objects.
- **`NotesScreen`** carried the one real forced-dark mistake in its family: a pin that *called
  itself* the forced-dark one but asserted `TERMINAL_PALETTE.screen[scheme]`, which is the
  `screen[TERMINAL_SCHEME]` bug the moment the two schemes diverge. Fixed, not exempted.
- **`overlay-header`'s `cameraScrim` (D17)** likewise reads its own frozen palette and does not
  object; only its `glass` sibling was convention debt.

**A force-dark surface that reads its own scheme constant is invisible to the flip.** That is the
correct design, and it is why the objector set is small.

---

## 5. What the 75 actually were

| class | count (tests) | disposition |
|---|---|---|
| 1 — convention debt: rendered-value pins hand-spelling the dark half | 74 | converted to scheme-relative composition (`colors.*` / `GLASS_TIER[scheme]` / the seams) |
| 2 — deliberate objector | 1 | O1 above |
| 3 — real light-half defect | 1 | D1 above, ledger-proposed |
| — | **+2** | two NEW reds surfaced by W4/F84: two test files that previously failed to COMPILE now run, so their reds became visible (75 → 77 before conversion) |
| — | **+1, then 0** | W4/F90: F87's row-49 relation pin landed on a parallel branch and became a third objector at the merged head. Gated to the dark half in this round; the manifest re-cut at `c081a51`. |

The review named `palette-contrast`, `mapTokens` and `DemoExperience.sandbox` as the prime
candidates for real light defects. **All three were refuted at source** — two `palette-contrast`
reds were F84 over-reach (see below), three were cross-half compositing artefacts, `mapTokens`'
`MAP_SURFACE_COLORS` is scheme-invariant by design, and `sandbox`'s CTA reads its amber off
`colors.warning` correctly. The one real defect was in a file nobody flagged.

### An F84 over-reach the triage caught

`palette-contrast.test.ts:638` — F84's sweep rewrote `scheme === 'dark'` to
`activeScheme === 'dark'` at a site where `scheme` is a **local arrow parameter**
(typed `'light' | 'dark'`), not the module export. It was never a TS2367 site. Reading the module
switch there made `parent` ignore its own argument and hand both iterations of a two-scheme table
the consumed scheme's parent stack — **invisible under dark**, because dark's branch was what both
iterations wanted anyway. Reverted to the parameter, with the reasoning recorded at the site.
The lesson: a whole-word regex over an identifier as common as `scheme` needs a scope check, and
"green under the shipping config" is not evidence that a sweep was correct.
