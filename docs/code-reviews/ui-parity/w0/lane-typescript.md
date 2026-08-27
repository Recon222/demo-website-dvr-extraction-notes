# Lane: typescript — Wave 0 (phase U0), PR #39

## Round 1 (fix delta)

Head: `feat/uiparity-u0` @ `15e5a6f` (round 0 was `7099e54`). Authority: the fix-mapping comment on
PR #39. Read the delta only — each fix commit and the lines it touched, plus `INTEGRATION-r1.md`'s
`flatten()` reconciliation and plan U1.1's row (opened because F8's new comment cites it).
Probes in my own worktree `worktrees/probe-w0d-typescript-guard` off `15e5a6f`; torn down with
`tools/worktree-remove.ps1` — `unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0.

### Cold gates at the merged head (my own worktree, solo)

| Gate | Round 0 | Round 1 |
|---|---|---|
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | exit 0 | **exit 0** |
| `pnpm test --silent` | 269 files / 3513 passed / 15 todo | **269 files / 3520 passed / 15 todo, exit 0** (+7 tests, 0 regressions) |
| `node .design-sync/check-rn-parity.mjs` | exit 0, 33/33 | **exit 0, 67/67** ("32 palette keys x both halves, + the 2 dark CTA gradient stops and the touch floor") |

### My findings

**F2 (my r0 HIGH — "anchor SET unpinned, only cardinality") — FIXED.**
Commit `4c2a4fa`. Two changes, both correct and both re-probed by me:
- `PALETTE_KEYS` (`check-rn-parity.mjs:238-296`) now carries all 32 palette keys -> 67 rows, 0 drift,
  0 PARSE-FAILED. This also closes my r0 MEDIUM, which the aggregator merged up into F2.
- `rn-token-parity.test.ts:126-128` pins MEMBERSHIP against `Object.keys(palette.dark)` — the only
  assertion in the file that compares the list to something outside it, which is exactly what makes
  the other three loops non-tautological. `PALETTE_KEYS.length === 15` is retired and `anchors.length`
  is now derived (`PALETTE_KEYS.length * 2 + 3`), so it still covers deletion of the three
  non-palette rows without a hand-edit at every stage.

```
MUTATION PROBE 1: my r0 survivor, re-run
Target: .design-sync/check-rn-parity.mjs:263 — PALETTE_KEYS
Claimed pin: rn-token-parity.test.ts:126-128 — "the guard must anchor exactly the palette tokens"
Mutation applied: 'link' replaced with 'gridSubtle' (a key the palette does not carry)
Result: KILLED (from exit code 1) — was SURVIVED / exit 0 in round 0
  4 failed: the membership pin fired BY NAME ("the guard must anchor exactly the palette tokens:
  expected [ 'background', ...(31) ] to deeply equal [ 'background', ...(31) ]"), plus the drift and
  PARSE-FAILED rows.
Provenance: the canonical .design-sync/check-rn-parity.mjs (one copy; no mirror).
Restore: verified — git checkout; git status --porcelain empty.

MUTATION PROBE 2: isolate the membership pin (deletion, no replacement)
Target: .design-sync/check-rn-parity.mjs — the 'borderLight' entry, deleted
  (chosen because it RENDERS today via GLASS.borderBtn / SyncStatusCard.tsx:49 / _shared.tsx:563 —
   the exact key my r0 MEDIUM named as the concrete failure)
Result: KILLED (from exit code 1), and cleanly isolated — EXACTLY ONE assertion fired, the
  membership pin: "expected [ 'background', ...(30) ] to deeply equal [ 'background', ...(31) ]".
  The derived `anchors.length` correctly did NOT fire (it tracks the list, by design).
  Note for the record: `node .design-sync/check-rn-parity.mjs` still printed
  "all 65 anchor rows match" at exit 0 under this mutation — the standalone guard cannot import the
  TS palette, which is precisely why the pin lives in the test. The commit message says so and the
  split is right.
Restore: verified — git status --porcelain empty.
```
Judged on the merits: the author rejected my suggested shape ("assert the sorted array against 15
literal names") in favour of `Object.keys(palette.dark)`. **Theirs is strictly better** — a literal
name list would itself have needed hand-maintenance at U1.1/U3.1/U8.2 and could drift from the
palette; theirs cannot. The rejected alternative recorded in the commit (derive `PALETTE_KEYS` by
parsing `palette.ts` inside the guard) is correctly rejected: it would be self-referential and a
deleted token would silently delete its own anchor.

**My r0 MEDIUM ("15 tokenised keys with no anchor and no owner") — FIXED**, merged up into F2 at
HIGH. All 15 are anchored. The aggregator's in-memory probe (67 rows / 0 drift) removed the
"or ledger it" branch of my fix, correctly: I had hedged at MEDIUM on a cost that turned out to be
zero. The corrected schedule is now written into the guard's docblock (`:234-244`): 59 keys /
123 rows at the end, superseding the plan's ~44 / ~88, with U3.1's row flagged as adding two keys
rather than the four it claims.

**My r0 MEDIUM ("`borderSoft` hand-derived in two copies, false justification") — FIXED as scoped
(demoted to LOW as F8).** Commit `824df2a`:
- The second copy, `T.borderSoft` (`input-theme.ts:24-25`), is **deleted** — it was dead.
- The false reason ("CSS has no alpha-on-hex") is **replaced** with a true one naming a real owner:
  plan U1.1 derives `GLASS.borderSoft` from `GLASS_TIER.dark.card`.
- I opened that precedent rather than taking the comment on faith. Plan `01-master-ui-parity-plan.md`,
  U1.1 row: *"`GLASS.gradientCard`/`gradientPanel`/`borderSoft`/`borderAccent` become derived from it
  so the existing ~40 importers keep working."* **The comment is accurate.** A named next-wave owner
  plus a true in-code reason clears the bar; the remaining single literal is not W0's to fix.

**My r0 LOW (`#rrggbbaa` returned unchanged) — FIXED**, folded into F6 (`7c245fe`), and fixed more
completely than I asked: `parseColor` (`scale.ts:84-105`) now accepts 3-, 4-, 6- and 8-digit hex and
divides the alpha pair by 255; the `rgb()` regex gained the trailing `$` (the web lane's out-of-lane
note); and both silent arms now dev-warn through `warnUnparseable`, with `transparent`/`currentColor`
deliberately exempt via `looksLikeColour` so the breadcrumb does not become noise.

**My r0 out-of-lane note (`before`-marker silent fallback vs a docblock claiming it throws) — FIXED**,
folded into F4 (`4f834f9`): `region()` now throws `region end marker not found: …`, degrading to a
PARSE-FAILED row exactly as a missed `after` does. Code and docblock now agree.

**My r0 rulings — both upheld and unchanged.** `anchors.length` is kept and now derived (which is
what I recommended, better executed); the two D17 camera ground sites stand. The mapping records both
as answered identically by two lanes.

### Fix-introduced regressions — hunted in each fix commit's blast radius

**None found.** What I checked, and how:

- **F6's arity change is the largest new type-level surface in the round** (`flattenOver(top, ...grounds)`
  -> `flattenOver(top, ground, ...rest)`), and it broke every existing call shape. Both consumers were
  reconciled correctly: `scale.test.ts`'s zero-ground case became the compile-error case, and
  `palette-contrast.test.ts`'s `flatten()` (the one modify/modify conflict, per `INTEGRATION-r1.md`)
  now destructures `const [top, ground, ...rest]` and short-circuits a one-entry stack to `parsed[0]`
  instead of spreading. I verified the short-circuit is right for the live rows: `contrast(fg, [bg])`
  calls `flatten([bg])`, which must return the opaque ground uncomposited — and does.

