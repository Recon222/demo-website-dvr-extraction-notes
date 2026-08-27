# Lane: tests — Wave 0 (phase U0), PR #39 `feat/uiparity-u0` @ `7099e54`

Mode: code review. Base contract: `.claude/skills/fleet-orchestration/reviewer-contract.md`.
Read tree: `worktrees/u0-phase` (read-only). All probes in my own worktree
`worktrees/probe-w0-tests` cut from `7099e54`, torn down with `tools/worktree-remove.ps1`
(*`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*).

**Provenance for every probe below: the canonical source in my own probe worktree at `7099e54`.**
No mirrored copies exist for any file touched. Motion mode: not applicable — no probe rendered a
component, read an inline style or touched a transition-gated path; every subject is a pure
function, a source-text scan or a file parse. jsdom normalisation is therefore not in play for any
verdict here (the one jsdom-touching assertion, `scale.test.ts:63-65`, asserts *through* the helper
and is explicitly commented as doing so — that is the correct handling of the hazard, not a trap).

## Baseline (my worktree, before any mutation)

| Gate | Command | Exit | Result |
|---|---|---|---|
| Scoped | `pnpm exec vitest run` on the 5 changed test files | **0** | 5 files / **38 passed \| 15 todo (53)**, **0 skipped** |
| Suite | `pnpm test --silent` | **0** | **269 files / 3513 passed \| 15 todo (3528)** |
| Drift guard | `checkParity()` in-process | — | **33 anchors / drift 0 / parseFailed 0** |
| Coverage gate | `git diff master...HEAD --name-only -- lib/ features/demo/engine/` | — | **0 files** — the 80% gate's scope is untouched |

**The `skipIf` hazard is cleared, not assumed.** `rnAvailable()` returns `true` in a probe worktree
(`worktrees/<name>` sits the same two levels below the shared parent as the main checkout, so
`resolve(WEB,'..','..','extraction_case_notes_react_native_expo')` still lands). Printed
`RN_ROOT = D:\...\extraction_case_notes_react_native_expo`, `available=true`; the scoped run reports
**0 skipped** and the drift test's title prints the resolved root in every red I produced. Every
verdict I quote from `rn-token-parity.test.ts` is from a case that **ran**.

**Master's RED baseline is repaired.** The mutation skill records `master` @ 2026-08-26 as 265 files
/ 1 failed, the RN guard throwing at `check-rn-parity.mjs:75`. That failure is gone at `7099e54` and
the guard exits 0 with 33/33. U0.4 did what it claims.

## Re-verification of the authors' claimed kills

The U0.4 report discloses a probe runner that scored **seven false KILLs** on a Windows `pnpm` spawn
failure (R-8). I therefore re-ran a representative sample independently, from exit codes, with my own
runner. **All five reproduced, with the same failure text and the same measured numbers.**

```
RE-VERIFY 1 (their U0.5 probe 1) — CTA stop reverts to the retired accent
Target:      features/demo/ui/glass-tokens.ts:34 — ACCENT_FROM
Claimed pin: features/demo/ui/__tests__/palette-contrast.test.ts:297 — rows 12-13 dark
Mutation:    const ACCENT_FROM = '#1F6B99'  ->  '#35A0D6'
Result:      KILLED (exit 1) — Tests 1 failed | 3 passed | 15 todo (19)
  AssertionError: expected [ { name: 'dark upper', ratio: 2.94 } ] to deeply equal []
  (2.94 is the phone's own historical figure for this pairing — the claim checks out.)
Provenance:  canonical source, probe worktree.  Restore: git diff --stat empty.

RE-VERIFY 2 (their U0.5 probe 3) — the PRODUCTION compositor breaks
Target:      features/demo/ui/tokens/scale.ts:172 — mixOver's alpha term
Claimed pin: palette-contrast.test.ts:220 — the helper self-check
Mutation:    const a = top[3]  ->  const a = 1
Result:      KILLED (exit 1) — expected [255,255,255,1] to deeply equal [128,128,128,1]
  Confirms design decision 1: this file really does exercise U0.2's shipped flattenOver, and no
  live contrast row would catch it (all four are flat and opaque).
Provenance:  canonical source.  Restore: git diff --stat empty.

RE-VERIFY 3 (their U0.5 probe 4c) — flatten()'s reject-unparseable guard, bad layer BURIED
Target:      palette-contrast.test.ts:99 — stack.forEach(parse)
Mutation:    delete the line
Result:      KILLED (exit 1) — AssertionError: expected [Function] to throw an error
             at features/demo/ui/__tests__/palette-contrast.test.ts:257
  The position claim is real: the pin only has teeth because the bad layer is in the MIDDLE.
Provenance:  canonical source.  Restore: git diff --stat empty.

RE-VERIFY 4 (their U0.4 probe D) — BOTH light readers slice the DARK block
Target:      .design-sync/check-rn-parity.mjs:280,286 — rnRegion.light + webRegion.light
Mutation:    both light marker pairs replaced with the dark ones
Result:      KILLED (exit 1) — Tests 1 failed | 8 passed (9)
  AssertionError: RN primary: the light and dark reads returned the same value:
    expected '#2b8cc1' not to be '#2b8cc1'
  AND their sharpest claim verified: under the same mutation the standalone guard reports
  drift 0, parseFailed 0 — i.e. node check-rn-parity.mjs exits 0. Only the Vitest structural
  pin at rn-token-parity.test.ts:103-128 sees it. That pin is the most valuable assertion here.
Provenance:  canonical source.  Restore: git diff --stat empty.

RE-VERIFY 5 (their U0.4 probe B) — a one-character real drift
Target:      features/demo/ui/tokens/palette.ts:67 — dark border '#1c4e84' -> '#1c4e85'
Result:      KILLED (exit 1) — border.dark: RN=#1c4e84 web=#1c4e85: expected ['border.dark'] to deeply equal []
  One row named, thirty-two silent. Also confirms the case RAN (title printed the RN root).
Provenance:  canonical source.  Restore: git diff --stat empty.
```

Two further confirmations, run because the first finding below sits right next to them:

```
RE-VERIFY 6 (their U0.5 probe 5) — uppercase re-inline of a banned literal
Mutation:    controls/AlertDialog.tsx:148  GLASS.borderSoft -> '1px solid RGBA(28,78,132,0.5)'
Result:      KILLED (exit 1) — controls/AlertDialog.tsx re-inlines the soft border
             (1px solid rgba(28,78,132,0.5))
  The case-insensitivity fix is real and load-bearing.

RE-VERIFY 7 — the @theme mirror pin (glass-tokens.test.ts:111)
Mutation:    app/css/style.css:46  --color-demo-accent-from: #1f6b99 -> #35A0D6
Result:      KILLED (exit 1) — expected '#35a0d6' to be '#1f6b99'
```

**Ruling on the disclosed harness slip:** the re-run verdicts in the U0.4 report §4 stand. I found no
residue of the false-KILL runner in any verdict I checked.

---

# Findings

## [HIGH] The banned-literal scan is whitespace-sensitive, and the phone's own rgba spelling walks past it

**File:** `features/demo/ui/__tests__/glass-tokens.test.ts:125-143` (the scan), `:67-102` (`BANNED`)
**Production surface:** every file under `features/demo/ui/**` outside `TOKEN_MODULES`

**Issue.** The scan lower-cases both sides (`:132`, `:134`) but compares with a raw
`text.includes(literal)`. A re-inline that differs only in **whitespace inside `rgba()`** — the exact
spelling the phone app uses, and the one this port copies from all day — is invisible to it. This is
the hole U0.5 just closed for **case** (its probe 5b), one step over, and the PR itself contains the
proof that the two spellings coexist: `.design-sync/check-rn-parity.mjs:63` ships `norm` for this very
reason, and its docblock spells it out — *"the phone writes `rgba(14, 57, 101, 0.85)`, the demo's
older literals write `rgba(19,34,54,0.85)`"*. The sibling guard normalises; this one does not.

**Evidence — SURVIVED probe:**

```
MUTATION PROBE H1: a banned literal re-inlined with the phone's rgba spacing
Target:      features/demo/ui/controls/AlertDialog.tsx:148 — border: GLASS.borderSoft
Claimed pin: glass-tokens.test.ts:125 — "keeps the raw tokenized literals out of UI source"
Mutation:    border: GLASS.borderSoft  ->  border: '1px solid rgba(28, 78, 132, 0.5)'
Result:      SURVIVED (exit 0) — Tests 11 passed (11)
  Path the input actually took: glass-tokens.test.ts:134 compares
  '1px solid rgba(28, 78, 132, 0.5)'.toLowerCase() against the BANNED needle
  '1px solid rgba(28,78,132,0.5)' — three space characters, no match, no offender row.
  Contrast with RE-VERIFY 6 above: the identical re-inline with UPPERCASE and no spaces is KILLED.
Provenance:  canonical source, probe worktree at 7099e54.
Restore:     verified byte-identical (git checkout -- <path>; git diff --stat empty)
```

**Why it matters, concretely.** The spaced spelling is already live in this tree:
`features/demo/ui/screens/map/mapTokens.ts:45-48,60,68-70,124-147` writes every one of its ~20 rgba
values with spaces, and that file is **not** in `TOKEN_MODULES`. None of its current values happens to
collide with a `BANNED` entry (different alphas), so nothing is broken today — but U5.1's row
re-points `MAP_GLASS_COLORS` at `palette.*` aliases, and U1.1 adds **24 glass-tier keys that are all
`rgba(...)` strings transcribed from the phone**, which spells them spaced. The next package to paste
a tier stop out of `Colors.ts` re-inlines it in the one spelling the guard cannot see, and the guard
reports green.

**Fix.** Normalise whitespace on both sides of the comparison, the way the sibling guard already does
— compare `text.replace(/\s+/g,'').toLowerCase()` against `literal.replace(/\s+/g,'').toLowerCase()`
at `glass-tokens.test.ts:132-134`. This must NOT be done by re-spacing the demo's literals instead:
the same file pins several byte-exactly at `:145-181`. Apply the same treatment to
`palette.test.ts:141-146`'s `RETIRED` loop for consistency (its entries are all hexes today, so it is
prospective there).

---

## [HIGH] The drift guard covers 15 of the 32 palette keys U0.1 created, and 15 of the uncovered ones are scheduled to no package

**File:** `.design-sync/check-rn-parity.mjs:238-254` (`PALETTE_KEYS`), `features/demo/ui/tokens/palette.ts:44-110`
**Claimed pin:** `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:86` — *"pins every palette key in BOTH scheme halves"*

**Issue.** `palette.dark` carries **32** keys. `PALETTE_KEYS` anchors **15**. The test that reads as
"every palette key" iterates `PALETTE_KEYS`, not `Object.keys(palette.dark)` — so its title describes
the anchor list, not the palette. The guard's own docblock (`:216-237`) publishes the growth schedule:
U1.1 `+24` glass-tier keys (not palette keys), U3.1 `+4` status (`success`, `successLight`, `warning`,
`warningLight`), U8.2 `+gridSubtle`. Subtracting everything that schedule will eventually cover leaves
**15 palette keys with no anchor and no owning package**: `borderLight`, `borderDark`, `successDark`,
`warningDark`, `info`, `infoDark`, `onPrimary`, `onError`, `linkHover`, `card`, `modal`, `overlay`,
`overlayLight`, `disabled`, `disabledText`.

This is not the plan's staging rule operating as designed. That rule (§6.6 gate 1, restated at
`:219-222`) forbids anchoring a token whose **web side does not exist yet**. All 32 of these exist —
U0.1 created them in this same phase. They are unanchored because `PALETTE_KEYS` doubles as the input
to the light-vs-light structural probe at `rn-token-parity.test.ts:120-127`, which requires every
member to differ between the two halves. `onPrimary`/`onError` are `#ffffff` in both, and the test's
comment at `:117-119` says so and prescribes the right remedy (*"EXCLUDE IT BY NAME rather than
deleting the check"*) — but the exclusion is implemented by omission from the shared list, so it
silently removes those keys from **drift** coverage as well.

**Evidence — SURVIVED probe:**

```
MUTATION PROBE H7: an unanchored palette key is re-based
Target:      features/demo/ui/tokens/palette.ts:103 — dark overlay
Claimed pin: rn-token-parity.test.ts:68 ("no anchor has drifted") / :86 ("every palette key")
Mutation:    overlay: 'rgba(0, 40, 83, 0.9)'  ->  'rgba(0, 0, 0, 0.9)'
             (the badge-blue wash reverted to a pure-black scrim — a visible restyle, and
              exactly the class of change the phone's P0 re-base made to this ramp)
Result:      SURVIVED (exit 0) — standalone guard: drift 0, parseFailed 0, 33/33 OK;
             vitest: Tests 9 passed (9)
  Path the input actually took: overlay is absent from PALETTE_KEYS
  (check-rn-parity.mjs:238-254), so checkParity() never builds a row for it; the loops at
  rn-token-parity.test.ts:88 and :120 iterate PALETTE_KEYS and never see the key either.
Provenance:  canonical source, probe worktree at 7099e54.
Restore:     verified byte-identical (git diff --stat empty)
```

**Why it matters.** `check-rn-parity.mjs:1-8` states the guard's whole purpose: *"a hex change in the
RN app silently desyncs the two products."* The demo side is separately backstopped by
`palette.test.ts:55-127`'s byte-exact shape pins, so a **local** edit is caught — but those pins are
demo-side literals and say nothing about the phone. The phone moving `Colors.dark.card`, `.overlay`,
`.disabled`, `.borderLight` or `.linkHover` is precisely the failure only this guard can see, and it
is blind to all of them. The comparison is symmetric (`a.rn !== a.web`), so the probe above proves
blindness in both directions. The PR's headline — *"33 anchor rows / 18 keys, zero drift — gate 3 is
online"* — is true of 47% of the palette.

**Fix.** Split the two roles the one list is serving. Keep `PALETTE_KEYS` as the full set of tokenised
palette keys (all 32 today), and give the light-vs-light structural pin its own
`SCHEME_INVARIANT = new Set(['onPrimary','onError', ...])` exclusion so
`rn-token-parity.test.ts:120-127` skips those by name — the remedy the test's own comment at `:117`
already prescribes. Update the two set-size pins at `:99-100` in the same commit. If the owner prefers
to hold the staged number instead, the 15 orphaned keys need a named owning package added to the
`PALETTE_KEYS` docblock schedule — today they have none, so no future package's closing act will ever
pick them up.

---

## [MEDIUM] `region()`/`readField` read commented-out values, so a stale "was ..." comment can hide a real drift

**File:** `.design-sync/check-rn-parity.mjs:113-172` (`region`, `readField`)
**Claimed pin:** `rn-token-parity.test.ts:68` — *"no anchor has drifted from the RN app"*

**Issue.** `readField` does a plain regex match over the sliced region text. Nothing strips `//`
comments, and `.match()` takes the **first** hit — so a comment containing `key: '<value>'` above the
real field decides the anchor's value. Both files the guard reads are dense with exactly that shape:
`palette.ts` annotates every single line, and the phone's `Colors.ts` is the same.

**Evidence — SURVIVED probe:**

```
MUTATION PROBE H6b: a real drift with the old value left in a comment above it
Target:      features/demo/ui/tokens/palette.ts:58 — dark text
Mutation:    text: '#f0f4f8'   ->   // was text: '#f0f4f8' before the ramp lift
                                    text: '#eef2f6'
             (one ordinary refactor edit: change the value, note the old one above it)
Result:      SURVIVED (exit 0) — standalone: text.dark rn=#f0f4f8 web=#f0f4f8, drift 0,
             parseFailed 0; vitest: Tests 9 passed (9)
Control (H6, the safe direction, same mechanism): inserting
  // TODO(U9): text: '#ffffff' once the ramp lifts
  above the UNCHANGED field makes the guard report web=#ffffff and drift=1 — a FALSE RED.
  Same blindness, opposite sign.
Provenance:  canonical source, probe worktree at 7099e54.
Restore:     verified byte-identical (git diff --stat empty)
```

**Why MEDIUM and not HIGH.** On the **web** side every anchored value currently has a byte-exact shape
pin behind it (`palette.test.ts:55-127`, `glass-tokens.test.ts:145-161`, `scale.test.ts:27-30`), so
this specific mutant is caught by a *different* test and cannot ship. The genuinely unguarded half is
the **RN** side, where no shape pin exists and the file is outside this repo's control — and U1.1 is
about to read 24 more values out of `Colors.ts`'s most comment-dense block through `rnTierScope`'s
three-level slices.

**Fix.** One line in `region()` before returning: strip line comments,
`out = out.replace(/\/\/[^\n]*/g, '')`. That closes both signs at once and cannot affect any current
anchor — every real field sits on its own line, so all 33 rows resolve to the same values with
comments stripped.

---

## [MEDIUM] The `T`-alias test cannot tell an alias from a hard-coded literal, for 5 of its 8 keys

**File:** `features/demo/ui/tokens/__tests__/palette.test.ts:151-166`
**Title claims:** *"resolves every T alias to its phone-named palette source"*

**Issue.** The assertion is `expect(T[tKey]).toBe(colors[paletteKey])` on two **strings**, so it
compares values, not sourcing. Replacing `T.text: colors.text` with `T.text: '#f0f4f8'` satisfies it
exactly. Three of the eight keys (`bg` `#002853`, `raised` `#0e3965`, `border` `#1c4e84`) are
backstopped by `glass-tokens.test.ts`'s `BANNED` list; the other five (`text` `#f0f4f8`, `textMute`
`#99badd`, `textFaint` `#7a9fc4`, `primary` `#2B8CC1`, `error` `#ff4757`) are exactly the
high-frequency hexes U0.5 deliberately excluded from `BANNED` (its report §7 P-3), so nothing catches
a de-alias on them.

