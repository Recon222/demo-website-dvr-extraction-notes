# Lane: type-design - Wave 0 (U0), PR #39

## Round 1 (fix delta)

Warm seat. Phase branch `feat/uiparity-u0` @ `15e5a6f`, delta `10553c8..15e5a6f`. Authority: the
fix-mapping comment on PR #39. Read the delta only, plus the lines each fix now depends on.
Probes ran in `probe/w0d-types-f2` (own worktree off `15e5a6f`), torn down via
`tools/worktree-remove.ps1` - "unlinked 549 junction(s) in 2 pass(es)", `.pnpm` 240 -> 240, exit 0.

Baseline at `15e5a6f` in the probe tree, taken BEFORE any mutation:
`tsc --noEmit --incremental false` -> **EXIT 0** - `node .design-sync/check-rn-parity.mjs` ->
**exit 0, 67/67 rows** - the five token suites -> **5 files, 45 passed / 15 todo, exit 0**.

### My findings, per the mapping

| F-ID | My r0 finding | Status |
|---|---|---|
| F6 | `flattenOver` zero-grounds arm returns `top` uncomposited | **FIXED** |
| F7 | `ACCENT_FROM` re-types `colors.primaryDark` with no link | **FIXED** |
| F8 | dead `T.borderSoft` / `T.radius` | **FIXED** |
| F9 | `T.rowH` unguarded duplicate of `touchTarget.min` (I reported it as disclosed-awaiting-ledger; the author refused the deferral and fixed it) | **FIXED** |
| - | my r0 LOW on the `scheme: 'any'` sentinel does not appear in the mapping | not confirmed or disclaimed - see Residual |

**F6 - FIXED, both clauses.** `scale.ts:177` is now
`flattenOver(top: string, ground: string, ...rest: string[])`, so the empty-grounds call is a
compile error (TS2556) rather than a plausible wrong answer - the shape I asked for, and the
docblock at `:171-173` states the reason. Clause 2, which I said a type could not express, was
closed at the boundary instead: `palette-contrast.test.ts:112-117` throws
"the bottom ground must be opaque" when the last layer's alpha is not 1, and `:281-284` pins it
with **my exact probe input** - `contrast('#ffffff', ['rgba(0, 0, 0, 0.1)'])`, the call that
measured 21.00 in round 0, now asserted to throw. `flatten()` also handles the one-entry stack
explicitly (`:126-127`) instead of routing it through a helper that no longer accepts it. That is
a better answer than the runtime assert I proposed, because it sits where the ground stacks are
written. Verified green in the baseline run above.

