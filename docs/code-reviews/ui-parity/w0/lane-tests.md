# Lane: tests — Wave 0 (phase U0), PR #39

## Round 1 (fix delta)

Head `15e5a6f` · fix diff `10553c8..15e5a6f` · authority: the fix-mapping comment on PR #39
(read; it covers every F-ID below). Warm seat — I re-read only the delta on my surfaces plus
what the changed lines now depend on. Nothing was restructured beyond `flatten()`/`flattenOver()`,
which I re-read in full and say so here.

Probes in my own worktree `worktrees/probe-w0d-tests` cut from `15e5a6f`, torn down with the
script: *`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0*.
**Provenance for every probe: the canonical source in that worktree at `15e5a6f`.** Motion mode:
not applicable to any probe (no rendered transition on any path); the one probe that renders
(R1, MediaLibrarySheet) ran under the suite default, motion-ON.

### Fix-delta baseline (my worktree, before any mutation)

| Gate | Exit | Result |
|---|---|---|
| Guard, in-process | — | **67 anchors / 32 keys / drift 0 / parseFailed 0** |
| Five token suites | **0** | **45 passed \| 15 todo (60)**, **0 skipped** (`rnAvailable()` true — the guard ran) |
| `pnpm test --silent` | **0** | **269 files / 3520 passed \| 15 todo (3535)** — up from r1's 3513, +7 |
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | cold |

### Per-finding status

| F-ID | My r1 finding | Status | Proof |
|---|---|---|---|
| F3 | HIGH — whitespace-blind `BANNED` scan | **FIXED** | probe D1 KILLED |
| F2 | HIGH — 17 of 32 palette keys unanchored | **FIXED** | probes D2, D3 KILLED |
| F4 | MEDIUM — `region()` reads `//` comments | **FIXED** | probe D4 KILLED |
| F5 | MEDIUM — `T`-alias pin cannot see a de-alias | **FIXED** | probes D5, D6 KILLED |
| F6 | (not mine; asked to verify) | **FIXED** | probes D7, D8 KILLED + D9 TS2555 |
| — | LOW "docblock says 35 rows" — folded into F2 | **FIXED** | `check-rn-parity.mjs:353` now reads 67; matches `anchors.length` |
| — | LOW "`norm`'s `.trim()` is equivalent" — DROPPED | **CONCUR** | the disposition quotes my own verdict; no code owed |

**All four of my round-1 SURVIVORS now KILL.** Every one was re-run as the *identical mutation*,
not a paraphrase.