**Evidence — SURVIVED probe, plus its control:**

```
MUTATION PROBE H11: de-alias a T key whose hex is not banned
Target:      features/demo/ui/inputs/input-theme.ts:29
Mutation:    textMute: colors.textSecondary  ->  textMute: '#99badd'
Result:      SURVIVED (exit 0) — Tests 20 passed (20)
             (palette.test.ts + glass-tokens.test.ts + rn-token-parity.test.ts, all green)

CONTROL H10 (satisfies all four clauses — shipped code, non-equivalent, covered, on an
executed arm): the same de-alias on a key whose hex IS banned
Mutation:    bg: colors.background  ->  bg: '#002853'
Result:      KILLED (exit 1) — inputs/input-theme.ts re-inlines the background (#002853)
  Note WHICH test fired: the BANNED scan, not the alias test. The alias test passed under
  BOTH mutations. Its own claim is unfalsifiable for the five unbanned keys.
Provenance:  canonical source, probe worktree at 7099e54.
Restore:     verified byte-identical (git diff --stat empty)
```

**Why it matters.** Single-source restyle is the entire thesis of the U0 token layer.
`glass-tokens.test.ts:183` pins the accent stops for exactly this reason — and it works there only
because those two flow through one module const, not because `toBe` on strings proves sourcing.
`input-theme.ts` is U2.1's to rewrite next wave; a de-alias introduced there ships green, and a later
retint of `colors.text` then silently fails to reach every input in the demo.