**F7 - FIXED, exactly as probed.** `glass-tokens.ts:42`:
`const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark`. This is the change I probed in
round 0 (tsc clean with it; TS1360 when `palette.ts`'s `primaryDark` is mutated one-sided; drift
guard unaffected because `readConst`'s VALUE alternation takes the quoted literal). Re-confirmed
at `15e5a6f`: `tsc` **EXIT 0** and the guard reads **67/67, exit 0**, so the anchor still resolves
through the new form. The comment at `:30-36` records why `= colors.primaryDark` is not an option
and why `satisfies` is - the distinction my round-0 finding turned on. `ACCENT_TO` correctly stays
plain (no palette sibling).

**F8 - FIXED, no orphaned consumers.** Both keys are gone from `input-theme.ts`. Re-measured at
`15e5a6f` across `features/`, `app/` and `components/`: `T.borderSoft` -> **0 references**,
`T.radius` -> **0 references**. `tsc` exit 0 confirms nothing was typed against them. The comment
defending the hand-written `GLASS.borderSoft` was also corrected (`glass-tokens.ts:59-62`): it now
names U1.1 as the owner that derives it from `GLASS_TIER.dark.card` and states the byte-exact-pin
reason for not hand-deriving it in the interim - the accurate version of the claim I flagged as
wrong ("CSS has no alpha-on-hex", when `withAlpha` shipped in the same PR).

**F9 - FIXED, and pinned structurally.** `input-theme.ts:43` is `rowH: touchTarget.min`; the
literal type stays 44 because `touchTarget` is `as const`, so `TimeWheel.tsx:8` is unchanged.
`scale.test.ts:40-41` pins BOTH the value and the source text (a regex requiring
`rowH: touchTarget.min`) - the same structural idiom F5 introduced for the `T` aliases, which is
what stops a future re-typed 44 from passing a value-only pin.

---

## NEW - HIGH (fix-introduced, in F2's blast radius)

```
[HIGH] F2's membership pin - the one assertion that makes the anchor table non-tautological -
       is gated behind `it.skipIf(!rnAvailable())`, and needs nothing from the phone repo
Type: PALETTE_KEYS (string[], .mjs) and the pin that constrains it
File: features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:111 (the `it.skipIf`) and
      :123-126 (the membership assertion inside it);
      .design-sync/check-rn-parity.mjs:243-249 (the docblock that delegates enforcement to it)
Invariant violated / permitted invalid state: `PALETTE_KEYS` remains a hand-maintained
  `string[]` - correctly so; the guard's docblock at `:232-236` reasons that deriving it by
  parsing `palette.ts` would be self-referential, and I agree. Enforcement therefore rests
  entirely on `expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(palette.dark).sort())`. The
  test says so itself at `:118-122`: "This is the only assertion in the file that compares the
  list to something outside it, so it is the one that makes the other three non-tautological."
  Both sides of that comparison are LOCAL - a `.mjs` array and a TypeScript module in this repo.
  It is nevertheless inside a case skipped whenever the sibling phone repo is absent.
Construction site: any edit to `PALETTE_KEYS` on a machine or CI without the phone checkout.
Downstream consequence - MUTATION PROBE A / B. Mutated copy: the canonical
  `.design-sync/check-rn-parity.mjs`, in a private probe worktree. Claimed pin:
  `rn-token-parity.test.ts:123`.
  - PROBE A - mutation: PALETTE_KEYS 'link' becomes a duplicate 'card' (the exact mutation the
    fix's own comment at `:113-117` says the OLD length-based pin survived). Phone repo PRESENT.
    Result: **KILLED, exit 1**, failing case named
    "pins every palette key in BOTH scheme halves (D2, amended)". The fix works in this condition.
  - PROBE B - the SAME single mutation, re-run with the phone repo absent. The scenario was
    applied by pointing the guard's RN path constant at a non-existent sibling; declared, because
    it changes a path rather than the logic under test, and it reproduces the deployment
    condition `rn-token-parity.test.ts:24-30` documents in its own words as "a CI without the
    phone repo reports green regardless of drift".
    Result: **SURVIVED, exit 0** - "Tests 5 passed | 6 skipped (11)".
  - NEGATIVE CONTROL - phone repo absent, PALETTE_KEYS CLEAN: byte-identical outcome,
    "Tests 5 passed | 6 skipped (11)", exit 0. So the mutation is genuinely invisible in that
    condition; the skip, not chance, is what hides it.
  Restore proved: `git checkout --`, `git diff` **0 bytes**, file green again at 11/11.
  Net effect: F2 correctly widened the table from 15 keys to all 32 and replaced a cardinality
  pin with a membership pin, but on the default contributor/CI configuration the widened table is
  protected by nothing at all - a token can be dropped from PALETTE_KEYS, or swapped for a
  duplicate, with a fully green suite.
Fix: move that one `expect` out of the gated case. The correct pattern is already in this same
  delta, three describes above it - F4 put its two `region()` cases in an UNGATED describe at
  `:69-70` with the comment "Both cases are pure string work - no sibling repo, so they run
  everywhere, which matters for a guard whose every other case is skipIf." The membership pin is
  exactly that kind of case. The cardinality line at `:128-130` can follow it; the three
  assertions that genuinely read the phone stay behind skipIf.
```

## NEW - LOW