```
PROBE D1 — F3: a banned literal re-inlined with the phone's rgba spacing
Target:      features/demo/ui/controls/AlertDialog.tsx:148 — border: GLASS.borderSoft
Claimed pin: glass-tokens.test.ts:139 — "keeps the raw tokenized literals out of UI source"
Mutation:    border: GLASS.borderSoft  ->  border: '1px solid rgba(28, 78, 132, 0.5)'
Result:      KILLED (exit 1)   [round 1: SURVIVED, exit 0]
  controls/AlertDialog.tsx re-inlines the soft border (1px solid rgba(28,78,132,0.5))
  expected [ Array(1) ] to deeply equal []
  The fix is the right shape: one norm() helper applied to needle AND haystack in BOTH
  scans (glass-tokens.test.ts:43, palette.test.ts:44), mirroring the drift guard's own
  norm — not a re-spacing of the demo's literals, which would have reddened the
  byte-exact pins at :159-195. The merged sibling half (RETIRED's raw needle) is closed
  by the same helper.
Provenance:  canonical source, probe worktree at 15e5a6f.
Restore:     verified byte-identical (git status --porcelain empty)

PROBE D2 — F2: an unanchored palette key is re-based
Target:      features/demo/ui/tokens/palette.ts:103 — dark overlay
Mutation:    overlay: 'rgba(0, 40, 83, 0.9)'  ->  'rgba(0, 0, 0, 0.9)'   (identical to round 1)
Result:      KILLED (exit 1)   [round 1: SURVIVED — standalone guard reported 33/33 OK]
  standalone: drift = 1
  AssertionError: overlay.dark: RN=rgba(0,40,83,0.9) web=rgba(0,0,0,0.9):
    expected [ 'overlay.dark' ] to deeply equal []
  Note the report renders both sides whitespace-stripped: overlay is the first anchor that
  is not a bare hex, so this row is also the first live exercise of norm on a real anchor —
  previously only unit-pinned.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D3 — F2's NEW membership pin, count held constant
Target:      .design-sync/check-rn-parity.mjs PALETTE_KEYS — 'link' replaced by 'card'
             (a duplicate; length stays 32, so every cardinality assertion stays green)
Claimed pin: rn-token-parity.test.ts:120 — [...PALETTE_KEYS].sort() vs Object.keys(palette.dark).sort()
Result:      KILLED (exit 1)
  AssertionError: card must be pinned in both halves:
    expected [ 'dark', 'dark', 'light', 'light' ] to deeply equal [ 'dark', 'light' ]
  This is the exact count-preserving swap the author found survived the OLD length === 15
  pin. The list is now compared against something outside itself, which is what makes the
  other three assertions in that case non-tautological. anchors.length is now DERIVED
  (PALETTE_KEYS.length * 2 + 3), so it no longer needs hand-editing at each closing act —
  it now covers only what membership cannot (deletion of the two CTA stops or the touch
  floor). My round-1 ruling to KEEP the set-size pin survives in a strictly better form.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D4 — F4: a real drift with the old value left in a comment above it
Target:      features/demo/ui/tokens/palette.ts:58 — dark text
Mutation:    text: '#f0f4f8'  ->  // was text: '#f0f4f8' before the ramp lift
                                  text: '#eef2f6'          (identical to round 1)
Result:      KILLED (exit 1)   [round 1: SURVIVED — guard read the comment, drift 0]
  standalone: text.dark rn=#f0f4f8 web=#eef2f6, drift = 1
  AssertionError: text.dark: RN=#f0f4f8 web=#eef2f6: expected [ 'text.dark' ] to deeply equal []
  region() strips line comments first (check-rn-parity.mjs:114). The scope note in its
  docblock is honest — line comments only, justified by "every field sits on its own line
  and none of the five sliced files contains // inside a string", which I spot-checked
  against palette.ts, scale.ts and glass-tokens.ts. The sibling half folded in here (a
  missed `before` widening the slice to EOF) now throws, and carries its own always-run
  unit case at rn-token-parity.test.ts:88 — notable because it is one of only three cases
  in that file not behind skipIf.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D5 — F5: de-alias a T key whose hex is not BANNED
Target:      features/demo/ui/inputs/input-theme.ts:28
Mutation:    textMute: colors.textSecondary  ->  textMute: '#99badd'   (identical to round 1)
Result:      KILLED (exit 1)   [round 1: SURVIVED, 20 passed]
  AssertionError: input-theme.ts must SOURCE textMute from colors.textSecondary,
    not re-type its value: expected false to be true
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D6 — F5's own comment hazard (the fix claims to close it; I did not suggest this)
Mutation:    // was textMute: colors.textSecondary
             textMute: '#99badd'
             i.e. the de-alias with a leftover comment that satisfies the new regex.
Result:      KILLED (exit 1) — same assertion.
  The structural pin strips // before matching (palette.test.ts:187-190), so it does not
  reintroduce the F4 defect class one file over. The author found this themselves and
  probed it; it reproduces.
Provenance:  canonical source.  Restore: verified byte-identical.
```

### F6 — the integrator's reconciled `flatten()` / `flattenOver()`

The one modify/modify conflict. I re-read both functions in full (they were restructured). The
union carries all three clauses and I probed each independently.

