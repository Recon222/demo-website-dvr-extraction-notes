# Lane: silent-failures — Wave 2 (U2 + U3 + U4), PR #42

## Round 1 (fix delta)

Head: `feat/uiparity-w2` @ `250e12f` (branch is one docs-only commit further on, `c1892d1`).
Delta read: `git diff addd03f..250e12f`, scoped to my two fix commits and the lines they touch,
per contract §7 — warm seat, judgement carried, evidence re-read from disk at the current SHA.
Authority: the "W2 review round 1 — fix mapping" comment on PR #42, plus `VETTED-r1.md:65,188,200`
for the routing of my second HIGH.

Probe worktree `probe-w2d-sfh-scans` off `250e12f` (install 10.4 s). Baseline before any mutation:
`choice-controls.test.tsx` + `glass-tokens.test.ts` = **2 files / 22 passed, exit 0**; full suite at
the merged head **290 files / 3,899 passed | 4 todo (3,903), exit 0**, matching the mapping
comment's figure exactly. **0 skipped** in either scan file. Motion mode: **motion-ON** (the
`vitest.setup.ts` stub's hard-coded `matches: false`); both subjects are source scans with no
motion-gated branch. Teardown quoted at the end.

### Per-finding status

**My r1 HIGH #1 (exemption keyed by file, not role) — FIXED, and it is the fix I asked for.**
`choice-controls.test.tsx` now keys `EXEMPT` as `` `${Role}:${string}` `` — a TEMPLATE-LITERAL key
type, so `checkbox:screens/DvrInfoScreen.tsx` is checked by `tsc`, not by convention — and
`offenders(role)` looks up `` `${role}:${rel}` ``. Both entries carry their `checkbox:` prefix,
which is the ruling their reason strings always argued for.

```
MUTATION PROBE: re-plant the r1 survivor, verbatim, in the still-exempt file
Provenance: canonical source, probe worktree probe-w2d-sfh-scans at 250e12f (no mirrored copy)
Mutation: append the same hand-rolled `<button role="radio">` + 20px ring to
  features/demo/ui/screens/DvrInfoScreen.tsx, existing `role="checkbox"` left intact
At 00a96c7: SURVIVED — scan exit 0, FULL SUITE exit 0 (290 files / 3,881 passed)
At 250e12f: **EXIT 1 — KILLED**, and it names the file:
  "import RadioOption from ui/controls/choice-controls instead of re-inlining the ring:
   expected [ 'screens/DvrInfoScreen.tsx' ] to deeply equal []"  (1 failed | 14 passed)
Restore: verified byte-identical (git checkout --; git status --porcelain empty)
```