```
MUTATION PROBE 3: is F6 clause 1's "required ground" real, or prose?
Target: features/demo/ui/tokens/scale.ts:181 — flattenOver's signature
Mutation applied: added `expect(flattenOver('#002853')).toBe('#002853')` to scale.test.ts
Result: KILLED at COMPILE time (from tsc exit code 2)
  features/demo/ui/tokens/__tests__/scale.test.ts(110,32): error TS2555: Expected at least 2
  arguments, but got 1.
  The zero-ground arm is genuinely unreachable from TypeScript. (The contrast test's comment cites
  TS2556 — that is the code for the SPREAD form it was describing; TS2555 is the missing-arg form.
  Both are real; not a finding.)
Restore: verified — git status --porcelain empty.
```

```
MUTATION PROBE 4: is F7's `satisfies` a real type-level identity, or a decoration?
Target: features/demo/ui/tokens/palette.ts:48 — colors.primaryDark
Claimed pin: glass-tokens.ts:42 — `const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark`
Mutation applied: primaryDark '#1F6B99' -> '#1E6A98' WITHOUT touching ACCENT_FROM
Result: KILLED at COMPILE time (from tsc exit code 2)
  features/demo/ui/glass-tokens.ts(42,31): error TS1360: Type '"#1F6B99"' does not satisfy the
  expected type '"#1E6A98"'.
  Exactly the claim in the commit message. This matters because ledger §91 records that the drift
  gate skips when the phone repo is absent — F7 makes that one duplication a compile error, which no
  `skipIf` can silence.
Restore: verified — git status --porcelain empty.
```