```
PROBE D7 — F6 clause (2): the opaque-bottom guard
Target:      palette-contrast.test.ts:107-115 — flatten()'s `if (bottom[3] !== 1) throw`
Claimed pin: palette-contrast.test.ts:281 —
             expect(() => contrast('#ffffff', ['rgba(0, 0, 0, 0.1)'])).toThrow(/bottom ground must be opaque/)
Mutation:    delete the guard block
Result:      KILLED (exit 1) — AssertionError: expected [Function] to throw an error
  The pin is honest about why parse cannot catch this one: the layer is perfectly valid, and
  flattenOver DISCARDS the last ground's alpha, so a 90%-transparent black bottom measured
  21.00 — identical to pure black. This was prose in my round-1 read ("both stacks must bottom
  out at background") and is now mechanical, which matters because U1.1 is the package that
  first builds a stack deep enough to violate it.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D8 — F6: the merge did NOT lose the F3-era buried-unparseable guard
Target:      palette-contrast.test.ts:108 — const parsed = stack.map(parse)
Mutation:    parse every layer as the BOTTOM one, so a buried bad layer is never parsed
Result:      KILLED (exit 1) — AssertionError: expected [Function] to throw an error
  The reconciliation replaced stack.forEach(parse) with stack.map(parse) and reuses the result
  for the bottom check — behaviourally equivalent for the guard, one fewer parse pass. My
  round-1 RE-VERIFY 3 still holds at the merged head.
Provenance:  canonical source.  Restore: verified byte-identical.

PROBE D9 — F6 clause (1): the arity change is a COMPILE-time pin, so it is checked with tsc
Target:      features/demo/ui/tokens/scale.ts:180 — flattenOver(top, ground, ...rest)
Probe:       a scratch module in the probe worktree calling flattenOver('#002853')
Result:      KILLED (tsc exit 2)
  features/demo/ui/zz-arity-probe.ts(2,23): error TS2555: Expected at least 2 arguments, but got 1.
  This is the correct falsification for that clause — no runtime test can distinguish "returned
  top uncomposited" from a right answer, which is exactly why the fix moved the contract into
  the signature. Scratch file deleted; tree clean.
Provenance:  canonical source.  Restore: verified byte-identical.
```

F6's other arms are pinned behaviourally and non-tautologically in `scale.test.ts`: the dev-warn
arms assert the call COUNT and the function name (not merely "did not throw"), the anchored-regex
case pins `withAlpha('rgb(1, 2, 3) and then some', 0.5)` returning unchanged, and
`flattenOver('#ffffff80', '#000000') === flattenOver('rgba(255, 255, 255, 0.50196)', '#000000')`
pins the 8-digit alpha at `0x80/255` rather than restating a literal. No notes.

### Fix-introduced regressions

