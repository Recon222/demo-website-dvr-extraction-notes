# Lane: tests — Wave 1 (U1.1-U1.4), PR #41

## Round 2 (fix delta — rider round)

Head `d91ab76` · diff `044578a..d91ab76` · authority: the **W1 rider round** mapping comment on
PR #41. Warm, scoped: I judged only the three items I was given.
Probes in my own worktree `worktrees/probe-w1d2-tests` cut from `d91ab76`; the previous round's
`probe-w1d-tests` was already gone (`git worktree list` clean, nothing on disk — the r1 teardown
had completed), so there was nothing to clean first. Torn down with the script:
*`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*.
**Provenance: the canonical source at `d91ab76`.** Motion mode: default, motion-ON.

Baseline before any mutation: the three suites **46 passed**, exit 0; full suite **3576 passed |
10 todo**, cold `tsc` exit 0, drift-guard CLI exit 0 (115/115).

### Per-item status

| Item | Status | Proof |
|---|---|---|
| **F23** (`69dbd34`) — my r1 finding | **FIXED**, and generalised past what I asked for | E1, E2, E3 KILLED · E4 false-red control clean |
| Ruling re-cut pins (`7a0c505`) | **SOUND** — per-side, no tautology | P1 KILLED (shape pin *and* negative control) |
| `vitest.setup.ts` guard (`7fc126b`) | **SOUND** — fires, correctly scoped, transitively covers all four fixes | G2, G3, G4b |

```
PROBE E1 — F23: the SHADOW_CARD case my r1 probe D recorded SURVIVED
Target:      features/demo/ui/glass-tokens.ts — shadowCard: SHADOW_CARD[scheme] -> SHADOW_CARD.dark
Claimed pin: glass-tokens.test.ts:274 — "no production module hard-codes a scheme half"
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed        [r1: SURVIVED, 45 passed]
Provenance:  canonical source at d91ab76.  Restore: verified byte-identical.

PROBE E2 — F23: the bracket form my r1 probe D2 recorded SURVIVED
Mutation:    header-chrome.ts:63  GLASS_TIER[scheme].header -> GLASS_TIER['dark'].header
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed        [r1: SURVIVED, 7 passed]

PROBE E3 — F23: the destructure form, which I did NOT ask for
Mutation:    const { dark: half } = GLASS_TIER; const header = half.header
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed
  The fix went past my prescription. I asked for `SHADOW_CARD` added to the alternation and
  the bracket spelling allowed; the shipped `SCHEME_HALF` is a two-form array with the
  identifier as a WILDCARD (`[A-Za-z_$][\w$]*`), so the roster is deleted entirely and the only
  exemption is the FILE (`SCHEME_DECLARERS`). That is strictly better: a fourth two-half record
  needs no edit here at all, which is the class of gap my finding was.

PROBE E4 — the false-red question, deliberately adversarial
Mutation:    header-chrome.ts given, in one file: a LINE comment naming `GLASS_TIER.dark` and
             `palette.light`, a BLOCK comment naming `SHADOW_CARD.dark`, and a real
             `const _t: typeof palette.dark.primary = colors.primary` type position
Result:      NO RED (exit 0) — Tests 7 passed
  `stripComments` (`:99`) removes block and line comments before matching, and the `typeof`
  lookbehind survives the widening to a wildcard identifier. Zero false reds confirmed against
  the three shapes most likely to produce one, not merely against the current clean tree.
Restore:     verified byte-identical after each of E1-E4.

PROBE P1 — the re-cut pins: reintroduce a shorthand into the ruled fragment
Target:      features/demo/ui/glass-tokens.ts — `border: 1px solid ${tier.card.border}` added
             back to `glassCard`
Result:      KILLED (exit 1) — Tests 2 failed | 25 passed
  × carries NO border shorthand key — the ruled fragment shape
  × NEGATIVE CONTROL — a `border` override now loses it on FIRST paint too, not on the second
  BOTH firing is the point: the negative control's claim is "with no shorthand in the fragment
  there is nothing for `border` to agree with, so it is wrong immediately". Reintroducing a
  shorthand flips exactly that cell, so the control is load-bearing rather than decorative.