- **F4's comment-stripping** (`region()` now runs `text.replace(/\/\/[^\n]*/g, '')` before slicing)
  applies to all five sliced files. Its stated invariant is *"none of the five files sliced here
  contains `//` inside a string (no URLs — checked)"*. I re-checked rather than trusting it:
  `grep -cE "url\(|https?:|data:"` returns **0** for `tokens/palette.ts`, `tokens/scale.ts`,
  `glass-tokens.ts`, the phone's `Colors.ts` and `Layout.ts`. Holds. The 67/67 green guard is the
  empirical half of the same proof.
- **F4's new throw on a missed `before`** produced no false PARSE-FAILED: 67/67 rows resolve, and
  `readConst(t, 'ACCENT_FROM')` still reads correctly through the stripped source even after F7
  appended a `satisfies` clause to that line.
- **F2's newly-anchored non-hex rows.** `overlay` / `overlayLight` are the first anchors that are not
  bare hexes (`'rgba(0, 40, 83, 0.9)'`), so they are the first rows to actually exercise `norm`'s
  whitespace stripping in production rather than only in its unit test. Both read OK.
- **F1's six re-points to `colors.link`.** All are string-typed inline `CSSProperties` values; no type
  change, no new import cycle (`palette.ts` imports nothing). The new module-level
  `const LIT_GLOW = \`0 4px 12px ${withAlpha(colors.link, 0.35)}\`` in `ExportCaseCard.tsx:49-51`
  evaluates `withAlpha` at module scope — safe here: `withAlpha` is pure, touches no browser global,
  and `colors.link` parses, so the new `warnUnparseable` path (which reads `process.env.NODE_ENV`) is
  not reached at import time. The two pins that moved with it (`ExportHub.test.tsx:115-119`,
  `ExportModal.reduced-motion.test.tsx:53`) were rewritten to the new value, not deleted.
- **F8's deletions** (`T.borderSoft`, `T.radius`) — `grep` confirms zero readers of either under
  `features/demo/`; `tsc` exit 0 confirms it.
- **Architecture invariants re-swept at `15e5a6f`:** no `useStore` outside `DemoExperience.tsx`, no
  `features/demo/engine/**` file in the fix range, no new deep `@/features/demo/{ui,engine}` import
  from `app`/`components`/`lib`, no new `Date.now()`/`Math.random()`, no `any`, no `as any`.
  `components/marketing/phone-frame.tsx` was touched by F10 (docblock only) and still imports nothing
  from the demo.

