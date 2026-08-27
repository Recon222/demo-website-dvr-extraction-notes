# Lane: silent-failures — Wave 1 (U1.1–U1.4), PR #40

## Round 2 (fix delta — targeted rider round)

Head: `feat/uiparity-w1` @ `d91ab76`. Delta read: `git diff 044578a..d91ab76`, scoped to the four
rider items. Authority: the "W1 rider round" mapping comment on PR #41. Probe worktree
`probe-w1d2-sfh-switch` off `d91ab76`; torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0. No leftover
`probe-w1d2-sfh-*` existed at start. Baseline in that worktree: the six token/tier/recipe/header
suites **74 passed (74)**, exit 0.

### F23 (my r1 MEDIUM — the scheme-half scan's hand-typed roster) — FIXED

`glass-tokens.test.ts`: the roster is **deleted**. `SCHEME_HALF` is now two form-agnostic patterns
over a WILDCARD identifier — member access (`X.dark`), bracket access (`X['dark']` / `X["light"]`)
and destructure (`const { dark } = X`) — with the only exemption being the FILE
(`SCHEME_DECLARERS`). That is a better fix than the one I prescribed: I asked for `SHADOW_CARD` in
the alternation or a `satisfies Record<ColorScheme, …>` derivation, and the commit's own reasoning
refutes the second — *"enrolling records BY NAME … would be the fourth [recurrence], because the
record that forgets to enrol is exactly the one that drifts"* — naming W0/F2, W1/F16 and F23 as the
same class three times over. I accept the refutation; a wildcard has no list to keep honest.

```
MUTATION PROBE: re-run of my r1 survivor, plus the new form
Provenance: canonical source, probe worktree probe-w1d2-sfh-switch at d91ab76
(a) glass-tokens.ts:155  `shadowCard: SHADOW_CARD[scheme]` -> `SHADOW_CARD.dark`
    At 044578a: SURVIVED (exit 0, 33 passed).  At d91ab76: **EXIT 1 — KILLED**
    ("no production module hard-codes a scheme half (plan §9 clause 12)")
(b) glass-tokens.ts:62   `const tier = GLASS_TIER[scheme]` -> `GLASS_TIER['dark']`
    the bracket form the old dot-only pattern could not see: **EXIT 1 — KILLED**
Restore: verified byte-identical (git checkout --; git status --porcelain empty; 74/74 green)
```
Measured cost of the widening: zero offenders across every non-test file under `ui/` — no false red.

### New finding (the exemption question, answered with a probe)

```
[MEDIUM] The `SCHEME_DECLARERS` file exemption hides exactly one real access — the one-site SWITCH
         itself — because its only pin hard-codes the same half — SURVIVED
File: features/demo/ui/tokens/palette.ts:189 (exempt from the scan) ·
      features/demo/ui/tokens/__tests__/palette.test.ts:144-146 (the pin that should cover it)
Code:
  export const colors = palette[scheme]          // palette.ts:189 — the switch
  it('exposes the consumed scheme as a single switchable site', () => {
    expect(colors).toBe(palette.dark)            // palette.test.ts:146 — hard-codes the half
  })
Issue: the scan's file-level exemption is right in principle — a declaring file must be able to
  name its own halves — but `tokens/palette.ts` is not only a declarer, it also CONSUMES: `:189` is
  the single consumed-scheme site plan §9 clause 12 is built on, and the module's own docblock at
  `:177` says "no consumer may reach for `palette.dark` directly". Regress that line to
  `palette.dark` and the scan cannot see it (exempt file) and the pin cannot see it either,
  because the assertion spells `palette.dark` too. The test's NAME says "single switchable site"
  while its assertion is scheme-blind — the one place in this campaign where the exemption has
  something real to hide, and it is the most load-bearing line of the two-scheme design.
  `tokens/glass-tiers.ts`, the other exempt file, declares only and consumes nothing, so it carries
  no equivalent exposure.
Adversarial input / sequence: any later package "simplifies" `palette[scheme]` to `palette.dark`,
  or a merge resolves that line to the pre-U1.1 form (it WAS `palette.dark` until U1.1).
Observable wrong behavior: every gate green — 74/74 — while the one-site flip promise is void and
  the U8-exit light-flip worktree renders dark colours with light tiers.
MUTATION PROBE: does the exemption hide the switch?
  Mutation: palette.ts:189 `palette[scheme]` -> `palette.dark`
  Result: **SURVIVED** (exit 0, 74 passed across all six suites)
  Negative control: the same regression in a NON-exempt file — probes (a) and (b) above, both
    KILLED. Four clauses met: shipped code, non-equivalent (it voids the flip), covered by the
    suites run, on an executed arm. The only difference is the file exemption plus a pin that
    restates the half.
  Restore: verified byte-identical (porcelain 0; 74/74 green)
Severity note: MEDIUM, not the contract's HIGH default for a survivor, and consistent with how F18
  and F23 were scored — no live violation, no runtime or visitor-facing failure, and the harm lands
  on the light-flip day. It is MEDIUM rather than LOW because that day has no reviewer and this is
  the switch every other seam depends on.
Fix: one token in the pin — `expect(colors).toBe(palette[scheme])`, importing `scheme` beside
  `colors`. That makes the assertion mean what its title already claims and closes the exemption's
  only real hiding place without touching the scan.
```