```
[LOW] The scheme-invariant exclusion set is stringly typed, in a file that uses the typed idiom
      one directory over
Type: SCHEME_INVARIANT
File: features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:154-155
Invariant violated / permitted invalid state: `new Set(['onPrimary', 'onError'])` infers
  `Set<string>`, and the loop is `PALETTE_KEYS.filter((k: string) => !SCHEME_INVARIANT.has(k))`.
  Nothing ties either to `PaletteToken`. A typo'd exclusion excludes nothing.
Construction site: the comment at `:149-153` explicitly invites future edits - "Any key added
  here needs the same justification, in one line" - so the set is designed to grow.
Downstream consequence: LOW and not MEDIUM because the failure direction is safe: a typo leaves
  `onPrimary` in the loop, and the light-vs-dark assertion then fails LOUDLY on a key that is
  `#ffffff` in both halves. The cost is a confusing red (a real token appearing to be a stuck
  reader) rather than a silent hole. The unsafe direction - excluding a key that is NOT
  scheme-invariant - is a judgement no type can catch.
Fix: `new Set<PaletteToken>(['onPrimary', 'onError'])`. `palette` is already imported at `:6` for
  F2's membership pin, and the sibling file uses the same idiom in this delta -
  `palette.test.ts:171`, `as const satisfies Record<string, PaletteToken>` for the alias map.
  One type argument; a typo becomes a compile error instead of a misleading runtime red.
```

## Residual, not filed

- `flatten(stack: string[])` (`palette-contrast.test.ts:105`) still accepts an empty array, which
  now reaches `parsed[parsed.length - 1]` as `undefined` and throws a TypeError at `:113`. That is
  strictly better than round 0's silently-wrong ratio and remains unreachable from `worst()` /
  `offenders()`; not worth a required-first-element parameter on a test-file internal.
- PALETTE_KEYS is still `string[]` rather than `PaletteToken[]`. Correct: the guard is `.mjs` and
  cannot import the TS module, and the docblock's self-reference argument for keeping the list
  hand-written is sound. The HIGH above is about WHERE the pin runs, not about typing the array.
- My round-0 LOW on the `scheme: 'any'` sentinel and the message it produces (`RN Colors.any = 44`)
  does not appear in the fix-mapping comment. Per reviewer-contract section 7 I neither confirm
  nor disclaim it; the row still carries `scheme: 'any'` and the report line is unchanged.

## Regression sweep over the fix commits' blast radius

- **parseColor widened** (`scale.ts:85-105`, F6's commit) to accept 4- and 8-digit hex and to
  anchor the `rgb()` regex at both ends. Return type is unchanged, the alpha pair is normalised
  to 0-1, and the contrast test's own stricter `parse` (6-digit only, `:62`) is untouched - so
  the two parsers did not converge and the test still rejects `#fff` as `:238` asserts.
  `tsc` exit 0.
- **region() now strips line comments and throws on a missed `before`** (F4). Both change what
  every reader sees, including F7's `readConst` on the new `satisfies` form. Re-ran the guard at
  `15e5a6f`: **67/67 OK, exit 0** - no anchor went PARSE-FAILED, so neither change broke a
  reader. The stripper is line-comments-only and documented as such.
- **input-theme.ts now imports touchTarget** (F9), joining `GLASS` and `colors`. Import order
  palette -> scale -> glass-tokens -> input-theme is preserved; `palette.ts` still imports
  nothing. No cycle; `tsc` exit 0.
- Full token-suite run at the merged head, before any mutation: **5 files, 45 passed / 15 todo,
  exit 0.**

---

## Type Design Summary (Round 1 fix delta)
CRITICAL: 0 - HIGH: 1 - MEDIUM: 0 - LOW: 1
Prior-round findings: F6 **FIXED** - F7 **FIXED** - F8 **FIXED** - F9 **FIXED** (0 PARTIAL, 0 UNFIXED)
Verdict: **REVISE**

| Check | Result |
|---|---|
| Fixes address the finding, not the symptom | **yes** for all four; F6 clause 2 was closed better than proposed |
| Fix-introduced regressions in blast radius | **one** - F2's membership pin sits inside a skipIf case that does not need the phone repo (HIGH above); the parser, region() and import-graph changes are clean |
| Id spaces typed | **partial** - `PaletteToken` still enforces the palette in both directions; the new SCHEME_INVARIANT set is stringly (LOW) |
| Mutation probes this round | 3 - 1 KILLED, **1 SURVIVED**, 1 negative control. Restore proved byte-identical (`git diff` 0 bytes); probe worktree torn down with the script's proof line |

Out-of-lane observations: none new this round.