### New findings

None.

## Typescript Summary (Round 1 — fix delta)
FIXED: 5 (r0 HIGH -> F2 · r0 MEDIUM/unanchored -> F2 · r0 MEDIUM/borderSoft -> F8 · r0 LOW -> F6 ·
r0 out-of-lane `before` marker -> F4) · PARTIAL: 0 · UNFIXED: 0
New findings this round: CRITICAL 0 · HIGH 0 · MEDIUM 0 · LOW 0
Verdict: APPROVE

Store-bridge integrity: preserved
Engine purity: preserved (no `features/demo/engine/**` file in the fix range)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Mutation probes this round: 4 run, **4 KILLED, 0 SURVIVED** — including a re-run of round 0's only
survivor, which is now dead. Two of the four kill at COMPILE time (TS2555, TS1360), which is the
strongest form available here because ledger §91 records that the runtime drift gate skips whenever
the sibling phone repo is absent.
Out-of-lane observations: one — F4's comment-stripper is line-comment-only and correct today
(verified: no `url(` / `http` / `data:` in any of the five sliced files), but the invariant is stated
in prose and nothing enforces it; a future token holding a URL string would corrupt a slice silently.
Belongs to whoever owns F4; not worth a row while all five files are colour-and-number constants.

---

# Round 0 (initial review) — retained below for provenance


Mode: code review. Base: `master`. Shared worktree read at
`D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\u0-phase` (read-only).
Probes cut in my own worktree `worktrees/probe-ts-w0` off `7099e54`, torn down with
`tools/worktree-remove.ps1` (`unlinked 549 junction(s) in 2 pass(es)` · `.pnpm` 240 -> 240 · exit 0).

## Gates I ran myself (probe worktree, solo)