### The `vitest.setup.ts` guard (`7fc126b`) — its own failure surface

**Does it swallow or downgrade any other `console.error`? NO — and this is the part it gets
exactly right.** `vitest.setup.ts:52-58`: the wrapper pushes onto `conflictingStyleWarnings` only
when the regex matches, and then calls `realConsoleError(...args)` **unconditionally, outside the
branch**. Every console.error in the suite — matched or not — still reaches the real console with
its original arguments. Nothing is filtered, muted, or re-levelled. The narrowing is in what gets
PROMOTED to a failure, never in what gets printed, which is the opposite of the swallow pattern
this lane exists to catch. The `afterEach` throw is also correctly placed AFTER `cleanup()`, so
warnings emitted during unmount are collected before the array is read, and the docblock records
why it is not thrown from the console call itself (a throw inside React's commit phase surfaces as
an unrelated failure elsewhere).

**Can a violation escape it?** Four routes, all bounded, none a defect in the guard:
1. **Warning-text variants — covered, and slightly wider than the docblock claims.** The regex is
   `/conflicting property/` against `args[0]`, and React emits the phrase in a format string, so it
   catches BOTH members of the family: "Updating a style property during rerender (%s) when a
   conflicting property is set (%s)" and the "Removing a style property…" sibling — which is the
   one that fired on `CompletionScreen`'s padding. A React release that reworded the phrase would
   silently disarm the tripwire; that is inherent to any warning-text gate and is why the value
   pins in `glass-card-recipe.test.tsx` are called a complement rather than a duplicate.
2. **A test that spies `console.error` replaces the wrapper for its duration.** 12 sites do
   (`DemoErrorBoundary.test.tsx:22`, `DemoExperience.boundary.test.tsx:22`,
   `DemoExperience.boot-boundary.test.tsx:18`, `DemoExperience.sandbox.test.tsx:772,799,836,873`,
   `PickerStage.test.tsx:170,188`, `MapCanvas.test.tsx:583,594`, `useGpsCapture.test.ts:105`).
   Inside those cases the tripwire is off. I checked the leak risk rather than assuming it:
   `vitest.config.mts` sets no `restoreMocks`, so an unrestored spy would disable the guard for the
   REST of its file — but all three of the `beforeEach`-installed spies restore
   (`restoreAllMocks`/`mockRestore` present in each), so the blindness is per-case, not per-file.
   Worth knowing, not worth a change.
3. **Production build / no test.** The tripwire is dev-React and test-time only: it can fire only
   for a component some test actually renders AND updates. A consumer with no update-path test —
   the `AudioRecorderScreen.tsx:127` case the rider explicitly scopes out — is invisible to it.
   That is the coverage boundary, correctly stated in the docblock as a complement to value pins.
4. **`act()` batching / late warnings.** Collection is synchronous at console.error time, so
   batching does not lose anything. A warning arriving in a later macrotask after `afterEach` would
   be attributed to the next test (`beforeEach` clears the array) — a misattribution, never an
   escape. No test observed doing this.

**Its own evidence:** the guard caught four live defects on first run, which is the strongest thing
that can be said for a tripwire — including `CompletionScreen:66`, a real visitor-visible defect
(the review form rendering with no top padding after "Export again") whose only prior signal was a
console error nobody read. That is precisely this lane's failure class, found by a gate rather than
by a reviewer.

### `Field`'s error-clear path — LOUD-OR-CORRECT: correct, with no fallback at all

`_shared.tsx`: `const boxStyle = error ? { ...fieldInput, border: '1px solid #ff4757' } : fieldInput`.
I checked the base rather than trusting the comment: `fieldInput:191` carries `border: GLASS.border`
— a SHORTHAND — so both branches now declare the SAME key, and the error-clear transition is an
in-place rewrite of `border` back to the base value. There is no longhand left over a shorthand,
so React has nothing to remove and nothing to fail to reassert; the previous
`{ ...fieldInput, borderColor: '#ff4757' }` was the defect because clearing it removed the longhand
while the base's shorthand stayed untouched and the input lost its border entirely. Same shape and
same verification at both copies — `IncidentLocationFields.tsx:134` and `NewCaseModal.tsx:86`, whose
base `coordInput:91` likewise carries `border: GLASS.border`. All three are 15-consumer root fixes,
not per-call-site patches. `CompletionScreen:66` collapses `padding: 16` + `paddingTop: 60` into the
single `padding: '60px 16px 16px'` shorthand — same box, one key, nothing to remove on the
transition. **No silent fallback anywhere in the four: every branch declares a value, none relies on
a base reasserting itself.**

Note for the aggregator, not a finding: the fragments went longhand-only under the lit-edge ruling
while these input bases stayed shorthand-only. Both are internally consistent and each is correct
for its own shape (a fragment publishes per-side colours a consumer re-tints; an input declares one
uniform border), and the tripwire now covers the seam between them repo-wide.

### Round 2 Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 (new) · LOW: 0
Prior-round disposition: **F23 FIXED** — my r1 survivor re-probed and KILLED, plus the bracket form
the old pattern could not see. 1 of 1 closed.
Verdict: **APPROVE with comments**