**Fix.** Make the pin structural — a sanctioned idiom here (`chrome-scope.test.tsx`,
`backdrop.test.ts`). Read `input-theme.ts` and assert each alias's right-hand side is an identifier
reference, i.e. that the source matches `\b<tKey>:\s*colors\.<paletteKey>\b`, one line inside the loop
already at `:163` alongside the existing value check. Anchor on the `colors.` form, not the bare token
name, for the same reason `chrome-scope` anchors on `<Header\b`.

---

## [LOW] The guard's own docblock says "35 rows" where the table is 33

**File:** `.design-sync/check-rn-parity.mjs:297` — *"this table is where it earns its keep — 35 rows,
each independently resolvable."*

The table is 15 keys x 2 halves + 2 gradient stops + 1 touch floor = **33**, which is what
`rn-token-parity.test.ts:100` pins and what the standalone run prints. A stale count three lines above
the loop that builds the table, in the one file whose job is counting anchors. Rewrite to 33 (or to
the new number, if the second HIGH above is taken).

## [LOW] `norm`'s `.trim()` is subsumed by its own whitespace strip, so half of its pin cannot fail

**File:** `.design-sync/check-rn-parity.mjs:63`; **pin:** `rn-token-parity.test.ts:56-58` — *"still
trims and lowercases"*