Provenance:  canonical source.  Restore: verified byte-identical.
```

**Re-cut pins — tautology check: clean, and per-side as asked.** p1, p2/p3 and the self-heal cell
assert only `borderTopColor` / `borderRightColor` / `borderLeftColor`; `borderColor` appears
nowhere as an assertion target, only as a *negative control's* input. Constants still come from a
different module than the subject (`HIGHLIGHT = normColor(tier.card.highlightTop)`,
`SIDE_BORDER = normColor(tier.card.border)`, `glass-card-recipe.test.tsx:90-91`). The self-heal
cell is the strongest of the three and is not a restatement of the code: it asserts that on the
collapse render `borderLeftColor` returns to `SIDE_BORDER` — the fragment's own tint — rather than
to `''`, which is a claim about jsdom/React behaviour that the old fragment shape provably failed.

### The `vitest.setup.ts` guard — the three questions asked

**Does it fire on a shorthand-after-spread consumer? YES, on the shape that actually ships.**

```
PROBE G3 — revert the root fix the guard was built to catch
Target:      features/demo/ui/screens/_shared.tsx:270 — Field's error border
Mutation:    { ...fieldInput, border: '1px solid #ff4757' }  ->  { ...fieldInput, borderColor: '#ff4757' }
             (i.e. the pre-fix code: a longhand layered over the base's shorthand, removed when
             `error` clears, with the base's `border` never reasserting)
Result:      KILLED (exit 1) — Test Files 5 failed | 156 passed · Tests 8 failed | 2027 passed
  Error: React reported a conflicting style shorthand/longhand update. …
  EIGHT tests across FIVE files, none of them written for this defect. That is the guard working
  as a repo-wide tripwire: the existing consumer suites became detectors without a line of new
  test code.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE G4/G4b — the fourth fix, the padding one (a different property family)
Target:      features/demo/ui/screens/CompletionScreen.tsx:72
Mutation:    padding: '60px 16px 16px'  ->  padding: 16, …, paddingTop: 60
Result (scoped to hardwareFinale.test.tsx, which clicks "Review / Export again"): SURVIVED, 12 passed
Result (scoped to features/demo/ui):                                              KILLED (exit 1), 4 tests
  MY SCOPING ERROR, recorded rather than buried — the same mistake I made at r1 and it is worth
  naming twice: the transition that reuses the node is exercised in a different file than the one
  whose title matches the feature. The fix IS covered. Scope wide, or find the transition first.
Restore:     verified byte-identical.
```

**Is it scoped so a legitimate `console.error` still surfaces? YES.**

```
PROBE G2 — two ordinary console.error calls in a scratch test
Result:      NO FAILURE (exit 0) — Tests 2 passed
  The wrapper matches the single regex /conflicting property/ and calls `realConsoleError(...args)`
  UNCONDITIONALLY, so every other error still prints and none of them fails a test. The docblock's
  claim that a blanket "fail on any console.error" would be "a permanent source of unrelated red"
  is correct, and the narrow form is what shipped.
Scratch test written inside the probe worktree only, deleted afterwards; tree verified clean.
```

**Did it add the four fixes' pins? NO — and it did not need to, with one caveat worth stating.**
No dedicated regression test names any of the four defects (`git diff --name-only` on the round
touches only `glass-card-recipe.test.tsx`, `glass-tokens.test.ts` and `vitest.setup.ts`). All four
are covered **transitively**: probes G3 and G4b show existing consumer suites red on revert.
The caveat is the dependency that creates — **the tripwire is now the sole guard for all four
root fixes**, so weakening or removing it silently un-pins every one of them. That is a reasonable
trade (four dedicated pins would not have caught the fifth, sixth and seventh instances of this
class, and the tripwire does), but it should be an explicit, recorded property of the guard rather
than an accident, and the setup docblock does not currently say it.

**One boundary I verified and it is documented correctly.** My first synthetic attempt — adding a
`borderColor` shorthand on an update while the longhands stayed unchanged — did NOT trip the guard,
because React only warns when a shorthand and a conflicting longhand are *both* in the same style
update. That is precisely the split the setup docblock already claims (*"React is silent on the two
cells that are wrong on FIRST paint, and those pins are silent on nothing. Each covers what the
other cannot"*), and `glass-card-recipe.test.tsx`'s two negative controls are what cover it. The
complement claim is accurate, not aspirational.

---

## [LOW] The repo-wide guard's message is W1-specific, so a non-border trip mis-directs the reader

**File:** `vitest.setup.ts:66-72`

The guard is repo-wide and, as probe G4b shows, genuinely fires on a **padding** collision. Its
message says *"A style object wrote a border SHORTHAND over a longhand the fragment sets … Re-tint
with colour LONGHANDS only — see the fragment docblocks in features/demo/ui/glass-tokens.ts."* A
developer who trips it on `padding`/`paddingTop` is told to re-tint a border and sent to the glass
tokens. React's own message is appended via `${seen}` and does name the real property, so the
information is present — but the lead sentence is wrong for every non-border member of the class,
and this guard will outlive W1.

**Fix.** Make the lead sentence property-agnostic and keep the border case as the example: *"A style
object wrote a SHORTHAND over a conflicting longhand on an update; the painted result is wrong from
this render on. Re-declare the whole shorthand in both branches, or use longhands only — see
`partner-lit-edge-ruling.md` §4.3."* One string.

---

## Round 2 summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 1 (new)
**F23 FIXED** (and generalised) · re-cut pins **SOUND** · setup guard **SOUND**.
Verdict: **APPROVE with comments**

Probes run: **9** · Killed: **7** · Survived: **1** (G4, my own scoping error — the wide-scope
re-run G4b KILLED it) · Non-firing-by-design: **1** (G2, the scope control).
Restores: all verified byte-identical; final `git status --porcelain` = 0 and
`git diff d91ab76` = **0 lines**. Regression sweep at the same head: suite **3576 passed | 10
todo** exit 0, cold `tsc` exit 0, drift-guard CLI exit 0. **No fix-introduced regressions.**
Teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0; branch deleted.

Worth carrying forward: **F23 is the third consecutive fix in this campaign that shipped stronger
than the finding asked for** (after F18's `SCHEME_DECLARERS` and F16's derived part set). My r1
fix text proposed adding one name to a roster; the implementers deleted the roster. The pattern is
consistent enough to be worth the aggregator noting — the fixing seats are reading past the
finding to the defect class behind it.

Out-of-lane observations: none.

---

## Round 1 (fix delta)

Head `044578a` · fix diff `fc75577..044578a` · authority: the **W1 review round 1** fix-mapping
comment on PR #41 (read; it covers F14-F22). Warm seat — I read only the fix commits on my
surfaces plus what those lines now depend on.

**Worktree note.** The shared tree `w1-wave` has since advanced to `1b4ac86`, so every read and
every probe below was taken **by SHA** in my own worktree `worktrees/probe-w1d-tests` at
`044578a` — the head I was asked to judge — not from the shared tree's working copy. That probe
worktree survived the previous session's cutoff intact (clean, deps installed, correct SHA), so it
was reused rather than re-cut; `git worktree list` showed no half-cut sibling to remove. Torn down
with the script: *`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*.
**Provenance for every probe: the canonical source at `044578a`.** Motion mode: default, motion-ON;
nothing probed here is motion-gated.

### Fix-delta baseline (my worktree, before any mutation)

| Gate | Exit | Result |
|---|---|---|
| Guard, in-process | — | **115 anchors / drift 0 / parseFailed 0 / stuck 0** (`stuck` is F17's new return) |
| Four W1 suites | **0** | **63 passed**, 0 skipped (`rnAvailable()` true — the guard RAN) |
| `pnpm test --silent` | **0** | **3575 passed \| 10 todo (3585)** |
| cold `tsc --noEmit` | **0** | — |
| `node .design-sync/check-rn-parity.mjs` | **0** | — |

### Per-finding status

| F-ID | Finding | Status | Proof |
|---|---|---|---|
| F18 | MEDIUM/TRIGGER-LAPSED — `GLASS_TIER.dark` invisible (**mine**) | **FIXED** | probes A-i, A-ii, A-iii KILLED |
| F16 | MEDIUM — hand-typed tier totals (**mine**) | **FIXED** | probes B-a/b/c KILLED, phone PRESENT **and** ABSENT |
| F17 | MEDIUM — stuck reader invisible to the CLI (checked from the tests angle) | **FIXED** | probe C KILLED at the CLI *and* in vitest |
| F14 | HIGH — lit-edge escape hatch (tautology check requested) | **SOUND** | no tautology; see below |
| F19 | MEDIUM — `SHADOW_CARD`; Q7 recorded SURVIVED "covered by F18's scan" | **PARTIAL** | probe D **SURVIVED** — the claim does not hold |

**0 UNFIXED.** One PARTIAL (F19's coverage claim), which is the single new finding.

```
PROBE A-i — F18: a tier consumer hard-codes the dark half
Target:      features/demo/ui/controls/header-chrome.ts:63
Claimed pin: glass-tokens.test.ts:248 — "no production module hard-codes a scheme half (§9 clause 12)"
Mutation:    GLASS_TIER[scheme].header  ->  GLASS_TIER.dark.header   (identical to my r1 probe A1)
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed   [round 1: SURVIVED, exit 0]
Provenance:  canonical source at 044578a.  Restore: verified byte-identical.

PROBE A-ii — F18: the OTHER touch-point, the one my own prescription would have missed
Target:      features/demo/ui/glass-tokens.ts:62
Mutation:    const tier = GLASS_TIER[scheme]  ->  GLASS_TIER.dark
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed   [round 1: SURVIVED]
  CREDIT WHERE IT IS DUE: my r1 fix text said to reuse `sourceFiles(UI_ROOT)` as-is. That helper
  skips TOKEN_MODULES, which contains glass-tokens.ts — i.e. MY prescribed fix would have left
  half the live exposure uncovered while reporting green. The implementer caught that and shipped
  `sourceFiles(dir, skip)` with a separate SCHEME_DECLARERS set (glass-tokens.test.ts:62-70),
  whose docblock names the distinction: "may hold a raw literal" and "may name a scheme half" are
  different permissions. Better than the fix I asked for, and this probe is the proof.

PROBE A-iii — F18: does the `typeof` carve-out let a REAL access through?
Target:      the lookbehind in SCHEME_HALF, glass-tokens.test.ts:113
Mutation:    const header = (typeof palette.dark === 'object' ? GLASS_TIER.dark : GLASS_TIER.light).header
             — a genuine value access sharing a line with a legitimate `typeof` type position
Result:      KILLED (exit 1) — Tests 1 failed | 6 passed
  The lookbehind is adjacency-scoped, so it exempts only the token it directly precedes. The
  carve-out F15 requires (`satisfies typeof palette.dark.primaryDark`) does not widen into a hole.
  Restore: verified byte-identical.

PROBE B-a/b/c — F16: tier membership, run under BOTH environments
Claimed pin: rn-token-parity.test.ts:107 — "anchors exactly the six glass tiers and every part of one"
  (a) a 7th tier `well` added to GLASS_TIER.dark
  (b) a 5th part `outerGlow` added to GLASS_TIER.dark.card   (the part I never probed at r1)
  (c) 'recessed' dropped from TIER_KEYS — the "shrink to reach green" shape
Result, phone repo PRESENT:  ALL THREE KILLED (exit 1) — each `Tests 1 failed | 17 passed`
Result, phone repo ABSENT:   ALL THREE KILLED (exit 1) — each `Tests 1 failed | 9 passed | 8 skipped`
  CONTROL for the absent arm (environment only, no code mutation): exit 0,
  `Tests 10 passed | 8 skipped` — the pin RUNS and the eight phone-reading cases skip.
  Environment simulated in my probe copy alone by repointing RN at NO_SUCH_PHONE_REPO;
  `rnAvailable()` printed false to confirm it took effect. Declared as an environment
  simulation, not a code mutation.
  The carry 044578a moved these pins into the ungated `local invariants` describe (W0/F11's
  block) — correct: both sides are local, so gating them on the sibling repo was the same defect
  F11 fixed for the palette list.
  BETTER THAN I ASKED FOR: my r1 fix text proposed pinning TIER_PARTS against a hard-coded
  four-name list. The shipped form derives the field set from Object.keys(GLASS_TIER.dark.card)
  and forces every part to be either anchored or named in UNANCHORED = ['innerShadow']
  (:118-128). My version would NOT have caught probe (b); theirs does.
Provenance:  canonical source.  Restore: verified byte-identical after each of the six runs.

PROBE C — F17: a light reader stuck on the dark block, from the tests angle
Target:      .design-sync/check-rn-parity.mjs:253 — webTierScope's scheme marker pinned to 'dark: {'
Result:      KILLED — drift 24, parseFailed 0, **stuck 24**; CLI exit 1; vitest exit 1 (3 failed | 15 passed)
  The r1-era hole was that this shape kept `drift` empty and the CLI printed "✓ 115 rows match"
  and exited 0. `stuck` is now computed inside checkParity(), returned beside drift/parseFailed,
  asserted in the suite (rn-token-parity.test.ts:249,276) AND gated at the CLI
  (:543 `if (drift.length || stuck.length) process.exit(1)`). Both surfaces fail. The docblock at
  :272-274 also answers the obvious objection — what stops an empty `stuck` meaning "nothing was
  examined" — by pointing at the both-halves pins that guarantee every key has a pair to compare.
Provenance:  canonical source.  Restore: verified byte-identical.
```

**F14 — tautology check: clean, and better constructed than most pins in this campaign.** The five
new cases render and, critically, **re-render** (`rerender` on the UPDATE path, which is where the
two rejected forms fail and where a first-paint-only pin would have passed). Their constants come
from a different module than the subject — `HIGHLIGHT = normColor(tier.card.highlightTop)` and
`SIDE_BORDER = normColor(tier.card.border)` (`glass-card-recipe.test.tsx:90-91`), composed from
`GLASS_TIER`, never retyped. Two of the five are explicit **NEGATIVE CONTROLS** asserting that the
shorthand-then-longhand spread loses the edge on first paint, and that the lift-the-edge-out form
loses it on update. A pin that proves the rejected alternatives actually fail is the strongest
available answer to "is this a tautology"; it is not one.

---

### New finding

## [MEDIUM] F18's scheme-half needle names two of the demo's three two-half records, so F19's own new `SHADOW_CARD` walks past the scan the mapping says covers it

**File:** `features/demo/ui/__tests__/glass-tokens.test.ts:113` — `SCHEME_HALF`
**Mapping claim under review:** F19's row — *"probe Q7 (severed derivation) recorded
SURVIVED-bounded → covered by F18's scan"*

**Issue.** The needle is

```
/(?<!\btypeof\s+)\b(?:GLASS_TIER|palette)\s*\.\s*(?:dark|light)\b/
```

Two hard-coded names, and one syntax form. F19 created a **third** `{ light, dark }` record in this
same fix round — `SHADOW_CARD` (`glass-tokens.ts:103`), consumed as `SHADOW_CARD[scheme]` at
`:155` — and did not add it to the alternation. So the scan that F19's row cites as its coverage
cannot see the exact mutation Q7 recorded. Folded into one finding per the completeness sweep,
because both touch-points are the same hard-coded set on the same line: the alternation misses a
NAME, and the character class misses a SPELLING.

**Evidence — SURVIVED probes:**

```
PROBE D — the Q7 coverage claim: sever the SHADOW_CARD derivation
Target:      features/demo/ui/glass-tokens.ts:155
Claimed pin: glass-tokens.test.ts:248 (per the PR #41 mapping's F19 row)
Mutation:    shadowCard: SHADOW_CARD[scheme]  ->  SHADOW_CARD.dark
Result:      SURVIVED (exit 0) — Tests 45 passed
             (glass-tokens + glass-card-recipe + header-chrome, all green)
  Path the input actually took: SCHEME_HALF's alternation is `GLASS_TIER|palette`. `SHADOW_CARD`
  is neither, so `.test(src)` is false and no offender row is produced. Q7 is NOT covered.
Provenance:  canonical source at 044578a.  Restore: verified byte-identical.

PROBE D2 — the same needle, second touch-point: bracket access
Target:      features/demo/ui/controls/header-chrome.ts:63
Mutation:    GLASS_TIER[scheme].header  ->  GLASS_TIER['dark'].header
Result:      SURVIVED (exit 0) — Tests 7 passed
  The needle matches dot access only. Contrast probe A-i, the dot form of the same edit, KILLED.
Provenance:  canonical source.  Restore: verified byte-identical.
```

**Why MEDIUM, and honestly bounded.** Nothing renders wrong today; as with the original F18, the
cost lands on the light-flip at U8 exit (plan §9 clause 12), which is scheduled and attended. Two
things keep it above LOW: the mapping comment **asserts** Q7 is covered, so a reader has been told
a case is guarded that is not — the same false-assurance shape as the r1 `header-chrome.test.tsx:24`
docblock — and F19 is the round that both created `SHADOW_CARD` and claimed the coverage, so the
gap was introduced and blessed in one step.

Bounding the second touch-point honestly: `GLASS_TIER['dark']` / `palette['dark']` appear **nowhere**
in `features/`, `app/` or `lib/` (grepped at `044578a`), and no `dot-notation` lint rule is
configured to force the dot form — so the bracket spelling is unused and non-idiomatic here, not
imminent. It costs one character class to close alongside the real half of this finding, which is
why it is folded in rather than filed separately or dropped.

**Fix.** One line. Add the missing name, and the bracket spelling while the line is open:

```ts
const SCHEME_HALF =
  /(?<!\btypeof\s+)\b(?:GLASS_TIER|palette|SHADOW_CARD)\s*(?:\.\s*|\[\s*['"])(?:dark|light)\b/
```

The durable version is to derive the alternation from a named list of the demo's two-half records,
so the next one is a one-line append rather than a silent gap — the same shape `TOKEN_MODULES` and
`SCHEME_DECLARERS` already use in this file, and the same lesson F16 just applied to `TIER_KEYS`.
Either way, add a line to `SHADOW_CARD`'s docblock pointing at the scan, so the coverage claim
becomes true where it is written.

---

## Round 1 summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 (new) · LOW: 0
F18 **FIXED** · F16 **FIXED** · F17 **FIXED** · F14 **SOUND** · F19 **PARTIAL** (the fix itself
landed; its coverage claim did not).
Verdict: **APPROVE with comments**

Probes run: **12** · Killed: **10** · **Survived: 2** (D, D2 — one finding, two touch-points).
Restores: all 12 verified byte-identical; final `git status --porcelain` = 0 and
`git diff 044578a` = **0 lines**. Regression sweep at the same head: suite **3575 passed | 10 todo**
exit 0, cold `tsc` exit 0, drift-guard CLI exit 0. **No fix-introduced regressions.**
Teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0; branch deleted.

Worth carrying forward, in the fixers' favour: **F18 and F16 each shipped a strictly better fix than
the one my r1 findings prescribed** — mine would have left `glass-tokens.ts` unscanned (wrong skip
set) and would not have caught a fifth tier part. Probes A-ii and B-b are the evidence.

Out-of-lane observations: none.

---

# Lane: tests — Wave 1, PR #40 @ 28e7993 — round 0 (superseded above)

Mode: code review. Base `feat/uiparity-u0` @ `15e5a6f`. Read tree: `worktrees/w1-wave` (read-only).
All probes in my own worktree `worktrees/probe-w1-tests` cut from `28e7993`, torn down with the
script: *`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*.

**Provenance for every probe: the canonical source in that worktree at `28e7993`.** No mirrored
copies exist for any file touched. Motion mode: the three probes that render (A1, RV2, and the
`header-chrome` consumer suite in the baseline) ran under the suite default, **motion-ON**
(`vitest.setup.ts`'s `matchMedia` stub is hard-coded `matches: false`); nothing in this wave is
gated on `useReducedMotion`, so both modes take the same path.

## Baseline (my worktree, before any mutation)

| Gate | Exit | Result |
|---|---|---|
| Guard, in-process | — | **115 anchors / drift 0 / parseFailed 0** (32 palette x2 + 24 tier x2 + 3 = 115 ✓) |
| Six W1 suites | **0** | **62 passed \| 10 todo (72)**, **0 skipped** — `rnAvailable()` true, the guard RAN |
| `pnpm test --silent` | **0** | **272 files / 3562 passed \| 10 todo (3572)** |
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | cold |

The `it.todo` count moved **15 -> 10**: rows 4-5, 8, 10, 31 and 33 un-todo'd, exactly the five
U1.1's row promised. No previously-live assertion was weakened — row 8 was in fact **strengthened**,
from the phone's rounded compare to an unrounded `toBeGreaterThanOrEqual` (`palette-contrast.test.ts:449-450`),
which refuses a real drop that rounding 3.7949 -> 3.79 would have accepted. The rows 22-25 todo
title narrowed from "U1.1 + U3.1" to "U3.1"; that is a scope correction (its remaining blocker is
`warningAccent` alone), not a relaxation.

## The un-todo'd contrast rows — pinned AT the constant, and they have teeth

Every new row composes its subject from `GLASS_TIER[...]` / `palette[...]`; nothing is retyped.
I probed the three that carry the contract, at the production values rather than at the test:

```
PROBE D2 — row 33 lower bound, ONE stop only (the "PER STOP, never Math.max" claim)
Target:      features/demo/ui/tokens/glass-tiers.ts:176 — dark recessed gradient[0]
Claimed pin: palette-contrast.test.ts:481 — "keeps the recessed well a well"
Mutation:    'rgba(0,24,50,0.6)' -> 'rgba(0,40,83,0.6)'   (stop 0 only, flattened onto its sheet)
Result:      KILLED (exit 1) — Tests 1 failed | 8 passed | 10 todo (19)
  AssertionError: expected [ Array(1) ] to deeply equal []   + "dE": 0, + "stop": 0
  THE POINT: the failure names `stop: 0` while stop 1 stays healthy. A `Math.max` across stops —
  the shape the phone shipped once — would have SURVIVED this exactly. The per-stop claim is real.
Scope note: glass-tiers.test.ts and the drift guard also red on this mutation; I scoped the run to
  palette-contrast.test.ts to isolate row 33's own verdict.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D2b — row 33 UPPER bound (the two-sidedness)
Mutation:    dark recessed gradient[0] -> 'rgba(6,12,22,1)'  (the near-black the phone retired)
Result:      KILLED (exit 1) — + "dE": 27.77, + "stop": 0
  Both sides of `dE < 3 || dE > 12` fire. Two-sided, confirmed, not asserted.

PROBE D3 — row 31, the nested tier's separability
Target:      glass-tiers.ts:140 — dark nestedCard.border
Mutation:    'rgba(43,140,193,0.45)' -> 'rgba(28,78,132,0.5)'  (i.e. back to the CARD's hairline,
             which is the flat tier that shipped across 30 phone call sites)
Result:      KILLED (exit 1) — AssertionError: expected [ { scheme: 'dark', ratio: 1.12 } ] to deeply equal []
  1.12 against the 1.25 bound. The border channel is the one that carries the tier in dark, and it
  is genuinely measured.

PROBE D4 — row 10, the accent-as-text token (DEF-UI-018)
Target:      features/demo/ui/tokens/palette.ts:94 — dark link
Mutation:    '#b8d4f0' -> '#2B8CC1'   (back to `primary`, the mid-tone FILL the phone moved off)
Result:      KILLED (exit 1) — AssertionError: expected [ { name: 'dark link', ratio: 2.83 } ] to deeply equal []
  2.83 against AA 4.5 — the defect this row exists for, reproduced from the shipped grounds.
```

**The W0/F6 opaque-bottom guard is load-bearing here and holds.** `LIGHT_GROUNDS`
(`palette-contrast.test.ts:213-219`) passes `stops(GLASS_TIER.light.card)` with **no** `under`, so
those stacks bottom out on the tier's own stop — legal only because light's `card` and `sheet` stops
are alpha `1`. `light.recessed` is translucent (`0.45`/`0.35`) and is correctly given
`[GLASS_TIER.light.sheet.gradient[0]]` as its opaque floor. That interlock is exactly what F6's
throw exists to enforce, and this wave is its first real consumer.

## Re-verification of claimed kills, and U1.2's fixed tautology

```
PROBE P13r — U1.2's fixed tautology: A33's swap undone
Target:      glass-tiers.ts:139 — dark nestedCard.gradient, transposed into the CARD's order
Result (first run, scoped to glass-card-recipe.test.tsx alone): SURVIVED (exit 0), 20 passed
Result (correct scope): KILLED (exit 1), THREE independent failures —
  1. glass-tiers.test.ts "makes dark `nestedCard` the SWAP of `card`'s stops (A33)"
  2. glass-tiers.test.ts's 48-value byte-exact pin
  3. the drift guard: nestedCard.gradientTop.dark AND nestedCard.gradientBot.dark, named
     SEPARATELY — which is the payoff of splitting the two stops into two anchor keys.
MY ERROR, recorded rather than buried: the first run was mis-scoped by me. `glass-card-recipe.test.tsx`
  composes its expectation from `GLASS_TIER`, so it CANNOT see a mutation to `GLASS_TIER` itself —
  and that is correct layering, not a tautology. The three gates split cleanly:
    fragment-vs-tier   -> glass-card-recipe.test.tsx  (catches re-pointing a fragment)
    tier-vs-literal    -> glass-tiers.test.ts         (catches editing a tier value)
    tier-vs-phone      -> the drift guard             (catches phone-side drift)
  U1.2's fix (composing from a second module) is real; it closes the first row, and the other two
  rows were always covered elsewhere.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE RV1 — a derived composite re-pointed at the wrong tier (U1.1's derivation claim)
Target:      features/demo/ui/glass-tokens.ts:77 — GLASS.gradientPanel
Mutation:    derive from tier.card instead of tier.elevated
Result:      KILLED (exit 1) — two failures: the byte-exact GLASS shape pin AND
             "keeps the four legacy composites DERIVED from GLASS_TIER (U1.1)"
  The derivation pin is cross-module and genuinely falsifiable.

PROBE RV2 — the header recipe sourced from the wrong tier (U1.4's central claim)
Target:      features/demo/ui/controls/header-chrome.ts:63
Mutation:    GLASS_TIER[scheme].header -> GLASS_TIER[scheme].card
Result:      KILLED (exit 1) — 4 failures, including
             expected '1px solid rgba(28,78,132,0.5)' to be '1px solid rgba(28,78,132,0.6)'
  The rendered-consumer loop and the fragment pins both fire.
```

The implementers' probe tables are trustworthy on everything I re-ran. U1.4's own disclosure of P10
as SURVIVED, with the fix written out, is exactly the behaviour the mutation skill asks for.

---

# Findings

## [MEDIUM · TRIGGER-LAPSED] `GLASS_TIER.dark` is invisible to every gate in the repo, and the deferral that suppressed it named a trigger that fired inside this same PR

**Files (two touch-points — completeness sweep):**
`features/demo/ui/controls/header-chrome.ts:63` · `features/demo/ui/glass-tokens.ts:62`
**Deferral:** U1.4 implementation report §6 **D-2** (proposed, not yet in `docs/code-reviews/deferred.md`)

**Issue.** Both tier consumers correctly write `GLASS_TIER[scheme]`. Nothing can tell if they stop.
While `scheme === 'dark'` the two expressions are the *same object*, so no behavioural pin can
distinguish them — and `tsconfig.json` sets no `noUnusedLocals`, so the orphaned `scheme` import
does not fail the cold typecheck either. Plan §9 clause 12 (*"flipping the consumed scheme is a
ONE-SITE change"*) is held today by a successor note and nothing else.

**Evidence — two SURVIVED probes:**

```
PROBE A1: header-chrome hard-codes the dark half
Target:      features/demo/ui/controls/header-chrome.ts:63
Claimed pin: header-chrome.test.tsx:24 — the docblock states, in as many words, that
             "reading `GLASS_TIER.dark` directly reddens the file"
Mutation:    const header = GLASS_TIER[scheme].header  ->  GLASS_TIER.dark.header
Result:      SURVIVED — vitest exit 0 (12 passed); cold tsc exit 0
  Path the input actually took: every expectation in that file composes its right-hand side from
  `GLASS_TIER[scheme].header`, and `scheme` IS `'dark'`, so both sides move together.
Provenance:  canonical source, probe worktree at 28e7993.  Restore: verified byte-identical.

PROBE A2: the sibling touch-point — glass-tokens hard-codes the dark half
Target:      features/demo/ui/glass-tokens.ts:62
Mutation:    const tier = GLASS_TIER[scheme]  ->  GLASS_TIER.dark
Result:      SURVIVED — exit 0, 28 passed across glass-tokens + glass-card-recipe + glass-tiers
  The "keeps the four legacy composites DERIVED from GLASS_TIER" pin composes from
  `GLASS_TIER[scheme]` too, so it is blind in the same way.
Provenance:  canonical source.  Restore: verified byte-identical.

CONTROL (all four clauses — shipped code, non-equivalent, covered, on an executed arm):
PROBE RV2 above, the wrong-TIER mutation on the same line, is KILLED with 4 failures.
  So `header-chrome.test.tsx:24`'s docblock is HALF TRUE: "sourcing a bar from `card`" is
  genuinely caught; "reading `GLASS_TIER.dark` directly" is not. A comment that tells the next
  reader a case is covered when it is not is worse than no comment.
```

**Why this is actionable NOW and not a deferral.** D-2's own Trigger reads: *"the next commit that
touches `glass-tokens.test.ts`'s scan block — U1.2's `BANNED` rewrite … If W1 closes without it,
U4.1 owns it."* That commit is **in this PR**: `74855c1` (U1.2) and `9c70828` (U1.3) both rewrote
that exact block, adding `'tokens/glass-tiers.ts'` to `TOKEN_MODULES` and fourteen entries to
`BANNED`. The condition the deferral named has occurred, which under the reviewer contract §4 is
the one mechanism that reopens a suppressed item. The deferral was also written before U1.2 merged,
so its author could not have known — this is a sequencing artifact, not a bad-faith deferral.

**Why MEDIUM and not HIGH.** Nothing renders wrong today; the values are identical by construction.
The cost lands on the light-flip at U8 exit, and plan §9 clause 12 does schedule a scratch-worktree
verification there, so the day it fires is not unattended. It is above LOW because there are two
live touch-points, every future tier consumer (U2.4, U4.1, U5.1) inherits the exposure with no
guard, and the test file actively asserts the opposite.

**Fix — the author's own four lines, already written and unchanged by me.** Add beside the existing
directory walk in `glass-tokens.test.ts` (which is where the repo's only source scanner lives, and
whose `sourceFiles` already skips the token modules — correct, since `glass-tiers.ts` declares both
halves and `palette-contrast.test.ts` legitimately reads both):

```ts
it('no consumer hard-codes a scheme half (§9 clause 12)', () => {
  const offenders = sourceFiles(UI_ROOT).filter((f) =>
    /GLASS_TIER\s*\.\s*(dark|light)/.test(readFileSync(f, 'utf8')),
  )
  expect(offenders).toEqual([])
})
```

Then correct `header-chrome.test.tsx:24`'s docblock to claim only what it delivers.

---

## [MEDIUM] Tier membership is pinned by hand-typed CARDINALITY, not against the module — the one protection the palette list was given at W0/F2

**Files:** `.design-sync/check-rn-parity.mjs:349-350` (`TIER_KEYS`, `TIER_PARTS`) ·
`features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:151-158`

**Issue.** The coordinator asked whether TIER membership is pinned like palette membership. It is
not. The palette got, at W0/F2:

```ts
expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(palette.dark).sort())   // :137-139
```

— a comparison against the module, which is what makes the loops around it non-tautological. The
tier list got three hand-typed counts instead: `.toBe(6)`, `.toBe(4)`, `.toBe(24)` (`:153-158`).
Those catch a *deletion* (I confirmed the mechanism is live — the identical W0 probe on
`PALETTE_KEYS` reds on length), but they cannot catch an *addition*, because nothing compares
`TIER_KEYS` to `Object.keys(GLASS_TIER.dark)`.

This is a straight inconsistency inside one commit: the same file's cardinality assertion two lines
above was deliberately made **derived** for exactly this reason, and says so —
*"W0/F2 removed the hand-typed `.toBe(15)`; the same reasoning removes U1.1's hand-typed `.toBe(81)`
— a literal total is exactly what lets someone shrink the table to reach green by editing one number
here."* The reasoning was applied to the total and not to the two lists that feed it.

**Evidence — SURVIVED probe:**

```
PROBE B: a seventh tier lands in GLASS_TIER, with its value pin updated
Target:      features/demo/ui/tokens/glass-tiers.ts — a `well` tier added to BOTH halves, plus
             `GlassVariant` (required: the module's `satisfies Record<ColorScheme, Record<GlassVariant,
             GlassTier>>` rejects an excess key), plus the matching block in glass-tiers.test.ts's
             48-value `toEqual`. ONE semantic mutation — "a package adds a tier" — spelled across the
             two files that a real such change must touch together.
Claimed pin: rn-token-parity.test.ts:151 — "pins all 24 glass-tier keys in BOTH halves"
Result:      SURVIVED (exit 0)
  standalone guard: anchors 115, drift 0, parseFailed 0  — UNCHANGED
  vitest: Tests 15 passed (15)
  The new tier's eight readable values are anchored against nothing, in either half, and every
  gate in the repo reports green. The equivalent palette mutation reds at rn-token-parity.test.ts:137.
Provenance:  canonical source, probe worktree at 28e7993.  Restore: verified byte-identical.
```

**Why MEDIUM, honestly bounded.** There is **no live gap**: all six tiers x four readable parts are
anchored today, and `innerShadow`'s exclusion is documented, justified (it is not a flat CSS value
on either side) and explicitly covered elsewhere — `glass-tiers.test.ts` is named in the guard's own
docblock as its only gate, which is the right disclosure. The trigger is a future tier addition, and
no package on the guard's published schedule adds one. What earns MEDIUM rather than LOW is that
the fix is one line, the precedent is in the same file, and the failure it would prevent is silent.

**Fix.** In `rn-token-parity.test.ts`, replace the three cardinality lines with the membership form
the palette already uses — the file imports from the token modules already:

```ts
expect([...TIER_KEYS].sort()).toEqual(Object.keys(GLASS_TIER.dark).sort())
expect([...TIER_PARTS].sort()).toEqual(['border', 'gradientBot', 'gradientTop', 'highlightTop'])
```

Keep a one-line note that `innerShadow` is absent from `TIER_PARTS` by design, so the second line
reads as the deliberate exclusion it is rather than as a stale list.

---

## Tests Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 2 · LOW: 0
Verdict: **APPROVE with comments**

Probes run: **10** (3 re-verifications of implementer claims, 7 of my own).
Killed: **7** · **Survived: 3** (A1, A2 — one finding, two touch-points; B) · Invalid: 0.
Restores: all 10 verified byte-identical; final `git diff 28e7993` = **0 lines**,
`git status --porcelain` = **0 lines**, `pnpm test --silent` re-green at **272 files / 3562 passed |
10 todo**, cold `tsc` exit 0. Teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 ->
240 · exit 0; `probe/w1-tests` deleted.

Rulings the coordinator asked for:
- **Un-todo'd rows 31/33 + light tier grounds — pinned AT the constant, two-sided per stop: YES.**
  Every subject reads `GLASS_TIER[...]`/`palette[...]`; nothing retyped. Row 33 proven two-sided
  (D2 at dE 0, D2b at dE 27.77) and proven PER STOP — the failure names `stop: 0` while stop 1 stays
  healthy, which a `Math.max` form could not do. Row 31 proven at 1.12 vs its 1.25 bound.
- **`TIER_ANCHOR_KEYS` membership: NOT pinned like the palette's.** Finding 2, probe B.
- **U1.4's P10 — is it a finding? YES, and specifically TRIGGER-LAPSED.** Finding 1, probes A1/A2,
  with RV2 as the control showing the docblock is half true.
- **U1.2's three tautologies: genuinely fixed.** P13r killed three ways once correctly scoped; my
  first, narrower scope was my own error and is recorded above rather than dressed up as a finding.
- **Were any reddened pins weakened? NO.** Row 8 was strengthened to an unrounded compare; the only
  other title change (rows 22-25) narrows a blocker list. Todo count 15 -> 10, matching exactly the
  five rows U1.1's row promised.

Behaviorally meaningful coverage: **strong**. This is the wave where the contrast contract stopped
being mostly `it.todo` and started measuring shipped values, and four independent probes at those
values were killed with the numbers the reports predicted. The three-layer split (fragment-vs-tier,
tier-vs-literal, tier-vs-phone) is sound and each layer is separately falsifiable.
Engine coverage gate (80% on lib/** + engine/**): **not applicable** — the diff touches 0 files
under `lib/**` or `features/demo/engine/**`.
Mock strategy: **at the IO edge** — no new module mocks; the render pins mount real components.
Setup-shim traps: **none** — `skipIf` resolved and ran (0 skipped) in every quoted run; no canvas /
mediaDevices / computed-style path touched. The one `getComputedStyle` call
(`header-chrome.test.tsx:158`) compares three rendered bars **to each other**, not to a stylesheet,
so `css: false` does not hollow it out.
Determinism: **yes** — no clock or entropy in any new test file.

Out-of-lane observations:
- `header-chrome.test.tsx:158` builds its set from `getComputedStyle(...).background` and guards the
  empty-string case at `:161` — correct, and worth keeping if that block is ever refactored, since
  three empty strings would otherwise collapse to a set of size 1 and pass.