**My r1 HIGH #2 (the dead-exemption backstop could never fire, so u2.4's D-1 close condition was
false) — FIXED at BOTH ends, and the second end is the part I did not prescribe.**
The aggregator merged my two HIGHs into F32 and demoted to MEDIUM (`VETTED-r1.md:188`), on the
ground that the aggravator — a ledger row entering with an unenforceable trigger — was *prevented at
the desk*: §100 is written with a corrected close condition ("hand-delete the exemption; the
dead-exemption test enforces it only after F32", `:238`). **I do not contest the demotion**, and I
checked the claim rather than accepting it: `deferred.md:6454` is §100 and it carries that wording.
The code half went further than the ledger wording needed — the predicate is now *"would this file
be reported were the entry removed?"*, and one `reported(role, text)` serves the scan and the
backstop so the two can no longer disagree, which was the root of my finding.

```
MUTATION PROBE: the exact case the OLD predicate could never see — an ADOPTION
Provenance: canonical source, probe worktree probe-w2d-sfh-scans at 250e12f
Mutation: make `DvrInfoScreen.tsx` render `<CheckboxBox` while KEEPING `role="checkbox"` on its
  pressable — i.e. U6.4b's actual close move, spelled the way `ExportCaseCard.tsx:144,161`
  already spells it. Under the r1 predicate (`!includes(role) && !includes(role)`) this is
  invisible forever; it is the whole of my r1 HIGH #2.
Result: **EXIT 1 — KILLED**, naming the ROLE-SCOPED key:
  "this entry excuses nothing — the file would not be reported. Drop it.:
   expected [ Array(1) ] to deeply equal []"  +  "checkbox:screens/DvrInfoScreen.tsx"
Restore: verified byte-identical (porcelain empty)
```
§100's close condition is now enforceable by the mechanism it names. Both ends closed.

**My r1 MEDIUM (the record-arm skip was a whole-LINE drop) — FIXED, and by a better fix than the
one I prescribed.** I asked for "strip the arm's KEY, scan the remainder, exempt the matching half
only". F33 does that and one thing more that I missed: it splits the two forms onto **two different
inputs**. `SCHEME_HALF.memberAccess` runs against `maskOwnHalfArms(src)`; `SCHEME_HALF.destructure`
runs against the RAW source. My prescription would have left the destructure form reading a
pre-processed copy, and the commit's reasoning is right that no single pre-processed input can serve
both readings — `dark: tier,` in a destructure and `dark: palette.dark.x,` in a record literal are
textually identical. That ambiguity is real and I did not see it. Refutation accepted on the merits.

```
MUTATION PROBE: all three r1 arms, re-run, plus the two the fix could have broken
Provenance: canonical source, probe worktree probe-w2d-sfh-scans at 250e12f
(a) r1 survivor (a) — SHIPPED wrong-half typo inside an arm:
    button-recipe.ts:100  `light: palette.light.errorDark,` -> `light: palette.dark.errorDark,`
    At 00a96c7: SURVIVED (scan exit 0).  At 250e12f: **EXIT 1 — KILLED**
    ("expected [ 'controls/button-recipe.ts' ] to deeply equal []")
(c) r1 survivor (c) — the NEXT two-half record, no per-constant pin behind it:
    a new `{ light: GLASS_TIER.dark.sheet.border, dark: ... }` in controls/sheet-chrome.ts
    At 00a96c7: SURVIVED the FULL SUITE (exit 0, 290 files / 3,881).
    At 250e12f: **EXIT 1 — KILLED**, naming the file
NEGATIVE CONTROL (the false-positive direction, which a mask is the one place to get wrong):
    the untouched tree — `DangerFill`'s RIGHT-half arms, `PrimaryButtonGradient`, `ElevatedEdges`,
    `SHADOW_CARD`, `glass-tiers.ts`'s two multi-line arms — **exit 0, 7 passed**. No false red.
BLAST RADIUS (fix-introduced regression hunt): does the destructure form still bite MULTI-LINE,
    i.e. is W1/F23's closure intact after the input split? A `const {\n  dark: probeTier,\n } =
    GLASS_TIER` in sheet-chrome.ts -> **EXIT 1 — KILLED**. It is intact, and this is precisely
    what the whole-line filter had silently re-opened — the fix closes a second hole I did not file.
Restore: verified byte-identical after every arm (git checkout --; porcelain empty)
```

### Disclosed deviation, judged on the merits — and probed

F33 discloses a ceiling: the mask is line-anchored, so an arm whose value **wraps** onto the next
line (`light:` alone, then `  palette.light.x`) is not masked, and the commit claims that spelling
"raises a FALSE RED, which is loud and fixable, never a silent miss". A claim of the form "the
failure mode is loud" is exactly the claim this lane must not take on faith, because the whole
finding class is claims like it being false.

```
MUTATION PROBE: is the disclosed ceiling loud or silent?
Mutation: a wrapped-arm record in controls/sheet-chrome.ts — `light:` / newline /
  `  GLASS_TIER.light.sheet.border,` (a CORRECT own-half read, wrapped)
Result: **EXIT 1** — a false red, naming the file. The disclosure is accurate: the ceiling fails
  CLOSED. Zero occurrences of the wrapped spelling under `ui/` today, so it costs nothing now,
  and when it arrives it arrives as a red a maintainer must answer, not as silence.
Restore: verified byte-identical (porcelain empty)
```

### Fix-introduced regressions in the blast radius — none found

- **No swallow, no downgrade, anywhere in the fix round.** Across all eleven fix branches'
  production files, `git diff addd03f..250e12f` deletes **zero** `console.warn` / `console.error` /
  `console.log` lines and adds **zero** `catch` / `void fn()` / bare `.then()` / `Promise.all`.
- **The honesty machinery is untouched by the fix round.** `run-import.ts`, `importResultData.ts`,
  `extract-client.ts`, `geocode.ts` and `app/api/extract/route.ts` appear in no fix commit, and
  D12's amber survives verbatim — both `#ffd07a` blocks still in `ImportModal.tsx`. F26 moving
  `Banner` onto `severityTone` does not touch it: the fallback notice was never a Banner (D12), and
  F26 only replaces Banner's private token trio with the shared recipe.
- **F31's distinctness guard is real, not decoration.** It is the fix to a partial-collapse
  survivor, and the shape is right — `expect(new Set([rec.dot, paused.dot, ready.dot]).size).toBe(3)`
  beside the three equalities, with a comment naming why the equalities alone stay green under a
  two-arm collapse. That is the count-it-and-assert-it treatment this lane asks for.
- **F45 closes my r1 dropped observation as a bonus.** `SIZES` is now
  `as const satisfies Record<ButtonSize, ...>` (`button-recipe.ts:148`). I had traced the
  `SIZES[size]` silent-empty-spread in r1 and DROPPED it at the pre-report gate for want of a
  reachable input; the closer makes a missing size a compile error, which is the completeness half
  of that concern, landed by another lane on its own reasoning.
- Full suite at the merged head after every restore: **290 files / 3,899 passed | 4 todo, exit 0**.

### Round 1 Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0 — **no new findings**
Prior-round dispositions: **F32 FIXED** (both of my r1 HIGHs — the survivor re-planted and KILLED,
and the backstop now fires on the adoption case it structurally could not see) · **F33 FIXED**
(all three r1 arms re-probed, two of them former survivors, all KILLED; no false red; W1/F23's
multi-line destructure closure restored as a side effect). **3 of 3 closed, 0 PARTIAL, 0 UNFIXED.**
Verdict: **APPROVE**

Fallback honesty: **yes** — untouched by the fix round; D12's amber verified verbatim at both sites.
Failure-cause distinctions preserved: **yes**, and improved — F33 now distinguishes an own-half arm
read from a cross-half one, where r1 collapsed both into "skipped"; F31 adds a distinctness assert.
Partial results flagged (not silently short): **YES — the r1 answer was NO, and both scans are now
honest.** Neither of my two survivors survives at `250e12f`.
Async cancellation / stale-write safety: **n/a** — no async or store write in the fix delta.
Operator breadcrumbs intact: **yes** — zero `console.*` removals across the whole fix round.
Probes: **7 run this round** — 6 KILLED (2 re-runs of r1 survivors, the adoption case, the
multi-line destructure blast-radius check, the wrapped-arm ceiling, and the F32 re-plant), 1 clean
negative control (the untouched tree, exit 0, no false red). **0 SURVIVED.** Every restore proven
byte-identical; teardown verified — `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 ·
exit 0.

Out-of-lane observations:
- Worth recording for the campaign: F33 is the first fix in this campaign to close a hole the
  reviewer did NOT file (the multi-line destructure, re-opened by r1's whole-line filter and shut
  again by the input split). Splitting a scan's forms onto their own inputs, rather than
  pre-processing one shared copy, is the generalisable lesson.
- The carve-out class is now four rounds old (W0/F2, W1/F16, W1/F23, W2/F32-F33) and F32 is the
  first entry to make its exemption key TYPE-CHECKED (`` `${Role}:${string}` ``). That, plus
  `one-switch-renderer.test.ts`'s no-list-at-all shape, is the pair worth writing into the plan.
- No foreign content was found in my lane file, and I wrote no other path.

---

## Round 0 (initial review, retained)

Mode: code review (fresh seat; predecessor retired, judgement carried from `w0/` + `w1/`).
Single question: **where in this change does a real failure become invisible to the visitor, the
operator, or the next maintainer?**

Head: `feat/uiparity-w2` @ `00a96c7` (one docs-only commit past the brief's `7bcb553`) vs `master`
@ `43ccbad`. Read: `git diff master...HEAD -- . ':(exclude)docs'` (129 files), the PR body, the
twelve implementer reports' deferral-proposal sections, and all three integration reports.

Probe worktree `probe-w2-sfh-scans` off `00a96c7`, cut and installed fresh (11.9 s). Torn down with
`tools/worktree-remove.ps1` — `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0;
probe branch deleted. No leftover `probe-w2-sfh-*` existed at start, and I touched none of the four
other live probe worktrees on this box.

**Baselines in that worktree, before any mutation.** Scan trio
(`choice-controls.test.tsx` + `glass-tokens.test.ts` + `one-switch-renderer.test.ts`):
**3 files / 23 passed, exit 0**. Full suite: **290 files / 3,881 passed | 4 todo (3,885), exit 0** —
which matches the PR body's figure exactly, so the wave head is green and every kill below is a
delta against a green baseline, not against W1's known-red RN guard. **0 skipped** anywhere in the
scan trio: none of these is `skipIf`-gated, so no verdict here is quoted off a skip. Motion mode:
`vitest.setup.ts`'s stub hard-codes `matches: false`, i.e. **motion-ON**; both findings are source
scans with no motion-gated branch, so the mode is recorded rather than load-bearing.

---

## HIGH

```
[HIGH] The choice-control adoption exemption is keyed by FILE but justified by ROLE, so a
       hand-rolled RADIO in either exempt file is invisible to the entire 3,881-test suite —
       and the "carries no dead exemptions" test cannot notice, because it ORs the two roles
       — SURVIVED
File: features/demo/ui/controls/__tests__/choice-controls.test.tsx:174-189 (`EXEMPT`),
      :223 (the skip), :248-257 (the dead-exemption test)
Code:
  if (rel === 'controls/choice-controls.tsx' || EXEMPT.has(rel)) continue   // :223 — role-agnostic
  ...
  return !text.includes('role="radio"') && !text.includes('role="checkbox"')  // :254 — an OR
Issue: both `EXEMPT` entries are CHECKBOX rulings and say so in their own reason strings —
  'circular row indicator, hand-rolled on the phone as well' (`export/ExportLocationRow.tsx`) and
  'checkbox pill — a layout port, owned by U6.4b' (`screens/DvrInfoScreen.tsx`). The MECHANISM
  they buy is file-wide: `offenders()` takes no role argument into the skip, so one checkbox
  ruling silently exempts the same file from the RADIO scan too. The dead-exemption test is the
  stated backstop and it cannot see the mismatch either: it asks whether the file still declares
  EITHER role, so a file that keeps a checkbox keeps its exemption for both, forever.
  The docblock's own bar is 'EVERY EXEMPTION IS A REVIEWABLE ACT and carries the reason plus the
  package that owns it' (:167-168). The reason is reviewable; the grant is twice as wide as it.
Adversarial input / sequence: U6.4b opens `DvrInfoScreen.tsx` (matrix B.5 row 41 assigns it, and
  u2.4's deferral proposal D-1 names it as the owner) and adds or re-inlines a radio group there —
  or U7.2 does the same in `export/ExportLocationRow.tsx`. Neither is hypothetical: both files are
  already scheduled to be opened by a later package, and the adoption scan is the only mechanism
  in this repo that can see a re-inlined ring (jsdom renders no CSS; the pre-port literals are
  exempt from the BANNED sweep as too common — u2.4 D-2 measures exactly that).
Observable wrong behavior: a `<button role="radio">` with its own hand-rolled 20px ring and a
  `#2B8CC1` border sits in `DvrInfoScreen.tsx` and the WHOLE SUITE reports 290 files / 3,881
  passed / exit 0. The reviewer of that later PR is told the adoption scan covers the file. It
  does not, and nothing says so.
MUTATION PROBE: does an exemption granted for a checkbox hide a radio?
  Provenance: canonical source, probe worktree probe-w2-sfh-scans at 00a96c7 (no mirrored copy)
  Mutation: append a hand-rolled `<button type="button" role="radio" aria-checked>` with a 20px
    ring to `features/demo/ui/screens/DvrInfoScreen.tsx` (EXEMPT). The existing `role="checkbox"`
    is left intact, because the realistic regression is a radio ARRIVING, not a role flipping.
  Result: **SURVIVED** — scan file alone exit 0 (13 passed); FULL SUITE **exit 0, 290 files /
    3,881 passed | 4 todo**, i.e. byte-for-byte the clean baseline.
  Negative control: the IDENTICAL block appended to `features/demo/ui/screens/CamerasScreen.tsx`
    (non-exempt) → **EXIT 1 — KILLED**, naming the file: "import RadioOption from
    ui/controls/choice-controls instead of re-inlining the ring: expected
    [ 'screens/CamerasScreen.tsx' ] to deeply equal []". Four clauses met — the pattern is shipped
    code, it is non-equivalent (a real second radio renderer), it is covered by the suite I ran,
    and it lands on the executed `offenders('radio', ...)` arm. The only difference between the two
    arms is `EXEMPT.has(rel)`.
  Discarded first attempt, recorded so the verdict is not overclaimed: flipping the file's
    existing `role="checkbox"` to `role="radio"` is KILLED by `DvrInfoScreen`'s own render tests
    (`getByRole('checkbox', { name: 'Motion' })`, 2 files failed). That mutation is equivalent to
    breaking a live control, not to adding a second renderer; it proves nothing about the scan and
    is not the finding.
  Restore: verified byte-identical after every arm (`git checkout --`; `git status --porcelain`
    empty; full suite back to 290 / 3,881, exit 0)
Fix: make the skip role-scoped rather than file-scoped — key `EXEMPT` by `<role>:<rel>` (or store
  the role in the value and compare it in `offenders()`), and make the dead-exemption test assert
  the file still declares THAT role rather than either. Two entries and one predicate; no new list.
Completeness sweep (contract §2): the same hard-coded set is read at exactly three touch-points —
  `:223` (the skip), `:230-242` (the two `offenders()` calls that share it) and `:252-255` (the
  dead-exemption filter). All three take the role-scoped fix; fixing only `:223` leaves the
  dead-exemption test still ORing.
```

```
[HIGH] u2.4's deferral proposal D-1 rests on an enforcement mechanism that provably does not
       enforce its close condition — the row would enter the ledger with a Trigger nothing can fire
File: docs/planning/demo-phone-ui-parity/reports/u2.4-implementation-report.md:300-310 (D-1) ·
      the mechanism it names, features/demo/ui/controls/__tests__/choice-controls.test.tsx:248-257
Code (the proposal's stated close condition, verbatim):
  "**Trigger:** **U6.4b**, which owns `DvrInfoScreen.tsx`. Its close condition: delete the
   exemption entry in `choice-controls.test.tsx` — the "carries no dead exemptions" test
   enforces the cleanup."
Issue: filed separately from the finding above because it is a separate failure — the code gap is
  one thing, a LEDGER ROW asserting that the gap is covered is another, and the ledger is the
  artifact a future reviewer will trust instead of re-deriving. The dead-exemption test fires only
  when `DvrInfoScreen.tsx` declares NEITHER `role="radio"` NOR `role="checkbox"`. U6.4b's actual
  close move — converting the checkbox pill to `<CheckboxBox` — leaves `role="checkbox"` in the
  file, because the pressable that owns the role is not the box that paints it. `ExportCaseCard.tsx`
  is the live precedent in this very diff: it renders `<CheckboxBox` at `:161` while keeping
  `role="checkbox"` on its own pressable at `:144`, and `choice-controls.tsx:26-28` states that
  split as the design ("the pressable, its `role`, its `aria-checked` and its accessible name are
  the consumer's — `CheckboxBox` paints the box"). So the exemption survives its own resolution,
  silently, and the ledger row says the test cleaned it up.
Adversarial input / sequence: U6.4b lands the layout port exactly as D-1 describes it and does not
  hand-delete the `EXEMPT` entry, trusting the sentence quoted above. The suite is green. The row
  is struck as RESOLVED. `DvrInfoScreen.tsx` is now permanently exempt from BOTH adoption scans
  with no live reason and no test that can ever say so.
Observable wrong behavior: a deferral ledger entry closes on a mechanism that did not run — the
  reviewer contract's own named failure mode (§4: "A suppression that cannot expire will eventually
  suppress a real finding"). Severity rides the use-day, and U6.4b's day has no reviewer holding
  this probe.
Fix: either take the role-scoped fix above — which makes the quoted sentence TRUE, since a checkbox
  exemption then goes dead the moment the file stops hand-rolling a checkbox — or amend the
  proposal's close condition to "U6.4b deletes the entry BY HAND; no test enforces this". The
  aggregator should not write the row in its current wording either way.
Note for the aggregator: this is a premise check on a proposed deferral, per the brief's instruction
  to verify each proposal rather than take it on faith. It is NOT a re-flag of I-7, which is
  separately ledger-proposed and which I did not re-open.
```

## MEDIUM

```
[MEDIUM] The clause-12 scan's new "record arm" skip is a whole-LINE drop, so the one mistake a
         two-half record actually makes — an arm reading the WRONG half — is exactly what it
         hides — SURVIVED
File: features/demo/ui/__tests__/glass-tokens.test.ts:310-313 (the skip) ·
      :299-309 (the comment defending it) · the live construct it was added for,
      features/demo/ui/controls/button-recipe.ts:99-102 (`DangerFill`)
Code:
  const src = stripComments(readFileSync(full, 'utf8'))
    .split(/\r?\n/)
    .filter((line) => !/^\s*(?:light|dark)\s*:/.test(line))     // :312 — drops the whole line
    .join('\n')
Issue: the comment's defence is "The ARM is skipped, never the file. A record built this way is
  inert until something READS a half". That is not what the live code does. `DangerFill`'s two arms
  ARE reads — `light: palette.light.errorDark` / `dark: palette.dark.errorLight` — and the module's
  own docblock (`button-recipe.ts:92-94`) says why they have to be: "the `*Light` / `*Dark` names
  INVERT between schemes". A record whose two arms cross-reference two halves under inverting names
  is the most typo-prone shape in the whole token layer, and it is now the one shape the scan cannot
  see. Not "the arm is inert" — the arm is where the read happens.
  This also refutes the framing of integration finding **I-8** ([INFO],
  `INTEGRATION-u2-assembly.md:362-368`), which presents the arm skip as having "covered all three
  uniformly ... fixed as a class rather than as one file". It did not make the arms safe; it removed
  the arms from coverage. I-8 should be re-scored on that basis rather than closed as informational.
Adversarial input / sequence: any later package writes the next two-half record — U5.1's map tokens
  and U8.1's `glass-tokens.ts` pass are both scheduled to — and its light arm reads the dark half by
  copy-paste from the line below it. Or a merge resolves one of `DangerFill`'s arms to the wrong
  side; W1's own F24 round is on record as having emptied a skip set at a merge boundary, which is
  how this skip came to exist at all.
Observable wrong behavior: every gate green, and plan §9 clause 12's one-site scheme flip is void
  for that record. At the U8-exit light-flip scratch worktree the surface renders a dark value under
  a light scheme, and no gate reported anything — the identical end state W1/F18, F23 and F24 each
  closed a different route to.
MUTATION PROBE: can a wrong-half read hide inside an arm?
  Provenance: canonical source, probe worktree probe-w2-sfh-scans at 00a96c7 (no mirrored copy)
  (a) SHIPPED CODE, the realistic typo: `button-recipe.ts:100`
      `light: palette.light.errorDark,` -> `light: palette.dark.errorDark,`
      Scan (`glass-tokens.test.ts`): **exit 0, 7 passed — SURVIVED**
  (b) Negative control, IDENTICAL access one line up, outside an arm: `const PROBE_EDGE =
      palette.dark.errorDark` inserted immediately above `export const DangerFill = {`
      Scan: **EXIT 1 — KILLED** — "expected [ 'controls/button-recipe.ts' ] to deeply equal []".
      Four clauses: shipped file, non-equivalent, covered by the suite run, on the executed
      `SCHEME_HALF.some(...)` arm. The ONLY difference between (a) and (b) is the leading `light:`.
  (c) The next record, with no per-constant pin behind it: a new
      `export const PROBE_SHEET_EDGE = { light: GLASS_TIER.dark.sheet.border, dark: ... }` in
      `controls/sheet-chrome.ts` — its LIGHT arm reading the DARK half.
      Scan: exit 0. **FULL SUITE: exit 0, 290 files / 3,881 passed | 4 todo** — SURVIVED end to end.
  Restore: verified byte-identical after each arm (`git checkout --`; `git status --porcelain`
    empty; `git diff` against the probe base empty; full suite back to 290 / 3,881, exit 0)
Severity note — why MEDIUM and not the contract's HIGH default for a survivor, and it is a real
  distinction rather than hedging: TODAY's only exposure is closed by a sibling pin. I probed that
  too rather than assuming it — mutation (a) is **KILLED by `button-recipe.test.tsx:62-66`**
  (exit 1, "expected '#ee2f44' to be '#dc2626'"), which asserts both arms against `palette.<half>`
  AND against their literal hexes. So there is no live hole, and the scoring follows this lane's own
  W1 precedent (F18 / F23 / F24 all scored MEDIUM on "no live violation; the harm lands on the
  light-flip day"). Probe (c) is what keeps it at MEDIUM rather than LOW: the coverage rests on
  someone remembering to hand-write a per-constant pin for every future record, which is precisely
  the hand-maintained-roster class this campaign has now removed three times (W0/F2, W1/F16,
  W1/F23).
Fix: skip the ARM's KEY, not the arm's LINE — strip only the leading `^\s*(?:light|dark)\s*:` and
  scan the remainder, so `light: palette.light.errorDark` still presents `palette.light.errorDark`
  to `SCHEME_HALF`. Then exempt the MATCHING half only: a `light:` arm may read `palette.light.*`,
  a `dark:` arm may read `palette.dark.*`, and a cross-read is an offender. That is a two-line change
  to the same filter, and it turns the skip into what its own comment already claims.
```

---

## Checked and cleared — the brief's surfaces, answered

1. **`GlassBottomSheet`'s dismissal math — can a bad pointer sample fling or trap the sheet?**
   No, and the floor is the right fix in the right place. `MIN_VELOCITY_SAMPLE_MS = 1000/60`
   (`:71`) floors the DIVISOR, so the worst a sub-millisecond sample can produce is
   `travelled / 16.67 * 1000`; clearing `DISMISS_VELOCITY = 800` needs >13.3px inside one frame,
   which is a genuine fling. A tap (`travelled` 0-3px) yields <=180 px/s and fails both
   comparisons, and both comparisons are strictly-greater against positive thresholds, so an
   upward drag or an upward velocity dismisses nothing (`:91`). **Trapping:** every exit from a
   live drag routes through `endDrag`, which clears `drag.current` and `setDragY(0)` BEFORE
   deciding (`:275-277` — the ordering matters and it is right). Three routes reach it:
   `pointerup`, `pointercancel` (both wired at `:361-362`) and the `e.buttons === 0` net at
   `:294-299` for a release that produced no `pointerup`. `panelRef.current` is non-null whenever a
   drag can run (`phase === 'closed'` returns null at `:324`, above the ref's element), and the
   `?? 0` at `:280` feeds the documented `SCREEN_FALLBACK_HEIGHT` path rather than a zero
   threshold — a 0 height would otherwise make EVERY downward drag exceed `0 * 0.25`. That is the
   one place a silent `?? 0` could have dismissed on any touch, and `shouldDismissSheet`'s
   `sheetHeight || FALLBACK` is what closes it.
2. **Does a failed close route leave the scrim up?** No. Scrim and panel are ONE conditional return
   (`:386-411`) gated on a single `phase`, so there is no state in which one renders without the
   other. The `closing` timer is cancelled on re-open as well as on unmount (`:245`, with the
   comment naming why), and `closing` is unreachable under reduced motion by construction (`:237`),
   so the sheet cannot sit for 200ms of nothing. Escape is gated on `visible`, which is strictly
   tighter than master's `PickerSheet` (ungated for its whole mounted life). `PickerSheet` is
   currently the ONLY mounter, so no surface gained an Escape listener it did not already have.
3. **`CentredDialog`'s focus hand-back when `activationOrigin` is empty.** Silent, and correctly so
   for this diff: focus falls to `<body>`, but that is a CONSOLIDATION onto the best of the three
   deleted mechanisms, not a regression — `DeleteConfirmationModal:83` and `ExportModal:231` each
   read `document.activeElement` at mount, the path the survivor's own docblock (`:115-131`)
   documents as broken. The capture-phase tracker is armed at module scope, is idempotent
   (`:163-168`), and the captured origin is `isConnected`-checked at BOTH capture (`:274`) and
   restore (`:147-149`), so a stale origin left by an earlier interaction cannot become a later
   dialog's opener — I checked the specific sequence, since `rememberKeyOrigin` fires on EVERY
   document keydown and will happily record a dialog panel that is about to unmount. Escape has a
   real stack (`openDialogs`, `:184`, `:259`) keyed on the ref OBJECT, so a nested alert does not
   dismiss the dialog under it. One prose inaccuracy, not a finding: `:141-145` says focus "is left
   where it is", but the focused element is the panel being destroyed, so the browser resets to
   `<body>` — the behaviour is a fall to document start, not a no-op. Out-of-lane note below.
4. **`buttonStyle()` with an unknown variant or size.** `paint()`'s switch (`:154-209`) has no
   `default`, and all five `ButtonVariant` members are cased, so TS treats the tail as unreachable
   and the function does not widen to `| undefined`. At runtime an off-union variant returns
   `undefined`, the spread yields no `edges`, and `edges.top` (`:245`) **throws** — loud, which is
   the right shape. `SIZES[size]` (`:249`) is the asymmetric half: an off-union size spreads
   `undefined` as `{}` and silently drops padding, min-height and label size. I am NOT filing it —
   I cannot name a reachable adversarial input. Both types are closed unions, every call site is
   TS, and no variant or size is read from data: I grepped `screens/screenData.ts` and the content
   layer and neither carries a variant or size string. Pre-report gate question 2 fails, so it is
   dropped rather than demoted.
5. **The status severity recipe on an unknown level.** Closed by construction, not by a default.
   `severityTone` (`tokens/status.ts:118-126`) resolves through TEMPLATE-indexed palette reads, and
   `STATUS_SEVERITY` / `STATUS_ACCENT` / `SEVERITY_ACCENT` are each
   `as const satisfies Record<LocationMapStatus | 'incident', ...>` — so a new engine status with
   no ruling is a compile error, and a severity with no token trio is too. There is no `default:`
   arm and no `??` anywhere on the status path. `statusBadgeStyle`'s `BADGE_PADDING[size]` has the
   same shape as `SIZES[size]` above and the same unreachability.
6. **The Banner's dismiss when `onDismiss` is absent.** There is no dismiss affordance and no
   `onDismiss` prop, in any revision, on either platform — `Banner.tsx:44-51` records the phone
   deleting its unused `icon` prop in PR #112 and never having had a dismiss. A Banner is a status
   line; nothing can fail to dismiss. Its own honesty surface is intact and slightly improved:
   `aria-label` carries the severity into the accessible name ("the colour cannot"), and the
   `aria-live` split is explicit BECAUSE `role="alert"` implies assertive — a failure-cause
   distinction added, not collapsed.
7. **The adoption scans' dead-exemption tests — do they actually die?** Mixed, and this is the
   wave's finding. `screens/__tests__/one-switch-renderer.test.ts` is the model: NO exemption list
   at all, plus an explicit anti-vacuity case ("guard against a walker that silently finds
   nothing", `:55-59`, asserting `files.length > 100` AND that the renderer file is in the walk) —
   the direct answer to my predecessor's green-by-absence precedent, and the shape the other scans
   should copy. It also states its own ceiling rather than overclaiming it (`:35-40`, the key-between
   -the-two-geometry-keys case). `empty-state.test.tsx`'s census asserts a `Record<file, count>`
   rather than a total, so a site leaving the keep-list names itself instead of moving a number.
   `choice-controls.test.tsx`'s dead-exemption test is the one that does not die — HIGH #1 and #2.
8. **The guard's new record-arm skip.** MEDIUM above, probed in both directions.
9. **The demo's standing honesty machinery — D12, sample badges, `aria-disabled`.** Intact, and I
   checked at source rather than trusting the PR body. The `FallbackMode` union
   (`import/run-import.ts:58`), the `never`-guarded `fallbackNotice` switch
   (`DemoExperience.tsx:1706-1709`), `emitFallback`'s per-mode log line, the `fieldCount === 0`
   live-reply rejection (`:207`) and `isSample` (`importResultData.ts:104`,
   `ImportResultAccordion.tsx:41`) are all untouched — `run-import.ts` and `importResultData.ts` do
   not appear in the diff at all. D12 holds at the paint too: BOTH amber notice blocks survive
   verbatim at `ImportModal.tsx:273` and `:289` (`#ffd07a` on `rgba(255,200,90,0.1)`), so the
   visitor's "this is the SAMPLE, not your document" copy is still visually distinct from the ported
   warning family. U3.3's Banner adoption in `import/PickerStage.tsx` converts a DIFFERENT surface —
   the per-file import ERROR, not the fallback notice — and that conversion is a strict honesty
   gain: it replaces a translucent `rgba(255,71,87,0.08)` fill carrying saturated-accent text
   (unmeasurable by construction) with the measured opaque `errorLight` / `errorOnLight` trio, and
   keeps `role="alert"`. u3.3's deferral proposal D-1 states this ruling accurately; premise
   verified, no finding.
10. **The engine's colour extraction (`engine/logic/media/audio-levels.ts`).** Clean, and it removes
    a silent-failure surface rather than adding one. `levelFillColor` -> `levelFillBand` and
    `recorderStatusColor` -> `recorderStatusTone` return vocabularies, not hexes; the
    `default: return assertNever(phase)` arm is PRESERVED, and the docblock names why in this lane's
    own terms ("a `default` arm would silently paint an unknown phase as READY beside a live
    microphone"); and both UI mappings are total `Record<Tone, string>` / `Record<Band, string>` at
    `screens/AudioRecorderScreen.tsx:119,126`, so a new member is a compile error and never an
    `undefined` background.
11. **Breadcrumbs.** None removed. `git diff master...HEAD` across all non-test production files
    returns **zero** deleted `console.warn` / `console.error` / `console.log` lines. The whole diff
    adds exactly ONE `catch` — `GlassBottomSheet.tsx:312`, around `setPointerCapture`, documented
    and backed by the `e.buttons === 0` net — and no `void fn()`, no bare `.then()`, no
    `Promise.all`, and no un-awaited handler promise on any production path.
12. **Deferral ledger.** §15 (`selectors.ts` / `time.ts`), §18 (`onFilesPicked` / `runPasteImport`)
    and §28 (rail narration) are untouched by this diff — none of those paths appears among the 129
    changed files, so no Trigger has lapsed and nothing is re-filed. No `TRIGGER-LAPSED`.

### Disclosed items I judged and did NOT re-file
- **I-7** (the tripwire never drives the `Field` error path) — ledger-proposed; per the brief, not
  re-flagged. I did check its NEIGHBOURS as asked: I-5 (merge-orphaned imports, no `noUnusedLocals`)
  is a dead-code question and out of my lane; **I-8 is in my lane and its premise is wrong** — folded
  into the MEDIUM rather than filed twice; I-4 is genuinely withdrawn, and its replacement scan's
  negative control kills (probed above, as part of HIGH #1).
- **`fieldInputStyle`'s disabled-beats-error precedence** (`tokens/field-input.ts:68`) — a field
  that is both disabled and in error paints the DISABLED border colour and keeps only the error's
  2px width. I traced it before deciding: it is faithful transcription of the phone's style array
  (`TextInput.tsx:70-75`), the docblock says so, and — decisively for this lane — the error TEXT
  still renders with its `aria-describedby` link intact, so no error message becomes invisible.
- **`PickerSheet` gets the shell's enter animation and not its exit** (`PickerSheet.tsx:69-74`) — a
  disclosed behaviour statement with a named owner and a deferral proposal, and it matches what the
  three pickers already do on master. No finding.
- **u2.4 D-2, u3.2 D-4, u3.3 D-3 and D-4** (missing per-site pins) — each correctly identifies a
  coverage boundary, names an owner and carries a concrete trigger. Premises hold as written.
- **`GlassBottomSheet`'s scrim taking `role` only when `closeLabel` is given** (`:391-393`) — an
  unlabelled clickable div is an a11y question, and the web lane owns it.

---

## Silent Failure Hunter Summary
CRITICAL: 0 · HIGH: 2 · MEDIUM: 1 · LOW: 0
Verdict: **REVISE**

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 1 |
| LOW | 0 |

Fallback honesty (every substitution announced): **yes** — `FallbackMode`, its `never`-guarded
notice switch, `emitFallback`, the `fieldCount === 0` live-reply rejection and `isSample` are all
untouched, and D12's amber survives verbatim at both `ImportModal` sites.
Failure-cause distinctions preserved: **yes**, and two were added — `Banner`'s explicit `aria-live`
split (assertive for error/warning, polite otherwise, because `role="alert"` would otherwise force
assertive on all four), and the engine's band/tone vocabularies replacing three hexes each while
keeping `assertNever`.
Partial results flagged (not silently short): **NO — this is the wave's finding, and it is the same
class as W1's.** Two source scans report clean over code they structurally cannot see: the
choice-control scan over an exempt file's radios (probed, SURVIVED against the FULL suite), and the
clause-12 scan over any `light:` / `dark:` record arm (probed, SURVIVED against the FULL suite).
Async cancellation / stale-write safety: **yes** — no store write after an `await` anywhere in the
diff; the only new async surface is the sheet's pointer drag, whose three release routes all clear
the drag ref before deciding.
Operator breadcrumbs intact: **yes** — zero `console.*` removals across all production files.
Probes: **7 run** — 3 KILLED (2 negative controls + the sibling-pin check that bounds the MEDIUM to
today), **3 SURVIVED** (HIGH #1, and the MEDIUM's arms (a) and (c)), and 1 discarded as an invalid
(equivalent-to-breaking-a-live-control) mutation, reported above as discarded rather than quietly
dropped. Every restore proven byte-identical; teardown verified —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0.

Out-of-lane observations:
- Both HIGHs and the MEDIUM share ONE root the aggregator may want to state once: this wave added
  three source scans, and each one's EXEMPTION mechanism is broader than the reason written beside
  it — a file-keyed skip that was meant to be role-keyed, and a line-keyed skip that was meant to be
  arm-keyed. `one-switch-renderer.test.ts` is the counter-example that needs no exemption at all and
  carries an anti-vacuity case; it is the shape worth promoting to a campaign convention, and this
  is the fourth round running in which a hand-maintained carve-out has been the finding (W0/F2,
  W1/F16, W1/F23, W1/F24's successor).
- `CentredDialog.tsx:141-145`'s comment says focus "is left where it is" when the opener cannot take
  it; the panel holding focus is being destroyed, so the real outcome is `<body>` and document
  start. No regression versus master (all three deleted copies were worse) and a11y belongs to the
  web lane — but the comment should say what happens, because the next maintainer will read it as a
  no-op and it is not.
- `PickerSheet` is the only mounter of `GlassBottomSheet` today; `MediaLibrarySheet`,
  `ExportActionSheet` and `CaseActionsSheet` are named in its docblocks as consumers but still
  hand-roll their own chrome and their own Escape listeners. When they adopt (U7.2), a sheet
  co-open with a `CentredDialog` will have TWO independent `document` keydown listeners and no
  shared stack, so one Escape will close both — the exact hazard `openDialogs` was built for, one
  family over. Worth a note in whichever package adopts them; not a W2 defect.
- No foreign content was found in my lane file, and I wrote no other path.