Fallback honesty: **n/a** — no fallback or notice surface touched.
Failure-cause distinctions preserved: **yes** — and the new tripwire adds one without removing any:
it promotes one named React warning to a failure and forwards every console.error untouched.
Partial results flagged: **yes**.
Async cancellation / stale-write safety: **n/a**.
Operator breadcrumbs intact: **yes** — none removed; `realConsoleError` is called unconditionally.
Probes: 3 run this round — 2 KILLED (F23's re-verification + the bracket form), **1 SURVIVED** (the
new MEDIUM). Restores proven byte-identical; teardown verified.

Out-of-lane observations:
- Third recurrence of one class, now named by the fix author as well: a hand-maintained roster
  standing in for a derived set (W0/F2, W1/F16, W1/F23). The rider's wildcard is the first fix that
  removes the list rather than lengthening it — worth promoting to a campaign convention.
- The exemption finding above is the mirror image: the ONE thing a wildcard scan still cannot see
  is inside a file it must exempt, so that file's behaviour needs a pin instead of a scan.
- No foreign content was found in my lane file, and I wrote no other path.

---

## Round 1 (fix delta)

Head: `feat/uiparity-w1` @ `044578a` (branch is one docs-only commit further on, `1b4ac86`).
Delta read: `git diff fc75577..044578a` — the fix commits and the lines they touch, per contract §7.
Authority: the PR #41 mapping comment. My r1 items appear there as **F17** and **F16** (both
demoted from my HIGH to MEDIUM by the aggregator) and **F21** (my LOW). I do not contest the
demotions: both fixes landed at the strength I asked for, so the label is moot.

Probe worktree `probe-w1d-sfh-stuck` off `044578a`; torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0. No leftover
`probe-w1d-sfh-*` existed at start; the two live probe worktrees on this box belong to other
seats and I did not touch them.

Baseline in the probe worktree: standalone guard **115/115, exit 0**; the five token/tier/guard
suites **53 passed (53)**, exit 0, **0 skipped** — the phone repo is present, so no verdict below
is quoted off a skip.

### Per-finding status

**F17 (stuck reader invisible to the standalone CLI) — FIXED.**
`check-rn-parity.mjs:483-509` computes `stuck` inside `checkParity()` and returns it beside
`drift`/`parseFailed`; `:529-536` prints it and `:544` exits on `drift.length || stuck.length`.
Parse-failed rows are skipped when building it, which is right — two identical "field not found"
strings are not evidence of a stuck reader — and parse failures still force exit 1 through `drift`,
so nothing was lost in the reshuffle. The test at `:249-278` now asserts the guard's OWN `stuck`
instead of re-deriving the comparison, so the two entry points cannot disagree again.