`v.trim().toLowerCase().replace(/\s+/g,'')` — the final `replace` already removes leading and trailing
whitespace, so deleting `.trim()` is an **equivalent mutation** and the "trims" half of that case can
never redden. (The "lowercases" half is genuinely pinned; the authors' probe E killed it.) Not worth a
code change; worth knowing before anyone cites that case as covering trim behaviour.

---

# Rulings the brief asked for

**1. Are all 15 `it.todo` genuinely blocked on their named owner, or is any one landable now?**
**All 15 are genuinely blocked. None is landable.** Verified by grep across `features/`, `app/`, `lib/`
at `7099e54`: every constant a todo names exists **only** as prose in a docblock or in the test file's
own comments — `GLASS_TIER` (only in `palette-contrast.test.ts`), `glass-tiers.ts` (referenced by two
tests, does not exist), `DangerFill` / `ElevatedEdges` / `warningAccent` / `successLight` /
`warningLight` (only in `palette.ts`'s docblock), `MEDIA_CLOSE_CHIP` / `PDF_LOADING_SCRIM` /
`PDF_VIEWER_CHROME` (only in the test), `PrimaryButtonGradient` (only in comments — the demo has the
bare `ACCENT_FROM`/`ACCENT_TO` dark consts and no light pair), and `colors.scrim` (the demo has
`T.scrim` at `input-theme.ts:39`, a different token in a different module — pinning it would pin the
wrong thing). The two borderline calls are defensible: **row 30** could technically be written against
`warningDark`, whose dark value `#ffc62b` coincides with `warningAccent`'s, but they are different
tokens that diverge in light — writing it now would bake in a coincidence; and **rows 12L/13L** have
no owner at all, which the report correctly raises as deferral P-1 rather than papering over with two
typed hexes. I agree with both. The decision *not* to land a degraded `DARK_GROUNDS = [DARK_BG]`
(report §2 decision 2) is right, and is the difference between a loud todo and a green lie.

**2. The `toBe(33)` change-detector — ruling: KEEP. It is a set-size pin, not a change detector.**
The distinction the mutation skill draws is whether it fails on the *meaningful* change. Probed:

```
MUTATION PROBE H2: shrink the anchor table to reach green
Target:      .design-sync/check-rn-parity.mjs:253 — remove 'link' from PALETTE_KEYS
Claimed pin: rn-token-parity.test.ts:99-100
Result:      KILLED (exit 1) — AssertionError: U0.4 anchors 15 palette keys: expected 14 to be 15
Provenance:  canonical source.  Restore: verified byte-identical.
```

It catches the one failure mode the plan's gate 1 cannot express as an exit code — *"the anchor set is
a claim about a set, not about an exit code"* — and its only cost is a one-line edit when a package
legitimately grows the table, which is precisely the "closing act" the plan wants visible in a diff.
Contrast the author's correctly-declined `expect(todos.length).toBe(15)` in `palette-contrast.test.ts`:
that one fails on every legitimate un-todo *without* pinning a set, which is the real change-detector
shape. The two calls are consistent, not contradictory.

**3. Pins that pass via the wrong path.** Four found, all reported above (H1, H7, H6b, H11). The
`skipIf` trap, the jsdom-normalisation trap and the `getContext`/`mediaDevices` traps are all **clear**
in this PR — nothing here renders, reads a computed style or touches a capability shim, and the
`skipIf` guard demonstrably executed.

**4. Coverage gate.** `git diff master...HEAD --name-only` touches **zero** files under `lib/**` or
`features/demo/engine/**`. The 80% gate's scope is untouched; nothing under it can have regressed.

---

## Tests Summary
CRITICAL: 0 · HIGH: 2 · MEDIUM: 2 · LOW: 2
Verdict: **REVISE**

Probes run: **17** (7 re-verifications of the authors' claims, 10 of my own).
Killed: **13** · **Survived: 4** (H1, H7, H6b, H11) · Invalid/equivalent: 0.
Restores: all 17 verified byte-identical; final `git diff 7099e54` = **0 lines**,
`git status --porcelain` = **0 lines**, and `pnpm test --silent` re-green at the identical
**269 files / 3513 passed | 15 todo**.
Worktree teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0;
`probe/w0-tests` branch deleted.

Behaviorally meaningful coverage: **strong** where it is live — the live surface is small (38 cases)
but four independent probes at the production values were killed with the exact numbers the reports
claim, and the light-vs-light structural pin catches a failure the standalone guard exits 0 on. All
four weaknesses are in the *scan/parse* layer of the three guard-style tests, not in the measured
contrasts.
Engine coverage gate (80% on lib/** + engine/**): **not applicable** — 0 files changed in scope.
Mock strategy: **n/a** — no module mocks introduced; every subject is a real pure function, a real
source parse, or the real phone repo.
Factory usage: **n/a** — no store/case/location fixtures in this diff.
Setup-shim traps: **none** — `skipIf` resolved and ran (0 skipped); no canvas / mediaDevices /
matchMedia / computed-style path touched.
Determinism (clock/entropy injected): **yes** — no `Date.now()`/`Math.random()` in any of the five
changed test files; the only environmental dependency is `rnAvailable()`, which is documented and
which I confirmed resolved.

Out-of-lane observations:
- `features/demo/ui/tokens/scale.ts:85` — `parseColor`'s `rgb()` regex has no trailing `$` anchor (the
  contrast test's own `parse` at `:58` does), so `'rgb(1,2,3)garbage'` parses. Not reachable from any
  current call site; typescript lane's call.
- `u0.5-implementation-report.md` §10(a) discloses that phase gate §6.6-2 ("the ported contrast test —
  green") is satisfiable by 4 live cases over 15 todos. That is a plan-wording problem, correctly
  escalated by the author, not a defect in this diff — but it stays true at every wave boundary until
  the gate is reworded.