| Gate | Result |
|---|---|
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **exit 0**, zero diagnostics |
| `pnpm test --silent` (full) | **exit 0** — 269 files / **3513 passed** / 15 todo. Master's baseline was 1 failed (`check-rn-parity.mjs:75` throw); **U0 repaired it.** |
| `node .design-sync/check-rn-parity.mjs` standalone | **exit 0** — 33/33 OK, guard **ran** (not skipped; RN root resolves at the sibling phone repo) |
| Independent 64-row transcription check (all **32** palette keys x both halves, read through the guard's own `readField`) | **ALL 64 rows match the phone** at `Colors.ts` — including the 17 keys the guard does not anchor |
| Store-bridge / engine-purity / barrel / determinism sweep on the diff | no `useStore`, no `engine/**` change, no new deep `@/features/demo` import from `app`/`components`/`lib`, no new `Date.now()`/`Math.random()`, no `any`, no `as any` |

---

## HIGH

```
[HIGH] The drift guard's anchor SET is unpinned — only its cardinality is. Swapping one key for
       another leaves all nine parity cases green (SURVIVED probe).
File: features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:86-101
      (with .design-sync/check-rn-parity.mjs:238-254)
Issue: The three assertions that claim to pin the anchor stage all read PALETTE_KEYS as their own
  input, so they are tautological over set MEMBERSHIP: the "pins every palette key in BOTH scheme
  halves" loop iterates PALETTE_KEYS, so does the light/dark separation loop, and the only
  non-tautological pins are PALETTE_KEYS.length === 15 and anchors.length === 33 — both pure
  cardinality. Dropping the port's single highest-value contrast token (`link`, DEF-UI-018, the
  accent-as-text token the whole A66/A27 row exists for) and adding any other key that happens to
  exist in both halves keeps the count at 15/33 and the whole file green. The test's own comment at
  :95-98 states the intent correctly and then does not assert it: "Gate 1 in the plan is a claim
  about a set, not about an exit code."
Evidence:
  MUTATION PROBE: anchor-set swap
  Target: .design-sync/check-rn-parity.mjs:253 — PALETTE_KEYS, last entry
  Claimed pin: rn-token-parity.test.ts:86-101 — "pins every palette key in BOTH scheme halves (D2, amended)"
  Mutation applied: the last list entry 'link' replaced with 'card'   (one line, one mutation)
  Result: SURVIVED (from exit code 0)
    pnpm exec vitest run features/demo/ui/inputs/__tests__/rn-token-parity.test.ts
    -> Test Files 1 passed (1) · Tests 9 passed (9) · REAL_EXIT=0
    Path the input took: anchors.length is still 33 (15 keys x 2 + 3), PALETTE_KEYS.length is
    still 15, the both-halves loop and the light!=dark loop both iterate the MUTATED list, and
    `card` satisfies light != dark (#ffffff vs #0e3965) on both sides. Nothing reads the set.
  Provenance: the canonical .design-sync/check-rn-parity.mjs (one copy in the repo; no mirror).
  Motion mode: N/A — pure Node/string reads, no DOM, no matchMedia.
  Restore: verified — git checkout -- .design-sync/check-rn-parity.mjs; git status --porcelain
    and git diff --stat both empty; the 9 cases re-ran green.
  Negative controls run in the same tree, both KILLED, proving the file is genuinely covered:
    (a) glass-tokens.ts:34 ACCENT_FROM #1F6B99 -> #35A0D6
        -> palette-contrast.test.ts:316 RED at the documented 2.94 ratio, REAL_EXIT=1.
    (b) check-rn-parity.mjs:286 webRegion.light marker 'const light = {' -> 'const dark = {'
        -> "web primary: the light and dark reads returned the same value: expected '#2b8cc1' not
           to be '#2b8cc1'", 2 failed, REAL_EXIT=1. That reader test earns its keep.
  Doc passage violated: .design-sync/check-rn-parity.mjs:219-221 — "the anchor set is what the
  port has TOKENISED so far, and adding an anchor is the closing act of the package that creates
  its web-side token" — a claim about set membership that nothing asserts.
Fix: replace the two cardinality pins with a membership pin — assert the sorted PALETTE_KEYS array
  against the sorted 15 literal names — and KEEP anchors.length === 33 (it still covers deletion of
  one of the three non-palette anchors, gradientTop / gradientBot / touchFloor, which a
  PALETTE_KEYS pin cannot see). Growing the list at U1.1 / U3.1 / U8.2 then edits two adjacent
  lines instead of one, which is the same cost.
```

## MEDIUM

```
[MEDIUM] `borderSoft` hand-derives `colors.border` at 50% as a literal, in two independent copies,
         in the same PR that introduces `withAlpha` and uses it for exactly this class one file over.
File: features/demo/ui/glass-tokens.ts:52  and  features/demo/ui/inputs/input-theme.ts:25
Issue: GLASS.borderSoft = '1px solid rgba(28,78,132,0.5)' and T.borderSoft = 'rgba(28,78,132,0.5)'
  are both hand-typed decimal transcriptions of colors.border (#1c4e84) at 0.5. The next time
  colors.border moves, palette.ts changes, palette.test.ts's pin changes, the drift guard's `border`
  row goes green again — and these two literals silently stay on the OLD colour, painting ~20
  rendered surfaces (glassCard, AlertDialog, WizardDrawer, CasesScreen, DashboardScreen, ExportModal,
  ImportModal, FormFieldsPane, ...) a hairline that no longer matches GLASS.border beside it.
  `grep -rn "withAlpha(colors\|withAlpha(palette" features/demo` returns nothing, and no test
  computes withAlpha(colors.border, 0.5) and compares — the coupling is asserted nowhere.
Evidence: this PR's own precedent, features/demo/ui/screens/export/ExportCaseCard.tsx:126-130 —
  "Derived, not transcribed: this glow was a hand-typed copy of the accent's rgb, so the U0.3
  re-base would have left the border deep blue and the glow on the old light blue. withAlpha makes
  it follow the stop it is supposed to be a glow OF." That argument is verbatim applicable here, and
  borderSoft's value DID change in this PR (rgba(30,58,95,0.5) -> rgba(28,78,132,0.5)), so its pins
  had to be rewritten anyway — this was the free moment to derive it. The in-code justification
  ("kept as a literal because CSS has no alpha-on-hex") is not a reason: withAlpha exists precisely
  because CSS has no alpha-on-hex.
Fix: build both from withAlpha(colors.border, 0.5) and re-space the byte-exact entries that follow
  (glass-tokens.test.ts:75, :156, :166 and the BANNED 'soft border' row) to rgba(28, 78, 132, 0.5).
  That is the one legitimate re-spacing — the value changed in this commit, so no unrelated pin
  moves. If the authors prefer to keep the literals, add the missing assertion (borderSoft equals
  '1px solid ' + withAlpha(colors.border, 0.5)), which costs one line and closes the same hole.
```

```
[MEDIUM] Fifteen palette keys U0.1 tokenised carry no drift anchor and no owning package — and one
         of them (`borderLight`) renders today.
File: .design-sync/check-rn-parity.mjs:238-254  vs  features/demo/ui/tokens/palette.ts:44-166
Issue: palette.ts ships 32 keys per half; PALETTE_KEYS anchors 15. Of the 17 unanchored, `success`
  and `warning` are scheduled (U3.1) and disclosed in the U0.4 report as P-3. The other 15 —
  borderLight, borderDark, successDark, warningDark, info, infoDark, onPrimary, onError, linkHover,
  card, modal, overlay, overlayLight, disabled, disabledText — appear in no package's closing act
  and are outside the plan's own end-state arithmetic (15 + 24 tiers + 4 status + 1 gridSubtle =
  the "~44 keys at the end" in matrix A96). Concrete failure: the phone re-tints
  Colors.dark.borderLight the way it re-tinted `border` in its P0; `node .design-sync/check-rn-parity.mjs`
  prints 33/33 OK and exits 0, while GLASS.borderBtn (glass-tokens.ts:54 -> every glassBtnSecondary),
  SyncStatusCard.tsx:49 and _shared.tsx:563's AddRowButton all silently diverge. That is the same
  shape as the four drifts U0.0/U0.4 just spent a package un-hiding.
Evidence: matrix A96 — "The rule: adding an anchor is the closing act of the package that creates
  its web token." U0.1 created 32 web-side tokens; U0.4 anchored 15. A96's "do not add 13 at once"
  warning is explicitly about "seven of demo §5.4's proposed additions [that] have no web-side token
  until a later phase" — it does not cover keys U0.1 DID create. I verified all 64 rows (32 keys x 2
  halves) already match the phone byte-for-byte through the guard's own readField, so anchoring the
  13 scheme-varying ones is a green no-op today; onPrimary/onError are #ffffff in both halves and
  need the by-name exclusion the test at rn-token-parity.test.ts:117-119 already prescribes for
  exactly that case.
Fix: either append the 13 scheme-varying keys to PALETTE_KEYS now (green on landing; the light!=dark
  loop passes for all 13) with onPrimary/onError excluded by name, or — if the authors prefer to hold
  the plan's staging — file a deferral-ledger entry naming these 15 keys with a concrete un-defer
  trigger, since no package currently owns them and the ledger's bar is "a real reason to wait AND a
  concrete un-defer trigger." Silence is the one option that does not work: the plan's ~44 arithmetic
  never reaches them.
```

## LOW

```
[LOW] `parseColor` accepts 3- and 6-digit hex only; an #rrggbbaa input is returned unchanged with
      its OWN alpha, silently ignoring the requested one.
File: features/demo/ui/tokens/scale.ts:88, reached from withAlpha (:121-126) and flattenOver (:151-165)
Issue: withAlpha('#2B8CC125', 0.5) returns '#2B8CC125' — a valid CSS colour at alpha 0.15, not the
  0.5 the caller asked for. That is the same defect class the docblock at :113-115 says the port
  fixed for rgba() inputs ("the requested alpha was silently ignored"), reproduced one branch over.
  The demo already renders four #rrggbbaa values at runtime via the template idiom —
  map/LocationDetailCard.tsx:43, map/LocationRow.tsx:22, :23 and :26 — and plan U5.4's row routes
  exactly those through withAlpha.
Evidence: contrast with the sibling parser at features/demo/ui/__tests__/palette-contrast.test.ts:62,
  which THROWS on anything it cannot parse rather than passing it through; the docblock there
  (:50-54) makes rejection the deliberate contract. scale.ts's pass-through is correct for
  `transparent` / named colours and wrong for a hex form it silently half-understands.
Fix: extend the alternation to {8} and drop the trailing pair into the alpha slot (two lines), or —
  cheaper — leave the behaviour and add an #rrggbbaa case to the "returns anything unparseable
  unchanged" test at tokens/__tests__/scale.test.ts:58-61, so the next reader sees it is known
  rather than missed.
```

---

## Rulings the authors asked a reviewer for

**1. `expect(anchors.length).toBe(33)` (`rn-token-parity.test.ts:100`) — KEEP IT.** It is not the
change-detector the mutation skill warns about: it fails on the *meaningful* mutation it was written
for (an implementer facing a red drift row deletes the key instead of fixing the value — the table
shrinks to 31 rows and this line reds), and it covers the three non-palette anchors that a
`PALETTE_KEYS` pin cannot see. Its stated cost — reddening when U1.1 / U3.1 / U8.2 grow the set — is
correct behaviour for a staged gate, and the comment names the schedule. **The defect is not that the
assertion exists; it is that it is the ONLY non-tautological pin on the stage** — see the HIGH above.
`PALETTE_KEYS.length === 15` is fully implied by a membership pin and can be dropped when one lands.

**2. The two camera-screen ground sites ported under D17 — NOT a violation. Keep them.**
`MediaCaptureScreen.tsx:445` and `OcrCaptureScreen.tsx:495` are the app background bleeding through a
radial gradient, not camera chrome. Three reasons, in order of weight:

- **Matrix A1 enumerates both by `file:line`** among its thirteen bare `#0d1b2a` sites
  (`00-ui-parity-matrix.md:69`: "... `MediaCaptureScreen.tsx:444`, ... `OcrCaptureScreen.tsx:494` ...")
  and assigns A1 to **U0**. A site list naming a line is more specific than a palette-level freeze.
- **D17 enumerates what it freezes** (`00-ui-parity-matrix.md:521`): iOS system red `#FF3B30`, the
  four black scrim alphas, and white — and enumerates its two portable changes (`#007AFF` ->
  `primaryDark`, the `CameraControls` scrim -> `overlay` at 90%), **both assigned to U7.2**, not U0.
  Neither list touches a radial-gradient inner stop, and the OUTER stop `#05080d` — which IS the
  camera's own black — is untouched by this PR at both sites.
- Reverting them would leave `#0d1b2a` alive under `ui/`, reddening
  `tokens/__tests__/palette.test.ts:138-149`'s retired-hex sweep, and would drop A1's site list from
  13 to 11 with no doc saying so. The disclosed reading in the U0-foundation report §9(b) is the
  correct one.

## What I verified and found clean (no findings)

- **All 64 transcription rows.** I re-read every one of `palette.ts`'s 32 keys in both halves out of
  the phone's `Colors.ts` through the guard's own `readField` / `norm`: **ALL 64 rows match**,
  including the 17 the guard does not anchor. The `*Light` / `*Dark` inversion trap is transcribed
  correctly (dark `errorLight #b72136`, light `errorLight #fee2e2`).
- **`isolatedModules`.** `export type PaletteToken` (`palette.ts:113`), `export type ColorScheme`
  (`:170`) and the inline `type PaletteToken` import at `palette.test.ts:4` are all type-form. Clean.
- **The `satisfies Record<PaletteToken, string>` construction** (`palette.ts:166`) genuinely makes a
  one-sided key a compile error in both directions, and `palette.test.ts:129-131` covers the
  type-widening escape at runtime. This is the right shape for D2.
- **`target: es5` hazard handled.** `scale.ts:94-96` uses `digits.split('')` over a string spread,
  with a comment naming `--downlevelIteration`; `tsc --noEmit` confirms it compiles.
- **`flattenOver`'s pass-through trap is pinned in the right position.**
  `palette-contrast.test.ts:251-257` buries the unparseable layer in the MIDDLE, and the comment
  records the earlier top-position pin surviving its own probe. Correct fix, correctly proven.
- **RSC / `'use client'`.** `tokens/palette.ts` and `tokens/scale.ts` export no component and use no
  hooks or browser APIs; they match the established omitting-modules list (`ui/motion.ts`,
  `ui/inputs/input-theme.ts`, ...) and are reachable only through `app/demo/page.tsx`'s `ssr: false`
  mount. Correct as written.
- **The 30-site value sweep.** All 13 A1 sites and all 15 A7 sites are converted; a case-insensitive
  `grep -rlniI` for the seven retired hexes under `features/demo/ui` returns **zero files**. The two
  residual carriers are `components/marketing/phone-frame.tsx:48` (marketing, Case-File design
  system, and the file the no-demo-import guard already covers) and
  `features/demo/engine/logic/case-map/template.ts` (the HTML export's own design system,
  **excluded by plan §36**) — both correctly out of scope.
- **`app/css/style.css:46-47`'s `@theme` mirrors** moved with the accent and are value-pinned by
  `glass-tokens.test.ts:111-123`; `app/demo/__tests__/error.test.tsx:75`'s ban list was rewritten in
  place to the CURRENT stops rather than left holding retired ones. Both are the correct half of the
  "a ban list of dead values is green and inert" lesson.
- **No `any`, no `as any`, no non-null assertion, no `JSON.parse`, no new async path, no new timer,
  no stray `console.log`, no `dangerouslySetInnerHTML`, no secret movement, no route-handler change.**

## Out-of-lane observations

- `region()` (`check-rn-parity.mjs:121-123`) silently keeps the rest of the file when a `before`
  marker misses, while the docblock at `:100-102` claims "a marker that misses THROWS ... rather than
  falling back to the whole file." I traced all six live region shapes and **none** can produce a
  wrong read today (every key is found in the first matching block either way), so it is a
  comment/code mismatch with no reachable failure — noted, not filed. It becomes reachable the moment
  a `before` bound must exclude a LATER block that also defines the key, which is what
  `rnTierScope`'s `before: '}'` will be doing at U1.1.
- `DARK_BG` / `LIGHT_BG` (`palette-contrast.test.ts:158-159`) are declared and referenced nowhere —
  U1.1 scaffolding the file's docblock explains. `noUnusedLocals` is off and there is no ESLint
  config, so nothing will flag them; harmless, but a U1.1 reviewer should confirm they get consumed.
- The U0.4 report's §8 items 1-8 (plan / matrix corrections owed) are accurate as far as I checked
  items 2, 5 and 7; someone owns propagating them.

## Typescript Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 2 · LOW: 1
Verdict: REVISE

Store-bridge integrity: preserved
Engine purity: preserved (no `features/demo/engine/**` file in the diff)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved
Mutation probes: 3 run — 1 SURVIVED (the HIGH above), 2 KILLED (negative controls); restores
verified byte-identical; probe worktree torn down with `tools/worktree-remove.ps1`, exit 0.
Out-of-lane observations: three, listed above.