**None found.** Full suite green at `15e5a6f` (269 files / **3520 passed** | 15 todo, up +7 from
round 1's 3513), cold typecheck exit 0, and the collateral checks all hold: the five token suites
are 45/15 with **0 skipped**, the drift guard resolves 67/67 with zero PARSE-FAILED, and F6's new
`console.warn` arms leak into no unrelated suite.

### New finding

## [MEDIUM] F1's fix ships four of its six sites with no pin at all — reverting one to the 2.54:1 fill shade is invisible to every suite that renders it

**Ruling requested by the integrator.** It is a finding, at MEDIUM.

**File:** `features/demo/ui/screens/MediaLibrarySheet.tsx:225,226,245,576`
**Tests covering them:** **none** — `screens/__tests__/MediaLibrarySheet.test.tsx`,
`__tests__/DemoExperience.media-library.test.tsx`, `__tests__/DemoExperience.drawer-media.test.tsx`
and `controls/__tests__/controls.test.tsx` all render this component and none asserts a colour.

**Evidence — SURVIVED probe:**

```
MUTATION PROBE R1: an F1 site reverts to the accent FILL shade
Target:      features/demo/ui/screens/MediaLibrarySheet.tsx:226 — the active media tab's label
Claimed pin: (none — this is the ruling)
Mutation:    color: isActive ? colors.link : '#7a9fc4'
             ->  color: isActive ? GLASS.accentFrom : '#7a9fc4'
             (i.e. exactly the pre-F1 code, which measures 2.54:1 on colors.background
              against an AA-text floor of 4.5 — F1's own stated defect)
Result:      SURVIVED (exit 0) — 6 test files, Tests 83 passed | 15 todo (98)
  Path the input actually took: no assertion in any of the four suites reads an inline style
  on this subtree; `palette-contrast.test.ts` measures TOKENS, not which token a site spends,
  and every accent-as-text row in it is still `it.todo` (blocked on GLASS_TIER); and the
  BANNED scan cannot see it because the revert uses the TOKEN `GLASS.accentFrom`, not the
  literal `#1F6B99`. Motion mode: default (motion-ON).
Provenance:  canonical source, probe worktree at 15e5a6f.
Restore:     verified byte-identical (git status --porcelain empty)
```

**Why it matters.** The mutation skill's first mandatory-probe rule is "every test added to close a
review finding" — F1 closed a HIGH with no test on 4 of 6 sites, so two thirds of the fix has no
falsifiable pin. The ratios that justify it (2.54 / 5.31 / 9.60 at `:222-225`, 2.05 / 7.78 at
`:245`) exist only as comments, which is the "comment describing the right idiom over code shipping
half of it" shape the base contract names. The aggregator itself recorded the round's coverage gap
as *"no lane measured accent-as-MARK contrast structurally"* — after the fix round, that gap is
still open on these four sites. `MediaLibrarySheet` is U6's to rewrite; a paste-back of
`GLASS.accentFrom` is exactly the re-drift class this PR's whole guard apparatus exists to stop,
and it is the one spelling the guards do not cover.

**Why MEDIUM, not HIGH.** The shipped code is correct today; this is regression protection, not a
live defect. The precedent is already set two files over, so the gap is a completeness miss inside
an otherwise-good fix round, not a design hole.

**Fix — two lines in a test that already exists, no new file.** `MediaLibrarySheet.test.tsx`
already has a `tab(name)` accessor and an active-tab case at `:87-90`; add there, in the exact form
`ExportHub.test.tsx:115-118` already uses (with its jsdom-normalisation note):
`expect(tab('Photos tab, 1 items').style.color).toBe('rgb(184, 212, 240)')` and
`expect(tab(...).style.borderBottom).toContain('rgb(184, 212, 240)')` — that kills `:225` and
`:226` together. The badge (`:245`) and the selected row's `borderLeft` (`:576`) want one each in
their existing cases. Do **not** reach for a file-level ban on `GLASS.accentFrom`: the file still
uses `GLASS` legitimately elsewhere, so the ban would be wrong and the render pin is both smaller
and more honest.

---

## Tests Summary (Round 1 — fix delta)
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 (new) · LOW: 0
Round-1 findings: **F3 FIXED · F2 FIXED · F4 FIXED · F5 FIXED** (+ my LOW folded into F2 FIXED,
my LOW dropped by agreement). **0 PARTIAL, 0 UNFIXED.**
Verdict: **APPROVE with comments**

Probes run: **10** · Killed: **9** · Survived: **1** (R1, the new MEDIUM) · Invalid/equivalent: 0.
Restores: all 10 verified byte-identical; `git status --porcelain` and `git diff 15e5a6f` both
empty at the end of the round. Teardown: `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm`
240 -> 240 · exit 0; `probe/w0d-tests` branch deleted.

Behaviorally meaningful coverage: **strong**. The fix round converted all four of my survivors and
did it at the root rather than at the symptom in every case — one shared `norm()` for both scans,
membership-against-the-palette rather than a bigger hand list, a comment strip inside `region()`
rather than per-caller, and a signature change where no runtime pin could work. F2's fix is
strictly better than what I proposed (derived cardinality, so the count stops being hand-edited).
Engine coverage gate (80% on lib/** + engine/**): **not applicable** — the fix diff still touches
0 files under `lib/**` or `features/demo/engine/**`.
Setup-shim traps: **none** — `skipIf` resolved and ran (0 skipped) in every quoted run.
Determinism: **yes** — no clock or entropy introduced by any fix commit.

Out-of-lane observations:
- `parseColor` now accepts 4- and 8-digit hex, which changes `withAlpha`'s behaviour on the four
  `#rrggbbaa` values the docblock names (`map/LocationDetailCard.tsx:43`, `map/LocationRow.tsx:22,23,26`).
  They do not currently route through `withAlpha`, so nothing moves today; U5.4's row is where it
  lands. Pinned in `scale.test.ts`; flagging only so U5.4 is not surprised. Typescript lane's call.

---

# Round 0 (initial review) — retained for reference

The full round-0 review, with its 17 probes and 4 survivors (all four now FIXED above), is
superseded by this section. Its findings map to F2, F3, F4 and F5; its two LOWs were folded into
F2 and dropped by agreement, as recorded in the status table at the top.