```
MUTATION PROBE: re-run of my r1 survivor — both tier scopes flattened to one level
Target: check-rn-parity.mjs:231 (`rnTierScope`) + :243 (`webTierScope`)
Mutation: after: ['export const GlassColors'|'export const GLASS_TIER', `${scheme}: {`, `${tier}: {`]
          -> after: [`${tier}: {`]   (both, the realistic edit — they are twins)
At 28e7993: standalone printed "✓ all 115 anchor rows match", EXIT 0 — SURVIVED
At 044578a: **EXIT 1 — KILLED**, and it says what broke:
  "✗ 48 anchor row-pair(s) read the SAME value for light and dark — a reader is STUCK on one half:
     card.gradientTop (rn side): both halves read rgba(248,250,252,1)
     card.gradientTop (web side): both halves read rgba(248,250,252,1) …"
  vitest also EXIT 1 (3 failed | 15 passed)
Provenance: canonical source, probe worktree at 044578a. Restore: byte-identical (porcelain 0).
```
I checked the vacuity risk this class of fix usually carries — an empty `stuck` meaning "nothing
was examined" rather than "nothing is stuck". `stuck` only inspects keys that have BOTH halves
(`:499`), so a vanished scheme would make it silently empty; what closes that is the pair of
both-halves loops (`schemes` must equal `['dark','light']` for every palette key and every tier
key), and the fix's own comment at `:270-272` names exactly that dependency. It holds.
`SCHEME_INVARIANT` moved into the guard as the single exclusion (`:360-367`) and the test pins
that it is those two keys and nothing else, typed at `PaletteToken` so a typo is a compile error.

**F16 (tier lists pinned by hand-typed cardinality) — FIXED, and better than I asked.**
The three literal counts are gone; `rn-token-parity.test.ts:101-131` pins MEMBERSHIP against the
live module — `[...TIER_KEYS].sort()` vs `Object.keys(GLASS_TIER.dark).sort()`, and the parts as
`[...anchoredFields, ...UNANCHORED].sort()` vs `Object.keys(GLASS_TIER.dark.card).sort()`, so the
deliberate `innerShadow` exclusion is now a NAME rather than the difference between 4 and 5 —
which is the shape I prescribed. Beyond the prescription, W0/F11's carry moved both membership
pins (palette and tier) into an **ungated** describe, so they now bite on a box without the phone
repo. Two probes:

```
MUTATION PROBE: re-run of my r1 survivor — shrink the tier table
Mutation: drop 'recessed' from TIER_KEYS (no counts left to edit)
At 28e7993: guard exit 0 (107 rows) AND vitest exit 0 (15 passed) — SURVIVED
At 044578a: **vitest EXIT 1 — KILLED** by name — "the guard must anchor exactly the six glass
  tiers: expected [ 'card', 'elevated', 'header', …(2) ] to deeply equal [ …(3) ]"

MUTATION PROBE: the fifth part the mapping flagged as unprobed by any lane
Mutation: add `outerGlow: 'rgba(0,0,0,0.1)'` to GLASS_TIER.dark.card, guard list unchanged
Result: **EXIT 1 — KILLED** — "every part of a tier is either anchored or named unanchored"
Provenance: canonical source, probe worktree at 044578a. Restore: byte-identical (porcelain 0).
```
Bounded residual, not a finding: under the shrink the **CLI** still prints "✓ all 107 anchor rows
match" and exits 0 — membership is necessarily test-only, because the guard is `.mjs` and cannot
import the TS module it mirrors. The code says so at `:263-268`. The CLI is not, and cannot be,
the authority on table completeness; the now-ungated test is, and it runs everywhere.

**F21 (`readStop` truncating a longer tuple) — FIXED.**
`:222` closes the pattern with `\s*\]`. Three unit cases at `:150-169`, all ungated: both stops of
a 2-tuple read, a 3-stop tuple throws `tuple stops not found`, a 1-stop tuple still throws. I
checked the regression direction the close could have caused — the phone spells
`gradient: [...] as const,` and `PrimaryButtonGradient.dark = [Colors.dark.primaryDark,'#17527A']`,
both of which end in `]` — and the live table is unchanged at 115/115, exit 0.

### The round's two questions about the fixes' own failure surfaces

**Does F18's comment-strip or `typeof` carve-out hide a real direct-half access?** No, on both
counts — but the scan has a third hole the round left open (finding below).
- *Comment strip* (`glass-tokens.test.ts`, `stripComments`): correct and necessary — `glass-tokens.ts`
  and `tokens/palette.ts` spell `GLASS_TIER.dark` / `palette.dark` in prose in order to FORBID them,
  so an unstripped scan reds on its own documentation. The stated cost — a `//` inside a string
  truncating that line — I checked rather than accepted: no file under `ui/` spells a scheme half on
  a line that also carries `//` inside a string literal, and the only near-hits are in `palette.ts`,
  which the scan skips as a `SCHEME_DECLARERS` member anyway.
- *`typeof` carve-out* (`SCHEME_HALF`'s negative lookbehind): it fires only immediately before the
  match, so it exempts exactly `typeof palette.dark…` — the F15 construct that must keep compiling
  after the flip — and nothing else. A value access elsewhere on a line containing `typeof` is still
  caught. The control probe below proves the pattern still bites in the very file that carries the
  carve-out.
- *`SCHEME_DECLARERS` vs `TOKEN_MODULES`*: the refinement is right and is the substance of F18 —
  scanning with `TOKEN_MODULES` would have exempted `glass-tokens.ts`, one of the two live
  consumers, i.e. half the exposure, while reporting green.

**Does the carry's ungated describe leak anything phone-dependent?** No. Every case in
`describe("the guard's local invariants — nothing here reads the phone repo")` reads only local
things: `Object.keys(palette.dark)`, `Object.keys(GLASS_TIER.dark)`, `Object.keys(GLASS_TIER.dark.card)`,
and two `readField` calls over inline string literals. No `RN_ROOT`, no `readFileSync` of the sibling
repo, no `rnAvailable()` in the block. The sibling `readStop` describe (F21) is likewise ungated and
likewise reads only inline strings. Verified empirically as well as by reading: the suite reports
**0 skipped** on this box, and two of the probes above were killed by cases inside that block.

### New finding (fix-round-introduced)

```
[MEDIUM] F18's scheme-half scan names two records by hand and misses the third — `SHADOW_CARD`,
         created by F19 in this same round, with the handoff written down and not picked up
File: features/demo/ui/__tests__/glass-tokens.test.ts (`SCHEME_HALF`) ·
      features/demo/ui/glass-tokens.ts:103-106 (`SHADOW_CARD`), :155 (`SHADOW_CARD[scheme]`) ·
      the dropped handoff: features/demo/ui/__tests__/glass-card-recipe.test.tsx:623-629
Code:
  const SCHEME_HALF = /(?<!\btypeof\s+)\b(?:GLASS_TIER|palette)\s*\.\s*(?:dark|light)\b/
Issue: F19 added a THIRD two-scheme record in this round — `SHADOW_CARD`, `as const satisfies
  Record<ColorScheme, string>`, exported — and its author wrote the handoff explicitly: "That is
  exactly the class W1/F18 files against `GLASS_TIER.dark`, and its source scan is the mechanism
  that catches it: `SHADOW_CARD` belongs in that scan's list. Not duplicated here — F18's owner
  holds that file." The two fixes landed on different branches in the same round and the handoff
  was dropped at the merge. It matters more than the usual "widen a regex", because F19's own probe
  Q7 recorded the severed-derivation case as SURVIVED — the runtime cannot distinguish
  `SHADOW_CARD.dark` from `SHADOW_CARD[scheme]` while `scheme` is `'dark'`, so this source scan is
  the ONLY mechanism that can, exactly as F18 argues for `GLASS_TIER`.
  Completeness sweep over the same hard-coded set: the alternation also misses the bracket and
  destructure spellings of the two records it DOES name — `palette['dark']`, `GLASS_TIER["dark"]`,
  `const { dark } = palette`. I grepped: none is live under `ui/` today, so that half is a
  hardening, not a hole.
Adversarial input / sequence: any later package spends the card shadow directly — `SHADOW_CARD.dark`
  — or severs `GLASS.shadowCard` back to its literal.
Observable wrong behavior: every gate green, and plan §9 clause 12's one-site scheme flip is
  quietly a two-site change; at the U8-exit light-flip worktree the card shadow stays black-on-white
  instead of taking the phone's tinted light value, with nothing having reported anything.
MUTATION PROBE: does the scan see a third record?
  Provenance: canonical source, probe worktree probe-w1d-sfh-stuck at 044578a
  Mutation: glass-tokens.ts:155 `shadowCard: SHADOW_CARD[scheme]` -> `SHADOW_CARD.dark`
    Result: SURVIVED (exit 0, 33 passed) — including `glass-card-recipe.test.tsx:630`, which still
    passes because the two expressions are equal at runtime
  Negative control: same file, same shape — `const tier = GLASS_TIER[scheme]` -> `GLASS_TIER.dark`
    Result: KILLED (exit 1) — "no production module hard-codes a scheme half (plan §9 clause 12)"
    Four clauses: shipped code, non-equivalent, covered by the suite run, on an executed arm. The
    only difference between the two arms is the identifier in the alternation.
  Restore: verified byte-identical (git checkout --; git status --porcelain empty; guard exit 0 at
    115/115; 53/53 green)
Severity note: I did NOT take the contract's HIGH default for a survivor. There is no live
  violation, the gate works for the two records it names, and the consequence is a broken one-site
  flip rather than a runtime or visitor-facing failure. It is MEDIUM because the use-day — the
  light-flip scratch worktree at U8 exit — has no reviewer, and because it is a disclosed handoff
  rather than an oversight.
Fix: add `SHADOW_CARD` to the alternation (one identifier). If a durable form is wanted, key the
  scan off the marker all three share — `satisfies Record<ColorScheme, …>` — so the next
  two-scheme record enrols itself instead of waiting on a handoff; the bracket/destructure
  spellings are one more alternation branch, worth taking in the same edit.
```

No other fix-introduced regression in the blast radius of `47a7f90`, `e56c0f1`, `3c31600`,
`f1491b9`, `c0458b6`, `8d65308`, `7ba1825`, `a5af4b2`, `700ce2b`, `d65a2c9` or the master carry.
The production changes this round are the three `header-chrome` fragments moving from a
`CSSProperties` annotation to `as const satisfies CSSProperties` (narrowing, no runtime change),
`ACCENT_FROM`'s `satisfies` re-pointing from `colors.primaryDark` to `palette.dark.primaryDark`
(F15 — which un-breaks the light flip and keeps F7's kill), and `SHADOW_CARD`. None adds a `catch`,
a `??`, a default or a fallback; the demo's honesty machinery is untouched again this round.

### Round 1 Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 (new, fix-round-introduced) · LOW: 0
Prior-round dispositions: **F17 FIXED · F16 FIXED · F21 FIXED** — 3 of 3 closed, 0 PARTIAL,
0 UNFIXED. Both of my r1 survivors were re-probed and are now KILLED.
Verdict: **APPROVE with comments**

Fallback honesty: **n/a** — no fallback or notice surface touched.
Failure-cause distinctions preserved: **yes**, and improved — the CLI now separates drift,
parse-failure and stuck-reader into three named reports with three explanations.
Partial results flagged (not silently short): **yes** — the r1 answer was NO; both shrink paths
are now membership-pinned and ungated.
Async cancellation / stale-write safety: **n/a**.
Operator breadcrumbs intact: **yes** — none removed; the CLI gained a stuck-reader report.
Probes: 5 run this round — 4 KILLED (3 re-runs of r1 survivors + 1 negative control), 1 SURVIVED
(the new MEDIUM). Restores proven byte-identical; teardown verified
(`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0).

Out-of-lane observations:
- The `SHADOW_CARD` gap is a PIPELINE observation as much as a code one: a fix commit named the
  file it could not edit and named the owner who should, and the round merged without anyone
  holding that handoff. Worth a mapping-comment column for cross-seat asks.
- Membership pins cannot move into the CLI (`.mjs` cannot import TS), so "guard exit 0" will always
  be weaker than the suite on table completeness. The header's "exit 1 on drift or mismatch" claim
  is now true for drift, parse-failure and stuck readers, and still silent on a shrunk table.
- No foreign content was found in my lane file, and I wrote no other path.

---

## Round 0 (initial review, retained)

Mode: code review. Single question: **where in this change does a real failure become invisible to
the visitor, the operator, or the next maintainer?**

Read: `git diff feat/uiparity-u0...feat/uiparity-w1` (29 files), the PR body, the three implementer
reports (`u1.1`, `u1.2-u1.3`, `u1.4`) and both integration reports. Probe worktree
`probe-w1-sfh-tiers` off `28e7993`; torn down with `tools/worktree-remove.ps1` —
`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0.

Baseline in that worktree, before any mutation: standalone guard **115/115 OK, exit 0**; the eight
token/tier/contrast/recipe suites **87 passed | 10 todo (97)**, exit 0, **0 skipped** — the RN
sibling repo is present, so every `skipIf` case RAN. No verdict below is quoted off a skip.

---

## HIGH

```
[HIGH] Both tier scopes stuck on the LIGHT half: the STANDALONE guard prints "all 115 anchor rows
       match" and exits 0 while comparing light to light — SURVIVED
File: .design-sync/check-rn-parity.mjs:228-247 (`rnTierScope` / `webTierScope`) + :479-499 (the
      standalone reporter); the only check that catches it is
      features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:196-230
Code:
  export const rnTierScope  = (scheme, tier) => ({ after: ['export const GlassColors', `${scheme}: {`, `${tier}: {`], before: '}' })
  export const webTierScope = (scheme, tier) => ({ after: ['export const GLASS_TIER',  `${scheme}: {`, `${tier}: {`], before: '}' })
Issue: the two helpers are twins — same shape, adjacent, sharing one docblock that explains the
  three-level requirement once. Flatten them together and every tier row compares the LIGHT tier to
  the LIGHT tier: 48 of 115 rows silently stop guarding anything. `checkParity()` cannot see it —
  `drift` is `a.rn !== a.web`, and light equals light. The light-vs-dark structural pin that DOES
  catch it lives in the vitest file, so the two entry points disagree, and the weaker one is the one
  this PR's own Verification section quotes ("`check-rn-parity.mjs` exit 0 (115/115)") and the one
  the module header advertises as authoritative ("Standalone: node .design-sync/check-rn-parity.mjs
  (exit 1 on drift or mismatch)").
Adversarial input / sequence: a maintainer "simplifies" the duplicated scope helpers, or the phone
  reorders `Colors.ts` so a scheme marker lands elsewhere. The guard's own `webTierScope` docblock
  (`:241-246`) names this exact trap — "the identical mistake lands on a COMMENT (`Colors.ts:25`)
  that reads the LIGHT tier for both schemes — zero drift, proving nothing" — so the module knows
  the failure and still does not self-check for it.
Observable wrong behavior: `node .design-sync/check-rn-parity.mjs` prints
  "✓ all 115 anchor rows match between the RN app and the web demo" and exits 0 over a guard that is
  structurally blind to every glass tier. An operator or a phase-gate quoting that command gets the
  opposite of the truth.
MUTATION PROBE: tier scopes flattened to one level
  Target: check-rn-parity.mjs:243 (`webTierScope`) then :231 (`rnTierScope`)
  Provenance: canonical source, probe worktree probe-w1-sfh-tiers at 28e7993 (no mirrored copy)
  (A) web side only -> after: [`${tier}: {`]
      guard EXIT 1 · vitest EXIT 1 — KILLED ("web card.gradientTop: the light and dark reads
      returned the same value: expected 'rgba(248,250,252,1)' not to be 'rgba(248,250,252,1)'").
      This is the negative control: the mutation is non-equivalent, shipped, covered and executed.
  (B) BOTH sides flattened (the realistic edit — they are twins)
      standalone guard: "✓ all 115 anchor rows match" · **EXIT 0 — SURVIVED**
      vitest: EXIT 1 (3 failed) — only the test catches it
  Restore: verified byte-identical (git checkout --; git status --porcelain empty; guard exit 0; 13/13 green)
Fix: move the check into `checkParity()` so both entry points share it — alongside `drift` and
  `parseFailed`, return `stuck` = rows whose `light` and `dark` reads are identical on a side, minus
  the by-name `{onPrimary, onError}` exclusion the test already maintains; exit 1 on a non-empty
  `stuck` and print it like the other two lists. The test then asserts the guard's own result
  instead of re-deriving it, and the standalone stops being the weaker gate.
```

```
[HIGH] The 24 tier anchors are pinned by HAND-TYPED CARDINALITY, not membership — a whole tier drops
       out of the guard by editing two numbers, both gates green — SURVIVED
File: .design-sync/check-rn-parity.mjs:350-351 (`TIER_KEYS` / `TIER_PARTS`) ·
      features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:148-152
Code:
  expect(TIER_KEYS.length, 'six tiers').toBe(6)
  expect(TIER_PARTS.length, 'gradient[0], gradient[1], border, highlightTop').toBe(4)
  expect(TIER_ANCHOR_KEYS.length, '6 tiers x 4 readable parts').toBe(24)
Issue: this is W0/F2 again, one level down, in the same file — and three lines above these
  assertions the same commit writes "Cardinality is DERIVED from the two key lists, never typed.
  W0/F2 removed the hand-typed `.toBe(15)`; the same reasoning removes U1.1's hand-typed
  `.toBe(81)` — a literal total is exactly what lets someone shrink the table to reach green by
  editing one number here." The palette list beside it obeys that: `[...PALETTE_KEYS].sort()` is
  compared to `Object.keys(palette.dark).sort()`, i.e. to the live module. `TIER_KEYS` is compared
  to nothing outside itself. The test already imports `palette` from the token layer, so importing
  `GLASS_TIER` costs one line.
Adversarial input / sequence: any later package (U2.4 / U4.1 / U5.1 all index this module by name)
  hits a red tier row it does not want to own and takes the two-number path; or a seventh tier /
  a newly-readable fifth part lands in `glass-tiers.ts` and is simply never anchored — the exact
  "quiet coverage hole" the PALETTE_KEYS docblock at `:270-276` says membership exists to prevent.
Observable wrong behavior: with `'recessed'` removed from `TIER_KEYS` and the two counts edited to
  match, the standalone prints "✓ all 107 anchor rows match … 20 glass-tier keys" and exits 0, and
  the suite is 15/15 green — while the `recessed` tier, the one the phone specifically re-based off
  near-black `rgb(6,12,22)` and which grounds all three bottom-sheet pickers, is guarded by nothing.
  `tokens/__tests__/glass-tiers.test.ts` does not cover it either: it pins the module to itself.
MUTATION PROBE: shrink the tier table to green
  Target: check-rn-parity.mjs:350 TIER_KEYS + rn-token-parity.test.ts:148,152 (the two counts)
  Mutation applied: drop `'recessed'`; `.toBe(6)` -> `.toBe(5)`; `.toBe(24)` -> `.toBe(20)`
  Result: **SURVIVED** — guard exit 0 ("all 107 anchor rows match"), vitest exit 0 (15 passed),
    8 anchor rows silently gone
  Negative control: the SAME shape against `PALETTE_KEYS` is KILLED by the membership pin
    (re-verified in W0 round 1, probe (b): `'linkHover'` -> `'linkHovr'`, exit 1, the membership
    assertion firing by name). The difference is the missing pin, not the harness.
  Provenance: canonical source, probe worktree probe-w1-sfh-tiers at 28e7993
  Restore: verified byte-identical (git checkout -- both files; git status --porcelain empty;
    guard exit 0 at 115/115; 13/13 green)
Fix: import `GLASS_TIER` in the test and assert membership, retiring all three literal counts:
  `expect([...TIER_KEYS].sort()).toEqual(Object.keys(GLASS_TIER.dark).sort())` and, for the parts,
  `expect([...TIER_PARTS.filter(p => !p.startsWith('gradient')), 'gradient', ...UNREADABLE])` —
  or more simply assert the anchored parts plus the by-name exclusion `{innerShadow}` equal
  `Object.keys(GLASS_TIER.dark.card)`, so the deliberate `innerShadow` exclusion stays a NAME (the
  `SCHEME_INVARIANT` idiom the same file already uses) rather than the difference between 4 and 5.
```

## LOW

```
[LOW] `readStop` reads the first two stops of a longer tuple and reports OK on the truncation
File: .design-sync/check-rn-parity.mjs:196-200
Code:
  const m = region(...).match(new RegExp(`\b${key}\s*:\s*\[\s*(${VALUE})\s*,\s*(${VALUE})`))
Issue: the regex is unbounded on the right, so `gradient: ['a','b','c']` matches and the guard
  compares only `a` and `b`. A one-stop tuple correctly throws `tuple stops not found` (loud), and
  the web type `readonly [string, string]` forbids a third stop on the demo side — but a phone-side
  three-stop gradient would compare equal on the two stops the demo kept and report OK for a
  gradient the demo cannot render. Answering the review question directly: on a MALFORMED gradient
  (missing bracket, single stop, non-literal stop) the reader throws and lands as PARSE-FAILED,
  which is correct; truncation is the one shape it accepts silently.
Adversarial input / sequence: the phone adds a mid-stop to any tier gradient.
Observable wrong behavior: 2 of 48 tier rows report OK against a gradient that changed.
Fix: close the alternation — append `\s*\]` to the pattern so a longer tuple fails to match and
  becomes a PARSE-FAILED row. One character class; the two current callers pass 2-tuples.
```

---

## Checked and cleared — the review's seven angles, answered

1. **Three-level RN/web tier scope reading the wrong tier.** Cleared for the WRONG-TIER case, found
   for the wrong-HALF case (HIGH above). Verified against the phone source that no tier name is a
   substring of another at the marker (`card: {` does not match `nestedCard: {` — `indexOf` is
   case-sensitive), that a tier missing from `dark` searches forward past `GlassColors` into
   `PrimaryButtonGradient`/`ElevatedEdges`/`DangerFill`, none of which carries a tier name, so it
   throws → PARSE-FAILED, and that W0/F4's comment strip runs before every marker search, so a tier
   name in a comment cannot create a false slice. `before: '}'` is still safe on both sides: with
   comments stripped, a tier body holds only `rgba()` parens and one `[…]` tuple.
2. **The tuple reader on a malformed gradient.** Malformed → throws → PARSE-FAILED (correct).
   Truncation is the one silent shape — LOW above.
3. **`GLASS_TIER[scheme]` when `scheme` is anything but `'dark'`.** Loud by construction, no runtime
   default to mask a missing tier. `palette.ts:186` is `export const scheme = 'dark' satisfies
   ColorScheme`, so the literal type survives; `GLASS_TIER` is `satisfies Record<ColorScheme,
   Record<GlassVariant, GlassTier>>`, so both halves and all six tiers must exist or it does not
   compile. The only two consumers are `glass-tokens.ts:62` and `header-chrome.ts:63`, both
   `GLASS_TIER[scheme]` — no consumer indexes with a runtime string, and there is no `??`, no
   `catch` and no default anywhere on the tier path. Flipping the switch renders the light half; it
   cannot render `undefined`.
4. **Do the derived legacy `GLASS` keys follow a tier change, or stale?** They follow, and it is
   pinned. `gradientCard` / `gradientCardDiag` / `gradientPanel` / `borderSoft` / `borderAccent` are
   template literals off `tier.*` (`glass-tokens.ts:70-92`), so staleness is impossible while the
   derivation stands — and `glass-tokens.test.ts:278-292` pins the RELATION (not just the bytes),
   which is what catches a key severed back to a literal; the author records that severing is
   invisible to the byte-exact pin (their probe P4b, SURVIVED). The module-cycle hazard is closed
   structurally: `glass-tiers.ts` takes only `import type` from `palette`, so the
   `linear-gradient(180deg,undefined,undefined)` init-order failure its docblock names cannot occur.
5. **The four BANNED rewrites — is an old value now unbanned by accident?** Measured: the three
   composed old gradients and `1px solid rgba(43,140,193,0.3)` have **zero** occurrences under
   `ui/`, so nothing is live-and-unguarded today. My W0 generalization ("append the old value to
   RETIRED") is **refuted on the merits** by u1.1 report R-4, and I accept it: `RETIRED` is typed
   and documented for HEXES, and more decisively the bare triples `rgba(19,34,54,*)` /
   `rgba(26,45,68,*)` are still live at eight files (I counted 7 non-test occurrences at the current
   head), so a RETIRED entry would redden immediately and drag U1.3/U1.4/U5.1's sweeps into U1.1.
   Their successor note names the right rule — the package that removes the LAST occurrence adds the
   entry — with per-package owners. No finding.
6. **`header-chrome.ts` fallbacks.** None to flag. Three fragments, all pure derivations off
   `GLASS_TIER[scheme].header`, no default, no optional chain, no catch. Its test's `gradient()`
   helper (`header-chrome.test.tsx:40-44`) `throw`s rather than returning null, explicitly so a
   fragment that stopped being a two-stop gradient "must fail loudly, not compare against
   `undefined` and pass" — that is the right shape and the `?? ''` beside it is unreachable as a
   silent path.
7. **Any `catch` / default masking a missing tier.** None. The whole W1 diff adds no `try`/`catch`,
   no `void`, no un-awaited promise, no `Promise.all` and no `??` on a production path.

**The demo's standing honesty machinery is untouched.** No `FallbackMode` variant, notice switch,
`isSample` badge, geocode/extract breadcrumb, import generation token or `data-map-fallback`
placeholder is added, removed or reworded; the ~14 screen files in the diff take tier fragments in
place of hand-rolled gradients and nothing else. No `console.warn` / `console.error` was removed.
Deferral ledger checked: §15, §18 and §28 remain untouched by this diff — no Trigger has lapsed.

Disclosed items I did NOT re-file, having judged them: u1.1 D-1 (`flattenOver` per-fold rounding,
0.32 ΔE — the U0.5 author flagged the same seam as their own likely defect and the margin is
recorded per row), D-2 (the whitespace-blind BANNED scan — **already fixed** in W0/F3 `696f3bb`,
which this branch merges at `b56b358`; the comment at `glass-tokens.test.ts:96-101` describing it as
open is now stale, which is a prose matter for the aggregator), D-3 (`innerShadow`'s single gate —
disclosed with an owner and a stated consequence, and my HIGH #2's fix would make that exclusion a
name rather than a number, which strengthens it).

---

## Silent Failure Hunter Summary
CRITICAL: 0 · HIGH: 2 · MEDIUM: 0 · LOW: 1
Verdict: **REVISE**

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 2 |
| MEDIUM | 0 |
| LOW | 1 |

Fallback honesty (every substitution announced): **n/a** — no fallback or notice surface touched.
Failure-cause distinctions preserved: **yes** — PARSE-FAILED still carries its reason per row, and
the tier rows add a positive `toMatch(/^rgba\(/)` check so a blind reader cannot pass as a value.
Partial results flagged (not silently short): **NO — this is the wave's finding.** The tier anchor
table can be shortened to green by editing two numbers (probed, SURVIVED), and a stuck reader is
invisible to the standalone entry point (probed, SURVIVED).
Async cancellation / stale-write safety: **n/a** — no async, no store writes in this diff.
Operator breadcrumbs intact: **yes** — none removed.
Probes: 3 run — 1 KILLED (the negative control), **2 SURVIVED**, restores proven byte-identical.
Teardown verified: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 → 240 · exit 0.

Out-of-lane observations:
- Both HIGHs share one root the aggregator may want to state once: `checkParity()` returns only
  `drift` and `parseFailed`, so every OTHER property of the table — that both halves were read from
  their own half, that the key lists still match the modules they mirror — lives in the vitest file
  and is invisible to the standalone. Both fixes land in the same six lines of `checkParity()`.
- Still standing from W0 r1: no CI, and no `package.json` script invoking the guard. The PR body
  quotes the standalone command as verification evidence, which makes HIGH #1's blind-green
  behaviour the more consequential of the two.
- `glass-tokens.test.ts:96-101` documents W0's whitespace limit as unfixed; it was fixed in `696f3bb`
  and merged into this branch. Stale comment, not a defect.
- No foreign content was found in my lane file, and I wrote no other path.
